/**
 * Base data processor with common processing patterns
 */
class BaseDataProcessor {
  /**
   * Process stop details results from Promise.allSettled
   * @param {Array} stopDetailsResults - Results from Promise.allSettled
   * @returns {Array} Filtered successful results
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
   * @param {Object} stopRoutesMap - Map of stop IDs to routes
   * @param {string} stopId - Stop ID
   * @returns {Object} Enriched stop data
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
   * @param {string} route - Route identifier
   * @param {Object} routeStops - Route stops data
   * @param {Array} successfulStops - Array of successful stop details
   * @returns {Object} Enriched route data
   */
  static createEnrichedRouteData(route, routeStops, successfulStops) {
    throw new Error('createEnrichedRouteData must be implemented by subclass');
  }
}

module.exports = { BaseDataProcessor };
