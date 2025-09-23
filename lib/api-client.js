const axios = require('axios');
const config = require('../config/default');

/**
 * CTB API client with rate limiting and concurrency control
 */
class CTBApiClient {
  constructor(requestsPerSecond = 3, concurrentRequests = 2) {
    // Create rate limiter - converts RPS to requests per interval
    const intervalMs = 1000 / requestsPerSecond;
    this.concurrentRequests = concurrentRequests;
    this.lastRequestTime = 0;
    this.intervalMs = intervalMs;

    // Configure axios with timeout and retry logic
    this.axios = axios.create({
      timeout: config.api.timeout,
      headers: {
        'User-Agent': 'CTB-Data-Collector/1.0.0'
      }
    });
  }

  async fetchJson(url) {
    // Simple rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.intervalMs) {
      await this.delay(this.intervalMs - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();

    try {
      const response = await this.axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
  }

  async processWithConcurrency(items, processor, concurrencyLimit = null) {
    // Use simple batching for concurrency control
    const limit = concurrencyLimit || this.concurrentRequests;
    const results = [];
    
    for (let i = 0; i < items.length; i += limit) {
      const batch = items.slice(i, i + limit);
      const batchResults = await Promise.allSettled(batch.map(processor));
      results.push(...batchResults);
    }
    
    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { CTBApiClient };