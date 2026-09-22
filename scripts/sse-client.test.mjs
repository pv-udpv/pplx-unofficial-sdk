import assert from 'node:assert/strict';
import test from 'node:test';
import { PplxClient, applyJsonPatch, createSSEStream, StreamStatus, ParseError, ApiClientsError, FetcherError } from '../dist/pplx-client.mjs';

const encode = new TextEncoder();
function response(text, { step = 1, onCancel = () => {} } = {}) {
  const bytes = encode.encode(text);
  let position = 0;
  return new Response(new ReadableStream({
    pull(controller) {
      if (position === bytes.length) return controller.close();
      controller.enqueue(bytes.slice(position, position += step));
    },
    cancel: onCancel,
  }));
}
const frame = value => `data: ${JSON.stringify(value)}\n\n`;
const collect = async iterable => { const entries = []; for await (const entry of iterable) entries.push(entry); return entries; };

test('RFC6902 array insertion, append, removal, replace, move and copy preserve the input', () => {
  const original = { values: ['a', 'c'], obj: { x: 1 } };
  const result = applyJsonPatch(original, [
    { op: 'add', path: '/values/1', value: 'b' },
    { op: 'add', path: '/values/-', value: 'd' },
    { op: 'remove', path: '/values/0' },
    { op: 'replace', path: '/values/0', value: 'B' },
    { op: 'move', from: '/values/0', path: '/values/2' },
    { op: 'copy', from: '/obj', path: '/copy' },
    { op: 'replace', path: '/obj/x', value: 2 },
  ]);
  assert.deepEqual(result, { values: ['c', 'd', 'B'], obj: { x: 2 }, copy: { x: 1 } });
  assert.deepEqual(original, { values: ['a', 'c'], obj: { x: 1 } });
});

test('JSON pointers support escaping, empty keys, root operations and structural tests', () => {
  const original = { 'a/b': { '~': { '': 1 } } };
  assert.deepEqual(applyJsonPatch(original, [{ op: 'replace', path: '/a~1b/~0/', value: 2 }]), { 'a/b': { '~': { '': 2 } } });
  assert.deepEqual(applyJsonPatch({}, [{ op: 'replace', path: '', value: [1] }]), [1]);
  assert.equal(applyJsonPatch({}, [{ op: 'remove', path: '' }]), undefined);
  assert.deepEqual(applyJsonPatch({ a: 1, b: 2 }, [{ op: 'test', path: '', value: { b: 2, a: 1 } }]), { a: 1, b: 2 });
  assert.deepEqual(applyJsonPatch({ a: 1 }, [{ op: 'move', from: '/a', path: '/a' }]), { a: 1 });
});

test('invalid patches fail atomically and cannot traverse prototypes', () => {
  for (const patch of [
    { op: 'add', path: '/values/9', value: 1 },
    { op: 'remove', path: '/missing' },
    { op: 'replace', path: '/values/01', value: 1 },
    { op: 'replace', path: '/a~2b', value: 1 },
    { op: 'test', path: '/values', value: [] },
    { op: 'move', from: '/values', path: '/values/0' },
    { op: 'add', path: '/__proto__/polluted', value: true },
    { op: 'copy', from: '/constructor', path: '/x' },
  ]) {
    const original = { values: [1] };
    assert.throws(() => applyJsonPatch(original, [{ op: 'add', path: '/ok', value: 2 }, patch]));
    assert.deepEqual(original, { values: [1] });
  }
  assert.equal({}.polluted, undefined);
});

test('split UTF8/CRLF/multiline SSE, diffs, partial metadata and DONE yield stable snapshots', async t => {
  const text = ': keepalive\r\n' + 'data: {"uuid":"u",\r\ndata: "blocks":[{"text":"héllo"}]}\r\n\r\n' +
    frame({ diff_block: { field: 'blocks', patches: [{ op: 'replace', path: '/0/text', value: 'world' }] } }) +
    frame({ text: 'summary' }) + 'data:[DONE]\n\n';
  t.mock.method(globalThis, 'fetch', async () => response(text));
  const iterator = new PplxClient().search('q');
  const first = (await iterator.next()).value;
  first.blocks[0].text = 'consumer mutation';
  const second = (await iterator.next()).value;
  assert.equal(second.blocks[0].text, 'world');
  const rest = await collect(iterator);
  assert.equal(first.blocks[0].text, 'consumer mutation');
  assert.equal(second.uuid, 'u');
  assert.equal(rest[0].blocks[0].text, 'world');
  assert.equal(rest[0].text, 'summary');
  assert.equal(rest[1].final, true);
  assert.equal(rest[1].status, StreamStatus.COMPLETED);
});

