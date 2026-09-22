# SPA Assets Management Scripts

Automation scripts for managing SPA assets, integrity verification, and CI/CD integration.

## Scripts

### `update_asset_index.py`

Updates `spa-assets/metadata/asset-index.json` with current asset information.

**Usage:**
```bash
# Update the asset index
python scripts/update_asset_index.py

# Verify the asset index is up to date
python scripts/update_asset_index.py --verify
```

**What it does:**
- Scans all subdirectories in `spa-assets/`
- Catalogs snapshots, workbox versions, vite chunks, and diffs
- Collects file sizes and metadata
- Generates or verifies `asset-index.json`

**When to run:**
- After adding new snapshots
- After extracting new workbox or vite versions
- Before committing changes to spa-assets

### `verify_integrity.py`

Verifies SHA-256 checksums of all tracked assets.

**Usage:**
```bash
# Verify using default path
python scripts/verify_integrity.py

# Verify using custom path
python scripts/verify_integrity.py spa-assets/metadata/integrity.json
```

**What it does:**
- Reads `integrity.json` for expected checksums
- Calculates actual SHA-256 hashes for all files
- Compares and reports mismatches
- Skips files marked as "pending"

**When to run:**
- After pulling changes from repository
- Before committing new assets
- As part of CI/CD pipeline
- Weekly for routine verification

## Adding New Scripts

When creating new scripts for asset management:

1. **Follow naming convention**: `verb_noun.py` (e.g., `generate_diff.py`)
2. **Add shebang**: `#!/usr/bin/env python3`
3. **Include docstring**: Module-level docstring with usage
4. **Make executable**: `chmod +x scripts/new_script.py`
5. **Update this README**: Document the new script
6. **Add error handling**: Use try/except and return proper exit codes

## Planned Scripts

### `generate_diff.py` (Coming Soon)
Generate version-to-version difference reports.

```bash
python scripts/generate_diff.py \
  --from spa-assets/snapshots/2026-01-20 \
  --to spa-assets/snapshots/2026-01-21 \
  --output spa-assets/diffs/2026-01-20_to_2026-01-21.json
```

### `check_asset_health.py` (Coming Soon)
Perform comprehensive health checks on all assets.

```bash
python scripts/check_asset_health.py > asset-health-report.md
```

### `archive_old_versions.py` (Coming Soon)
Archive old versions according to retention policy.

```bash
python scripts/archive_old_versions.py --dry-run
python scripts/archive_old_versions.py --execute
```

## Dependencies

Current scripts use only Python standard library:
- `json` - JSON parsing
- `pathlib` - Path operations
- `hashlib` - SHA-256 hashing
- `datetime` - Timestamps
- `sys` - Command line arguments

No external dependencies required.

## CI/CD Integration

These scripts are integrated into GitHub Actions workflows:

- `.github/workflows/verify-spa-assets.yml` - Automated verification on push/PR

See workflow file for detailed configuration.

## Exit Codes

All scripts follow standard exit code conventions:
- `0` - Success
- `1` - Error or verification failed

This allows easy integration in shell scripts and CI/CD pipelines:

```bash
if python scripts/verify_integrity.py; then
  echo "All checksums valid"
else
  echo "Verification failed!"
  exit 1
fi
```

---

**Maintained by**: pv-udpv  
**Project**: @pplx-unofficial/sdk
