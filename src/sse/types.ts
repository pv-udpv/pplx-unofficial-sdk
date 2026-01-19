/**
 * SSE Streaming Types for Perplexity AI Protocol 2.18
 * Based on reverse engineering of pplx-stream-D3-uFWQX.js
 */

// Protocol Constants
export const VERSION = "2.18";
export const MAX_ACTIVE_STREAMS = 50;
export const MAX_THREADS_HISTORY = 100;
export const RECONNECT_INTERVAL_MS = 1000;

// RFC-6902 JSON Patch Operations
export interface JsonPatchOp {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string; // JSON Pointer (RFC-6901)
  value?: any;
  from?: string; // For move/copy operations
}

// Diff Block for incremental updates
export interface DiffBlock {
  field: string; // Field to patch (e.g., "text", "citations")
  patches: JsonPatchOp[]; // RFC-6902 patches
}

// Citation structure
export interface Citation {
  url: string;
  title?: string;
  snippet?: string;
  index?: number;
}

// Content Block
export interface Block {
  intended_usage: string;
  diff_block?: DiffBlock;
  text?: string;
  citations?: Citation[];
  // Additional fields from actual API
  type?: string;
  data?: any;
}

// Stream status
export type StreamStatus = 
  | "PENDING" 
  | "RESUMING" 
  | "COMPLETED" 
  | "FAILED" 
  | "BLOCKED";

// Search focus types
export type SearchFocus = "internet" | "writing" | "academic" | "youtube" | "reddit";

// Query source
export type QuerySource = "default_search" | "retry" | "create-stream";

// SSE Entry (message from server)
export interface SSEEntry {
  uuid: string; // backend_uuid
  frontend_uuid: string; // client UUID
  context_uuid: string; // thread ID
  frontend_context_uuid: string;
  query_str: string;
  status: StreamStatus;
  blocks: Block[];
  sources?: { sources: string[] };
  sources_list?: string[];
  display_model: string;
  reconnectable: boolean;
  final: boolean;
  cursor?: string; // For resumption
  created_at?: string;
  updated_at?: string;
  // Additional fields
  gpt4_answer_status?: string;
  answer_status?: string;
  search_focus?: SearchFocus;
  backend_model?: string;
}

// Stream parameters for creating new queries
export interface StreamParams {
  version?: string;
  frontend_uuid?: string;
  frontend_context_uuid?: string;
  query_source?: QuerySource;
  search_focus?: SearchFocus;
  display_model?: string;
  sources?: string[];
  attachments?: string[];
  personalized?: boolean;
}

// Create stream request
export interface CreateStreamRequest {
  query_str: string;
  params: StreamParams;
}

// Stream event types
export type StreamEventType = 
  | "created"
  | "progress"
  | "completed"
  | "error"
  | "aborted";

// Stream event data
export interface StreamEvent {
  type: StreamEventType;
  stream: SSEEntry;
  thread?: any;
  message?: any;
  query?: string;
  params?: StreamParams;
  isFirstMessage?: boolean;
  error?: Error;
  messageStreamMeta?: any;
}

// Rate limit response
export interface RateLimitResponse {
  allowed: boolean;
  minuteRemaining?: number;
  hourRemaining?: number;
  resetTime?: number;
}

// Stream store state
export interface StreamState {
  activeStreams: Map<string, SSEEntry>;
  reconnectableStreams: Set<string>;
  abortedStreams: Set<string>;
  threadHistory: Map<string, SSEEntry[]>;
}

// SSE Client configuration
export interface SSEClientConfig {
  apiUrl?: string;
  version?: string;
  maxActiveStreams?: number;
  maxThreadHistory?: number;
  reconnectInterval?: number;
  enableRateLimiting?: boolean;
  autoReconnect?: boolean;
}

// Reconnect options
export interface ReconnectOptions {
  resumeEntryUuid: string;
  cursor: string;
}
