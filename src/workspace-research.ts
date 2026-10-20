import { uniqueSourcePaths } from './workspace-search.js';

// ---------------------------------------------------------------------------
// Indexing
// ---------------------------------------------------------------------------

export type Slot = any | undefined;

export interface ListedIndex {
  /** Identity-deduplicated listed records, in original order. */
  all: any[];
  /** First record per file_id. */
  byId: Map<string, any>;
  /** Records without a usable file_id. */
  idless: any[];
}

export function hasId(x: any): x is { file_id: string } {
  return x !== null && typeof x === 'object' && typeof x.file_id === 'string' && x.file_id !== '';
}

function isRecord(x: any): boolean {
  return x !== null && typeof x === 'object';
}

function isMatchableKey(v: any): boolean {
  return v === v; // excludes NaN; mirrors strict-equality semantics
}

export function indexListed(listed: any[]): ListedIndex {
  const seen = new Set<object>();
  const all: any[] = [];
  const byId = new Map<string, any>();
  const idless: any[] = [];
  for (const f of listed) {
    if (!isRecord(f) || seen.has(f)) continue;
    seen.add(f);
    all.push(f);
    if (hasId(f)) {
      if (!byId.has(f.file_id)) byId.set(f.file_id, f);
    } else {
      idless.push(f);
    }
  }
  return { all, byId, idless };
}

// ---------------------------------------------------------------------------
// Pure matchers
// ---------------------------------------------------------------------------

/** Pure id match. Duplicate ids among uploads: first wins, rest undefined. */
export function matchByIdPure(uploads: Slot[], pool: any[]): Slot[] {
  const byId = new Map<string, any>();
  for (const f of pool) if (hasId(f) && !byId.has(f.file_id)) byId.set(f.file_id, f);
  const claimed = new Set<object>();
  return uploads.map(u => {
    if (!hasId(u)) return undefined;
    const rec = byId.get(u.file_id);
    if (!rec || claimed.has(rec)) return undefined;
    claimed.add(rec);
    return rec;
  });
}

/** Pure filename+size match. Greedy in pool order, one record per upload. */
export function matchByMetadataPure(uploads: Slot[], pool: any[]): Slot[] {
  type Bucket = { records: any[]; next: number };
  const buckets = new Map<any, Map<any, Bucket>>();
  for (const f of pool) {
    if (!isRecord(f)) continue;
    const { filename, file_size } = f;
    if (!isMatchableKey(filename) || !isMatchableKey(file_size)) continue;
    let bySize = buckets.get(filename);
    if (!bySize) buckets.set(filename, (bySize = new Map()));
    let b = bySize.get(file_size);
    if (!b) bySize.set(file_size, (b = { records: [], next: 0 }));
    b.records.push(f);
  }
  return uploads.map(u => {
    if (!isRecord(u)) return undefined;
    const { filename, file_size } = u;
    if (!isMatchableKey(filename) || !isMatchableKey(file_size)) return undefined;
    const b = buckets.get(filename)?.get(file_size);
    if (!b || b.next >= b.records.length) return undefined;
    return b.records[b.next++];
  });
}

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

export interface MatchStrategy {
  name: string;
  /** Records this strategy may draw from. Orchestrator removes claimed ones. */
  pool(idx: ListedIndex): any[];
  /** Pure. One slot per upload; undefined = no match. Must not reuse a record. */
  run(pending: Slot[], pool: any[]): Slot[];
}

export const byIdStrategy: MatchStrategy = {
  name: 'id',
  pool: idx => [...idx.byId.values()],
  run: matchByIdPure,
};

/** Fallback: id-less uploads against id-less records only. */
export const byMetadataStrategy: MatchStrategy = {
  name: 'metadata',
  pool: idx => idx.idless,
  run: (pending, pool) => matchByMetadataPure(pending.map(u => (hasId(u) ? undefined : u)), pool),
};

/** Legacy: everything by metadata, ids ignored. Opt-in only. */
export const legacyMetadataStrategy: MatchStrategy = {
  name: 'legacy-metadata',
  pool: idx => idx.all,
  run: matchByMetadataPure,
};

