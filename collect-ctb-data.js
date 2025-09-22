#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// API endpoints
const ROUTES_API = 'https://rt.data.gov.hk/v2/transport/citybus/route/ctb';
const ROUTE_STOP_API =
  'https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb';
const STOP_API = 'https://rt.data.gov.hk/v2/transport/citybus/stop';

// Directory to store the data
const DATA_DIR = path.join(__dirname, 'ctb');
const STOPS_DIR = path.join(DATA_DIR, 'stops');
const ROUTES_DIR = path.join(DATA_DIR, 'routes');

// Rate limiting configuration
// Limit concurrent requests to avoid overwhelming the API
const CONCURRENT_REQUESTS = 2;
// Target requests per second (3 RPS = ~333ms between requests)
const REQUESTS_PER_SECOND = 3;

// Token bucket rate limiter
class RateLimiter {
  constructor(requestsPerSecond) {
    this.tokens = requestsPerSecond;
    this.lastRefill = Date.now();
    this.maxTokens = requestsPerSecond;
    this.refillRate = requestsPerSecond; // tokens per second
  }

  async wait() {
    // Refill tokens based on time passed
    const now = Date.now();
    const secondsSinceLastRefill = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + secondsSinceLastRefill * this.refillRate
    );
    this.lastRefill = now;

    // If we have no tokens, wait for more
    if (this.tokens < 1) {
      const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
      await delay(waitTime);
      this.tokens = 1;
      this.lastRefill = Date.now();
    }

    // Consume a token
    this.tokens -= 1;
  }
}

