# Diffs Directory

Version-to-version difference reports for tracking SPA evolution.

## Structure

```
diffs/
├── 2026-01-20_to_2026-01-21.json
├── 2026-01-21_to_2026-01-22.json
├── summary-2026-01.md
└── README.md                        # This file
```

## Diff Types

### Endpoint Diffs
Changes in API endpoints between versions:
```json
{
  "date_from": "2026-01-20",
  "date_to": "2026-01-21",
  "type": "endpoints",
  "added": [
    "/rest/api-org-management/file_repositories"
  ],
  "removed": [],
  "modified": [
    {
      "path": "/rest/thread/list_recent",
      "changes": ["Added 'sort' parameter"]
    }
  ]
}
```

### Module Diffs
JavaScript module changes:
```json
{
  "type": "modules",
  "app_chunks": {
    "added": ["new-feature-X1y2z3.js"],
    "removed": [],
    "modified": [
      {
        "name": "spa-shell-Cc8l94kf.js",
        "old_hash": "Aa1b2c3d",
        "new_hash": "Cc8l94kf",
        "size_change": "+5432 bytes"
      }
    ]
  },
  "vendor_chunks": {
    "modified": [
      {
        "name": "react-vendor",
        "old_version": "18.2.0",
        "new_version": "18.3.0"
      }
    ]
  }
}
```

### Function Signature Diffs
Changes in extracted function signatures:
```json
{
  "type": "functions",
  "modified": [
    {
      "file": "spa-shell-Cc8l94kf.js",
      "function": "authorizeConnector",
      "old_signature": "authorizeConnector(connectorId)",
      "new_signature": "authorizeConnector(connectorId, options)",
      "breaking": true
    }
  ]
}
```

### Protocol Changes
Protocol version and format changes:
```json
{
  "type": "protocol",
  "version_from": "2.17",
  "version_to": "2.18",
  "changes": [
    {
      "description": "Added 'diff_block' for incremental updates",
      "impact": "Breaking - requires new JSON Patch handling"
    }
  ]
}
```

## Generating Diffs

### Automated Diff Generation

```bash
# Using custom diff script
python scripts/generate_diff.py \
  --from spa-assets/snapshots/2026-01-20 \
  --to spa-assets/snapshots/2026-01-21 \
  --output spa-assets/diffs/2026-01-20_to_2026-01-21.json

# Or using jq for simple diffs
jq -s '.[0] * .[1]' \
  spa-assets/snapshots/2026-01-20/endpoints.json \
  spa-assets/snapshots/2026-01-21/endpoints.json \
  | jq '{added: .added, removed: .removed}'
```

### Manual Diff Review

```bash
# Compare full specs
diff -u \
  <(jq -S '.' spa-assets/snapshots/2026-01-20/full_spec.json) \
  <(jq -S '.' spa-assets/snapshots/2026-01-21/full_spec.json) \
  > spa-assets/diffs/2026-01-20_to_2026-01-21.diff

# Compare endpoint lists
comm -3 \
  <(jq -r '.endpoints.rest[]' spa-assets/snapshots/2026-01-20/endpoints.json | sort) \
  <(jq -r '.endpoints.rest[]' spa-assets/snapshots/2026-01-21/endpoints.json | sort)
```

## Usage

### Checking for Breaking Changes

```bash
# Check diff for breaking changes
jq '.breaking_changes[]' spa-assets/diffs/2026-01-20_to_2026-01-21.json

# Alert if breaking changes found
if jq -e '.breaking_changes | length > 0' spa-assets/diffs/latest.json; then
  echo "⚠️ Breaking changes detected!"
fi
```

### Generating Reports

```bash
# Monthly summary
cat > spa-assets/diffs/summary-2026-01.md << EOF
# SPA Changes Summary - January 2026

## Overview
- Total snapshots: 31
- Endpoint additions: 5
- Endpoint removals: 0
- Breaking changes: 1

## Notable Changes
- Added API organization management endpoints
- Updated SSE protocol to 2.18
- Modified connector authorization flow

## Impact on SDK
- Update connectors client to handle new auth flow
- Add support for new org management endpoints
- No immediate breaking changes for existing users
EOF
```

## Diff Format (JSON Patch)

Diffs use RFC 6902 JSON Patch format when applicable:

```json
{
  "operations": [
    {
      "op": "add",
      "path": "/endpoints/rest/-",
      "value": "/rest/new-endpoint"
    },
    {
      "op": "replace",
      "path": "/metadata/protocol_version",
      "value": "2.18"
    },
    {
      "op": "remove",
      "path": "/endpoints/rest/23"
    }
  ]
}
```

## Retention Policy

- Keep all diffs permanently (small files)
- Generate monthly summaries
- Archive detailed diffs after 1 year

## Alerting

Set up alerts for:
- Breaking changes in critical endpoints
- Protocol version changes
- Large module size increases
- New endpoint additions (potential features)

## Notes

- Diffs are generated automatically on new snapshot addition
- Manual review recommended for breaking changes
- Use semantic versioning concepts for change categorization
- Track both additions and removals

---

**See also**: `/spa-assets/snapshots/` for full version snapshots
