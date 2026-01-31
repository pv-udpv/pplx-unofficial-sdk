import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import type { ChunkInfo, AnalysisResult } from './types';
import { ChunkFetcher } from './chunk-fetcher';

export interface DownloadOptions {
  outputDir?: string;
  version?: string;
  parallel?: number;
  categories?: string[];
  dryRun?: boolean;
}

export interface DownloadResult {
  version: string;
  downloaded: number;
  failed: number;
  skipped: number;
  totalSize: number;
  outputDir: string;
  chunks: Array<{
    id: string;
    path: string;
    size: number;
    category: string;
  }>;
}

/**
 * Downloads and organizes chunks extracted from Service Worker
 * 
 * Extracts chunks to: `assets/{version}/{urlpath}/{chunkname}-{chunkhash}.js`
 */
export class ChunkDownloader {
  private readonly fetcher: ChunkFetcher;
  private readonly baseOutputDir: string;

  constructor(options: { outputDir?: string; userAgent?: string } = {}) {
    this.baseOutputDir = options.outputDir || './assets';
    this.fetcher = new ChunkFetcher({ userAgent: options.userAgent });
  }

  /**
   * Download all chunks from analysis result
   * 
   * @param result - Analysis result from ServiceWorkerAnalyzer
   * @param options - Download options
   * @returns Download statistics
   */
  async downloadAll(
    result: AnalysisResult,
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    // Use version from options, result metadata, or 'unknown' as fallback
    const version = options.version || result.meta.version || 'unknown';
    const parallel = options.parallel || 5;
    const categories = options.categories || ['component', 'modal', 'translation', 'core', 'restricted'];
    const dryRun = options.dryRun || false;

    const downloadResult: DownloadResult = {
      version,
      downloaded: 0,
      failed: 0,
      skipped: 0,
      totalSize: 0,
      outputDir: this.baseOutputDir,
      chunks: [],
    };

    // Filter chunks by categories
    const chunksToDownload: ChunkInfo[] = [];
    for (const [category, chunks] of result.chunks.entries()) {
      if (categories.includes(category)) {
        chunksToDownload.push(...chunks);
      }
    }

    console.log(`📦 Downloading ${chunksToDownload.length} chunks (parallel: ${parallel})...`);

    // Process chunks in parallel batches
    for (let i = 0; i < chunksToDownload.length; i += parallel) {
      const batch = chunksToDownload.slice(i, i + parallel);
      
      await Promise.all(
        batch.map(async (chunk) => {
          try {
            const result = await this.downloadChunk(chunk, version, dryRun);
            
            if (result.downloaded) {
              downloadResult.downloaded++;
              downloadResult.totalSize += result.size;
              downloadResult.chunks.push({
                id: chunk.id,
                path: result.path,
                size: result.size,
                category: chunk.category,
              });
            } else if (result.skipped) {
              downloadResult.skipped++;
            }
          } catch (error) {
            downloadResult.failed++;
            console.error(`❌ Failed to download ${chunk.id}:`, error);
          }
        })
      );

      // Progress update
      const processed = Math.min(i + parallel, chunksToDownload.length);
      console.log(`   Progress: ${processed}/${chunksToDownload.length} chunks`);
    }

    // Write manifest
    if (!dryRun) {
      await this.writeManifest(result, version, downloadResult);
    }

    return downloadResult;
  }

