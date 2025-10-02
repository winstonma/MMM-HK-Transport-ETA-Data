const fs = require('fs/promises');
const path = require('path');

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

  async saveStopData(stopId, stopData) {
    try {
      const filePath = path.join(this.stopsDir, `${stopId}.json`);
      await fs.writeFile(filePath, JSON.stringify(stopData, null, 2));
      return true;
    } catch (error) {
      console.error(`Error saving data for stop ${stopId}:`, error.message);
      return false;
    }
  }

  async saveRouteData(route, routeData) {
    try {
      const filePath = path.join(this.routesDir, `${route}.json`);
      await fs.writeFile(filePath, JSON.stringify(routeData, null, 2));
      return true;
    } catch (error) {
      console.error(`Error saving data for route ${route}:`, error.message);
      return false;
    }
  }

  async saveAllStops(allStopsData) {
    try {
      console.log('Generating allstops.json...');
      const filePath = path.join(this.stopsDir, 'allstops.json');
      await fs.writeFile(filePath, JSON.stringify(allStopsData, null, 2));
      console.log('allstops.json generated successfully!');
      return true;
    } catch (error) {
      console.error('Error generating allstops.json:', error.message);
      return false;
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
