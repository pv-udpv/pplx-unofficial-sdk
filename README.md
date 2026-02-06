# Perplexity AI Research & Development Workspace

> **Enterprise-level workspace for Perplexity.ai API research, reverse engineering, and production-ready implementation**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![Protocol](https://img.shields.io/badge/Protocol-2.17-green.svg)](https://www.perplexity.ai)

## 🏢 Enterprise Workspace Overview

This repository contains a **comprehensive enterprise-level monorepo** combining:

- 🔵 **TypeScript SDK** - Client library for Perplexity AI (original functionality preserved)
- 🐍 **Python Backend Services** - Microservices architecture with FastAPI
- 📊 **Schema-Driven Development** - OpenAPI specifications as source of truth
- 🏗️ **Production Infrastructure** - Docker, Kubernetes, CI/CD pipelines
- 🔬 **Research Tools** - Traffic analysis, reverse engineering, code generation

### Quick Links

- 📚 [Workspace Guide](docs/workspace.md) - Setup and usage
- 🏗️ [Architecture Overview](docs/architecture.md) - System design
- 🚀 [Getting Started](#-quick-start-enterprise-workspace) - One-command setup
- 📖 [Original SDK Documentation](#-typescript-sdk) - TypeScript SDK usage

---

## 🚀 Quick Start (Enterprise Workspace)

### Prerequisites

- Python 3.12+
- Node.js 18+
- Git

### One-Command Setup

```bash
make setup
```

This will:
- Create Python virtual environment
- Install Python dependencies (FastAPI, Ruff, mypy)
- Install Node.js dependencies
- Set up pre-commit hooks
- Create runtime directories
- Generate .env template

### Start Development Environment

```bash
make dev
```

Services will start on:
- **Gateway**: http://localhost:8000
- **Auth Service**: http://localhost:8001
- **Knowledge API**: http://localhost:8002

### Common Commands

```bash
make lint      # Run all linters (ruff, mypy, eslint)
make format    # Format all code
make test      # Run all tests
make codegen   # Generate code from schemas
make clean     # Clean build artifacts
```

## 📁 Workspace Structure

```
/
├── services/              # Microservices
│   ├── gateway/          # API Gateway (Python/FastAPI)
│   ├── auth-service/     # Authentication (Python/FastAPI)
│   ├── knowledge-api/    # Core API (Python/FastAPI)
│   ├── frontend/         # Next.js App (TypeScript)
│   ├── analysis/         # Code Analysis (Python)
│   └── asset-fetcher/    # Asset Mirror (Python)
├── packages/              # Shared Packages
│   ├── shared-python/    # Python utilities
│   └── shared-ts/        # TypeScript utilities
├── schemas/               # API Schemas & Traffic
│   ├── api/v2.17/        # OpenAPI specifications
│   ├── collected/        # Captured traffic
│   └── tools/            # Schema tools
├── src/                   # Original TypeScript SDK
├── data/                  # Persistent data
├── scripts/               # Utility scripts
├── infra/                 # Infrastructure (Docker, K8s)
└── docs/                  # Documentation
```

## 🛠️ Technology Stack

### Backend (Python 3.12+)
- **FastAPI** - High-performance async web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation and settings management
- **Ruff** - Fast Python linter and formatter
- **mypy** - Static type checking
- **pytest** - Testing framework

### Frontend (TypeScript)
- **Next.js 14+** - React framework with App Router
- **React** - UI library
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **ESLint** - Linting
- **Prettier** - Code formatting

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **GitHub Actions** - CI/CD pipelines
- **Kubernetes** - Production orchestration (planned)

---

## 📘 TypeScript SDK

The original TypeScript SDK functionality is fully preserved and enhanced.

### Installation

```bash
npm install @pplx-unofficial/sdk
```

### Features

## 📘 TypeScript SDK Features

- ✅ **SSE Streaming** - Real-time AI search responses with Server-Sent Events
- ✅ **REST API** - Complete CRUD for threads, entries, and collections
- ✅ **OAuth Connectors** - 9 integrations (Google Drive, Notion, OneDrive, etc.)
- ✅ **Service Worker Analysis** - Fetch and parse application chunk manifest
- ✅ **Code Graph Analysis** - Dependency graphs, call chains, and bootstrap analysis
- ✅ **Type-Safe** - Full TypeScript types for all operations
- ✅ **JSON Patch** - RFC-6902 compliant differential updates
- ✅ **Rate Limiting** - Built-in rate limit management
- ✅ **Pagination** - AsyncGenerator-based pagination
- ✅ **Tree-Shakeable** - Modular exports for optimal bundle size

## 📦 Installation

```bash
npm install @pplx-unofficial/sdk
# or
yarn add @pplx-unofficial/sdk
# or
pnpm add @pplx-unofficial/sdk
```

## 🚀 Quick Start

### Unified SDK (Recommended)

```typescript
import { createPplxSDK } from "@pplx-unofficial/sdk";

const sdk = createPplxSDK();

// Quick search
const { entries, thread } = await sdk.quickSearch("What is quantum computing?");
console.log(entries[entries.length - 1].blocks);

// Streaming search
for await (const entry of sdk.stream.search("Explain transformers")) {
  console.log("Status:", entry.status);
  if (entry.final) {
    console.log("Final answer:", entry.blocks);
  }
}

// REST API
const threads = await sdk.rest.listThreads({ limit: 20 });
console.log("Recent threads:", threads.items);

// Connectors
const connectors = await sdk.getConnectorsStatus();
console.log("Connected:", connectors.filter(c => c.connected));

// Service Worker Analysis
const manifest = await sdk.serviceWorker.getManifest();
console.log("Total chunks:", manifest.totalChunks);
```

### Modular Imports

```typescript
// Import only what you need
import { createPplxClient } from "@pplx-unofficial/sdk/stream";
import { createRestClient } from "@pplx-unofficial/sdk/rest";
import { createConnectorsClient } from "@pplx-unofficial/sdk/connectors";
import { createServiceWorkerClient } from "@pplx-unofficial/sdk/service-worker";

const stream = createPplxClient();
const rest = createRestClient();
const connectors = createConnectorsClient();
const serviceWorker = createServiceWorkerClient();
```

> Note: These modular import paths represent the planned API design and may not be available in the current release.
## 📚 Documentation

- [SSE Streaming Guide](docs/DEOBFUSCATION-SUMMARY.md) - Protocol analysis and streaming architecture
- [REST API Reference](docs/REST-API-GUIDE.md) - All endpoints and usage examples
- [Connectors Guide](docs/CONNECTORS-GUIDE.md) - OAuth flow and file integrations
- [Service Worker Guide](docs/SERVICE-WORKER-GUIDE.md) - Fetch and analyze chunk manifest from the Perplexity AI service
- [Code Graph Analysis](packages/code-graph/README.md) - Dependency graphs, call chains, and bootstrap analysis
- [Project Setup](docs/PROJECT-SETUP.md) - Development environment setup

## 🔌 Supported Connectors

| Connector | Type | Plans | Features |
|-----------|------|-------|----------|
| Google Drive | File Storage | Pro+ | Picker, Real-time sync |
| Microsoft OneDrive | File Storage | Enterprise | Picker, Sync |
| SharePoint | File Storage | Enterprise | Org-wide |
| Dropbox | File Storage | Enterprise | Sync |
| Box | File Storage | Enterprise | Sync |
| Notion | Productivity | Pro+ | Database search |
| Confluence | Productivity | Enterprise | Space search |
| Slack | Communication | Enterprise | Channel history |
| Local Upload | Local | All | Drag & drop |

## 🎨 Usage Examples

### SSE Streaming

```typescript
import { createPplxClient } from "@pplx-unofficial/sdk";

const client = createPplxClient();

// Search with options
for await (const entry of client.search("latest AI research", {
  focus: "academic",
  model: "sonar-pro",
  recency: "month"
})) {
  console.log(entry.status); // STARTED, STREAMING, COMPLETED
  if (entry.final) {
    console.log("Answer:", entry.blocks);
    console.log("Sources:", entry.sources_list);
  }
}
```

### REST API

```typescript
import { createRestClient } from "@pplx-unofficial/sdk";

const rest = createRestClient();

// List threads
const threads = await rest.listThreads({ limit: 20, sort: "updated_at" });

// Get thread details
const thread = await rest.getThread(contextUuid);

// Like an entry
await rest.likeEntry(backendUuid);

// Fork entry
const fork = await rest.forkEntry({
  backend_uuid: backendUuid,
  title: "My Fork"
});

// Collections (Spaces)
const collections = await rest.listCollections();
await rest.addThreadToCollection(collectionUuid, threadUuid);
```

### OAuth Connectors

```typescript
import { createConnectorsClient, OAuthPopupManager } from "@pplx-unofficial/sdk";

const connectors = createConnectorsClient();

// Start OAuth flow
const auth = await connectors.authorize("google_drive");
const popup = new OAuthPopupManager();
await popup.authorize(auth.auth_url);

// List files
const files = await connectors.listFiles("google_drive", { limit: 100 });

// Sync files to Space
await connectors.syncFiles("google_drive", fileIds, spaceUuid);
```

### Service Worker Analysis

```typescript
import { createServiceWorkerClient } from "@pplx-unofficial/sdk";

const client = createServiceWorkerClient();

// Fetch manifest
const manifest = await client.getManifest();
console.log(`Total chunks: ${manifest.totalChunks}`);

// Filter chunks
const jsChunks = await client.getChunks({ extension: "js" });
const restrictedFeatures = await client.getChunks({ restrictedOnly: true });

// Get statistics
const stats = await client.getStatistics();
console.log(`JavaScript files: ${stats.byExtension.js}`);
console.log(`Restricted features: ${stats.byCategory.restricted}`);
```

## 🏗️ Architecture

```
@pplx-unofficial/sdk
├── src/
│   ├── stream (pplx-client.ts)          - SSE streaming engine
│   ├── rest (pplx-rest-client.ts)       - REST API for CRUD
│   ├── connectors (pplx-connectors-client.ts) - OAuth & file sync
│   └── index.ts                         - Unified SDK
├── spa-assets/                           - Tracked SPA assets & versions
│   ├── snapshots/                       - HAR-extracted snapshots by date
│   ├── workbox/                         - Service worker chunks
│   ├── vite-chunks/                     - Vite build artifacts
│   ├── diffs/                           - Version-to-version differences
│   └── metadata/                        - Asset index & integrity checksums
├── docs/                                 - Documentation
├── examples/                             - Usage examples
└── har_agent.py                          - HAR analysis toolkit

Protocol: 2.18
Endpoints: 38 total (2 SSE + 24 REST + 11 Connectors + 1 Service Worker)
LOC: 2,050+ (excluding examples)
```

## 🤖 SDK Consumer Bot

A reference implementation demonstrating all SDK capabilities:

```bash
cd sdk-consumer-bot

# Search with streaming
pplx-bot search "quantum computing" --focus academic

# Create conversation thread
pplx-bot chat "ML Research" "explain transformers" --save "AI Papers"

# Search with connectors
pplx-bot connectors-search "team docs" -c google_drive notion

# Automated research
pplx-bot research "GraphQL vs REST" --depth 3
```

**Features:**
- ✅ Real-time streaming search with progress indicators
- ✅ Conversation management (threads, collections, likes)
- ✅ OAuth connector integration (Google Drive, Notion, etc.)
- ✅ CLI interface with 8+ commands
- ✅ Programmatic API for Node.js apps
- ✅ TypeScript examples and documentation

See [sdk-consumer-bot/README.md](sdk-consumer-bot/README.md) for full documentation.

## 🔒 Security

- **CSRF Protection** - State parameter in OAuth flow
- **Token Encryption** - AES-256-GCM for stored tokens
- **Rate Limiting** - Automatic rate limit compliance
- **User Isolation** - Personal connectors per account

## ⚠️ Disclaimer

This is an **unofficial** SDK created through reverse engineering of Perplexity AI's web application. It is not affiliated with, endorsed by, or supported by Perplexity AI.

**Use at your own risk:**
- May break with Perplexity updates
- Not covered by official support
- Terms of Service compliance is user's responsibility

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 🔗 Links

- [GitHub Repository](https://github.com/pv-udpv/pplx-unofficial-sdk)
- [Issue Tracker](https://github.com/pv-udpv/pplx-unofficial-sdk/issues)
- [Perplexity AI](https://www.perplexity.ai)


---

## 🎯 Microservices Architecture

### Gateway Service (Port 8000)
API Gateway providing:
- Rate limiting and CORS handling
- Request routing to backend services
- Authentication token injection
- Health checks and monitoring

### Auth Service (Port 8001)
Authentication hub featuring:
- NextAuth flow implementation
- Session pool management
- Token rotation and refresh
- Multi-account support

### Knowledge API (Port 8002)
Core API service with:
- SSE streaming endpoints
- REST API for CRUD operations
- Database integration
- Cache layer for performance

### Analysis Service (Port 8003)
Code analysis tools:
- Tree-sitter AST parsing
- Dependency graph generation
- ML pipeline integration
- Traffic pattern analysis

### Asset Fetcher (Port 8004)
Service worker analysis:
- Service worker parsing
- Asset mirroring and updates
- Version tracking
- Incremental synchronization

### Frontend (Port 3000)
Next.js application:
- React with App Router
- SSE streaming support
- Real-time updates
- Production-ready UI

---

## 📊 Status

| Module | Status | Technology |
|--------|--------|-----------|
| Gateway Service | ✅ Complete | Python/FastAPI |
| Auth Service | ✅ Complete | Python/FastAPI |
| Knowledge API | ✅ Complete | Python/FastAPI |
| TypeScript SDK | 🔄 Maintained | TypeScript |
| Infrastructure | ✅ Complete | Docker/K8s |
| Documentation | ✅ Complete | Markdown |
| CI/CD Pipelines | ✅ Complete | GitHub Actions |
| Frontend | 🔜 Planned | Next.js 14+ |
| Analysis Service | 🔜 Planned | Python/tree-sitter |
| Asset Fetcher | 🔜 Planned | Python |

---

## 🔗 Links

- [GitHub Repository](https://github.com/pv-udpv/pplx-unofficial-sdk)
- [Issue Tracker](https://github.com/pv-udpv/pplx-unofficial-sdk/issues)
- [Perplexity AI](https://www.perplexity.ai)

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🤝 Contributing

Contributions welcome! Please:
1. Read [docs/workspace.md](docs/workspace.md)
2. Follow the coding standards (Ruff for Python, ESLint for TypeScript)
3. Write tests for new features
4. Submit pull requests to `develop` branch

## ⚠️ Disclaimer

This is an **unofficial** workspace created through reverse engineering of Perplexity AI's web application. Not affiliated with, endorsed by, or supported by Perplexity AI.

**Use at your own risk:**
- May break with Perplexity updates
- Not covered by official support
- Terms of Service compliance is user's responsibility

---

**Made with ❤️ for research and development**