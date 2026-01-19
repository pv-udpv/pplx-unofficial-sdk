/**
 * Typed event emitter for stream lifecycle
 */

import type { StreamEvent, EventHandler } from './types'

/**
 * Event emitter with typed events
 */
export class EventEmitter {
  private handlers = new Map<StreamEvent['type'], Set<EventHandler>>()

  /**
   * Subscribe to event
   */
  on<T extends StreamEvent['type']>(
    event: T,
    handler: EventHandler<Extract<StreamEvent, { type: T }>>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler)

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler as EventHandler)
    }
  }

  /**
   * Emit event
   */
  emit<T extends StreamEvent['type']>(
    event: T,
    data: Extract<StreamEvent, { type: T }>
  ): void {
    const handlers = this.handlers.get(event)
    if (!handlers) return

    for (const handler of handlers) {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in ${event} handler:`, error)
      }
    }
  }

  /**
   * Remove all handlers for event
   */
  off(event: StreamEvent['type']): void {
    this.handlers.delete(event)
  }

  /**
   * Remove all handlers
   */
  removeAllListeners(): void {
    this.handlers.clear()
  }

  /**
   * Get listener count for event
   */
  listenerCount(event: StreamEvent['type']): number {
    return this.handlers.get(event)?.size ?? 0
  }
}
