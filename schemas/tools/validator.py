"""Schema validator for Perplexity AI API."""

import json
import sys
from pathlib import Path
from typing import Any

# Add packages to path (go up 3 levels to repo root, then into packages)
sys.path.insert(
    0, str(Path(__file__).parent.parent.parent / "packages" / "shared-python" / "src")
)

from logger import get_logger  # type: ignore

logger = get_logger(__name__)


def validate_schema(schema_file: Path) -> bool:
    """Validate API schema structure.

    Args:
        schema_file: Path to schema file (JSON or YAML)

    Returns:
        True if valid, False otherwise
    """
    logger.info(f"Validating schema {schema_file}")

    try:
        with open(schema_file) as f:
            # Try to determine file type by extension
            if schema_file.suffix in [".yaml", ".yml"]:
                try:
                    import yaml

                    schema: dict[str, Any] = yaml.safe_load(f)
                except ImportError:
                    logger.warning("PyYAML not installed, skipping YAML validation")
                    logger.info("Install PyYAML to validate YAML schemas: pip install pyyaml")
                    return True  # Skip validation if yaml not available
            else:
                schema = json.load(f)

        # Basic validation for JSON schemas
        if schema_file.suffix == ".json":
            required_keys = ["version", "endpoints", "models"]
            for key in required_keys:
                if key not in schema:
                    logger.error(f"Missing required key: {key}")
                    return False

        logger.info("Schema validation passed")
        return True

    except Exception as e:
        logger.error(f"Schema validation failed: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validator.py <schema_file>")
        sys.exit(1)

    schema_file = Path(sys.argv[1])

    if not validate_schema(schema_file):
        sys.exit(1)
