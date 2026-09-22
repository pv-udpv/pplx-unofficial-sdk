/**
 * Utility functions
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  return fn().catch((error) => {
    if (maxRetries <= 0) {
      throw error;
    }
    return sleep(delay).then(() => retry(fn, maxRetries - 1, delay * 2));
  });
}
