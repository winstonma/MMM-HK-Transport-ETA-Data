/**
 * @typedef {Object} EnrichedStopData
 * @property {string} stop - Stop identifier
 * @property {string} name_en - English name
 * @property {string} name_tc - Traditional Chinese name
 * @property {string} name_sc - Simplified Chinese name
 * @property {string} lat - Latitude
 * @property {string} long - Longitude
 * @property {string[]} routes - Array of route identifiers
 * @property {string} data_timestamp - ISO timestamp of data collection
 */

/**
 * @typedef {Object} EnrichedRouteData
 * @property {string} route - Route identifier
 * @property {Object[]} stops - Array of stop objects with details
 */

/**
 * Base data processor with common processing patterns
 * @class
 */
class BaseDataProcessor {
  /**
   * Process stop details results from Promise.allSettled
   * @param {PromiseSettledResult<any>[]} stopDetailsResults - Results from Promise.allSettled
   * @returns {Array<{stopId: string, data: Object}>} Filtered successful results
   */
  static processStopDetailsResults(stopDetailsResults) {
    return stopDetailsResults
      .filter(result => {
        // Handle both Promise.allSettled results and direct results
        const data = result.status ? result.value : result;
        return !data.error && data.data;
      })
      .map(result => {
        // Handle both Promise.allSettled results and direct results
        const data = result.status ? result.value : result;
        return data;
      });
  }

  /**
   * Enrich stop data with routes and timestamp
   * @param {Object} stopData - Stop data to enrich
   * @param {Object.<string, (string[]|Set<string>)>} stopRoutesMap - Map of stop IDs to routes
   * @param {string} stopId - Stop ID
   * @returns {EnrichedStopData} Enriched stop data with routes and timestamp
   */
  static enrichStopWithRoutes(stopData, stopRoutesMap, stopId) {
    // If routes are already in stopData (from cache), use current routes from stopRoutesMap
    const routes = stopRoutesMap[stopId]
      ? Array.isArray(stopRoutesMap[stopId])
        ? stopRoutesMap[stopId]
        : Array.from(stopRoutesMap[stopId])
      : stopData.routes || [];

    return {
      ...stopData,
      routes: routes,
      data_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create enriched route data with stop details
   * Must be implemented by subclasses for direction-specific logic
   * @abstract
   * @param {string} route - Route identifier
   * @param {Object.<string, {inbound: Object[], outbound: Object[]}>} routeStops - Route stops data
   * @param {Array<{stopId: string, data: Object}>} successfulStops - Array of successful stop details
   * @returns {EnrichedRouteData} Enriched route data
   * @throws {Error} If not implemented by subclass
   */
  static createEnrichedRouteData(route, routeStops, successfulStops) {
    throw new Error('createEnrichedRouteData must be implemented by subclass');
  }
}

module.exports = { BaseDataProcessor };
