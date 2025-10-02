const { KMBDataCollector } = require('./data-collector');
const { KMBDataProcessor } = require('./data-processor');
const { KMBFileManager } = require('./file-manager');
const { Result } = require('./result');
const { ProcessingError } = require('./errors');

/**
 * @typedef {Object} KMBServiceOptions
 * @property {number} [requestsPerSecond=3] - API requests per second
 * @property {number} [concurrentRequests=2] - Concurrent requests limit
 * @property {string} [baseDir='kmb'] - Output base directory
 * @property {import('./data-collector').KMBDataCollector} [collector] - Data collector instance (for DI)
 * @property {import('./data-processor').KMBDataProcessor} [processor] - Data processor class (for DI)
 * @property {import('./file-manager').KMBFileManager} [fileManager] - File manager instance (for DI)
 */

/**
 * Main service orchestrator for KMB data collection
 * @class
 */
class KMBService {
  /**
   * Create a new KMB service
   * @param {KMBServiceOptions} [options={}] - Service configuration
   */
  constructor(options = {}) {
    this.requestsPerSecond = options.requestsPerSecond || 3;
    this.concurrentRequests = options.concurrentRequests || 2;
    this.baseDir = options.baseDir || 'kmb';

    // Dependency injection: use provided instances or create defaults
    this.collector = options.collector || new KMBDataCollector(
      this.requestsPerSecond,
      this.concurrentRequests
    );
    this.processor = options.processor || KMBDataProcessor;
    this.fileManager = options.fileManager || new KMBFileManager(this.baseDir);
  }

  /**
   * Collect routes and route-stops data
   * @private
   * @returns {Promise<{routes: Array, routeStops: Object, stopRoutesMap: Object}>}
   */
  async _collectRoutesAndStops() {
    console.log('Collecting KMB routes and route-stops...');
    const [routes, allRouteStops] = await Promise.all([
      this.collector.collectRoutes(),
      this.collector.collectAllRouteStopsData(),
    ]);

    console.log(
      `Found ${routes.length} routes and ${allRouteStops.length} route-stops`
    );

    const routeStops = this.collector.processRouteStopsData(
      allRouteStops,
      routes
    );

    const stopRoutesMap = this._buildStopRoutesMap(routeStops);
    const stopIds = Object.keys(stopRoutesMap);
    console.log(`Found ${stopIds.length} unique stops`);

    return { routes, routeStops, stopRoutesMap };
  }

  /**
   * Build stop-routes mapping
   * @private
   * @param {Object} routeStops - Route stops data
   * @returns {Object} Map of stop IDs to routes
   */
  _buildStopRoutesMap(routeStops) {
    const stopRoutesMap = {};
    Object.entries(routeStops).forEach(([route, stops]) => {
      [...stops.inbound, ...stops.outbound].forEach(stop => {
        if (!stopRoutesMap[stop.stop]) {
          stopRoutesMap[stop.stop] = new Set();
        }
        stopRoutesMap[stop.stop].add(route);
      });
    });
    return stopRoutesMap;
  }

  /**
   * Collect stop details for all stops
   * @private
   * @param {Array} stopIds - Stop IDs to collect
   * @returns {Promise<Object>} Map of stop IDs to stop data
   */
  async _collectStopDetails(stopIds) {
    console.log('Collecting stop details...');
    const stopDetailsResults =
      await this.collector.collectStopDetailsForStops(stopIds);

    const stopsMap = {};
    stopDetailsResults.forEach(result => {
      if (result.data) {
        stopsMap[result.stopId] = result.data;
      }
    });

    console.log(
      `Retrieved ${stopDetailsResults.length} stop details out of ${stopIds.length} stops`
    );

    return stopsMap;
  }

  /**
   * Process and enrich stop data
   * @private
   * @param {Array} stopIds - Stop IDs to process
   * @param {Object} stopsMap - Map of stop IDs to stop data
   * @param {Object} stopRoutesMap - Map of stop IDs to routes
   * @returns {Object} All enriched stops data
   */
  _processStopData(stopIds, stopsMap, stopRoutesMap) {
    console.log('Processing and saving stop data...');
    const allStopsData = {};

    for (const stopId of stopIds) {
      const stopData = stopsMap[stopId];
      const enrichedStopData = stopData
        ? this.processor.enrichStopWithRoutes(stopData, stopRoutesMap, stopId)
        : this._createFallbackStopData(stopId, stopRoutesMap);

      allStopsData[stopId] = enrichedStopData;
    }

    return allStopsData;
  }

  /**
   * Create fallback stop data for missing stops
   * @private
   * @param {string} stopId - Stop ID
   * @param {Object} stopRoutesMap - Map of stop IDs to routes
   * @returns {Object} Fallback stop data
   */
  _createFallbackStopData(stopId, stopRoutesMap) {
    const fallbackStopData = {
      stop: stopId,
      name_en: `Stop ${stopId}`,
      name_tc: `站點 ${stopId}`,
      name_sc: `站点 ${stopId}`,
    };
    return this.processor.enrichStopWithRoutes(
      fallbackStopData,
      stopRoutesMap,
      stopId
    );
  }

