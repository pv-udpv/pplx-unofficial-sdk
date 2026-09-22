/**
 * Chat Agent - Manages conversations with REST API
 */

import type { ThreadInfo } from '../types';

export class ChatAgent {
  private sdk: any;
  
  constructor(sdk: any) {
    this.sdk = sdk;
  }
  
  /**
   * Create a new thread and perform initial search
   */
  async createThread(title: string, firstQuery: string): Promise<ThreadInfo> {
    console.log(`📝 Creating thread: "${title}"`);
    
    try {
      // Create thread
      const thread = await this.sdk.rest.createThread({ title });
      console.log(`✅ Thread created: ${thread.uuid}`);
      
      // Perform search
      let entryUuid = '';
      console.log(`🔍 Executing query: "${firstQuery}"`);
      
      for await (const entry of this.sdk.stream.search(firstQuery)) {
        if (entry.backend_uuid) {
          entryUuid = entry.backend_uuid;
        }
        if (entry.final) {
          console.log('✅ Query complete!');
          break;
        }
      }
      
      return { thread, entryUuid };
    } catch (error) {
      console.error('❌ Thread creation failed:', error);
      throw error;
    }
  }
  
  /**
   * Like an entry
   */
  async likeEntry(entryUuid: string): Promise<void> {
    try {
      await this.sdk.rest.likeEntry(entryUuid);
      console.log('👍 Liked!');
    } catch (error) {
      console.error('❌ Failed to like entry:', error);
      throw error;
    }
  }
  
  /**
   * Fork a conversation
   */
  async forkConversation(entryUuid: string, newQuery: string): Promise<any> {
    console.log('🍴 Forking conversation...');
    
    try {
      const forked = await this.sdk.rest.forkEntry(entryUuid, { query: newQuery });
      console.log('✅ Conversation forked!');
      return forked;
    } catch (error) {
      console.error('❌ Fork failed:', error);
      throw error;
    }
  }
  
  /**
   * Save thread to collection
   */
  async saveToCollection(threadUuid: string, collectionName: string): Promise<void> {
    try {
      // Find or create collection
      let collection = await this.findCollection(collectionName);
      
      if (!collection) {
        console.log(`📁 Creating collection: "${collectionName}"`);
        collection = await this.sdk.rest.createCollection({ name: collectionName });
      }
      
      // Add thread to collection
      await this.sdk.rest.addThreadToCollection(collection.uuid, threadUuid);
      console.log(`📁 Saved to "${collectionName}"`);
    } catch (error) {
      console.error('❌ Failed to save to collection:', error);
      throw error;
    }
  }
  
  /**
   * Find collection by name
   */
  private async findCollection(name: string): Promise<any | null> {
    try {
      const collections = await this.sdk.rest.listCollections();
      return collections.find((c: any) => c.name === name) || null;
    } catch (error) {
      console.error('❌ Failed to list collections:', error);
      return null;
    }
  }
  
  /**
   * List all threads
   */
  async listThreads(limit: number = 20): Promise<any[]> {
    try {
      const result = await this.sdk.rest.listThreads({ limit });
      return result.items || [];
    } catch (error) {
      console.error('❌ Failed to list threads:', error);
      throw error;
    }
  }
  
  /**
   * Get thread details
   */
  async getThread(threadUuid: string): Promise<any> {
    try {
      return await this.sdk.rest.getThread(threadUuid);
    } catch (error) {
      console.error('❌ Failed to get thread:', error);
      throw error;
    }
  }
}