export const defaultStrategies: MatchStrategy[] = [byIdStrategy, byMetadataStrategy];

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type MatchEvent =
  | { type: 'match.start'; run_id: string; uploads: number; listed: number; deduped: number; strategies: string[] }
  | { type: 'strategy.start'; run_id: string; strategy: string; offered: number; pool: number }
  | { type: 'strategy.slot'; run_id: string; strategy: string; index: number; outcome: 'matched' | 'already_claimed' | 'already_resolved'; file_id?: string }
  | { type: 'strategy.end'; run_id: string; strategy: string; matched: number; skipped: number; remaining: number }
  | { type: 'strategy.error'; run_id: string; strategy: string; error: string }
  | { type: 'match.end'; run_id: string; ready: boolean; failed: boolean; unmatched: number; matched_by: Record<string, number>; states: Record<string, number> };

export type MatchEmitter = (e: MatchEvent) => void;

export interface MatchOptions {
  strategies?: MatchStrategy[];
  emit?: MatchEmitter;
  run_id?: string;
  /** Emit per-upload strategy.slot events. Default false. */
  slotEvents?: boolean;
}

export interface MatchResult {
  ready: boolean;
  failed: boolean;
  files: any[];
  unmatched: number;
  matched_by: Record<string, number>;
  states: Record<string, number>;
  run_id: string;
}

/** Minimal structural client; compatible with @supabase/supabase-js without importing it. */
export interface EventSink {
  from(table: string): { insert(row: Record<string, unknown>): PromiseLike<unknown> };
}

