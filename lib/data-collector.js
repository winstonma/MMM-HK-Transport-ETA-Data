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

  async collectRoutes() {
    console.log('Collecting CTB routes...');
    const data = await this.apiClient.fetchJson(config.api.endpoints.routes);
    return data.data || [];
  }

  async collectRouteStops(route) {
    console.log(`Collecting stops for route ${route}...`);
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
      console.error(`Error collecting stops for route ${route}:`, error.message);
      return { route, inbound: [], outbound: [], error: true };
    }
  }

  async collectStopDetails(stopId) {
    console.log(`Collecting details for stop ${stopId}...`);
    try {
      const data = await this.apiClient.fetchJson(`${config.api.endpoints.stop}/${stopId}`);
      return { stopId, data: data.data || null, error: false };
    } catch (error) {
      console.error(`Error collecting details for stop ${stopId}:`, error.message);
      return { stopId, data: null, error: true };
    }
  }

  async collectAllRouteStops(routes) {
    console.log('Collecting route stops...');
    return await this.apiClient.processWithConcurrency(
      routes.map(r => r.route),
      (route) => this.collectRouteStops(route)
    );
  }

  async collectAllStopDetails(stopIds) {
    console.log('Collecting stop details...');
    return await this.apiClient.processWithConcurrency(
      stopIds,
      (stopId) => this.collectStopDetails(stopId)
    );
  }
}

module.exports = { CTBDataCollector };