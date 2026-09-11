import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { validateManifest, prepareSnapshot, summarizeChanges } from "./sw-manifest-utils.mjs";

const exec = promisify(execFile);
const chunk = (name, revision = "abc") => ({ url: `https://pplx-next-static-public.perplexity.ai/_spa/assets/${name}`, revision });
const manifest = () => ({ chunks: [chunk("Modal__v2.js"), chunk("_RESTRICTED/Modal.js"), chunk("TranslationsModal.js"), chunk("style.CSS?v=1")], totalChunks: 4, extractedAt: "2026-09-11T00:00:00.000Z", serviceWorkerUrl: "https://www.perplexity.ai/service-worker.js" });
const stats = () => ({ total: 4, byExtension: { js: 3, css: 1 }, byCategory: { restricted: 1, translations: 1, modals: 1, other: 1 }, totalSize: "N/A" });

test("validates pathname categories, precedence, extensions and query strings", () => assert.equal(validateManifest(manifest(), stats()), true));
test("rejects malformed manifests and inconsistent statistics", () => {
  for (const mutate of [
    (m) => { m.chunks = []; }, (m) => { m.totalChunks++; },
    (m) => { m.chunks[0] = m.chunks[1]; }, (m) => { m.chunks[0].revision = " "; },
    (m) => { m.chunks[0].url = "garbage"; }, (m) => { m.chunks[0].url = "https://example.com/a.js"; },
    (m) => { m.chunks[0].url = m.chunks[0].url.replace("https:", "http:"); },
    (m) => { m.extractedAt = "bad"; }, (m) => { m.serviceWorkerUrl = "https://example.com/sw.js"; },
    (_, s) => { s.total++; }, (_, s) => { s.byExtension.js++; },
    (_, s) => { s.byCategory.modals = 0; }, (_, s) => { s.byCategory.extra = 0; },
  ]) { const m = manifest(); const s = stats(); mutate(m, s); assert.throws(() => validateManifest(m, s), /Invalid service worker manifest/); }
  assert.throws(() => validateManifest(null, null));
});
test("semantic no-op preserves original manifest including its timestamp and order", () => {
  const previous = manifest(); const next = manifest();
  next.chunks.reverse(); next.extractedAt = "2026-09-12T00:00:00.000Z";
  const result = prepareSnapshot(previous, next, stats());
  assert.equal(result.manifestChanged, false); assert.equal(result.manifest, previous);
  next.chunks[0].revision = "def";
  assert.equal(prepareSnapshot(previous, next, stats()).manifestChanged, true);
});
test("summary distinguishes URL additions, removals, and revision changes", () => {
  const before = manifest(); const after = manifest();
  after.chunks[0].revision = "def"; after.chunks[1] = chunk("new.js");
  const summary = summarizeChanges(before, after);
  assert.match(summary, /Added: \*\*1\*\*/); assert.match(summary, /Removed: \*\*1\*\*/);
  assert.match(summary, /Revision changes at unchanged URLs: \*\*1\*\*/);
  assert.match(summary, /2026-09-11/); assert.match(summary, /__v2/);
  assert.match(summarizeChanges(null, after), /Added: \*\*4\*\*/);
});

async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), "sw-publish-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const folder of ["scripts", "dist", "spa-assets/metadata"]) await mkdir(path.join(dir, folder), { recursive: true });
  for (const file of ["fetch-sw-manifest.mjs", "sw-manifest-utils.mjs"]) await copyFile(new URL(file, import.meta.url), path.join(dir, "scripts", file));
  await writeFile(path.join(dir, "dist/pplx-service-worker-client.mjs"), `
    export class PplxServiceWorkerClient {
      constructor(config) { if (config.cache.mode !== "refresh") throw new Error("must refresh"); }
      async getManifest(options) {
        if (options.forceRefresh !== true) throw new Error("must force refresh");
        if (process.env.TEST_FETCH_FAIL) throw new Error("network unavailable");
        return JSON.parse(process.env.TEST_MANIFEST);
      }
      async getStatistics() { return JSON.parse(process.env.TEST_STATS); }
    }
  `);
  const m = path.join(dir, "spa-assets/metadata/service-worker-manifest.latest.json");
  const s = path.join(dir, "spa-assets/metadata/service-worker-manifest.stats.latest.json");
  return { dir, m, s, run: (extra = {}) => exec(process.execPath, ["scripts/fetch-sw-manifest.mjs"], { cwd: dir, env: { ...process.env, PPLX_SW_CACHE_MODE: "cache-only", PPLX_SW_FORCE_REFRESH: "0", TEST_MANIFEST: JSON.stringify(manifest()), TEST_STATS: JSON.stringify(stats()), ...extra } }) };
}
test("publishing preserves both files byte-for-byte on no-op and repairs only stale stats", async (t) => {
  const f = await fixture(t); const old = manifest(); old.extractedAt = "2026-08-01T00:00:00.000Z"; old.chunks.reverse();
  const original = JSON.stringify(old); const originalStats = JSON.stringify(stats());
  await writeFile(f.m, original); await writeFile(f.s, originalStats);
  await f.run({ PPLX_SW_SUMMARY_PATH: path.join(f.dir, "summary.md") });
  assert.equal(await readFile(f.m, "utf8"), original); assert.equal(await readFile(f.s, "utf8"), originalStats);
  assert.match(await readFile(path.join(f.dir, "summary.md"), "utf8"), /Added: \*\*0\*\*/);
  await writeFile(f.s, "{}"); await f.run();
  assert.equal(await readFile(f.m, "utf8"), original); assert.deepEqual(JSON.parse(await readFile(f.s, "utf8")), stats());
});
test("publishing fetch failure leaves existing files untouched", async (t) => {
  const f = await fixture(t); await writeFile(f.m, JSON.stringify(manifest())); await writeFile(f.s, "original");
  await assert.rejects(f.run({ TEST_FETCH_FAIL: "1" }), /network unavailable/);
  assert.equal(await readFile(f.s, "utf8"), "original");
  assert.deepEqual(JSON.parse(await readFile(f.m, "utf8")), manifest());
});
test("publishing writes first snapshot and revision updates", async (t) => {
  const f = await fixture(t); await f.run();
  const next = manifest(); next.chunks[0].revision = "updated";
  await f.run({ TEST_MANIFEST: JSON.stringify(next) });
  const saved = JSON.parse(await readFile(f.m, "utf8"));
  assert.equal(saved.chunks.find((c) => c.url.includes("Modal__v2")).revision, "updated");
});