  /**
   * Download a single chunk
   */
  private async downloadChunk(
    chunk: ChunkInfo,
    version: string,
    dryRun: boolean
  ): Promise<{ downloaded: boolean; skipped: boolean; path: string; size: number }> {
    // Parse URL to extract path structure
    const urlPath = this.extractUrlPath(chunk.url);
    
    // Build output path: assets/{version}/{urlpath}/{chunkname}-{chunkhash}.js
    const outputPath = join(
      this.baseOutputDir,
      version,
      urlPath,
      `${chunk.id}.js`
    );

    // Check if already exists
    if (!dryRun) {
      try {
        await fs.access(outputPath);
        return { downloaded: false, skipped: true, path: outputPath, size: 0 };
      } catch {
        // File doesn't exist, proceed with download
      }
    }

    // Fetch chunk content
    const content = await this.fetcher.fetchChunk(chunk.id);
    
    if (dryRun) {
      console.log(`[DRY RUN] Would download: ${outputPath} (${content.length} bytes)`);
      return { downloaded: true, skipped: false, path: outputPath, size: content.length };
    }

    // Ensure directory exists
    await fs.mkdir(dirname(outputPath), { recursive: true });

    // Write file
    await fs.writeFile(outputPath, content, 'utf-8');

    return { downloaded: true, skipped: false, path: outputPath, size: content.length };
  }

  /**
   * Extract URL path from chunk URL
   * Example: "/spa/assets/Button-BQdpnMAp.js" -> "spa/assets"
   */
  private extractUrlPath(url: string): string {
    // Remove domain if present
    const urlWithoutDomain = url.replace(/^https?:\/\/[^\/]+/, '');
    
    // Remove leading slash
    const normalized = urlWithoutDomain.replace(/^\//, '');
    
    // Extract directory path
    const parts = normalized.split('/');
    parts.pop(); // Remove filename
    
    return parts.join('/') || 'root';
  }

  /**
   * Write manifest file with download metadata
   */
  private async writeManifest(
    analysisResult: AnalysisResult,
    version: string,
    downloadResult: DownloadResult
  ): Promise<void> {
    const manifestPath = join(this.baseOutputDir, version, 'manifest.json');
    
    const manifest = {
      version,
      timestamp: new Date().toISOString(),
      workboxVersion: analysisResult.manifest.version,
      stats: {
        totalAssets: analysisResult.meta.totalAssets,
        downloaded: downloadResult.downloaded,
        failed: downloadResult.failed,
        skipped: downloadResult.skipped,
        totalSize: downloadResult.totalSize,
      },
      chunks: downloadResult.chunks,
      categories: Object.fromEntries(
        Array.from(analysisResult.chunks.entries()).map(([cat, chunks]) => [
          cat,
          chunks.length,
        ])
      ),
    };

    await fs.mkdir(dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`\n📄 Manifest written to: ${manifestPath}`);
  }

  /**
   * Download specific chunks by IDs
   * 
   * @param chunkIds - Array of chunk IDs to download
   * @param version - Version identifier for directory structure
   * @param dryRun - If true, simulate without downloading
   * @param baseUrl - Optional base URL pattern for chunks (default: /spa/assets/)
   * @returns Download statistics
   */
  async downloadChunksByIds(
    chunkIds: string[],
    version: string,
    dryRun = false,
    baseUrl = '/spa/assets/'
  ): Promise<DownloadResult> {
    const downloadResult: DownloadResult = {
      version,
      downloaded: 0,
      failed: 0,
      skipped: 0,
      totalSize: 0,
      outputDir: this.baseOutputDir,
      chunks: [],
    };

    for (const chunkId of chunkIds) {
      try {
        const chunk: ChunkInfo = {
          id: chunkId,
          hash: 'unknown',
          url: `${baseUrl}${chunkId}.js`,
          category: 'unknown',
        };

        const result = await this.downloadChunk(chunk, version, dryRun);
        
        if (result.downloaded) {
          downloadResult.downloaded++;
          downloadResult.totalSize += result.size;
          downloadResult.chunks.push({
            id: chunkId,
            path: result.path,
            size: result.size,
            category: 'unknown',
          });
        } else if (result.skipped) {
          downloadResult.skipped++;
        }
      } catch (error) {
        downloadResult.failed++;
        console.error(`❌ Failed to download ${chunkId}:`, error);
      }
    }

    return downloadResult;
  }
}
