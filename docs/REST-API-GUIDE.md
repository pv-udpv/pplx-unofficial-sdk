# REST API Client Integration Guide

## Overview

Complete TypeScript client for Perplexity's internal REST API, supporting:
- Thread (conversation) management
- Entry (message) CRUD operations
- Collections (Spaces) management
- Social interactions (likes, forks)
- Pagination support

## Architecture

### API Surface

**Threads**: Conversations with multiple entries
**Entries**: Individual messages/responses in threads
**Collections**: Spaces for organizing threads

### Key Identifiers

- `context_uuid` - Thread identifier
- `backend_uuid` - Entry identifier  
- `slug` - URL-friendly thread identifier

## Endpoints

### Threads
```
GET    /rest/threads                          # List threads
GET    /rest/threads/{context_uuid}           # Get thread
GET    /rest/threads/by-slug/{slug}           # Get by slug
POST   /rest/threads                          # Create thread
PATCH  /rest/threads/{context_uuid}           # Update thread
DELETE /rest/threads/{context_uuid}           # Delete thread
```

### Entries
```
GET    /rest/entries/{backend_uuid}           # Get entry
GET    /rest/threads/{context_uuid}/entries   # List entries
PATCH  /rest/entries/{backend_uuid}           # Update entry
DELETE /rest/entries/{backend_uuid}           # Delete entry
POST   /rest/entries/{backend_uuid}/fork      # Fork entry
POST   /rest/entries/{backend_uuid}/like      # Like entry
DELETE /rest/entries/{backend_uuid}/like      # Unlike entry
GET    /rest/entries/{backend_uuid}/related   # Related queries
```

### Collections
```
GET    /rest/collections                      # List collections
GET    /rest/collections/{uuid}               # Get collection
POST   /rest/collections                      # Create collection
PATCH  /rest/collections/{uuid}               # Update collection
DELETE /rest/collections/{uuid}               # Delete collection
POST   /rest/collections/{uuid}/threads       # Add thread
DELETE /rest/collections/{uuid}/threads/{id}  # Remove thread
```

## Workflow Examples

### 1. Complete Search Flow

```typescript
// SSE search → Save to thread → Get full entry
const thread = await restClient.createThread({ title: "Research" });
const entries = [];

for await (const entry of sseClient.search("quantum computing")) {
  if (entry.backend_uuid) entries.push(entry);
  if (entry.final) break;
}

const fullEntry = await restClient.getEntry(entries[0].backend_uuid);
```

### 2. Collection Organization

```typescript
// Create space → Add threads → Organize
const collection = await restClient.createCollection({
  name: "AI Research",
  is_public: false
});

await restClient.addThreadToCollection(collection.uuid, threadUuid);
```

### 3. Social Interactions

```typescript
// Like, fork, get related
await restClient.likeEntry(entryUuid);
const fork = await restClient.forkEntry({ backend_uuid: entryUuid });
const related = await restClient.getRelatedQueries(entryUuid);
```

## Integration with TanStack Query

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { createRestClient } from './pplx-rest-client';

const client = createRestClient();

// Query hook
export function useThread(uuid: string) {
  return useQuery({
    queryKey: ['threads', 'detail', uuid],
    queryFn: () => client.getThread(uuid),
    staleTime: 60000,
  });
}

// Mutation hook
export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => client.createThread(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}
```

## Files Generated

1. **pplx-rest-client.ts** (432 LOC)
   - Full REST API client
   - Type-safe interfaces
   - Error handling

2. **rest-client-examples.ts** (200 LOC)
   - 5 comprehensive examples
   - Real-world workflows
   - Best practices

3. **article-queries-analysis.json**
   - Endpoint documentation
   - Hook definitions
   - Cache strategies

## Next Steps

1. ✅ REST API client complete
2. 🔄 Next: OAuth connector analysis (connectors-D_ieqnEI.js)
3. 🔄 Integration testing with real tokens
4. 🔄 Python SDK port