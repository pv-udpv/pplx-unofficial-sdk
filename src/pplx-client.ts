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
  /** Cancel this request, including body streaming. */
  signal?: AbortSignal;
  /** Resume cursor, when supplied by the server. */
  cursor?: string;
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

export type JsonPatchOperation =
  | { op: "add" | "replace" | "test"; path: string; value: any }
  | { op: "remove"; path: string }
  | { op: "move" | "copy"; path: string; from: string };
export interface DiffBlock { field: string; patches: JsonPatchOperation[]; }
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

/**
 * FetcherError — wraps low-level network / HTTP failures.
 * Carries an optional requestId for correlating server-side logs.
 */
export class FetcherError extends PplxError {
  constructor(
    message: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "FetcherError";
  }
}

/**
 * ApiClientsError — raised when the server returns a non-2xx HTTP status.
 * Cloudflare 403 challenges are detected and flagged via `isCloudflareBlock`.
 * Offline / network-unreachable errors are flagged via `isOffline`.
 */
export class ApiClientsError extends FetcherError {
  public readonly isCloudflareBlock: boolean;
  public readonly isOffline: boolean;

  constructor(
    message: string,
    public readonly statusCode: number,
    options?: { requestId?: string; isCloudflareBlock?: boolean; isOffline?: boolean }
  ) {
    super(message, options?.requestId);
    this.name = "ApiClientsError";
    this.isCloudflareBlock = options?.isCloudflareBlock ?? false;
    this.isOffline = options?.isOffline ?? false;
  }
}

/**
 * ParseError — raised when SSE event data cannot be parsed.
 * Carries the raw data string that failed to parse.
 */
export class ParseError extends FetcherError {
  constructor(
    message: string,
    public readonly rawData?: string,
    requestId?: string
  ) {
    super(message, requestId);
    this.name = "ParseError";
  }
}

/** @deprecated Use FetcherError / ApiClientsError instead */
export class PplxStreamError extends PplxError {
  constructor(message: string) {
    super(message);
    this.name = "PplxStreamError";
  }
}

/** @deprecated Use ApiClientsError instead */
export class PplxFetchError extends PplxError {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "PplxFetchError";
  }
}

// ============================================================================
// ERROR DETECTION HELPERS
// ============================================================================

function isOfflineError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("network request failed") ||
      msg.includes("networkerror")
    );
  }
  return false;
}

