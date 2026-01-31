/**
 * Service Worker Analysis Module
 * 
 * Extracts and analyzes Perplexity.ai Service Worker metadata:
 * - Workbox configuration
 * - Precache manifest (1149+ assets)
 * - Chunk categorization
 * - Cache strategies
 * - Chunk downloading and extraction
 */

export { ServiceWorkerFetcher } from './fetcher';
export { ServiceWorkerParser } from './parser';
export { ChunkAnalyzer } from './chunk-analyzer';
export { ServiceWorkerAnalyzer } from './analyzer';
export { ChunkFetcher } from './chunk-fetcher';
export { ChunkDownloader } from './chunk-downloader';

export type {
  PrecacheAsset,
  WorkboxManifest,
  ChunkInfo,
  RouteConfig,
  AnalysisResult,
} from './types';
