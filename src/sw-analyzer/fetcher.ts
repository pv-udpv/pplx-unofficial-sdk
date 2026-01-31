import { gunzipSync } from 'zlib';

export class ServiceWorkerFetcher {
  private readonly baseUrl = 'https://www.perplexity.ai';
  
  constructor(
    private readonly userAgent?: string,
  ) {}
  
  /**
   * Fetch Service Worker content
   * 
   * @param version - Optional version hash (e.g., '104241e')
   * @returns Decompressed Service Worker content
   */
  async fetch(version?: string): Promise<string> {
    const url = version
      ? `${this.baseUrl}/service-worker.js?v=${version}`
      : `${this.baseUrl}/service-worker.js`;
    
    const headers: HeadersInit = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
    };
    
    if (this.userAgent) {
      headers['User-Agent'] = this.userAgent;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch SW: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    return this.decompress(buffer);
  }
  
  /**
   * Auto-detect and decompress gzip content
   */
  private decompress(buffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(buffer);
    
    // Check for gzip magic number (0x1f 0x8b)
    if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
      const decompressed = gunzipSync(Buffer.from(uint8Array));
      return decompressed.toString('utf-8');
    }
    
    // Not gzipped
    return new TextDecoder().decode(uint8Array);
  }
  
  /**
   * Fetch application version
   */
  async fetchVersion(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/version`);
    const data = await response.json();
    return data.version;
  }
}
