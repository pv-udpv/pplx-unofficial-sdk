"""Tests for Knowledge API service."""

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Add service directory to path
service_dir = Path(__file__).parent.parent
sys.path.insert(0, str(service_dir))


@pytest.fixture
def client() -> TestClient:
    """Create test client."""
    from src.app import app

    return TestClient(app)


def test_root_endpoint(client: TestClient) -> None:
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"service": "knowledge-api", "status": "ok"}


def test_health_endpoint(client: TestClient) -> None:
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
