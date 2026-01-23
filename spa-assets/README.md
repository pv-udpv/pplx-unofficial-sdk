# SPA Assets Directory

This directory contains tracked assets from Perplexity AI's Single Page Application (SPA), extracted through HAR (HTTP Archive) analysis. These assets are used to monitor changes between versions and ensure integrity in CI/CD pipelines.

## 📁 Directory Structure

```
spa-assets/
├── snapshots/          # Full SPA snapshots from HAR files, organized by date
│   ├── 2026-01-21/    # Snapshot from January 21, 2026
│   │   ├── full_spec.json
│   │   ├── endpoints.json
│   │   └── metadata.json
│   └── README.md
├── workbox/           # Workbox service worker chunks and configurations
│   ├── versions/      # Version-specific workbox files
│   └── README.md
├── vite-chunks/       # Vite build chunks and module information
│   ├── versions/      # Version-specific vite chunks
│   └── README.md
├── diffs/             # Version-to-version differences and change logs
│   ├── 2026-01-20_to_2026-01-21.json
│   └── README.md
├── metadata/          # Asset manifests and version tracking
│   ├── asset-index.json
│   ├── version-history.json
│   └── README.md
└── README.md          # This file
```

## 🎯 Purpose

### 1. Version Tracking
Track changes in Perplexity's SPA across versions to:
- Monitor API endpoint additions/removals
- Detect breaking changes in the protocol
- Track JavaScript module structure evolution
- Identify new features and capabilities

### 2. CI/CD Integration
Enable automated pipelines to:
- Validate asset integrity using checksums
- Detect unauthorized modifications
- Generate diff reports between versions
- Alert on significant structural changes

### 3. SDK Development
Support SDK development by:
- Providing historical reference for protocol evolution
- Documenting API endpoint discovery patterns
- Maintaining a catalog of reverse-engineered modules
- Enabling regression testing against known versions

## 📊 Asset Types

### Snapshots
Full HAR-extracted specifications containing:
- Complete API endpoint catalog (REST + SSE)
- JavaScript module source code
- Import/export dependency graphs
- Function and class signatures
- Protocol version information

**Format**: JSON  
**Size**: 0.5-3 MB (compressed)  
**Retention**: Keep all major versions, latest 10 minor versions

### Workbox Files
Service worker chunks for offline capabilities:
- Workbox runtime versions
- Precache manifests
- Route configurations
- Background sync strategies

**Format**: JavaScript/JSON  
**Size**: 10-50 KB per file  
**Retention**: Keep latest 5 versions

### Vite Chunks
Build artifacts from Vite bundler:
- Application code chunks
- Vendor library chunks
- Dynamic import chunks
- CSS chunks

**Format**: JavaScript/CSS  
**Size**: Variable (10 KB - 500 KB)  
**Retention**: Keep latest 3 versions

### Diffs
Structural differences between versions:
- Endpoint additions/removals
- Module structure changes
- Function signature changes
- Breaking changes log

**Format**: JSON (JSON Patch format)  
**Size**: 1-100 KB  
**Retention**: Keep all diffs for audit trail

### Metadata
Version tracking and asset management:
- `asset-index.json` - Complete catalog of all tracked assets
- `version-history.json` - Timeline of SPA versions
- `integrity.json` - SHA-256 checksums for verification

**Format**: JSON  
**Size**: < 10 KB  
**Retention**: Keep all metadata indefinitely

## 🔧 Usage

### Adding a New Snapshot

```bash
# Extract from HAR file
python har_agent.py capture.har

# Move to snapshots directory with timestamp
DATE=$(date +%Y-%m-%d)
mkdir -p spa-assets/snapshots/$DATE
mv perplexity_spa_full_spec.json spa-assets/snapshots/$DATE/full_spec.json
mv endpoints_ast_extracted_full.json spa-assets/snapshots/$DATE/endpoints.json

# Generate metadata
cat > spa-assets/snapshots/$DATE/metadata.json << EOF
{
  "date": "$DATE",
  "source": "capture.har",
  "endpoints_count": $(jq '.metadata.endpoints_rest_count' spa-assets/snapshots/$DATE/full_spec.json),
  "modules_count": $(jq '.metadata.js_modules_total' spa-assets/snapshots/$DATE/full_spec.json)
}
EOF

# Update asset index
python scripts/update_asset_index.py
```

### Generating Diffs

```bash
# Compare two versions
python scripts/generate_diff.py \
  spa-assets/snapshots/2026-01-20/full_spec.json \
  spa-assets/snapshots/2026-01-21/full_spec.json \
  > spa-assets/diffs/2026-01-20_to_2026-01-21.json
```

### Verifying Integrity

```bash
# Check all checksums
python scripts/verify_integrity.py spa-assets/metadata/integrity.json

# Verify specific snapshot
sha256sum -c spa-assets/metadata/integrity.json
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow

```yaml
name: SPA Assets Verification

on:
  push:
    paths:
      - 'spa-assets/**'
  schedule:
    - cron: '0 0 * * 0'  # Weekly verification

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify asset integrity
        run: python scripts/verify_integrity.py
      - name: Generate diff report
        if: github.event_name == 'push'
        run: python scripts/generate_diff.py
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: diff-report
          path: spa-assets/diffs/latest.json
```

### Automated Monitoring

Set up automated checks to:
1. **Daily**: Capture new HAR from Perplexity.ai
2. **On Change**: Generate diff and alert on breaking changes
3. **Weekly**: Verify integrity of all stored assets
4. **Monthly**: Archive old versions and cleanup

## 📝 Maintenance

### Storage Management
- Use Git LFS for files > 1 MB
- Compress JSON files with gzip
- Archive snapshots older than 6 months to separate repository
- Keep metadata always in Git (small files)

### Version Naming
- Snapshots: `YYYY-MM-DD` (ISO 8601 date)
- Vite chunks: `v{version}-{hash}` (e.g., `v2.18-a1b2c3d`)
- Workbox: `v{version}` (e.g., `v7.0.0`)

### Documentation Updates
When updating this directory:
1. Update `asset-index.json` with new entries
2. Add entry to `version-history.json`
3. Update checksums in `integrity.json`
4. Document any structural changes in `CHANGELOG.md`

## 🔍 Related Files

- `/har_agent.py` - HAR analysis tool for extracting assets
- `/README_HAR_TOOLKIT.md` - Documentation for HAR toolkit
- `/perplexity_spa_full_spec.json` - Working copy of latest snapshot
- `/endpoints_ast_extracted.json` - Working copy of endpoints

## 📚 References

- [HAR Specification](http://www.softwareishard.com/blog/har-12-spec/)
- [Vite Build System](https://vitejs.dev/)
- [Workbox Service Workers](https://developers.google.com/web/tools/workbox)
- [Git LFS](https://git-lfs.github.com/)

---

**Last Updated**: 2026-01-23  
**Maintained by**: pv-udpv  
**Purpose**: SDK development and protocol monitoring
