/**
 * @pplx-unofficial/sdk
 * Unified TypeScript SDK for Perplexity AI
 * 
 * Features:
 * - SSE Streaming with JSON Patch support (RFC-6902)
 * - REST API for threads, entries, and collections (coming soon)
 * - OAuth Connectors for file integrations (coming soon)
 */

export { 
  PplxClient, 
  createPplxClient,
  type PplxClientConfig,
  type SearchOptions,
  type SSEEntry,
  type StreamParams,
  type SearchFocus,
  type StreamEvent,
  type StreamEventType,
} from './pplx-client';

export { 
  PplxRestClient, 
  createRestClient 
} from './pplx-rest-client';

export { 
  PplxConnectorsClient, 
  createConnectorsClient 
} from './pplx-connectors-client';

// SSE specific exports
export type {
  Block,
  Citation,
  StreamStatus,
  JsonPatchOp,
  DiffBlock,
  RateLimitResponse,
} from './sse/types';

export { RateLimiter } from './sse/rate-limiter';
export { EventEmitter } from './sse/event-emitter';
export { applyJsonPatch, applyBlockPatches, mergeSSEEntry } from './sse/json-patch';

/**
 * Create unified SDK with all clients
 */
import { createPplxClient, type PplxClientConfig as PplxConfig } from './pplx-client';
import { createRestClient } from './pplx-rest-client';
import { createConnectorsClient } from './pplx-connectors-client';

export function createPplxSDK(config?: PplxConfig) {
  const stream = createPplxClient(config);
  const rest = createRestClient();
  const connectors = createConnectorsClient();

  return {
    // Streaming
    stream,
    search: stream.search.bind(stream),
    on: stream.on.bind(stream),
    off: stream.off.bind(stream),
    
    // REST API
    rest,
    
    // Connectors
    connectors,
    
    // Utilities
    getRateLimitStatus: () => stream.getRateLimitStatus(),
    getStats: () => stream.getStats(),
    close: () => stream.close(),
  };
}

// Default export
export default createPplxSDK;
