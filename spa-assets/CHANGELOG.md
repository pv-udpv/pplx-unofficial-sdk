# SPA Assets Changelog

All notable changes to the SPA assets directory structure and tracked assets will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.0] - 2026-01-23

### Added
- Initial directory structure for tracking SPA assets
- `snapshots/` directory for HAR-extracted SPA snapshots
- `workbox/` directory for service worker chunks
- `vite-chunks/` directory for Vite build artifacts
- `diffs/` directory for version-to-version differences
- `metadata/` directory for asset tracking and integrity verification
- Comprehensive README files for each subdirectory
- Initial snapshot from 2026-01-21 (Protocol 2.18)
- `asset-index.json` for complete asset catalog
- `version-history.json` for SPA version timeline
- `integrity.json` for SHA-256 checksums
- `.gitattributes` for Git LFS support
- Updated `.gitignore` to handle large files appropriately

### Documentation
- Main `spa-assets/README.md` with complete usage guide
- CI/CD integration examples
- Asset management workflows
- Retention policies and best practices

### Purpose
This directory structure enables:
- Systematic tracking of Perplexity SPA evolution
- Version-to-version difference analysis
- CI/CD pipeline integration for integrity checks
- SDK development support through historical reference

## Future Plans

### [1.1.0] - Planned
- Add automation scripts for asset management
- Implement diff generation tool
- Create integrity verification script
- Add GitHub Actions workflow for automated verification

### [1.2.0] - Planned
- Extract and catalog Workbox service worker files
- Catalog Vite chunks by functionality
- Create dependency graphs for chunks
- Add change detection automation

---

**Maintained by**: pv-udpv  
**Project**: @pplx-unofficial/sdk
