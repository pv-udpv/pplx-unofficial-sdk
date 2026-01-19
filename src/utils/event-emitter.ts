// ============================================================================
// Type-Safe Event Emitter
// ============================================================================

export type EventHandler<T = any> = (data: T) => void;

/**
 * Simple type-safe event emitter
 */
export class EventEmitter<TEvents extends Record<string, any>> {
  private events: Map<keyof TEvents, Set<EventHandler>> = new Map();
  
  /**
   * Subscribe to event
   */
  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    const handlers = this.events.get(event)!;
    handlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    };
  }
  
  /**
   * Emit event
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const handlers = this.events.get(event);
    if (!handlers) return;
    
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${String(event)}:`, error);
      }
    }
  }
  
  /**
   * Remove all listeners for event
   */
  off<K extends keyof TEvents>(event: K): void {
    this.events.delete(event);
  }
  
  /**
   * Remove all listeners
   */
  clear(): void {
    this.events.clear();
  }
  
  /**
   * Get listener count for event
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.events.get(event)?.size ?? 0;
  }
}

/**
 * Create event emitter instance
 */
export function createEventEmitter<TEvents extends Record<string, any>>(): EventEmitter<TEvents> {
  return new EventEmitter<TEvents>();
}
