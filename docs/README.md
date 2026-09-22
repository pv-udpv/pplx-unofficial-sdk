# Perplexity AI Research & Development Workspace

## Overview

A comprehensive enterprise-level monorepo for Perplexity.ai API research, reverse engineering, and production-ready implementation.

## Key Features

- 🐍 **Python 3.12+ Backend Services** - FastAPI microservices
- 🔵 **TypeScript SDK** - Client library (preserved)
- 📊 **Schema-Driven Development** - OpenAPI as source of truth
- 🏗️ **Production Infrastructure** - Docker, K8s ready
- 🔬 **Research Tools** - Traffic analysis, code generation

## Quick Start

```bash
# Setup workspace
make setup

# Start development
make dev

# Run tests
make test

# Format code
make format

# Lint code
make lint
```

## Services

- **Gateway** (8000) - API Gateway with rate limiting
- **Auth Service** (8001) - Authentication hub
- **Knowledge API** (8002) - Core API with SSE streaming
- **Frontend** (3000) - Next.js application (planned)
- **Analysis** (8003) - Code analysis (planned)
- **Asset Fetcher** (8004) - Asset mirror (planned)

## Documentation

- [Workspace Guide](workspace.md)
- [Architecture](architecture.md)
- [Contributing](../CONTRIBUTING.md)

## Technology Stack

**Backend**: Python 3.12+, FastAPI, Uvicorn, Pydantic
**Frontend**: TypeScript, Next.js 14+, React
**Tools**: Ruff, mypy, ESLint, Prettier, pytest, Vitest
**Infra**: Docker, Kubernetes, GitHub Actions

## Status

✅ Core workspace structure complete
✅ Python microservices foundation ready
✅ CI/CD pipelines configured
✅ Documentation comprehensive
🔜 Frontend implementation
🔜 Advanced features (ML, monitoring)

## License

MIT License

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Made with ❤️ for research and development**
