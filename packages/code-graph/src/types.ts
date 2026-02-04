// ============================================================================
// Core Types for Code Graph Analysis
// ============================================================================

/**
 * Version information with detection method
 */
export interface VersionInfo {
  version: string;
  swUrl: string;
  detectionMethod: 'api' | 'query-param' | 'js-context' | 'fallback';
}

/**
 * Service Worker precache entry
 */
export interface PrecacheEntry {
  url: string;
  revision: string;
}

/**
 * Bootstrap analysis result
 */
export interface BootstrapAnalysis {
  serviceWorker: {
    url: string;
    version: string;
    detectionMethod: string;
    precacheManifest: PrecacheEntry[];
  };
  criticalPath: {
    entrypoint: string;
    preloads: PreloadEntry[];
    initialEndpoints: string[];
  };
  loadSequence: LoadStep[];
  metrics: {
    totalSize: number;
    criticalSize: number;
    parallelRequests: number;
    estimatedLoadTime: number;
  };
}

/**
 * Preload entry with priority
 */
export interface PreloadEntry {
  url: string;
  chunk: string;
  priority: 'critical' | 'high' | 'low';
  endpoints: string[];
  loadTrigger: 'precache' | 'prefetch' | 'on-demand';
}

/**
 * Load sequence step
 */
export interface LoadStep {
  order: number;
  resource: string;
  type: 'script' | 'endpoint';
  parallel: boolean;
  blocks: string[];
  endpointsTriggered: string[];
}

/**
 * Call chain from UI to endpoint
 */
export interface CallChain {
  endpoint: string;
  entryPoints: EntryPoint[];
  callPath: CallNode[];
  contexts: Context[];
}

/**
 * Entry point in UI
 */
export interface EntryPoint {
  component: string;
  event: string;
  line: number;
  userAction: string;
}

/**
 * Node in call chain
 */
export interface CallNode {
  module: string;
  function: string;
  line: number;
  type: 'component' | 'hook' | 'service' | 'api-client';
}

/**
 * Usage context
 */
export interface Context {
  flow: string;
  frequency: 'startup' | 'on-demand' | 'polling';
  authentication: 'required' | 'optional';
  errorHandling: string[];
}

/**
 * Module node in dependency graph
 */
export interface ModuleNode {
  id: string;
  path: string;
  type: 'script' | 'style' | 'asset';
  imports: string[];
  exports: string[];
  size?: number;
}

/**
 * Function call in call graph
 */
export interface FunctionCall {
  caller: string;
  callee: string;
  line: number;
  column: number;
  callType: 'direct' | 'dynamic' | 'conditional';
}

/**
 * Update information for version monitoring
 */
export interface UpdateInfo {
  hasUpdate: boolean;
  oldVersion?: string;
  newVersion?: string;
  changes?: ManifestDiff;
}

/**
 * Manifest diff between versions
 */
export interface ManifestDiff {
  added: PrecacheEntry[];
  removed: PrecacheEntry[];
  modified: PrecacheEntry[];
}

/**
 * User journey to endpoint
 */
export interface UserJourney {
  name: string;
  probability: number;
  userAction: string;
  steps: JourneyStep[];
  frequency: 'startup' | 'on-demand' | 'polling';
  critical: boolean;
}

/**
 * Step in user journey
 */
export interface JourneyStep {
  layer: 'ui' | 'state' | 'service' | 'api' | 'http';
  module: string;
  function: string;
  description: string;
}
