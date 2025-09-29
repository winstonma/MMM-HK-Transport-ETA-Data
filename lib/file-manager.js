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
      console.log('Generating compact allroutes.json...');

      // Create compact structure from the allRoutesData
      const compactData = {
        routes: {},
        stops: {},
      };

      // Process each route
      for (const [routeNumber, routeInfo] of Object.entries(allRoutesData)) {
        // routeInfo contains {route, stops: [...]}
        const stops = routeInfo.stops || routeInfo; // Handle both structured and unstructured data

        if (!compactData.routes[routeNumber]) {
          compactData.routes[routeNumber] = {
            I: [], // Inbound
            O: [], // Outbound
          };
        }

        // Separate stops by direction and sort by sequence
        const inboundStops = Array.isArray(stops)
          ? stops.filter(stop => stop.dir === 'I').sort((a, b) => a.seq - b.seq)
          : [];
        const outboundStops = Array.isArray(stops)
          ? stops.filter(stop => stop.dir === 'O').sort((a, b) => a.seq - b.seq)
          : [];

        // Process inbound stops
        for (const stop of inboundStops) {
          const stopId = stop.stop;

          // Add stop ID to the inbound direction in sequence order
          compactData.routes[routeNumber].I.push(stopId);

          // Add stop information to stops object if not already present
          if (!compactData.stops[stopId]) {
            compactData.stops[stopId] = {
              name_tc: stop.name_tc,
              name_en: stop.name_en,
              name_sc: stop.name_sc,
            };
          }
        }

        // Process outbound stops
        for (const stop of outboundStops) {
          const stopId = stop.stop;

          // Add stop ID to the outbound direction in sequence order
          compactData.routes[routeNumber].O.push(stopId);

          // Add stop information to stops object if not already present (or update if needed)
          if (!compactData.stops[stopId]) {
            compactData.stops[stopId] = {
              name_tc: stop.name_tc,
              name_en: stop.name_en,
              name_sc: stop.name_sc,
            };
          }
        }
      }

      const filePath = path.join(this.routesDir, 'allroutes.json');
      await fs.writeJson(filePath, compactData, { spaces: 2 });
      console.log('Compact allroutes.json generated successfully!');
      console.log(
        `Original size: ${JSON.stringify(allRoutesData).length} characters`
      );
      console.log(
        `Compact size: ${JSON.stringify(compactData).length} characters`
      );
      console.log(
        `Reduction: ${Math.round(((JSON.stringify(allRoutesData).length - JSON.stringify(compactData).length) / JSON.stringify(allRoutesData).length) * 100)}%`
      );
      return true;
    } catch (error) {
      console.error('Error generating compact allroutes.json:', error.message);
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
