import test from 'node:test';
import assert from 'node:assert/strict';
import { DebugLogger, getDebugTraceLinks, formatMetricName, detectEnvironment } from '../dist/index.mjs';

const metadata = {
  dd_trace_id: '1234abcd',
  dd_request_id: { request_id: 'id"\\&x', datetime: '2026-09-22T00:00:00.000Z' },
};

test('debug links use observed metadata and exact twenty minute windows', () => {
  const links = getDebugTraceLinks(metadata);
  assert.equal(links.traceUrl, 'https://app.datadoghq.com/apm/trace/1234abcd');
  const url = new URL(links.logsUrl);
  assert.equal(url.searchParams.get('query'), '@request_id:"id\\"\\\\&x"');
  const timestamp = Date.parse(metadata.dd_request_id.datetime);
  assert.equal(Number(url.searchParams.get('from_ts')), timestamp - 1_200_000);
  assert.equal(Number(url.searchParams.get('to_ts')), timestamp + 1_200_000);
});

test('missing malformed metadata generates no trace IDs or links', () => {
  for (const input of [undefined, null, 'bad', {}, { dd_trace_id: '../secret', dd_request_id: { request_id: 'x', datetime: 'bad' } }]) {
    assert.deepEqual(getDebugTraceLinks(input), {});
  }
});

test('disabled logging never calls sink, enabled logger only passes allowlisted links', () => {
  const calls = [];
  const sink = { debug: (...args) => calls.push(args) };
  const entry = { query_str: 'private query', headers: { authorization: 'secret' }, debug_data: { ...metadata, secret: 'hidden' } };
  new DebugLogger(false, sink).logTrace(entry);
  assert.deepEqual(calls, []);
  new DebugLogger(true, sink).logTrace(entry);
  assert.deepEqual(calls, [['SSE debug metadata', getDebugTraceLinks(metadata)]]);
  assert.doesNotMatch(JSON.stringify(calls), /private query|authorization|secret|hidden/);
});

test('diagnostic sink failures do not break streaming', () => {
  assert.doesNotThrow(() => new DebugLogger(true, { debug() { throw new Error('sink unavailable'); } }).logTrace({ debug_data: metadata }));
});

test('metric helpers format known abbreviations and detect server environment', () => {
  assert.equal(formatMetricName('pipeline.llm_latency_ms'), 'LLM Latency ms');
  assert.equal(formatMetricName('mhe_time_ms'), 'MHE Time ms');
  assert.equal(formatMetricName(''), '');
  assert.equal(detectEnvironment(), 'production');
});

import { PplxClient } from '../dist/index.mjs';

function sseResponse(payloads) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const payload of payloads) controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      controller.close();
    },
  }), { headers: { 'content-type': 'text/event-stream' } });
}

async function collect(iterator) {
  const entries = [];
  for await (const entry of iterator) entries.push(entry);
  return entries;
}

test('real SSE metadata survives disabled logging and partial response updates', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const calls = [];
  globalThis.fetch = async () => sseResponse([
    { uuid: 'observed-entry', text: 'first', debug_data: metadata },
    { text: 'last', final: true },
  ]);
  const client = new PplxClient({ logger: { debug: (...args) => calls.push(args), info() {}, warn() {}, error() {} } });
  const entries = await collect(client.search('private query'));
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].debug_data, metadata);
  assert.deepEqual(entries[1].debug_data, metadata);
  assert.deepEqual(calls, []);
});

test('concurrent enabled and disabled requests isolate settings and sinks', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    await new Promise((resolve) => setTimeout(resolve, request.query === 'a' ? 10 : 0));
    return sseResponse([{ uuid: request.query, debug_data: { dd_trace_id: request.query === 'a' ? 'aaaa' : 'bbbb' }, final: true }]);
  };
  const a = []; const b = []; const disabled = [];
  const client = new PplxClient();
  const [first, second, third] = await Promise.all([
    collect(client.search('a', { debug: true, debugLogger: { debug: (...args) => a.push(args) } })),
    collect(client.search('b', { debug: true, debugLogger: { debug: (...args) => b.push(args) } })),
    collect(client.search('c', { debug: false, debugLogger: { debug: (...args) => disabled.push(args) } })),
  ]);
  assert.equal(first[0].debug_data.dd_trace_id, 'aaaa');
  assert.equal(second[0].debug_data.dd_trace_id, 'bbbb');
  assert.equal(third[0].debug_data.dd_trace_id, 'bbbb');
  assert.equal(a.length, 1); assert.match(a[0][1].traceUrl, /aaaa$/);
  assert.equal(b.length, 1); assert.match(b[0][1].traceUrl, /bbbb$/);
  assert.deepEqual(disabled, []);
  for (const request of requests) {
    assert.equal(Object.hasOwn(request, 'debugLogger'), false);
    assert.equal(Object.hasOwn(request, 'debug'), false);
  }
});

test('enabled request with no server debug metadata fabricates nothing', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => sseResponse([{ uuid: 'normal', text: 'answer', final: true }]);
  const calls = [];
  const entries = await collect(new PplxClient().search('query', { debug: true, debugLogger: { debug: (...args) => calls.push(args) } }));
  assert.equal(entries[0].debug_data, undefined);
  assert.deepEqual(calls, []);
});

test('reconnect and follow-up preserve metadata and use per-request logger', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => sseResponse([{ uuid: 'resumed', debug_data: metadata, final: true }]);
  const calls = [];
  const client = new PplxClient();
  const options = { debug: true, debugLogger: { debug: (...args) => calls.push(args) } };
  assert.deepEqual((await collect(client.reconnect('observed-backend', 'query', options)))[0].debug_data, metadata);
  assert.deepEqual((await collect(client.followUp('query', 'observed-context', options)))[0].debug_data, metadata);
  assert.equal(calls.length, 2);
});

test('debug uses the configured sink without logging content or credentials', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => sseResponse([{ text: 'private answer', query_str: 'private query', debug_data: metadata, final: true }]);
  const calls = [];
  const client = new PplxClient({
    headers: { authorization: 'Bearer private-token' },
    logger: { debug: (...args) => calls.push(args), info() {}, warn() {}, error() {} },
  });
  await collect(client.search('private query', { debug: true }));
  assert.equal(calls.length, 1);
  assert.doesNotMatch(JSON.stringify(calls), /private|Bearer/);
});

test('default debug sink is silent even when logging is enabled', (t) => {
  const original = console.debug;
  const calls = [];
  console.debug = (...args) => calls.push(args);
  t.after(() => { console.debug = original; });
  new DebugLogger(true).logTrace({ debug_data: metadata });
  assert.deepEqual(calls, []);
});
