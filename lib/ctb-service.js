const { CTBDataCollector } = require('./data-collector');
const { CTBDataProcessor } = require('./data-processor');
const { CTBFileManager } = require('./file-manager');
const { Result } = require('./result');
const { ProcessingError } = require('./errors');

/**
 * Main service orchestrator for CTB data collection
 */
class CTBService {
  constructor(options = {}) {
    this.requestsPerSecond = options.requestsPerSecond || 3;
    this.concurrentRequests = options.concurrentRequests || 2;
    this.baseDir = options.baseDir || 'ctb';

    this.collector = new CTBDataCollector(
      this.requestsPerSecond,
      this.concurrentRequests
    );
    this.fileManager = new CTBFileManager(this.baseDir);
  }

  async collectAndSaveData() {
    try {
      // Ensure directories exist
      await this.fileManager.ensureDirectories();

      // Step 1: Collect all routes
      const routes = await this.collector.collectRoutes();
      console.log(`Found ${routes.length} routes`);

      // Step 2: Collect all route-stops
      const routeStopResults =
        await this.collector.collectAllRouteStops(routes);

      // Process route-stop results
      const { routeStops, stopRoutesMap } =
        CTBDataProcessor.processRouteStopResults(routeStopResults);

      // Convert Set to Array for stopRoutesMap
      const stopRoutesMapArray = {};
      Object.keys(stopRoutesMap).forEach(stopId => {
        stopRoutesMapArray[stopId] = Array.from(stopRoutesMap[stopId]);
      });

      // Step 3: Collect stop details with optimization
      const stopIds = Object.keys(stopRoutesMap);
      console.log(`Found ${stopIds.length} unique stops`);

      const stopDetailsResults =
        await this.collector.collectOptimizedStopDetails(
          stopIds,
          stopRoutesMapArray
        );
      const successfulStops =
        CTBDataProcessor.processStopDetailsResults(stopDetailsResults);

      console.log(`Processing ${successfulStops.length} stops with details...`);

      // Step 4: Save stop data
      const allStopsData = {};
      let saveErrors = 0;
      
      for (const { stopId, data } of successfulStops) {
        const enrichedStopData = CTBDataProcessor.enrichStopWithRoutes(
          data,
          stopRoutesMap,
          stopId
        );

        // Save individual stop file
        const saveResult = await this.fileManager.saveStopData(stopId, enrichedStopData);
        if (saveResult.isFailure()) {
          saveErrors++;
        }

        // Add to all stops data
        allStopsData[stopId] = enrichedStopData;
      }

      // Save allstops.json
      const allStopsResult = await this.fileManager.saveAllStops(allStopsData);
      if (allStopsResult.isFailure()) {
        console.error('Failed to save allstops.json:', allStopsResult.getError().message);
      }

      // Step 5: Generate and save route files
      console.log('Generating route files with enriched stop information...');
      const allRoutesData = {};
      let routeSaveErrors = 0;

      for (const [route, stops] of Object.entries(routeStops)) {
        const enrichedRouteData = CTBDataProcessor.createEnrichedRouteData(
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
        `Successfully processed ${successfulStops.length} out of ${stopIds.length} stops`
      );
      
      if (saveErrors > 0 || routeSaveErrors > 0) {
        console.warn(`Encountered ${saveErrors} stop save errors and ${routeSaveErrors} route save errors`);
      }

      return Result.success({
        totalRoutes: routes.length,
        totalStops: stopIds.length,
        successfulStops: successfulStops.length,
        saveErrors: saveErrors + routeSaveErrors,
      });
    } catch (error) {
      console.error('Error in data collection process:', error);
      const processingError = new ProcessingError(
        'Data collection failed',
        { originalError: error.message, stack: error.stack }
      );
      return Result.failure(processingError);
    }
  }
}

module.exports = { CTBService };
