/**
 * Perplexity AI REST API Client (Placeholder)
 * TODO: Implement REST API endpoints for threads, entries, and collections
 */

export class PplxRestClient {
  constructor() {
    console.warn('REST API client not yet implemented');
  }

  // Placeholder methods
  async listThreads() {
    throw new Error('Not implemented');
  }

  async getThread(contextUuid: string) {
    throw new Error('Not implemented');
  }

  async likeEntry(backendUuid: string) {
    throw new Error('Not implemented');
  }
}

export function createRestClient(): PplxRestClient {
  return new PplxRestClient();
}
