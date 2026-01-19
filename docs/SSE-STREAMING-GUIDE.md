# SSE Streaming Client Guide

## Overview

The SSE (Server-Sent Events) streaming client provides real-time AI responses with incremental updates using JSON Patch (RFC 6902).

## Features

- **Async Iterator API** - Use `for await...of` syntax
- **JSON Patch** - Incremental block updates (RFC 6902)
- **Auto-Reconnection** - Resume interrupted streams
- **Rate Limiting** - 20 requests/minute, 120/hour
- **AbortController** - Cancellable streams
- **Type-Safe Events** - Subscribe to stream lifecycle
- **Error Handling** - Comprehensive error classes

## Installation

```typescript
import { createPplxClient } from '@pplx-unofficial/sdk';

// Or tree-shakeable import
import { createPplxClient } from '@pplx-unofficial/sdk/stream';
```

## Quick Start

```typescript
const client = createPplxClient();

for await (const entry of client.search('What is AI?')) {
  console.log('Blocks:', entry.blocks.length);
  if (entry.final) break;
}
```

## API Reference

### `createPplxClient(config?)`

Create SSE streaming client.

**Config Options:**
```typescript
interface PplxClientConfig {
  baseUrl?: string;           // Default: https://www.perplexity.ai
  headers?: Record<string, string>;
  rateLimitConfig?: {
    perMinute: number;        // Default: 20
    perHour: number;          // Default: 120
  };
  logger?: Logger;            // Custom logger
}
```

### `client.search(query, options?)`

Stream search results.

**Parameters:**
- `query: string` - Search query
- `options?: SearchOptions`

**Search Options:**
```typescript
interface SearchOptions {
  focus?: SearchFocus;        // 'internet' | 'academic' | 'writing' | 'wolfram' | 'youtube' | 'reddit'
  mode?: SearchMode;          // 'CONCISE' | 'COPILOT'
  model?: ModelPreference;    // 'turbo' | 'sonar' | 'experimental'
  sources?: string[];         // Connector IDs: ['google_drive', 'notion', ...]
  attachments?: string[];     // File attachment UUIDs
  signal?: AbortSignal;       // For cancellation
}
```

**Returns:** `AsyncGenerator<Entry>`

**Example:**
```typescript
for await (const entry of client.search('AI trends', {
  focus: 'academic',
  mode: 'COPILOT',
  model: 'sonar',
  sources: ['google_drive'],
})) {
  console.log(entry.status, entry.blocks.length);
  if (entry.final) break;
}
```

### `client.reconnect(entryUuid, cursor, signal?)`

Reconnect to interrupted stream.

**Parameters:**
- `entryUuid: string` - Backend UUID from previous entry
- `cursor: string` - Cursor from previous entry
- `signal?: AbortSignal`

**Example:**
```typescript
try {
  for await (const entry of client.search('query', { signal })) {
    lastEntry = entry;
    if (entry.final) break;
  }
} catch (error) {
  if (lastEntry?.reconnectable) {
    for await (const entry of client.reconnect(
      lastEntry.backend_uuid,
      lastEntry.cursor!,
      signal
    )) {
      if (entry.final) break;
    }
  }
}
```

### `client.on(event, handler)`

Subscribe to stream events.

**Events:**
- `created` - Stream started
- `progress` - New data received
- `completed` - Stream finished
- `error` - Error occurred
- `aborted` - Stream cancelled

**Example:**
```typescript
const unsubscribe = client.on('progress', ({ entry, isFirstMessage }) => {
  console.log('Blocks:', entry.blocks.length);
});

// Later: unsubscribe()
```

## Entry Structure

