# Service Worker Analyzer

Analyze Perplexity.ai Service Worker configuration, precache manifest, and chunk structure.

## Features

- ✅ Extract Workbox v7.2.0 configuration
- ✅ Parse 1149+ precached assets
- ✅ Categorize chunks (components, modals, translations, core, restricted)
- ✅ Extract CDN domains and cache strategies
- ✅ Auto-detect gzip compression
- ✅ CLI tool for quick analysis

## Usage

### Programmatic API

```typescript
// Note: This import path will be available in a future release of pplx-unofficial-sdk.
import { ServiceWorkerAnalyzer } from 'pplx-unofficial-sdk';

const analyzer = new ServiceWorkerAnalyzer();

// Full analysis
const result = await analyzer.analyze();
console.log(`Found ${result.meta.totalAssets} assets`);
console.log(`Workbox: v${result.manifest.version}`);

// Get statistics
const stats = await analyzer.getStats();
console.log(stats);
// {
//   component: 1020,
//   modal: 94,
//   translation: 32,
//   core: 4,
//   restricted: 3
// }

// Find specific chunks
const modals = await analyzer.findChunks(/Modal/);
console.log(`Found ${modals.length} modal components`);

// Export to file
const json = await analyzer.export(result);
await writeFile('sw-analysis.json', json);
```

### CLI

```bash
# Full analysis
pplx sw:analyze

# Statistics only
pplx sw:analyze --stats

# Find chunks
pplx sw:analyze --find "Modal"
pplx sw:analyze --find "i18n"

# Export to file
pplx sw:analyze -o analysis.json
pplx sw:analyze -o report.json --format json

# Specific version
pplx sw:analyze --version 104241e
```

## Output Format

```json
{
  "meta": {
    "timestamp": "2026-01-31T19:30:00.000Z",
    "version": "7.2.0",
    "totalAssets": 1149,
    "fileSize": 185424
  },
  "manifest": {
    "version": "7.2.0",
    "assets": [...],
    "routes": [...],
    "strategies": ["CacheFirst", "NetworkFirst"],
    "cdnDomains": ["pplx-next-static-public.perplexity.ai"]
  },
  "chunks": {
    "component": [...],
    "modal": [...],
    "translation": [...],
    "core": [...],
    "restricted": [...]
  }
}
```

## Chunk Categories

- **component**: UI components (~1020)
- **modal**: Dialog/modal components (~94)
- **translation**: i18n files (~32)
- **core**: Platform bundles (platform-core, spa-shell, bootstrap, pplx-stream)
- **restricted**: Restricted features (debug, health, notes)

## Architecture

```
ServiceWorkerAnalyzer
  ├── ServiceWorkerFetcher    # HTTP fetch + gzip decompress
  ├── ServiceWorkerParser     # Manifest extraction
  └── ChunkAnalyzer           # Asset categorization
```
