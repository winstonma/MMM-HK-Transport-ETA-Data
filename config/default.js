const { ConfigLoader } = require('../lib/config-loader');

// Load and validate configuration
const config = ConfigLoader.loadConfig();

// Export with backward compatibility for CTB-specific access
module.exports = {
  api: {
    requestsPerSecond: config.api.requestsPerSecond,
    concurrentRequests: config.api.concurrentRequests,
    timeout: config.api.timeout,
    retryLimit: config.api.retryLimit,
    // Maintain backward compatibility with old endpoint structure
    endpoints: {
      routes: config.api.endpoints.ctb.routes,
      routeStop: config.api.endpoints.ctb.routeStop,
      stop: config.api.endpoints.ctb.stop,
    },
    // New structured endpoints
    ctb: config.api.endpoints.ctb,
    kmb: config.api.endpoints.kmb,
  },
  cache: config.cache,
  output: {
    // Maintain backward compatibility
    baseDir: config.output.ctb.baseDir,
    stopsDir: config.output.ctb.stopsDir,
    routesDir: config.output.ctb.routesDir,
    // New structured output
    ctb: config.output.ctb,
    kmb: config.output.kmb,
  },
  githubPages: config.githubPages,
  environment: config.environment,
};
