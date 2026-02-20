#!/usr/bin/env python3
"""Validation script for workspace setup."""

import sys
from pathlib import Path


def check_directory_structure() -> bool:
    """Check that all required directories exist."""
    required_dirs = [
        "services/gateway",
        "services/auth-service",
        "services/knowledge-api",
        "packages/shared-python",
        "packages/shared-ts",
        "schemas/api/v2.17",
        "docs",
        "scripts",
        "infra/docker",
    ]

    print("Checking directory structure...")
    all_exist = True
    for dir_path in required_dirs:
        full_path = Path(dir_path)
        if full_path.exists():
            print(f"  ✓ {dir_path}")
        else:
            print(f"  ✗ {dir_path} (missing)")
            all_exist = False

    return all_exist


def check_config_files() -> bool:
    """Check that configuration files exist."""
    required_files = [
        "pyproject.toml",
        "ruff.toml",
        "Makefile",
        ".pre-commit-config.yaml",
        ".gitignore",
        "README.md",
        "CONTRIBUTING.md",
    ]

    print("\nChecking configuration files...")
    all_exist = True
    for file_path in required_files:
        full_path = Path(file_path)
        if full_path.exists():
            print(f"  ✓ {file_path}")
        else:
            print(f"  ✗ {file_path} (missing)")
            all_exist = False

    return all_exist


def check_python_imports() -> bool:
    """Check that Python packages can be imported."""
    print("\nChecking Python imports...")

    # Add shared-python to path
    sys.path.insert(0, str(Path("packages/shared-python/src")))

    try:
        from config import BaseSettings  # type: ignore

        print("  ✓ shared-python.config")
    except ImportError as e:
        print(f"  ✗ shared-python.config: {e}")
        return False

    try:
        from logger import get_logger  # type: ignore

        print("  ✓ shared-python.logger")
    except ImportError as e:
        print(f"  ✗ shared-python.logger: {e}")
        return False

    return True


def main() -> None:
    """Run all validation checks."""
    print("=" * 60)
    print("Perplexity AI Workspace Validation")
    print("=" * 60)

    checks = [
        ("Directory Structure", check_directory_structure),
        ("Configuration Files", check_config_files),
        ("Python Imports", check_python_imports),
    ]

    results = []
    for name, check_func in checks:
        result = check_func()
        results.append((name, result))

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)

    all_passed = True
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
        if not result:
            all_passed = False

    print("=" * 60)

    if all_passed:
        print("\n✅ All validation checks passed!")
        print("Workspace is ready for development.")
        print("\nNext steps:")
        print("  1. Run 'make setup' to install dependencies")
        print("  2. Run 'make dev' to start services")
        print("  3. Run 'make test' to run tests")
        sys.exit(0)
    else:
        print("\n❌ Some validation checks failed.")
        print("Please fix the issues and run validation again.")
        sys.exit(1)


if __name__ == "__main__":
    main()
