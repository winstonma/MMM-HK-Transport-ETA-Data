#!/usr/bin/env node

const { CTBService } = require('./lib/ctb-service');
const config = require('./config/default');

async function main() {
  try {
    const ctbService = new CTBService({
      requestsPerSecond: config.api.requestsPerSecond,
      concurrentRequests: config.api.concurrentRequests,
      baseDir: config.output.baseDir
    });
    
    const result = await ctbService.collectAndSaveData();
    
    if (!result.success) {
      console.error('Data collection failed:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
