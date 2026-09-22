/**
 * Conversation Example
 * 
 * Demonstrates how to create a thread, perform searches,
 * and manage conversations with follow-up questions.
 */

import { PplxBot } from '../src/bot';

async function main() {
  const bot = new PplxBot();
  
  console.log('💬 Conversation Example\n');
  
  // Example 1: Simple conversation with follow-ups
  console.log('Example 1: Search with Follow-ups\n');
  
  await bot.search.searchWithFollowUp(
    'What is machine learning?',
    [
      'Explain supervised learning',
      'What are neural networks?'
    ]
  );
  
  console.log('\n---\n');
  
  // Example 2: Create a thread and save to collection
  console.log('Example 2: Create Thread and Save\n');
  
  const { thread, entryUuid } = await bot.chat.createThread(
    'ML Research',
    'Explain transformer models in AI'
  );
  
  console.log(`Thread UUID: ${thread.uuid}`);
  console.log(`Entry UUID: ${entryUuid}`);
  
  // Save to a collection
  await bot.chat.saveToCollection(thread.uuid, 'AI Research');
  
  console.log('\n---\n');
  
  // Example 3: Like an entry
  console.log('Example 3: Like Entry\n');
  
  if (entryUuid) {
    await bot.chat.likeEntry(entryUuid);
  }
  
  console.log('\n✅ Conversation examples complete!');
}

// Run the example
main().catch(console.error);
