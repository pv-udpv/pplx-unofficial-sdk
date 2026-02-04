"""Configuration for Gateway service."""

import sys
from pathlib import Path

# Add packages to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "packages" / "shared-python" / "src"))

from config import BaseSettings  # type: ignore


class GatewaySettings(BaseSettings):
    """Gateway service settings."""

    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:3000"]
    perplexity_api_url: str = "https://www.perplexity.ai"


settings = GatewaySettings()
