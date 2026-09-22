# Python FastAPI Service Pattern

## Service Structure

```python
# services/{service-name}/src/app.py
from fastapi import FastAPI
from .config import settings

app = FastAPI(
    title="Service Name",
    description="Service description",
    version="0.1.0",
    debug=settings.debug,
)

@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"service": "service-name", "status": "ok"}

@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}
```

## Configuration Pattern

```python
# services/{service-name}/src/config.py
import sys
from pathlib import Path

sys.path.insert(
    0, str(Path(__file__).parent.parent.parent.parent / "packages" / "shared-python" / "src")
)

from config import BaseSettings

class ServiceSettings(BaseSettings):
    """Service settings."""
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

settings = ServiceSettings()
```

## Testing Pattern

```python
# services/{service-name}/tests/test_api.py
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

service_dir = Path(__file__).parent.parent
sys.path.insert(0, str(service_dir))

@pytest.fixture
def client() -> TestClient:
    """Create test client."""
    from src.app import app
    return TestClient(app)
```
