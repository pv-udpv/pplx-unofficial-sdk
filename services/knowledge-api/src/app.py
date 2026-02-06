"""FastAPI application for Knowledge API service."""

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
    title="Perplexity AI Knowledge API",
    description="Core API with SSE streaming and REST endpoints",
    version="0.1.0",
    debug=settings.debug,
)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"service": "knowledge-api", "status": "ok"}


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event() -> None:
    """Startup event handler."""
    logger.info(f"Knowledge API service starting on {settings.host}:{settings.port}")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Shutdown event handler."""
    logger.info("Knowledge API service shutting down")
