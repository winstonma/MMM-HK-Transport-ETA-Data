const { Result } = require('./result');

/**
 * Mock implementations for testing
 * These can be used to test services without making real API calls or file operations
 */

/**
 * Mock API client for testing
 * @class
 */
class MockApiClient {
  /**
   * Create a mock API client
   * @param {Object} [responses={}] - Predefined responses for URLs
   */
  constructor(responses = {}) {
    this.responses = responses;
    this.calls = [];
  }

  /**
   * Mock fetch JSON
   * @param {string} url - URL to fetch
   * @returns {Promise<any>} Mocked response
   */
  async fetchJson(url) {
    this.calls.push({ method: 'fetchJson', url });

    if (this.responses[url]) {
      return this.responses[url];
    }

    return { data: [] };
  }

  /**
   * Mock fetch JSON safe
   * @param {string} url - URL to fetch
   * @returns {Promise<Result>} Mocked result
   */
  async fetchJsonSafe(url) {
    try {
      const data = await this.fetchJson(url);
      return Result.success(data);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * Get all calls made to this mock
   * @returns {Array} Array of calls
   */
  getCalls() {
    return this.calls;
  }

  /**
   * Reset call history
   */
  reset() {
    this.calls = [];
  }
}

/**
 * Mock data collector for testing
 * @class
 */
class MockDataCollector {
  /**
   * Create a mock data collector
   * @param {Object} [mockData={}] - Predefined mock data
   */
  constructor(mockData = {}) {
    this.mockData = mockData;
    this.calls = [];
  }

  /**
   * Mock collect routes
   * @returns {Promise<Array>} Mocked routes
   */
  async collectRoutes() {
    this.calls.push({ method: 'collectRoutes' });
    return this.mockData.routes || [];
  }

  /**
   * Mock collect route stops
   * @param {string} route - Route identifier
   * @returns {Promise<Object>} Mocked route stops
   */
  async collectRouteStops(route) {
    this.calls.push({ method: 'collectRouteStops', route });
    return {
      route,
      inbound: this.mockData.routeStops?.[route]?.inbound || [],
      outbound: this.mockData.routeStops?.[route]?.outbound || [],
      error: false,
    };
  }

  /**
   * Mock collect stop details
   * @param {string} stopId - Stop identifier
   * @returns {Promise<Object>} Mocked stop details
   */
  async collectStopDetails(stopId) {
    this.calls.push({ method: 'collectStopDetails', stopId });
    return {
      stopId,
      data: this.mockData.stops?.[stopId] || null,
      error: false,
    };
  }

  /**
   * Get all calls made to this mock
   * @returns {Array} Array of calls
   */
  getCalls() {
    return this.calls;
  }

  /**
   * Reset call history
   */
  reset() {
    this.calls = [];
  }
}

/**
 * Mock file manager for testing
 * @class
 */
class MockFileManager {
  /**
   * Create a mock file manager
   */
  constructor() {
    this.savedFiles = {};
    this.calls = [];
  }

  /**
   * Mock ensure directories
   * @returns {Promise<void>}
   */
  async ensureDirectories() {
    this.calls.push({ method: 'ensureDirectories' });
  }

  /**
   * Mock save stop data
   * @param {string} stopId - Stop identifier
   * @param {Object} stopData - Stop data
   * @returns {Promise<Result>} Success result
   */
  async saveStopData(stopId, stopData) {
    this.calls.push({ method: 'saveStopData', stopId });
    this.savedFiles[`stops/${stopId}.json`] = stopData;
    return Result.success({ stopId, filePath: `stops/${stopId}.json` });
  }

  /**
   * Mock save route data
   * @param {string} route - Route identifier
   * @param {Object} routeData - Route data
   * @returns {Promise<Result>} Success result
   */
  async saveRouteData(route, routeData) {
    this.calls.push({ method: 'saveRouteData', route });
    this.savedFiles[`routes/${route}.json`] = routeData;
    return Result.success({ route, filePath: `routes/${route}.json` });
  }

  /**
   * Mock save all stops
   * @param {Object} allStopsData - All stops data
   * @returns {Promise<Result>} Success result
   */
  async saveAllStops(allStopsData) {
    this.calls.push({ method: 'saveAllStops' });
    this.savedFiles['stops/allstops.json'] = allStopsData;
    return Result.success({
      filePath: 'stops/allstops.json',
      count: Object.keys(allStopsData).length,
    });
  }

  /**
   * Mock save all routes
   * @param {Object} allRoutesData - All routes data
   * @returns {Promise<boolean>} Success status
   */
  async saveAllRoutes(allRoutesData) {
    this.calls.push({ method: 'saveAllRoutes' });
    this.savedFiles['routes/allroutes.json'] = allRoutesData;
    return true;
  }

  /**
   * Get saved file data
   * @param {string} path - File path
   * @returns {any} Saved data
   */
  getSavedFile(path) {
    return this.savedFiles[path];
  }

  /**
   * Get all saved files
   * @returns {Object} All saved files
   */
  getAllSavedFiles() {
    return this.savedFiles;
  }

  /**
   * Get all calls made to this mock
   * @returns {Array} Array of calls
   */
  getCalls() {
    return this.calls;
  }

  /**
   * Reset saved files and call history
   */
  reset() {
    this.savedFiles = {};
    this.calls = [];
  }
}

/**
 * Mock data processor for testing
 * @class
 */
class MockDataProcessor {
  /**
   * Process route stop results
   * @param {Array} routeStopResults - Route stop results
   * @returns {Object} Processed results
   */
  static processRouteStopResults(routeStopResults) {
    return {
      routeStops: {},
      stopRoutesMap: {},
    };
  }

  /**
   * Process stop details results
   * @param {Array} stopDetailsResults - Stop details results
   * @returns {Array} Processed results
   */
  static processStopDetailsResults(stopDetailsResults) {
    return [];
  }

  /**
   * Enrich stop with routes
   * @param {Object} stopData - Stop data
   * @param {Object} stopRoutesMap - Stop routes map
   * @param {string} stopId - Stop identifier
   * @returns {Object} Enriched stop data
   */
  static enrichStopWithRoutes(stopData, stopRoutesMap, stopId) {
    return {
      ...stopData,
      routes: [],
      data_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create enriched route data
   * @param {string} route - Route identifier
   * @param {Object} routeStops - Route stops
   * @param {Array} successfulStops - Successful stops
   * @returns {Object} Enriched route data
   */
  static createEnrichedRouteData(route, routeStops, successfulStops) {
    return {
      route,
      stops: [],
    };
  }
}

module.exports = {
  MockApiClient,
  MockDataCollector,
  MockFileManager,
  MockDataProcessor,
};
