# Metadata Directory

Asset tracking metadata, version history, and integrity checksums.

## Structure

```
metadata/
├── asset-index.json       # Complete catalog of all tracked assets
├── version-history.json   # Timeline of SPA versions
├── integrity.json         # SHA-256 checksums for verification
└── README.md              # This file
```

## Files

### `asset-index.json`

Complete catalog of all tracked assets:

```json
{
  "last_updated": "2026-01-23T13:00:00Z",
  "total_snapshots": 5,
  "total_workbox_versions": 2,
  "total_vite_versions": 1,
  "total_diffs": 4,
  "assets": [
    {
      "type": "snapshot",
      "date": "2026-01-21",
      "path": "spa-assets/snapshots/2026-01-21/",
      "files": {
        "full_spec.json": {
          "size": 2007087
        },
        "endpoints.json": {
          "size": 28249
        },
        "metadata.json": {
          "size": 245,
          "endpoints_count": 96,
          "modules_count": 752,
          "protocol_version": "2.18"
        }
      }
    },
    {
      "type": "workbox",
      "version": "v7.0.0",
      "path": "spa-assets/workbox/versions/v7.0.0/",
      "files": {
        "manifest.json": {
          "size": 5432
        }
      }
    },
    {
      "type": "vite-chunks",
      "version": "2026-01-21",
      "path": "spa-assets/vite-chunks/versions/2026-01-21/",
      "files": {
        "app-chunks/spa-shell-Cc8l94kf.js": {
          "size": 245678
        }
      }
    },
    {
      "type": "diff",
      "from": "2026-01-20",
      "to": "2026-01-21",
      "path": "spa-assets/diffs/2026-01-20_to_2026-01-21.json",
      "size": 12456
    }
  ]
}
```

### `version-history.json`

Timeline of SPA versions and notable changes:

```json
{
  "versions": [
    {
      "date": "2026-01-21",
      "protocol_version": "2.18",
      "snapshot_path": "spa-assets/snapshots/2026-01-21/",
      "endpoints_count": 96,
      "modules_count": 752,
      "notable_changes": [
        "Added API organization management endpoints",
        "Updated SSE protocol to version 2.18",
        "Modified connector authorization flow"
      ],
      "breaking_changes": false,
      "sdk_impact": "Medium - Update connectors client"
    },
    {
      "date": "2026-01-20",
      "protocol_version": "2.17",
      "snapshot_path": "spa-assets/snapshots/2026-01-20/",
      "endpoints_count": 91,
      "modules_count": 745,
      "notable_changes": [
        "Added thread pagination support",
        "Improved error handling in REST API"
      ],
      "breaking_changes": false,
      "sdk_impact": "Low"
    }
  ],
  "statistics": {
    "total_versions_tracked": 2,
    "date_range": {
      "first": "2026-01-20",
      "last": "2026-01-21"
    },
    "total_endpoints_added": 5,
    "total_endpoints_removed": 0,
    "breaking_changes_count": 0
  }
}
```

### `integrity.json`

SHA-256 checksums for all tracked files:

```json
{
  "last_verified": "2026-01-23T13:00:00Z",
  "algorithm": "SHA-256",
  "files": {
    "spa-assets/snapshots/2026-01-21/full_spec.json": "abc123def456...",
    "spa-assets/snapshots/2026-01-21/endpoints.json": "def456ghi789...",
    "spa-assets/snapshots/2026-01-21/metadata.json": "ghi789jkl012...",
    "spa-assets/workbox/versions/v7.0.0/manifest.json": "jkl012mno345...",
    "spa-assets/diffs/2026-01-20_to_2026-01-21.json": "mno345pqr678..."
  }
}
```

## Usage

### Updating Asset Index

```bash
# Generate/update asset index
python scripts/update_asset_index.py

# Add new snapshot to index
python scripts/update_asset_index.py --add spa-assets/snapshots/2026-01-23/

# Verify index is up to date
python scripts/update_asset_index.py --verify
```

### Verifying Integrity

```bash
# Generate checksums for all files
find spa-assets -type f -name "*.json" -o -name "*.js" | while read file; do
  sha256sum "$file"
done > checksums.txt

# Verify against integrity.json
python scripts/verify_integrity.py spa-assets/metadata/integrity.json

# Quick check with sha256sum
sha256sum -c checksums.txt
```

### Querying Version History

```bash
# Get latest version
jq '.versions[0]' spa-assets/metadata/version-history.json

# Find breaking changes
jq '.versions[] | select(.breaking_changes == true)' \
  spa-assets/metadata/version-history.json

# Get endpoint count trend
jq '.versions[] | {date: .date, endpoints: .endpoints_count}' \
  spa-assets/metadata/version-history.json

# Calculate average change rate
jq '.statistics.total_endpoints_added / .statistics.total_versions_tracked' \
  spa-assets/metadata/version-history.json
```

## Automated Maintenance

### Daily Tasks
1. Verify integrity of all tracked files
2. Update asset index if new files added
3. Check for missing checksums

### Weekly Tasks
1. Generate version history summary
2. Analyze change trends
3. Alert on anomalies (large size changes, many new endpoints)

### Monthly Tasks
1. Archive old versions
2. Generate comprehensive reports
3. Review retention policies

## Scripts

Location: `/scripts/`

**Available:**
- `update_asset_index.py` - Update asset-index.json
- `verify_integrity.py` - Verify file checksums

**Planned:**
- `generate_version_history.py` - Create/update version-history.json
- `check_asset_health.py` - Validate asset structure
- `generate_diff.py` - Generate version-to-version diffs

## CI/CD Integration

```yaml
# .github/workflows/verify-assets.yml
name: Verify SPA Assets

on:
  push:
    paths:
      - 'spa-assets/**'

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Verify integrity
        run: python scripts/verify_integrity.py spa-assets/metadata/integrity.json
      
      - name: Check asset index
        run: python scripts/update_asset_index.py --verify
      
      - name: Generate report
        run: |
          python scripts/check_asset_health.py > asset-health-report.md
          cat asset-health-report.md >> $GITHUB_STEP_SUMMARY
```

## Notes

- Metadata files are lightweight (<10 KB each)
- Always keep metadata in Git (no LFS)
- Update checksums whenever files change
- Use version history for release planning

---

**Purpose**: Central tracking and verification of all SPA assets
