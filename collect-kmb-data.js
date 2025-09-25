#!/usr/bin/env node

const { KMBService } = require('./lib/kmb-service');
const config = require('./config/default');

async function main() {
  try {
    const kmbService = new KMBService({
      requestsPerSecond: config.api.requestsPerSecond,
      concurrentRequests: config.api.concurrentRequests,
      baseDir: 'kmb', // Set base directory to 'kmb'
    });

    const result = await kmbService.collectAndSaveData();

    if (!result.success) {
      console.error('KMB data collection failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error in KMB main process:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
