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
}

module.exports = { CTBDataCollector };