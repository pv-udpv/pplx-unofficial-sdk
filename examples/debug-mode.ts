/**
 * Debug Mode Example
 * 
 * This example demonstrates how to use debug mode to collect
 * and log Datadog APM and Logs URLs for debugging purposes.
 */

import { createPplxClient } from '@pplx-unofficial/sdk';

async function main() {
  const client = createPplxClient();

  console.log('Starting search with debug mode enabled...\n');

  // Enable debug mode to automatically log Datadog URLs
  for await (const entry of client.search("quantum computing", { debug: true })) {
    console.log(`\nEntry Status: ${entry.status}`);
    console.log(`Entry UUID: ${entry.uuid}`);
    
    // Debug URLs are automatically logged to console by DebugLogger
    // Look for [DEBUG] groups in the console output
    
    if (entry.blocks && entry.blocks.length > 0) {
      console.log('Content:', entry.blocks);
    }
    
    if (entry.final) {
      console.log('\n✅ Final entry received');
      break;
    }
  }
}

// Run the example
main().catch(console.error);
