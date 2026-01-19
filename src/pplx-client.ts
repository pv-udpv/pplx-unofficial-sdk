/**
 * Main Perplexity AI Streaming Client
 * Integrates SSE client, rate limiting, state management, and auto-reconnection
 */

import { SSEClient, SSEClientOptions } from './sse/client';
import { RateLimiter } from './sse/rate-limiter';
import { StreamStore } from './sse/stream-store';
import { EventEmitter } from './sse/event-emitter';
import { ReconnectionManager } from './sse/reconnect';
import { mergeSSEEntry } from './sse/json-patch';
import type {
  SSEEntry,
  StreamParams,
  SSEClientConfig,
  StreamEvent,
  StreamEventType,
  SearchFocus,
} from './sse/types';
import { VERSION } from './sse/types';

export interface PplxClientConfig extends SSEClientConfig {
  enableAutoReconnect?: boolean;
  enableNetworkEvents?: boolean;
}

export interface SearchOptions {
  focus?: SearchFocus;
  model?: string;
  sources?: string[];
  attachments?: string[];
  personalized?: boolean;
}

export class PplxClient {
  private sseClient: SSEClient;
  private rateLimiter: RateLimiter;
  private streamStore: StreamStore;
  private eventEmitter: EventEmitter;
  private reconnectionManager: ReconnectionManager;
  private config: PplxClientConfig;
  private activeClients: Map<string, SSEClient>;

  constructor(config: PplxClientConfig = {}) {
    this.config = config;
    this.sseClient = new SSEClient(config);
    this.rateLimiter = new RateLimiter({
      minuteLimit: 20,
      hourLimit: 120,
    });
    this.streamStore = new StreamStore();
    this.eventEmitter = new EventEmitter();
    this.reconnectionManager = new ReconnectionManager(
      this.streamStore,
      this.rateLimiter,
      {
        intervalMs: config.reconnectInterval,
        maxActiveStreams: config.maxActiveStreams,
        enableNetworkEvents: config.enableNetworkEvents ?? false,
      }
    );
    this.activeClients = new Map();

    // Start auto-reconnection if enabled
    if (config.enableAutoReconnect ?? true) {
      this.reconnectionManager.start(async (options) => {
        await this.handleReconnect(options);
      });
    }
  }

