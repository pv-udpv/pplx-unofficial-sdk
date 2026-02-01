export interface PrecacheAsset {
  url: string;
  revision: string;
  hash: string;
  size?: number;
}

export interface RouteConfig {
  strategy: string;
  pattern: string;
  cacheName?: string;
  plugins?: string[];
}

export interface WorkboxManifest {
  version: string;
  assets: PrecacheAsset[];
  routes: RouteConfig[];
  strategies: string[];
  cdnDomains: string[];
}

export type ChunkCategory = 
  | 'component'
  | 'modal'
  | 'translation'
  | 'core'
  | 'restricted'
  | 'unknown';

export interface ChunkInfo {
  id: string;
  hash: string;
  url: string;
  category: ChunkCategory;
  size?: number;
}

export interface AnalysisResult {
  meta: {
    timestamp: string;
    version: string;
    totalAssets: number;
    fileSize: number;
  };
  manifest: WorkboxManifest;
  chunks: Map<ChunkCategory, ChunkInfo[]>;
}