  /**
   * Save stop data to files
   * @private
   * @param {Object} allStopsData - All stops data
   * @returns {Promise<number>} Number of save errors
   */
  async _saveStopData(allStopsData) {
    let saveErrors = 0;
    for (const [stopId, stopData] of Object.entries(allStopsData)) {
      const saveResult = await this.fileManager.saveStopData(stopId, stopData);
      if (saveResult.isFailure()) {
        saveErrors++;
      }
    }

    const allStopsResult = await this.fileManager.saveAllStops(allStopsData);
    if (allStopsResult.isFailure()) {
      console.error(
        'Failed to save allstops.json:',
        allStopsResult.getError().message
      );
    }

    return saveErrors;
  }

  /**
   * Save route data to files
   * @private
   * @param {Object} routeStops - Route stops data
   * @param {Object} allStopsData - All stops data
   * @param {Object} stopsMap - Map of stop IDs to stop data
   * @returns {Promise<number>} Number of route save errors
   */
  async _saveRouteData(routeStops, allStopsData, stopsMap) {
    console.log('Generating route files...');
    const allRoutesData = {};
    const successfulStops = Object.keys(allStopsData).map(stopId => ({
      stopId,
      data: stopsMap[stopId],
    }));

    let routeSaveErrors = 0;
    for (const [route] of Object.entries(routeStops)) {
      const enrichedRouteData = this.processor.createEnrichedRouteData(
        route,
        routeStops,
        successfulStops
      );

      allRoutesData[route] = enrichedRouteData;

      const routeResult = await this.fileManager.saveRouteData(
        route,
        enrichedRouteData
      );
      if (routeResult.isFailure()) {
        routeSaveErrors++;
      }
    }

    await this.fileManager.saveAllRoutes(allRoutesData);

    return routeSaveErrors;
  }

  /**
   * Log completion summary
   * @private
   * @param {number} processedStops - Number of processed stops
   * @param {number} totalStops - Total number of stops
   * @param {number} saveErrors - Number of save errors
   * @param {number} routeSaveErrors - Number of route save errors
   */
  _logCompletionSummary(processedStops, totalStops, saveErrors, routeSaveErrors) {
    console.log('Data collection completed!');
    console.log(
      `Successfully processed ${processedStops} out of ${totalStops} stops`
    );

    if (saveErrors > 0 || routeSaveErrors > 0) {
      console.warn(
        `Encountered ${saveErrors} stop save errors and ${routeSaveErrors} route save errors`
      );
    }
  }

  /**
   * Collect and save all KMB data
   * @returns {Promise<Result>} Result with collection statistics
   */
  async collectAndSaveData() {
    try {
      await this.fileManager.ensureDirectories();

      // Step 1: Collect routes and stops
      const { routes, routeStops, stopRoutesMap } =
        await this._collectRoutesAndStops();

      // Step 2: Collect stop details
      const stopIds = Object.keys(stopRoutesMap);
      const stopsMap = await this._collectStopDetails(stopIds);

      // Step 3: Process and enrich stop data
      const allStopsData = this._processStopData(
        stopIds,
        stopsMap,
        stopRoutesMap
      );

      // Step 4: Add nearby stops
      this._addNearbyStopIds(allStopsData);

      // Step 5: Save stop data
      const saveErrors = await this._saveStopData(allStopsData);

      // Step 6: Save route data
      const routeSaveErrors = await this._saveRouteData(
        routeStops,
        allStopsData,
        stopsMap
      );

      // Step 7: Log summary
      this._logCompletionSummary(
        stopIds.length,
        stopIds.length,
        saveErrors,
        routeSaveErrors
      );

      return Result.success({
        totalRoutes: routes.length,
        totalStops: stopIds.length,
        successfulStops: stopIds.length,
        saveErrors: saveErrors + routeSaveErrors,
      });
    } catch (error) {
      console.error('Error in data collection process:', error);
      const processingError = new ProcessingError(
        'KMB data collection failed',
        { originalError: error.message, stack: error.stack }
      );
      return Result.failure(processingError);
    }
  }

  /**
   * Add nearbyStopIDs field to all stops in memory
   * @private
   * @param {Object} allStopsData - All stops data
   */
  _addNearbyStopIds(allStopsData) {
    console.log('Adding nearbyStopIDs to all stops in memory...');

    // Group stops by coordinates
    const coordinateMap = new Map();

    // Read each stop from memory and group by coordinates
    for (const [stopId, stopData] of Object.entries(allStopsData)) {
      // Create a key from lat and long
      const coordKey = `${stopData.lat},${stopData.long}`;

      // Add stop ID to the coordinate group
      if (!coordinateMap.has(coordKey)) {
        coordinateMap.set(coordKey, []);
      }
      coordinateMap.get(coordKey).push(stopId);
    }

    console.log(`Found ${coordinateMap.size} unique coordinate locations...`);

    // Process each stop in memory and add nearbyStopIDs
    for (const [stopId, stopData] of Object.entries(allStopsData)) {
      // Create coordinate key for this stop
      const coordKey = `${stopData.lat},${stopData.long}`;

      // Get all stops at the same coordinates
      const nearbyStops = coordinateMap.get(coordKey) || [];

      // Filter out the current stop itself
      const otherNearbyStops = nearbyStops.filter(
        nearbyStopId => nearbyStopId !== stopId
      );

      // Add the new field to the data
      stopData.nearbyStopIDs = otherNearbyStops;
    }

    console.log('Finished adding nearbyStopIDs to all stops in memory!');
  }
}

module.exports = { KMBService };
