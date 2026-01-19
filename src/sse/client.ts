/**
 * SSE Client for Perplexity AI Streaming API
 * Handles Server-Sent Events connection and parsing
 */

import { createParser, type EventSourceMessage } from 'eventsource-parser';
import type { 
  SSEEntry, 
  SSEClientConfig, 
  CreateStreamRequest,
  ReconnectOptions 
} from './types';

export interface SSEClientOptions extends SSEClientConfig {
  onMessage?: (entry: SSEEntry) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export class SSEClient {
  private config: Required<SSEClientConfig>;
  private controller?: AbortController;
  private closed = false;

  constructor(config: SSEClientConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl ?? 'https://www.perplexity.ai',
      version: config.version ?? '2.18',
      maxActiveStreams: config.maxActiveStreams ?? 50,
      maxThreadHistory: config.maxThreadHistory ?? 100,
      reconnectInterval: config.reconnectInterval ?? 1000,
      enableRateLimiting: config.enableRateLimiting ?? true,
      autoReconnect: config.autoReconnect ?? true,
    };
  }

  /**
   * Create a new SSE stream for a query
   */
  async createStream(
    request: CreateStreamRequest,
    options: SSEClientOptions = {}
  ): Promise<void> {
    this.controller = new AbortController();
    this.closed = false;

    const url = `${this.config.apiUrl}/rest/sse/perplexity_ask`;
    
    const body = JSON.stringify({
      query_str: request.query_str,
      params: {
        version: this.config.version,
        ...request.params,
      },
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body,
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await this.handleStream(response, options);
    } catch (error) {
      if (!this.closed) {
        options.onError?.(error as Error);
      }
    }
  }

  /**
   * Reconnect to an existing stream
   */
  async reconnectStream(
    reconnectOptions: ReconnectOptions,
    options: SSEClientOptions = {}
  ): Promise<void> {
    this.controller = new AbortController();
    this.closed = false;

    const url = `${this.config.apiUrl}/rest/sse/perplexity_ask/reconnect/${reconnectOptions.resumeEntryUuid}?cursor=${reconnectOptions.cursor}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await this.handleStream(response, options);
    } catch (error) {
      if (!this.closed) {
        options.onError?.(error as Error);
      }
    }
  }

  /**
   * Handle SSE stream response
   */
  private async handleStream(
    response: Response,
    options: SSEClientOptions
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    const parser = createParser({
      onEvent: (event: EventSourceMessage) => {
        try {
          const data = JSON.parse(event.data);
          options.onMessage?.(data as SSEEntry);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      },
      onError: (error) => {
        console.error('SSE parse error:', error);
      },
    });

    try {
      while (!this.closed) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        parser.feed(chunk);
      }
    } catch (error) {
      if (!this.closed) {
        throw error;
      }
    } finally {
      reader.releaseLock();
      options.onClose?.();
    }
  }

  /**
   * Close the SSE connection
   */
  close(): void {
    this.closed = true;
    if (this.controller) {
      this.controller.abort();
      this.controller = undefined;
    }
  }

  /**
   * Check if connection is closed
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<Required<SSEClientConfig>> {
    return { ...this.config };
  }
}
