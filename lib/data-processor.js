/**
 * Data processor for organizing and enriching CTB data
 */
class CTBDataProcessor {
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

  static processStopDetailsResults(stopDetailsResults) {
    return stopDetailsResults
      .filter(result => {
        // Handle both Promise.allSettled results and direct results
        const data = result.status ? result.value : result;
        return !data.error && data.data;
      })
      .map(result => {
        // Handle both Promise.allSettled results and direct results
        const data = result.status ? result.value : result;
        return data;
      });
  }

  static enrichStopWithRoutes(stopData, stopRoutesMap, stopId) {
    // If routes are already in stopData (from cache), use current routes from stopRoutesMap
    const routes = stopRoutesMap[stopId] ? 
      (Array.isArray(stopRoutesMap[stopId]) ? stopRoutesMap[stopId] : Array.from(stopRoutesMap[stopId])) :
      (stopData.routes || []);
    
    return {
      ...stopData,
      routes: routes,
      data_timestamp: new Date().toISOString()
    };
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

module.exports = { CTBDataProcessor };