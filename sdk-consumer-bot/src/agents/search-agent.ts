/**
 * Search Agent - Handles streaming search with SSE
 */

import type { SearchOptions, SearchResult } from '../types';
import { Formatter } from '../utils/formatter';

export class SearchAgent {
  private sdk: any;
  
  constructor(sdk: any) {
    this.sdk = sdk;
  }
  
  /**
   * Perform a streaming search
   */
  async *search(query: string, options?: SearchOptions): AsyncGenerator<SearchResult> {
    console.log(`🔍 Searching: ${query}`);
    
    try {
      for await (const entry of this.sdk.stream.search(query, options)) {
        // Progress indicator (only if running in a TTY)
        if (process.stdout.isTTY) {
          process.stdout.write('.');
        }
        
        // Yield incremental updates
        yield {
          status: entry.status || 'STREAMING',
          content: Formatter.formatBlocks(entry.blocks),
          sources: entry.sources_list || [],
          final: entry.final || false,
          entry: entry
        };
        
        if (entry.final) {
          console.log('\n✅ Search complete!');
          break;
        }
      }
    } catch (error) {
      console.error('\n❌ Search failed:', error);
      throw error;
    }
  }
  
  /**
   * Search with follow-up questions
   */
  async searchWithFollowUp(initialQuery: string, followUpQueries: string[]): Promise<void> {
    // Initial search
    let contextUuid = '';
    console.log(`\n🔍 Initial query: ${initialQuery}`);
    
    for await (const result of this.search(initialQuery)) {
      if (result.entry && result.entry.context_uuid) {
        contextUuid = result.entry.context_uuid;
      }
      if (result.final) {
        console.log('\nAnswer:', result.content);
        if (result.sources.length > 0) {
          console.log('\nSources:');
          console.log(Formatter.formatSources(result.sources));
        }
        break;
      }
    }
    
    // Follow-up questions
    if (!contextUuid) {
      console.warn('⚠️  No context UUID found, cannot perform follow-ups');
      return;
    }
    
    for (const followUp of followUpQueries) {
      console.log(`\n💬 Follow-up: ${followUp}`);
      
      try {
        for await (const entry of this.sdk.stream.followUp(followUp, contextUuid)) {
          // Progress indicator (only if running in a TTY)
          if (process.stdout.isTTY) {
            process.stdout.write('.');
          }
          
          if (entry.final) {
            console.log('\n');
            console.log(Formatter.formatBlocks(entry.blocks));
            
            if (entry.sources_list && entry.sources_list.length > 0) {
              console.log('\nSources:');
              console.log(Formatter.formatSources(entry.sources_list));
            }
            break;
          }
        }
      } catch (error) {
        console.error(`\n❌ Follow-up failed: ${error}`);
      }
    }
  }
}
