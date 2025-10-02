const { BaseFileManager } = require('./base-file-manager');
const fs = require('fs/promises');
const path = require('path');

/**
 * File manager for saving CTB data
 */
class CTBFileManager extends BaseFileManager {
  constructor(baseDir = 'ctb') {
    super(baseDir);
  }

  async saveAllRoutes(allRoutesData, routesMetadata = []) {
    try {
      console.log('Generating compact allroutes.json...');

      // Create a map of route metadata for quick lookup
      // For CTB, routes don't have direction in metadata - inbound goes from orig to dest, outbound goes from dest to orig
      const routeMetaMap = {};
      routesMetadata.forEach(routeMeta => {
        routeMetaMap[routeMeta.route] = routeMeta;
      });

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
            I: {
              stops: [],
              orig_tc: null,
              orig_en: null,
              orig_sc: null,
              dest_tc: null,
              dest_en: null,
              dest_sc: null,
            }, // Inbound (no service type for CTB)
            O: {
              stops: [],
              orig_tc: null,
              orig_en: null,
              orig_sc: null,
              dest_tc: null,
              dest_en: null,
              dest_sc: null,
            }, // Outbound (no service type for CTB)
          };
        }

        // Separate stops by direction and sort by sequence
        const inboundStops = Array.isArray(stops)
          ? stops
              .filter(stop => stop.dir === 'I')
              .sort((a, b) => parseInt(a.seq) - parseInt(b.seq))
          : [];
        const outboundStops = Array.isArray(stops)
          ? stops
              .filter(stop => stop.dir === 'O')
              .sort((a, b) => parseInt(a.seq) - parseInt(b.seq))
          : [];

        // Look up route metadata
        const routeMeta = routeMetaMap[routeNumber];
        if (routeMeta) {
          // For CTB inbound: origin -> destination (as defined in route metadata)
          compactData.routes[routeNumber].I.orig_tc = routeMeta.orig_tc;
          compactData.routes[routeNumber].I.orig_en = routeMeta.orig_en;
          compactData.routes[routeNumber].I.orig_sc = routeMeta.orig_sc;
          compactData.routes[routeNumber].I.dest_tc = routeMeta.dest_tc;
          compactData.routes[routeNumber].I.dest_en = routeMeta.dest_en;
          compactData.routes[routeNumber].I.dest_sc = routeMeta.dest_sc;

          // For CTB outbound: destination -> origin (reversed)
          compactData.routes[routeNumber].O.orig_tc = routeMeta.dest_tc;
          compactData.routes[routeNumber].O.orig_en = routeMeta.dest_en;
          compactData.routes[routeNumber].O.orig_sc = routeMeta.dest_sc;
          compactData.routes[routeNumber].O.dest_tc = routeMeta.orig_tc;
          compactData.routes[routeNumber].O.dest_en = routeMeta.orig_en;
          compactData.routes[routeNumber].O.dest_sc = routeMeta.orig_sc;
        }

        // Process inbound stops
        for (const stop of inboundStops) {
          const stopId = stop.stop;

          // Add stop ID to the inbound direction in sequence order
          compactData.routes[routeNumber].I.stops.push(stopId);

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
          compactData.routes[routeNumber].O.stops.push(stopId);

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
      await fs.writeFile(filePath, JSON.stringify(compactData, null, 2));
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
class KMBFileManager extends BaseFileManager {
  constructor(baseDir = 'kmb') {
    super(baseDir);
  }

  async saveAllRoutes(allRoutesData, routesMetadata = []) {
    try {
      console.log('Generating compact allroutes.json...');

      // Create a map of route metadata for quick lookup
      const routeMetaMap = {};
      routesMetadata.forEach(routeMeta => {
        const key = `${routeMeta.route}_${routeMeta.bound}_${routeMeta.service_type}`;
        routeMetaMap[key] = routeMeta;
      });

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
          compactData.routes[routeNumber] = {};
        }

        // Group stops by bound and service_type
        const groupedStops = {};
        if (Array.isArray(stops)) {
          stops.forEach(stop => {
            const bound = stop.bound || stop.dir || 'Unknown';
            const serviceType = stop.service_type || '1';
            const key = `${bound}_${serviceType}`;

            if (!groupedStops[key]) {
              groupedStops[key] = [];
            }
            groupedStops[key].push(stop);
          });
        }

        // Process each group of stops and organize in nested structure
        for (const [key, stopGroup] of Object.entries(groupedStops)) {
          // Sort by sequence
          const sortedStops = stopGroup.sort(
            (a, b) => parseInt(a.seq) - parseInt(b.seq)
          );

          // Extract bound and service_type from key
          const [bound, serviceType] = key.split('_');

          // Initialize the bound in routes object if not present
          if (!compactData.routes[routeNumber][bound]) {
            compactData.routes[routeNumber][bound] = {};
          }

          // Initialize the service type array under the bound
          if (!compactData.routes[routeNumber][bound][serviceType]) {
            // Create an object to hold stops and origin/destination info
            compactData.routes[routeNumber][bound][serviceType] = {
              stops: [],
              orig_tc: null,
              orig_en: null,
              orig_sc: null,
              dest_tc: null,
              dest_en: null,
              dest_sc: null,
            };
          }

          // Look up route metadata for origin/destination
          const metaKey = `${routeNumber}_${bound}_${serviceType}`;
          const routeMeta = routeMetaMap[metaKey];

          if (routeMeta) {
            compactData.routes[routeNumber][bound][serviceType].orig_tc =
              routeMeta.orig_tc;
            compactData.routes[routeNumber][bound][serviceType].orig_en =
              routeMeta.orig_en;
            compactData.routes[routeNumber][bound][serviceType].orig_sc =
              routeMeta.orig_sc;
            compactData.routes[routeNumber][bound][serviceType].dest_tc =
              routeMeta.dest_tc;
            compactData.routes[routeNumber][bound][serviceType].dest_en =
              routeMeta.dest_en;
            compactData.routes[routeNumber][bound][serviceType].dest_sc =
              routeMeta.dest_sc;
          }

          // Process stops in sequence order
          for (const stop of sortedStops) {
            const stopId = stop.stop;

            // Add stop ID to the service type array under the bound
            compactData.routes[routeNumber][bound][serviceType].stops.push(
              stopId
            );

            // Add stop information to stops object if not already present
            if (!compactData.stops[stopId]) {
              compactData.stops[stopId] = {
                name_tc: stop.name_tc,
                name_en: stop.name_en,
                name_sc: stop.name_sc,
              };
            }
          }
        }
      }

      const filePath = path.join(this.routesDir, 'allroutes.json');
      await fs.writeFile(filePath, JSON.stringify(compactData, null, 2));
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

module.exports = { CTBFileManager, KMBFileManager };
