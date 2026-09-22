#!/usr/bin/env node
/**
 * CLI Interface for Perplexity SDK Consumer Bot
 */

import { Command } from 'commander';
import { PplxBot } from './bot';

const program = new Command();

program
  .name('pplx-bot')
  .description('Perplexity SDK Consumer Bot - Demonstrates full SDK capabilities')
  .version('1.0.0');

// Search command
program
  .command('search <query>')
  .description('Perform a streaming search')
  .option('-f, --focus <type>', 'Search focus (internet, academic, writing, etc.)', 'internet')
  .option('-m, --model <type>', 'Model preference (turbo, experimental, sonar-pro)', 'turbo')
  .option('-r, --recency <period>', 'Recency filter (day, week, month, year)')
  .action(async (query, options) => {
    try {
      const bot = new PplxBot();
      
      console.log(`\n🤖 Perplexity Bot - Search Mode`);
      console.log(`Query: ${query}`);
      console.log(`Focus: ${options.focus}`);
      console.log(`Model: ${options.model}\n`);
      
      for await (const result of bot.search.search(query, {
        focus: options.focus,
        model: options.model,
        recency: options.recency
      })) {
        if (result.final) {
          console.log('\n📄 Final Answer:');
          console.log(result.content);
          
          if (result.sources.length > 0) {
            console.log('\n📚 Sources:');
            result.sources.forEach((s: any, i: number) => {
              console.log(`  [${i + 1}] ${s.title || s.name || 'Unknown'}`);
            });
          }
        }
      }
    } catch (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }
  });

// Chat command
program
  .command('chat <title> <query>')
  .description('Start a new conversation thread')
  .option('-s, --save <collection>', 'Save to collection')
  .action(async (title, query, options) => {
    try {
      const bot = new PplxBot();
      
      console.log(`\n🤖 Perplexity Bot - Chat Mode`);
      
      const { thread, entryUuid } = await bot.chat.createThread(title, query);
      
      console.log(`\n📝 Thread created: ${thread.uuid}`);
      console.log(`📌 Entry UUID: ${entryUuid}`);
      
      if (options.save) {
        await bot.chat.saveToCollection(thread.uuid, options.save);
      }
      
      console.log('\n✅ Done!');
    } catch (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }
  });

// Connectors search command
program
  .command('connectors-search <query>')
  .description('Search with OAuth connectors')
  .option('-c, --connectors <ids...>', 'Connector IDs (e.g., google_drive, notion)', ['google_drive'])
  .action(async (query, options) => {
    try {
      const bot = new PplxBot();
      
      console.log(`\n🤖 Perplexity Bot - Connectors Search`);
      
      await bot.connectors.searchWithConnectors(query, options.connectors);
      
      console.log('\n✅ Done!');
    } catch (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }
  });

// List connectors command
program
  .command('connectors-list')
  .description('List all available connectors and their status')
  .action(async () => {
    try {
      const bot = new PplxBot();
      
      console.log(`\n🤖 Perplexity Bot - Connectors List`);
      
      await bot.connectors.listConnectors();
      
      console.log('\n✅ Done!');
    } catch (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }
  });

// List files command
program
  .command('connectors-files <connectorId>')
  .description('List files from a connector')
  .option('-l, --limit <number>', 'Limit number of files', '20')
  .action(async (connectorId, options) => {
    try {
      const bot = new PplxBot();
      
      console.log(`\n🤖 Perplexity Bot - Connector Files`);
      
      let count = 0;
      for await (const file of bot.connectors.listFiles(connectorId, {
        limit: parseInt(options.limit)
      })) {
        console.log(`  ${++count}. ${file.name} (${file.size || 0} bytes)`);
      }
      
      console.log(`\n✅ Listed ${count} files`);
    } catch (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }
  });

// Research command
program
  .command('research <topic>')
  .description('Research a topic with automated follow-ups')
  .option('-d, --depth <number>', 'Number of follow-up questions', '3')
  .action(async (topic, options) => {
    try {
      const bot = new PplxBot();
      
      console.log(`\n🤖 Perplexity Bot - Research Mode`);
      
      await bot.researchTopic(topic, parseInt(options.depth));
      
      console.log('\n✅ Done!');
    } catch (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }
  });

// Summarize connector docs command
program
  .command('summarize <connectorId> <query>')
  .description('Summarize documents from a connector')
  .action(async (connectorId, query) => {
    try {
      const bot = new PplxBot();
      
      console.log(`\n🤖 Perplexity Bot - Summarize Mode`);
      
      await bot.summarizeConnectorDocs(connectorId, query);
      
      console.log('\n✅ Done!');
    } catch (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }
  });

// List threads command
program
  .command('threads')
  .description('List recent conversation threads')
  .option('-l, --limit <number>', 'Number of threads to list', '20')
  .action(async (options) => {
    try {
      const bot = new PplxBot();
      
      console.log(`\n🤖 Perplexity Bot - Threads List`);
      
      const threads = await bot.chat.listThreads(parseInt(options.limit));
      
      console.log(`\n📝 Found ${threads.length} threads:\n`);
      threads.forEach((thread: any, i: number) => {
        console.log(`  ${i + 1}. ${thread.title || 'Untitled'} (${thread.uuid})`);
      });
      
      console.log('\n✅ Done!');
    } catch (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
