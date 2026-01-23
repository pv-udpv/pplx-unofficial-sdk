# SSE Streaming Client Guide

## Overview

The SSE (Server-Sent Events) streaming client provides real-time search results from Perplexity AI. Unlike the REST API which returns complete responses, the SSE client streams partial results as they're generated, enabling responsive user experiences.

## Features

- ✅ Real-time streaming search results
- ✅ Async generator API for easy consumption
- ✅ Automatic event parsing and JSON deserialization
- ✅ Stream reconnection support
- ✅ Configurable search parameters (mode, focus, model)
- ✅ Error handling with typed exceptions
- ✅ Timeout controls
- ✅ Full TypeScript support

## Quick Start

### Basic Search

```typescript
import { createPplxClient } from '@pplx-unofficial/sdk';

const client = createPplxClient();

// Stream search results
for await (const entry of client.search('quantum computing')) {
  console.log('Status:', entry.status);
  console.log('Content:', entry.blocks);
  
  if (entry.final) {
    console.log('Search complete!');
    console.log('Backend UUID:', entry.backend_uuid);
    console.log('Thread UUID:', entry.context_uuid);
    break;
  }
}
```

### With Options

```typescript
for await (const entry of client.search('latest AI research', {
  focus: 'scholar',        // Search focus
  mode: 'detailed',        // Response mode
  model: 'experimental',   // Model preference
  language: 'en',          // Language
})) {
  console.log(entry.blocks);
  if (entry.final) break;
}
```

## API Reference

### PplxClient

Main SSE streaming client class.

#### Constructor

```typescript
new PplxClient(config?: PplxClientConfig)
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `https://www.perplexity.ai` | Base URL for API requests |
| `headers` | `Record<string, string>` | `{}` | Custom headers for all requests |
| `timeout` | `number` | `60000` | Request timeout in milliseconds |
| `logger` | `Logger` | Default console logger | Custom logger instance |

**Example:**

```typescript
const client = new PplxClient({
  baseUrl: 'https://www.perplexity.ai',
  headers: {
    'User-Agent': 'MyApp/1.0',
  },
  timeout: 120000, // 2 minutes
  logger: {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  },
});
```

#### search()

Stream search results from Perplexity AI.

```typescript
async *search(
  query: string,
  options?: SSEClientOptions
): AsyncGenerator<Entry>
```

**Parameters:**

- `query` (string): The search query
- `options` (SSEClientOptions, optional): Search configuration

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `mode` | `'concise' \| 'detailed' \| 'auto'` | Search mode |
| `focus` | `'internet' \| 'scholar' \| 'writing' \| 'wolfram' \| 'youtube' \| 'reddit' \| 'social' \| 'news'` | Search focus |
| `model` | `'default' \| 'turbo' \| 'experimental'` | Model preference |
| `sources` | `string[]` | Specific sources to use |
| `context_uuid` | `string` | Thread context for follow-up questions |
| `attachments` | `any[]` | File attachments |
| `language` | `string` | Response language |

**Returns:** AsyncGenerator yielding Entry objects

**Example:**

```typescript
// Basic search
for await (const entry of client.search('machine learning')) {
  console.log(entry.blocks);
  if (entry.final) break;
}

// Advanced search with options
for await (const entry of client.search('latest research', {
  focus: 'scholar',
  mode: 'detailed',
  model: 'experimental',
})) {
  if (entry.backend_uuid) {
    console.log('Entry UUID:', entry.backend_uuid);
  }
  if (entry.final) break;
}

// Follow-up question in same thread
const firstEntry = /* ... from previous search ... */;
for await (const entry of client.search('tell me more', {
  context_uuid: firstEntry.context_uuid,
})) {
  console.log(entry.blocks);
  if (entry.final) break;
}
```

#### reconnect()

Reconnect to an interrupted stream.

```typescript
async *reconnect(
  resumeEntryUuid: string,
  query: string,
  options?: SSEClientOptions
): AsyncGenerator<Entry>
```

**Parameters:**

