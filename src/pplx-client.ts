// ============================================================================
// Perplexity SSE Streaming Client
// NOTE: This is a stub. Full implementation tracked in Issue #1
// ============================================================================

// Type exports for REST client compatibility
export interface Entry {
  uuid: string;
  backend_uuid: string;
  context_uuid: string;
  query_str: string;
  blocks: any[];
  status: string;
  final: boolean;
  sources_list?: any[];
}

export type UserPermission = "read" | "write" | "admin";
export type StreamStatus = "STARTED" | "STREAMING" | "COMPLETED" | "ERROR";

// Client stub
export class PplxClient {
  constructor(config?: any) {
    console.warn("PplxClient: Full implementation pending (Issue #1)");
  }
  
  async *search(query: string, options?: any): AsyncGenerator<Entry> {
    throw new Error("Not implemented - see Issue #1");
  }
}

export function createPplxClient(config?: any): PplxClient {
  return new PplxClient(config);
}

// Stub exports for other types
export type SearchMode = string;
export type SearchFocus = string;
export type ModelPreference = string;
export type QuerySource = string;
export type JsonPatchOperation = any;
export type DiffBlock = any;
export type Source = any;
export type SocialInfo = any;
export type CollectionInfo = any;
export type PplxClientConfig = any;
export type Logger = any;
export type SSEClientOptions = any;
export type Thread = any;
export type Stream = any;
export type StreamEvents = any;
export type SSERequest = any;
export type SSERequestParams = any;

export function createSSEStream(): any { throw new Error("Not implemented"); }
export function applyJsonPatch(): any { throw new Error("Not implemented"); }

export class PplxError extends Error {}
export class PplxStreamError extends Error {}
export class PplxFetchError extends Error {}

export default PplxClient;