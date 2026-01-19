/**
 * PplxBot - Main orchestrator for SDK Consumer Bot
 */

import { SearchAgent } from './agents/search-agent';
import { ChatAgent } from './agents/chat-agent';
import { ConnectorsAgent } from './agents/connectors-agent';
import type { BotConfig } from './types';

export class PplxBot {
  private sdk: any;
  public search: SearchAgent;
  public chat: ChatAgent;
  public connectors: ConnectorsAgent;
  
  constructor(config?: BotConfig) {
    // Note: This assumes the SDK will be available
    // For now, we'll use a placeholder until the SDK is implemented
    try {
      // Try to load the SDK if available (using CommonJS require for simplicity)
      // In production, the SDK would be properly installed as a dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createPplxSDK } = require('@pplx-unofficial/sdk');
      this.sdk = createPplxSDK(config);
    } catch (error) {
      // Fallback for development/testing when SDK is not available
      console.warn('⚠️  SDK not available, using mock SDK');
      this.sdk = this.createMockSDK();
    }
    
    this.search = new SearchAgent(this.sdk);
    this.chat = new ChatAgent(this.sdk);
    this.connectors = new ConnectorsAgent(this.sdk);
  }
  
  /**
   * High-level workflow: Research a topic with follow-ups
   */
  async researchTopic(topic: string, depth: number = 3): Promise<any> {
    console.log(`🔬 Researching: ${topic}`);
    
    try {
      // Create thread
      const thread = await this.chat.createThread(`Research: ${topic}`, topic);
      
      // Generate follow-up questions
      const followUps = await this.generateFollowUps(topic, depth);
      
      if (followUps.length > 0) {
        console.log(`\n📝 Generated ${followUps.length} follow-up questions`);
        
        // Execute follow-ups
        await this.search.searchWithFollowUp(topic, followUps);
      }
      
      // Save to collection
      await this.chat.saveToCollection(thread.thread.uuid, 'Research');
      
      console.log('\n✅ Research complete!');
      return thread;
    } catch (error) {
      console.error('❌ Research failed:', error);
      throw error;
    }
  }
  
  /**
   * Summarize documents from a connector
   */
  async summarizeConnectorDocs(connectorId: string, query: string): Promise<void> {
    console.log(`📚 Summarizing docs from ${connectorId}...`);
    
    try {
      // List recent files
      const files: any[] = [];
      for await (const file of this.connectors.listFiles(connectorId, { limit: 10 })) {
        files.push(file);
        console.log(`  - ${file.name} (${file.size || 0} bytes)`);
      }
      
      if (files.length === 0) {
        console.warn('⚠️  No files found');
        return;
      }
      
      // Sync files
      await this.connectors.syncFiles(connectorId, files.map(f => f.id));
      
      // Search with connector
      await this.connectors.searchWithConnectors(query, [connectorId]);
    } catch (error) {
      console.error('❌ Summarization failed:', error);
      throw error;
    }
  }
  
  /**
   * Generate follow-up questions using the SDK
   */
  private async generateFollowUps(topic: string, depth: number): Promise<string[]> {
    try {
      const followUps: string[] = [];
      
      // Sanitize topic input to prevent query injection
      const sanitizedTopic = topic.replace(/[^\w\s-]/g, '').trim();
      
      // Use SDK to generate related queries
      for await (const entry of this.sdk.stream.search(`related questions about ${sanitizedTopic}`)) {
        if (entry.related_queries && Array.isArray(entry.related_queries)) {
          followUps.push(...entry.related_queries.slice(0, depth));
        }
        if (entry.final) break;
      }
      
      return followUps.slice(0, depth);
    } catch (error) {
      console.warn('⚠️  Could not generate follow-ups:', error);
      return [];
    }
  }
  
  /**
   * Create a mock SDK for development/testing
   */
  private createMockSDK(): any {
    return {
      stream: {
        search: async function* (query: string, options?: any) {
          yield {
            status: 'STARTED',
            blocks: [{ text: 'Mock search result for: ' + query }],
            sources_list: [],
            final: false,
            backend_uuid: 'mock-uuid',
            context_uuid: 'mock-context-uuid'
          };
          yield {
            status: 'COMPLETED',
            blocks: [{ text: 'Mock search result for: ' + query }],
            sources_list: [{ title: 'Mock Source', url: 'https://example.com' }],
            final: true,
            backend_uuid: 'mock-uuid',
            context_uuid: 'mock-context-uuid'
          };
        },
        followUp: async function* (query: string, contextUuid: string) {
          yield {
            status: 'COMPLETED',
            blocks: [{ text: 'Mock follow-up result for: ' + query }],
            sources_list: [],
            final: true
          };
        }
      },
      rest: {
        createThread: async (params: any) => ({ uuid: 'mock-thread-uuid', ...params }),
        listThreads: async () => ({ items: [] }),
        getThread: async (uuid: string) => ({ uuid }),
        likeEntry: async () => ({ success: true }),
        forkEntry: async () => ({ uuid: 'mock-fork-uuid' }),
        createCollection: async (params: any) => ({ uuid: 'mock-collection-uuid', ...params }),
        listCollections: async () => [],
        addThreadToCollection: async () => ({ success: true })
      },
      connectors: {
        getStatus: async (id: string) => ({ id, connected: false }),
        listFiles: async function* (id: string, options?: any) {
          yield { id: 'mock-file-1', name: 'Mock File 1.pdf', size: 1024 };
          yield { id: 'mock-file-2', name: 'Mock File 2.docx', size: 2048 };
        },
        syncFiles: async () => ({ success: true })
      },
      getConnectorsStatus: async () => [
        { id: 'google_drive', name: 'Google Drive', connected: false },
        { id: 'notion', name: 'Notion', connected: false }
      ]
    };
  }
}

// Export for use in other modules
export * from './types';
export { SearchAgent } from './agents/search-agent';
export { ChatAgent } from './agents/chat-agent';
export { ConnectorsAgent } from './agents/connectors-agent';
