const fs = require('fs/promises');
const path = require('path');
const { FileSystemError } = require('./errors');
const { Result } = require('./result');

/**
 * Base file manager for saving transport data
 */
class BaseFileManager {
  constructor(baseDir = 'data') {
    this.baseDir = baseDir;
    this.stopsDir = path.join(baseDir, 'stops');
    this.routesDir = path.join(baseDir, 'routes');
  }

  async ensureDirectories() {
    await fs.mkdir(this.stopsDir, { recursive: true });
    await fs.mkdir(this.routesDir, { recursive: true });
  }

  /**
   * Save stop data to file
   * @param {string} stopId - Stop ID
   * @param {Object} stopData - Stop data to save
   * @returns {Promise<Result>} Result indicating success or failure
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
   * @param {Object} routeData - Route data to save
   * @returns {Promise<Result>} Result indicating success or failure
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
   * @param {Object} allStopsData - All stops data
   * @returns {Promise<Result>} Result indicating success or failure
   */
  async saveAllStops(allStopsData) {
    try {
      console.log('Generating allstops.json...');
      const filePath = path.join(this.stopsDir, 'allstops.json');
      await fs.writeFile(filePath, JSON.stringify(allStopsData, null, 2));
      console.log('allstops.json generated successfully!');
      return Result.success({ filePath, count: Object.keys(allStopsData).length });
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
   * @param {Object} allRoutesData - All routes data
   * @returns {Promise<boolean>} Success status
   */
  async saveAllRoutes(allRoutesData) {
    throw new Error('saveAllRoutes must be implemented by subclass');
  }
}

module.exports = { BaseFileManager };
