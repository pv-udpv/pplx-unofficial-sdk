// ============================================================================
// Perplexity Service Worker Client
// Fetches and parses service-worker.js to extract chunk manifest
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Constants for chunk categorization
 */
const CHUNK_CATEGORIES = {
  RESTRICTED: "_restricted",
  TRANSLATIONS: "translations",
  MODAL: "modal",
} as const;

/**
 * Represents a single chunk/asset in the service worker precache manifest
 */
export interface ServiceWorkerChunk {
  /** Revision hash for cache busting */
  revision: string;
  /** Full URL to the asset/chunk */
  url: string;
}

/**
 * Parsed service worker manifest data
 */
export interface ServiceWorkerManifest {
  /** List of all precached chunks/assets */
  chunks: ServiceWorkerChunk[];
  /** Total number of chunks */
  totalChunks: number;
  /** Extracted at timestamp */
  extractedAt: string;
  /** Service worker URL */
  serviceWorkerUrl: string;
}

/**
 * Disk cache mode for service-worker.js
 */
export type ServiceWorkerCacheMode = "auto" | "refresh" | "cache-only";

/**
 * Disk cache configuration (Node.js only)
 */
export interface ServiceWorkerDiskCacheConfig {
  /** Enable disk cache (default: false). Only works in Node.js runtime. */
  enabled?: boolean;
  /** Cache directory (default: ".pplx/cache"). */
  dir?: string;
  /** Cache mode (default: "auto"). */
  mode?: ServiceWorkerCacheMode;
}

/**
 * Configuration for the service worker client
 */
export interface ServiceWorkerClientConfig {
  /** Base URL for Perplexity (default: https://www.perplexity.ai) */
  baseUrl?: string;
  /** Custom headers for the request */
  headers?: Record<string, string>;
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Optional disk cache for service-worker.js (Node.js only) */
  cache?: ServiceWorkerDiskCacheConfig;
}

/**
 * Filter options for chunks
 */
export interface ChunkFilterOptions {
  /** Filter by file extension (e.g., 'js', 'css') */
  extension?: string;
  /** Filter by URL pattern (regex) */
  urlPattern?: RegExp;
  /** Filter restricted features only */
  restrictedOnly?: boolean;
  /** Filter translations only */
  translationsOnly?: boolean;
  /** Filter modal-related chunks only */
  modalsOnly?: boolean;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class ServiceWorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceWorkerError";
  }
}

export class ServiceWorkerParseError extends ServiceWorkerError {
  constructor(message: string) {
    super(message);
    this.name = "ServiceWorkerParseError";
  }
}

export class ServiceWorkerFetchError extends ServiceWorkerError {
  constructor(message: string) {
    super(message);
    this.name = "ServiceWorkerFetchError";
  }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

type InternalConfig = {
  baseUrl: string;
  headers: Record<string, string>;
  timeout: number;
  cache: {
    enabled: boolean;
    dir: string;
    mode: ServiceWorkerCacheMode;
  };
};

type DiskCacheMetadata = {
  etag?: string;
  lastModified?: string;
  sha256?: string;
  fetchedAt?: number;
};

// ============================================================================
// SERVICE WORKER CLIENT
// ============================================================================

/**
 * Client for fetching and parsing Perplexity's service worker manifest
 */
export class PplxServiceWorkerClient {
  private config: InternalConfig;
  private cachedManifest?: ServiceWorkerManifest;

  constructor(config?: ServiceWorkerClientConfig) {
    this.config = {
      baseUrl: config?.baseUrl || "https://www.perplexity.ai",
      headers: config?.headers || {},
      timeout: config?.timeout || 10000,
      cache: {
        enabled: Boolean(config?.cache?.enabled),
        dir: config?.cache?.dir || ".pplx/cache",
        mode: config?.cache?.mode || "auto",
      },
    };
  }

  private isNodeRuntime(): boolean {
    // Avoid bundler/static analysis surprises: do not import node builtins unless needed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any;
    return Boolean(g?.process?.versions?.node);
  }

