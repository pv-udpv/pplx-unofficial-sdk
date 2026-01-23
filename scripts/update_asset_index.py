#!/usr/bin/env python3
"""
Update Asset Index

Updates spa-assets/metadata/asset-index.json with current asset information.
Scans all subdirectories and catalogs files with metadata.

Usage:
    python scripts/update_asset_index.py [--verify]
"""

import json
from pathlib import Path
from datetime import datetime, timezone
import sys

def scan_snapshots(spa_assets_dir):
    """Scan snapshots directory for asset information."""
    snapshots_dir = spa_assets_dir / "snapshots"
    assets = []
    
    for date_dir in sorted(snapshots_dir.iterdir()):
        if not date_dir.is_dir() or date_dir.name.startswith('.'):
            continue
        
        files = {}
        for file_path in date_dir.iterdir():
            if file_path.is_file() and file_path.suffix == '.json':
                file_info = {
                    "size": file_path.stat().st_size
                }
                
                # Add specific metadata for known files
                if file_path.name == "metadata.json":
                    try:
                        with open(file_path, 'r') as f:
                            metadata = json.load(f)
                            if "endpoints_count" in metadata:
                                file_info["endpoints_count"] = metadata["endpoints_count"]
                            if "modules_count" in metadata:
                                file_info["modules_count"] = metadata["modules_count"]
                            if "protocol_version" in metadata:
                                file_info["protocol_version"] = metadata["protocol_version"]
                    except Exception as e:
                        print(f"Warning: Could not read {file_path}: {e}", file=sys.stderr)
                
                files[file_path.name] = file_info
        
        if files:
            assets.append({
                "type": "snapshot",
                "date": date_dir.name,
                "path": f"spa-assets/snapshots/{date_dir.name}/",
                "files": files
            })
    
    return assets

def scan_workbox(spa_assets_dir):
    """Scan workbox directory for version information."""
    workbox_dir = spa_assets_dir / "workbox" / "versions"
    assets = []
    
    if not workbox_dir.exists():
        return assets
    
    for version_dir in sorted(workbox_dir.iterdir()):
        if not version_dir.is_dir() or version_dir.name.startswith('.'):
            continue
        
        files = {}
        for file_path in version_dir.rglob('*'):
            if file_path.is_file():
                rel_path = file_path.relative_to(version_dir)
                files[str(rel_path)] = {
                    "size": file_path.stat().st_size
                }
        
        if files:
            assets.append({
                "type": "workbox",
                "version": version_dir.name,
                "path": f"spa-assets/workbox/versions/{version_dir.name}/",
                "files": files
            })
    
    return assets

def scan_vite_chunks(spa_assets_dir):
    """Scan vite-chunks directory for version information."""
    chunks_dir = spa_assets_dir / "vite-chunks" / "versions"
    assets = []
    
    if not chunks_dir.exists():
        return assets
    
    for version_dir in sorted(chunks_dir.iterdir()):
        if not version_dir.is_dir() or version_dir.name.startswith('.'):
            continue
        
        files = {}
        for file_path in version_dir.rglob('*'):
            if file_path.is_file():
                rel_path = file_path.relative_to(version_dir)
                files[str(rel_path)] = {
                    "size": file_path.stat().st_size
                }
        
        if files:
            assets.append({
                "type": "vite-chunks",
                "version": version_dir.name,
                "path": f"spa-assets/vite-chunks/versions/{version_dir.name}/",
                "files": files
            })
    
    return assets

def scan_diffs(spa_assets_dir):
    """Scan diffs directory for difference reports."""
    diffs_dir = spa_assets_dir / "diffs"
    assets = []
    
    for file_path in sorted(diffs_dir.glob('*.json')):
        # Parse filename like "2026-01-20_to_2026-01-21.json"
        parts = file_path.stem.split('_to_')
        if len(parts) == 2:
            assets.append({
                "type": "diff",
                "from": parts[0],
                "to": parts[1],
                "path": f"spa-assets/diffs/{file_path.name}",
                "size": file_path.stat().st_size
            })
    
    return assets

def update_asset_index(repo_root, verify=False):
    """Update the asset index file."""
    spa_assets_dir = repo_root / "spa-assets"
    
    if not spa_assets_dir.exists():
        print("Error: spa-assets directory not found", file=sys.stderr)
        return False
    
    # Scan all asset types
    assets = []
    assets.extend(scan_snapshots(spa_assets_dir))
    assets.extend(scan_workbox(spa_assets_dir))
    assets.extend(scan_vite_chunks(spa_assets_dir))
    assets.extend(scan_diffs(spa_assets_dir))
    
    # Create index
    index = {
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_snapshots": sum(1 for a in assets if a["type"] == "snapshot"),
        "total_workbox_versions": sum(1 for a in assets if a["type"] == "workbox"),
        "total_vite_versions": sum(1 for a in assets if a["type"] == "vite-chunks"),
        "total_diffs": sum(1 for a in assets if a["type"] == "diff"),
        "assets": assets
    }
    
    # Write or verify
    index_path = spa_assets_dir / "metadata" / "asset-index.json"
    
    if verify:
        if not index_path.exists():
            print("Error: asset-index.json does not exist", file=sys.stderr)
            return False
        
        with open(index_path, 'r') as f:
            existing = json.load(f)
        
        # Compare all asset counts
        ok = True

        if existing.get("total_snapshots") != index["total_snapshots"]:
            print(f"Warning: Snapshot count mismatch: {existing.get('total_snapshots')} vs {index['total_snapshots']}")
            ok = False

        if existing.get("total_workbox_versions") != index["total_workbox_versions"]:
            print(f"Warning: Workbox version count mismatch: {existing.get('total_workbox_versions')} vs {index['total_workbox_versions']}")
            ok = False

        if existing.get("total_vite_versions") != index["total_vite_versions"]:
            print(f"Warning: Vite version count mismatch: {existing.get('total_vite_versions')} vs {index['total_vite_versions']}")
            ok = False

        if existing.get("total_diffs") != index["total_diffs"]:
            print(f"Warning: Diff count mismatch: {existing.get('total_diffs')} vs {index['total_diffs']}")
            ok = False

        existing_assets = existing.get("assets", [])
        if len(existing_assets) != len(index["assets"]):
            print(f"Warning: Asset list length mismatch: {len(existing_assets)} vs {len(index['assets'])}")
            ok = False
        elif "assets" in existing and existing_assets != index["assets"]:
            print("Warning: Asset list contents differ from current scan")
            ok = False

        if not ok:
            return False
        
        print("✓ Asset index is up to date")
        return True
    else:
        with open(index_path, 'w') as f:
            json.dump(index, f, indent=2)
        print(f"✓ Updated asset index: {len(assets)} assets cataloged")
        return True

def main():
    verify = '--verify' in sys.argv
    repo_root = Path(__file__).parent.parent
    
    success = update_asset_index(repo_root, verify=verify)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