  /**
   * Search with streaming response
   * Returns async generator that yields entries as they arrive
   */
  async *search(
    query: string,
    options: SearchOptions = {}
  ): AsyncGenerator<SSEEntry, void, unknown> {
    // Check rate limit
    const rateCheck = await this.rateLimiter.check();
    if (!rateCheck.allowed) {
      throw new Error(
        `Rate limit exceeded. Reset at ${new Date(rateCheck.resetTime!).toISOString()}`
      );
    }

    // Generate UUIDs
    const frontendUuid = this.generateUuid();
    const frontendContextUuid = this.generateUuid();

    // Prepare stream parameters
    const params: StreamParams = {
      version: VERSION,
      frontend_uuid: frontendUuid,
      frontend_context_uuid: frontendContextUuid,
      query_source: 'default_search',
      search_focus: options.focus ?? 'internet',
      display_model: options.model ?? 'sonar',
      sources: options.sources,
      attachments: options.attachments,
      personalized: options.personalized ?? false,
    };

    // Increment rate limiter
    this.rateLimiter.increment();

    // Create a promise-based queue for entries
    const queue: SSEEntry[] = [];
    let resolveNext: ((value: SSEEntry | null) => void) | null = null;
    let completed = false;
    let error: Error | null = null;

    // Create SSE client for this stream
    const client = new SSEClient(this.config);
    this.activeClients.set(frontendUuid, client);

    let accumulatedEntry: Partial<SSEEntry> = {};
    let isFirstMessage = true;

    const clientOptions: SSEClientOptions = {
      onMessage: (entry) => {
        // Merge with accumulated entry (applies JSON patches)
        accumulatedEntry = mergeSSEEntry(accumulatedEntry, entry);
        const mergedEntry = accumulatedEntry as SSEEntry;

        // Store in stream store
        this.streamStore.setActiveStream(mergedEntry.uuid, mergedEntry);

        // Emit events
        if (isFirstMessage) {
          this.eventEmitter.emit('created', {
            type: 'created',
            stream: mergedEntry,
            query,
            params,
          });
          isFirstMessage = false;
        }

        this.eventEmitter.emit('progress', {
          type: 'progress',
          stream: mergedEntry,
          isFirstMessage: false,
        });

        // Check if final
        if (mergedEntry.final) {
          this.eventEmitter.emit('completed', {
            type: 'completed',
            stream: mergedEntry,
          });
          completed = true;
          this.streamStore.removeActiveStream(mergedEntry.uuid);
        }

        // Add to queue
        queue.push(mergedEntry);
        if (resolveNext) {
          resolveNext(queue.shift()!);
          resolveNext = null;
        }
      },
      onError: (err) => {
        error = err;
        this.eventEmitter.emit('error', {
          type: 'error',
          stream: accumulatedEntry as SSEEntry,
          error: err,
        });
        if (resolveNext) {
          resolveNext(null);
          resolveNext = null;
        }
      },
      onClose: () => {
        completed = true;
        if (resolveNext) {
          resolveNext(null);
          resolveNext = null;
        }
      },
    };

    // Start stream
    const streamPromise = client.createStream(
      { query_str: query, params },
      clientOptions
    );

    try {
      // Yield entries as they arrive
      while (!completed && !error) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          // Wait for next entry
          const next = await new Promise<SSEEntry | null>((resolve) => {
            resolveNext = resolve;
          });
          
          if (next === null) {
            break;
          }
          
          yield next;
        }
      }

      if (error) {
        throw error;
      }
    } finally {
      client.close();
      this.activeClients.delete(frontendUuid);
    }
  }

  /**
   * Subscribe to stream events
   */
  on(event: StreamEventType, handler: (data: StreamEvent) => void): () => void {
    return this.eventEmitter.on(event, handler);
  }

  /**
   * Unsubscribe from stream events
   */
  off(event: StreamEventType, handler: (data: StreamEvent) => void): void {
    this.eventEmitter.off(event, handler);
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Get stream store statistics
   */
  getStats() {
    return this.streamStore.getStats();
  }

  /**
   * Handle reconnection
   */
  private async handleReconnect(options: {
    resumeEntryUuid: string;
    cursor: string;
  }): Promise<void> {
    const client = new SSEClient(this.config);
    
    let accumulatedEntry: Partial<SSEEntry> = {};

    await client.reconnectStream(options, {
      onMessage: (entry) => {
        accumulatedEntry = mergeSSEEntry(accumulatedEntry, entry);
        const mergedEntry = accumulatedEntry as SSEEntry;
        this.streamStore.setActiveStream(mergedEntry.uuid, mergedEntry);

        this.eventEmitter.emit('progress', {
          type: 'progress',
          stream: mergedEntry,
          isFirstMessage: false,
        });

        if (mergedEntry.final) {
          this.eventEmitter.emit('completed', {
            type: 'completed',
            stream: mergedEntry,
          });
          this.streamStore.removeActiveStream(mergedEntry.uuid);
          client.close();
        }
      },
      onError: (err) => {
        console.error('Reconnection error:', err);
        client.close();
      },
    });
  }

  /**
   * Generate UUID
   */
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Close all connections and cleanup
   */
  close(): void {
    this.reconnectionManager.stop();
    this.sseClient.close();
    
    for (const client of this.activeClients.values()) {
      client.close();
    }
    
    this.activeClients.clear();
    this.streamStore.clear();
  }
}

/**
 * Create a new Perplexity client instance
 */
export function createPplxClient(config?: PplxClientConfig): PplxClient {
  return new PplxClient(config);
}

// Export types
export type {
  SSEEntry,
  StreamParams,
  SearchFocus,
  StreamEvent,
  StreamEventType,
};
