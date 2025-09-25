const fs = require('fs-extra');
const path = require('path');

/**
 * File manager for saving CTB data
 */
class CTBFileManager {
  constructor(baseDir = 'ctb') {
    this.baseDir = baseDir;
    this.stopsDir = path.join(baseDir, 'stops');
    this.routesDir = path.join(baseDir, 'routes');
  }

  async ensureDirectories() {
    await fs.ensureDir(this.stopsDir);
    await fs.ensureDir(this.routesDir);
  }

  async saveStopData(stopId, stopData) {
    try {
      const filePath = path.join(this.stopsDir, `${stopId}.json`);
      await fs.writeJson(filePath, stopData, { spaces: 2 });
      return true;
    } catch (error) {
      console.error(`Error saving data for stop ${stopId}:`, error.message);
      return false;
    }
  }

  async saveRouteData(route, routeData) {
    try {
      const filePath = path.join(this.routesDir, `${route}.json`);
      await fs.writeJson(filePath, routeData, { spaces: 2 });
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
      await fs.writeJson(filePath, allStopsData, { spaces: 2 });
      console.log('allstops.json generated successfully!');
      return true;
    } catch (error) {
      console.error('Error generating allstops.json:', error.message);
      return false;
    }
  }

  async saveAllRoutes(allRoutesData) {
    try {
      console.log('Generating allroutes.json...');
      const filePath = path.join(this.routesDir, 'allroutes.json');
      await fs.writeJson(filePath, allRoutesData, { spaces: 2 });
      console.log('allroutes.json generated successfully!');
      return true;
    } catch (error) {
      console.error('Error generating allroutes.json:', error.message);
      return false;
    }
  }
}

/**
 * File manager for saving KMB data
 */
class KMBFileManager {
  constructor(baseDir = 'kmb') {
    this.baseDir = baseDir;
    this.stopsDir = path.join(baseDir, 'stops');
    this.routesDir = path.join(baseDir, 'routes');
  }

  async ensureDirectories() {
    await fs.ensureDir(this.stopsDir);
    await fs.ensureDir(this.routesDir);
  }

  async saveStopData(stopId, stopData) {
    try {
      const filePath = path.join(this.stopsDir, `${stopId}.json`);
      await fs.writeJson(filePath, stopData, { spaces: 2 });
      return true;
    } catch (error) {
      console.error(`Error saving data for stop ${stopId}:`, error.message);
      return false;
    }
  }

  async saveRouteData(route, routeData) {
    try {
      const filePath = path.join(this.routesDir, `${route}.json`);
      await fs.writeJson(filePath, routeData, { spaces: 2 });
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
      await fs.writeJson(filePath, allStopsData, { spaces: 2 });
      console.log('allstops.json generated successfully!');
      return true;
    } catch (error) {
      console.error('Error generating allstops.json:', error.message);
      return false;
    }
  }

  async saveAllRoutes(allRoutesData) {
    try {
      console.log('Generating allroutes.json...');
      const filePath = path.join(this.routesDir, 'allroutes.json');
      await fs.writeJson(filePath, allRoutesData, { spaces: 2 });
      console.log('allroutes.json generated successfully!');
      return true;
    } catch (error) {
      console.error('Error generating allroutes.json:', error.message);
      return false;
    }
  }
}

module.exports = { CTBFileManager, KMBFileManager };
