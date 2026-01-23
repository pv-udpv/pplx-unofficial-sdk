#!/usr/bin/env python3
"""
Verify Integrity

Verifies SHA-256 checksums of all tracked assets against integrity.json.

Usage:
    python scripts/verify_integrity.py [spa-assets/metadata/integrity.json]
"""

import json
import hashlib
import sys
from pathlib import Path

def calculate_sha256(filepath):
    """Calculate SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            for block in iter(lambda: f.read(4096), b''):
                sha256.update(block)
        return sha256.hexdigest()
    except Exception as e:
        print(f"Error: Could not hash {filepath}: {e}", file=sys.stderr)
        return None

def verify_integrity(integrity_file):
    """Verify all files listed in integrity.json."""
    repo_root = Path(__file__).parent.parent
    
    if not integrity_file.exists():
        print(f"Error: {integrity_file} not found", file=sys.stderr)
        return False
    
    with open(integrity_file, 'r') as f:
        integrity_data = json.load(f)
    
    files = integrity_data.get('files', {})
    algorithm = integrity_data.get('algorithm', 'SHA-256')
    
    if algorithm != 'SHA-256':
        print(f"Error: Unsupported algorithm {algorithm}", file=sys.stderr)
        return False
    
    print(f"Verifying {len(files)} files...")
    
    all_valid = True
    checked = 0
    skipped = 0
    
    for filepath, expected_hash in files.items():
        full_path = repo_root / filepath
        
        # Skip pending checksums
        if expected_hash == "pending":
            skipped += 1
            continue
        
        if not full_path.exists():
            print(f"✗ {filepath}: File not found")
            all_valid = False
            continue
        
        actual_hash = calculate_sha256(full_path)
        if actual_hash is None:
            print(f"✗ {filepath}: Could not calculate hash")
            all_valid = False
            continue
        
        if actual_hash == expected_hash:
            print(f"✓ {filepath}")
            checked += 1
        else:
            print(f"✗ {filepath}: Hash mismatch")
            print(f"  Expected: {expected_hash}")
            print(f"  Actual:   {actual_hash}")
            all_valid = False
    
    print(f"\nSummary: {checked} verified, {skipped} skipped")
    
    if all_valid:
        print("✓ All checksums verified successfully")
        return True
    else:
        print("✗ Some files failed verification", file=sys.stderr)
        return False

def main():
    if len(sys.argv) > 1:
        integrity_file = Path(sys.argv[1])
    else:
        repo_root = Path(__file__).parent.parent
        integrity_file = repo_root / "spa-assets" / "metadata" / "integrity.json"
    
    success = verify_integrity(integrity_file)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
