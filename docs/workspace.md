# Workspace Guide

## Overview

This workspace is a comprehensive enterprise-level development environment for Perplexity.ai API research, reverse engineering, and production-ready implementation.

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Git
- Make

### Setup

1. Clone the repository:
```bash
git clone https://github.com/pv-udpv/pplx-unofficial-sdk.git
cd pplx-unofficial-sdk
```

2. Run setup:
```bash
make setup
```

3. Start development environment:
```bash
make dev
```

## Project Structure

```
/
├── .github/               # CI/CD workflows
├── .vscode/               # VS Code configuration
├── schemas/               # API schemas & traffic
│   ├── api/              # OpenAPI specifications
│   ├── collected/        # Captured traffic
│   └── tools/            # Schema tools
├── services/              # Microservices
│   ├── auth-service/     # Authentication
│   ├── gateway/          # API Gateway
│   ├── knowledge-api/    # Core API
│   ├── frontend/         # Next.js app
│   ├── analysis/         # Code analysis
│   └── asset-fetcher/    # Asset mirror
├── packages/              # Shared packages
│   ├── shared-python/    # Python utilities
│   └── shared-ts/        # TypeScript utilities
├── data/                  # Persistent data
├── scripts/               # Utility scripts
├── infra/                 # Infrastructure
└── docs/                  # Documentation
```

## Common Tasks

### Development

```bash
# Start all services
make dev

# Run linters
make lint

# Format code
make format

# Run tests
make test

# Generate code from schemas
make codegen
```

### Service Management

```bash
# Start individual service (gateway)
cd services/gateway && python3 runtime/main.py

# Or with environment
cd services/gateway && GATEWAY_PORT=8000 python3 runtime/main.py

# Start auth service
cd services/auth-service && python3 runtime/main.py

# Start knowledge API
cd services/knowledge-api && python3 runtime/main.py
```

### Testing

```bash
# Python tests
make test-python

# TypeScript tests
make test-ts

# Run specific test
pytest services/gateway/tests/test_api.py
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Gateway
GATEWAY_HOST=0.0.0.0
GATEWAY_PORT=8000

# Auth Service
AUTH_HOST=0.0.0.0
AUTH_PORT=8001
AUTH_SECRET_KEY=your-secret-key

# Knowledge API
KNOWLEDGE_API_HOST=0.0.0.0
KNOWLEDGE_API_PORT=8002
```

### Service Configuration

Each service uses `pydantic-settings` for configuration:

```python
from packages.shared_python.src.config import BaseSettings

class MySettings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
```

## Development Workflow

### 1. Schema-First Development

Define your API in OpenAPI:

```yaml
# schemas/api/v2.17/openapi.yaml
paths:
  /api/search:
    post:
      summary: Search endpoint
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SearchRequest'
```

### 2. Code Generation

Generate types and models:

```bash
make codegen
```

### 3. Implementation

Implement the service:

```python
from fastapi import FastAPI

app = FastAPI()

@app.post("/api/search")
async def search(request: SearchRequest) -> SearchResponse:
    # Implementation
    pass
```

### 4. Testing

Write tests:

```python
import pytest

@pytest.mark.asyncio
async def test_search():
    response = await client.post("/api/search", json={...})
    assert response.status_code == 200
```

### 5. CI/CD

Push to GitHub - workflows run automatically.

## Best Practices

### Python

- Use type hints everywhere
- Follow Ruff configuration
- Use async/await for I/O
- Write docstrings
- Keep functions small and focused

### TypeScript

- Enable strict mode
- Use proper types (no `any`)
- Prefer composition over inheritance
- Write unit tests
- Keep components small

### Git Workflow

- Feature branches from `develop`
- Pull requests for all changes
- Pass CI before merge
- Squash commits
- Write clear commit messages

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Import Errors

```bash
# Reinstall dependencies
make clean
make setup
```

### Test Failures

```bash
# Run with verbose output
pytest -vv

# Run specific test
pytest -k test_name
```

## Resources

- [Architecture Overview](architecture.md)
- [API Documentation](api-spec.yaml)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Perplexity AI](https://www.perplexity.ai)
