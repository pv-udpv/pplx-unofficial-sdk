// ============================================================================
// Perplexity SSE Streaming Client - Full Implementation
// Protocol Version: 2.18
// Reverse-engineered from pplx-stream-D3-uFWQX.js
// ============================================================================

// ============================================================================
// TYPES - SSE PROTOCOL
// ============================================================================

/** Entry status */
export type StreamStatus = "PENDING" | "STREAMING" | "COMPLETED" | "FAILED" | "BLOCKED" | "RESUMING";

/** User permission levels */
export type UserPermission = "read" | "write" | "admin" | "owner";

/** Search modes */
export type SearchMode = "CONCISE" | "COPILOT" | "DEFAULT";

/** Search focus (domain filters) */
export type SearchFocus = 
  | "internet" 
  | "writing" 
  | "wolfram" 
  | "youtube" 
  | "twitter" 
  | "reddit" 
  | "academic";

/** Model preferences */
export type ModelPreference = "turbo" | "experimental" | "default";

/** Query source tracking */
export type QuerySource = 
  | "default" 
  | "search" 
  | "retry" 
  | "follow_up" 
  | "related" 
  | "copilot";

/** JSON Patch operations (RFC 6902) */
export interface JsonPatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: any;
  from?: string;
}

/** Diff block for incremental updates */
export interface DiffBlock {
  field: string;
  patches: JsonPatchOperation[];
  intended_usage?: string;
}

/** Source citation */
export interface Source {
  uuid: string;
  url: string;
  title: string;
  snippet?: string;
  is_attachment?: boolean;
}

/** Social interaction info */
export interface SocialInfo {
  like_count: number;
  view_count: number;
  fork_count: number;
  user_likes: boolean;
}

/** Collection (Space) info */
export interface CollectionInfo {
  uuid: string;
  name: string;
  user_permission: UserPermission;
}

/** Entry (message) in a thread */
export interface Entry {
  // Identifiers
  uuid: string;
  backend_uuid: string;
  context_uuid: string;
  frontend_context_uuid: string;
  frontend_uuid: string;
  
  // Content
  query_str: string;
  blocks: any[];
  text?: string;
  
  // Metadata
  status: StreamStatus;
  final: boolean;
  reconnectable: boolean;
  
  // Search configuration
  search_focus: SearchFocus;
  search_recency_filter?: string;
  mode: SearchMode;
  display_model: ModelPreference;
  model_preference: ModelPreference;
  query_source: QuerySource;
  
  // Sources
  sources: { sources: string[] };
  sources_list?: Source[];
  num_sources_display?: number;
  
  // Attachments
  attachments: any[];
  attachment_processing_progress?: any;
  
  // Social
  social_info: SocialInfo;
  
  // Thread context
  collection_info?: CollectionInfo;
  thread_url_slug?: string;
  thread_title?: string;
  privacy_state?: "public" | "private" | "unlisted";
  thread_access?: number;
  
  // Timestamps
  updated_datetime: string;
  stream_created_at?: string;
  
  // Optional fields
  parent_info?: any;
  author_username?: string;
  author_image?: string;
  personalized: boolean;
  is_related_query_result: boolean;
  related_queries?: string[];
  media_items?: any[];
  widget_data?: any[];
  widget_intents?: any[];
  knowledge_cards?: any[];
  related_query_items?: any[];
  answer_modes?: any[];
  structured_answer_block_usages?: any[];
  is_nav_suggestions_disabled?: boolean;
  sidebyside_metadata?: any;
  connector_auth_info?: any;
  bookmark_state?: "BOOKMARKED" | "NOT_BOOKMARKED";
  cursor?: string;
  should_index?: boolean;
  plan?: any;
  reasoning_plan?: any;
  summary?: any;
  form?: any;
  expiry_time?: string;
  message_mode?: string;
}

/** Thread (conversation) */
export interface Thread {
  id: string;
  entry_ids: string[];
}

/** SSE Stream interface */
export interface Stream {
  id: { description: string };
  promise: Promise<void> | null;
  abortController: AbortController | null;
  threadId?: string;
  entryId?: string;
  extraEntryId?: string;
  isReconnect?: boolean;
  params?: SSERequestParams;
  placeholderChunk?: Entry;
  timer?: { start: number; latest: number };
}

