# Workbox Directory

Service worker files and configurations for offline capabilities.

## Structure

```
workbox/
├── versions/
│   ├── v7.0.0/
│   │   ├── workbox-sw.js
│   │   ├── workbox-precaching.js
│   │   └── manifest.json
│   └── v7.1.0/
│       └── ...
└── README.md           # This file
```

## Tracked Assets

### Service Worker Files
- `workbox-sw.js` - Core Workbox runtime
- `workbox-precaching.js` - Precaching strategies
- `workbox-routing.js` - Route matching
- `workbox-strategies.js` - Caching strategies

### Configuration Files
- `manifest.json` - Precache manifest with file hashes
- `sw-config.js` - Service worker configuration
- `routes.json` - Route patterns and handlers

## Purpose

Track Workbox versions to:
- Monitor service worker strategy changes
- Detect precache manifest modifications
- Ensure offline capability consistency
- Validate caching policy updates

## Usage

### Extracting Workbox Files

```bash
# From HAR analysis output
VERSION="v7.0.0"
mkdir -p spa-assets/workbox/versions/$VERSION

# Extract workbox files (pattern matching)
jq -r '.js_modules[] | select(.url | contains("workbox")) | .url' perplexity_spa_full_spec.json

# Copy extracted files
# (manual step - extract from HAR response bodies)
```

### Analyzing Changes

```bash
# Compare two versions
diff -u \
  spa-assets/workbox/versions/v7.0.0/manifest.json \
  spa-assets/workbox/versions/v7.1.0/manifest.json

# Check precache list
jq '.precache' spa-assets/workbox/versions/v7.1.0/manifest.json
```

## Retention Policy

- Keep latest 5 versions
- Archive older versions if no breaking changes
- Always keep first version for reference

## Notes

- Workbox files are typically minified
- Focus on manifest and config changes, not runtime code
- Version numbers follow Workbox package versions

---

**Related**: Workbox Documentation - https://developers.google.com/web/tools/workbox
