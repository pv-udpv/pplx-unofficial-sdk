# pplx-unofficial-sdk

Unofficial TypeScript SDK for Perplexity AI - **Full SSE Streaming**, REST API, OAuth Connectors (Protocol 2.18)

## Features

- ✅ **SSE Streaming Client** - Real-time search with Server-Sent Events (FULLY IMPLEMENTED)
- ✅ **REST API Client** - Complete thread and entry management
- ⏳ **OAuth Connectors** - Integration connectors (stub)
- ✅ **Unified SDK** - Combined interface for all clients
- 💪 **TypeScript** - Full type safety
- 📦 **Tree-shakeable** - Import only what you need

## Quick Start

### Installation

```bash
npm install @pplx-unofficial/sdk
```

### SSE Streaming

```typescript
import { createPplxClient } from '@pplx-unofficial/sdk';

const client = createPplxClient();

// Stream real-time search results
for await (const entry of client.search('quantum computing')) {
  console.log('Status:', entry.status);
  console.log('Content:', entry.blocks);
  
  if (entry.final) {
    console.log('Complete!');
    break;
  }
}
```

### REST API

```typescript
import { createRestClient } from '@pplx-unofficial/sdk';

const client = createRestClient();

// Create thread
const thread = await client.createThread({ 
  title: 'Research Thread' 
});

// Get entry
const entry = await client.getEntry(entryUuid);

// Like entry
await client.likeEntry(entryUuid);
```

### Unified SDK

```typescript
import { createPplxSDK } from '@pplx-unofficial/sdk';

const sdk = createPplxSDK();

// Use streaming
for await (const entry of sdk.stream.search('AI news')) {
  if (entry.final) break;
}

// Use REST API
const thread = await sdk.rest.createThread({ title: 'Discussion' });

// Helper methods
const result = await sdk.quickSearch('machine learning');
```

## Documentation

- **[SSE Streaming Guide](./docs/SSE-STREAMING-GUIDE.md)** - Complete streaming client documentation
- **[REST API Guide](./docs/REST-API-GUIDE.md)** - REST API reference
- **[Examples](./examples/)** - Usage examples for all features

## Implementation Status

| Module | Status | LOC | Features |
|--------|--------|-----|----------|
| SSE Streaming | ✅ **Complete** | 570 | Real-time search, reconnection, async generators |
| REST API | ✅ Complete | 410 | 24 endpoints, full CRUD |
| Unified SDK | ✅ Complete | 204 | Combined interface, helpers |
| Connectors | ⏳ Stub | 218 | OAuth (pending) |

## Examples

See the [examples](./examples/) directory:

- **[sse-streaming-examples.ts](./examples/sse-streaming-examples.ts)** - 10 SSE streaming examples
- **[rest-client-examples.ts](./examples/rest-client-examples.ts)** - 5 REST API examples

## License

MIT