// Simple delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Dynamically import node-fetch
  const { default: fetch } = await import('node-fetch');
  const rateLimiter = new RateLimiter(REQUESTS_PER_SECOND);

  async function fetchJson(url) {
    // Wait for rate limiter
    await rateLimiter.wait();

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`
      );
    }
    return await response.json();
  }

  // Process items with a concurrency limit
  async function processWithConcurrency(items, processor, concurrencyLimit) {
    const results = [];
    for (let i = 0; i < items.length; i += concurrencyLimit) {
      const batch = items.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.allSettled(batch.map(processor));
      results.push(...batchResults);
    }
    return results;
  }

  async function collectRoutes() {
    console.log('Collecting CTB routes...');
    const data = await fetchJson(ROUTES_API);
    return data.data || [];
  }

  async function collectRouteStops(route) {
    console.log(`Collecting stops for route ${route}...`);
    try {
      const [inboundData, outboundData] = await Promise.allSettled([
        fetchJson(`${ROUTE_STOP_API}/${route}/inbound`),
        fetchJson(`${ROUTE_STOP_API}/${route}/outbound`),
      ]);

      return {
        route,
        inbound:
          inboundData.status === 'fulfilled'
            ? inboundData.value.data || []
            : [],
        outbound:
          outboundData.status === 'fulfilled'
            ? outboundData.value.data || []
            : [],
        error:
          inboundData.status === 'rejected' ||
          outboundData.status === 'rejected',
      };
    } catch (error) {
      console.error(
        `Error collecting stops for route ${route}:`,
        error.message
      );
      return { route, inbound: [], outbound: [], error: true };
    }
  }

  async function collectStopDetails(stopId) {
    console.log(`Collecting details for stop ${stopId}...`);
    try {
      const data = await fetchJson(`${STOP_API}/${stopId}`);
      return { stopId, data: data.data || null, error: false };
    } catch (error) {
      console.error(
        `Error collecting details for stop ${stopId}:`,
        error.message
      );
      return { stopId, data: null, error: true };
    }
  }

  try {
    // Ensure the stops and routes directories exist within the ctb directory
    await fs.mkdir(STOPS_DIR, { recursive: true });
    await fs.mkdir(ROUTES_DIR, { recursive: true });

    // Step 1: Collect all routes
    const routes = await collectRoutes();
    console.log(`Found ${routes.length} routes`);
    
    // Use all routes for processing
    const testRoutes = routes;
    console.log(`Processing all routes: ${routes.map(r => r.route).join(', ')}`);

    // Step 2: Collect all route-stops in parallel
    console.log('Collecting route stops...');
    const routeStopResults = await processWithConcurrency(
      testRoutes.map(r => r.route),
      collectRouteStops,
      CONCURRENT_REQUESTS
    );

    // Filter out errors and build routeStops object and stopRoutesMap
    const routeStops = {};
    const stopRoutesMap = {};

    routeStopResults
      .filter(result => result.status === 'fulfilled' && !result.value.error)
      .map(result => result.value)
      .forEach(result => {
        routeStops[result.route] = {
          inbound: result.inbound,
          outbound: result.outbound,
        };

        // Build a map of stops to routes
        [...result.inbound, ...result.outbound].forEach(stop => {
          if (!stopRoutesMap[stop.stop]) {
            stopRoutesMap[stop.stop] = new Set();
          }
          stopRoutesMap[stop.stop].add(result.route);
        });
      });

    // Step 3 & 4: For each unique stop, collect details and save to file
    const stopIds = Object.keys(stopRoutesMap);
    console.log(`Found ${stopIds.length} unique stops`);

    console.log('Collecting stop details...');
    const stopDetailsResults = await processWithConcurrency(
      stopIds,
      collectStopDetails,
      CONCURRENT_REQUESTS
    );

    // Process successful results and save to files
    const successfulStops = stopDetailsResults
      .filter(
        result =>
          result.status === 'fulfilled' &&
          !result.value.error &&
          result.value.data
      )
      .map(result => result.value);

    console.log(`Processing ${successfulStops.length} stops with details...`);

    // Prepare data for allstops.json
    const allStopsData = {};

    for (const { stopId, data } of successfulStops) {
      try {
        // Add routes information to stop details
        const stopData = {
          ...data,
          routes: Array.from(stopRoutesMap[stopId]),
        };

        // Save individual stop file in stops directory
        const filePath = path.join(STOPS_DIR, `${stopId}.json`);
        await fs.writeFile(filePath, JSON.stringify(stopData, null, 2));

        // Add to all stops data
        allStopsData[stopId] = stopData;
      } catch (error) {
        console.error(`Error saving data for stop ${stopId}:`, error.message);
      }
    }

    // Generate allstops.json in the stops directory
    try {
      console.log('Generating allstops.json...');
      const allStopsFilePath = path.join(STOPS_DIR, 'allstops.json');
      await fs.writeFile(
        allStopsFilePath,
        JSON.stringify(allStopsData, null, 2)
      );
      console.log('allstops.json generated successfully!');
    } catch (error) {
      console.error('Error generating allstops.json:', error.message);
    }

    // Generate route files with enriched stop information
    console.log('Generating route files with enriched stop information...');
    const allRoutesData = {};
    
    for (const [route, stops] of Object.entries(routeStops)) {
      try {
        // Create enriched route data with combined stops
        const enrichedRouteData = {
          route: route,
          stops: [],
        };

        // Combine inbound and outbound stops
        const allStops = [...stops.inbound, ...stops.outbound];
        
        // Sort stops by direction and sequence
        allStops.sort((a, b) => {
          if (a.dir !== b.dir) {
            return a.dir.localeCompare(b.dir);
          }
          return a.seq - b.seq;
        });

        // Process all stops
        for (const stop of allStops) {
          // Get stop details if we have them
          const stopDetails = successfulStops.find(s => s.stopId === stop.stop);
          if (stopDetails && stopDetails.data) {
            enrichedRouteData.stops.push({
              ...stop,
              name_tc: stopDetails.data.name_tc,
              name_en: stopDetails.data.name_en,
              name_sc: stopDetails.data.name_sc,
              lat: stopDetails.data.lat,
              long: stopDetails.data.long,
            });
          } else {
            // If we don't have details, just use the basic stop info
            enrichedRouteData.stops.push(stop);
          }
        }

        // Save to all routes data
        allRoutesData[route] = enrichedRouteData;

        // Save individual route file
        const routeFilePath = path.join(ROUTES_DIR, `${route}.json`);
        await fs.writeFile(
          routeFilePath,
          JSON.stringify(enrichedRouteData, null, 2)
        );
      } catch (error) {
        console.error(`Error saving data for route ${route}:`, error.message);
      }
    }
    
    // Generate allroutes.json in the routes directory
    try {
      console.log('Generating allroutes.json...');
      const allRoutesFilePath = path.join(ROUTES_DIR, 'allroutes.json');
      await fs.writeFile(
        allRoutesFilePath,
        JSON.stringify(allRoutesData, null, 2)
      );
      console.log('allroutes.json generated successfully!');
    } catch (error) {
      console.error('Error generating allroutes.json:', error.message);
    }

    console.log('Data collection completed!');
    console.log(
      `Successfully processed ${successfulStops.length} out of ${stopIds.length} stops`
    );
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
