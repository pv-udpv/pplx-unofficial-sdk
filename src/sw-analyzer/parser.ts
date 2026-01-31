import type { PrecacheAsset, RouteConfig, WorkboxManifest } from './types';

export class ServiceWorkerParser {
  /**
   * Parse Service Worker content
   */
  parse(content: string): WorkboxManifest {
    return {
      version: this.extractWorkboxVersion(content),
      assets: this.extractPrecacheManifest(content),
      routes: this.extractRoutes(content),
      strategies: this.extractStrategies(content),
      cdnDomains: this.extractCDNDomains(content),
    };
  }
  
  /**
   * Extract Workbox version
   */
  private extractWorkboxVersion(content: string): string {
    const patterns = [
      /workbox[.-](?:core|sw)[.-]v?(\d+\.\d+\.\d+)/i,
      /workbox["']?:?["']?v?(\d+\.\d+\.\d+)/i,
      /workbox-v(\d+\.\d+\.\d+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Extract precache manifest with multiple strategies
   */
  private extractPrecacheManifest(content: string): PrecacheAsset[] {
    const assets: PrecacheAsset[] = [];
    
    // Strategy 1: precacheAndRoute([...])
    const precachePattern = /precacheAndRoute\(\s*\[(.*?)\]\s*\)/s;
    const precacheMatch = content.match(precachePattern);
    
    if (precacheMatch) {
      const manifestContent = precacheMatch[1];
      
      // Extract entries
      const entryPattern = /\{\s*url:\s*["']([^"']+)["']\s*,\s*revision:\s*["']([a-f0-9]+)["']\s*\}/g;
      let match;
      
      while ((match = entryPattern.exec(manifestContent)) !== null) {
        assets.push({
          url: match[1],
          revision: match[2],
          hash: match[2],
        });
      }
    }
    
    // Strategy 2: self.__WB_MANIFEST
    const manifestPattern = /self\.__WB_MANIFEST\s*=\s*\[(.*?)\]/s;
    const manifestMatch = content.match(manifestPattern);
    
    if (manifestMatch) {
      // Parse similar to above
      // ...
    }
    
    // Strategy 3: Inline chunk references (minified)
    if (assets.length === 0) {
      const chunkPattern = /\{url:["']([^"']+)["'],revision:["']([a-f0-9]+)["']\}/g;
      let match;
      
      while ((match = chunkPattern.exec(content)) !== null) {
        assets.push({
          url: match[1],
          revision: match[2],
          hash: match[2],
        });
      }
    }
    
    return assets;
  }
  
  /**
   * Extract routing rules
   */
  private extractRoutes(content: string): RouteConfig[] {
    const routes: RouteConfig[] = [];
    
    const routePattern = /registerRoute\(([^,]+),\s*new\s+(?:workbox\.)?(?:strategies\.)?(\w+)\(([^)]*)\)/g;
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      routes.push({
        strategy: match[2],
        pattern: match[1].slice(0, 100), // Limit length
      });
    }
    
    return routes;
  }
  
  /**
   * Extract cache strategies
   */
  private extractStrategies(content: string): string[] {
    const strategies = new Set<string>();
    
    const commonStrategies = [
      'CacheFirst',
      'CacheOnly',
      'NetworkFirst',
      'NetworkOnly',
      'StaleWhileRevalidate',
    ];
    
    for (const strategy of commonStrategies) {
      if (content.includes(strategy)) {
        strategies.add(strategy);
      }
    }
    
    return Array.from(strategies);
  }
  
  /**
   * Extract CDN domains
   */
  private extractCDNDomains(content: string): string[] {
    const domains = new Set<string>();
    
    const urlPattern = /https?:\/\/([a-zA-Z0-9.-]+\.(?:perplexity\.ai|cloudflare\.com|amazonaws\.com|googleapis\.com|cloudfront\.net))/g;
    let match;
    
    while ((match = urlPattern.exec(content)) !== null) {
      domains.add(match[1]);
    }
    
    return Array.from(domains);
  }
}
