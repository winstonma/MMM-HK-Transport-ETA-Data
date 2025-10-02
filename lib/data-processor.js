const { BaseDataProcessor } = require('./base-data-processor');

/**
 * Data processor for organizing and enriching CTB data
 */
class CTBDataProcessor extends BaseDataProcessor {
  static processRouteStopResults(routeStopResults) {
    const routeStops = {};
    const stopRoutesMap = {};

    routeStopResults
      .filter(result => result.status === 'fulfilled' && !result.value.error)
      .map(result => result.value)
      .forEach(result => {
        routeStops[result.route] = {
          inbound: result.inbound,
          outbound: result.outbound,
        };

        // Build a map of stops to routes
        [...result.inbound, ...result.outbound].forEach(stop => {
          if (!stopRoutesMap[stop.stop]) {
            stopRoutesMap[stop.stop] = new Set();
          }
          stopRoutesMap[stop.stop].add(result.route);
        });
      });

    return { routeStops, stopRoutesMap };
  }

  static createEnrichedRouteData(route, routeStops, successfulStops) {
    const stops = routeStops[route];
    const enrichedRouteData = {
      route: route,
      stops: [],
    };

    // Combine inbound and outbound stops
    const allStops = [...stops.inbound, ...stops.outbound];

    // Sort stops by direction and sequence
    allStops.sort((a, b) => {
      if (a.dir !== b.dir) {
        return a.dir.localeCompare(b.dir);
      }
      return a.seq - b.seq;
    });

    // Process all stops
    for (const stop of allStops) {
      // Get stop details if we have them
      const stopDetails = successfulStops.find(s => s.stopId === stop.stop);
      if (stopDetails && stopDetails.data) {
        const data = stopDetails.data;
        enrichedRouteData.stops.push({
          ...stop,
          name_tc: data.name_tc,
          name_en: data.name_en,
          name_sc: data.name_sc,
          lat: data.lat,
          long: data.long,
        });
      } else {
        // If we don't have details, just use the basic stop info
        enrichedRouteData.stops.push(stop);
      }
    }

    return enrichedRouteData;
  }
}

/**
 * Data processor for organizing and enriching KMB data
 */
class KMBDataProcessor extends BaseDataProcessor {
  static createEnrichedRouteData(route, routeStops, successfulStops) {
    const stops = routeStops[route];
    if (!stops) {
      return { route: route, stops: [] };
    }

    const enrichedRouteData = {
      route: route,
      stops: [],
    };

    // Combine inbound and outbound stops
    const allStops = [...stops.inbound, ...stops.outbound];

    // Sort stops by direction and sequence for KMB
    allStops.sort((a, b) => {
      // First sort by bound/direction
      const aDir = a.bound || '';
      const bDir = b.bound || '';
      if (aDir !== bDir) {
        return aDir.localeCompare(bDir);
      }
      // Then sort by sequence
      const aSeq = parseInt(a.seq) || 0;
      const bSeq = parseInt(b.seq) || 0;
      return aSeq - bSeq;
    });

    // Process all stops
    for (const stop of allStops) {
      // Get stop details if we have them
      const stopDetails = successfulStops.find(s => s.stopId === stop.stop);
      if (stopDetails && stopDetails.data) {
        const data = stopDetails.data;
        enrichedRouteData.stops.push({
          ...stop,
          name_tc: data.name_tc,
          name_en: data.name_en,
          name_sc: data.name_sc,
          lat: data.lat,
          long: data.long,
        });
      } else {
        // If we don't have details, just use the basic stop info
        enrichedRouteData.stops.push(stop);
      }
    }

    return enrichedRouteData;
  }
}

module.exports = { CTBDataProcessor, KMBDataProcessor };
