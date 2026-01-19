// ============================================================================
// Time-Windowed Rate Limiter
// ============================================================================

export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
}

export interface RateLimitResult {
  allowed: boolean;
  minuteCount: number;
  hourCount: number;
}

/**
 * Time-windowed rate limiter
 * Tracks requests per minute and per hour windows
 */
export class RateLimiter {
  private minuteCount = 0;
  private hourCount = 0;
  private minuteWindow: number;
  private hourWindow: number;
  
  constructor(private config: RateLimitConfig) {
    const now = Date.now();
    this.minuteWindow = Math.floor(now / 60_000); // 1 minute
    this.hourWindow = Math.floor(now / 3_600_000); // 1 hour
  }
  
  /**
   * Check if request is allowed and update counters
   */
  check(): RateLimitResult {
    const now = Date.now();
    const currentMinuteWindow = Math.floor(now / 60_000);
    const currentHourWindow = Math.floor(now / 3_600_000);
    
    // Reset minute window if changed
    if (currentMinuteWindow !== this.minuteWindow) {
      this.minuteCount = 0;
      this.minuteWindow = currentMinuteWindow;
    }
    
    // Reset hour window if changed
    if (currentHourWindow !== this.hourWindow) {
      this.hourCount = 0;
      this.hourWindow = currentHourWindow;
    }
    
    // Check limits
    const minuteExceeded = this.minuteCount >= this.config.perMinute;
    const hourExceeded = this.hourCount >= this.config.perHour;
    
    const allowed = !minuteExceeded && !hourExceeded;
    
    if (allowed) {
      this.minuteCount++;
      this.hourCount++;
    }
    
    return {
      allowed,
      minuteCount: this.minuteCount,
      hourCount: this.hourCount,
    };
  }
  
  /**
   * Reset all counters
   */
  reset(): void {
    this.minuteCount = 0;
    this.hourCount = 0;
    this.minuteWindow = Math.floor(Date.now() / 60_000);
    this.hourWindow = Math.floor(Date.now() / 3_600_000);
  }
  
  /**
   * Get current status
   */
  getStatus(): RateLimitResult {
    const now = Date.now();
    const currentMinuteWindow = Math.floor(now / 60_000);
    const currentHourWindow = Math.floor(now / 3_600_000);
    
    const minuteCount = currentMinuteWindow === this.minuteWindow ? this.minuteCount : 0;
    const hourCount = currentHourWindow === this.hourWindow ? this.hourCount : 0;
    
    return {
      allowed: minuteCount < this.config.perMinute && hourCount < this.config.perHour,
      minuteCount,
      hourCount,
    };
  }
}

/**
 * Create rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}
