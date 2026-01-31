/**
 * Service Worker Analysis Module
 * 
 * Extracts and analyzes Perplexity.ai Service Worker metadata:
 * - Workbox configuration
 * - Precache manifest (1149+ assets)
 * - Chunk categorization
 * - Cache strategies
 */

export { ServiceWorkerFetcher } from './fetcher';
export { ServiceWorkerParser } from './parser';
export { ChunkAnalyzer } from './chunk-analyzer';
export { ServiceWorkerAnalyzer } from './analyzer';

export type {
  PrecacheAsset,
  WorkboxManifest,
  ChunkInfo,
  RouteConfig,
  AnalysisResult,
} from './types';
