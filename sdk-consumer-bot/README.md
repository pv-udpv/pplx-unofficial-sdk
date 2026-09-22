> Runtime requirement: Node.js 22.12 or newer (Commander 15 uses ESM).

# Perplexity SDK Consumer Bot

> An intelligent bot that demonstrates the full capabilities of `@pplx-unofficial/sdk`

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

## 🎯 Overview

The SDK Consumer Bot is a reference implementation showcasing how to use the Perplexity unofficial SDK for:

- **Real-time Search** - Stream search results using SSE
- **Conversation Management** - Create and manage threads with REST API
- **Connector Integration** - Search across connected sources (Google Drive, Notion, etc.)
- **Multi-modal Interface** - CLI for terminal usage and programmatic API

## 📦 Installation

```bash
cd sdk-consumer-bot
npm install
```

## 🔧 Setup

### Environment Variables

Create a `.env` file in the `sdk-consumer-bot` directory:

```bash
PPLX_BASE_URL=https://www.perplexity.ai
PPLX_JWT=<your-cookie-value>
```

To get your JWT cookie:
1. Go to https://www.perplexity.ai
2. Open DevTools (F12)
3. Go to Application > Cookies
4. Copy the value of the cookie (usually named after your session)

### Build

```bash
npm run build
```

This compiles TypeScript to the `dist/` directory.

## 🚀 Usage

### CLI Commands

#### Search

Perform a streaming search:

```bash
# Basic search
pplx-bot search "quantum computing"

# With options
pplx-bot search "AI trends 2026" --focus academic --model experimental

# With recency filter
pplx-bot search "latest news" --recency day
```

#### Chat

Start a conversation thread:

```bash
# Create thread
pplx-bot chat "ML Research" "explain transformers"

# Create and save to collection
pplx-bot chat "AI Papers" "neural networks" --save "Research"
```

#### Connectors

Work with OAuth connectors:

```bash
# List available connectors
pplx-bot connectors-list

# List files from a connector
pplx-bot connectors-files google_drive --limit 20

# Search with connectors
pplx-bot connectors-search "team docs" -c google_drive notion

# Summarize connector documents
pplx-bot summarize google_drive "project roadmap Q1"
```

#### Research

Automated research with follow-ups:

```bash
# Research topic with 3 follow-ups
pplx-bot research "GraphQL vs REST"

# Custom depth
pplx-bot research "climate change" --depth 5
```

#### Threads

List conversation threads:

```bash
# List recent threads
pplx-bot threads

# List more threads
pplx-bot threads --limit 50
```

### Programmatic API

Use the bot in your Node.js applications:

#### Example 1: Basic Search

```typescript
import { PplxBot } from '@pplx-bot/cli';

const bot = new PplxBot();

// Stream search results
for await (const result of bot.search.search('quantum computing')) {
  console.log(result.content);
  if (result.final) break;
}
```

#### Example 2: Conversation

```typescript
import { PplxBot } from '@pplx-bot/cli';

const bot = new PplxBot();

// Create thread and search
const { thread, entryUuid } = await bot.chat.createThread(
  'ML Research',
  'What are transformers in AI?'
);

// Like the entry
await bot.chat.likeEntry(entryUuid);

// Save to collection
await bot.chat.saveToCollection(thread.uuid, 'AI Research');
```

#### Example 3: Research Workflow

```typescript
import { PplxBot } from '@pplx-bot/cli';

const bot = new PplxBot();

// Automated research with follow-ups
await bot.researchTopic('GraphQL vs REST', 3);
// Creates thread, performs initial search, 3 follow-ups, saves to collection
```

#### Example 4: Connector Search

```typescript
import { PplxBot } from '@pplx-bot/cli';

const bot = new PplxBot();

// Search across Google Drive
await bot.connectors.searchWithConnectors(
  'team roadmap Q1 2026',
  ['google_drive']
);

// Summarize documents
await bot.summarizeConnectorDocs(
  'google_drive',
  'project status updates'
);
```

## 📁 Project Structure

```
sdk-consumer-bot/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── bot.ts           # Main bot class (orchestrator)
│   ├── cli.ts           # CLI interface with Commander
│   ├── types.ts         # Bot-specific TypeScript types
│   ├── agents/
│   │   ├── search-agent.ts      # Streaming search agent
│   │   ├── chat-agent.ts        # Conversation manager
│   │   └── connectors-agent.ts  # OAuth connector integration
│   └── utils/
│       ├── formatter.ts  # Output formatting utilities
│       └── logger.ts     # Logging utilities
├── examples/
│   ├── basic-search.ts         # Basic search example
│   ├── conversation.ts         # Conversation management
│   └── connector-search.ts     # Connector integration
└── README.md            # This file
```

## 🎨 Features

### Search Agent

- ✅ Real-time streaming with SSE
- ✅ Progress indicators
- ✅ Follow-up question support
- ✅ Multiple focus modes (internet, academic, writing, etc.)
- ✅ Source attribution

### Chat Agent

- ✅ Thread creation and management
- ✅ Entry liking/bookmarking
- ✅ Conversation forking
- ✅ Collection (Spaces) support
- ✅ Thread listing

### Connectors Agent

- ✅ OAuth connector status checking
- ✅ File listing from connectors
- ✅ File synchronization
- ✅ Connector-specific search
- ✅ Multi-connector support

### Bot Orchestrator

- ✅ High-level research workflows
- ✅ Automated follow-up generation
- ✅ Document summarization
- ✅ Mock SDK for development

## 🧪 Examples

See the `examples/` directory for complete working examples:

- **basic-search.ts** - Simple search demonstration
- **conversation.ts** - Thread management and follow-ups
- **connector-search.ts** - OAuth connector integration

Run examples with:

```bash
npx tsx examples/basic-search.ts
npx tsx examples/conversation.ts
npx tsx examples/connector-search.ts
```

## 🛠️ Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Type Check

```bash
npm run typecheck
```

## 📝 Notes

### SDK Dependency

This bot depends on `@pplx-unofficial/sdk`. If the SDK is not available, the bot will use a mock SDK for development and testing purposes. The mock SDK provides the same interface but returns simulated data.

### Environment Variables

The bot respects the following environment variables:

- `PPLX_BASE_URL` - Base URL for Perplexity API (default: https://www.perplexity.ai)
- `PPLX_JWT` - JWT token from Perplexity cookies

## 🚧 Limitations

- Requires valid Perplexity session cookie
- Some features depend on Pro/Enterprise subscription
- Connectors require OAuth setup
- Rate limits apply based on account tier

## 📄 License

MIT License - see [LICENSE](../LICENSE) file

## 🔗 Links

- [Parent SDK Repository](https://github.com/pv-udpv/pplx-unofficial-sdk)
- [Issue Tracker](https://github.com/pv-udpv/pplx-unofficial-sdk/issues)
- [Perplexity AI](https://www.perplexity.ai)

## 🤝 Contributing

Contributions welcome! This bot serves as a reference implementation and can be extended with:

- Web UI (Next.js)
- Local caching (SQLite)
- Analytics tracking
- Desktop notifications
- Autonomous mode

---

**Built with ❤️ to showcase the Perplexity SDK**
