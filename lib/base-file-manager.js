const fs = require('fs/promises');
const path = require('path');
const { FileSystemError } = require('./errors');
const { Result } = require('./result');

/**
 * @typedef {Object} SaveResult
 * @property {string} filePath - Path where file was saved
 * @property {string} [stopId] - Stop ID (for stop saves)
 * @property {string} [route] - Route ID (for route saves)
 * @property {number} [count] - Number of items saved (for bulk saves)
 */

/**
 * Base file manager for saving transport data
 * @class
 */
class BaseFileManager {
  /**
   * Create a new file manager
   * @param {string} [baseDir='data'] - Base directory for output files
   */
  constructor(baseDir = 'data') {
    this.baseDir = baseDir;
    this.stopsDir = path.join(baseDir, 'stops');
    this.routesDir = path.join(baseDir, 'routes');
  }

  /**
   * Ensure output directories exist
   * @returns {Promise<void>}
   */
  async ensureDirectories() {
    await fs.mkdir(this.stopsDir, { recursive: true });
    await fs.mkdir(this.routesDir, { recursive: true });
  }

  /**
   * Save stop data to file
   * @param {string} stopId - Stop ID
   * @param {import('./base-data-processor').EnrichedStopData} stopData - Stop data to save
   * @returns {Promise<Result<SaveResult>>} Result indicating success or failure
   */
  async saveStopData(stopId, stopData) {
    try {
      const filePath = path.join(this.stopsDir, `${stopId}.json`);
      await fs.writeFile(filePath, JSON.stringify(stopData, null, 2));
      return Result.success({ stopId, filePath });
    } catch (error) {
      const fsError = new FileSystemError(
        `Failed to save stop data for ${stopId}`,
        { stopId, originalError: error.message }
      );
      console.error(fsError.message);
      return Result.failure(fsError);
    }
  }

  /**
   * Save route data to file
   * @param {string} route - Route identifier
   * @param {import('./base-data-processor').EnrichedRouteData} routeData - Route data to save
   * @returns {Promise<Result<SaveResult>>} Result indicating success or failure
   */
  async saveRouteData(route, routeData) {
    try {
      const filePath = path.join(this.routesDir, `${route}.json`);
      await fs.writeFile(filePath, JSON.stringify(routeData, null, 2));
      return Result.success({ route, filePath });
    } catch (error) {
      const fsError = new FileSystemError(
        `Failed to save route data for ${route}`,
        { route, originalError: error.message }
      );
      console.error(fsError.message);
      return Result.failure(fsError);
    }
  }

  /**
   * Save all stops data to file
   * @param {Object.<string, import('./base-data-processor').EnrichedStopData>} allStopsData - All stops data
   * @returns {Promise<Result<SaveResult>>} Result indicating success or failure
   */
  async saveAllStops(allStopsData) {
    try {
      console.log('Generating allstops.json...');
      const filePath = path.join(this.stopsDir, 'allstops.json');
      await fs.writeFile(filePath, JSON.stringify(allStopsData, null, 2));
      console.log('allstops.json generated successfully!');
      return Result.success({
        filePath,
        count: Object.keys(allStopsData).length,
      });
    } catch (error) {
      const fsError = new FileSystemError('Failed to generate allstops.json', {
        originalError: error.message,
      });
      console.error(fsError.message);
      return Result.failure(fsError);
    }
  }

  /**
   * Save all routes data
   * Must be implemented by subclasses for format-specific logic
   * @abstract
   * @param {Object.<string, import('./base-data-processor').EnrichedRouteData>} allRoutesData - All routes data
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If not implemented by subclass
   */
  async saveAllRoutes(allRoutesData) {
    throw new Error('saveAllRoutes must be implemented by subclass');
  }
}

module.exports = { BaseFileManager };
