# Service Worker Client Guide

Complete guide for using the Service Worker Client to fetch and analyze Perplexity AI's chunk manifest.

## 🎯 Overview

The Service Worker Client fetches Perplexity AI's `service-worker.js` file and parses the precache manifest to extract information about all application chunks (JavaScript files, CSS, fonts, etc.).

This is useful for:
- **Monitoring changes** in the application structure
- **Analyzing chunk organization** and dependencies
- **Discovering restricted features** and components
- **Tracking translations** and localization assets
- **Understanding the SPA architecture**

## 📦 Installation

```bash
npm install @pplx-unofficial/sdk
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { createServiceWorkerClient } from "@pplx-unofficial/sdk";

const client = createServiceWorkerClient();

// Fetch the manifest
const manifest = await client.getManifest();
console.log(`Total chunks: ${manifest.totalChunks}`);

// Get statistics
const stats = await client.getStatistics();
console.log(`JavaScript files: ${stats.byExtension.js}`);
console.log(`CSS files: ${stats.byExtension.css}`);
```

### Using with Unified SDK

```typescript
import { createPplxSDK } from "@pplx-unofficial/sdk";

const sdk = createPplxSDK();

// Access service worker client
const manifest = await sdk.serviceWorker.getManifest();
const jsChunks = await sdk.serviceWorker.getChunks({ extension: "js" });
```

## 📚 API Reference

### `createServiceWorkerClient(config?)`

Factory function to create a service worker client.

**Parameters:**
- `config` (optional): `ServiceWorkerClientConfig`
  - `baseUrl` (string): Base URL for Perplexity (default: "https://www.perplexity.ai")
  - `headers` (object): Custom headers for the request
  - `timeout` (number): Timeout in milliseconds (default: 10000)

**Returns:** `PplxServiceWorkerClient`

### `getManifest(options?)`

Fetches and parses the service worker manifest. Results are cached in memory.

**Parameters:**
- `options` (optional):
  - `forceRefresh` (boolean): Force re-fetch from network, ignoring cache

**Returns:** `Promise<ServiceWorkerManifest>`

```typescript
interface ServiceWorkerManifest {
  chunks: ServiceWorkerChunk[];
  totalChunks: number;
  extractedAt: string;
  serviceWorkerUrl: string;
}

interface ServiceWorkerChunk {
  revision: string;  // Cache-busting hash
  url: string;       // Full URL to the asset
}
```

**Example:**
```typescript
const manifest = await client.getManifest();
console.log(`Extracted ${manifest.totalChunks} chunks at ${manifest.extractedAt}`);

for (const chunk of manifest.chunks) {
  console.log(`${chunk.url} (revision: ${chunk.revision})`);
}
```

### `getChunks(filter?)`

Gets filtered list of chunks based on criteria.

**Parameters:**
- `filter` (optional): `ChunkFilterOptions`
  - `extension` (string): Filter by file extension (e.g., 'js', 'css')
  - `urlPattern` (RegExp): Filter by URL pattern
  - `restrictedOnly` (boolean): Filter restricted features only
  - `translationsOnly` (boolean): Filter translations only
  - `modalsOnly` (boolean): Filter modal-related chunks only

**Returns:** `Promise<ServiceWorkerChunk[]>`

**Examples:**

```typescript
// Get all JavaScript files
const jsChunks = await client.getChunks({ extension: "js" });

// Get all CSS files
const cssChunks = await client.getChunks({ extension: "css" });

// Get restricted features
const restricted = await client.getChunks({ restrictedOnly: true });

// Get translation files
const translations = await client.getChunks({ translationsOnly: true });

// Get modal components
const modals = await client.getChunks({ modalsOnly: true });

// Custom pattern matching
const components = await client.getChunks({
  urlPattern: /[A-Z][a-z]+[A-Z]/  // CamelCase pattern
});
```

### `getStatistics()`

Gets statistics about the chunk manifest.

**Returns:** `Promise<Statistics>`