- `resumeEntryUuid` (string): The entry UUID to resume from
- `query` (string): The original query
- `options` (SSEClientOptions, optional): Search configuration

**Returns:** AsyncGenerator yielding remaining Entry objects

**Example:**

```typescript
try {
  for await (const entry of client.search('complex query')) {
    console.log(entry.blocks);
    if (entry.final) break;
  }
} catch (error) {
  // Network error occurred
  const lastEntryUuid = /* ... saved entry UUID ... */;
  
  // Reconnect and continue
  for await (const entry of client.reconnect(lastEntryUuid, 'complex query')) {
    console.log('Resumed:', entry.blocks);
    if (entry.final) break;
  }
}
```

### Entry Type

Represents a single streaming entry from the search.

```typescript
interface Entry {
  uuid: string;              // Frontend UUID
  backend_uuid: string;      // Entry identifier for REST API
  context_uuid: string;      // Thread identifier
  query_str: string;         // The search query
  blocks: any[];            // Content blocks
  status: string;           // Stream status
  final: boolean;           // Whether this is the final entry
  sources_list?: any[];     // Source references
  mode?: string;            // Response mode
  role?: string;            // 'assistant' or 'user'
  text?: string;            // Plain text content
}
```

### Error Types

#### PplxError

Base error class for all Perplexity SDK errors.

```typescript
class PplxError extends Error {
  constructor(message: string)
}
```

#### PplxStreamError

Error specific to streaming operations.

```typescript
class PplxStreamError extends PplxError {
  constructor(message: string)
}
```

**Common causes:**
- Stream timeout
- Invalid response format
- Connection interrupted

#### PplxFetchError

HTTP request error.

```typescript
class PplxFetchError extends PplxError {
  constructor(message: string, statusCode?: number)
  statusCode?: number
}
```

**Common status codes:**
- `401`: Authentication required
- `429`: Rate limit exceeded
- `500`: Server error

### Usage Examples

#### Complete Conversation Flow

```typescript
import { createPplxClient, createRestClient } from '@pplx-unofficial/sdk';

const sseClient = createPplxClient();
const restClient = createRestClient();

// 1. Start streaming search
const entries: Entry[] = [];
for await (const entry of sseClient.search('explain quantum computing')) {
  entries.push(entry);
  console.log('Streaming:', entry.blocks);
  if (entry.final) break;
}

const finalEntry = entries[entries.length - 1];

// 2. Use REST API for additional operations
if (finalEntry.backend_uuid) {
  // Like the entry
  await restClient.likeEntry(finalEntry.backend_uuid);
  
  // Get related queries
  const related = await restClient.getRelatedQueries(finalEntry.backend_uuid);
  console.log('Related:', related);
  
  // Fork to new thread
  const fork = await restClient.forkEntry({
    backend_uuid: finalEntry.backend_uuid,
    title: 'Quantum Computing Deep Dive',
  });
  
  // Continue in forked thread
  for await (const entry of sseClient.search('more details', {
    context_uuid: fork.new_context_uuid,
  })) {
    console.log('Forked response:', entry.blocks);
    if (entry.final) break;
  }
}
```

#### Multi-Turn Conversation

```typescript
const client = createPplxClient();

// First question
let contextUuid: string | undefined;
for await (const entry of client.search('what is machine learning?')) {
  if (entry.context_uuid) contextUuid = entry.context_uuid;
  if (entry.final) break;
}

// Follow-up questions in same thread
const followUps = [
  'what are neural networks?',
  'explain backpropagation',
  'how does gradient descent work?',
];

for (const question of followUps) {
  for await (const entry of client.search(question, { 
    context_uuid: contextUuid 
  })) {
    console.log(entry.blocks);
    if (entry.final) break;
  }
}
```

#### Progress Tracking

```typescript
const client = createPplxClient();

for await (const entry of client.search('comprehensive research topic')) {
  // Track progress
  const progress = entry.final ? 100 : 50;
  console.log(`Progress: ${progress}%`);
  
  // Display partial results
  if (entry.blocks?.length > 0) {
    console.log('Partial answer:', entry.blocks);
  }
  
  // Display sources as they come in
  if (entry.sources_list?.length > 0) {
    console.log('Sources:', entry.sources_list.map(s => s.url));
  }
  
  if (entry.final) {
    console.log('Complete answer:', entry.blocks);
    break;
  }
}
```

