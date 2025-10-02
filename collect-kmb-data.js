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

    if (result.isFailure()) {
      const error = result.getError();
      console.error('KMB data collection failed:', error.message);
      if (error.details) {
        console.error('Details:', error.details);
      }
      process.exit(1);
    }

    const data = result.unwrap();
    console.log(
      `\nSummary: ${data.successfulStops}/${data.totalStops} stops processed successfully`
    );
    if (data.saveErrors > 0) {
      console.warn(`Warning: ${data.saveErrors} file save errors occurred`);
    }
  } catch (error) {
    console.error('Error in KMB main process:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
