module.exports = {
  api: {
    requestsPerSecond: parseInt(process.env.REQUESTS_PER_SECOND) || 3,
    concurrentRequests: parseInt(process.env.CONCURRENT_REQUESTS) || 2,
    timeout: parseInt(process.env.API_TIMEOUT) || 30000,
    endpoints: {
      routes:
        process.env.ROUTES_API ||
        'https://rt.data.gov.hk/v2/transport/citybus/route/ctb',
      routeStop:
        process.env.ROUTE_STOP_API ||
        'https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb',
      stop:
        process.env.STOP_API ||
        'https://rt.data.gov.hk/v2/transport/citybus/stop',
    },
  },
  output: {
    baseDir: process.env.OUTPUT_DIR || 'ctb',
    stopsDir: 'stops',
    routesDir: 'routes',
  },
};
