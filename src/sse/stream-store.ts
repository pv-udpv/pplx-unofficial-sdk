/**
 * Stream Store for SSE State Management
 * Manages active streams, history, and reconnectable streams
 */

import type { SSEEntry, StreamState } from './types';
import { MAX_ACTIVE_STREAMS, MAX_THREADS_HISTORY } from './types';

export class StreamStore {
  private state: StreamState;

  constructor() {
    this.state = {
      activeStreams: new Map(),
      reconnectableStreams: new Set(),
      abortedStreams: new Set(),
      threadHistory: new Map(),
    };
  }

  /**
   * Add or update an active stream
   */
  setActiveStream(uuid: string, entry: SSEEntry): void {
    this.state.activeStreams.set(uuid, entry);

    // Track reconnectable streams
    if (entry.reconnectable && !entry.final) {
      this.state.reconnectableStreams.add(uuid);
    } else {
      this.state.reconnectableStreams.delete(uuid);
    }

    // Update thread history
    this.addToThreadHistory(entry.context_uuid, entry);

    // Enforce max active streams limit
    if (this.state.activeStreams.size > MAX_ACTIVE_STREAMS) {
      const firstKey = this.state.activeStreams.keys().next().value;
      if (firstKey) {
        this.removeActiveStream(firstKey);
      }
    }
  }

  /**
   * Get an active stream by UUID
   */
  getActiveStream(uuid: string): SSEEntry | undefined {
    return this.state.activeStreams.get(uuid);
  }

  /**
   * Remove an active stream
   */
  removeActiveStream(uuid: string): void {
    this.state.activeStreams.delete(uuid);
    this.state.reconnectableStreams.delete(uuid);
  }

  /**
   * Check if a stream is active
   */
  isStreamActive(uuid: string): boolean {
    return this.state.activeStreams.has(uuid);
  }

  /**
   * Get all active stream UUIDs
   */
  getActiveStreamUuids(): string[] {
    return Array.from(this.state.activeStreams.keys());
  }

  /**
   * Mark a stream as aborted
   */
  abortStream(uuid: string): void {
    this.state.abortedStreams.add(uuid);
    this.removeActiveStream(uuid);
  }

  /**
   * Check if a stream is aborted
   */
  isStreamAborted(uuid: string): boolean {
    return this.state.abortedStreams.has(uuid);
  }

  /**
   * Get reconnectable streams that are not currently active
   */
  getReconnectableStreams(): SSEEntry[] {
    const reconnectable: SSEEntry[] = [];
    
    for (const uuid of this.state.reconnectableStreams) {
      if (!this.isStreamActive(uuid) && !this.isStreamAborted(uuid)) {
        const stream = this.state.activeStreams.get(uuid);
        if (stream) {
          reconnectable.push(stream);
        }
      }
    }
    
    return reconnectable;
  }

  /**
   * Add entry to thread history
   */
  private addToThreadHistory(contextUuid: string, entry: SSEEntry): void {
    let history = this.state.threadHistory.get(contextUuid);
    
    if (!history) {
      history = [];
      this.state.threadHistory.set(contextUuid, history);
    }
    
    history.push(entry);
    
    // Enforce max history limit
    if (history.length > MAX_THREADS_HISTORY) {
      history.shift();
    }
  }

  /**
   * Get thread history
   */
  getThreadHistory(contextUuid: string): SSEEntry[] {
    return this.state.threadHistory.get(contextUuid) ?? [];
  }

  /**
   * Get all thread UUIDs with history
   */
  getThreadUuids(): string[] {
    return Array.from(this.state.threadHistory.keys());
  }

  /**
   * Clear thread history
   */
  clearThreadHistory(contextUuid: string): void {
    this.state.threadHistory.delete(contextUuid);
  }

  /**
   * Get current state snapshot
   */
  getState(): Readonly<StreamState> {
    return {
      activeStreams: new Map(this.state.activeStreams),
      reconnectableStreams: new Set(this.state.reconnectableStreams),
      abortedStreams: new Set(this.state.abortedStreams),
      threadHistory: new Map(this.state.threadHistory),
    };
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.state.activeStreams.clear();
    this.state.reconnectableStreams.clear();
    this.state.abortedStreams.clear();
    this.state.threadHistory.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    activeStreams: number;
    reconnectableStreams: number;
    abortedStreams: number;
    threads: number;
  } {
    return {
      activeStreams: this.state.activeStreams.size,
      reconnectableStreams: this.state.reconnectableStreams.size,
      abortedStreams: this.state.abortedStreams.size,
      threads: this.state.threadHistory.size,
    };
  }
}
