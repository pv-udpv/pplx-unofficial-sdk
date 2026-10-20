import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchIndexedFiles,
  byIdStrategy,
  byMetadataStrategy,
  legacyMetadataStrategy,
  defaultStrategies,
  runWorkspaceResearch,
  supabaseEmitter,
  uniqueSourcePaths,
} from '../dist/workspace-research.mjs';

const up = o => o;
const rec = (o, file_state = 'COMPLETE') => ({ file_state, ...o });
const A = rec({ file_id: 'id-A', filename: 'a', file_size: 10 });
const AF = rec({ file_id: 'id-A', filename: 'a', file_size: 10 }, 'FAILED');
const B = rec({ file_id: 'id-B', filename: 'a', file_size: 10 });
const N1 = rec({ filename: 'n', file_size: 5 });
const N2 = rec({ filename: 'n', file_size: 5 });

function run(uploads, listed, strategies = defaultStrategies, slotEvents = false) {
  const ev = [];
  const r = matchIndexedFiles(uploads, listed, { strategies, emit: e => ev.push(e), run_id: 't', slotEvents });
  return {
    r,
    ev,
    ends: ev.filter(e => e.type === 'strategy.end'),
    starts: ev.filter(e => e.type === 'strategy.start'),
  };
}

// --- id matching -----------------------------------------------------------

test('ids resolve despite identical metadata, upload order preserved', () => {
  const { r } = run([up({ file_id: 'id-A' }), up({ file_id: 'id-B' })], [B, A]);
  assert.equal(r.ready, true);
  assert.deepEqual(r.files, [A, B]);
  assert.deepEqual(r.matched_by, { id: 2 });
});

test('id absent from listing blocks readiness without fallback', () => {
  const { r } = run([up({ file_id: 'id-A', filename: 'a', file_size: 10 })], [rec({ file_id: 'id-old', filename: 'a', file_size: 10 })]);
  assert.equal(r.ready, false);
  assert.equal(r.unmatched, 1);
  assert.deepEqual(r.files, []);
});

test('mismatched filename still matches by id', () => {
  const { r } = run([up({ file_id: 'id-A', filename: 'renamed', file_size: 999 })], [A]);
  assert.equal(r.ready, true);
});

test('duplicate id in listing uses first record', () => {
  const { r } = run([up({ file_id: 'id-A' })], [AF, A]);
  assert.equal(r.failed, true);
  assert.deepEqual(r.files, [AF]);
});

test('two uploads with same id claim one record', () => {
  const { r } = run([up({ file_id: 'id-A' }), up({ file_id: 'id-A' })], [A]);
  assert.equal(r.unmatched, 1);
  assert.deepEqual(r.files, [A]);
});

test('same object listed twice counts once', () => {
  const { r, ev } = run([up({ file_id: 'id-A' }), up({ file_id: 'id-A' })], [A, A]);
  assert.equal(r.unmatched, 1);
  assert.equal(ev[0].deduped, 1);
});

// --- metadata fallback -----------------------------------------------------

test('id-less uploads fall back to metadata', () => {
  const { r } = run([up({ filename: 'n', file_size: 5 }), up({ filename: 'n', file_size: 5 })], [N1, N2]);
  assert.equal(r.ready, true);
  assert.deepEqual(r.matched_by, { metadata: 2 });
});

test('metadata fallback never consumes id-bearing records', () => {
  const { r } = run([up({ filename: 'a', file_size: 10 })], [A]);
  assert.equal(r.unmatched, 1);
});

test('null and empty file_id are treated as id-less', () => {
  const nullRec = rec({ file_id: null, filename: 'n', file_size: 5 });
  const { r: r1 } = run([up({ file_id: null, filename: 'n', file_size: 5 })], [nullRec]);
  assert.deepEqual(r1.files, [nullRec]);
  const { r: r2 } = run([up({ file_id: '', filename: 'n', file_size: 5 })], [N1]);
  assert.deepEqual(r2.files, [N1]);
});

test('numeric vs string sizes and NaN do not match', () => {
  assert.equal(run([up({ filename: 'n', file_size: '5' })], [N1]).r.unmatched, 1);
  assert.equal(run([up({ filename: 'n', file_size: NaN })], [rec({ filename: 'n', file_size: NaN })]).r.unmatched, 1);
});

test('empty uploads are not ready', () => {
  assert.equal(run([], [A]).r.ready, false);
});

test('null upload entry is unmatched', () => {
  const { r } = run([null, up({ file_id: 'id-A' })], [A]);
  assert.equal(r.unmatched, 1);
  assert.deepEqual(r.files, [A]);
});

// --- strategy chaining -----------------------------------------------------

test('early exit after first strategy resolves all', () => {
  const { r, ends } = run([up({ file_id: 'id-A' })], [A]);
  assert.equal(r.ready, true);
  assert.equal(ends.length, 1);
  assert.equal(ends[0].strategy, 'id');
});

test('empty strategy list emits only start and end', () => {
  const { r, ev, ends } = run([up({ file_id: 'id-A' })], [A], []);
  assert.equal(r.unmatched, 1);
  assert.equal(ends.length, 0);
  assert.equal(ev.length, 2);
});

test('repeated strategy sees empty pool on second pass', () => {
  const { r, ends, starts } = run([up({ file_id: 'id-A' }), up({ file_id: 'id-A' })], [A], [byIdStrategy, byIdStrategy]);
  assert.equal(r.unmatched, 1);
  assert.equal(ends[1].matched, 0);
  assert.equal(starts[1].pool, 0);
});