function buildApiClientsError(
  statusCode: number,
  statusText: string,
  body: string,
  requestId?: string
): ApiClientsError {
  // Cloudflare returns 403 with a distinctive challenge page
  const isCloudflareBlock =
    statusCode === 403 &&
    (body.includes("cloudflare") || body.includes("Cloudflare") || body.includes("cf-ray"));
  return new ApiClientsError(
    `HTTP ${statusCode}: ${statusText}`,
    statusCode,
    { requestId, isCloudflareBlock }
  );
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
  private buffer = "";
  private event: SSEEvent = {};

  *parse(chunk: string, final = false): Generator<SSEEvent> {
    this.buffer += chunk;
    while (true) {
      const end = this.buffer.search(/[\r\n]/);
      if (end < 0 || (!final && this.buffer[end] === "\r" && end === this.buffer.length - 1)) return;
      const line = this.buffer.slice(0, end);
      const width = this.buffer.slice(end, end + 2) === "\r\n" ? 2 : 1;
      this.buffer = this.buffer.slice(end + width);
      if (line === "") {
        const event = this.event;
        this.event = {};
        if (event.data !== undefined) yield event;
        continue;
      }
      if (line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      const field = colon < 0 ? line : line.slice(0, colon);
      const raw = colon < 0 ? "" : line.slice(colon + 1);
      const value = raw.startsWith(" ") ? raw.slice(1) : raw;
      if (field === "data") {
        this.event.data = this.event.data === undefined ? value : this.event.data + "\n" + value;
      } else if (field === "event") this.event.event = value;
    }
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
   * Use Web Crypto in browsers and the Node crypto module on older Node runtimes.
   */
  private async generateUuid(): Promise<string> {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return (await import("node:crypto")).randomUUID();
  }

  async *search(query: string, options: SSEClientOptions = {}): AsyncGenerator<Entry> {
    const { signal, ...params } = options;
    yield* this.streamRequest("/rest/sse/perplexity_ask", {
      version: "2.18", source: "default", query, ...params,
      frontend_uuid: options.frontend_uuid || await this.generateUuid(),
    }, signal);
  }

  /** Continue an existing conversation using its context UUID. */
  async *followUp(query: string, contextUuid: string, options: SSEClientOptions = {}): AsyncGenerator<Entry> {
    yield* this.search(query, { ...options, context_uuid: contextUuid });
  }

  /** Resume a server entry; the second argument remains the original query. */
  async *reconnect(resumeEntryUuid: string, query: string, options: SSEClientOptions = {}): AsyncGenerator<Entry> {
    const { signal, ...params } = options;
    yield* this.streamRequest(`/rest/sse/perplexity_ask/reconnect/${encodeURIComponent(resumeEntryUuid)}`, {
      version: "2.18", source: "default", query, ...params, backend_uuid: resumeEntryUuid,
    }, signal);
  }

  private async *streamRequest(path: string, request: SSERequestParams, signal?: AbortSignal): AsyncGenerator<Entry> {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeout);
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      if (controller.signal.aborted) throw new DOMException("Request aborted", "AbortError");
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...this.headers },
          body: JSON.stringify(request), signal: controller.signal,
        });
      } catch (error) {
        if (isOfflineError(error)) throw new ApiClientsError("Network is offline or unreachable", 0, { isOffline: true });
        throw error;
      }
      const requestId = response.headers.get("x-request-id") ?? undefined;
      if (!response.ok) {
        throw buildApiClientsError(response.status, response.statusText, await response.text().catch(() => ""), requestId);
      }
      if (!response.body) throw new FetcherError("Response body is null", requestId);
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = new SSEParser();
      let current: Entry | undefined;
      while (true) {
        const { value, done } = await reader.read();
        for (const event of parser.parse(decoder.decode(value, { stream: !done }), done)) {
          if (!event.data) continue;
          if (event.data === "[DONE]") {
            if (current && !current.final) yield { ...structuredClone(current), final: true, status: StreamStatus.COMPLETED };
            return;
          }
          try {
            const data = JSON.parse(event.data);
            if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Expected an SSE entry object");
            if (event.event === "error" || data.status === "error") throw new FetcherError(data.message || "Stream error occurred", requestId);
            if (data.diff_block) {
              if (!current) throw new Error("Received diff_block before initial entry");
              const { field, patches } = data.diff_block as DiffBlock;
              if (typeof field !== "string" || !field) throw new Error("Invalid diff_block field");
              const parts = field.split(".");
              const pointer = "/" + parts.map(part => part.replace(/~/g, "~0").replace(/\//g, "~1")).join("/");
              const target = readPatchPath(current, pointerParts(pointer));
              current = applyJsonPatch(current, [{ op: "replace", path: pointer, value: applyJsonPatch(target, patches) }]);
            } else {
              const previous = current;
              current = {
                ...previous, ...data,
                uuid: data.uuid ?? data.frontend_uuid ?? previous?.uuid ?? "",
                backend_uuid: data.backend_uuid ?? previous?.backend_uuid ?? "",
                context_uuid: data.context_uuid ?? previous?.context_uuid ?? "",
                query_str: data.query_str ?? previous?.query_str ?? request.query,
                blocks: data.blocks ?? previous?.blocks ?? [],
                status: this.normalizeStatus(data.status ?? previous?.status),
                final: data.final ?? this.isCompletedStatus(data.status ?? previous?.status),
                sources_list: data.sources_list ?? data.sources ?? previous?.sources_list ?? [],
              };
            }
            yield structuredClone(current!);
            if (current!.final) return;
          } catch (error) {
            if (error instanceof PplxError) throw error;
            throw new ParseError(`SSE parse error: ${(error as Error).message}`, event.data, requestId);
          }
        }
        if (done) break;
      }
      if (current && !current.final) yield { ...structuredClone(current), final: true, status: StreamStatus.COMPLETED };
    } catch (error) {
      if (error instanceof PplxError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new FetcherError(timedOut ? `Request timeout after ${this.timeout}ms` : "Request aborted");
      }
      throw new FetcherError(`Stream error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abort);
      await reader?.cancel().catch(() => {});
      reader?.releaseLock();
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

/** Convenience wrapper using the same request shape and transport as search(). */
export function createSSEStream(request: SSERequest, config?: PplxClientConfig): AsyncGenerator<Entry> {
  const { query, ...options } = request;
  return createPplxClient(config).search(query, options);
}

function pointerParts(path: string): string[] {
  if (typeof path !== "string" || (path !== "" && !path.startsWith("/"))) throw new Error("Invalid JSON pointer");
  return path === "" ? [] : path.slice(1).split("/").map(part => {
    if (/~(?![01])/.test(part)) throw new Error("Invalid JSON pointer escape");
    const decoded = part.replace(/~1/g, "/").replace(/~0/g, "~");
    if (["__proto__", "prototype", "constructor"].includes(decoded)) throw new Error("Unsafe JSON pointer");
    return decoded;
  });
}

function arrayIndex(key: string, length: number, add = false): number {
  if (add && key === "-") return length;
  if (!/^(0|[1-9][0-9]*)$/.test(key)) throw new Error("Invalid array index");
  const index = Number(key);
  if (!Number.isSafeInteger(index) || index >= length + (add ? 1 : 0)) throw new Error("Array index out of bounds");
  return index;
}

function readPatchPath(document: any, parts: string[]): any {
  let value = document;
  for (const key of parts) {
    if (value === null || typeof value !== "object") throw new Error("JSON pointer parent does not exist");
    if (Array.isArray(value)) arrayIndex(key, value.length);
    if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error("JSON pointer does not exist");
    value = value[key];
  }
  return value;
}

function patchValue(document: any, parts: string[], op: "add" | "replace" | "remove", value?: any): any {
  if (!parts.length) return op === "remove" ? undefined : structuredClone(value);
  const parent = readPatchPath(document, parts.slice(0, -1));
  if (parent === null || typeof parent !== "object") throw new Error("Invalid JSON pointer parent");
  const key = parts[parts.length - 1];
  if (Array.isArray(parent)) {
    const index = arrayIndex(key, parent.length, op === "add");
    if (op === "add") parent.splice(index, 0, structuredClone(value));
    else if (op === "remove") parent.splice(index, 1);
    else parent[index] = structuredClone(value);
  } else {
    if (op !== "add" && !Object.prototype.hasOwnProperty.call(parent, key)) throw new Error("JSON pointer does not exist");
    if (op === "remove") delete parent[key];
    else parent[key] = structuredClone(value);
  }
  return document;
}

function jsonEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && jsonEqual(a[key], b[key]));
}

/** Apply RFC 6902 operations atomically to a clone; unsafe prototype paths are rejected. */
export function applyJsonPatch(document: any, patches: JsonPatchOperation[]): any {
  if (!Array.isArray(patches)) throw new Error("JSON patch must be an array");
  let result = structuredClone(document);
  for (const patch of patches) {
    const parts = pointerParts(patch.path);
    switch (patch.op) {
      case "add": case "replace":
        if (!Object.prototype.hasOwnProperty.call(patch, "value")) throw new Error("Missing patch value");
        result = patchValue(result, parts, patch.op, patch.value); break;
      case "remove": result = patchValue(result, parts, "remove"); break;
      case "test":
        if (!Object.prototype.hasOwnProperty.call(patch, "value") || !jsonEqual(readPatchPath(result, parts), patch.value)) throw new Error("JSON patch test failed");
        break;
      case "move": case "copy": {
        const from = pointerParts(patch.from);
        if (patch.op === "move" && parts.length > from.length && from.every((part, i) => parts[i] === part)) throw new Error("Cannot move a value into its child");
        const value = structuredClone(readPatchPath(result, from));
        if (patch.op === "move") result = patchValue(result, from, "remove");
        result = patchValue(result, parts, "add", value); break;
      }
      default: throw new Error("Unsupported JSON patch operation");
    }
  }
  return result;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default PplxClient;
