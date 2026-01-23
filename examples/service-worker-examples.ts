// ============================================================================
// Service Worker Client Examples
// Demonstrates fetching and parsing Perplexity's service worker manifest
// ============================================================================

import { createServiceWorkerClient, createPplxSDK } from "@pplx-unofficial/sdk";

// ============================================================================
// EXAMPLE 1: Basic Usage - Get Manifest
// ============================================================================

async function example1_getManifest() {
  console.log("=== Example 1: Get Service Worker Manifest ===\n");

  const client = createServiceWorkerClient();

  try {
    const manifest = await client.getManifest();
    
    console.log(`Service Worker URL: ${manifest.serviceWorkerUrl}`);
    console.log(`Total Chunks: ${manifest.totalChunks}`);
    console.log(`Extracted At: ${manifest.extractedAt}`);
    console.log(`\nFirst 5 chunks:`);
    
    for (const chunk of manifest.chunks.slice(0, 5)) {
      console.log(`  - ${chunk.url}`);
      console.log(`    Revision: ${chunk.revision}`);
    }
  } catch (error) {
    console.error("Error fetching manifest:", error);
  }
}

// ============================================================================
// EXAMPLE 2: Filter Chunks by Extension
// ============================================================================

async function example2_filterByExtension() {
  console.log("\n=== Example 2: Filter Chunks by Extension ===\n");

  const client = createServiceWorkerClient();

  try {
    // Get all JavaScript chunks
    const jsChunks = await client.getChunks({ extension: "js" });
    console.log(`Total JavaScript chunks: ${jsChunks.length}`);
    
    // Get all CSS chunks
    const cssChunks = await client.getChunks({ extension: "css" });
    console.log(`Total CSS chunks: ${cssChunks.length}`);
    
    // Get all font chunks
    const fontChunks = await client.getChunks({ extension: "woff2" });
    console.log(`Total font chunks: ${fontChunks.length}`);
  } catch (error) {
    console.error("Error filtering chunks:", error);
  }
}

// ============================================================================
// EXAMPLE 3: Filter Restricted Features
// ============================================================================

async function example3_filterRestricted() {
  console.log("\n=== Example 3: Filter Restricted Features ===\n");

  const client = createServiceWorkerClient();

  try {
    const restrictedChunks = await client.getChunks({ restrictedOnly: true });
    
    console.log(`Total restricted feature chunks: ${restrictedChunks.length}`);
    console.log("\nRestricted features:");
    
    for (const chunk of restrictedChunks) {
      // Extract feature name from URL
      const match = chunk.url.match(/restricted-feature-(\w+)/);
      if (match) {
        console.log(`  - ${match[1]}: ${chunk.url}`);
      }
    }
  } catch (error) {
    console.error("Error filtering restricted chunks:", error);
  }
}

// ============================================================================
// EXAMPLE 4: Get Statistics
// ============================================================================

async function example4_getStatistics() {
  console.log("\n=== Example 4: Get Statistics ===\n");

  const client = createServiceWorkerClient();

  try {
    const stats = await client.getStatistics();
    
    console.log(`Total chunks: ${stats.total}`);
    console.log("\nBy extension:");
    for (const [ext, count] of Object.entries(stats.byExtension)) {
      console.log(`  ${ext}: ${count}`);
    }
    
    console.log("\nBy category:");
    console.log(`  Restricted features: ${stats.byCategory.restricted}`);
    console.log(`  Translations: ${stats.byCategory.translations}`);
    console.log(`  Modals: ${stats.byCategory.modals}`);
    console.log(`  Other: ${stats.byCategory.other}`);
  } catch (error) {
    console.error("Error getting statistics:", error);
  }
}

// ============================================================================
// EXAMPLE 5: Filter by URL Pattern
// ============================================================================

async function example5_filterByPattern() {
  console.log("\n=== Example 5: Filter by URL Pattern ===\n");

  const client = createServiceWorkerClient();

  try {
    // Find all modal-related chunks
    const modalChunks = await client.getChunks({ 
      urlPattern: /modal/i 
    });
    
    console.log(`Total modal-related chunks: ${modalChunks.length}`);
    console.log("\nModal chunks:");
    
    for (const chunk of modalChunks.slice(0, 10)) {
      console.log(`  - ${chunk.url.split("/").pop()}`);
    }
    
    // Find all language/translation chunks
    const translationChunks = await client.getChunks({ 
      translationsOnly: true 
    });
    
    console.log(`\nTotal translation chunks: ${translationChunks.length}`);
  } catch (error) {
    console.error("Error filtering by pattern:", error);
  }
}

