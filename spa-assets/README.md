# Perplexity AI SPA Assets Archive

## 📦 Contents

This directory contains JavaScript assets extracted from Perplexity AI SPA (Single Page Application).

### Archive: `spa-assets-js.tar.gz`

- **Files**: 1,151 JS modules
- **Uncompressed**: 24.53 MB
- **Compressed**: 9.96 MB
- **Compression**: 59.4%
- **Source**: HAR capture from www.perplexity.ai
- **Date**: 2026-01-23

### Extract Archive

```bash
tar -xzf spa-assets-js.tar.gz
```

This will extract all files to current directory with proper structure:
- Language parsers (150+ files)
- React components (400+ files)
- Vendor bundles
- Service worker
- Restricted features

### File Structure

```
extracted/
├── service-worker.js
├── vendors-Czx2bdUR.js
├── icons-C77LVPXu.js
├── _restricted/
│   ├── restricted-feature-health-C3bMKSvM.js
│   └── restricted-feature-notes-BquE_m0a.js
├── language parsers/
│   ├── typescript-DXxCUjKb.js
│   ├── python-CqkZVwNJ.js
│   └── ...
└── components/
    ├── Calendar-DAHRSGY_.js
    ├── Thread-BxL9mK2s.js
    └── ...
```

### Manifest

See `spa-assets-manifest.json` for complete file listing and metadata.

### Usage

1. **Extract archive**:
   ```bash
   tar -xzf spa-assets-js.tar.gz
   ```

2. **Analyze dependencies**:
   ```bash
   python3 ../scripts/analyze_dependencies.py
   ```

3. **Build dependency graph**:
   ```bash
   python3 ../scripts/build_dep_graph.py
   ```

### Tools

- **`analyze_dependencies.py`** - Extract imports/exports, build graph
- **`build_dep_graph.py`** - Generate Mermaid diagrams
- **`extract_types.py`** - Extract TypeScript type definitions

### Statistics

| Metric | Value |
|--------|-------|
| Total modules | 1,151 |
| Total size | 24.53 MB |
| Largest file | service-worker.js (185 KB) |
| Average size | 21.3 KB |
| Language parsers | 150+ |
| React components | 400+ |

### Notes

- All files are minified/obfuscated
- Use deobfuscation tools for analysis
- Contains internal API endpoints
- Includes feature flags and experiments

### Related Files

- `perplexity_spa_full_spec.json` - Full SPA specification
- `endpoints_ast_extracted.json` - API endpoints catalog
- `perplexity-openapi-v3.1.json` - OpenAPI specification

---

**Repository**: [pv-udpv/pplx-unofficial-sdk](https://github.com/pv-udpv/pplx-unofficial-sdk)  
**License**: MIT  
**Maintained by**: @pv-udpv