#### Error Handling

```typescript
const client = createPplxClient({ timeout: 30000 });

try {
  for await (const entry of client.search('complex query')) {
    console.log(entry.blocks);
    if (entry.final) break;
  }
} catch (error) {
  if (error instanceof PplxStreamError) {
    console.error('Stream error:', error.message);
    // Handle stream-specific errors
  } else if (error instanceof PplxFetchError) {
    console.error('HTTP error:', error.statusCode, error.message);
    // Handle HTTP errors
  } else {
    console.error('Unexpected error:', error);
  }
}
```

#### Cancellation

```typescript
const client = createPplxClient({ timeout: 10000 }); // 10 second timeout

try {
  for await (const entry of client.search('long query')) {
    console.log(entry.blocks);
    if (entry.final) break;
  }
} catch (error) {
  if (error instanceof PplxStreamError && error.message.includes('timeout')) {
    console.log('Search cancelled due to timeout');
  } else {
    throw error;
  }
}
```

## Search Modes

### Concise Mode

Provides brief, focused answers.

```typescript
for await (const entry of client.search('what is AI?', {
  mode: 'concise',
})) {
  if (entry.final) break;
}
```

### Detailed Mode

Provides comprehensive, in-depth responses.

```typescript
for await (const entry of client.search('explain quantum mechanics', {
  mode: 'detailed',
})) {
  if (entry.final) break;
}
```

### Auto Mode (Default)

Automatically selects the appropriate mode based on the query.

```typescript
for await (const entry of client.search('some query', {
  mode: 'auto', // or omit for default
})) {
  if (entry.final) break;
}
```

## Search Focus

Control where Perplexity searches for information.

### Internet (Default)

General web search across all sources.

```typescript
client.search('current events', { focus: 'internet' })
```

### Scholar

Academic papers and research.

```typescript
client.search('quantum entanglement studies', { focus: 'scholar' })
```

### Writing

Content creation and writing assistance.

```typescript
client.search('write a blog post about AI', { focus: 'writing' })
```

### Wolfram

Computational and mathematical queries.

```typescript
client.search('solve x^2 + 5x + 6 = 0', { focus: 'wolfram' })
```

### YouTube

Video content from YouTube.

```typescript
client.search('how to train neural networks', { focus: 'youtube' })
```

### Reddit

Community discussions from Reddit.

```typescript
client.search('best ML frameworks', { focus: 'reddit' })
```

### Social

Social media content.

```typescript
client.search('trending AI news', { focus: 'social' })
```

### News

Latest news articles.

```typescript
client.search('AI regulations', { focus: 'news' })
```

## Integration Patterns

### With React

```typescript
import { useEffect, useState } from 'react';
import { createPplxClient } from '@pplx-unofficial/sdk';

function SearchComponent() {
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  async function handleSearch(query: string) {
    setLoading(true);
    setResults('');
    
    const client = createPplxClient();
    try {
      for await (const entry of client.search(query)) {
        // Update UI with partial results
        setResults(prev => prev + JSON.stringify(entry.blocks));
        if (entry.final) break;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {loading && <div>Searching...</div>}
      <div>{results}</div>
    </div>
  );
}
```

### With TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { createPplxClient } from '@pplx-unofficial/sdk';

function useStreamingSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const client = createPplxClient();
      const entries = [];
      
      for await (const entry of client.search(query)) {
        entries.push(entry);
        if (entry.final) break;
      }
      
      return entries;
    },
    enabled: !!query,
  });
}
```

### With Express.js

```typescript
import express from 'express';
import { createPplxClient } from '@pplx-unofficial/sdk';

const app = express();
const client = createPplxClient();

