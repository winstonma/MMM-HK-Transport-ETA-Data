const { CTBDataCollector } = require('./data-collector');
const { CTBDataProcessor } = require('./data-processor');
const { CTBFileManager } = require('./file-manager');
const { Result } = require('./result');
const { ProcessingError } = require('./errors');

/**
 * @typedef {Object} CTBServiceOptions
 * @property {number} [requestsPerSecond=3] - API requests per second
 * @property {number} [concurrentRequests=2] - Concurrent requests limit
 * @property {string} [baseDir='ctb'] - Output base directory
 * @property {import('./data-collector').CTBDataCollector} [collector] - Data collector instance (for DI)
 * @property {import('./data-processor').CTBDataProcessor} [processor] - Data processor class (for DI)
 * @property {import('./file-manager').CTBFileManager} [fileManager] - File manager instance (for DI)
 */

/**
 * Main service orchestrator for CTB data collection
 * @class
 */
class CTBService {
  /**
   * Create a new CTB service
   * @param {CTBServiceOptions} [options={}] - Service configuration
   */
  constructor(options = {}) {
    this.requestsPerSecond = options.requestsPerSecond || 3;
    this.concurrentRequests = options.concurrentRequests || 2;
    this.baseDir = options.baseDir || 'ctb';

    // Dependency injection: use provided instances or create defaults
    this.collector =
      options.collector ||
      new CTBDataCollector(this.requestsPerSecond, this.concurrentRequests);
    this.processor = options.processor || CTBDataProcessor;
    this.fileManager = options.fileManager || new CTBFileManager(this.baseDir);
  }

  /**
   * Collect routes and route-stops data
   * @private
   * @returns {Promise<{routes: Array, routeStops: Object, stopRoutesMap: Object}>}
   */
  async _collectRoutesAndStops() {
    const routes = await this.collector.collectRoutes();
    console.log(`Found ${routes.length} routes`);

    const routeStopResults = await this.collector.collectAllRouteStops(routes);
    const { routeStops, stopRoutesMap } =
      this.processor.processRouteStopResults(routeStopResults);

    return { routes, routeStops, stopRoutesMap };
  }

  /**
   * Convert stop routes map from Set to Array
   * @private
   * @param {Object} stopRoutesMap - Map with Set values
   * @returns {Object} Map with Array values
   */
  _convertStopRoutesMapToArray(stopRoutesMap) {
    const stopRoutesMapArray = {};
    Object.keys(stopRoutesMap).forEach(stopId => {
      stopRoutesMapArray[stopId] = Array.from(stopRoutesMap[stopId]);
    });
    return stopRoutesMapArray;
  }

  /**
   * Collect stop details for all stops
   * @private
   * @param {Object} stopRoutesMap - Map of stop IDs to routes
   * @returns {Promise<Array>} Successful stop details
   */
  async _collectStopDetails(stopRoutesMap) {
    const stopIds = Object.keys(stopRoutesMap);
    console.log(`Found ${stopIds.length} unique stops`);

    const stopRoutesMapArray = this._convertStopRoutesMapToArray(stopRoutesMap);
    const stopDetailsResults = await this.collector.collectOptimizedStopDetails(
      stopIds,
      stopRoutesMapArray
    );

    const successfulStops =
      this.processor.processStopDetailsResults(stopDetailsResults);
    console.log(`Processing ${successfulStops.length} stops with details...`);

    return successfulStops;
  }

  /**
   * Save stop data to files
   * @private
   * @param {Array} successfulStops - Stops to save
   * @param {Object} stopRoutesMap - Map of stop IDs to routes
   * @returns {Promise<{allStopsData: Object, saveErrors: number}>}
   */
  async _saveStopData(successfulStops, stopRoutesMap) {
    const allStopsData = {};
    let saveErrors = 0;

    for (const { stopId, data } of successfulStops) {
      const enrichedStopData = this.processor.enrichStopWithRoutes(
        data,
        stopRoutesMap,
        stopId
      );

      const saveResult = await this.fileManager.saveStopData(
        stopId,
        enrichedStopData
      );
      if (saveResult.isFailure()) {
        saveErrors++;
      }

      allStopsData[stopId] = enrichedStopData;
    }

    const allStopsResult = await this.fileManager.saveAllStops(allStopsData);
    if (allStopsResult.isFailure()) {
      console.error(
        'Failed to save allstops.json:',
        allStopsResult.getError().message
      );
    }

    return { allStopsData, saveErrors };
  }

  /**
   * Save route data to files
   * @private
   * @param {Array} routes - Routes metadata from API
   * @param {Object} routeStops - Route stops data
   * @param {Array} successfulStops - Successful stop details
   * @returns {Promise<{allRoutesData: Object, routeSaveErrors: number}>}
   */
  async _saveRouteData(routes, routeStops, successfulStops) {
    console.log('Generating route files with enriched stop information...');
    const allRoutesData = {};
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

    await this.fileManager.saveAllRoutes(allRoutesData, routes);

    return { allRoutesData, routeSaveErrors };
  }

  /**
   * Log completion summary
   * @private
   * @param {number} successfulStopsCount - Number of successful stops
   * @param {number} totalStops - Total number of stops
   * @param {number} saveErrors - Number of save errors
   * @param {number} routeSaveErrors - Number of route save errors
   */
  _logCompletionSummary(
    successfulStopsCount,
    totalStops,
    saveErrors,
    routeSaveErrors
  ) {
    console.log('Data collection completed!');
    console.log(
      `Successfully processed ${successfulStopsCount} out of ${totalStops} stops`
    );

    if (saveErrors > 0 || routeSaveErrors > 0) {
      console.warn(
        `Encountered ${saveErrors} stop save errors and ${routeSaveErrors} route save errors`
      );
    }
  }

  /**
   * Collect and save all CTB data
   * @returns {Promise<Result>} Result with collection statistics
   */
  async collectAndSaveData() {
    try {
      await this.fileManager.ensureDirectories();

      // Step 1: Collect routes and stops
      const { routes, routeStops, stopRoutesMap } =
        await this._collectRoutesAndStops();

      // Step 2: Collect stop details
      const successfulStops = await this._collectStopDetails(stopRoutesMap);

      // Step 3: Save stop data
      const { saveErrors } = await this._saveStopData(
        successfulStops,
        stopRoutesMap
      );

      // Step 4: Save route data
      const { routeSaveErrors } = await this._saveRouteData(
        routes,
        routeStops,
        successfulStops
      );

      // Step 5: Log summary
      this._logCompletionSummary(
        successfulStops.length,
        Object.keys(stopRoutesMap).length,
        saveErrors,
        routeSaveErrors
      );

      return Result.success({
        totalRoutes: routes.length,
        totalStops: Object.keys(stopRoutesMap).length,
        successfulStops: successfulStops.length,
        saveErrors: saveErrors + routeSaveErrors,
      });
    } catch (error) {
      console.error('Error in data collection process:', error);
      const processingError = new ProcessingError('Data collection failed', {
        originalError: error.message,
        stack: error.stack,
      });
      return Result.failure(processingError);
    }
  }
}

module.exports = { CTBService };
