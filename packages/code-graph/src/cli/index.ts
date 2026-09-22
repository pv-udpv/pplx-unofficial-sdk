#!/usr/bin/env node
// ============================================================================
// Code Graph CLI
// ============================================================================

import { Command } from 'commander';
import { bootstrapCommand } from './commands/bootstrap';
import { monitorCommand } from './commands/monitor';
import { queryCommand } from './commands/query';

const program = new Command();

program
  .name('pplx-graph')
  .description('Code dependency graph and call chain analysis for Perplexity AI')
  .version('1.0.0');

// Bootstrap command
program
  .command('bootstrap')
  .description('Analyze application bootstrap sequence')
  .option('--sw-url <url>', 'Service Worker URL (auto-detected if not provided)')
  .option('--no-auto-detect', 'Disable version auto-detection')
  .option('--output <path>', 'Output file path', 'bootstrap-analysis.json')
  .option('--format <format>', 'Output format (json, markdown, mermaid)', 'json')
  .action(bootstrapCommand);

// Monitor command
program
  .command('monitor')
  .description('Monitor Service Worker version changes')
  .option('--interval <ms>', 'Check interval in milliseconds', '300000')
  .option('--webhook <url>', 'Webhook URL for notifications')
  .action(monitorCommand);

// Query command
program
  .command('query <type>')
  .description('Query the code graph (how-to-reach, where-is, contexts)')
  .argument('<endpoint>', 'Endpoint or module to query')
  .option('--format <format>', 'Output format (json, markdown, mermaid)', 'markdown')
  .action(queryCommand);

program.parse();
