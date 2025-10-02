const ora = require('ora');

/**
 * Base data collector with common collection patterns
 */
class BaseDataCollector {
  constructor(apiClient, concurrentRequests = 2) {
    this.apiClient = apiClient;
    this.concurrentRequests = concurrentRequests;
  }

  /**
   * Collect all stop details with progress tracking
   * @param {Array<string>} stopIds - Array of stop IDs to collect
   * @returns {Promise<Array>} Array of stop detail results
   */
  async collectAllStopDetails(stopIds) {
    const spinner = ora(
      `Collecting stop details (0/${stopIds.length})`
    ).start();

    let completed = 0;
    const results = [];
    const limit = this.concurrentRequests;

    for (let i = 0; i < stopIds.length; i += limit) {
      const batch = stopIds.slice(i, i + limit);
      const batchResults = await Promise.allSettled(
        batch.map(async stopId => {
          const result = await this.collectStopDetails(stopId);
          completed++;
          spinner.text = `Collecting stop details (${completed}/${stopIds.length})`;
          return result;
        })
      );
      results.push(...batchResults);
    }

    spinner.succeed(`Collected details for ${stopIds.length} stops`);
    return results;
  }

  /**
   * Collect stop details for a single stop
   * Must be implemented by subclasses
   * @param {string} stopId - Stop ID to collect
   * @returns {Promise<Object>} Stop details result
   */
  async collectStopDetails(stopId) {
    throw new Error('collectStopDetails must be implemented by subclass');
  }

  /**
   * Compare two route arrays for equality
   * @param {Array} existingRoutes - Existing routes array
   * @param {Array} newRoutes - New routes array
   * @returns {boolean} True if routes are identical
   */
  compareRoutes(existingRoutes, newRoutes) {
    if (!existingRoutes || !newRoutes) return false;
    if (existingRoutes.length !== newRoutes.length) return false;

    const sortedExisting = [...existingRoutes].sort();
    const sortedNew = [...newRoutes].sort();

    return sortedExisting.every((route, index) => route === sortedNew[index]);
  }
}

module.exports = { BaseDataCollector };
