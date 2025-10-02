const { BaseApiClient } = require('./base-api-client');
const config = require('../config/default');

/**
 * CTB API client with rate limiting, concurrency control and caching
 */
class CTBApiClient extends BaseApiClient {
  constructor(requestsPerSecond = 3, concurrentRequests = 2) {
    super(requestsPerSecond, concurrentRequests, {
      timeout: config.api.timeout,
      cacheDir: config.cache?.dir,
      cacheTtl: config.cache?.ttl,
      headers: {
        'User-Agent': 'CTB-Data-Collector/1.0.0',
        'Accept-Encoding': 'gzip',
      },
    });
  }
}

module.exports = { CTBApiClient };
