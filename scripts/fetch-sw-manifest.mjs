#!/usr/bin/env node

import path from "node:path";
import os from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { prepareSnapshot, summarizeChanges } from "./sw-manifest-utils.mjs";

// This script expects the compiled ESM artifact: npm run build.
import { PplxServiceWorkerClient } from "../dist/pplx-service-worker-client.mjs";

const outDir = path.join(process.cwd(), "spa-assets", "metadata");
const manifestPath = path.join(outDir, "service-worker-manifest.latest.json");
const statsPath = path.join(outDir, "service-worker-manifest.stats.latest.json");
const cacheDir = process.env.PPLX_SW_CACHE_DIR || path.join(os.homedir(), ".cache", "pplx-unofficial-sdk", "sw");
const client = new PplxServiceWorkerClient({ cache: { enabled: true, dir: cacheDir, mode: "refresh" } });

async function readOptional(file) {
  try { return await readFile(file, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

const previousText = await readOptional(manifestPath);
const previous = previousText === null ? null : JSON.parse(previousText);
// Publishing must fail on fetch errors instead of assigning a fresh date to stale cache.
const fetched = await client.getManifest({ forceRefresh: true });
const stats = await client.getStatistics();
const snapshot = prepareSnapshot(previous, fetched, stats);
await mkdir(outDir, { recursive: true });
if (snapshot.manifestChanged) {
  await writeFile(manifestPath, JSON.stringify(snapshot.manifest, null, 2) + "\n", "utf8");
}
const statsText = JSON.stringify(snapshot.stats, null, 2) + "\n";
const previousStatsText = await readOptional(statsPath);
const canonical = (value) => value && typeof value === "object"
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
  : value;
let previousStats;
try { previousStats = previousStatsText === null ? null : JSON.parse(previousStatsText); }
catch { previousStats = null; } // A valid fresh snapshot can repair malformed statistics.
if (JSON.stringify(canonical(previousStats)) !== JSON.stringify(canonical(snapshot.stats))) {
  await writeFile(statsPath, statsText, "utf8");
}
if (process.env.PPLX_SW_SUMMARY_PATH) {
  await writeFile(process.env.PPLX_SW_SUMMARY_PATH, summarizeChanges(previous, snapshot.manifest), "utf8");
}
console.log(`${snapshot.manifestChanged ? "Updated" : "Unchanged"} manifest: ${snapshot.manifest.totalChunks} chunks`);
