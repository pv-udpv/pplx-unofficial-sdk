# 🚀 How to Add Archive

## Archive Details
- **File**: `spa-assets-js.tar.gz`
- **Size**: 9.96 MB (compressed)
- **Contains**: 1,151 JS files (24.53 MB uncompressed)

## Push Archive to This Directory

### Method 1: Git LFS (Recommended for large files)

```bash
# Install Git LFS
git lfs install

# Track tar.gz files
git lfs track "*.tar.gz"
git add .gitattributes

# Add and push archive
cp /path/to/spa-assets-js.tar.gz .
git add spa-assets-js.tar.gz
git commit -m "feat: Add SPA assets archive (9.96 MB)"
git push origin main
```

### Method 2: Direct Push

```bash
# Add archive
cp /path/to/spa-assets-js.tar.gz .
git add spa-assets-js.tar.gz
git commit -m "feat: Add SPA assets archive"
git push origin main
```

### Method 3: GitHub Releases (Best for downloads)

1. Go to: https://github.com/pv-udpv/pplx-unofficial-sdk/releases/new
2. Tag: `spa-assets-v2026-01-23`
3. Title: `SPA Assets Archive - 1151 JS Files`
4. Upload: `spa-assets-js.tar.gz`
5. Publish release

## After Upload

Users can extract with:
```bash
tar -xzf spa-assets-js.tar.gz
```