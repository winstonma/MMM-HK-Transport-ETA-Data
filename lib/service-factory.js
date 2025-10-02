const { CTBService } = require('./ctb-service');
const { KMBService } = require('./kmb-service');
const { CTBDataCollector, KMBDataCollector } = require('./data-collector');
const { CTBDataProcessor, KMBDataProcessor } = require('./data-processor');
const { CTBFileManager, KMBFileManager } = require('./file-manager');

/**
 * @typedef {Object} ServiceFactoryOptions
 * @property {number} [requestsPerSecond=3] - API requests per second
 * @property {number} [concurrentRequests=2] - Concurrent requests limit
 * @property {string} [baseDir] - Output base directory (defaults to 'ctb' or 'kmb')
 */

/**
 * Factory for creating transport data collection services
 * Simplifies dependency injection and service creation
 * @class
 */
class ServiceFactory {
  /**
   * Create a CTB service with optional custom dependencies
   * @param {ServiceFactoryOptions} [options={}] - Service options
   * @param {Object} [dependencies={}] - Custom dependencies for testing
   * @param {import('./data-collector').CTBDataCollector} [dependencies.collector] - Custom collector
   * @param {import('./data-processor').CTBDataProcessor} [dependencies.processor] - Custom processor
   * @param {import('./file-manager').CTBFileManager} [dependencies.fileManager] - Custom file manager
   * @returns {CTBService} Configured CTB service
   */
  static createCTBService(options = {}, dependencies = {}) {
    const serviceOptions = {
      requestsPerSecond: options.requestsPerSecond || 3,
      concurrentRequests: options.concurrentRequests || 2,
      baseDir: options.baseDir || 'ctb',
      collector: dependencies.collector,
      processor: dependencies.processor,
      fileManager: dependencies.fileManager,
    };

    return new CTBService(serviceOptions);
  }

  /**
   * Create a KMB service with optional custom dependencies
   * @param {ServiceFactoryOptions} [options={}] - Service options
   * @param {Object} [dependencies={}] - Custom dependencies for testing
   * @param {import('./data-collector').KMBDataCollector} [dependencies.collector] - Custom collector
   * @param {import('./data-processor').KMBDataProcessor} [dependencies.processor] - Custom processor
   * @param {import('./file-manager').KMBFileManager} [dependencies.fileManager] - Custom file manager
   * @returns {KMBService} Configured KMB service
   */
  static createKMBService(options = {}, dependencies = {}) {
    const serviceOptions = {
      requestsPerSecond: options.requestsPerSecond || 3,
      concurrentRequests: options.concurrentRequests || 2,
      baseDir: options.baseDir || 'kmb',
      collector: dependencies.collector,
      processor: dependencies.processor,
      fileManager: dependencies.fileManager,
    };

    return new KMBService(serviceOptions);
  }

  /**
   * Create a CTB data collector
   * @param {number} [requestsPerSecond=3] - API requests per second
   * @param {number} [concurrentRequests=2] - Concurrent requests limit
   * @returns {CTBDataCollector} CTB data collector
   */
  static createCTBCollector(requestsPerSecond = 3, concurrentRequests = 2) {
    return new CTBDataCollector(requestsPerSecond, concurrentRequests);
  }

  /**
   * Create a KMB data collector
   * @param {number} [requestsPerSecond=3] - API requests per second
   * @param {number} [concurrentRequests=2] - Concurrent requests limit
   * @returns {KMBDataCollector} KMB data collector
   */
  static createKMBCollector(requestsPerSecond = 3, concurrentRequests = 2) {
    return new KMBDataCollector(requestsPerSecond, concurrentRequests);
  }

  /**
   * Create a CTB file manager
   * @param {string} [baseDir='ctb'] - Output base directory
   * @returns {CTBFileManager} CTB file manager
   */
  static createCTBFileManager(baseDir = 'ctb') {
    return new CTBFileManager(baseDir);
  }

  /**
   * Create a KMB file manager
   * @param {string} [baseDir='kmb'] - Output base directory
   * @returns {KMBFileManager} KMB file manager
   */
  static createKMBFileManager(baseDir = 'kmb') {
    return new KMBFileManager(baseDir);
  }

  /**
   * Get CTB data processor (static class)
   * @returns {typeof CTBDataProcessor} CTB data processor
   */
  static getCTBProcessor() {
    return CTBDataProcessor;
  }

  /**
   * Get KMB data processor (static class)
   * @returns {typeof KMBDataProcessor} KMB data processor
   */
  static getKMBProcessor() {
    return KMBDataProcessor;
  }
}

module.exports = { ServiceFactory };
