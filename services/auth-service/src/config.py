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
    secret_key: str = ""  # MUST be set via environment variable in production
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    def __init__(self, **kwargs):  # type: ignore
        """Initialize settings and validate secret key."""
        super().__init__(**kwargs)
        if not self.secret_key:
            import os

            # Only for development - require explicit setting
            if os.getenv("AUTH_SECRET_KEY"):
                self.secret_key = os.getenv("AUTH_SECRET_KEY", "")
            else:
                # Use a development-only default with clear warning
                self.secret_key = "INSECURE-DEV-KEY-CHANGE-THIS"
                if not self.debug:
                    raise ValueError(
                        "AUTH_SECRET_KEY must be set in production. "
                        "Set debug=true for development mode."
                    )


settings = AuthSettings()
