/**
 * Unit Tests for PplxClient
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PplxClient } from './pplx-client';

describe('PplxClient', () => {
  let client: PplxClient;

  beforeEach(() => {
    client = new PplxClient({
      enableAutoReconnect: false,
      enableRateLimiting: true,
    });
  });

  afterEach(() => {
    client.close();
  });

  it('should create client instance', () => {
    expect(client).toBeDefined();
  });

  it('should get rate limit status', () => {
    const status = client.getRateLimitStatus();
    expect(status).toBeDefined();
    expect(status.allowed).toBe(true);
    expect(status.minuteRemaining).toBe(20);
    expect(status.hourRemaining).toBe(120);
  });

  it('should get stats', () => {
    const stats = client.getStats();
    expect(stats).toBeDefined();
    expect(stats.activeStreams).toBe(0);
    expect(stats.reconnectableStreams).toBe(0);
    expect(stats.abortedStreams).toBe(0);
    expect(stats.threads).toBe(0);
  });

  it('should subscribe to events', () => {
    let called = false;
    const unsubscribe = client.on('created', () => {
      called = true;
    });

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('should unsubscribe from events', () => {
    const handler = () => {};
    client.on('created', handler);
    client.off('created', handler);
    // Should not throw
  });
});
