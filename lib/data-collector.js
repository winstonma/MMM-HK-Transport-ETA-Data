const { CTBApiClient } = require('./api-client');
const config = require('../config/default');

/**
 * Data collector for CTB routes and stops
 */
class CTBDataCollector {
  constructor(requestsPerSecond = 3, concurrentRequests = 2) {
    this.apiClient = new CTBApiClient(requestsPerSecond, concurrentRequests);
    this.concurrentRequests = concurrentRequests;
  }

  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  async collectRoutes() {
    console.log('Collecting CTB routes...');
    const data = await this.apiClient.fetchJson(config.api.endpoints.routes);
    return data.data || [];
  }

  async collectRouteStops(route) {
    try {
      const [inboundData, outboundData] = await Promise.allSettled([
        this.apiClient.fetchJson(`${config.api.endpoints.routeStop}/${route}/inbound`),
        this.apiClient.fetchJson(`${config.api.endpoints.routeStop}/${route}/outbound`),
      ]);

      return {
        route,
        inbound: inboundData.status === 'fulfilled' ? inboundData.value.data || [] : [],
        outbound: outboundData.status === 'fulfilled' ? outboundData.value.data || [] : [],
        error: inboundData.status === 'rejected' || outboundData.status === 'rejected',
      };
    } catch (error) {
      console.error(`\nError collecting stops for route ${route}:`, error.message);
      return { route, inbound: [], outbound: [], error: true };
    }
  }

  async collectStopDetails(stopId) {
    try {
      const data = await this.apiClient.fetchJson(`${config.api.endpoints.stop}/${stopId}`);
      return { stopId, data: data.data || null, error: false };
    } catch (error) {
      console.error(`\nError collecting details for stop ${stopId}:`, error.message);
      return { stopId, data: null, error: true };
    }
  }

  async fetchExistingAllStops() {
    try {
      console.log('Fetching existing allstops.json from GitHub...');
      const url = 'https://winstonma.github.io/MMM-HK-Transport-ETA-Data/ctb/stops/allstops.json';
      const data = await this.apiClient.fetchJson(url);
      console.log(`Found ${Object.keys(data).length} existing stops`);
      return data;
    } catch (error) {
      console.log('Could not fetch existing allstops.json, will collect all data fresh');
      return {};
    }
  }

  compareRoutes(existingRoutes, newRoutes) {
    if (!existingRoutes || !newRoutes) return false;
    if (existingRoutes.length !== newRoutes.length) return false;

    const sortedExisting = [...existingRoutes].sort();
    const sortedNew = [...newRoutes].sort();

    return sortedExisting.every((route, index) => route === sortedNew[index]);
  }

  async collectAllRouteStops(routes) {
    console.log(`Collecting route stops for ${routes.length} routes...`);

    const startTime = Date.now();
    let completed = 0;

    const results = [];
    const limit = this.concurrentRequests;
    const routeList = routes.map(r => r.route);

    for (let i = 0; i < routeList.length; i += limit) {
      const batch = routeList.slice(i, i + limit);
      const batchResults = await Promise.allSettled(
        batch.map(async (route) => {
          const result = await this.collectRouteStops(route);
          completed++;

          // Calculate progress
          const percentage = ((completed / routeList.length) * 100).toFixed(1);
          const elapsed = Date.now() - startTime;
          const avgTimePerRoute = elapsed / completed;
          const remaining = routeList.length - completed;
          const estimatedTimeLeft = remaining * avgTimePerRoute;

          process.stdout.write(`\rProgress: ${percentage}% (${completed}/${routeList.length}) - ETA: ${this.formatTime(estimatedTimeLeft)}`);

          return result;
        })
      );
      results.push(...batchResults);
    }

    console.log('\nRoute stops collection completed!');
    return results;
  }

  async collectAllStopDetails(stopIds) {
    console.log(`Collecting stop details for ${stopIds.length} stops...`);

    const startTime = Date.now();
    let completed = 0;

    const results = [];
    const limit = this.concurrentRequests;

    for (let i = 0; i < stopIds.length; i += limit) {
      const batch = stopIds.slice(i, i + limit);
      const batchResults = await Promise.allSettled(
        batch.map(async (stopId) => {
          const result = await this.collectStopDetails(stopId);
          completed++;

          // Calculate progress
          const percentage = ((completed / stopIds.length) * 100).toFixed(1);
          const elapsed = Date.now() - startTime;
          const avgTimePerStop = elapsed / completed;
          const remaining = stopIds.length - completed;
          const estimatedTimeLeft = remaining * avgTimePerStop;

          process.stdout.write(`\rProgress: ${percentage}% (${completed}/${stopIds.length}) - ETA: ${this.formatTime(estimatedTimeLeft)}`);

          return result;
        })
      );
      results.push(...batchResults);
    }

    console.log('\nStop details collection completed!');
    return results;
  }

  async collectOptimizedStopDetails(stopIds, stopRoutesMap) {
    console.log(`Optimizing stop details collection for ${stopIds.length} stops...`);

    // Step 1: Fetch existing allstops.json
    const existingAllStops = await this.fetchExistingAllStops();

    const stopsToFetch = [];
    const stopsFromCache = [];

    // Step 2: Analyze which stops need fresh data vs can use cached data
    for (const stopId of stopIds) {
      const currentRoutes = stopRoutesMap[stopId] || [];
      const existingStop = existingAllStops[stopId];

      if (existingStop && this.compareRoutes(existingStop.routes, currentRoutes)) {
        // Routes are identical, use cached data
        stopsFromCache.push({
          stopId,
          data: existingStop,
          error: false,
          fromCache: true
        });
      } else {
        // Routes differ or stop doesn't exist, need to fetch fresh data
        stopsToFetch.push(stopId);
      }
    }

    console.log(`Using cached data for ${stopsFromCache.length} stops, fetching ${stopsToFetch.length} stops`);

    // Step 3: Fetch fresh data for stops that need it
    let fetchResults = [];
    if (stopsToFetch.length > 0) {
      fetchResults = await this.collectAllStopDetails(stopsToFetch);
    }

    // Step 4: Combine cached and fresh results
    const allResults = [
      ...stopsFromCache,
      ...fetchResults.map(result => ({
        ...result.value || result,
        fromCache: false
      }))
    ];

    console.log(`Stop details optimization completed! Used cache for ${stopsFromCache.length}/${stopIds.length} stops`);
    return allResults;
  }
}

module.exports = { CTBDataCollector };