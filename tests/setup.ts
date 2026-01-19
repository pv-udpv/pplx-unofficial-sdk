import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock handlers for Perplexity API
export const handlers = [
  http.post('https://www.perplexity.ai/rest/sse/perplexity_ask', () => {
    return new HttpResponse(
      'data: {"uuid":"test-uuid","status":"COMPLETED","final":true}\n\n',
      {
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }
    );
  }),
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());