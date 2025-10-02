const { CTBApiClient } = require('./api-client');
const config = require('../config/default');
const ora = require('ora');

/**
 * KMB API client with rate limiting and concurrency control
 */
class KMBApiClient extends CTBApiClient {
  constructor(requestsPerSecond = 3, concurrentRequests = 2) {
    super(requestsPerSecond, concurrentRequests);

    // Override ky config for KMB with better timeout and headers
    const ky = require('ky').default;
    this.client = ky.create({
      timeout: 60000, // Increase timeout to 60 seconds for large datasets
      retry: {
        limit: 3,
        methods: ['get'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      hooks: {
        afterResponse: [
          async (request, options, response) => {
            if (!response.ok) {
              console.log(`Network error (${response.status}), will retry...`);
            }
            return response;
          },
        ],
      },
    });
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

  async collectRoutes() {
    const spinner = ora('Collecting CTB routes...').start();
    const data = await this.apiClient.fetchJson(config.api.endpoints.routes);
    spinner.succeed(`Found ${data.data?.length || 0} routes`);
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
    const spinner = ora(
      'Fetching existing allstops.json from GitHub...'
    ).start();
    try {
      const url =
        'https://winstonma.github.io/MMM-HK-Transport-ETA-Data/ctb/stops/allstops.json';
      const data = await this.apiClient.fetchJson(url);
      spinner.succeed(`Found ${Object.keys(data).length} existing stops`);
      return data;
    } catch (error) {
      spinner.warn(
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
    const routeList = routes.map(r => r.route);
    const spinner = ora(
      `Collecting route stops (0/${routeList.length})`
    ).start();

    let completed = 0;
    const results = [];
    const limit = this.concurrentRequests;

    for (let i = 0; i < routeList.length; i += limit) {
      const batch = routeList.slice(i, i + limit);
      const batchResults = await Promise.allSettled(
        batch.map(async route => {
          const result = await this.collectRouteStops(route);
          completed++;
          spinner.text = `Collecting route stops (${completed}/${routeList.length})`;
          return result;
        })
      );
      results.push(...batchResults);
    }

    spinner.succeed(`Collected route stops for ${routeList.length} routes`);
    return results;
  }

  async collectAllStopDetails(stopIds) {
    const spinner = ora(
      `Collecting stop details (0/${stopIds.length})`
    ).start();

    let completed = 0;
    const results = [];
    const limit = this.concurrentRequests;

    for (let i = 0; i < stopIds.length; i += limit) {
      const batch = stopIds.slice(i, i + limit);
      const batchResults = await Promise.allSettled(
        batch.map(async stopId => {
          const result = await this.collectStopDetails(stopId);
          completed++;
          spinner.text = `Collecting stop details (${completed}/${stopIds.length})`;
          return result;
        })
      );
      results.push(...batchResults);
    }

    spinner.succeed(`Collected details for ${stopIds.length} stops`);
    return results;
  }

  async collectOptimizedStopDetails(stopIds, stopRoutesMap) {
    const spinner = ora(
      `Optimizing stop details collection for ${stopIds.length} stops...`
    ).start();

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

    spinner.info(
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

  async collectRoutes() {
    const spinner = ora('Collecting KMB routes...').start();
    const data = await this.apiClient.fetchJson(
      'https://data.etabus.gov.hk/v1/transport/kmb/route/'
    );
    spinner.succeed(`Found ${data.data?.length || 0} routes`);
    return data.data || [];
  }

  async collectAllRouteStopsData() {
    const spinner = ora('Collecting all KMB route stops...').start();
    try {
      const data = await this.apiClient.fetchJson(
        'https://data.etabus.gov.hk/v1/transport/kmb/route-stop'
      );
      spinner.succeed(`Collected ${data.data?.length || 0} route stops`);
      return data.data || [];
    } catch (error) {
      spinner.fail('Error collecting all route stops: ' + error.message);
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
    const spinner = ora('Collecting all KMB stops...').start();
    try {
      // Enhanced retry logic with exponential backoff
      let retries = 3;
      let data;

      await new Promise(resolve => setTimeout(resolve, 1000));

      while (retries > 0) {
        try {
          const startTime = Date.now();
          data = await this.apiClient.fetchJson(
            'https://data.etabus.gov.hk/v1/transport/kmb/stop'
          );
          const duration = Date.now() - startTime;
          spinner.succeed(`Successfully fetched KMB stops in ${duration}ms`);
          break; // Success - exit the retry loop
        } catch (error) {
          retries--;
          spinner.text = `Attempt failed: ${error.message} (${error.code || 'unknown error'})`;
          if (retries === 0) throw error;

          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, 4 - retries) * 1000;
          spinner.text = `Retrying... (${retries} attempts remaining) - waiting ${delay / 1000}s`;
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
      spinner.fail('Error collecting stop details: ' + error.message);
      console.log('Will use fallback stop names');
      return [];
    }
  }
}

module.exports = { CTBDataCollector, KMBDataCollector };
