const ora = require('ora');

/**
 * @typedef {Object} StopDetailsResult
 * @property {string} stopId - Stop identifier
 * @property {Object|null} data - Stop data or null if error
 * @property {boolean} error - Whether an error occurred
 * @property {boolean} [fromCache] - Whether data came from cache
 */

/**
 * Base data collector with common collection patterns
 * @class
 */
class BaseDataCollector {
  /**
   * Create a new data collector
   * @param {import('./base-api-client').BaseApiClient} apiClient - API client instance
   * @param {number} [concurrentRequests=2] - Maximum concurrent requests
   */
  constructor(apiClient, concurrentRequests = 2) {
    this.apiClient = apiClient;
    this.concurrentRequests = concurrentRequests;
  }

  /**
   * Collect all stop details with progress tracking
   * @param {string[]} stopIds - Array of stop IDs to collect
   * @returns {Promise<PromiseSettledResult<StopDetailsResult>[]>} Array of stop detail results
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
   * @abstract
   * @param {string} stopId - Stop ID to collect
   * @returns {Promise<StopDetailsResult>} Stop details result
   * @throws {Error} If not implemented by subclass
   */
  async collectStopDetails(stopId) {
    throw new Error('collectStopDetails must be implemented by subclass');
  }

  /**
   * Compare two route arrays for equality
   * @param {string[]|null|undefined} existingRoutes - Existing routes array
   * @param {string[]|null|undefined} newRoutes - New routes array
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