/** SSE event types */
export type StreamEvents = {
  progress: { stream: Stream; thread: Thread; message: Entry; isFirstMessage: boolean };
  completed: { stream: Stream; thread: Thread; message?: Entry };
  error: { stream: Stream; thread: Thread; message?: Entry; error: Error };
  created: { stream: Stream; thread: Thread; message?: Entry; query: string; params: SSERequestParams };
  aborted: { stream: Stream; thread: Thread; message?: Entry };
};

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface SSERequestParams {
  // Query
  query_str: string;
  query_source?: QuerySource;
  
  // Context
  context_uuid?: string;
  frontend_context_uuid?: string;
  frontend_uuid?: string;
  
  // Reconnection
  resume_entry_uuid?: string;
  cursor?: string;
  
  // Configuration
  search_focus?: SearchFocus;
  search_recency_filter?: string;
  model_preference?: ModelPreference;
  mode?: SearchMode;
  
  // Sources
  sources?: string[]; // Connector IDs
  
  // Thread management
  fork?: boolean;
  existing_entry_uuid?: string;
  existing_uuid?: string;
  collections?: string[];
  
  // Metadata
  version?: string;
  is_related_query?: boolean;
  is_nav_suggestions_disabled?: boolean;
  is_copilot?: boolean;
  personalized?: boolean;
  
  // Attachments
  new_attachments?: any[];
  
  // Advanced
  first_result_frontend_context_uuid?: string;
  submit_from_article_override?: any;
  thread_metadata_title?: string;
  thread_metadata_thread_url_slug?: string;
  sidebyside_metadata?: any;
}

export interface SSERequest {
  path: string;
  params: SSERequestParams;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

export interface PplxClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  logger?: Logger;
}

export interface Logger {
  info(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  debug(...args: any[]): void;
}

export interface SSEClientOptions {
  perMinute?: number;
  perHour?: number;
}

// ============================================================================
// JSON PATCH UTILITIES (RFC 6902)
// ============================================================================

/**
 * Apply JSON Patch operations to an object
 */
export function applyJsonPatch(obj: any, patches: JsonPatchOperation[]): any {
  let result = JSON.parse(JSON.stringify(obj)); // Deep clone
  
  for (const patch of patches) {
    const pathParts = patch.path.split('/').filter(p => p !== '');
    
    switch (patch.op) {
      case 'add':
      case 'replace':
        setPath(result, pathParts, patch.value);
        break;
      case 'remove':
        deletePath(result, pathParts);
        break;
      case 'test':
        if (!testPath(result, pathParts, patch.value)) {
          throw new Error(`Test operation failed at ${patch.path}`);
        }
        break;
      default:
        console.warn(`Unsupported patch operation: ${patch.op}`);
    }
  }
  
  return result;
}

function setPath(obj: any, path: string[], value: any): void {
  if (path.length === 0) return;
  
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) {
      current[path[i]] = {};
    }
    current = current[path[i]];
  }
  current[path[path.length - 1]] = value;
}

function deletePath(obj: any, path: string[]): void {
  if (path.length === 0) return;
  
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) return;
    current = current[path[i]];
  }
  delete current[path[path.length - 1]];
}

function testPath(obj: any, path: string[], value: any): boolean {
  let current = obj;
  for (const part of path) {
    if (!current || !(part in current)) return false;
    current = current[part];
  }
  return JSON.stringify(current) === JSON.stringify(value);
}
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

export interface SSEClientOptions {
  mode?: SearchMode | string;
  focus?: SearchFocus;
  model?: SearchModel | string;
  sources?: string[];
  context_uuid?: string;
  backend_uuid?: string;
  frontend_uuid?: string;
  attachments?: any[];
  language?: string;
  recency?: RecencyFilter;         // Added: hour, day, week, month, year
}

export interface SSERequest {
  query: string;
  mode?: SearchMode | string;
  focus?: SearchFocus;
  model?: SearchModel | string;
  sources?: string[];
  context_uuid?: string;
  backend_uuid?: string;
  frontend_uuid?: string;
  attachments?: any[];
  source?: string;
  language?: string;
  recency?: RecencyFilter;         // Added: hour, day, week, month, year
}

export interface SSERequestParams extends SSERequest {
  version: string;
  source: string;
}

export type JsonPatchOperation = any;
export type DiffBlock = any;
export type Source = any;
export type SocialInfo = any;
export type CollectionInfo = any;
export type Thread = any;
export type Stream = any;
export type StreamEvents = any;

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class PplxError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PplxError';
  constructor(message: string) {
    super(message);
    this.name = "PplxError";
  }
}

