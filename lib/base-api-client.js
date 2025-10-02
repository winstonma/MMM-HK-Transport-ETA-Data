const ky = require('ky').default;
const pThrottle = require('p-throttle').default;
const { ApiCache } = require('./cache');
const { NetworkError } = require('./errors');
const { Result } = require('./result');

/**
 * @typedef {Object} ApiClientConfig
 * @property {number} [timeout=30000] - Request timeout in milliseconds
 * @property {string} [cacheDir='.cache'] - Cache directory path
 * @property {number} [cacheTtl=86400000] - Cache TTL in milliseconds
 * @property {Object} [headers] - Custom HTTP headers
 * @property {Object} [hooks] - Ky hooks for request/response interception
 */

/**
 * Base API client with rate limiting, concurrency control and caching
 * @class
 */
class BaseApiClient {
  /**
   * Create a new API client
   * @param {number} [requestsPerSecond=3] - Maximum requests per second
   * @param {number} [concurrentRequests=2] - Maximum concurrent requests
   * @param {ApiClientConfig} [config={}] - Client configuration
   */
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

  /**
   * Fetch JSON data from URL with caching and rate limiting
   * @param {string} url - URL to fetch
   * @returns {Promise<any>} Parsed JSON response
   * @throws {NetworkError} If the request fails
   */
  async fetchJson(url) {
    // Check cache first for GET requests
    if (this.cache.isEnabled()) {
      const cachedData = await this.cache.get(url);
      if (cachedData) {
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
        throw new NetworkError(`Failed to fetch ${url}`, {
          url,
          originalError: error.message,
          statusCode: error.response?.status,
        });
      }
    });

    return throttledFetch();
  }

  /**
   * Fetch JSON data and return a Result object (no exceptions)
   * @param {string} url - URL to fetch
   * @returns {Promise<Result>} Result containing data or error
   */
  async fetchJsonSafe(url) {
    try {
      const data = await this.fetchJson(url);
      return Result.success(data);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * Process items with controlled concurrency
   * @template T
   * @param {T[]} items - Items to process
   * @param {function(T): Promise<any>} processor - Async function to process each item
   * @returns {Promise<PromiseSettledResult<any>[]>} Array of settled results
   */
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
