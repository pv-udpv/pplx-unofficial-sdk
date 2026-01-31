# Service Worker Analyzer - Complete Pipeline & Workflow

## 🎯 Overview

This document describes the complete pipeline from fetching Perplexity.ai's Service Worker to extracting, categorizing, and analyzing all precached assets.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Pipeline Flow](#pipeline-flow)
- [Component Details](#component-details)
- [Data Flow](#data-flow)
- [Usage Patterns](#usage-patterns)
- [Integration Points](#integration-points)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ServiceWorkerAnalyzer                        │
│                     (Main Orchestrator)                         │
└────────────┬──────────────┬──────────────┬─────────────────────┘
             │              │              │
    ┌────────▼────────┐ ┌──▼───────────┐ ┌▼────────────────┐
    │ ServiceWorker   │ │ ServiceWorker│ │ ChunkAnalyzer   │
    │ Fetcher         │ │ Parser       │ │                 │
    └─────────────────┘ └──────────────┘ └─────────────────┘
           │                    │                  │
           │                    │                  │
      HTTP Request        Regex Parsing      Categorization
      Gzip Detect         AST Analysis       Statistics
```

---

## 🔄 Pipeline Flow

### Phase 1: Fetch Service Worker

```
[User Request]
      │
      ▼
[ServiceWorkerFetcher.fetch(version?)]
      │
      ├─► Construct URL: https://www.perplexity.ai/service-worker.js?v={version}
      │
      ├─► HTTP GET Request
      │   ├─► Headers: Accept-Encoding: gzip, deflate, br
      │   └─► Optional: Custom User-Agent
      │
      ├─► Receive Response (ArrayBuffer)
      │
      ├─► Auto-detect Compression
      │   ├─► Check magic bytes [0x1f, 0x8b] for gzip
      │   └─► Decompress if needed (gunzipSync)
      │
      └─► Return UTF-8 String (raw JS code)
           │
           └──► ~185KB uncompressed
```

**Key Operations:**
- URL construction with optional version parameter
- HTTP fetch with compression support
- Magic byte detection (`0x1f 0x8b`)
- Automatic gzip decompression via Node.js `zlib`
- UTF-8 decoding

**Output:** Raw Service Worker JavaScript source code

---

### Phase 2: Parse Workbox Manifest

```
[Raw Service Worker Code]
      │
      ▼
[ServiceWorkerParser.parse(content)]
      │
      ├─► Extract Workbox Version
      │   ├─► Pattern: /workbox[.-](?:core|sw)[.-]v?(\d+\.\d+\.\d+)/i
      │   └─► Result: "7.2.0"
      │
      ├─► Extract Precache Manifest (Multi-Strategy)
      │   │
      │   ├─► Strategy 1: precacheAndRoute([...])
      │   │   ├─► Pattern: /precacheAndRoute\(\s*\[(.*?)\]\s*\)/s
      │   │   └─► Extract: {url: "...", revision: "..."}
      │   │
      │   ├─► Strategy 2: self.__WB_MANIFEST = [...]
      │   │   ├─► Pattern: /self\.__WB_MANIFEST\s*=\s*\[(.*?)\]/s
      │   │   └─► Extract: {url: "...", revision: "..."}
      │   │
      │   └─► Strategy 3: Inline chunk references (minified)
      │       ├─► Pattern: /\{url:["']([^"']+)["'],revision:["']([a-f0-9]+)["']\}/g
      │       └─► Fallback for heavily minified code
      │
      ├─► Extract Routes
      │   ├─► Pattern: /registerRoute\(([^,]+),\s*new\s+(?:workbox\.)?(?:strategies\.)?(\w+)\(/g
      │   └─► Result: [{strategy: "CacheFirst", pattern: "..."}]
      │
      ├─► Extract Cache Strategies
      │   ├─► Search for: CacheFirst, NetworkFirst, StaleWhileRevalidate
      │   └─► Result: ["CacheFirst", "NetworkFirst"]
      │
      └─► Extract CDN Domains
          ├─► Pattern: /https?:\/\/([a-zA-Z0-9.-]+\.(?:perplexity\.ai|...))/g
          └─► Result: ["pplx-next-static-public.perplexity.ai"]
```

**Key Operations:**
- Multi-strategy manifest extraction (handles different Workbox versions)
- Workbox version detection
- Route configuration parsing
- CDN domain extraction
- Cache strategy identification

**Output:** `WorkboxManifest` object with:
- `version`: "7.2.0"
- `assets`: Array of 1149+ PrecacheAsset objects
- `routes`: Array of RouteConfig objects
- `strategies`: Array of strategy names
- `cdnDomains`: Array of CDN hostnames

---

### Phase 3: Categorize Assets

```
[PrecacheAsset[]]
      │
      ▼
[ChunkAnalyzer.categorize(assets)]
      │
      ├─► For each asset:
      │   │
      │   ├─► detectCategory(url)
      │   │   │
      │   │   ├─► Modal Detection
      │   │   │   ├─► Check: path.includes('modal')
      │   │   │   ├─► Check: /(?:confirmation|settings|upload).*\.js$/
      │   │   │   └─► Category: 'modal' (~94 assets)
      │   │   │
      │   │   ├─► Translation Detection
      │   │   │   ├─► Check: /[a-z]{2}-[a-z]{2}\.json/
      │   │   │   ├─► Check: path.includes('/i18n/')
      │   │   │   ├─► Check: path.includes('/locale/')
      │   │   │   └─► Category: 'translation' (~32 assets)
      │   │   │
      │   │   ├─► Restricted Feature Detection
      │   │   │   ├─► Check: path.includes('/restricted/')
      │   │   │   ├─► Check: /restricted-feature-/
      │   │   │   └─► Category: 'restricted' (~3 assets)
      │   │   │
      │   │   ├─► Core Bundle Detection
      │   │   │   ├─► Check: /platform-core/
      │   │   │   ├─► Check: /spa-shell/
      │   │   │   ├─► Check: /bootstrap/
      │   │   │   ├─► Check: /pplx-stream/
      │   │   │   └─► Category: 'core' (~4 assets)
      │   │   │
      │   │   ├─► Component Detection
      │   │   │   ├─► Check: path.includes('/assets/')
      │   │   │   ├─► Check: path.endsWith('.js')
      │   │   │   └─► Category: 'component' (~1020 assets)
      │   │   │
      │   │   └─► Default: 'unknown'
      │   │
      │   ├─► extractChunkId(url)
      │   │   ├─► Pattern: /\/([^\/]+)\.(?:js|css)$/
      │   │   └─► Example: "/assets/Button-BQdpnMAp.js" → "Button-BQdpnMAp"
      │   │
      │   └─► Create ChunkInfo
      │       ├─► id: "Button-BQdpnMAp"
      │       ├─► hash: "a3f2b9c8..."
      │       ├─► url: "https://pplx-next-static-public.perplexity.ai/..."
      │       ├─► category: "component"
      │       └─► size: (optional)
      │
      └─► Group by Category
          └─► Map<ChunkCategory, ChunkInfo[]>
```

**Key Operations:**
- URL-based category detection
- Smart pattern matching (modals, translations, restricted)
- Chunk ID extraction
- Categorization into 6 types:
  - **component**: Regular UI components (~1020)
  - **modal**: Dialog/popup components (~94)
  - **translation**: i18n files (~32)
  - **core**: Core platform bundles (~4)
  - **restricted**: Restricted features (~3)
  - **unknown**: Unclassified assets

**Output:** `Map<ChunkCategory, ChunkInfo[]>` with categorized assets

---

### Phase 4: Build Analysis Result

```
[WorkboxManifest + Categorized Chunks]
      │
      ▼
[Build AnalysisResult]
      │
      ├─► Meta Information
      │   ├─► timestamp: ISO 8601 timestamp
      │   ├─► version: Workbox version
      │   ├─► totalAssets: Count of all assets
      │   └─► fileSize: Size of SW file in bytes
      │
      ├─► Manifest Data
      │   ├─► version: "7.2.0"
      │   ├─► assets: Full asset list
      │   ├─► routes: Route configurations
      │   ├─► strategies: Cache strategies
      │   └─► cdnDomains: CDN hostnames
      │
      └─► Chunks
          └─► Map<ChunkCategory, ChunkInfo[]>
```

**Output:** Complete `AnalysisResult` object ready for export

---

## 📦 Component Details

### 1. ServiceWorkerFetcher

**Responsibility:** HTTP fetching and decompression

**Public API:**
```typescript
class ServiceWorkerFetcher {
  constructor(userAgent?: string)
  fetch(version?: string): Promise<string>
  fetchVersion(): Promise<string>
}
```

**Key Features:**
- Configurable User-Agent
- Auto-detects gzip compression
- Supports versioned SW URLs
- Error handling for HTTP failures

**Example:**
```typescript
const fetcher = new ServiceWorkerFetcher('MyBot/1.0');
const content = await fetcher.fetch('104241e');
```

---

### 2. ServiceWorkerParser

**Responsibility:** Extract structured data from raw JS

**Public API:**
```typescript
class ServiceWorkerParser {
  parse(content: string): WorkboxManifest
}
```

**Key Features:**
- Multi-strategy manifest extraction
- Workbox version detection
- Route and strategy parsing
- CDN domain extraction
- Handles both formatted and minified code

**Example:**
```typescript
const parser = new ServiceWorkerParser();
const manifest = parser.parse(rawJsCode);
console.log(manifest.assets.length); // 1149+
```

---

### 3. ChunkAnalyzer

**Responsibility:** Categorize and analyze assets

**Public API:**
```typescript
class ChunkAnalyzer {
  categorize(assets: PrecacheAsset[]): Map<ChunkCategory, ChunkInfo[]>
  getStats(chunks: Map<ChunkCategory, ChunkInfo[]>): Record<ChunkCategory, number>
  findChunks(chunks: Map<ChunkCategory, ChunkInfo[]>, pattern: string | RegExp): ChunkInfo[]
}
```

**Key Features:**
- Smart category detection
- Pattern-based search
- Statistical analysis
- ID extraction

**Example:**
```typescript
const analyzer = new ChunkAnalyzer();
const chunks = analyzer.categorize(manifest.assets);
const stats = analyzer.getStats(chunks);
console.log(stats.modal); // 94
```

---

### 4. ServiceWorkerAnalyzer (Main API)

**Responsibility:** Orchestrate entire pipeline

**Public API:**
```typescript
class ServiceWorkerAnalyzer {
  constructor(options?: AnalyzerOptions)
  analyze(version?: string): Promise<AnalysisResult>
  getStats(version?: string): Promise<Record<string, number>>
  findChunks(pattern: string | RegExp, version?: string): Promise<ChunkInfo[]>
  export(result: AnalysisResult, format?: 'json' | 'yaml'): Promise<string>
}
```

**Key Features:**
- Single entry point for all operations
- Configurable default version
- Built-in export functionality
- Convenience methods for common operations

**Example:**
```typescript
const analyzer = new ServiceWorkerAnalyzer({ version: '104241e' });

// Full analysis
const result = await analyzer.analyze();

// Quick stats
const stats = await analyzer.getStats();

// Find specific chunks
const modals = await analyzer.findChunks(/Modal/);
```

---

## 📊 Data Flow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User Code                                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ analyzer.analyze(version?)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ ServiceWorkerAnalyzer                                           │
│                                                                 │
│  1. Call fetcher.fetch(version)                                │
│     └─► HTTP GET → Decompress → Return JS string              │
│                                                                 │
│  2. Call parser.parse(content)                                 │
│     └─► Extract manifest → Return WorkboxManifest             │
│                                                                 │
│  3. Call chunkAnalyzer.categorize(assets)                      │
│     └─► Categorize → Return Map<Category, ChunkInfo[]>        │
│                                                                 │
│  4. Build AnalysisResult                                       │
│     └─► Combine all data → Return complete result             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ AnalysisResult
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ User Code                                                       │
│ - Export to JSON/YAML                                          │
│ - Query statistics                                             │
│ - Search for specific chunks                                   │
│ - Integrate with other tools                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Transformation

```
HTTP Response (gzipped binary)
    │
    ├─► Decompress
    │
    ▼
Raw JavaScript String (~185KB)
    │
    ├─► Regex Parsing
    │
    ▼
WorkboxManifest {
  version: string,
  assets: PrecacheAsset[],
  routes: RouteConfig[],
  strategies: string[],
  cdnDomains: string[]
}
    │
    ├─► Category Detection
    │
    ▼
Map<ChunkCategory, ChunkInfo[]> {
  component: ChunkInfo[],
  modal: ChunkInfo[],
  translation: ChunkInfo[],
  core: ChunkInfo[],
  restricted: ChunkInfo[],
  unknown: ChunkInfo[]
}
    │
    ├─► Combine with metadata
    │
    ▼
AnalysisResult {
  meta: { timestamp, version, totalAssets, fileSize },
  manifest: WorkboxManifest,
  chunks: Map<ChunkCategory, ChunkInfo[]>
}
    │
    ├─► Export
    │
    ▼
JSON/YAML String
```

---

## 🎯 Usage Patterns

### Pattern 1: Basic Analysis

```typescript
import { ServiceWorkerAnalyzer } from 'pplx-unofficial-sdk';

const analyzer = new ServiceWorkerAnalyzer();
const result = await analyzer.analyze();

console.log(`Found ${result.meta.totalAssets} assets`);
console.log(`Workbox version: ${result.manifest.version}`);
```

### Pattern 2: Default Version

```typescript
// Set version once, use multiple times
const analyzer = new ServiceWorkerAnalyzer({ version: '104241e' });

const stats = await analyzer.getStats(); // Uses default version
const modals = await analyzer.findChunks(/Modal/); // Uses default version
const result = await analyzer.analyze(); // Uses default version

// Override when needed
const latest = await analyzer.analyze('latest-version');
```

### Pattern 3: Statistics-Only

```typescript
const analyzer = new ServiceWorkerAnalyzer();
const stats = await analyzer.getStats();

console.log('Assets by category:');
for (const [category, count] of Object.entries(stats)) {
  console.log(`  ${category}: ${count}`);
}
```

### Pattern 4: Search and Filter

```typescript
const analyzer = new ServiceWorkerAnalyzer();

// Find all modals
const modals = await analyzer.findChunks(/Modal/);

// Find translations for a specific language
const frenchTranslations = await analyzer.findChunks(/fr-FR/);

// Find restricted features
const restricted = await analyzer.findChunks(/restricted/);
```

### Pattern 5: Export and Save

```typescript
import { writeFile } from 'fs/promises';

const analyzer = new ServiceWorkerAnalyzer();
const result = await analyzer.analyze();

// Export to JSON
const json = await analyzer.export(result);
await writeFile('sw-analysis.json', json);

console.log('Analysis saved to sw-analysis.json');
```

### Pattern 6: Compare Versions

```typescript
const analyzer = new ServiceWorkerAnalyzer();

// Analyze two versions
const v1 = await analyzer.analyze('version1');
const v2 = await analyzer.analyze('version2');

// Compare asset counts
const diff = v2.meta.totalAssets - v1.meta.totalAssets;
console.log(`Asset difference: ${diff > 0 ? '+' : ''}${diff}`);

// Find new chunks
const v1Urls = new Set(v1.manifest.assets.map(a => a.url));
const newChunks = v2.manifest.assets.filter(a => !v1Urls.has(a.url));
console.log(`New chunks: ${newChunks.length}`);
```

---

## 🔗 Integration Points

### With REST API Client

```typescript
import { ServiceWorkerAnalyzer } from 'pplx-unofficial-sdk';
import { createPplxSDK } from 'pplx-unofficial-sdk';

// Analyze SW
const swAnalyzer = new ServiceWorkerAnalyzer();
const analysis = await swAnalyzer.analyze();

// Use REST API
const sdk = createPplxSDK();
const threads = await sdk.rest.listThreads();

// Correlate data
console.log('SW has', analysis.meta.totalAssets, 'assets');
console.log('User has', threads.length, 'threads');
```

### With HAR Agent

```typescript
import { ServiceWorkerAnalyzer } from 'pplx-unofficial-sdk';
import { HARAgent } from './har_agent';

// Get SW manifest
const swAnalyzer = new ServiceWorkerAnalyzer();
const swResult = await swAnalyzer.analyze();
const swAssets = new Set(swResult.manifest.assets.map(a => a.url));

// Analyze HAR
const harAgent = new HARAgent('capture.har');
await harAgent.analyze_all();
const harAssets = new Set(Object.keys(harAgent.assets));

// Compare
const inSWOnly = [...swAssets].filter(url => !harAssets.has(url));
const inHAROnly = [...harAssets].filter(url => !swAssets.has(url));

console.log('Assets only in SW:', inSWOnly.length);
console.log('Assets only in HAR:', inHAROnly.length);
```

### With Monitoring/Tracking

```typescript
import { ServiceWorkerAnalyzer } from 'pplx-unofficial-sdk';
import { writeFile } from 'fs/promises';

async function trackChanges() {
  const analyzer = new ServiceWorkerAnalyzer();
  
  setInterval(async () => {
    const result = await analyzer.analyze();
    const timestamp = new Date().toISOString();
    
    // Save snapshot
    await writeFile(
      `snapshots/sw-${timestamp}.json`,
      await analyzer.export(result)
    );
    
    // Log stats
    console.log(`[${timestamp}] Total assets:`, result.meta.totalAssets);
  }, 3600000); // Every hour
}
```

---

## 🔍 Debugging and Troubleshooting

### Enable Verbose Logging

```typescript
// Add logging to fetcher
class VerboseFetcher extends ServiceWorkerFetcher {
  async fetch(version?: string): Promise<string> {
    console.log('Fetching SW version:', version || 'latest');
    const result = await super.fetch(version);
    console.log('Fetched', result.length, 'bytes');
    return result;
  }
}
```

### Inspect Raw Data

```typescript
const analyzer = new ServiceWorkerAnalyzer();
const result = await analyzer.analyze();

// Inspect manifest
console.log('Workbox version:', result.manifest.version);
console.log('Total routes:', result.manifest.routes.length);
console.log('Strategies:', result.manifest.strategies);

// Inspect chunks
for (const [category, chunks] of result.chunks.entries()) {
  console.log(`${category}: ${chunks.length} chunks`);
  console.log('  Sample:', chunks[0]?.id);
}
```

### Handle Errors

```typescript
try {
  const analyzer = new ServiceWorkerAnalyzer();
  const result = await analyzer.analyze('invalid-version');
} catch (error) {
  if (error.message.includes('Failed to fetch')) {
    console.error('Network error:', error);
  } else {
    console.error('Parse error:', error);
  }
}
```

---

## 📚 Related Documentation

- [Service Worker Analyzer API](./sw-analyzer.md) - Full API reference
- [Service Worker Guide](./SERVICE-WORKER-GUIDE.md) - General SW client guide
- [REST API Guide](./REST-API-GUIDE.md) - REST API client documentation

---

**Part of [@pplx-unofficial/sdk](https://github.com/pv-udpv/pplx-unofficial-sdk)**
