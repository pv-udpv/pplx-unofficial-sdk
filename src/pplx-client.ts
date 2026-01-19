// ============================================================================
// Perplexity SSE Streaming Client - Full Implementation
// Protocol Version: 2.18
// ============================================================================

import {
  applyPatch,
  JsonPatchOperation,
  deepClone,
} from "./utils/json-patch";
import { createRateLimiter, RateLimitConfig } from "./utils/rate-limiter";
import { createEventEmitter, EventEmitter } from "./utils/event-emitter";

// ============================================================================
// TYPES
// ============================================================================

export type StreamStatus = "PENDING" | "RESUMING" | "COMPLETED" | "FAILED" | "BLOCKED";
export type SearchMode = "CONCISE" | "COPILOT";
export type SearchFocus = "internet" | "academic" | "writing" | "wolfram" | "youtube" | "reddit";
export type ModelPreference = "turbo" | "sonar" | "experimental";
export type QuerySource = "default" | "search" | "retry" | "related_query";
export type UserPermission = "read" | "write" | "admin" | "owner";

export interface Entry {
  uuid: string;
  backend_uuid: string;
  context_uuid: string;
  frontend_uuid: string;
  frontend_context_uuid: string;
  query_str: string;
  blocks: Block[];
  status: StreamStatus;
  final: boolean;
  cursor?: string;
  reconnectable: boolean;
  sources_list?: Source[];
  search_focus?: SearchFocus;
  mode?: SearchMode;
  display_model?: ModelPreference;
  personalized?: boolean;
  attachments?: string[];
  social_info?: SocialInfo;
  collection_info?: CollectionInfo;
}

export interface Block {
  uuid: string;
  type: string;
  content: string;
  citations?: number[];
}

export interface Source {
  url: string;
  name: string;
  snippet?: string;
  favicon?: string;
}

export interface SocialInfo {
  like_count: number;
  view_count: number;
  fork_count: number;
  user_likes: boolean;
}

export interface CollectionInfo {
  uuid: string;
  name: string;
  user_permission: UserPermission;
}

export interface DiffBlock {
  field: string;
  patches: JsonPatchOperation[];
}

// SSE Request
export interface SSERequestParams {
  query_str: string;
  version: string; // "2.18"
  frontend_uuid: string;
  frontend_context_uuid?: string;
  query_source?: QuerySource;
  search_focus?: SearchFocus;
  mode?: SearchMode;
  display_model?: ModelPreference;
  attachments?: string[];
  sources?: string[]; // Connector IDs
  resume_entry_uuid?: string;
  cursor?: string;
}

export interface SSERequest {
  params: SSERequestParams;
  signal?: AbortSignal;
}

// SSE Events
export interface StreamEvents {
  created: { entry: Entry; query: string };
  progress: { entry: Entry; isFirstMessage: boolean };
  completed: { entry: Entry };
  error: { entry: Entry; error: Error };
  aborted: { entry: Entry };
}

// Configuration
export interface PplxClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  rateLimitConfig?: RateLimitConfig;
  logger?: Logger;
}

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PROTOCOL_VERSION = "2.18";
const DEFAULT_BASE_URL = "https://www.perplexity.ai";
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  perMinute: 20,
  perHour: 120,
};

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class PplxError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = "PplxError";
  }
}

export class PplxStreamError extends PplxError {
  constructor(message: string, details?: any) {
    super(message, "STREAM_ERROR", details);
    this.name = "PplxStreamError";
  }
}

export class PplxFetchError extends PplxError {
  constructor(message: string, public status: number, details?: any) {
    super(message, "FETCH_ERROR", details);
    this.name = "PplxFetchError";
  }
}

// ============================================================================
// SSE CLIENT
// ============================================================================

