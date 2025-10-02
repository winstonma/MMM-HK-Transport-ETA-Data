# Configuration Guide

This document describes all available configuration options for the HK Transport ETA Data Collector.

## Configuration Methods

Configuration can be set through:
1. Environment variables (recommended for production)
2. `.env` file (recommended for development)
3. Default values (built-in fallbacks)

## Environment Variables

### API Configuration

#### `REQUESTS_PER_SECOND`
- **Type**: Number (1-100)
- **Default**: `3`
- **Description**: Maximum number of API requests per second to avoid rate limiting

#### `CONCURRENT_REQUESTS`
- **Type**: Number (1-50)
- **Default**: `2`
- **Description**: Number of concurrent API requests to process in parallel

#### `API_TIMEOUT`
- **Type**: Number (1000-300000 milliseconds)
- **Default**: `30000` (30 seconds)
- **Description**: Timeout for API requests

#### `API_RETRY_LIMIT`
- **Type**: Number (0-10)
- **Default**: `3`
- **Description**: Number of retry attempts for failed API requests

### CTB API Endpoints

#### `CTB_ROUTES_API`
- **Type**: URL
- **Default**: `https://rt.data.gov.hk/v2/transport/citybus/route/ctb`
- **Description**: CTB routes API endpoint

#### `CTB_ROUTE_STOP_API`
- **Type**: URL
- **Default**: `https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb`
- **Description**: CTB route stops API endpoint

#### `CTB_STOP_API`
- **Type**: URL
- **Default**: `https://rt.data.gov.hk/v2/transport/citybus/stop`
- **Description**: CTB stop details API endpoint

### KMB API Endpoints

#### `KMB_ROUTE_API`
- **Type**: URL
- **Default**: `https://data.etabus.gov.hk/v1/transport/kmb/route/`
- **Description**: KMB routes API endpoint

#### `KMB_ROUTE_STOP_API`
- **Type**: URL
- **Default**: `https://data.etabus.gov.hk/v1/transport/kmb/route-stop`
- **Description**: KMB route stops API endpoint

#### `KMB_STOP_API`
- **Type**: URL
- **Default**: `https://data.etabus.gov.hk/v1/transport/kmb/stop`
- **Description**: KMB stop details API endpoint

### Cache Configuration

#### `CACHE_DIR`
- **Type**: String
- **Default**: `.cache`
- **Description**: Directory path for API response cache

#### `CACHE_TTL`
- **Type**: Number (0-604800000 milliseconds, max 7 days)
- **Default**: `86400000` (24 hours)
- **Description**: Time-to-live for cached API responses

#### `ENABLE_API_CACHE`
- **Type**: Boolean (true/false)
- **Default**: `true`
- **Description**: Enable or disable API response caching

### Output Configuration

#### `CTB_OUTPUT_DIR`
- **Type**: String
- **Default**: `ctb`
- **Description**: Output directory for CTB data files

#### `KMB_OUTPUT_DIR`
- **Type**: String
- **Default**: `kmb`
- **Description**: Output directory for KMB data files

### GitHub Pages Configuration

#### `GITHUB_PAGES_BASE_URL`
- **Type**: String
- **Default**: `https://winstonma.github.io/MMM-HK-Transport-ETA-Data`
- **Description**: Base URL for GitHub Pages deployment (used for fetching existing data)

### General Configuration

#### `NODE_ENV`
- **Type**: String (development/production)
- **Default**: `production`
- **Description**: Application environment mode

## Setup Instructions

### Development Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your preferred values:
   ```bash
   nano .env
   ```

3. Run the collector:
   ```bash
   pnpm collect
   ```

### Production Setup

Set environment variables directly in your deployment environment:

```bash
export REQUESTS_PER_SECOND=5
export CONCURRENT_REQUESTS=3
export ENABLE_API_CACHE=true
pnpm collect
```

### GitHub Actions Setup

Add secrets/variables in your repository settings:
- Go to Settings → Secrets and variables → Actions
- Add environment variables as needed

## Configuration Validation

The application validates all configuration values on startup:

- **Type checking**: Ensures values are the correct type (number, string, boolean, URL)
- **Range validation**: Checks numbers are within acceptable ranges
- **URL validation**: Verifies URLs are properly formatted
- **Required fields**: Ensures critical configuration is present

If validation fails, the application will:
1. Print a detailed error message
2. Show which configuration value is invalid
3. Exit with an error code

## Examples

### High-Performance Configuration

For faster data collection (use with caution to avoid rate limiting):

```bash
REQUESTS_PER_SECOND=10
CONCURRENT_REQUESTS=5
API_TIMEOUT=60000
```

### Conservative Configuration

For slower, more reliable data collection:

```bash
REQUESTS_PER_SECOND=2
CONCURRENT_REQUESTS=1
API_TIMEOUT=45000
API_RETRY_LIMIT=5
```

### Disable Caching

For always-fresh data (slower):

```bash
ENABLE_API_CACHE=false
```

### Custom Output Directories

```bash
CTB_OUTPUT_DIR=data/ctb
KMB_OUTPUT_DIR=data/kmb
```

## Troubleshooting

### Configuration Error on Startup

If you see a configuration error:
1. Check the error message for the specific variable
2. Verify the value is within the acceptable range
3. Ensure URLs are properly formatted
4. Check for typos in variable names

### Rate Limiting Issues

If you're being rate limited:
1. Reduce `REQUESTS_PER_SECOND`
2. Reduce `CONCURRENT_REQUESTS`
3. Increase `API_TIMEOUT`

### Cache Issues

If cached data seems stale:
1. Delete the cache directory: `rm -rf .cache`
2. Reduce `CACHE_TTL`
3. Temporarily disable cache: `ENABLE_API_CACHE=false`

## Advanced Usage

### Programmatic Configuration

You can also load and validate configuration programmatically:

```javascript
const { ConfigLoader } = require('./lib/config-loader');

try {
  const config = ConfigLoader.loadConfig();
  console.log('Configuration loaded:', config);
} catch (error) {
  console.error('Configuration error:', error.message);
}
```

### Custom Validation

Use the ConfigValidator for custom validation:

```javascript
const { ConfigValidator } = require('./lib/config-validator');

const port = ConfigValidator.validateNumber(
  process.env.PORT,
  'PORT',
  { min: 1, max: 65535, defaultValue: 3000 }
);
```
