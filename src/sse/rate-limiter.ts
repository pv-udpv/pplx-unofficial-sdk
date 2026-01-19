/**
 * Rate limiter for SSE reconnections
 * Implements time-window based limiting
 */

import type { RateLimitResult } from './types'

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  perMinute: number
  perHour: number
}

/**
 * Time-window rate limiter
 */
export class RateLimiter {
  private minuteCount = 0
  private hourCount = 0
  private minuteWindow = Math.floor(Date.now() / 60_000)
  private hourWindow = Math.floor(Date.now() / 3_600_000)

  constructor(
    private config: RateLimiterConfig = {
      perMinute: 20,
      perHour: 120,
    }
  ) {}

  /**
   * Check if request is allowed
   */
  check(): RateLimitResult {
    const now = Date.now()
    const currentMinute = Math.floor(now / 60_000)
    const currentHour = Math.floor(now / 3_600_000)

    // Reset counters on window change
    if (currentMinute !== this.minuteWindow) {
      this.minuteCount = 0
      this.minuteWindow = currentMinute
    }
    if (currentHour !== this.hourWindow) {
      this.hourCount = 0
      this.hourWindow = currentHour
    }

    // Check limits
    if (this.minuteCount >= this.config.perMinute) {
      const retryAfter = 60 - (now % 60_000) / 1000
      return { allowed: false, retryAfter }
    }

    if (this.hourCount >= this.config.perHour) {
      const retryAfter = 3600 - (now % 3_600_000) / 1000
      return { allowed: false, retryAfter }
    }

    // Increment counters
    this.minuteCount++
    this.hourCount++

    return { allowed: true }
  }

  /**
   * Reset all counters (for testing)
   */
  reset(): void {
    this.minuteCount = 0
    this.hourCount = 0
    this.minuteWindow = Math.floor(Date.now() / 60_000)
    this.hourWindow = Math.floor(Date.now() / 3_600_000)
  }

  /**
   * Get current usage
   */
  getUsage(): { minuteCount: number; hourCount: number } {
    return {
      minuteCount: this.minuteCount,
      hourCount: this.hourCount,
    }
  }
}

/**
 * Create rate-limited version of a function
 */
export function createRateLimited<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config?: RateLimiterConfig
): T {
  const limiter = new RateLimiter(config)

  return (async (...args: any[]) => {
    const result = limiter.check()
    if (!result.allowed) {
      throw new Error(
        `Rate limit exceeded. Retry after ${result.retryAfter?.toFixed(1)}s`
      )
    }
    return fn(...args)
  }) as T
}
