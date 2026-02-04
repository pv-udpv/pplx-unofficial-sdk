"""Configuration for Auth service."""

import sys
from pathlib import Path

# Add packages to path
sys.path.insert(
    0, str(Path(__file__).parent.parent.parent.parent / "packages" / "shared-python" / "src")
)

from config import BaseSettings  # type: ignore


class AuthSettings(BaseSettings):
    """Auth service settings."""

    host: str = "0.0.0.0"
    port: int = 8001
    debug: bool = False
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30


settings = AuthSettings()
