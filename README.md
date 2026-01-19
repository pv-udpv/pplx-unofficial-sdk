# @pplx-unofficial/sdk

> **Unofficial TypeScript SDK for Perplexity AI** - Complete implementation of SSE streaming, REST API, and OAuth connectors.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Protocol](https://img.shields.io/badge/Protocol-2.18-green.svg)](https://www.perplexity.ai)

## 🎯 Features

- ✅ **SSE Streaming** - Real-time AI search responses with Server-Sent Events
- ✅ **REST API** - Complete CRUD for threads, entries, and collections
- ✅ **OAuth Connectors** - 9 integrations (Google Drive, Notion, OneDrive, etc.)
- ✅ **Type-Safe** - Full TypeScript types for all operations
- ✅ **Debug Mode** - Datadog APM/Logs integration for debugging
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
```

### Modular Imports

```typescript
// Import only what you need
import { createPplxClient } from "@pplx-unofficial/sdk/stream";
import { createRestClient } from "@pplx-unofficial/sdk/rest";
import { createConnectorsClient } from "@pplx-unofficial/sdk/connectors";

const stream = createPplxClient();
const rest = createRestClient();
const connectors = createConnectorsClient();
```

> Note: These modular import paths represent the planned API design and may not be available in the current release.
## 📚 Documentation

- [SSE Streaming Guide](docs/DEOBFUSCATION-SUMMARY.md) - Protocol analysis and streaming architecture
- [REST API Reference](docs/REST-API-GUIDE.md) - All endpoints and usage examples
- [Connectors Guide](docs/CONNECTORS-GUIDE.md) - OAuth flow and file integrations
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

### Debug Mode

```typescript
import { createPplxClient } from "@pplx-unofficial/sdk";

const client = createPplxClient();

// Enable debug mode to automatically log Datadog APM and Logs URLs
for await (const entry of client.search("quantum computing", { debug: true })) {
  // Automatically logs Datadog Trace/Logs URLs in console
  // Look for [DEBUG] groups in the console output
  
  if (entry.debug_data) {
    // Debug data includes:
    // - dd_trace_id: Datadog APM trace ID
    // - dd_request_id: Request ID with timestamp for log correlation
    console.log("Debug data:", entry.debug_data);
  }
  
  if (entry.final) break;
}
```

**Debug Output Example:**
```
[DEBUG] Entry abc-123-def
  Datadog Trace: https://app.datadoghq.com/apm/trace/1234567890abcdef
  Datadog Logs: https://app.datadoghq.com/logs?query=%40request_id%3A"req-abc123"&from_ts=...
```

## 🏗️ Architecture

```
@pplx-unofficial/sdk
├── stream (pplx-client.ts)          - SSE streaming engine
├── rest (pplx-rest-client.ts)       - REST API for CRUD
├── connectors (pplx-connectors-client.ts) - OAuth & file sync
└── index.ts                         - Unified SDK

Protocol: 2.18
Endpoints: 37 total (2 SSE + 24 REST + 11 Connectors)
LOC: 1,704 (excluding examples)
```

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

## 📊 Status

| Module | Status | Coverage |
|--------|--------|----------|
| SSE Streaming | 🔄 In Development | - |
| REST API | 🔄 In Development | - |
| Connectors | 🔄 In Development | - |
| Documentation | ✅ Complete | 100% |

---

**Made with ❤️ by reverse engineering**