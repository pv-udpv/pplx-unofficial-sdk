/**
 * Perplexity AI SSE Streaming Client with Debug Mode Support
 */

// ============================================================================
// Debug Mode Types
// ============================================================================

/**
 * Debug metadata attached to SSE stream entries
 * Provides Datadog APM and logging integration
 */
export interface MessageDebugData {
  /** Datadog APM trace ID for distributed tracing */
  dd_trace_id?: string;
  /** Datadog request ID with timestamp for log correlation */
  dd_request_id?: {
    request_id: string;
    datetime: string; // ISO 8601 timestamp
  };
}

/**
 * Performance metric event from the streaming pipeline
 */
export interface PerformanceEvent {
  /** Metric name (e.g., "llm_latency_ms", "search_time_ms") */
  metricName: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Performance timer for collecting metrics
 */
export interface PerformanceTimer {
  /** Get all collected performance events */
  getEvents(): PerformanceEvent[];
}

// ============================================================================
// Core Types
// ============================================================================

/**
 * SSE stream entry with optional debug metadata
 */
export interface Entry {
  /** Unique identifier for this entry */
  uuid: string;
  /** Entry status (e.g., "STARTED", "STREAMING", "COMPLETED") */
  status: string;
  /** Content blocks in the entry */
  blocks?: any[];
  /** List of sources cited */
  sources_list?: any[];
  /** Whether this is the final entry in the stream */
  final?: boolean;
  /** Debug metadata (only present when debug mode is enabled) */
  debug_data?: MessageDebugData;
}

/**
 * Search options for SSE streaming
 */
export interface SearchOptions {
  /** Search focus mode (e.g., "internet", "academic", "writing") */
  focus?: string;
  /** AI model to use (e.g., "sonar-pro", "sonar") */
  model?: string;
  /** Recency filter (e.g., "day", "week", "month", "year") */
  recency?: string;
  /** Enable debug data collection and logging */
  debug?: boolean;
}

// ============================================================================
// Debug Logger
// ============================================================================

/**
 * Utility constants for metric name formatting
 */
const UPPERCASE_METRICS = ['llm', 'mhe'];
const LOWERCASE_METRICS = ['ms'];

/**
 * Format a metric name from snake_case to Title Case
 * @example formatMetricName("llm_latency_ms") // "LLM Latency ms"
 */
export function formatMetricName(name: string): string {
  return name.split('.').at(-1)?.split('_').map(part => {
    if (UPPERCASE_METRICS.includes(part)) return part.toUpperCase();
    if (LOWERCASE_METRICS.includes(part)) return part.toLowerCase();
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(' ') ?? name;
}

/**
 * Detect the current execution environment
 */
export function detectEnvironment(): 'production' | 'localhost' {
  if (typeof window === 'undefined') return 'production';
  
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }
  
  return 'production';
}

/**
 * Debug logger for SSE stream entries
 * Automatically logs Datadog APM and Logs URLs to console when enabled
 */
export class DebugLogger {
  constructor(private enabled: boolean) {}

  /**
   * Log debug trace information for an entry
   * Generates Datadog APM trace and log query URLs
   */
  logTrace(entry: Entry): void {
    if (!this.enabled || !entry.debug_data) return;
    
    console.group(`[DEBUG] Entry ${entry.uuid}`);
    
    if (entry.debug_data.dd_trace_id) {
      console.log('Datadog Trace:', 
        `https://app.datadoghq.com/apm/trace/${entry.debug_data.dd_trace_id}`);
    }
    
    if (entry.debug_data.dd_request_id) {
      const { request_id, datetime } = entry.debug_data.dd_request_id;
      const timestamp = new Date(datetime).getTime();
      const windowMs = 1000 * 60 * 20; // 20 minutes
      
      const logsUrl = new URL('https://app.datadoghq.com/logs');
      logsUrl.searchParams.set('query', `@request_id:"${request_id}"`);
      logsUrl.searchParams.set('from_ts', String(timestamp - windowMs));
      logsUrl.searchParams.set('to_ts', String(timestamp + windowMs));
      logsUrl.searchParams.set('live', 'false');
      
      console.log('Datadog Logs:', logsUrl.toString());
    }
    
    console.groupEnd();
  }
}

// ============================================================================
// Perplexity Client
// ============================================================================

/**
 * Perplexity AI SSE Streaming Client
 * 
 * @example
 * ```typescript
 * const client = createPplxClient();
 * 
 * // Enable debug mode
 * for await (const entry of client.search("quantum computing", { debug: true })) {
 *   // Automatically logs Datadog Trace/Logs URLs in console
 *   if (entry.final) break;
 * }
 * ```
 */
export class PplxClient {
  private debugLogger?: DebugLogger;

  /**
   * Search with SSE streaming
   * 
   * @param query - Search query string
   * @param options - Search options including debug mode
   * @yields Entry objects from the SSE stream
   */
  async *search(query: string, options: SearchOptions = {}): AsyncGenerator<Entry> {
    this.debugLogger = new DebugLogger(options.debug ?? false);
    
    // This is a placeholder implementation
    // In a real implementation, this would:
    // 1. Establish SSE connection to Perplexity API
    // 2. Parse SSE events into Entry objects
    // 3. Extract debug_data from SSE events when debug mode is enabled
    // 4. Yield entries as they arrive
    
    // For now, yield a mock entry to demonstrate the structure
    const mockEntry: Entry = {
      uuid: 'example-uuid',
      status: 'COMPLETED',
      blocks: [{ type: 'text', text: 'Mock response' }],
      sources_list: [],
      final: true,
      debug_data: options.debug ? {
        dd_trace_id: '1234567890abcdef',
        dd_request_id: {
          request_id: 'req-abc123',
          datetime: new Date().toISOString()
        }
      } : undefined
    };
    
    this.debugLogger.logTrace(mockEntry);
    yield mockEntry;
  }
}

/**
 * Create a new Perplexity client instance
 */
export function createPplxClient(): PplxClient {
  return new PplxClient();
}
