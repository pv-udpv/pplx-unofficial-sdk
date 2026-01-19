/**
 * Unit Tests for Rate Limiter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it('should allow requests under limit', async () => {
    const result = await limiter.check();
    expect(result.allowed).toBe(true);
    expect(result.minuteRemaining).toBe(19);
    expect(result.hourRemaining).toBe(119);
  });

  it('should increment counters', () => {
    limiter.increment();
    const status = limiter.getStatus();
    expect(status.minuteRemaining).toBe(19);
    expect(status.hourRemaining).toBe(119);
  });

  it('should block after minute limit', async () => {
    // Use up minute limit
    for (let i = 0; i < 20; i++) {
      await limiter.check();
      limiter.increment();
    }

    const result = await limiter.check();
    expect(result.allowed).toBe(false);
    expect(result.minuteRemaining).toBe(0);
  });

  it('should reset counters', () => {
    limiter.increment();
    limiter.increment();
    limiter.reset();
    
    const status = limiter.getStatus();
    expect(status.minuteRemaining).toBe(20);
    expect(status.hourRemaining).toBe(120);
  });

  it('should handle custom limits', async () => {
    const customLimiter = new RateLimiter({
      minuteLimit: 5,
      hourLimit: 10,
    });

    const result = await customLimiter.check();
    expect(result.allowed).toBe(true);
    
    customLimiter.increment();
    const status = customLimiter.getStatus();
    expect(status.minuteRemaining).toBe(4);
    expect(status.hourRemaining).toBe(9);
  });
});
