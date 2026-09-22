#!/usr/bin/env node
/**
 * Quick test script to verify the service worker client
 * Run with: node test-service-worker.js
 */

const { createServiceWorkerClient } = require("./dist/index.js");

async function testServiceWorkerClient() {
  console.log("=== Testing Service Worker Client ===\n");

  const client = createServiceWorkerClient();

  try {
    console.log("1. Fetching service worker manifest...");
    const manifest = await client.getManifest();
    console.log(`   ✓ Fetched ${manifest.totalChunks} chunks`);
    console.log(`   ✓ Service Worker URL: ${manifest.serviceWorkerUrl}`);
    console.log(`   ✓ Extracted at: ${manifest.extractedAt}\n`);

    console.log("2. Getting statistics...");
    const stats = await client.getStatistics();
    console.log(`   ✓ Total chunks: ${stats.total}`);
    console.log(`   ✓ Extensions found: ${Object.keys(stats.byExtension).join(", ")}`);
    console.log(`   ✓ Restricted features: ${stats.byCategory.restricted}`);
    console.log(`   ✓ Translations: ${stats.byCategory.translations}`);
    console.log(`   ✓ Modals: ${stats.byCategory.modals}\n`);

    console.log("3. Filtering JavaScript chunks...");
    const jsChunks = await client.getChunks({ extension: "js" });
    console.log(`   ✓ Found ${jsChunks.length} JavaScript chunks`);
    console.log(`   ✓ Sample: ${jsChunks[0]?.url.split("/").pop() || "N/A"}\n`);

    console.log("4. Filtering restricted features...");
    const restrictedChunks = await client.getChunks({ restrictedOnly: true });
    console.log(`   ✓ Found ${restrictedChunks.length} restricted feature chunks`);
    if (restrictedChunks.length > 0) {
      for (const chunk of restrictedChunks.slice(0, 3)) {
        const match = chunk.url.match(/restricted-feature-(\w+)/);
        if (match) {
          console.log(`   ✓ Feature: ${match[1]}`);
        }
      }
    }
    console.log();

    console.log("5. Testing cache...");
    const start1 = Date.now();
    await client.getManifest();
    const cachedTime = Date.now() - start1;
    console.log(`   ✓ Cached fetch took: ${cachedTime}ms (should be fast)\n`);

    console.log("=== All tests passed! ===\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testServiceWorkerClient().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