```typescript
interface Statistics {
  total: number;
  byExtension: Record<string, number>;
  byCategory: {
    restricted: number;
    translations: number;
    modals: number;
    other: number;
  };
  totalSize: string;
}
```

**Example:**
```typescript
const stats = await client.getStatistics();

console.log(`Total: ${stats.total}`);
console.log("By extension:", stats.byExtension);
// { js: 1143, css: 6 }

console.log("By category:", stats.byCategory);
// { restricted: 3, translations: 32, modals: 0, other: 1114 }
```

### `clearCache()`

Clears the cached manifest, forcing next `getManifest()` call to fetch from network.

**Returns:** `void`

**Example:**
```typescript
client.clearCache();
const freshManifest = await client.getManifest();
```

## 🎨 Usage Examples

### Example 1: Monitor Application Changes

```typescript
import { createServiceWorkerClient } from "@pplx-unofficial/sdk";

async function monitorChanges() {
  const client = createServiceWorkerClient();
  
  // Fetch manifest
  const manifest = await client.getManifest();
  
  // Save to file for comparison
  await fs.writeFile(
    "manifest.json",
    JSON.stringify(manifest, null, 2)
  );
  
  console.log(`Saved ${manifest.totalChunks} chunks`);
}
```

### Example 2: Discover Restricted Features

```typescript
async function discoverFeatures() {
  const client = createServiceWorkerClient();
  
  // Get all restricted features
  const features = await client.getChunks({ restrictedOnly: true });
  
  console.log("Restricted features:");
  for (const chunk of features) {
    const match = chunk.url.match(/restricted-feature-(\w+)/);
    if (match) {
      console.log(`  - ${match[1]}`);
      console.log(`    URL: ${chunk.url}`);
      console.log(`    Revision: ${chunk.revision}`);
    }
  }
}
```

### Example 3: Analyze Chunk Distribution

```typescript
async function analyzeDistribution() {
  const client = createServiceWorkerClient();
  const stats = await client.getStatistics();
  
  // Analyze by extension
  console.log("File distribution:");
  for (const [ext, count] of Object.entries(stats.byExtension)) {
    const percentage = ((count / stats.total) * 100).toFixed(1);
    console.log(`  ${ext}: ${count} (${percentage}%)`);
  }
  
  // Analyze by category
  console.log("\nCategory distribution:");
  for (const [cat, count] of Object.entries(stats.byCategory)) {
    const percentage = ((count / stats.total) * 100).toFixed(1);
    console.log(`  ${cat}: ${count} (${percentage}%)`);
  }
}
```

### Example 4: Extract Translation Languages

```typescript
async function extractLanguages() {
  const client = createServiceWorkerClient();
  
  // Get all translation chunks
  const translations = await client.getChunks({ translationsOnly: true });
  
  // Extract language codes
  const languages = new Set<string>();
  for (const chunk of translations) {
    const match = chunk.url.match(/translations[/-](\w{2}(?:-\w{2})?)/);
    if (match) {
      languages.add(match[1]);
    }
  }
  
  console.log("Supported languages:");
  for (const lang of Array.from(languages).sort()) {
    console.log(`  - ${lang}`);
  }
}
```

### Example 5: Compare Manifest Versions

```typescript
async function compareVersions() {
  const client = createServiceWorkerClient();
  
  // Load old manifest
  const oldManifest = JSON.parse(
    await fs.readFile("manifest-old.json", "utf-8")
  );
  
  // Fetch new manifest
  const newManifest = await client.getManifest({ forceRefresh: true });
  
  // Find changes
  const oldUrls = new Set(oldManifest.chunks.map(c => c.url));
  const newUrls = new Set(newManifest.chunks.map(c => c.url));
  
  const added = [...newUrls].filter(url => !oldUrls.has(url));
  const removed = [...oldUrls].filter(url => !newUrls.has(url));
  
  console.log(`Added: ${added.length} chunks`);
  console.log(`Removed: ${removed.length} chunks`);
  console.log(`Total change: ${added.length - removed.length}`);
}
```

