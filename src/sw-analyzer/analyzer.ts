import { ServiceWorkerFetcher } from './fetcher';
import { ServiceWorkerParser } from './parser';
import { ChunkAnalyzer } from './chunk-analyzer';
import type { AnalysisResult, ChunkInfo } from './types';

export interface AnalyzerOptions {
  userAgent?: string;
  version?: string;
}

export class ServiceWorkerAnalyzer {
  private readonly fetcher: ServiceWorkerFetcher;
  private readonly parser: ServiceWorkerParser;
  private readonly chunkAnalyzer: ChunkAnalyzer;
  private readonly defaultVersion?: string;
  
  constructor(options: AnalyzerOptions = {}) {
    this.fetcher = new ServiceWorkerFetcher(options.userAgent);
    this.parser = new ServiceWorkerParser();
    this.chunkAnalyzer = new ChunkAnalyzer();
    this.defaultVersion = options.version;
  }
  
  /**
   * Analyze Service Worker
   * 
   * @param version - Optional version hash (uses constructor default if not provided)
   * @returns Complete analysis result
   */
  async analyze(version?: string): Promise<AnalysisResult> {
    // Fetch SW content
    const content = await this.fetcher.fetch(version ?? this.defaultVersion);
    
    // Parse manifest
    const manifest = this.parser.parse(content);
    
    // Categorize chunks
    const chunks = this.chunkAnalyzer.categorize(manifest.assets);
    
    // Build result
    return {
      meta: {
        timestamp: new Date().toISOString(),
        version: manifest.version,
        totalAssets: manifest.assets.length,
        fileSize: content.length,
      },
      manifest,
      chunks,
    };
  }
  
  /**
   * Export analysis to JSON
   */
  async export(result: AnalysisResult, format: 'json' | 'yaml' = 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(
        {
          ...result,
          chunks: Object.fromEntries(result.chunks),
        },
        null,
        2
      );
    }
    
    // YAML export would require yaml library
    throw new Error('YAML export not implemented');
  }
  
  /**
   * Get statistics summary
   */
  async getStats(version?: string): Promise<Record<string, number>> {
    const result = await this.analyze(version ?? this.defaultVersion);
    return this.chunkAnalyzer.getStats(result.chunks);
  }
  
  /**
   * Find chunks by pattern
   */
  async findChunks(pattern: string | RegExp, version?: string): Promise<ChunkInfo[]> {
    const result = await this.analyze(version ?? this.defaultVersion);
    return this.chunkAnalyzer.findChunks(result.chunks, pattern);
  }
}
