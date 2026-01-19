/**
 * Rate Limiter for Perplexity AI API
 * Limits: 20 requests/minute, 120 requests/hour
 */

import type { RateLimitResponse } from './types';

export interface RateLimiterConfig {
  minuteLimit?: number;
  hourLimit?: number;
}

export class RateLimiter {
  private minuteLimit: number;
  private hourLimit: number;
  private minuteCount = 0;
  private hourCount = 0;
  private minuteWindow: number;
  private hourWindow: number;

  constructor(config: RateLimiterConfig = {}) {
    this.minuteLimit = config.minuteLimit ?? 20;
    this.hourLimit = config.hourLimit ?? 120;
    this.minuteWindow = Math.floor(Date.now() / 60000);
    this.hourWindow = Math.floor(Date.now() / 3600000);
  }

  /**
   * Check if a request is allowed under rate limits
   * @returns Rate limit status
   */
  async check(): Promise<RateLimitResponse> {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    const currentHour = Math.floor(now / 3600000);

    // Reset counters on window change
    if (currentMinute !== this.minuteWindow) {
      this.minuteCount = 0;
      this.minuteWindow = currentMinute;
    }
    if (currentHour !== this.hourWindow) {
      this.hourCount = 0;
      this.hourWindow = currentHour;
    }

    // Check limits
    const minuteRemaining = this.minuteLimit - this.minuteCount;
    const hourRemaining = this.hourLimit - this.hourCount;

    if (this.minuteCount >= this.minuteLimit) {
      return {
        allowed: false,
        minuteRemaining: 0,
        hourRemaining,
        resetTime: (this.minuteWindow + 1) * 60000,
      };
    }

    if (this.hourCount >= this.hourLimit) {
      return {
        allowed: false,
        minuteRemaining,
        hourRemaining: 0,
        resetTime: (this.hourWindow + 1) * 3600000,
      };
    }

    return {
      allowed: true,
      minuteRemaining: minuteRemaining - 1,
      hourRemaining: hourRemaining - 1,
    };
  }

  /**
   * Increment the rate limit counters (call after successful request)
   */
  increment(): void {
    this.minuteCount++;
    this.hourCount++;
  }

  /**
   * Get current rate limit status without incrementing
   */
  getStatus(): RateLimitResponse {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    const currentHour = Math.floor(now / 3600000);

    let minuteRemaining = this.minuteLimit - this.minuteCount;
    let hourRemaining = this.hourLimit - this.hourCount;

    // Check if windows need reset
    if (currentMinute !== this.minuteWindow) {
      minuteRemaining = this.minuteLimit;
    }
    if (currentHour !== this.hourWindow) {
      hourRemaining = this.hourLimit;
    }

    return {
      allowed: minuteRemaining > 0 && hourRemaining > 0,
      minuteRemaining,
      hourRemaining,
    };
  }

  /**
   * Reset all counters
   */
  reset(): void {
    this.minuteCount = 0;
    this.hourCount = 0;
    this.minuteWindow = Math.floor(Date.now() / 60000);
    this.hourWindow = Math.floor(Date.now() / 3600000);
  }
}
