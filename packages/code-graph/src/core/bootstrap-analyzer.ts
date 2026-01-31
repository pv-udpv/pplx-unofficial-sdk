// ============================================================================
// Bootstrap Analyzer
// Analyzes application bootstrap sequence from Service Worker
// ============================================================================

import type { BootstrapAnalysis, PrecacheEntry, PreloadEntry, LoadStep } from '../types';
import { ServiceWorkerParser } from '../parsers/service-worker-parser';

export interface BootstrapOptions {
  swUrl?: string;
  harPath?: string;
  autoDetectVersion?: boolean;
}

/**
 * Analyzes application bootstrap sequence
 */
export class BootstrapAnalyzer {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://www.perplexity.ai') {
    this.baseUrl = baseUrl;
  }

  /**
   * Analyze application bootstrap sequence
   */
  async analyzeBootstrap(options?: BootstrapOptions): Promise<BootstrapAnalysis> {
    // 1. Parse Service Worker with version auto-detection
    const parser = new ServiceWorkerParser(this.baseUrl);
    const { manifest, versionInfo } = await parser.parseManifest({
      swUrl: options?.swUrl,
      autoDetectVersion: options?.autoDetectVersion !== false,
    });

    console.log(`📦 Service Worker Analysis:`);
    console.log(`   Version: ${versionInfo.version}`);
    console.log(`   Total precache entries: ${manifest.length}`);

    // 2. Identify critical chunks
    const criticalChunks = this.identifyCriticalChunks(manifest);
    console.log(`   Critical path chunks: ${criticalChunks.length}`);

    // 3. Analyze each critical chunk for bootstrap endpoints
    const bootstrapEndpoints: string[] = [];
    for (const chunk of criticalChunks.slice(0, 5)) {
      // Analyze first 5 critical chunks
      const analysis = await this.analyzeChunk(chunk);
      bootstrapEndpoints.push(...analysis.endpoints);
    }

    // 4. Reconstruct load sequence
    const loadSequence = this.reconstructLoadSequence(
      criticalChunks,
      bootstrapEndpoints,
      options?.harPath
    );

    // 5. Analyze critical path
    const criticalPath = this.analyzeCriticalPath(criticalChunks, bootstrapEndpoints);

    // 6. Calculate metrics
    const metrics = this.calculateMetrics(loadSequence);

    return {
      serviceWorker: {
        url: versionInfo.swUrl,
        version: versionInfo.version,
        detectionMethod: versionInfo.detectionMethod,
        precacheManifest: manifest,
      },
      criticalPath,
      loadSequence,
      metrics,
    };
  }

  /**
   * Identify critical chunks (main bundles, entry points)
   */
  private identifyCriticalChunks(manifest: PrecacheEntry[]): PrecacheEntry[] {
    const critical: PrecacheEntry[] = [];

    for (const entry of manifest) {
      const url = entry.url.toLowerCase();
      
      // Main entry points
      if (
        url.includes('index') ||
        url.includes('main') ||
        url.includes('app') ||
        url.includes('bootstrap') ||
        url.includes('runtime') ||
        url.includes('vendor') ||
        url.includes('polyfill')
      ) {
        critical.push(entry);
      }
      
      // Platform core chunks
      if (url.includes('platform') || url.includes('core')) {
        critical.push(entry);
      }
    }

    return critical;
  }

  /**
   * Analyze a single chunk for endpoints
   */
  private async analyzeChunk(chunk: PrecacheEntry): Promise<{ endpoints: string[] }> {
    try {
      const chunkUrl = new URL(chunk.url, this.baseUrl).href;
      const response = await fetch(chunkUrl);
      
      if (!response.ok) {
        console.debug(`Failed to fetch chunk: ${chunk.url}`);
        return { endpoints: [] };
      }

      const code = await response.text();
      const endpoints = this.extractEndpoints(code);

      return { endpoints };
    } catch (e) {
      console.debug(`Error analyzing chunk ${chunk.url}:`, e);
      return { endpoints: [] };
    }
  }

  /**
   * Extract API endpoints from JavaScript code
   */
  private extractEndpoints(code: string): string[] {
    const endpoints: string[] = [];
    
    // Common patterns for API endpoints
    const patterns = [
      /["'](\/rest\/[^"']+)["']/g,
      /["'](\/api\/[^"']+)["']/g,
      /["'](\/auth\/[^"']+)["']/g,
      /["'](\/user\/[^"']+)["']/g,
      /["'](\/analytics\/[^"']+)["']/g,
      /["'](\/config\/[^"']+)["']/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const endpoint = match[1];
        if (!endpoints.includes(endpoint)) {
          endpoints.push(endpoint);
        }
      }
    }

    return endpoints;
  }

  /**
   * Reconstruct load sequence
   */
  private reconstructLoadSequence(
    criticalChunks: PrecacheEntry[],
    bootstrapEndpoints: string[],
    harPath?: string
  ): LoadStep[] {
    const steps: LoadStep[] = [];
    
    // Add critical chunks as load steps
    criticalChunks.forEach((chunk, index) => {
      steps.push({
        order: index + 1,
        resource: chunk.url,
        type: 'script',
        parallel: index > 0, // First chunk is sequential, rest can be parallel
        blocks: index === 0 ? ['render'] : [],
        endpointsTriggered: [],
      });
    });

    // Add bootstrap endpoints
    bootstrapEndpoints.forEach((endpoint, index) => {
      steps.push({
        order: criticalChunks.length + index + 1,
        resource: endpoint,
        type: 'endpoint',
        parallel: true,
        blocks: [],
        endpointsTriggered: [endpoint],
      });
    });

    return steps;
  }

  /**
   * Analyze critical path
   */
  private analyzeCriticalPath(
    criticalChunks: PrecacheEntry[],
    bootstrapEndpoints: string[]
  ): BootstrapAnalysis['criticalPath'] {
    const preloads: PreloadEntry[] = criticalChunks.map(chunk => ({
      url: chunk.url,
      chunk: chunk.url.split('/').pop() || chunk.url,
      priority: chunk.url.includes('index') || chunk.url.includes('main') ? 'critical' : 'high',
      endpoints: [],
      loadTrigger: 'precache' as const,
    }));

    return {
      entrypoint: criticalChunks[0]?.url || 'unknown',
      preloads,
      initialEndpoints: bootstrapEndpoints,
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(loadSequence: LoadStep[]): BootstrapAnalysis['metrics'] {
    const scriptSteps = loadSequence.filter(s => s.type === 'script');
    const parallelSteps = loadSequence.filter(s => s.parallel);

    return {
      totalSize: 0, // Would need actual chunk sizes
      criticalSize: 0,
      parallelRequests: parallelSteps.length,
      estimatedLoadTime: scriptSteps.length * 100, // Rough estimate
    };
  }
}
