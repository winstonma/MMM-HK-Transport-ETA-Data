const ky = require('ky').default;
const pThrottle = require('p-throttle').default;
const config = require('../config/default');

/**
 * CTB API client with rate limiting and concurrency control
 */
class CTBApiClient {
  constructor(requestsPerSecond = 3, concurrentRequests = 2) {
    // Configure ky with timeout and retry logic
    this.client = ky.create({
      timeout: config.api.timeout,
      retry: {
        limit: 3,
        methods: ['get'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
      headers: {
        'User-Agent': 'CTB-Data-Collector/1.0.0',
        'Accept-Encoding': 'gzip',
      },
    });

    // Create throttle for rate limiting
    this.throttle = pThrottle({
      limit: requestsPerSecond,
      interval: 1000,
    });

    this.concurrentRequests = concurrentRequests;
  }

  async fetchJson(url) {
    const throttledFetch = this.throttle(async () => {
      try {
        return await this.client.get(url).json();
      } catch (error) {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
      }
    });

    return throttledFetch();
  }

  async processWithConcurrency(items, processor) {
    const results = [];
    for (let i = 0; i < items.length; i += this.concurrentRequests) {
      const batch = items.slice(i, i + this.concurrentRequests);
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );
      results.push(...batchResults);
    }
    return results;
  }
}

module.exports = { CTBApiClient };