```typescript
interface Entry {
  uuid: string;                     // Entry UUID
  backend_uuid: string;             // Backend UUID (for reconnection)
  context_uuid: string;             // Thread UUID
  frontend_uuid: string;            // Frontend request UUID
  frontend_context_uuid: string;    // Frontend thread UUID
  query_str: string;                // Original query
  blocks: Block[];                  // Content blocks
  status: StreamStatus;             // 'PENDING' | 'COMPLETED' | 'FAILED'
  final: boolean;                   // Is final entry?
  cursor?: string;                  // For reconnection
  reconnectable: boolean;           // Can reconnect?
  sources_list?: Source[];          // Sources used
  search_focus?: SearchFocus;       // Focus used
  mode?: SearchMode;                // Mode used
  display_model?: ModelPreference;  // Model used
  social_info?: SocialInfo;         // Likes, views, forks
  collection_info?: CollectionInfo; // Collection/space info
}
```

## Block Types

```typescript
interface Block {
  uuid: string;
  type: string;     // 'text', 'code', 'list', etc.
  content: string;
  citations?: number[];  // Source indices
}
```

## JSON Patch Updates

The client automatically applies JSON Patch (RFC 6902) operations to incrementally update blocks:

```typescript
// Initial blocks
[{ type: 'text', content: 'Hello' }]

// After patch: { op: 'add', path: '/1', value: { type: 'text', content: 'World' } }
[{ type: 'text', content: 'Hello' }, { type: 'text', content: 'World' }]
```

## Rate Limiting

**Default Limits:**
- 20 requests per minute
- 120 requests per hour

**Handling Rate Limits:**
```typescript
try {
  for await (const entry of client.search(query)) {
    if (entry.final) break;
  }
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    console.log('Rate limited, retry after delay');
    await new Promise(r => setTimeout(r, 3000));
  }
}
```

## Error Handling

**Error Classes:**
- `PplxError` - Base error
- `PplxStreamError` - Stream-related errors
- `PplxFetchError` - HTTP errors

**Example:**
```typescript
import { PplxError, PplxStreamError, PplxFetchError } from '@pplx-unofficial/sdk';

try {
  for await (const entry of client.search(query)) {
    if (entry.final) break;
  }
} catch (error) {
  if (error instanceof PplxFetchError) {
    console.error(`HTTP ${error.status}:`, error.message);
  } else if (error instanceof PplxStreamError) {
    console.error('Stream error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Cancellation

Use `AbortController` to cancel streams:

```typescript
const controller = new AbortController();

// Start search
const searchPromise = (async () => {
  for await (const entry of client.search(query, {
    signal: controller.signal
  })) {
    if (entry.final) break;
  }
})();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  await searchPromise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Search cancelled');
  }
}
```

## React Integration

```typescript
import { useState, useEffect } from 'react';
import { createPplxClient, Entry } from '@pplx-unofficial/sdk';

const client = createPplxClient();

function SearchComponent() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  
  async function search(query: string) {
    setLoading(true);
    setEntries([]);
    
    try {
      for await (const entry of client.search(query)) {
        setEntries(prev => [...prev, entry]);
        if (entry.final) break;
      }
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div>
      <button onClick={() => search('AI')}>Search</button>
      {loading && <div>Loading...</div>}
      {entries.map(entry => (
        <div key={entry.uuid}>
          {entry.blocks.map(block => (
            <p key={block.uuid}>{block.content}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

1. **Always check `entry.final`** to detect completion
2. **Store `entry.cursor`** for reconnection
3. **Handle rate limits** gracefully with retries
4. **Use AbortController** for user cancellations
5. **Subscribe to events** for better UX feedback
6. **Clean up listeners** when component unmounts

## Troubleshooting

### Stream hangs
- Check network connectivity
- Verify rate limits not exceeded
- Ensure `entry.final` is checked

### Missing blocks
- JSON Patch applies incrementally
- Always use latest `entry.blocks`
- Don't cache partial results

### Rate limit errors
- Reduce request frequency
- Implement exponential backoff
- Custom rate limit config

## Protocol Details

**Version:** 2.18  
**Transport:** Server-Sent Events (SSE)  
**Update Method:** JSON Patch (RFC 6902)  
**Reconnection:** Cursor-based resume
