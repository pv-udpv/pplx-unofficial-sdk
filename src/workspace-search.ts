/**
 * Local implementation of uniqueSourcePaths.
 *
 * Extracts a de-duplicated, order-preserving list of file paths from search
 * results. Each result may expose the path under `source_path`, `path`, or
 * `file_path`; the first non-empty string wins. Results without a usable path
 * are skipped. Non-array input yields an empty list.
 */
export function uniqueSourcePaths(results: unknown): string[] {
  if (!Array.isArray(results)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of results) {
    if (r === null || typeof r !== 'object') continue;
    const rec = r as Record<string, unknown>;
    const candidate = [rec.source_path, rec.path, rec.file_path].find(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    out.push(candidate);
  }
  return out;
}
