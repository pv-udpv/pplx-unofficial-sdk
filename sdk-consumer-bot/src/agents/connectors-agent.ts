/**
 * Connectors Agent - Handles OAuth connector integration
 */

import { Formatter } from '../utils/formatter';

export class ConnectorsAgent {
  private sdk: any;
  
  constructor(sdk: any) {
    this.sdk = sdk;
  }
  
  /**
   * Search with OAuth connectors
   */
  async searchWithConnectors(query: string, connectorIds: string[]): Promise<void> {
    console.log(`🔌 Searching with connectors: ${connectorIds.join(', ')}`);
    
    // Verify connectors are connected
    for (const id of connectorIds) {
      try {
        const status = await this.sdk.connectors.getStatus(id);
        if (!status.connected) {
          console.warn(`⚠️  ${id} not connected!`);
        } else {
          console.log(`✅ ${id} is connected`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not verify ${id} status:`, error);
      }
    }
    
    // Search with connector sources
    console.log(`\n🔍 Searching: ${query}`);
    
    try {
      for await (const entry of this.sdk.stream.search(query, {
        sources: connectorIds,
        focus: 'writing'
      })) {
        // Progress indicator (only if running in a TTY)
        if (process.stdout.isTTY) {
          process.stdout.write('.');
        }
        
        if (entry.sources_list) {
          this.displayConnectorResults(entry.sources_list);
        }
        
        if (entry.final) {
          console.log('\n');
          console.log(Formatter.formatBlocks(entry.blocks));
          break;
        }
      }
    } catch (error) {
      console.error('\n❌ Connector search failed:', error);
      throw error;
    }
  }
  
  /**
   * List files from a connector
   */
  async *listFiles(connectorId: string, options?: { limit?: number }): AsyncGenerator<any> {
    console.log(`📂 Listing files from ${connectorId}...`);
    
    try {
      let count = 0;
      const limit = options?.limit || 100;
      
      for await (const file of this.sdk.connectors.listFiles(connectorId, options)) {
        yield file;
        count++;
        
        if (count >= limit) {
          break;
        }
      }
      
      console.log(`✅ Listed ${count} files`);
    } catch (error) {
      console.error(`❌ Failed to list files from ${connectorId}:`, error);
      throw error;
    }
  }
  
  /**
   * Sync files from connector
   */
  async syncFiles(connectorId: string, fileIds: string[]): Promise<void> {
    console.log(`🔄 Syncing ${fileIds.length} files from ${connectorId}...`);
    
    try {
      await this.sdk.connectors.syncFiles(connectorId, fileIds);
      console.log('✅ Sync complete!');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Get connector status
   */
  async getStatus(connectorId: string): Promise<any> {
    try {
      return await this.sdk.connectors.getStatus(connectorId);
    } catch (error) {
      console.error(`❌ Failed to get status for ${connectorId}:`, error);
      throw error;
    }
  }
  
  /**
   * Display connector-specific results
   */
  private displayConnectorResults(sources: any[]): void {
    const connectorSources = sources.filter(s => s.is_attachment);
    
    if (connectorSources.length > 0) {
      console.log('\n\n📎 Connector Sources:');
      connectorSources.forEach(s => {
        console.log(`  📄 ${s.title || s.name} (from connector)`);
      });
    }
  }
  
  /**
   * List all connectors and their status
   */
  async listConnectors(): Promise<any[]> {
    try {
      const connectors = await this.sdk.getConnectorsStatus();
      
      console.log('\n🔌 Available Connectors:');
      connectors.forEach((c: any) => {
        const status = c.connected ? '✅ Connected' : '❌ Not connected';
        console.log(`  ${c.name || c.id}: ${status}`);
      });
      
      return connectors;
    } catch (error) {
      console.error('❌ Failed to list connectors:', error);
      throw error;
    }
  }
}