test('followUp and reconnect retain modern POST routes, options and original query', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, method: options.method, body: JSON.parse(options.body) });
    return response(frame({ final: true }));
  });
  const client = new PplxClient({ baseUrl: 'https://example.test' });
  await collect(client.followUp('next', 'thread', { model: 'gpt52' }));
  await collect(client.reconnect('entry/uuid', 'original', { cursor: 'cursor', context_uuid: 'thread' }));
  assert.equal(requests[0].url, 'https://example.test/rest/sse/perplexity_ask');
  assert.equal(requests[0].body.context_uuid, 'thread');
  assert.equal(requests[0].body.model, 'gpt52');
  assert.equal(requests[1].url, 'https://example.test/rest/sse/perplexity_ask/reconnect/entry%2Fuuid');
  assert.equal(requests[1].body.backend_uuid, 'entry/uuid');
  assert.equal(requests[1].body.query, 'original');
  assert.equal(requests[1].body.cursor, 'cursor');
  assert.ok(requests.every(request => request.method === 'POST'));
});

test('reconnect uses the same diff parser and final metadata preserves blocks', async t => {
  t.mock.method(globalThis, 'fetch', async () => response(frame({ blocks: [1] }) + frame({ diff_block: { field: 'blocks', patches: [{ op: 'add', path: '/-', value: 2 }] } }) + frame({ final: true })));
  const entries = await collect(new PplxClient().reconnect('u', 'q'));
  assert.deepEqual(entries.map(entry => entry.blocks), [[1], [1, 2], [1, 2]]);
});

test('parse failures, leading diffs and server errors propagate typed errors', async t => {
  for (const [text, ErrorType] of [
    ['data: invalid\n\n', ParseError],
    [frame({ diff_block: { field: 'blocks', patches: [] } }), ParseError],
    [frame({ status: 'error', message: 'server failure' }), FetcherError],
    ['event: error\ndata: {"message":"server failure"}\n\n', FetcherError],
  ]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => response(text));
    await assert.rejects(collect(new PplxClient().search('q')), ErrorType);
    mock.mock.restore();
  }
});

test('HTTP errors preserve Cloudflare classification and request ID', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Cloudflare challenge', { status: 403, headers: { 'x-request-id': 'req' } }));
  await assert.rejects(collect(new PplxClient().search('q')), error => error instanceof ApiClientsError && error.statusCode === 403 && error.isCloudflareBlock && error.requestId === 'req');
});

test('early consumer return cancels body without aborting caller signal', async t => {
  let cancelled = false;
  t.mock.method(globalThis, 'fetch', async () => response(frame({ blocks: [] }) + frame({ text: 'later' }), { onCancel: () => { cancelled = true; } }));
  const controller = new AbortController();
  for await (const _entry of new PplxClient().search('q', { signal: controller.signal })) break;
  assert.equal(cancelled, true);
  assert.equal(controller.signal.aborted, false);
});

test('timeout covers stalled response body', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => new Response(new ReadableStream({ start(controller) {
    options.signal.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')), { once: true });
  } })));
  await assert.rejects(collect(new PplxClient({ timeout: 10 }).search('q')), /Request timeout after 10ms/);
});

test('convenience stream uses actual transport and EOF emits final copy', async t => {
  t.mock.method(globalThis, 'fetch', async () => response(frame({ blocks: [1], uuid: 'u' })));
  const entries = await collect(createSSEStream({ query: 'q' }));
  assert.equal(entries.length, 2);
  assert.equal(entries[0].final, false);
  assert.equal(entries[1].final, true);
  assert.notEqual(entries[0].blocks, entries[1].blocks);
});

test('CR-only framing flushes the final delimiter at EOF', async t => {
  t.mock.method(globalThis, 'fetch', async () => response('data:{"text":"last","final":true}\r\r'));
  const entries = await collect(new PplxClient().search('q'));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].text, 'last');
});

test('caller cancellation is distinguished from timeout', async t => {
  const caller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (_url, options) => new Response(new ReadableStream({ start(controller) {
    options.signal.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')), { once: true });
  } })));
  const request = collect(new PplxClient().search('q', { signal: caller.signal }));
  caller.abort();
  await assert.rejects(request, /Request aborted/);
});

test('offline errors retain ApiClientsError classification', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(collect(new PplxClient().search('q')), error => error instanceof ApiClientsError && error.isOffline);
});

test('request UUIDs use cryptographic randomness and preserve explicit IDs', async t => {
  const requests = [];
  t.mock.method(Math, 'random', () => { throw new Error('insecure randomness used'); });
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return response(frame({ final: true }));
  });
  await collect(new PplxClient().search('first'));
  await collect(new PplxClient().search('second'));
  await collect(new PplxClient().search('third', { frontend_uuid: 'caller-id' }));
  assert.match(requests[0].frontend_uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(requests[0].frontend_uuid, requests[1].frontend_uuid);
  assert.equal(requests[2].frontend_uuid, 'caller-id');
});