/** Writes events to public.match_events with a per-run sequence number. */
export function supabaseEmitter(sink: EventSink, table = 'match_events', onError?: (e: unknown) => void): MatchEmitter {
  const seq = new Map<string, number>();
  return e => {
    const n = (seq.get(e.run_id) ?? 0) + 1;
    seq.set(e.run_id, n);
    const p = sink.from(table).insert({
      run_id: e.run_id,
      seq: n,
      type: e.type,
      strategy: 'strategy' in e ? e.strategy : null,
      payload: e,
    });
    Promise.resolve(p).then(undefined, err => onError?.(err));
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export function matchIndexedFiles(uploaded: any[], listed: any[], opts: MatchOptions = {}): MatchResult {
  const strategies = opts.strategies ?? defaultStrategies;
  const emit = opts.emit ?? (() => {});
  const run_id = opts.run_id ?? Math.random().toString(36).slice(2, 10);

  const idx = indexListed(listed);
  emit({ type: 'match.start', run_id, uploads: uploaded.length, listed: listed.length, deduped: listed.length - idx.all.length, strategies: strategies.map(s => s.name) });

  const records: Slot[] = new Array(uploaded.length).fill(undefined);
  const methods: (string | undefined)[] = new Array(uploaded.length).fill(undefined);
  const claimed = new Set<object>();

  for (const s of strategies) {
    const pending = uploaded.map((u, i) => (records[i] === undefined ? u : undefined));
    const offered = pending.filter(p => p !== undefined).length;
    if (offered === 0) break;

    const pool = s.pool(idx).filter(r => !claimed.has(r));
    emit({ type: 'strategy.start', run_id, strategy: s.name, offered, pool: pool.length });

    let out: Slot[];
    try {
      out = s.run(pending, pool);
      if (out.length !== uploaded.length) throw Error(`Strategy '${s.name}' returned ${out.length} slots for ${uploaded.length} uploads`);
    } catch (e: any) {
      emit({ type: 'strategy.error', run_id, strategy: s.name, error: e?.message ?? String(e) });
      throw e;
    }

    let matched = 0;
    let skipped = 0;
    out.forEach((rec, i) => {
      if (rec === undefined) return;
      let outcome: 'matched' | 'already_claimed' | 'already_resolved';
      if (records[i] !== undefined) outcome = 'already_resolved';
      else if (claimed.has(rec)) { outcome = 'already_claimed'; skipped++; }
      else { records[i] = rec; methods[i] = s.name; claimed.add(rec); matched++; outcome = 'matched'; }
      if (opts.slotEvents) emit({ type: 'strategy.slot', run_id, strategy: s.name, index: i, outcome, file_id: hasId(rec) ? rec.file_id : undefined });
    });

    emit({ type: 'strategy.end', run_id, strategy: s.name, matched, skipped, remaining: offered - matched });
  }

  const stateCounts = new Map<string, number>();
  let unmatched = 0;
  for (const r of records) {
    if (!r) { unmatched++; continue; }
    const k = String(r.file_state);
    stateCounts.set(k, (stateCounts.get(k) ?? 0) + 1);
  }
  const matched_by: Record<string, number> = {};
  for (const m of methods) if (m) matched_by[m] = (matched_by[m] ?? 0) + 1;
  const states = Object.fromEntries(stateCounts);
  const total = uploaded.length;
  const ready = total > 0 && unmatched === 0 && (stateCounts.get('COMPLETE') ?? 0) === total;
  const failed = (stateCounts.get('FAILED') ?? 0) > 0;

  emit({ type: 'match.end', run_id, ready, failed, unmatched, matched_by, states });
  return { ready, failed, files: records.filter(Boolean), unmatched, matched_by, states, run_id };
}

// ---------------------------------------------------------------------------
// Research flow
// ---------------------------------------------------------------------------

export interface Options {
  query: string;
  collection_uuid?: string;
  work_id?: string;
}

export interface Dependencies {
  search(): Promise<any[]>;
  resolve?(id: string): string;
  connect?(): Promise<void>;
  close?(): Promise<void>;
  upload?(paths: string[], uuid: string): Promise<any>;
  ready?(upload: any, uuid: string): Promise<boolean>;
  ask?(uuid: string): Promise<any>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NIL_UUID_RE = /^0{8}-0{4}-0{4}-0{4}-0{12}$/;

/** Stage reporting is independent of the transport and owns no shared mount. */
export async function runWorkspaceResearch(opts: Options, deps: Dependencies): Promise<any> {
  const result: any = { status: 'error', stage: 'search', uploaded: 0, grounding_verified: false };
  let connected = false;

  try {
    result.search_results = await deps.search();
    result.included_paths = uniqueSourcePaths(result.search_results);
    result.files_selected = result.included_paths.length;

    if (!opts.collection_uuid && !opts.work_id) {
      result.status = 'search_only';
      result.reason = 'Explicit collection_uuid or bound work_id required for upload';
      return result;
    }

    result.stage = 'collection';
    const uuid = deps.resolve!(opts.collection_uuid || opts.work_id!);
    if (!UUID_RE.test(uuid) || NIL_UUID_RE.test(uuid)) {
      throw Error('A valid existing collection UUID or binding is required');
    }
    result.collection_uuid = uuid;

    if (!result.included_paths.length) {
      result.status = 'search_only';
      result.reason = 'No matching files';
      return result;
    }

    result.stage = 'connect';
    connected = true;
    await deps.connect!();

    result.stage = 'upload';
    result.upload = await deps.upload!(result.included_paths, uuid);
    result.uploaded = result.upload.uploaded;
    if (result.uploaded !== result.included_paths.length) {
      throw Error('Upload count does not match selected files');
    }

    result.stage = 'index';
    if (!(await deps.ready!(result.upload, uuid))) {
      throw Error('Uploaded files are not confirmed COMPLETE');
    }

    result.stage = 'ask';
    result.answer = await deps.ask!(uuid);
    if (!result.answer?.complete) throw Error('Answer did not complete');

    result.status = 'completed';
    result.stage = 'completed';
    return result;
  } catch (e: any) {
    result.error = e?.message ?? String(e);
    if (Number.isInteger(e?.uploaded)) result.uploaded = e.uploaded;
    if (e?.upload_results) result.upload = { uploaded: e.uploaded, upload_results: e.upload_results };
    if (e?.stage === 'upload' || e?.stage === 'index') result.stage = e.stage;
    return result;
  } finally {
    if (connected) {
      try {
        await deps.close!();
      } catch (e: any) {
        result.cleanup_error = e?.message ?? String(e);
      }
    }
  }
}
