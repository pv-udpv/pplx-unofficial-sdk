/**
 * Event Emitter for SSE Stream Events
 * Supports progress, completed, error, and aborted events
 */

import type { StreamEvent, StreamEventType } from './types';

export type EventHandler<T = StreamEvent> = (data: T) => void | Promise<void>;

export class EventEmitter {
  private handlers: Map<StreamEventType, Set<EventHandler>>;

  constructor() {
    this.handlers = new Map();
  }

  /**
   * Subscribe to stream events
   * @param event - Event type to listen for
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  on(event: StreamEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const handlers = this.handlers.get(event)!;
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   * @param event - Event type to listen for
   * @param handler - Callback function
   */
  once(event: StreamEventType, handler: EventHandler): void {
    const wrappedHandler: EventHandler = async (data) => {
      this.off(event, wrappedHandler);
      await handler(data);
    };
    this.on(event, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   * @param event - Event type
   * @param handler - Handler to remove
   */
  off(event: StreamEventType, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param event - Event type
   * @param data - Event data
   */
  async emit(event: StreamEventType, data: StreamEvent): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // Call all handlers
    const promises: Promise<void>[] = [];
    for (const handler of handlers) {
      try {
        const result = handler(data);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }

    // Wait for all async handlers
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  /**
   * Remove all event handlers
   */
  removeAllListeners(event?: StreamEventType): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get count of handlers for an event
   */
  listenerCount(event: StreamEventType): number {
    const handlers = this.handlers.get(event);
    return handlers ? handlers.size : 0;
  }

  /**
   * Get all event types that have listeners
   */
  eventNames(): StreamEventType[] {
    return Array.from(this.handlers.keys());
  }
}
