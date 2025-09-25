const { CTBApiClient } = require('./api-client');
const config = require('../config/default');

/**
 * KMB API client with rate limiting and concurrency control
 */
class KMBApiClient extends CTBApiClient {
  constructor(requestsPerSecond = 3, concurrentRequests = 2) {
    super(requestsPerSecond, concurrentRequests);

    // Override axios config for KMB with better timeout and headers
    this.axios.defaults.timeout = 60000; // Increase timeout to 60 seconds for large datasets
    this.axios.defaults.headers = {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    // Add response interceptor for better error handling
    this.axios.interceptors.response.use(
      response => response,
      error => {
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          console.log(`Network error (${error.code}), will retry...`);
        }
        return Promise.reject(error);
      }
    );
  }
}

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
        this.apiClient.fetchJson(
          `${config.api.endpoints.routeStop}/${route}/inbound`
        ),
        this.apiClient.fetchJson(
          `${config.api.endpoints.routeStop}/${route}/outbound`
        ),
      ]);

      return {
        route,
        inbound:
          inboundData.status === 'fulfilled'
            ? inboundData.value.data || []
            : [],
        outbound:
          outboundData.status === 'fulfilled'
            ? outboundData.value.data || []
            : [],
        error:
          inboundData.status === 'rejected' ||
          outboundData.status === 'rejected',
      };
    } catch (error) {
      console.error(
        `\nError collecting stops for route ${route}:`,
        error.message
      );
      return { route, inbound: [], outbound: [], error: true };
    }
  }

  async collectStopDetails(stopId) {
    try {
      const data = await this.apiClient.fetchJson(
        `${config.api.endpoints.stop}/${stopId}`
      );
      return { stopId, data: data.data || null, error: false };
    } catch (error) {
      console.error(
        `\nError collecting details for stop ${stopId}:`,
        error.message
      );
      return { stopId, data: null, error: true };
    }
  }

  async fetchExistingAllStops() {
    try {
      console.log('Fetching existing allstops.json from GitHub...');
      const url =
        'https://winstonma.github.io/MMM-HK-Transport-ETA-Data/ctb/stops/allstops.json';
      const data = await this.apiClient.fetchJson(url);
      console.log(`Found ${Object.keys(data).length} existing stops`);
      return data;
    } catch (error) {
      console.log(
        'Could not fetch existing allstops.json, will collect all data fresh'
      );
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
        batch.map(async route => {
          const result = await this.collectRouteStops(route);
          completed++;

          // Calculate progress
          const percentage = ((completed / routeList.length) * 100).toFixed(1);
          const elapsed = Date.now() - startTime;
          const avgTimePerRoute = elapsed / completed;
          const remaining = routeList.length - completed;
          const estimatedTimeLeft = remaining * avgTimePerRoute;

          process.stdout.write(
            `\rProgress: ${percentage}% (${completed}/${routeList.length}) - ETA: ${this.formatTime(estimatedTimeLeft)}`
          );

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
        batch.map(async stopId => {
          const result = await this.collectStopDetails(stopId);
          completed++;

          // Calculate progress
          const percentage = ((completed / stopIds.length) * 100).toFixed(1);
          const elapsed = Date.now() - startTime;
          const avgTimePerStop = elapsed / completed;
          const remaining = stopIds.length - completed;
          const estimatedTimeLeft = remaining * avgTimePerStop;

          process.stdout.write(
            `\rProgress: ${percentage}% (${completed}/${stopIds.length}) - ETA: ${this.formatTime(estimatedTimeLeft)}`
          );

          return result;
        })
      );
      results.push(...batchResults);
    }

    console.log('\nStop details collection completed!');
    return results;
  }

  async collectOptimizedStopDetails(stopIds, stopRoutesMap) {
    console.log(
      `Optimizing stop details collection for ${stopIds.length} stops...`
    );

    // Step 1: Fetch existing allstops.json
    const existingAllStops = await this.fetchExistingAllStops();

    const stopsToFetch = [];
    const stopsFromCache = [];

    // Step 2: Analyze which stops need fresh data vs can use cached data
    for (const stopId of stopIds) {
      const currentRoutes = stopRoutesMap[stopId] || [];
      const existingStop = existingAllStops[stopId];

      if (
        existingStop &&
        this.compareRoutes(existingStop.routes, currentRoutes)
      ) {
        // Routes are identical, use cached data
        stopsFromCache.push({
          stopId,
          data: existingStop,
          error: false,
          fromCache: true,
        });
      } else {
        // Routes differ or stop doesn't exist, need to fetch fresh data
        stopsToFetch.push(stopId);
      }
    }

    console.log(
      `Using cached data for ${stopsFromCache.length} stops, fetching ${stopsToFetch.length} stops`
    );

    // Step 3: Fetch fresh data for stops that need it
    let fetchResults = [];
    if (stopsToFetch.length > 0) {
      fetchResults = await this.collectAllStopDetails(stopsToFetch);
    }

    // Step 4: Combine cached and fresh results
    const allResults = [
      ...stopsFromCache,
      ...fetchResults.map(result => ({
        ...(result.value || result),
        fromCache: false,
      })),
    ];

    console.log(
      `Stop details optimization completed! Used cache for ${stopsFromCache.length}/${stopIds.length} stops`
    );
    return allResults;
  }
}

