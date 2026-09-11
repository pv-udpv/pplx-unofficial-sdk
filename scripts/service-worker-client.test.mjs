import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { PplxServiceWorkerClient, ServiceWorkerFetchError } from '../dist/pplx-service-worker-client.mjs';

const chunks = [
  'https://cdn.example/AccountModal.JS?v=1',
  'https://cdn.example/_RESTRICTED/TranslationsModal.js',
  'https://cdn.example/TranslationsModal.js',
  'https://modal.example/plain.js?feature=translations#_restricted',
  '/assets/site.CSS',
].map((url, index) => ({ url, revision: `revision-${index}` }));
const serviceWorker = `precache(${JSON.stringify(chunks)})`;

test('category filters match case-insensitive paths and statistics count exclusive categories', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(serviceWorker));
  const client = new PplxServiceWorkerClient();
  assert.deepEqual(await client.getChunks({ modalsOnly: true }), chunks.slice(0, 3));
  assert.deepEqual(await client.getChunks({ restrictedOnly: true }), [chunks[1]]);
  assert.deepEqual(await client.getChunks({ translationsOnly: true }), chunks.slice(1, 3));
  assert.deepEqual(await client.getChunks({ restrictedOnly: true, modalsOnly: true }), [chunks[1]]);
  assert.deepEqual(await client.getChunks({ extension: '.JS' }), chunks.slice(0, 4));
  assert.deepEqual(await client.getStatistics(), {
    total: 5,
    byExtension: { js: 4, css: 1 },
    byCategory: { restricted: 1, translations: 1, modals: 1, other: 2 },
    totalSize: 'N/A',
  });
});

for (const [name, response] of [
  ['HTTP failure', () => new Response('unavailable', { status: 503 })],
  ['network failure', () => { throw new TypeError('network unavailable'); }],
  ['timeout', () => { throw new DOMException('timed out', 'AbortError'); }],
  ['unexpected 304', () => new Response(null, { status: 304 })],
]) {
  test(`forceRefresh rejects ${name} with a populated memory and disk cache`, async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'pplx-sw-refresh-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    await writeFile(join(dir, 'service-worker.js'), serviceWorker);
    await writeFile(join(dir, 'service-worker.metadata.json'), JSON.stringify({ etag: 'old-etag' }));
    const client = new PplxServiceWorkerClient({ cache: { enabled: true, dir, mode: 'auto' } });
    const mockedFetch = t.mock.method(globalThis, 'fetch', async (_url, options) => {
      assert.equal(options.headers['If-None-Match'], 'old-etag');
      return new Response(null, { status: 304 });
    });
    assert.equal((await client.getManifest()).totalChunks, chunks.length);
    mockedFetch.mock.mockImplementation(async (_url, options) => {
      assert.equal(options.headers['If-None-Match'], undefined);
      assert.equal(options.headers['If-Modified-Since'], undefined);
      return response();
    });
    await assert.rejects(client.getManifest({ forceRefresh: true }), ServiceWorkerFetchError);
    assert.equal(mockedFetch.mock.callCount(), 2);
    assert.equal(await readFile(join(dir, 'service-worker.js'), 'utf8'), serviceWorker);
  });
}
