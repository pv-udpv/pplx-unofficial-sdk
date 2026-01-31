// ============================================================================
// Service Worker Parser
// Parses Service Worker precache manifest with version auto-detection
// ============================================================================

import type { PrecacheEntry, VersionInfo } from '../types';
import { ServiceWorkerVersionDetector } from '../analyzers/version-detector';

export interface ServiceWorkerParseOptions {
  swUrl?: string;
  autoDetectVersion?: boolean;
}

export interface ParseResult {
  manifest: PrecacheEntry[];
  versionInfo: VersionInfo;
}

/**
 * Parses Service Worker precache manifest
 */
export class ServiceWorkerParser {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://www.perplexity.ai') {
    this.baseUrl = baseUrl;
  }

  /**
   * Parse Service Worker manifest with version auto-detection
   */
  async parseManifest(options?: ServiceWorkerParseOptions): Promise<ParseResult> {
    let swUrl: string;
    let versionInfo: VersionInfo;

    // Auto-detect version if not provided or explicitly requested
    if (!options?.swUrl || options.autoDetectVersion) {
      const detector = new ServiceWorkerVersionDetector(this.baseUrl);
      versionInfo = await detector.detectVersion();
      swUrl = versionInfo.swUrl;

      console.log(`✓ Detected version: ${versionInfo.version} (via ${versionInfo.detectionMethod})`);
    } else {
      swUrl = options.swUrl;
      versionInfo = {
        version: 'manual',
        swUrl,
        detectionMethod: 'fallback',
      };
    }

    // Fetch Service Worker code
    const swCode = await this.fetchServiceWorker(swUrl);

    // Extract manifest
    const manifest = this.extractWorkboxManifest(swCode);

    return { manifest, versionInfo };
  }

  /**
   * Fetch Service Worker JavaScript
   */
  private async fetchServiceWorker(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': '@pplx-unofficial/code-graph',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Service Worker: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Extract Workbox precache manifest from Service Worker code
   */
  private extractWorkboxManifest(swCode: string): PrecacheEntry[] {
    // Look for self.__WB_MANIFEST pattern
    const patterns = [
      /self\.__WB_MANIFEST\s*=\s*(\[[\s\S]*?\]);/,
      /precache\(\s*(\[[\s\S]*?\])\s*\)/,
      /He\(\s*(\[[\s\S]*?\])\s*\)/, // Minified Workbox function
    ];

    for (const pattern of patterns) {
      const match = swCode.match(pattern);
      if (match) {
        try {
          // Extract and clean the manifest array
          let manifestText = match[1];
          
          // Handle potential .concat() calls
          if (manifestText.includes('.concat(')) {
            manifestText = manifestText.replace(/\.concat\([^)]+\)/g, '');
          }

          const manifest = this.parseManifestArray(manifestText);
          if (manifest.length > 0) {
            return manifest;
          }
        } catch (e) {
          console.debug(`Failed to parse manifest with pattern: ${pattern}`, e);
        }
      }
    }

    throw new Error('Could not find or parse Workbox manifest in Service Worker');
  }

  /**
   * Parse manifest array text to entries
   */
  private parseManifestArray(manifestText: string): PrecacheEntry[] {
    try {
      const parsed = JSON.parse(manifestText);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Manifest is not an array');
      }

      return parsed.map((entry: any) => {
        if (typeof entry === 'string') {
          // Simple string entries (self-revving URLs)
          return {
            url: entry,
            revision: this.extractRevisionFromUrl(entry),
          };
        } else if (entry && typeof entry === 'object') {
          // Object entries with revision
          return {
            url: entry.url || entry.href || '',
            revision: entry.revision || entry.hash || 'unknown',
          };
        }
        throw new Error('Invalid manifest entry format');
      });
    } catch (e) {
      throw new Error(`Failed to parse manifest array: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  }

  /**
   * Extract revision hash from URL (for self-revving URLs)
   */
  private extractRevisionFromUrl(url: string): string {
    // Extract hash from URLs like: /assets/chunk-ABC123.js
    const hashMatch = url.match(/[-_]([a-f0-9]{6,})\./i);
    if (hashMatch) {
      return hashMatch[1];
    }
    return 'self-revving';
  }
}
