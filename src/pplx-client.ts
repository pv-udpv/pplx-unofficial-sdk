// ============================================================================
// Perplexity SSE Streaming Client
// Full implementation of Server-Sent Events streaming for Perplexity AI
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Entry {
  uuid: string;
  backend_uuid: string;
  context_uuid: string;
  query_str: string;
  blocks: any[];
  status: string;
  final: boolean;
  sources_list?: any[];
  mode?: string;
  role?: string;
  text?: string;
}

export type UserPermission = "read" | "write" | "admin";
export type StreamStatus = "STARTED" | "STREAMING" | "COMPLETED" | "ERROR";
export type SearchMode = "concise" | "detailed" | "auto";
export type SearchFocus = 
  | "internet" 
  | "scholar" 
  | "writing" 
  | "wolfram" 
  | "youtube" 
  | "reddit"
  | "social"
  | "news";
export type ModelPreference = "default" | "turbo" | "experimental";
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
  mode?: SearchMode;
  focus?: SearchFocus;
  model?: ModelPreference;
  sources?: string[];
  context_uuid?: string;
  backend_uuid?: string;
  frontend_uuid?: string;
  attachments?: any[];
  language?: string;
}

export interface SSERequest {
  query: string;
  mode?: SearchMode;
  focus?: SearchFocus;
  model?: ModelPreference;
  sources?: string[];
  context_uuid?: string;
  backend_uuid?: string;
  frontend_uuid?: string;
  attachments?: any[];
  source?: string;
  language?: string;
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
    const url = `${this.baseUrl}/rest/sse/perplexity_ask`;
    
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
                  status: data.status || "streaming",
                  final: data.final || data.status === "completed" || false,
                  sources_list: data.sources_list || data.sources || [],
                  mode: data.mode,
                  role: data.role,
                  text: data.text,
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
          status: "completed",
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
    const url = `${this.baseUrl}/rest/sse/perplexity_ask/reconnect/${resumeEntryUuid}`;
    
    this.logger.info("Reconnecting to stream", { resumeEntryUuid, query });

    // Use similar logic to search() but with reconnect endpoint
    const requestBody: SSERequestParams = {
      version: "2.18",
      source: "default",
      query: query,
      ...options,
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
                  status: data.status || "streaming",
                  final: data.final || data.status === "completed" || false,
                  sources_list: data.sources_list || data.sources || [],
                  mode: data.mode,
                  role: data.role,
                  text: data.text,
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
          status: "completed",
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