/** Pure helpers shared by snapshot publishing and offline validation. */
const CDN_HOST = "pplx-next-static-public.perplexity.ai";
const fail = (message) => { throw new Error(`Invalid service worker manifest: ${message}`); };
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function normalizeChunks(manifest) {
  return manifest.chunks.map(({ url, revision }) => ({ url, revision }))
    .sort((a, b) => a.url < b.url ? -1 : a.url > b.url ? 1 : a.revision < b.revision ? -1 : a.revision > b.revision ? 1 : 0);
}

export function manifestsEqual(previous, next) {
  return Boolean(previous) && previous.serviceWorkerUrl === next.serviceWorkerUrl &&
    JSON.stringify(normalizeChunks(previous)) === JSON.stringify(normalizeChunks(next));
}

export function validateManifest(manifest, stats) {
  if (!record(manifest)) fail("expected an object");
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) fail("chunks must be a nonempty array");
  if (!Number.isInteger(manifest.totalChunks) || manifest.totalChunks !== manifest.chunks.length) fail("totalChunks does not match chunks");
  if (typeof manifest.extractedAt !== "string" || !Number.isFinite(Date.parse(manifest.extractedAt))) fail("extractedAt must be a valid timestamp");
  if (manifest.serviceWorkerUrl !== "https://www.perplexity.ai/service-worker.js") fail("unexpected serviceWorkerUrl");
  const urls = new Set();
  const byExtension = {};
  const byCategory = { restricted: 0, translations: 0, modals: 0, other: 0 };
  for (const chunk of manifest.chunks) {
    if (!record(chunk) || typeof chunk.url !== "string") fail("chunk must contain a URL");
    if (typeof chunk.revision !== "string" || chunk.revision.trim().length === 0) fail(`missing revision for ${chunk.url}`);
    let url;
    try { url = new URL(chunk.url); } catch { fail(`malformed URL: ${chunk.url}`); }
    if (url.protocol !== "https:" || url.hostname !== CDN_HOST || url.port || url.username || url.password) fail(`unexpected asset origin: ${chunk.url}`);
    if (urls.has(chunk.url)) fail(`duplicate URL: ${chunk.url}`);
    urls.add(chunk.url);
    const pathname = url.pathname.toLowerCase();
    const extension = pathname.match(/\.([^.\/]+)$/)?.[1];
    if (extension) byExtension[extension] = (byExtension[extension] || 0) + 1;
    const category = pathname.includes("_restricted") ? "restricted" : pathname.includes("translations") ? "translations" : pathname.includes("modal") ? "modals" : "other";
    byCategory[category]++;
  }
  if (!record(stats) || stats.total !== manifest.totalChunks) fail("statistics total does not match manifest");
  for (const [key, expected] of Object.entries({ byExtension, byCategory })) {
    if (!record(stats[key]) || Object.keys(stats[key]).length !== Object.keys(expected).length ||
      Object.entries(expected).some(([name, count]) => stats[key][name] !== count)) fail(`statistics ${key} does not match asset paths`);
  }
  if (typeof stats.totalSize !== "string") fail("statistics totalSize must be a string");
  return true;
}

export function prepareSnapshot(previous, next, stats) {
  validateManifest(next, stats);
  const manifestChanged = !manifestsEqual(previous, next);
  return { manifest: manifestChanged ? { ...next, chunks: normalizeChunks(next) } : previous, stats, manifestChanged };
}

export function summarizeChanges(previous, next) {
  const before = new Map((previous?.chunks || []).map(({ url, revision }) => [url, revision]));
  const after = new Map(next.chunks.map(({ url, revision }) => [url, revision]));
  const added = [...after.keys()].filter((url) => !before.has(url)).length;
  const removed = [...before.keys()].filter((url) => !after.has(url)).length;
  const revised = [...after].filter(([url, revision]) => before.has(url) && before.get(url) !== revision).length;
  const v2 = (urls) => [...urls].filter((url) => new URL(url).pathname.includes("__v2")).length;
  return [
    "## Service worker manifest refresh", "",
    `Capture dates: ${previous?.extractedAt || "none"} → ${next.extractedAt}.`, "",
    "| Metric | Previous | Current |", "| --- | ---: | ---: |",
    `| Assets | ${before.size} | ${after.size} |`,
    `| Paths containing \`__v2\` | ${v2(before.keys())} | ${v2(after.keys())} |`, "",
    `Added: **${added}**. Removed: **${removed}**. Revision changes at unchanged URLs: **${revised}**.`, "",
    "Asset naming counts describe filenames; they do not establish product or API changes.", "",
  ].join("\n");
}
