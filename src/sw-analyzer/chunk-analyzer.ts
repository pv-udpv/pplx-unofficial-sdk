import type { PrecacheAsset, ChunkInfo, ChunkCategory } from './types';

export class ChunkAnalyzer {
  /**
   * Categorize assets by type
   */
  categorize(assets: PrecacheAsset[]): Map<ChunkCategory, ChunkInfo[]> {
    const categories = new Map<ChunkCategory, ChunkInfo[]>();
    
    for (const asset of assets) {
      const category = this.detectCategory(asset.url);
      
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      
      categories.get(category)!.push({
        id: this.extractChunkId(asset.url),
        hash: asset.revision,
        url: asset.url,
        category,
        size: asset.size,
      });
    }
    
    return categories;
  }
  
  /**
   * Detect chunk category from URL
   */
  private detectCategory(url: string): ChunkCategory {
    const path = url.toLowerCase();
    
    // Modal components
    if (path.includes('modal') || path.match(/(?:confirmation|settings|upload).*\.js$/)) {
      return 'modal';
    }
    
    // Translation files
    if (path.match(/[a-z]{2}-[A-Z]{2}\.json/) || path.includes('/i18n/') || path.includes('/locale/')) {
      return 'translation';
    }
    
    // Restricted features
    if (path.includes('/restricted/') || path.match(/restricted-feature-/)) {
      return 'restricted';
    }
    
    // Core bundles
    if (path.match(/^(?:https?:\/\/[^\/]+)?\/?(?:spa\/)?assets\/(?:platform-core|spa-shell|bootstrap|pplx-stream)/)) {
      return 'core';
    }
    
    // Regular components
    if (path.includes('/assets/') && path.endsWith('.js')) {
      return 'component';
    }
    
    return 'unknown';
  }
  
  /**
   * Extract chunk ID from URL
   * Example: "/assets/Button-BQdpnMAp.js" -> "Button-BQdpnMAp"
   */
  private extractChunkId(url: string): string {
    const match = url.match(/\/([^\/]+)\.(?:js|css)$/);
    return match ? match[1] : url;
  }
  
  /**
   * Get statistics by category
   */
  getStats(chunks: Map<ChunkCategory, ChunkInfo[]>): Record<ChunkCategory, number> {
    const stats: Record<string, number> = {};
    
    for (const [category, items] of chunks.entries()) {
      stats[category] = items.length;
    }
    
    return stats as Record<ChunkCategory, number>;
  }
  
  /**
   * Find chunks by pattern
   */
  findChunks(chunks: Map<ChunkCategory, ChunkInfo[]>, pattern: string | RegExp): ChunkInfo[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    const results: ChunkInfo[] = [];
    
    for (const items of chunks.values()) {
      for (const chunk of items) {
        if (regex.test(chunk.url) || regex.test(chunk.id)) {
          results.push(chunk);
        }
      }
    }
    
    return results;
  }
}