export class PplxStreamError extends PplxError {
  constructor(
    message: string,
    public cause?: Error,
    details?: any
  ) {
    super(message, 'STREAM_ERROR', details);
    this.name = 'PplxStreamError';
  constructor(message: string) {
    super(message);
    this.name = "PplxStreamError";
  }
}

export class PplxFetchError extends PplxError {
  constructor(
    message: string,
    public status: number,
    details?: any
  ) {
    super(message, 'FETCH_ERROR', details);
    this.name = 'PplxFetchError';
  }
}

// ============================================================================
// SSE STREAMING CLIENT
// ============================================================================

const DEFAULT_BASE_URL = "https://www.perplexity.ai";
const PROTOCOL_VERSION = "2.18";
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "PplxFetchError";
  }
}

// ============================================================================
// SSE PARSER
// ============================================================================

interface SSEEvent {
  event?: string;
  data?: string;
  id?: string;
  retry?: number;
}

class SSEParser {
  private buffer: string = "";

  /**
   * Parse SSE chunk and yield events
   */
  *parse(chunk: string): Generator<SSEEvent> {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    
    // Keep the last incomplete line in buffer
    this.buffer = lines.pop() || "";

    let currentEvent: SSEEvent = {};

    for (const line of lines) {
      if (line.trim() === "") {
        // Empty line signals end of event
        if (Object.keys(currentEvent).length > 0) {
          yield currentEvent;
          currentEvent = {};
        }
        continue;
      }

      if (line.startsWith(":")) {
        // Comment line, ignore
        continue;
      }

      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) {
        continue;
      }

      const field = line.substring(0, colonIndex);
      let value = line.substring(colonIndex + 1);
      
      // Remove leading space if present
      if (value.startsWith(" ")) {
        value = value.substring(1);
      }

      switch (field) {
        case "event":
          currentEvent.event = value;
          break;
        case "data":
          // Join multiple data lines with a newline as required by the SSE spec
          currentEvent.data = currentEvent.data ? currentEvent.data + "\n" + value : value;
          break;
        case "id":
          currentEvent.id = value;
          break;
        case "retry":
          currentEvent.retry = parseInt(value, 10);
          break;
      }
    }
  }

  reset() {
    this.buffer = "";
  }
}

// ============================================================================
// PERPLEXITY SSE CLIENT
// ============================================================================

