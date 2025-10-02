const { BaseFileManager } = require('./base-file-manager');

/**
 * File manager for saving CTB data
 */
class CTBFileManager extends BaseFileManager {
  constructor(baseDir = 'ctb') {
    super(baseDir);
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
            I: {
              // For CTB, we use service type "1" as default
              "1": []
            }, // Inbound with service type
            O: {
              // For CTB, we use service type "1" as default
              "1": []
            }, // Outbound with service type
          };
        }

        // Separate stops by direction and sort by sequence
        const inboundStops = Array.isArray(stops)
          ? stops.filter(stop => stop.dir === 'I').sort((a, b) => parseInt(a.seq) - parseInt(b.seq))
          : [];
        const outboundStops = Array.isArray(stops)
          ? stops.filter(stop => stop.dir === 'O').sort((a, b) => parseInt(a.seq) - parseInt(b.seq))
          : [];

        // Process inbound stops
        for (const stop of inboundStops) {
          const stopId = stop.stop;

          // Add stop ID to the inbound direction in sequence order
          compactData.routes[routeNumber].I["1"].push(stopId);

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
          compactData.routes[routeNumber].O["1"].push(stopId);

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
            compactData.routes[routeNumber][bound][serviceType] = [];
          }

          // Process stops in sequence order
          for (const stop of sortedStops) {
            const stopId = stop.stop;

            // Add stop ID to the service type array under the bound
            compactData.routes[routeNumber][bound][serviceType].push(stopId);

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
