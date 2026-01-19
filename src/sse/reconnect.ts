/**
 * Auto-Reconnection Logic for SSE Streams
 * Handles periodic checks and network event-based reconnection
 */

import type { SSEEntry, ReconnectOptions } from './types';
import { RECONNECT_INTERVAL_MS, MAX_ACTIVE_STREAMS } from './types';
import { StreamStore } from './stream-store';
import { RateLimiter } from './rate-limiter';

export interface ReconnectionConfig {
  intervalMs?: number;
  maxActiveStreams?: number;
  enableNetworkEvents?: boolean;
}

export class ReconnectionManager {
  private intervalMs: number;
  private maxActiveStreams: number;
  private enableNetworkEvents: boolean;
  private intervalId?: NodeJS.Timeout;
  private streamStore: StreamStore;
  private rateLimiter: RateLimiter;
  private reconnectCallback?: (options: ReconnectOptions) => Promise<void>;
  private isReconnecting = false;

  constructor(
    streamStore: StreamStore,
    rateLimiter: RateLimiter,
    config: ReconnectionConfig = {}
  ) {
    this.streamStore = streamStore;
    this.rateLimiter = rateLimiter;
    this.intervalMs = config.intervalMs ?? RECONNECT_INTERVAL_MS;
    this.maxActiveStreams = config.maxActiveStreams ?? MAX_ACTIVE_STREAMS;
    this.enableNetworkEvents = config.enableNetworkEvents ?? false;
  }

  /**
   * Start auto-reconnection monitoring
   */
  start(reconnectCallback: (options: ReconnectOptions) => Promise<void>): void {
    this.reconnectCallback = reconnectCallback;

    // Periodic check
    this.intervalId = setInterval(() => {
      this.checkAndReconnect();
    }, this.intervalMs);

    // Network events (browser only)
    if (this.enableNetworkEvents && typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Stop auto-reconnection monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Remove network event listeners
    if (this.enableNetworkEvents && typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Check for reconnectable streams and attempt reconnection
   */
  private async checkAndReconnect(): Promise<void> {
    if (this.isReconnecting || !this.reconnectCallback) {
      return;
    }

    try {
      this.isReconnecting = true;

      const reconnectable = this.getReconnectableStreams();
      
      for (const stream of reconnectable) {
        // Check rate limit
        const rateLimit = await this.rateLimiter.check();
        if (!rateLimit.allowed) {
          break; // Stop trying if rate limited
        }

        // Attempt reconnection
        if (stream.cursor) {
          await this.reconnectCallback({
            resumeEntryUuid: stream.uuid,
            cursor: stream.cursor,
          });
          
          this.rateLimiter.increment();
        }
      }
    } catch (error) {
      console.error('Reconnection check failed:', error);
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Get streams that should be reconnected
   */
  private getReconnectableStreams(): SSEEntry[] {
    const activeUuids = this.streamStore.getActiveStreamUuids();
    
    // Don't reconnect if at max capacity
    if (activeUuids.length >= this.maxActiveStreams) {
      return [];
    }

    // Get all reconnectable streams
    const reconnectable = this.streamStore.getReconnectableStreams();

    // Filter by conditions
    return reconnectable.filter(stream => {
      return (
        stream.reconnectable === true &&
        !this.streamStore.isStreamActive(stream.uuid) &&
        !this.streamStore.isStreamAborted(stream.uuid) &&
        stream.cursor !== undefined
      );
    });
  }

  /**
   * Handle network online event
   */
  private handleOnline = (): void => {
    console.log('Network online - checking for reconnectable streams');
    this.checkAndReconnect();
  };

  /**
   * Handle network offline event
   */
  private handleOffline = (): void => {
    console.log('Network offline - pausing reconnection attempts');
  };

  /**
   * Force immediate reconnection check
   */
  async forceReconnect(): Promise<void> {
    await this.checkAndReconnect();
  }

  /**
   * Check if manager is currently reconnecting
   */
  isReconnectingNow(): boolean {
    return this.isReconnecting;
  }
}
