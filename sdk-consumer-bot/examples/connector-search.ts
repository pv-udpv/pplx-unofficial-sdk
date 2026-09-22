/**
 * Connector Search Example
 * 
 * Demonstrates how to search across connected sources
 * like Google Drive, Notion, etc.
 */

import { PplxBot } from '../src/bot';

async function main() {
  const bot = new PplxBot();
  
  console.log('🔌 Connector Search Example\n');
  
  // Example 1: List available connectors
  console.log('Example 1: List Connectors\n');
  
  const connectors = await bot.connectors.listConnectors();
  const connectedOnes = connectors.filter(c => c.connected);
  
  console.log(`\nConnected connectors: ${connectedOnes.length}`);
  
  console.log('\n---\n');
  
  // Example 2: List files from a connector
  console.log('Example 2: List Files from Google Drive\n');
  
  try {
    let fileCount = 0;
    const files: any[] = [];
    
    for await (const file of bot.connectors.listFiles('google_drive', { limit: 5 })) {
      files.push(file);
      console.log(`  ${++fileCount}. ${file.name} (${file.size || 0} bytes)`);
    }
    
    console.log(`\nTotal files listed: ${fileCount}`);
  } catch (error) {
    console.log('⚠️  Could not list files (connector may not be connected)');
  }
  
  console.log('\n---\n');
  
  // Example 3: Search with connectors
  console.log('Example 3: Search with Connectors\n');
  
  await bot.connectors.searchWithConnectors(
    'team roadmap Q1 2026',
    ['google_drive']
  );
  
  console.log('\n---\n');
  
  // Example 4: Summarize connector documents
  console.log('Example 4: Summarize Connector Docs\n');
  
  await bot.summarizeConnectorDocs(
    'google_drive',
    'summarize recent project documents'
  );
  
  console.log('\n✅ Connector examples complete!');
}

// Run the example
main().catch(console.error);
