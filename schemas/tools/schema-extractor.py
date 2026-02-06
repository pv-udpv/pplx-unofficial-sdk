"""Schema extraction tool for Perplexity AI API."""

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


def extract_schema(input_file: Path, output_file: Path) -> None:
    """Extract and normalize API schema from HAR or OpenAPI file.

    Args:
        input_file: Path to input file
        output_file: Path to output schema file
    """
    logger.info(f"Extracting schema from {input_file}")

    with open(input_file) as f:
        _data: dict[str, Any] = json.load(f)

    # Basic schema extraction logic
    # This is a placeholder - implement actual extraction based on your needs
    schema = {
        "version": "2.17",
        "endpoints": [],
        "models": {},
    }

    with open(output_file, "w") as f:
        json.dump(schema, f, indent=2)

    logger.info(f"Schema extracted to {output_file}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python schema-extractor.py <input_file> <output_file>")
        sys.exit(1)

    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2])

    extract_schema(input_file, output_file)