export class PplxClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private logger: Logger;
  
  constructor(config?: PplxClientConfig) {
    this.baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
    this.headers = {
      "Content-Type": "application/json",
      ...config?.headers,
    };
    this.logger = config?.logger || console;
  }
  
  /**
   * Search with SSE streaming
   */
  async *search(
    query: string,
    options?: {
      focus?: SearchFocus;
      model?: ModelPreference;
      mode?: SearchMode;
      sources?: string[];
      context_uuid?: string;
      personalized?: boolean;
    }
  ): AsyncGenerator<Entry, void, unknown> {
    const params: SSERequestParams = {
      query_str: query,
      version: PROTOCOL_VERSION,
      search_focus: options?.focus || "internet",
      model_preference: options?.model || "turbo",
      mode: options?.mode || "CONCISE",
      sources: options?.sources || [],
      context_uuid: options?.context_uuid,
      personalized: options?.personalized ?? false,
      query_source: "default",
    };
    
    yield* this.createSSEStream({
      path: "/rest/sse/perplexity/ask",
      params,
    });
  }
  
  /**
   * Continue conversation
   */
  async *followUp(
    query: string,
    context_uuid: string,
    options?: {
      focus?: SearchFocus;
      model?: ModelPreference;
      sources?: string[];
    }
  ): AsyncGenerator<Entry, void, unknown> {
    const params: SSERequestParams = {
      query_str: query,
      version: PROTOCOL_VERSION,
      context_uuid,
      search_focus: options?.focus || "internet",
      model_preference: options?.model || "turbo",
      sources: options?.sources || [],
      query_source: "follow_up",
    };
    
    yield* this.createSSEStream({
      path: "/rest/sse/perplexity/ask",
      params,
    });
  }
  
  /**
   * Reconnect to existing stream
   */
  async *reconnect(
    resume_entry_uuid: string,
    cursor: string,
    options?: {
      context_uuid?: string;
    }
  ): AsyncGenerator<Entry, void, unknown> {
    const params: SSERequestParams = {
      query_str: "", // Empty for reconnect
      version: PROTOCOL_VERSION,
      resume_entry_uuid,
      cursor,
      context_uuid: options?.context_uuid,
      query_source: "retry",
    };
    
    yield* this.createSSEStream({
      path: "/rest/sse/perplexity/ask/reconnect/resumeentryuuid",
      params,
    });
  }
  
  /**
   * Create SSE stream
   */
  async *createSSEStream(request: SSERequest): AsyncGenerator<Entry, void, unknown> {
    const abortController = new AbortController();
    const url = new URL(request.path, this.baseUrl);
    
    // Add query params
    for (const [key, value] of Object.entries(request.params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    }
    
    this.logger.info('Starting SSE stream:', { url: url.toString(), params: request.params });
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          ...this.headers,
          ...request.headers,
          'Accept': 'text/event-stream',
        },
        signal: request.signal || abortController.signal,
      });
      
      if (!response.ok) {
        throw new PplxFetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          { url: url.toString() }
        );
      }
      
      if (!response.body) {
        throw new PplxStreamError('Response body is null');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEntry: Entry | null = null;
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              if (currentEntry) {
                yield { ...currentEntry, final: true };
              }
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.diff_block) {
                // Incremental update
                if (currentEntry) {
                  currentEntry = this.applyDiffBlock(currentEntry, parsed.diff_block);
                  yield currentEntry;
                }
              } else {
                // Full entry
                currentEntry = this.normalizeEntry(parsed);
                yield currentEntry;
              }
            } catch (err) {
              this.logger.warn('Failed to parse SSE data:', err, data);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof PplxError) {
        throw error;
      }
      throw new PplxStreamError(
        'Stream failed',
        error as Error,
        { params: request.params }
      );
    } finally {
      abortController.abort();
    }
  }
  
  /**
   * Apply diff block to entry
   */
  private applyDiffBlock(entry: Entry, diffBlock: DiffBlock): Entry {
    try {
      const fieldPath = diffBlock.field.split('.');
      let target: any = entry;
      
      // Navigate to field
      for (let i = 0; i < fieldPath.length - 1; i++) {
        if (!target[fieldPath[i]]) {
          target[fieldPath[i]] = {};
        }
        target = target[fieldPath[i]];
      }
      
      const fieldName = fieldPath[fieldPath.length - 1];
      target[fieldName] = applyJsonPatch(target[fieldName] || {}, diffBlock.patches);
      
      return entry;
    } catch (err) {
      this.logger.error('Failed to apply diff block:', err, diffBlock);
      return entry;
    }
  }
  
  /**
   * Normalize entry from SSE response
   */
  private normalizeEntry(data: any): Entry {
    return {
      uuid: data.uuid || crypto.randomUUID(),
      backend_uuid: data.backend_uuid || data.uuid || crypto.randomUUID(),
      context_uuid: data.context_uuid || '',
      frontend_context_uuid: data.frontend_context_uuid || crypto.randomUUID(),
      frontend_uuid: data.frontend_uuid || crypto.randomUUID(),
      query_str: data.query_str || '',
      blocks: data.blocks || [],
      text: data.text,
      status: data.status || 'STREAMING',
      final: data.final || false,
      reconnectable: data.reconnectable ?? true,
      search_focus: data.search_focus || 'internet',
      search_recency_filter: data.search_recency_filter,
      mode: data.mode || 'CONCISE',
      display_model: data.display_model || 'turbo',
      model_preference: data.model_preference || 'turbo',
      query_source: data.query_source || 'default',
      sources: data.sources || { sources: [] },
      sources_list: data.sources_list,
      num_sources_display: data.num_sources_display,
      attachments: data.attachments || [],
      attachment_processing_progress: data.attachment_processing_progress,
      social_info: data.social_info || {
        like_count: 0,
        view_count: 0,
        fork_count: 0,
        user_likes: false,
      },
      collection_info: data.collection_info,
      thread_url_slug: data.thread_url_slug,
      thread_title: data.thread_title,
      privacy_state: data.privacy_state,
      thread_access: data.thread_access,
      updated_datetime: data.updated_datetime || new Date().toISOString(),
      stream_created_at: data.stream_created_at,
      parent_info: data.parent_info,
      author_username: data.author_username,
      author_image: data.author_image,
      personalized: data.personalized ?? false,
      is_related_query_result: data.is_related_query_result ?? false,
      related_queries: data.related_queries,
      media_items: data.media_items,
      widget_data: data.widget_data,
      widget_intents: data.widget_intents,
      knowledge_cards: data.knowledge_cards,
      related_query_items: data.related_query_items,
      answer_modes: data.answer_modes,
      structured_answer_block_usages: data.structured_answer_block_usages,
      is_nav_suggestions_disabled: data.is_nav_suggestions_disabled,
      sidebyside_metadata: data.sidebyside_metadata,
      connector_auth_info: data.connector_auth_info,
      bookmark_state: data.bookmark_state,
      cursor: data.cursor,
      should_index: data.should_index,
      plan: data.plan,
      reasoning_plan: data.reasoning_plan,
      summary: data.summary,
      form: data.form,
      expiry_time: data.expiry_time,
      message_mode: data.message_mode,
    };
  }
  private timeout: number;
  private logger: Logger;

  constructor(config?: PplxClientConfig) {
    this.baseUrl = config?.baseUrl || "https://www.perplexity.ai";
    this.headers = config?.headers || {};
    this.timeout = config?.timeout || 60000;
    this.logger = config?.logger || this.createDefaultLogger();
  }

  /**
   * Normalize status value to handle both numeric enum values and string representations
   */
  private normalizeStatus(status: any): StreamStatus | string {
    if (status === undefined || status === null) {
      return StreamStatus.PENDING;
    }

    // If it's already a valid StreamStatus enum value (numeric)
    if (typeof status === "number" && status in StreamStatus) {
      return status;
    }

    // Map common string representations to enum values
    const statusStr = String(status).toLowerCase();
    switch (statusStr) {
      case "pending":
        return StreamStatus.PENDING;
      case "completed":
        return StreamStatus.COMPLETED;
      case "failed":
        return StreamStatus.FAILED;
      case "staged":
        return StreamStatus.STAGED;
      case "rewriting":
        return StreamStatus.REWRITING;
      case "resuming":
        return StreamStatus.RESUMING;
      case "blocked":
        return StreamStatus.BLOCKED;
      default:
        // Return the original value for unknown strings (e.g., "streaming", "error")
        return status;
    }
  }

  /**
   * Check if status indicates completion
   */
  private isCompletedStatus(status: any): boolean {
    return status === StreamStatus.COMPLETED || 
           status === "completed" ||
           String(status).toLowerCase() === "completed";
  }

  private createDefaultLogger(): Logger {
    return {
      debug: () => {},
      info: () => {},
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };
  }

  /**
   * Generate a simple UUID v4
   */
  private generateUuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Stream search results from Perplexity AI
   * 
   * @param query - The search query
   * @param options - Optional search parameters
   * @yields Entry objects as they stream in
   */
  async *search(
    query: string,
    options?: SSEClientOptions
  ): AsyncGenerator<Entry> {
    const url = `${this.baseUrl}/sapi/platform`;
    
    const requestBody: SSERequestParams = {
      version: "2.18",
      source: "default",
      query: query,
      ...options,
      frontend_uuid: options?.frontend_uuid || this.generateUuid(),
    };

    this.logger.info("Starting SSE search", { query, url });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...this.headers,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new PplxFetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      if (!response.body) {
        throw new PplxStreamError("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      // Create a new parser instance for this search to avoid shared state
      const parser = new SSEParser();

      let done = false;
      let lastEntry: Entry | null = null;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          
          for (const event of parser.parse(chunk)) {
            if (event.data) {
              try {
                const data = JSON.parse(event.data);
                
                // Handle different event types
                if (data.status === "error") {
                  this.logger.error("Stream error", data);
                  throw new PplxStreamError(data.message || "Stream error occurred");
                }

                // Construct Entry object
                const entry: Entry = {
                  uuid: data.uuid || data.frontend_uuid || "",
                  backend_uuid: data.backend_uuid || "",
                  context_uuid: data.context_uuid || "",
                  query_str: data.query_str || query,
                  blocks: data.blocks || [],
                  status: this.normalizeStatus(data.status),
                  final: data.final || this.isCompletedStatus(data.status) || false,
                  sources_list: data.sources_list || data.sources || [],
                  mode: data.mode,
                  role: data.role,
                  text: data.text,
                  thread_url_slug: data.thread_url_slug,
                  model: data.model,
                  ctas: data.ctas,
                  placement: data.placement,
                  assets: data.assets,
                  error: data.error,
                };

                lastEntry = entry;
                yield entry;

                // Stop if this is the final entry
                if (entry.final) {
                  this.logger.info("Stream completed", { backend_uuid: entry.backend_uuid });
                  return;
                }
              } catch (parseError) {
                this.logger.warn("Failed to parse SSE event data", { 
                  error: parseError, 
                  data: event.data 
                });
              }
            }
          }
        }
      }

      // If stream ended without a final entry, yield a new final entry
      if (lastEntry && !lastEntry.final) {
        const finalEntry: Entry = {
          ...lastEntry,
          final: true,
          status: StreamStatus.COMPLETED,
        };
        yield finalEntry;
      }

      this.logger.info("Stream ended");
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === "AbortError") {
        throw new PplxStreamError(`Request timeout after ${this.timeout}ms`);
      }
      
      if (error instanceof PplxError) {
        throw error;
      }
      
      this.logger.error("Stream error", error);
      throw new PplxStreamError(`Stream error: ${error.message}`);
    }
  }

  /**
   * Reconnect to an existing stream
   * 
   * @param resumeEntryUuid - The entry UUID to resume from
   * @param query - The original query
   * @param options - Optional search parameters
   */
  async *reconnect(
    resumeEntryUuid: string,
    query: string,
    options?: SSEClientOptions
  ): AsyncGenerator<Entry> {
    const url = `${this.baseUrl}/sapi/platform/reconnect`;
    
    this.logger.info("Reconnecting to stream", { resumeEntryUuid, query });

    // Use similar logic to search() but with reconnect endpoint
    const requestBody: SSERequestParams = {
      version: "2.18",
      source: "default",
      query: query,
      ...options,
      backend_uuid: resumeEntryUuid,  // Resume from this entry
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...this.headers,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new PplxFetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      if (!response.body) {
        throw new PplxStreamError("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      // Create a new parser instance for this reconnect to avoid shared state
      const parser = new SSEParser();

      let done = false;
      let lastEntry: Entry | null = null;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          
          for (const event of parser.parse(chunk)) {
            if (event.data) {
              try {
                const data = JSON.parse(event.data);
                
                const entry: Entry = {
                  uuid: data.uuid || data.frontend_uuid || "",
                  backend_uuid: data.backend_uuid || "",
                  context_uuid: data.context_uuid || "",
                  query_str: data.query_str || query,
                  blocks: data.blocks || [],
                  status: this.normalizeStatus(data.status),
                  final: data.final || this.isCompletedStatus(data.status) || false,
                  sources_list: data.sources_list || data.sources || [],
                  mode: data.mode,
                  role: data.role,
                  text: data.text,
                  thread_url_slug: data.thread_url_slug,
                  model: data.model,
                  ctas: data.ctas,
                  placement: data.placement,
                  assets: data.assets,
                  error: data.error,
                };

                lastEntry = entry;
                yield entry;

                if (entry.final) {
                  return;
                }
              } catch (parseError) {
                this.logger.warn("Failed to parse reconnect event data", { 
                  error: parseError 
                });
              }
            }
          }
        }
      }

      // If stream ended without a final entry, yield a new final entry
      if (lastEntry && !lastEntry.final) {
        const finalEntry: Entry = {
          ...lastEntry,
          final: true,
          status: StreamStatus.COMPLETED,
        };
        yield finalEntry;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === "AbortError") {
        throw new PplxStreamError(`Reconnect timeout after ${this.timeout}ms`);
      }
      
      if (error instanceof PplxError) {
        throw error;
      }
      
      throw new PplxStreamError(`Reconnect error: ${error.message}`);
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createPplxClient(config?: PplxClientConfig): PplxClient {
  return new PplxClient(config);
}

// For backward compatibility with stubs
export function createSSEStream(request: SSERequest): AsyncGenerator<Entry, void, unknown> {
  const client = new PplxClient();
  return client.createSSEStream(request);
}

// Default export
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createSSEStream(): any {
  throw new Error("createSSEStream is deprecated - use PplxClient.search() instead");
}

export function applyJsonPatch(): any {
  throw new Error("applyJsonPatch is not implemented");
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default PplxClient;