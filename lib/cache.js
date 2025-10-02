const Keyv = require('keyv').default || require('keyv');
const { KeyvFile } = require('keyv-file');

/**
 * API cache using Keyv with file backend
 * Provides better performance and automatic TTL management
 */
class ApiCache {
  constructor(cacheDir = '.cache', ttl = 24 * 60 * 60 * 1000) {
    this.cacheDir = cacheDir;
    this.ttl = ttl;
    this.enabled = process.env.ENABLE_API_CACHE !== 'false'; // Enable by default
    
    if (this.enabled) {
      // Initialize Keyv with file backend (no native dependencies)
      this.store = new Keyv({
        store: new KeyvFile({
          filename: `${cacheDir}/cache.json`,
          writeDelay: 100, // Batch writes for better performance
        }),
        ttl: this.ttl,
        namespace: 'api',
      });

      // Handle errors
      this.store.on('error', err => {
        console.warn('Cache error:', err.message);
      });
    }
  }

  /**
   * Get cached response
   * @param {string} url - The URL to look up
   * @returns {Promise<any|null>} - The cached response or null if not found/expired
   */
  async get(url) {
    if (!this.enabled) {
      return null;
    }

    try {
      const data = await this.store.get(url);
      if (data) {
        console.log(`Cache hit for ${url}`);
      }
      return data || null;
    } catch (error) {
      console.warn(`Cache get error for ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Save response to cache
   * @param {string} url - The URL to cache
   * @param {any} data - The response data to cache
   */
  async set(url, data) {
    if (!this.enabled) {
      return;
    }

    try {
      await this.store.set(url, data, this.ttl);
    } catch (error) {
      console.warn(`Failed to cache response for ${url}:`, error.message);
    }
  }

  /**
   * Clear the cache
   */
  async clear() {
    if (!this.enabled) {
      return;
    }

    try {
      await this.store.clear();
      console.log('Cache cleared successfully');
    } catch (error) {
      console.warn('Failed to clear cache:', error.message);
    }
  }

  /**
   * Check if caching is enabled
   */
  isEnabled() {
    return this.enabled;
  }
}

module.exports = { ApiCache };
