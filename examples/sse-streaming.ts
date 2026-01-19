/**
 * Example: SSE Streaming with Perplexity AI
 * Demonstrates how to use the streaming client
 */

import { createPplxClient } from '../src/pplx-client';

async function main() {
  // Create client
  const client = createPplxClient({
    enableAutoReconnect: true,
    enableRateLimiting: true,
  });

  // Subscribe to events
  client.on('created', (event) => {
    console.log('🚀 Stream created:', event.query);
  });

  client.on('progress', (event) => {
    if (event.stream.status === 'PENDING') {
      console.log('⏳ Processing...');
    }
  });

  client.on('completed', (event) => {
    console.log('✅ Stream completed!');
    console.log('📊 Final blocks:', event.stream.blocks.length);
  });

  client.on('error', (event) => {
    console.error('❌ Error:', event.error?.message);
  });

  try {
    console.log('Starting search...\n');

    // Perform streaming search
    for await (const entry of client.search('What is quantum computing?', {
      focus: 'internet',
      model: 'sonar-pro',
    })) {
      console.log(`Status: ${entry.status}`);
      
      if (entry.blocks && entry.blocks.length > 0) {
        const textBlock = entry.blocks.find(b => b.text);
        if (textBlock?.text) {
          // Show first 100 chars of response
          const preview = textBlock.text.substring(0, 100);
          console.log(`Response: ${preview}...`);
        }
      }

      if (entry.final) {
        console.log('\n📝 Final Answer:');
        console.log(entry.blocks);
        
        if (entry.sources_list) {
          console.log('\n🔗 Sources:');
          entry.sources_list.forEach((source, i) => {
            console.log(`${i + 1}. ${source}`);
          });
        }
      }
    }

    // Check rate limit status
    const rateLimit = client.getRateLimitStatus();
    console.log('\n📊 Rate Limit Status:');
    console.log(`  Minute: ${rateLimit.minuteRemaining} remaining`);
    console.log(`  Hour: ${rateLimit.hourRemaining} remaining`);

    // Get statistics
    const stats = client.getStats();
    console.log('\n📈 Statistics:');
    console.log(`  Active streams: ${stats.activeStreams}`);
    console.log(`  Reconnectable: ${stats.reconnectableStreams}`);

  } catch (error) {
    console.error('Failed:', error);
  } finally {
    // Cleanup
    client.close();
  }
}

// Run example
main().catch(console.error);
