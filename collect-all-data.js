#!/usr/bin/env node

const { CTBService } = require('./lib/ctb-service');
const { KMBService } = require('./lib/kmb-service');
const config = require('./config/default');

async function main() {
  const services = [
    { name: 'CTB', Service: CTBService, baseDir: config.output.baseDir },
    { name: 'KMB', Service: KMBService, baseDir: 'kmb' },
  ];

  for (const { name, Service, baseDir } of services) {
    console.log(`\n=== Collecting ${name} data ===`);
    try {
      const service = new Service({
        requestsPerSecond: config.api.requestsPerSecond,
        concurrentRequests: config.api.concurrentRequests,
        baseDir,
      });

      const result = await service.collectAndSaveData();

      if (!result.success) {
        console.error(`${name} data collection failed:`, result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error in ${name} collection:`, error);
      process.exit(1);
    }
  }

  console.log('\n✓ All data collected successfully');
}

if (require.main === module) {
  main();
}
