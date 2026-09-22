#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { validateManifest } from "./sw-manifest-utils.mjs";

const [manifestPath = "spa-assets/metadata/service-worker-manifest.latest.json",
  statsPath = "spa-assets/metadata/service-worker-manifest.stats.latest.json"] = process.argv.slice(2);

try {
  const [manifest, stats] = await Promise.all(
    [manifestPath, statsPath].map(async (file) => JSON.parse(await readFile(file, "utf8")))
  );
  validateManifest(manifest, stats);
  console.log(`Validated ${manifest.totalChunks} service worker assets and matching statistics.`);
} catch (error) {
  console.error(`Manifest validation failed: ${error.message}`);
  process.exitCode = 1;
}
