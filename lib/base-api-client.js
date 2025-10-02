const ky = require('ky').default;
const pThrottle = require('p-throttle').default;
const { ApiCache } = require('./cache');

/**
 * Base API client with rate limiting, concurrency control and caching
 */
class BaseApiClient {
  constructor(requestsPerSecond = 3, concurrentRequests = 2, config = {}) {
    // Configure ky with timeout and retry logic
    this.client = ky.create({
      timeout: config.timeout || 30000,
      retry: {
        limit: 3,
        methods: ['get'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
      headers: config.headers || {
        'User-Agent': 'HK-Transport-Data-Collector/1.0.0',
        'Accept-Encoding': 'gzip',
      },
      hooks: config.hooks || {},
    });

    // Create throttle for rate limiting
    this.throttle = pThrottle({
      limit: requestsPerSecond,
      interval: 1000,
    });

    this.concurrentRequests = concurrentRequests;

    // Initialize cache
    this.cache = new ApiCache(
      config.cacheDir || '.cache',
      config.cacheTtl || 24 * 60 * 60 * 1000 // 24 hours default
    );
  }

  async fetchJson(url) {
    // Check cache first for GET requests
    if (this.cache.isEnabled()) {
      const cachedData = await this.cache.get(url);
      if (cachedData) {
        console.log(`Cache hit for ${url}`);
        return cachedData;
      }
    }

    const throttledFetch = this.throttle(async () => {
      try {
        const data = await this.client.get(url).json();

        // Cache the response data
        if (this.cache.isEnabled()) {
          await this.cache.set(url, data);
        }

        return data;
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

module.exports = { BaseApiClient };