/**
 * Data collector for KMB routes and stops
 */
class KMBDataCollector {
  constructor(requestsPerSecond = 3, concurrentRequests = 2) {
    this.apiClient = new KMBApiClient(requestsPerSecond, concurrentRequests);
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
    console.log('Collecting KMB routes...');
    const data = await this.apiClient.fetchJson(
      'https://data.etabus.gov.hk/v1/transport/kmb/route/'
    );
    return data.data || [];
  }

  async collectAllRouteStopsData() {
    try {
      console.log('Collecting all KMB route stops...');
      const data = await this.apiClient.fetchJson(
        'https://data.etabus.gov.hk/v1/transport/kmb/route-stop'
      );
      return data.data || [];
    } catch (error) {
      console.error('Error collecting all route stops:', error.message);
      return [];
    }
  }

  processRouteStopsData(allRouteStops, routes) {
    const routeStops = {};

    // Get unique route names from routes array
    const routeSet = new Set();
    routes.forEach(r => routeSet.add(r.route));
    const routeList = Array.from(routeSet);

    // Initialize all routes
    routeList.forEach(route => {
      routeStops[route] = { inbound: [], outbound: [] };
    });

    // Process all route stops and group by route and direction
    allRouteStops.forEach(stop => {
      const { route, bound } = stop; // KMB uses 'bound' instead of 'dir'
      if (routeList.includes(route)) {
        if (bound === 'I' || bound === 'inbound') {
          routeStops[route].inbound.push(stop);
        } else if (bound === 'O' || bound === 'outbound') {
          routeStops[route].outbound.push(stop);
        }
      }
    });

    return routeStops;
  }

  async collectStopDetailsForStops() {
    try {
      console.log('Collecting all KMB stops...');

      // Enhanced retry logic with exponential backoff
      let retries = 3;
      let data;
      let lastError;

      while (retries > 0) {
        try {
          // Add a small delay before the first attempt to avoid immediate connection issues
          if (retries === 3) {
            console.log('Starting KMB stops collection...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          const startTime = Date.now();
          data = await this.apiClient.fetchJson(
            'https://data.etabus.gov.hk/v1/transport/kmb/stop'
          );
          const duration = Date.now() - startTime;
          console.log(`Successfully fetched KMB stops in ${duration}ms`);
          break; // Success - exit the retry loop
        } catch (error) {
          lastError = error;
          retries--;
          console.log(
            `Attempt failed: ${error.message} (${error.code || 'unknown error'})`
          );
          if (retries === 0) throw error;

          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, 4 - retries) * 1000;
          console.log(
            `Retrying... (${retries} attempts remaining) - waiting ${delay / 1000}s`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const allStops = data.data || [];

      console.log(`Retrieved ${allStops.length} total stops from KMB API`);

      // Convert to the expected format
      return allStops.map(stopData => ({
        stopId: stopData.stop,
        data: stopData,
        error: false,
      }));
    } catch (error) {
      console.error('Error collecting stop details:', error.message);
      console.log('Will use fallback stop names');
      return [];
    }
  }
}

module.exports = { CTBDataCollector, KMBDataCollector };
