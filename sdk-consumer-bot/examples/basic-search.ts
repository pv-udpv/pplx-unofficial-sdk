/**
 * Basic Search Example
 * 
 * Demonstrates how to perform a simple streaming search
 * and display results in real-time.
 */

import { PplxBot } from '../src/bot';

async function main() {
  const bot = new PplxBot();
  
  console.log('🔍 Basic Search Example\n');
  
  // Perform a basic search
  const query = 'What is quantum computing?';
  console.log(`Searching for: "${query}"\n`);
  
  for await (const result of bot.search.search(query, {
    focus: 'internet',
    model: 'turbo'
  })) {
    if (result.final) {
      console.log('\n📄 Final Answer:');
      console.log(result.content);
      
      if (result.sources.length > 0) {
        console.log('\n📚 Sources:');
        result.sources.forEach((source: any, index: number) => {
          console.log(`  [${index + 1}] ${source.title || 'Unknown'}`);
        });
      }
    }
  }
  
  console.log('\n✅ Search complete!');
}

// Run the example
main().catch(console.error);
