# Architecture Overview

## System Design

The Perplexity AI Research & Development Workspace is designed as an enterprise-level monorepo with microservices architecture, combining TypeScript for frontend and shared code with Python 3.12+ for backend services, analyzers, and ML pipelines.

## Core Principles

1. **API-First Approach**: OpenAPI specifications drive development
2. **Schema-Driven Development**: Schemas as source of truth
3. **Type-Safe**: Full TypeScript and Python type coverage
4. **Async-First**: Non-blocking I/O throughout
5. **Testable**: Comprehensive unit, integration, and E2E tests

## Architecture Layers

### 1. Gateway Layer

**Implemented:**
- API Gateway with FastAPI: Central entry point for all API requests
- CORS Handling: Configurable CORS policies via settings
- Health check endpoints

**Planned:**
- Rate Limiting: Per-user/IP rate limits
- Auth Injection: Automatic authentication token injection
- Request routing and load balancing

### 2. Service Layer

#### Auth Service (Port 8001)

**Implemented:**
- FastAPI service foundation
- Environment-based configuration
- Health check endpoints

**Planned:**
- NextAuth flow implementation
- Session pool management
- Token rotation
- Multi-account support

#### Knowledge API (Port 8002)

**Implemented:**
- FastAPI service foundation
- Environment-based configuration
- Health check endpoints

**Planned:**
- SSE streaming endpoints
- REST API for CRUD operations
- Database integration
- Cache layer

#### Frontend (Port 3000)

**Status:** Structure created, implementation planned
- Next.js 14+ with App Router
- React with hooks
- SSE streaming support
- Real-time updates

#### Analysis Service (Port 8003)

**Status:** Structure created, implementation planned
- Tree-sitter AST analysis
- Code graph generation
- ML pipeline integration

#### Asset Fetcher (Port 8004)

**Status:** Structure created, implementation planned
- Service worker parsing
- Asset mirroring
- Incremental updates

### 3. Data Layer
- **Schemas**: API specifications and models
- **Traffic**: Captured network traces
- **Assets**: Mirrored static assets

## Technology Stack

### Backend (Python 3.12+)
- **FastAPI**: High-performance async web framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation and settings
- **aiohttp**: Async HTTP client
- **pytest**: Testing framework

### Frontend (TypeScript)
- **Next.js 14+**: React framework with App Router
- **React**: UI library
- **Vitest**: Unit testing
- **Playwright**: E2E testing

### Tooling
- **Ruff**: Fast Python linter and formatter
- **mypy**: Static type checker
- **ESLint**: TypeScript/JavaScript linter
- **Prettier**: Code formatter

## Data Flow

```
Client Request
    ↓
API Gateway (8000)
    ↓
┌─────────┬─────────┬─────────┐
│  Auth   │ Knowledge│ Analysis│
│ Service │   API    │ Service │
│ (8001)  │  (8002)  │ (8003)  │
└─────────┴─────────┴─────────┘
    ↓
Data Layer
```

## Security

- HTTPS/TLS for all external connections
- JWT-based authentication
- CSRF protection in OAuth flows
- Token encryption (AES-256-GCM)
- Rate limiting per endpoint
- User isolation

## Scalability

- Horizontal scaling of services
- Load balancing via API Gateway
- Connection pooling
- Caching strategies
- Async I/O throughout

## Monitoring

- Prometheus metrics
- Grafana dashboards
- Structured logging
- Health check endpoints
- Performance tracking

## Development Workflow

1. **Schema First**: Define API in OpenAPI spec
2. **Code Generation**: Generate types and models
3. **Implementation**: Write service code
4. **Testing**: Unit → Integration → E2E
5. **CI/CD**: Automated testing and deployment

## Deployment

- Docker containers for each service
- Kubernetes orchestration
- GitHub Actions CI/CD
- Blue-green deployments
- Automated rollbacks