export class PplxClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private rateLimiter: ReturnType<typeof createRateLimiter>;
  private eventEmitter: EventEmitter<StreamEvents>;
  private logger: Logger;
  
  constructor(config?: PplxClientConfig) {
    this.baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
    this.headers = {
      "Content-Type": "application/json",
      ...config?.headers,
    };
    this.rateLimiter = createRateLimiter(
      config?.rateLimitConfig || DEFAULT_RATE_LIMIT
    );
    this.eventEmitter = createEventEmitter<StreamEvents>();
    this.logger = config?.logger || console;
  }
  
  /**
   * Subscribe to SSE events
   */
  on<K extends keyof StreamEvents>(
    event: K,
    handler: (data: StreamEvents[K]) => void
  ): () => void {
    return this.eventEmitter.on(event, handler);
  }
  
  /**
   * Search with SSE streaming
   */
  async *search(
    query: string,
    options?: {
      focus?: SearchFocus;
      mode?: SearchMode;
      model?: ModelPreference;
      sources?: string[];
      attachments?: string[];
      signal?: AbortSignal;
    }
  ): AsyncGenerator<Entry> {
    // Rate limit check
    const rateLimit = this.rateLimiter.check();
    if (!rateLimit.allowed) {
      throw new PplxError(
        `Rate limit exceeded: ${rateLimit.minuteCount}/min, ${rateLimit.hourCount}/hour`,
        "RATE_LIMIT_EXCEEDED"
      );
    }
    
    const params: SSERequestParams = {
      query_str: query,
      version: PROTOCOL_VERSION,
      frontend_uuid: crypto.randomUUID(),
      query_source: "default",
      search_focus: options?.focus || "internet",
      mode: options?.mode || "CONCISE",
      display_model: options?.model || "turbo",
      attachments: options?.attachments || [],
      sources: options?.sources || [],
    };
    
    yield* this.streamSSE(params, options?.signal);
  }
  
  /**
   * Reconnect to existing stream
   */
  async *reconnect(
    entryUuid: string,
    cursor: string,
    signal?: AbortSignal
  ): AsyncGenerator<Entry> {
    const params: SSERequestParams = {
      query_str: "", // Not needed for reconnect
      version: PROTOCOL_VERSION,
      frontend_uuid: crypto.randomUUID(),
      resume_entry_uuid: entryUuid,
      cursor,
    };
    
    yield* this.streamSSE(params, signal);
  }
  
  /**
   * Internal SSE streaming
   */
  private async *streamSSE(
    params: SSERequestParams,
    signal?: AbortSignal
  ): AsyncGenerator<Entry> {
    const url = params.resume_entry_uuid
      ? `${this.baseUrl}/rest/sse/perplexity/ask/reconnect/${params.resume_entry_uuid}?cursor=${params.cursor}`
      : `${this.baseUrl}/rest/sse/perplexity/ask`;
    
    const method = params.resume_entry_uuid ? "GET" : "POST";
    const body = params.resume_entry_uuid ? undefined : JSON.stringify(params);
    
    this.logger.info(`Starting SSE stream: ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: this.headers,
      body,
      signal,
    });
    
    if (!response.ok) {
      throw new PplxFetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }
    
    if (!response.body) {
      throw new PplxStreamError("No response body");
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let entry: Entry | null = null;
    let isFirstMessage = true;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          
          const data = line.slice(6);
          if (data === "[DONE]") {
            if (entry) {
              this.eventEmitter.emit("completed", { entry });
            }
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            
            // Initial entry
            if (!entry) {
              entry = this.createEntry(parsed, params);
              this.eventEmitter.emit("created", {
                entry,
                query: params.query_str,
              });
              yield entry;
              continue;
            }
            
            // Apply diff blocks
            if (parsed.diff_blocks) {
              entry = this.applyDiffBlocks(entry, parsed.diff_blocks);
            }
            
            // Update status
            if (parsed.status) {
              entry.status = parsed.status;
            }
            
            if (parsed.final !== undefined) {
              entry.final = parsed.final;
            }
            
            this.eventEmitter.emit("progress", { entry, isFirstMessage });
            isFirstMessage = false;
            
            yield entry;
            
            if (entry.final) {
              this.eventEmitter.emit("completed", { entry });
              return;
            }
          } catch (parseError) {
            this.logger.error("Failed to parse SSE data:", parseError);
          }
        }
      }
    } catch (error) {
      if (entry) {
        this.eventEmitter.emit("error", { entry, error: error as Error });
      }
      throw error;
    } finally {
      reader.releaseLock();
      
      if (signal?.aborted && entry) {
        this.eventEmitter.emit("aborted", { entry });
      }
    }
  }
  
  /**
   * Create initial entry from SSE data
   */
  private createEntry(data: any, params: SSERequestParams): Entry {
    return {
      uuid: data.uuid || crypto.randomUUID(),
      backend_uuid: data.backend_uuid || "",
      context_uuid: data.context_uuid || "",
      frontend_uuid: params.frontend_uuid,
      frontend_context_uuid: params.frontend_context_uuid || crypto.randomUUID(),
      query_str: params.query_str,
      blocks: data.blocks || [],
      status: data.status || "PENDING",
      final: data.final || false,
      cursor: data.cursor,
      reconnectable: data.reconnectable ?? true,
      sources_list: data.sources_list || [],
      search_focus: params.search_focus,
      mode: params.mode,
      display_model: params.display_model,
      personalized: data.personalized || false,
      attachments: params.attachments,
      social_info: data.social_info,
      collection_info: data.collection_info,
    };
  }
  
  /**
   * Apply diff blocks to entry
   */
  private applyDiffBlocks(entry: Entry, diffBlocks: DiffBlock[]): Entry {
    const updated = deepClone(entry);
    
    for (const diffBlock of diffBlocks) {
      if (diffBlock.field === "blocks" && diffBlock.patches) {
        const result = applyPatch(updated.blocks, diffBlock.patches);
        updated.blocks = result.newDocument;
      }
    }
    
    return updated;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createPplxClient(config?: PplxClientConfig): PplxClient {
  return new PplxClient(config);
}

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export { applyPatch as applyJsonPatch };
export type { JsonPatchOperation };

/**
 * Create SSE stream (alias for createPplxClient)
 */
export function createSSEStream(config?: PplxClientConfig): PplxClient {
  return createPplxClient(config);
}

export default PplxClient;