### Example 6: Integration with HAR Analysis

```typescript
import { createServiceWorkerClient } from "@pplx-unofficial/sdk";
import { HARAgent } from "./har_agent.py";

async function crossReferenceAssets() {
  // Get chunks from service worker
  const swClient = createServiceWorkerClient();
  const manifest = await swClient.getManifest();
  
  // Get assets from HAR
  const harAgent = new HARAgent("capture.har");
  await harAgent.analyze_all();
  
  // Cross-reference
  const swUrls = new Set(manifest.chunks.map(c => c.url));
  const harUrls = new Set(Object.keys(harAgent.assets));
  
  // Find discrepancies
  const inSWNotHAR = [...swUrls].filter(url => !harUrls.has(url));
  const inHARNotSW = [...harUrls].filter(url => !swUrls.has(url));
  
  console.log("Assets in SW but not HAR:", inSWNotHAR.length);
  console.log("Assets in HAR but not SW:", inHARNotSW.length);
}
```

## 🔧 Configuration

### Custom Base URL

```typescript
const client = createServiceWorkerClient({
  baseUrl: "https://custom-perplexity-instance.com"
});
```

### Custom Headers

```typescript
const client = createServiceWorkerClient({
  headers: {
    "User-Agent": "My Custom Bot",
    "X-Custom-Header": "value"
  }
});
```

### Custom Timeout

```typescript
const client = createServiceWorkerClient({
  timeout: 30000  // 30 seconds
});
```

## ⚠️ Error Handling

The client throws specific error types:

```typescript
import {
  ServiceWorkerError,
  ServiceWorkerFetchError,
  ServiceWorkerParseError,
} from "@pplx-unofficial/sdk";

try {
  const manifest = await client.getManifest();
} catch (error) {
  if (error instanceof ServiceWorkerFetchError) {
    console.error("Failed to fetch service worker:", error.message);
  } else if (error instanceof ServiceWorkerParseError) {
    console.error("Failed to parse manifest:", error.message);
  } else if (error instanceof ServiceWorkerError) {
    console.error("Service worker error:", error.message);
  }
}
```

## 🚀 Performance

- **First fetch:** ~500-1000ms (network request + parsing)
- **Cached fetch:** <1ms (memory cache)
- **Manifest size:** ~1100-1200 chunks
- **Memory usage:** ~1MB (cached manifest)

### Cache Management

```typescript
// Fetch once, use multiple times
const manifest = await client.getManifest();
const jsChunks = await client.getChunks({ extension: "js" });
const cssChunks = await client.getChunks({ extension: "css" });
// All the above use the cached manifest

// Force refresh after 1 hour
setTimeout(() => {
  client.clearCache();
}, 60 * 60 * 1000);
```

## 🔗 Related Tools

- **HAR Agent** (`har_agent.py`) - Extracts assets from HAR files
- **REST API Client** - Access Perplexity REST API
- **SSE Streaming Client** - Real-time search responses

## 📊 Output Format

### Example Manifest

```json
{
  "chunks": [
    {
      "revision": "86f2fcd94d13da17c7d761e14867e98e",
      "url": "https://pplx-next-static-public.perplexity.ai/_spa/assets/__vite-browser-external-BIHI7g3E.js"
    },
    {
      "revision": "97aa03874177970cc07df7acf5bbf3fd",
      "url": "https://pplx-next-static-public.perplexity.ai/_spa/assets/_restricted/restricted-feature-debug-B2-jcRb8.js"
    }
  ],
  "totalChunks": 1149,
  "extractedAt": "2026-01-23T18:00:42.242Z",
  "serviceWorkerUrl": "https://www.perplexity.ai/service-worker.js"
}
```

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](../LICENSE)

---

**Part of [@pplx-unofficial/sdk](https://github.com/pv-udpv/pplx-unofficial-sdk)**