test('claimed record is removed from later strategy pool', () => {
  const { r, starts } = run([up({ file_id: 'id-A' }), up({ filename: 'a', file_size: 10 })], [A], [byIdStrategy, legacyMetadataStrategy]);
  assert.equal(r.files.length, 1);
  assert.equal(r.unmatched, 1);
  assert.equal(starts[1].pool, 0);
});

test('legacy strategy rescues stale-id upload by metadata', () => {
  const { r } = run([up({ file_id: 'id-gone', filename: 'a', file_size: 10 })], [A], [byIdStrategy, byMetadataStrategy, legacyMetadataStrategy]);
  assert.equal(r.ready, true);
  assert.deepEqual(r.matched_by, { 'legacy-metadata': 1 });
});

test('strategy order matters: legacy-first steals id record', () => {
  const { r } = run([up({ filename: 'a', file_size: 10 }), up({ file_id: 'id-A' })], [A], [legacyMetadataStrategy, byIdStrategy]);
  assert.equal(r.files[0], A);
  assert.equal(r.unmatched, 1);
  assert.equal(r.matched_by.id, undefined);
});

test('wrong slot count throws and emits strategy.error', () => {
  const bad = { name: 'bad', pool: i => i.all, run: () => [] };
  const ev = [];
  assert.throws(
    () => matchIndexedFiles([up({ file_id: 'id-A' })], [A], { strategies: [bad], emit: e => ev.push(e) }),
    /returned 0 slots/,
  );
  assert.ok(ev.some(e => e.type === 'strategy.error' && e.strategy === 'bad'));
});

test('strategy returning same record twice: second slot skipped', () => {
  const dup = { name: 'dup', pool: i => i.all, run: (p, pool) => p.map(u => (u ? pool[0] : undefined)) };
  const { r, ends } = run([up({}), up({})], [A], [dup]);
  assert.equal(r.files.length, 1);
  assert.equal(ends[0].skipped, 1);
});

test('mixed pools preserve upload order', () => {
  const { r } = run([up({ filename: 'n', file_size: 5 }), up({ file_id: 'id-B' })], [B, N1]);
  assert.equal(r.ready, true);
  assert.deepEqual(r.files, [N1, B]);
  assert.deepEqual(r.matched_by, { id: 1, metadata: 1 });
});

// --- events ----------------------------------------------------------------

test('slot events are off by default and on when enabled', () => {
  assert.ok(!run([up({ file_id: 'id-A' })], [A]).ev.some(e => e.type === 'strategy.slot'));
  const { ev } = run([up({ file_id: 'id-A' })], [A], defaultStrategies, true);
  assert.ok(ev.some(e => e.type === 'strategy.slot' && e.outcome === 'matched' && e.file_id === 'id-A'));
});

test('match.end mirrors the returned result', () => {
  const { r, ev } = run([up({ file_id: 'id-A' }), up({ file_id: 'id-B' })], [AF, B]);
  const end = ev.at(-1);
  assert.equal(end.type, 'match.end');
  assert.equal(end.ready, r.ready);
  assert.equal(end.failed, true);
  assert.equal(end.states.FAILED, 1);
});

test('supabaseEmitter writes sequenced rows and swallows sink errors', async () => {
  const rows = [];
  const sink = { from: table => ({ insert: row => { rows.push({ table, ...row }); return Promise.resolve(); } }) };
  const emit = supabaseEmitter(sink);
  matchIndexedFiles([up({ file_id: 'id-A' })], [A], { emit, run_id: 'r1' });
  assert.equal(rows[0].table, 'match_events');
  assert.deepEqual(rows.map(r => r.seq), [1, 2, 3, 4]);
  assert.equal(rows[1].strategy, 'id');
  assert.equal(rows[0].strategy, null);

  const errors = [];
  const failing = { from: () => ({ insert: () => Promise.reject(new Error('boom')) }) };
  matchIndexedFiles([up({ file_id: 'id-A' })], [A], { emit: supabaseEmitter(failing, 'match_events', e => errors.push(e)), run_id: 'r2' });
  await new Promise(r => setTimeout(r, 0));
  assert.equal(errors.length, 4);
});

// --- uniqueSourcePaths -----------------------------------------------------

test('uniqueSourcePaths dedupes and tolerates junk', () => {
  assert.deepEqual(
    uniqueSourcePaths([{ source_path: '/a' }, { path: '/b' }, { file_path: '/a' }, null, 7, { path: '' }, { source_path: '/c', path: '/d' }]),
    ['/a', '/b', '/c'],
  );
  assert.deepEqual(uniqueSourcePaths(undefined), []);
});

// --- runWorkspaceResearch --------------------------------------------------

test('non-Error rejection from search returns error result instead of throwing', async () => {
  const r = await runWorkspaceResearch({ query: 'x' }, { search: async () => { throw null; } });
  assert.equal(r.status, 'error');
  assert.equal(r.stage, 'search');
  assert.equal(r.error, 'null');
});

test('close() rejection is recorded as cleanup_error', async () => {
  const r = await runWorkspaceResearch(
    { query: 'x', collection_uuid: 'c' },
    {
      search: async () => [{ path: '/a' }],
      resolve: () => '12345678-1234-1234-1234-123456789abc',
      connect: async () => {},
      close: async () => { throw undefined; },
      upload: async () => ({ uploaded: 1 }),
      ready: async () => true,
      ask: async () => ({ complete: true }),
    },
  );
  assert.equal(r.status, 'completed');
  assert.equal(r.cleanup_error, 'undefined');
});