app.get('/api/search', async (req, res) => {
  const query = req.query.q as string;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    for await (const entry of client.search(query)) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
      if (entry.final) break;
    }
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## Best Practices

### 1. Always Handle Errors

```typescript
try {
  for await (const entry of client.search(query)) {
    // Process entry
    if (entry.final) break;
  }
} catch (error) {
  // Handle error appropriately
}
```

### 2. Check for Final Entry

Always check `entry.final` to know when the stream is complete.

```typescript
for await (const entry of client.search(query)) {
  processEntry(entry);
  if (entry.final) {
    // Stream complete
    break;
  }
}
```

### 3. Save Important IDs

Save UUIDs for later use with REST API.

```typescript
let backendUuid: string;
let contextUuid: string;

for await (const entry of client.search(query)) {
  if (entry.backend_uuid) backendUuid = entry.backend_uuid;
  if (entry.context_uuid) contextUuid = entry.context_uuid;
  if (entry.final) break;
}

// Use with REST API
await restClient.likeEntry(backendUuid);
```

### 4. Set Appropriate Timeouts

Adjust timeout based on expected response time.

```typescript
// Quick queries
const quickClient = createPplxClient({ timeout: 30000 }); // 30s

// Complex research
const researchClient = createPplxClient({ timeout: 120000 }); // 2min
```

### 5. Implement Retry Logic

```typescript
async function searchWithRetry(query: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const entries = [];
      for await (const entry of client.search(query)) {
        entries.push(entry);
        if (entry.final) break;
      }
      return entries;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Performance Considerations

### Memory Usage

Streaming entries incrementally reduces memory usage compared to buffering entire responses.

```typescript
// Memory-efficient: Process entries as they arrive
for await (const entry of client.search(query)) {
  processEntry(entry);
  if (entry.final) break;
}

// Memory-intensive: Collect all entries first
const allEntries = [];
for await (const entry of client.search(query)) {
  allEntries.push(entry);
  if (entry.final) break;
}
```

### Network Efficiency

SSE maintains a single persistent connection, reducing overhead compared to polling.

### Timeout Configuration

Balance responsiveness with reliability:

- **Short timeout (10-30s)**: Quick queries, fail fast
- **Medium timeout (30-60s)**: Standard queries (default)
- **Long timeout (60-120s)**: Complex research queries

## Troubleshooting

### Stream Never Completes

**Symptom:** Loop never receives `final: true` entry

**Solutions:**
- Check timeout settings
- Verify network connectivity
- Check server-side errors

```typescript
const client = createPplxClient({ 
  timeout: 60000,
  logger: console, // Enable logging
});
```

### Timeout Errors

**Symptom:** `PplxStreamError: Request timeout`

**Solutions:**
- Increase timeout
- Simplify query
- Check network latency

```typescript
const client = createPplxClient({ timeout: 120000 }); // 2 minutes
```

### Authentication Errors

**Symptom:** `PplxFetchError: HTTP 401`

**Solutions:**
- Provide authentication headers
- Verify session cookies

```typescript
const client = createPplxClient({
  headers: {
    'Cookie': 'your-session-cookie',
  },
});
```

### Parse Errors

**Symptom:** JSON parse errors in logs

**Solutions:**
- This is usually a server-side issue
- Enable logging to see raw data
- Report to Perplexity if persistent

## Migration from Stub

If you were using the previous stub implementation, update your code:

### Before (Stub)

```typescript
// Would throw "Not implemented - see Issue #1"
for await (const entry of client.search(query)) {
  // Never reached
}
```

### After (Full Implementation)

```typescript
// Now works!
for await (const entry of client.search(query)) {
  console.log(entry.blocks);
  if (entry.final) break;
}
```

## Related Documentation

- [REST API Guide](./REST-API-GUIDE.md) - For thread and entry management
- [Unified SDK Guide](./UNIFIED-SDK-GUIDE.md) - For combined SSE + REST usage
- [Connectors Guide](./CONNECTORS-GUIDE.md) - For OAuth integrations

## License

MIT License - See [LICENSE](../LICENSE) for details

---

**Version:** 1.0.0  
**Protocol:** 2.18  
**Last Updated:** 2026-01-23
