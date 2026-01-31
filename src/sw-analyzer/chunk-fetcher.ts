import { gunzipSync } from 'zlib';

export interface ChunkFetchOptions {
  baseUrl?: string;
  userAgent?: string;
  decompress?: boolean;
}

export class ChunkFetcher {
  private readonly baseUrl: string;
  private readonly userAgent?: string;
  
  constructor(options: ChunkFetchOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://pplx-next-static-public.perplexity.ai/spa/assets';
    this.userAgent = options.userAgent;
  }
  
  /**
   * Fetch chunk content by ID
   * 
   * @param chunkId - Chunk identifier (e.g., "vendors-CJDRK6rq")
   * @returns Chunk content
   */
  async fetchChunk(chunkId: string): Promise<string> {
    const url = `${this.baseUrl}/${chunkId}.js`;
    
    const headers: HeadersInit = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
    };
    
    if (this.userAgent) {
      headers['User-Agent'] = this.userAgent;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chunk ${chunkId}: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    return this.decompress(buffer);
  }
  
  /**
   * Fetch source map for chunk
   */
  async fetchSourceMap(chunkId: string): Promise<any> {
    const url = `https://pplx-static-sourcemaps.perplexity.ai/_spa/assets/${chunkId}.js.map`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch source map for ${chunkId}: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Fetch multiple chunks in parallel
   */
  async fetchChunks(chunkIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    await Promise.all(
      chunkIds.map(async (id) => {
        try {
          const content = await this.fetchChunk(id);
          results.set(id, content);
        } catch (error) {
          console.error(`Failed to fetch chunk ${id}:`, error);
        }
      })
    );
    
    return results;
  }
  
  private decompress(buffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(buffer);
    
    if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
      const decompressed = gunzipSync(Buffer.from(uint8Array));
      return decompressed.toString('utf-8');
    }
    
    return new TextDecoder().decode(uint8Array);
  }
}
