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
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Encoding': 'gzip',
      },
    });
  }
}

module.exports = { CTBApiClient };
