"""Configuration for Knowledge API service."""

import sys
from pathlib import Path

# Add packages to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "packages" / "shared-python" / "src"))

from config import BaseSettings  # type: ignore


class KnowledgeAPISettings(BaseSettings):
    """Knowledge API service settings."""

    host: str = "0.0.0.0"
    port: int = 8002
    debug: bool = False


settings = KnowledgeAPISettings()
