#!/usr/bin/env node

import path from "node:path";
import os from "node:os";
import { mkdir, writeFile } from "node:fs/promises";

// NOTE: this script expects repo to be built first: `npm run build`
// It imports the compiled ESM artifact from dist/.
import { PplxServiceWorkerClient } from "../dist/pplx-service-worker-client.mjs";

const outDir = path.join(process.cwd(), "spa-assets", "metadata");
await mkdir(outDir, { recursive: true });

const cacheDir =
  process.env.PPLX_SW_CACHE_DIR || path.join(os.homedir(), ".cache", "pplx-unofficial-sdk", "sw");

const client = new PplxServiceWorkerClient({
  cache: {
    enabled: true,
    dir: cacheDir,
    mode: (process.env.PPLX_SW_CACHE_MODE || "auto"),
  },
});

const manifest = await client.getManifest({ forceRefresh: process.env.PPLX_SW_FORCE_REFRESH === "1" });

await writeFile(
  path.join(outDir, "service-worker-manifest.latest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8"
);

const stats = await client.getStatistics();
await writeFile(
  path.join(outDir, "service-worker-manifest.stats.latest.json"),
  JSON.stringify(stats, null, 2) + "\n",
  "utf8"
);

console.log(`Wrote manifest: ${manifest.totalChunks} chunks`);
