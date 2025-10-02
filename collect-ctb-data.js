#!/usr/bin/env node

const { CTBService } = require('./lib/ctb-service');
const config = require('./config/default');

async function main() {
  try {
    const ctbService = new CTBService({
      requestsPerSecond: config.api.requestsPerSecond,
      concurrentRequests: config.api.concurrentRequests,
      baseDir: config.output.baseDir,
    });

    const result = await ctbService.collectAndSaveData();

    if (result.isFailure()) {
      const error = result.getError();
      console.error('Data collection failed:', error.message);
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
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
