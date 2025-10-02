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

  async collectAndSaveData() {
    try {
      // Ensure directories exist
      await this.fileManager.ensureDirectories();

      // Step 1: Collect all routes and route-stops in parallel
      console.log('Collecting KMB routes and route-stops...');
      const [routes, allRouteStops] = await Promise.all([
        this.collector.collectRoutes(),
        this.collector.collectAllRouteStopsData(),
      ]);

      console.log(
        `Found ${routes.length} routes and ${allRouteStops.length} route-stops`
      );

      // Process route-stop data to organize by routes
      const routeStops = this.collector.processRouteStopsData(
        allRouteStops,
        routes
      );

      // Build stop-routes mapping
      const stopRoutesMap = {};
      Object.entries(routeStops).forEach(([route, stops]) => {
        [...stops.inbound, ...stops.outbound].forEach(stop => {
          if (!stopRoutesMap[stop.stop]) {
            stopRoutesMap[stop.stop] = new Set();
          }
          stopRoutesMap[stop.stop].add(route);
        });
      });

      const stopIds = Object.keys(stopRoutesMap);
      console.log(`Found ${stopIds.length} unique stops`);

      // Step 2: Collect real stop details
      console.log('Collecting stop details...');
      const stopDetailsResults =
        await this.collector.collectStopDetailsForStops(stopIds);

      // Create stops map for quick lookup
      const stopsMap = {};
      stopDetailsResults.forEach(result => {
        if (result.data) {
          stopsMap[result.stopId] = result.data;
        }
      });

      console.log(
        `Retrieved ${stopDetailsResults.length} stop details out of ${stopIds.length} stops`
      );

      // Step 3: Save stop data
      console.log('Processing and saving stop data...');
      const allStopsData = {};
      let processedStops = 0;

      for (const stopId of stopIds) {
        const stopData = stopsMap[stopId];
        if (stopData) {
          const enrichedStopData = this.processor.enrichStopWithRoutes(
            stopData,
            stopRoutesMap,
            stopId
          );

          // Add to all stops data
          allStopsData[stopId] = enrichedStopData;
          processedStops++;
        } else {
          // Create fallback stop data for stops we couldn't fetch
          const fallbackStopData = {
            stop: stopId,
            name_en: `Stop ${stopId}`,
            name_tc: `站點 ${stopId}`,
            name_sc: `站点 ${stopId}`,
          };
          const enrichedStopData = this.processor.enrichStopWithRoutes(
            fallbackStopData,
            stopRoutesMap,
            stopId
          );

          // Add to all stops data
          allStopsData[stopId] = enrichedStopData;
          processedStops++;
        }
      }

      // Add nearbyStopIDs to all stops using in-memory data
      this.addNearbyStopIdsToMemory(allStopsData);

      // Save all stops data with nearbyStopIDs
      let saveErrors = 0;
      for (const [stopId, stopData] of Object.entries(allStopsData)) {
        const saveResult = await this.fileManager.saveStopData(stopId, stopData);
        if (saveResult.isFailure()) {
          saveErrors++;
        }
      }

      // Save allstops.json
      const allStopsResult = await this.fileManager.saveAllStops(allStopsData);
      if (allStopsResult.isFailure()) {
        console.error('Failed to save allstops.json:', allStopsResult.getError().message);
      }

      // Step 4: Generate and save route files
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

        // Save to all routes data
        allRoutesData[route] = enrichedRouteData;

        // Save individual route file
        const routeResult = await this.fileManager.saveRouteData(route, enrichedRouteData);
        if (routeResult.isFailure()) {
          routeSaveErrors++;
        }
      }

      // Save allroutes.json
      await this.fileManager.saveAllRoutes(allRoutesData);

      console.log('Data collection completed!');
      console.log(
        `Successfully processed ${processedStops} out of ${stopIds.length} stops`
      );
      
      if (saveErrors > 0 || routeSaveErrors > 0) {
        console.warn(`Encountered ${saveErrors} stop save errors and ${routeSaveErrors} route save errors`);
      }

      return Result.success({
        totalRoutes: routes.length,
        totalStops: stopIds.length,
        successfulStops: processedStops,
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
   */
  addNearbyStopIdsToMemory(allStopsData) {
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
