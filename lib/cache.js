const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * A simple file-based cache for API responses
 */
class ApiCache {
  constructor(cacheDir = '.cache', ttl = 24 * 60 * 60 * 1000) { // Default TTL: 24 hours
    this.cacheDir = cacheDir;
    this.ttl = ttl;
    this.enabled = process.env.ENABLE_API_CACHE !== 'false'; // Enable by default
  }

  /**
   * Generate a cache key from the URL
   * @param {string} url - The URL to hash
   * @returns {string} - The cache key
   */
  generateCacheKey(url) {
    return crypto
      .createHash('md5')
      .update(url)
      .digest('hex');
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
      const cacheKey = this.generateCacheKey(url);
      const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);

      const stats = await fs.stat(cachePath);
      
      // Check if cache is still valid (not expired)
      if (Date.now() - stats.mtime.getTime() < this.ttl) {
        const data = await fs.readFile(cachePath, 'utf8');
        const cacheEntry = JSON.parse(data);
        
        // Return the cached response data
        return cacheEntry.data;
      } else {
        // Cache expired, remove it
        await fs.unlink(cachePath);
        return null;
      }
    } catch (error) {
      // File doesn't exist or is corrupted, return null
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
      const cacheKey = this.generateCacheKey(url);
      const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);

      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });

      const cacheEntry = {
        url,
        data,
        timestamp: Date.now(),
      };

      await fs.writeFile(cachePath, JSON.stringify(cacheEntry, null, 2));
    } catch (error) {
      console.warn(`Failed to cache response for ${url}:`, error.message);
    }
  }

  /**
   * Clear the cache
   */
  async clear() {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
    } catch (error) {
      // Ignore errors if cache directory doesn't exist
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