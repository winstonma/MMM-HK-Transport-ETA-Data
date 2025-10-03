const { ConfigValidator } = require('./config-validator');
const { ConfigurationError } = require('./errors');

/**
 * Configuration loader with validation
 */
class ConfigLoader {
  /**
   * Load and validate API configuration
   * @returns {Object} Validated API config
   */
  static loadApiConfig() {
    return {
      requestsPerSecond: ConfigValidator.validateNumber(
        process.env.REQUESTS_PER_SECOND,
        'REQUESTS_PER_SECOND',
        { min: 1, max: 100, defaultValue: 3 }
      ),
      concurrentRequests: ConfigValidator.validateNumber(
        process.env.CONCURRENT_REQUESTS,
        'CONCURRENT_REQUESTS',
        { min: 1, max: 50, defaultValue: 2 }
      ),
      timeout: ConfigValidator.validateNumber(
        process.env.API_TIMEOUT,
        'API_TIMEOUT',
        { min: 1000, max: 300000, defaultValue: 30000 }
      ),
      retryLimit: ConfigValidator.validateNumber(
        process.env.API_RETRY_LIMIT,
        'API_RETRY_LIMIT',
        { min: 0, max: 10, defaultValue: 3 }
      ),
      endpoints: {
        ctb: {
          routes: ConfigValidator.validateUrl(
            process.env.CTB_ROUTES_API,
            'CTB_ROUTES_API',
            {
              defaultValue:
                'https://rt.data.gov.hk/v2/transport/citybus/route/ctb',
            }
          ),
          routeStop: ConfigValidator.validateUrl(
            process.env.CTB_ROUTE_STOP_API,
            'CTB_ROUTE_STOP_API',
            {
              defaultValue:
                'https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb',
            }
          ),
          stop: ConfigValidator.validateUrl(
            process.env.CTB_STOP_API,
            'CTB_STOP_API',
            {
              defaultValue: 'https://rt.data.gov.hk/v2/transport/citybus/stop',
            }
          ),
        },
        kmb: {
          route: ConfigValidator.validateUrl(
            process.env.KMB_ROUTE_API,
            'KMB_ROUTE_API',
            {
              defaultValue:
                'https://data.etabus.gov.hk/v1/transport/kmb/route/',
            }
          ),
          routeStop: ConfigValidator.validateUrl(
            process.env.KMB_ROUTE_STOP_API,
            'KMB_ROUTE_STOP_API',
            {
              defaultValue:
                'https://data.etabus.gov.hk/v1/transport/kmb/route-stop',
            }
          ),
          stop: ConfigValidator.validateUrl(
            process.env.KMB_STOP_API,
            'KMB_STOP_API',
            {
              defaultValue: 'https://data.etabus.gov.hk/v1/transport/kmb/stop',
            }
          ),
        },
      },
    };
  }

  /**
   * Load and validate cache configuration
   * @returns {Object} Validated cache config
   */
  static loadCacheConfig() {
    // Disable cache in CI environments (GitHub Actions), enable locally
    const isCI = process.env.CI === 'true';

    return {
      dir: ConfigValidator.validateString(process.env.CACHE_DIR, 'CACHE_DIR', {
        defaultValue: '.cache',
      }),
      ttl: ConfigValidator.validateNumber(process.env.CACHE_TTL, 'CACHE_TTL', {
        min: 0,
        max: 7 * 24 * 60 * 60 * 1000, // Max 7 days
        defaultValue: 24 * 60 * 60 * 1000, // 24 hours
      }),
      enabled: !isCI, // Enabled locally, disabled in CI
    };
  }

  /**
   * Load and validate output configuration
   * @returns {Object} Validated output config
   */
  static loadOutputConfig() {
    return {
      ctb: {
        baseDir: ConfigValidator.validateString(
          process.env.CTB_OUTPUT_DIR,
          'CTB_OUTPUT_DIR',
          { defaultValue: 'ctb' }
        ),
        stopsDir: 'stops',
        routesDir: 'routes',
      },
      kmb: {
        baseDir: ConfigValidator.validateString(
          process.env.KMB_OUTPUT_DIR,
          'KMB_OUTPUT_DIR',
          { defaultValue: 'kmb' }
        ),
        stopsDir: 'stops',
        routesDir: 'routes',
      },
    };
  }

  /**
   * Load and validate GitHub Pages configuration
   * @returns {Object} Validated GitHub Pages config
   */
  static loadGitHubPagesConfig() {
    return {
      baseUrl: ConfigValidator.validateString(
        process.env.GITHUB_PAGES_BASE_URL,
        'GITHUB_PAGES_BASE_URL',
        {
          defaultValue: 'https://winstonma.github.io/MMM-HK-Transport-ETA-Data',
        }
      ),
    };
  }

  /**
   * Load all configuration with validation
   * @returns {Object} Complete validated configuration
   */
  static loadConfig() {
    try {
      const config = {
        api: this.loadApiConfig(),
        cache: this.loadCacheConfig(),
        output: this.loadOutputConfig(),
        githubPages: this.loadGitHubPagesConfig(),
        environment: process.env.NODE_ENV || 'production',
      };

      // Log configuration in development
      if (config.environment === 'development') {
        console.log('Loaded configuration:', JSON.stringify(config, null, 2));
      }

      return config;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.error('Configuration Error:', error.message);
        console.error('Details:', error.details);
        throw error;
      }
      throw new ConfigurationError('Failed to load configuration', {
        originalError: error.message,
      });
    }
  }
}

module.exports = { ConfigLoader };