  private getServiceWorkerUrl(): string {
    return `${this.config.baseUrl}/service-worker.js`;
  }

  private getBaseHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      "User-Agent": "@pplx-unofficial/sdk",
      ...this.config.headers,
      ...(extra || {}),
    };
  }

  private async computeSha256(text: string): Promise<string | undefined> {
    if (!this.isNodeRuntime()) return undefined;
    try {
      const crypto = await import("node:crypto");
      return crypto.createHash("sha256").update(text, "utf8").digest("hex");
    } catch {
      return undefined;
    }
  }

  private async ensureCacheDir(cacheDir: string): Promise<void> {
    if (!this.isNodeRuntime()) return;
    const fs = await import("node:fs/promises");
    await fs.mkdir(cacheDir, { recursive: true });
  }

  private async readTextIfExists(path: string): Promise<string | undefined> {
    if (!this.isNodeRuntime()) return undefined;
    try {
      const fs = await import("node:fs/promises");
      return await fs.readFile(path, "utf8");
    } catch {
      return undefined;
    }
  }

  private async writeText(path: string, content: string): Promise<void> {
    if (!this.isNodeRuntime()) return;
    const fs = await import("node:fs/promises");
    await fs.writeFile(path, content, "utf8");
  }

  private async readJsonIfExists<T>(path: string): Promise<T | undefined> {
    const txt = await this.readTextIfExists(path);
    if (!txt) return undefined;
    try {
      return JSON.parse(txt) as T;
    } catch {
      return undefined;
    }
  }

  private async writeJson(path: string, value: unknown): Promise<void> {
    await this.writeText(path, JSON.stringify(value, null, 2));
  }

  /**
   * Fetches the service worker JavaScript file
   *
   * - Memory cache: handled by getManifest() via this.cachedManifest
   * - Optional disk cache (Node only): controlled by config.cache
   */
  private async fetchServiceWorker(options?: { forceRefresh?: boolean }): Promise<string> {
    const url = this.getServiceWorkerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const cacheEnabled = this.config.cache.enabled && this.isNodeRuntime();
    const cacheMode: ServiceWorkerCacheMode = options?.forceRefresh
      ? "refresh"
      : this.config.cache.mode;

    // Default: no disk cache (current behavior)
    if (!cacheEnabled) {
      try {
        const response = await fetch(url, {
          headers: this.getBaseHeaders(),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new ServiceWorkerFetchError(
            `Failed to fetch service worker: ${response.status} ${response.statusText}`
          );
        }

        return await response.text();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error) {
          if (error.name === "AbortError") {
            throw new ServiceWorkerFetchError(
              `Service worker fetch timed out after ${this.config.timeout}ms`
            );
          }
          throw new ServiceWorkerFetchError(`Failed to fetch service worker: ${error.message}`);
        }
        throw error;
      }
    }

    // Disk cache pathing
    const pathMod = await import("node:path");
    const cacheDir = this.config.cache.dir;
    const swPath = pathMod.join(cacheDir, "service-worker.js");
    const metaPath = pathMod.join(cacheDir, "service-worker.metadata.json");

    await this.ensureCacheDir(cacheDir);

    const cachedSw = await this.readTextIfExists(swPath);
    const meta = (await this.readJsonIfExists<DiskCacheMetadata>(metaPath)) || {};

    if (cacheMode === "cache-only") {
      if (cachedSw) return cachedSw;
      clearTimeout(timeoutId);
      throw new ServiceWorkerFetchError(
        `cache-only mode: service-worker.js not found in cache at ${swPath}`
      );
    }

    // auto mode: use conditional headers if we have something cached
    const conditionalHeaders: Record<string, string> = {};
    if (cacheMode === "auto" && cachedSw) {
      if (meta.etag) conditionalHeaders["If-None-Match"] = meta.etag;
      if (meta.lastModified) conditionalHeaders["If-Modified-Since"] = meta.lastModified;
    }

    try {
      const response = await fetch(url, {
        headers: this.getBaseHeaders(conditionalHeaders),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 304 && cachedSw) {
        return cachedSw;
      }

      if (!response.ok) {
        // If refresh mode fails, do not silently fall back.
        if (cacheMode !== "refresh" && cachedSw) {
          return cachedSw;
        }
        throw new ServiceWorkerFetchError(
          `Failed to fetch service worker: ${response.status} ${response.statusText}`
        );
      }

      const content = await response.text();
      await this.writeText(swPath, content);

      const newMeta: DiskCacheMetadata = {
        etag: response.headers.get("etag") || undefined,
        lastModified: response.headers.get("last-modified") || undefined,
        sha256: await this.computeSha256(content),
        fetchedAt: Date.now(),
      };
      await this.writeJson(metaPath, newMeta);

      return content;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          // For non-refresh modes, allow stale SW if present.
          if (cacheMode !== "refresh" && cachedSw) return cachedSw;
          throw new ServiceWorkerFetchError(
            `Service worker fetch timed out after ${this.config.timeout}ms`
          );
        }
        if (cacheMode !== "refresh" && cachedSw) return cachedSw;
        throw new ServiceWorkerFetchError(`Failed to fetch service worker: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parses the service worker JavaScript to extract the precache manifest
   */
  private parseManifest(serviceWorkerJs: string): ServiceWorkerChunk[] {
    // The manifest is in the format: He([{...chunks...}]) or precache([{...chunks...}])
    // Note: 'He' is an obfuscated function name in Workbox that may change.
    // We look for multiple patterns to be resilient to minification changes.

    // Look for the pattern: He([...]) or similar function call with manifest array
    const patterns = [
      /He\(\s*\[([^\]]+\])\s*\)/s, // He([...]) - current Workbox pattern
      /precache\(\s*\[([^\]]+\])\s*\)/s, // precache([...]) - alternative pattern
      /\[\s*\{\s*"?revision"?\s*:/s, // Direct array start
    ];

    let manifestMatch: RegExpMatchArray | null = null;
    let matchedPattern: number = -1;

    for (let i = 0; i < patterns.length; i++) {
      manifestMatch = serviceWorkerJs.match(patterns[i]);
      if (manifestMatch) {
        matchedPattern = i;
        break;
      }
    }

    if (!manifestMatch) {
      throw new ServiceWorkerParseError("Could not find chunk manifest in service worker");
    }

    // Extract the JSON array
    let manifestText: string;
    if (matchedPattern < 2) {
      // For function call patterns, use captured group
      manifestText = "[" + manifestMatch[1];
    } else {
      // For direct array pattern, extract from match position
      const startIdx = manifestMatch.index!;
      let depth = 0;
      let endIdx = startIdx;

      for (let i = startIdx; i < serviceWorkerJs.length; i++) {
        const char = serviceWorkerJs[i];
        if (char === "[") depth++;
        if (char === "]") {
          depth--;
          if (depth === 0) {
            endIdx = i + 1;
            break;
          }
        }
      }

      if (depth !== 0) {
        throw new ServiceWorkerParseError("Malformed chunk manifest: unbalanced brackets");
      }

      manifestText = serviceWorkerJs.substring(startIdx, endIdx);
    }

    try {
      const chunks = JSON.parse(manifestText) as ServiceWorkerChunk[];

      if (!Array.isArray(chunks)) {
        throw new ServiceWorkerParseError("Manifest is not an array");
      }

      // Validate chunk structure
      for (const chunk of chunks) {
        if (!chunk.url || typeof chunk.url !== "string") {
          throw new ServiceWorkerParseError("Invalid chunk: missing or invalid url");
        }
        if (!chunk.revision || typeof chunk.revision !== "string") {
          throw new ServiceWorkerParseError("Invalid chunk: missing or invalid revision");
        }
      }

      return chunks;
    } catch (error) {
      if (error instanceof ServiceWorkerParseError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ServiceWorkerParseError(`Failed to parse chunk manifest: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Fetches and parses the service worker manifest
   * Results are cached in memory
   */
  async getManifest(options?: { forceRefresh?: boolean }): Promise<ServiceWorkerManifest> {
    if (this.cachedManifest && !options?.forceRefresh) {
      return this.cachedManifest;
    }

    const serviceWorkerUrl = this.getServiceWorkerUrl();
    const serviceWorkerJs = await this.fetchServiceWorker({ forceRefresh: options?.forceRefresh });
    const chunks = this.parseManifest(serviceWorkerJs);

    const manifest: ServiceWorkerManifest = {
      chunks,
      totalChunks: chunks.length,
      extractedAt: new Date().toISOString(),
      serviceWorkerUrl,
    };

    this.cachedManifest = manifest;
    return manifest;
  }

  /**
   * Gets filtered list of chunks based on criteria
   */
  async getChunks(filter?: ChunkFilterOptions): Promise<ServiceWorkerChunk[]> {
    const manifest = await this.getManifest();
    let chunks = manifest.chunks;

    if (!filter) {
      return chunks;
    }

    // Filter by extension
    if (filter.extension) {
      const ext = filter.extension.startsWith(".") ? filter.extension : `.${filter.extension}`;
      chunks = chunks.filter((chunk) => chunk.url.endsWith(ext));
    }

    // Filter by URL pattern
    if (filter.urlPattern) {
      chunks = chunks.filter((chunk) => filter.urlPattern!.test(chunk.url));
    }

    // Filter restricted features
    if (filter.restrictedOnly) {
      chunks = chunks.filter((chunk) => chunk.url.includes(CHUNK_CATEGORIES.RESTRICTED));
    }

    // Filter translations
    if (filter.translationsOnly) {
      chunks = chunks.filter((chunk) => chunk.url.includes(CHUNK_CATEGORIES.TRANSLATIONS));
    }

    // Filter modals
    if (filter.modalsOnly) {
      chunks = chunks.filter((chunk) => chunk.url.includes(CHUNK_CATEGORIES.MODAL));
    }

    return chunks;
  }

  /**
   * Gets statistics about the chunk manifest
   */
  async getStatistics(): Promise<{
    total: number;
    byExtension: Record<string, number>;
    byCategory: {
      restricted: number;
      translations: number;
      modals: number;
      other: number;
    };
    totalSize: string;
  }> {
    const manifest = await this.getManifest();
    const byExtension: Record<string, number> = {};
    let restricted = 0;
    let translations = 0;
    let modals = 0;
    let other = 0;

    for (const chunk of manifest.chunks) {
      // Count by extension
      const match = chunk.url.match(/\.([^.]+)$/);
      if (match) {
        const ext = match[1];
        byExtension[ext] = (byExtension[ext] || 0) + 1;
      }

      // Count by category
      if (chunk.url.includes(CHUNK_CATEGORIES.RESTRICTED)) {
        restricted++;
      } else if (chunk.url.includes(CHUNK_CATEGORIES.TRANSLATIONS)) {
        translations++;
      } else if (chunk.url.includes(CHUNK_CATEGORIES.MODAL)) {
        modals++;
      } else {
        other++;
      }
    }

    return {
      total: manifest.totalChunks,
      byExtension,
      byCategory: {
        restricted,
        translations,
        modals,
        other,
      },
      totalSize: "N/A", // Not calculated to avoid making additional HTTP requests for each chunk
    };
  }

  /**
   * Clears the cached manifest
   */
  clearCache(): void {
    this.cachedManifest = undefined;
  }
}

/**
 * Factory function to create a service worker client
 */
export function createServiceWorkerClient(
  config?: ServiceWorkerClientConfig
): PplxServiceWorkerClient {
  return new PplxServiceWorkerClient(config);
}

// Default export
export default PplxServiceWorkerClient;