// ============================================================================
// EXAMPLE 6: Using with Unified SDK
// ============================================================================

async function example6_unifiedSDK() {
  console.log("\n=== Example 6: Using with Unified SDK ===\n");

  const sdk = createPplxSDK();

  try {
    const manifest = await sdk.serviceWorker.getManifest();
    console.log(`Fetched ${manifest.totalChunks} chunks via unified SDK`);
    
    // Get stats
    const stats = await sdk.serviceWorker.getStatistics();
    console.log(`\nJavaScript files: ${stats.byExtension.js || 0}`);
    console.log(`CSS files: ${stats.byExtension.css || 0}`);
    console.log(`SVG files: ${stats.byExtension.svg || 0}`);
  } catch (error) {
    console.error("Error using unified SDK:", error);
  }
}

// ============================================================================
// EXAMPLE 7: Cache Management
// ============================================================================

async function example7_cacheManagement() {
  console.log("\n=== Example 7: Cache Management ===\n");

  const client = createServiceWorkerClient();

  try {
    // First fetch (will fetch from network)
    console.log("Fetching manifest (from network)...");
    const start1 = Date.now();
    await client.getManifest();
    const time1 = Date.now() - start1;
    console.log(`Time taken: ${time1}ms`);
    
    // Second fetch (will use cache)
    console.log("\nFetching manifest again (from cache)...");
    const start2 = Date.now();
    await client.getManifest();
    const time2 = Date.now() - start2;
    console.log(`Time taken: ${time2}ms`);
    
    // Clear cache and fetch again
    console.log("\nClearing cache...");
    client.clearCache();
    
    console.log("Fetching manifest (from network after cache clear)...");
    const start3 = Date.now();
    await client.getManifest();
    const time3 = Date.now() - start3;
    console.log(`Time taken: ${time3}ms`);
    
    // Force refresh
    console.log("\nForce refreshing manifest...");
    const start4 = Date.now();
    await client.getManifest({ forceRefresh: true });
    const time4 = Date.now() - start4;
    console.log(`Time taken: ${time4}ms`);
  } catch (error) {
    console.error("Error with cache management:", error);
  }
}

// ============================================================================
// EXAMPLE 8: Advanced Filtering
// ============================================================================

async function example8_advancedFiltering() {
  console.log("\n=== Example 8: Advanced Filtering ===\n");

  const client = createServiceWorkerClient();

  try {
    const manifest = await client.getManifest();
    
    // Find all chunks from a specific domain
    const spaChunks = manifest.chunks.filter((chunk) =>
      chunk.url.includes("pplx-next-static-public.perplexity.ai")
    );
    console.log(`SPA chunks: ${spaChunks.length}`);
    
    // Find chunks with specific patterns
    const componentChunks = manifest.chunks.filter((chunk) =>
      /[A-Z][a-z]+[A-Z]/.test(chunk.url) // CamelCase pattern
    );
    console.log(`Component chunks: ${componentChunks.length}`);
    
    // Group chunks by first letter
    const groupedByLetter: Record<string, number> = {};
    for (const chunk of manifest.chunks) {
      const fileName = chunk.url.split("/").pop() || "";
      const firstLetter = fileName[0]?.toUpperCase() || "?";
      groupedByLetter[firstLetter] = (groupedByLetter[firstLetter] || 0) + 1;
    }
    
    console.log("\nChunks grouped by first letter:");
    const sortedLetters = Object.keys(groupedByLetter).sort();
    for (const letter of sortedLetters.slice(0, 10)) {
      console.log(`  ${letter}: ${groupedByLetter[letter]}`);
    }
  } catch (error) {
    console.error("Error with advanced filtering:", error);
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

async function runAllExamples() {
  await example1_getManifest();
  await example2_filterByExtension();
  await example3_filterRestricted();
  await example4_getStatistics();
  await example5_filterByPattern();
  await example6_unifiedSDK();
  await example7_cacheManagement();
  await example8_advancedFiltering();
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
