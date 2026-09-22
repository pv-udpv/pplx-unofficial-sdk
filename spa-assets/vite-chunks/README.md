# Vite Chunks Directory

Vite build artifacts and module chunks from the SPA.

## Structure

```
vite-chunks/
├── versions/
│   ├── 2026-01-21/
│   │   ├── app-chunks/
│   │   │   ├── spa-shell-Cc8l94kf.js
│   │   │   ├── pplx-stream-D3-uFWQX.js
│   │   │   └── ...
│   │   ├── vendor-chunks/
│   │   │   ├── react-vendor-A1b2c3d4.js
│   │   │   └── ...
│   │   └── manifest.json
│   └── 2026-01-22/
│       └── ...
└── README.md                   # This file
```

## Tracked Assets

### Application Chunks
Core application modules containing:
- `spa-shell-*.js` - Main SPA shell with routing and OAuth connectors
- `pplx-stream-*.js` - SSE streaming client implementation
- `pplx-rest-*.js` - REST API client
- Page-specific chunks (home, search, settings, etc.)

### Vendor Chunks
Third-party libraries:
- React/React-DOM
- State management libraries
- UI component libraries
- Utility libraries (lodash, etc.)

### Manifest Files
Build manifests tracking:
```json
{
  "version": "2.18",
  "build_time": "2026-01-21T20:00:00Z",
  "chunks": [
    {
      "name": "spa-shell-Cc8l94kf.js",
      "size": 245678,
      "hash": "Cc8l94kf",
      "imports": ["react-vendor-A1b2c3d4.js"]
    }
  ],
  "total_size": 3370000
}
```

## Purpose

Track Vite chunks to:
- Monitor code splitting strategy changes
- Detect new features from chunk additions
- Track dependency version updates
- Analyze bundle size trends
- Map code to functionality

## Usage

### Cataloging Chunks

```bash
# Create version directory
DATE=$(date +%Y-%m-%d)
mkdir -p spa-assets/vite-chunks/versions/$DATE/{app-chunks,vendor-chunks}

# List all chunks from HAR
jq -r '.js_modules[] | select(.url | contains(".js")) | .url' \
  perplexity_spa_full_spec.json > chunks-list.txt

# Classify chunks (app vs vendor)
# App chunks: contain "spa-", "pplx-", page names
# Vendor chunks: contain library names, generic hashes
```

### Analyzing Chunks

```bash
# Get chunk sizes
jq '[.js_modules[] | {name: .name, size: .size}] | sort_by(.size) | reverse' \
  spa-assets/snapshots/$DATE/full_spec.json

# Find specific functionality
grep -r "SSE\|EventSource\|streamSearch" spa-assets/vite-chunks/versions/*/app-chunks/

# Track chunk hash changes (indicates code modifications)
diff \
  <(ls spa-assets/vite-chunks/versions/2026-01-20/app-chunks/) \
  <(ls spa-assets/vite-chunks/versions/2026-01-21/app-chunks/)
```

## Retention Policy

- Keep latest 3 versions for comparison
- Archive older versions after diffing
- Always preserve chunks with SDK-relevant code

## Notes

- Chunk names include content hash (e.g., `-Cc8l94kf`)
- Hash changes indicate code modifications
- Large chunks (> 500 KB) may need separate storage
- Focus on app chunks; vendor chunks change less frequently

## Key Chunks for SDK

| Chunk Pattern | Contains | Relevance |
|---------------|----------|-----------|
| `spa-shell-*` | OAuth connectors, routing | High - Connectors API |
| `pplx-stream-*` | SSE streaming client | High - Streaming protocol |
| `pplx-rest-*` | REST API client | High - REST endpoints |
| `search-page-*` | Search UI logic | Medium - Search parameters |
| `thread-page-*` | Thread management | Medium - Thread operations |

---

**Related**: Vite Documentation - https://vitejs.dev/guide/build.html
