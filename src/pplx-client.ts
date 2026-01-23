// ============================================================================
// Perplexity SSE Streaming Client
// Full implementation of Server-Sent Events streaming for Perplexity AI
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Stream Status Enum (from production stream manager)
export enum StreamStatus {
  STATUS_UNSPECIFIED = 0,
  PENDING = 1,
  COMPLETED = 2,
  FAILED = 3,
  STAGED = 4,
  REWRITING = 5,
  RESUMING = 6,
  BLOCKED = 7
}

// Search Model Enum (subset of models from production frontend bundles)
export enum SearchModel {
  // Primary models
  DEFAULT = "turbo",
  PPLX_PRO_UPGRADED = "pplx_pro_upgraded",
  PRO = "pplx_pro",
  SONAR = "experimental",
  GPT_4o = "gpt4o",
  GPT_4_1 = "gpt41",
  GPT_5_1 = "gpt51",
  GPT_5_2 = "gpt52",
  CLAUDE_2 = "claude2",
  GEMINI_2_5_PRO = "gemini25pro",
  GEMINI_3_0_PRO = "gemini30pro",
  GEMINI_3_0_FLASH = "gemini30flash",
  GEMINI_3_0_FLASH_HIGH = "gemini30flash_high",
  GROK = "grok",
  PPLX_REASONING = "pplx_reasoning",
  CLAUDE_3_7_SONNET_THINKING = "claude37sonnetthinking",
  O4_MINI = "o4mini",
  GPT_5_1_THINKING = "gpt51_thinking",
  GPT_5_2_THINKING = "gpt52_thinking",
  CLAUDE_4_0_OPUS = "claude40opus",
  CLAUDE_4_1_OPUS = "claude41opus",
  CLAUDE_4_5_OPUS = "claude45opus",
  CLAUDE_4_0_OPUS_THINKING = "claude40opusthinking",
  CLAUDE_4_1_OPUS_THINKING = "claude41opusthinking",
  CLAUDE_4_5_OPUS_THINKING = "claude45opusthinking",
  CLAUDE_4_5_SONNET = "claude45sonnet",
  CLAUDE_4_5_SONNET_THINKING = "claude45sonnetthinking",
  KIMI_K2_THINKING = "kimik2thinking",
  GROK_4 = "grok4",
  GROK_4_NON_THINKING = "grok4nonthinking",
  GROK_4_1_REASONING = "grok41reasoning",
  GROK_4_1_NON_REASONING = "grok41nonreasoning",
  PPLX_ALPHA = "pplx_alpha",
  PPLX_BETA = "pplx_beta",
  PPLX_STUDY = "pplx_study",
  PPLX_AGENTIC_RESEARCH = "pplx_agentic_research",
  // Additional models from enum 's'
  GPT_3_5_TURBO = "gpt35turbo",
  GPT_4 = "gpt4",
  GPT_4_TURBO = "gpt4turbo",
  CLAUDE_3_OPUS = "claude3opus",
  CLAUDE_3_SONNET = "claude3sonnet",
  CLAUDE_3_HAIKU = "claude3haiku",
  CLAUDE_3_5_SONNET = "claude35sonnet",
  CLAUDE_3_5_HAIKU = "claude35haiku",
  GEMINI_PRO = "geminipro",
  GEMINI_FLASH = "geminiflash",
  GEMINI_1_5_PRO = "gemini15pro",
  GEMINI_1_5_FLASH = "gemini15flash",
  LLAMA_3_1_8B = "llama318b",
  LLAMA_3_1_70B = "llama3170b",
  LLAMA_3_1_405B = "llama31405b",
  MISTRAL_7B = "mistral7b",
  MIXTRAL_8x7B = "mixtral8x7b",
  MIXTRAL_8x22B = "mixtral8x22b",
  DEEPSEEK_V2 = "deepseekv2",
  QWEN_2_72B = "qwen272b",
}

// Search Mode Enum (from production enum 't')
export enum SearchMode {
  SEARCH = "search",
  RESEARCH = "research",
  AGENTIC_RESEARCH = "agentic_research",
  STUDIO = "studio",
  STUDY = "study",
  BROWSER_AGENT = "browser_agent"
}

// Block Types (from stream analysis)
export enum BlockType {
  TEXT = "text",
  CODE = "code",
  IMAGE = "image",
  VIDEO = "video",
  CHART = "chart",
  TABLE = "table",
  QUOTE = "quote",
  LIST = "list"
}

export interface Block {
  type: BlockType;
  content: string;
  metadata?: Record<string, any>;
}

// Asset Types (from production)
export enum AssetType {
  CODE_ASSET = "code_asset",
  CHART = "chart",
  CODE_FILE = "code_file",
  APP = "app",
  GENERATED_IMAGE = "generated_image",
  GENERATED_VIDEO = "generated_video",
  PDF_FILE = "pdf_file",
  SLIDES = "slides",
  DOCX_FILE = "docx_file",
  XLSX_FILE = "xlsx_file",
  QUIZ = "quiz",
  FLASHCARDS = "flashcards",
  DOC_FILE = "doc_file"
}

export interface Asset {
  type: AssetType;
  url?: string;
  data?: any;
}

// UX Placement Enum
export enum UXPlacement {
  IN_THREAD = "IN_THREAD",
  SIDEBAR = "SIDEBAR",
  MODAL = "MODAL"
}

// Call To Action interface
export interface CallToAction {
  type: string;
  message: string;
  action?: string;
  url?: string;
}

// Recency Filter Type
export type RecencyFilter = "hour" | "day" | "week" | "month" | "year";

// Enhanced Entry interface matching production stream state
export interface Entry {
  // Core identifiers
  uuid: string;                    // frontend_uuid
  backend_uuid: string;
  context_uuid: string;            // thread_id
  
  // Query info
  query_str: string;
  thread_url_slug?: string;
  
  // Content
  blocks: Block[];                 // Rich content blocks
  status: StreamStatus | string;   // Support both enum and legacy string
  final: boolean;
  
  // Sources
  sources_list?: Source[];
  
  // Metadata
  mode?: SearchMode | string;      // Support both enum and legacy string
  model?: SearchModel | string;    // Support both enum and legacy string
  role?: "user" | "assistant";
  text?: string;                   // Plain text fallback
  
  // CTA & UI
  ctas?: CallToAction[];           // Upgrade prompts, etc.
  placement?: UXPlacement;         // IN_THREAD, SIDEBAR, MODAL
  
  // Assets
  assets?: Asset[];                // CODE_ASSET, CHART, GENERATED_IMAGE
  
  // Error handling
  error?: {
    message: string;
    code?: string;
  };
}

export type UserPermission = "read" | "write" | "admin";
export type SearchFocus = 
  | "internet" 
  | "scholar" 
  | "writing" 
  | "wolfram" 
  | "youtube" 
  | "reddit"
  | "social"
  | "news";
export type QuerySource = string;

export interface PplxClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  logger?: Logger;
}

export interface Logger {
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
  constructor(message: string) {
    super(message);
    this.name = "PplxError";
  }
}

export class PplxStreamError extends PplxError {
  constructor(message: string) {
    super(message);
    this.name = "PplxStreamError";
  }
}

export class PplxFetchError extends PplxError {
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