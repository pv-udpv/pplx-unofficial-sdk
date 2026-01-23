// ============================================================================
// Perplexity Service Worker Client
// Fetches and parses service-worker.js to extract chunk manifest
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
 * Configuration for the service worker client
 */
export interface ServiceWorkerClientConfig {
  /** Base URL for Perplexity (default: https://www.perplexity.ai) */
  baseUrl?: string;
  /** Custom headers for the request */
  headers?: Record<string, string>;
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
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
// SERVICE WORKER CLIENT
// ============================================================================

/**
 * Client for fetching and parsing Perplexity's service worker manifest
 */
export class PplxServiceWorkerClient {
  private config: Required<ServiceWorkerClientConfig>;
  private cachedManifest?: ServiceWorkerManifest;

  constructor(config?: ServiceWorkerClientConfig) {
    this.config = {
      baseUrl: config?.baseUrl || "https://www.perplexity.ai",
      headers: config?.headers || {},
      timeout: config?.timeout || 10000,
    };
  }

  /**
   * Fetches the service worker JavaScript file
   */
  private async fetchServiceWorker(): Promise<string> {
    const url = `${this.config.baseUrl}/service-worker.js`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "@pplx-unofficial/sdk",
          ...this.config.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ServiceWorkerFetchError(
          `Failed to fetch service worker: ${response.status} ${response.statusText}`
        );
      }

      const content = await response.text();
      return content;
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

  /**
   * Parses the service worker JavaScript to extract the precache manifest
   */
  private parseManifest(serviceWorkerJs: string): ServiceWorkerChunk[] {
    // The manifest is in the format: He([{...chunks...}])
    // We need to find and extract the array of chunk objects
    
    // Look for the pattern: He([...]) or similar function call with manifest array
    const patterns = [
      /He\(\s*\[([^\]]+\])\s*\)/s, // He([...])
      /precache\(\s*\[([^\]]+\])\s*\)/s, // precache([...])
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
      throw new ServiceWorkerParseError(
        "Could not find chunk manifest in service worker"
      );
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
        throw new ServiceWorkerParseError(
          "Malformed chunk manifest: unbalanced brackets"
        );
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
        throw new ServiceWorkerParseError(
          `Failed to parse chunk manifest: ${error.message}`
        );
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

    const serviceWorkerUrl = `${this.config.baseUrl}/service-worker.js`;
    const serviceWorkerJs = await this.fetchServiceWorker();
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
      const ext = filter.extension.startsWith(".") 
        ? filter.extension 
        : `.${filter.extension}`;
      chunks = chunks.filter((chunk) => chunk.url.endsWith(ext));
    }

    // Filter by URL pattern
    if (filter.urlPattern) {
      chunks = chunks.filter((chunk) => filter.urlPattern!.test(chunk.url));
    }

    // Filter restricted features
    if (filter.restrictedOnly) {
      chunks = chunks.filter((chunk) => chunk.url.includes("_restricted"));
    }

    // Filter translations
    if (filter.translationsOnly) {
      chunks = chunks.filter((chunk) => chunk.url.includes("translations"));
    }

    // Filter modals
    if (filter.modalsOnly) {
      chunks = chunks.filter((chunk) => chunk.url.includes("modal"));
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
      if (chunk.url.includes("_restricted")) {
        restricted++;
      } else if (chunk.url.includes("translations")) {
        translations++;
      } else if (chunk.url.includes("modal")) {
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
      totalSize: "N/A", // Would require fetching each chunk
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
