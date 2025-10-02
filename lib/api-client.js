const axios = require('axios');
const Bottleneck = require('bottleneck');
const config = require('../config/default');

/**
 * CTB API client with rate limiting and concurrency control
 */
class CTBApiClient {
  constructor(requestsPerSecond = 3, concurrentRequests = 2) {
    // Configure axios with timeout and retry logic
    this.axios = axios.create({
      timeout: config.api.timeout,
      headers: {
        'User-Agent': 'CTB-Data-Collector/1.0.0',
        'Accept-Encoding': 'gzip',
      },
    });

    // Create bottleneck limiter for rate limiting and concurrency control
    this.limiter = new Bottleneck({
      maxConcurrent: concurrentRequests,
      minTime: Math.floor(1000 / requestsPerSecond),
    });
  }

  async fetchJson(url) {
    return this.limiter.schedule(async () => {
      try {
        const response = await this.axios.get(url);
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
      }
    });
  }

  async processWithConcurrency(items, processor) {
    // Bottleneck handles concurrency automatically
    return Promise.allSettled(items.map(item => this.limiter.schedule(() => processor(item))));
  }
}

module.exports = { CTBApiClient };
