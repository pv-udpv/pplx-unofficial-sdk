"""FastAPI application for Auth service."""

import sys
from pathlib import Path

# Add packages to path
sys.path.insert(
    0, str(Path(__file__).parent.parent.parent.parent / "packages" / "shared-python" / "src")
)

from fastapi import FastAPI
from logger import get_logger  # type: ignore

from .config import settings

logger = get_logger(__name__)

app = FastAPI(
    title="Perplexity AI Auth Service",
    description="Authentication service with NextAuth flow",
    version="0.1.0",
    debug=settings.debug,
)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"service": "auth-service", "status": "ok"}


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event() -> None:
    """Startup event handler."""
    logger.info(f"Auth service starting on {settings.host}:{settings.port}")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Shutdown event handler."""
    logger.info("Auth service shutting down")
