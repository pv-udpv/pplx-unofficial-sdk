"""Schema validator for Perplexity AI API."""

import json
import sys
from pathlib import Path
from typing import Any

# Add packages to path
sys.path.insert(
    0, str(Path(__file__).parent.parent.parent.parent / "packages" / "shared-python" / "src")
)

from logger import get_logger  # type: ignore

logger = get_logger(__name__)


def validate_schema(schema_file: Path) -> bool:
    """Validate API schema structure.

    Args:
        schema_file: Path to schema file

    Returns:
        True if valid, False otherwise
    """
    logger.info(f"Validating schema {schema_file}")

    try:
        with open(schema_file) as f:
            schema: dict[str, Any] = json.load(f)

        # Basic validation
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
