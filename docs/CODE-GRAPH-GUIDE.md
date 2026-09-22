# Code Graph Analysis Guide

> Complete guide to building and analyzing code dependency graphs for Perplexity AI

## Overview

The `@pplx-unofficial/code-graph` package provides tools for:

- 🔍 **Service Worker Version Auto-Detection** - Automatically detect SW versions
- 📦 **Bootstrap Analysis** - Analyze application initialization sequences
- 🕸️ **Module Dependency Graphs** - Build complete module dependency graphs
- 📞 **Call Chain Tracing** - Trace function calls from UI to API endpoints
- 📊 **Multiple Export Formats** - GraphML, Mermaid, Markdown, JSON

## Installation

```bash
# Install the code-graph package
cd packages/code-graph
npm install
npm run build

# Or install globally to use CLI
npm install -g @pplx-unofficial/code-graph
```

## Quick Start

### CLI Usage

#### 1. Bootstrap Analysis

Analyze the application's initialization sequence:

```bash
# Auto-detect version and analyze
pplx-graph bootstrap

# Specify Service Worker URL manually
pplx-graph bootstrap --sw-url https://www.perplexity.ai/sw.js

# Export as Markdown
pplx-graph bootstrap --format markdown --output bootstrap.md

# Export as Mermaid diagram
pplx-graph bootstrap --format mermaid --output bootstrap.mmd
```

**Output Example:**
```
🔍 Auto-detecting Service Worker version...
✓ Detected version: 2.18.0 (via api)
✓ SW URL: https://www.perplexity.ai/service-worker.js?v=2.18.0

📦 Service Worker Analysis:
   Version: 2.18.0
   Total precache entries: 1149
   Critical path chunks: 23

⚡ Critical Path:
   1. index-a1b2c3.js (245 KB)
      └─ Calls: GET /auth/session
   
   2. platform-core-d4e5f6.js (512 KB)
      ├─ Calls: GET /user/profile
      ├─ Calls: GET /rest/threads
      └─ Calls: GET /rest/collections

📊 Bootstrap Endpoints (6 total):
   GET  /auth/session
   GET  /user/profile
   GET  /rest/threads
   GET  /rest/collections
   POST /analytics/pageview
   GET  /config/features

💾 Analysis saved to: bootstrap-analysis.json
```

#### 2. Version Monitoring

Monitor for Service Worker version changes:

```bash
# Monitor with default 5-minute interval
pplx-graph monitor

# Custom check interval (10 minutes)
pplx-graph monitor --interval 600000

# With webhook notifications
pplx-graph monitor --webhook https://example.com/webhook
```

**Output Example:**
```
🔄 Monitoring SW version changes (every 5 minutes)...

Current version: 2.18.0
Detection method: api
Monitoring started at: 2026-02-01 01:08 MSK

[5 minutes later...]

🆕 NEW VERSION DETECTED!
   2.18.0 → 2.19.0
   
📊 Manifest Changes:
   Added: 15 files
   Removed: 8 files
   Modified: 42 files

📧 Notification sent to webhook
```

#### 3. Query Graph

Query the code graph (coming soon):

```bash
# Find all paths from UI to endpoint
pplx-graph query how-to-reach /rest/threads

# Find where an endpoint is defined
pplx-graph query where-is /rest/threads

# Find all usage contexts
pplx-graph query contexts /rest/threads
```

### Programmatic API

#### Version Detection

```typescript
import { ServiceWorkerVersionDetector } from '@pplx-unofficial/code-graph';

const detector = new ServiceWorkerVersionDetector();
const versionInfo = await detector.detectVersion();

console.log('Version:', versionInfo.version);
console.log('Detection method:', versionInfo.detectionMethod);
console.log('SW URL:', versionInfo.swUrl);
```

**Version Detection Methods (in priority order):**

1. **API Endpoint** - `GET /api/version`
   - Fast and reliable
   - Returns JSON with version info

2. **JS Context** - `window.__PPL_CONFIG__.version`
   - Requires Playwright/Puppeteer
   - Extracts from browser context

3. **Query Parameter** - Parse from SW registration URL
   - Extracts version from `?v=X.Y.Z`
   - Fallback when API unavailable

4. **Fallback** - Default SW URL
   - Uses `/sw.js` without version
   - Last resort when all else fails

#### Bootstrap Analysis

```typescript
import { BootstrapAnalyzer } from '@pplx-unofficial/code-graph';

const analyzer = new BootstrapAnalyzer();
const analysis = await analyzer.analyzeBootstrap({
  autoDetectVersion: true
});

// Access results
console.log('Version:', analysis.serviceWorker.version);
console.log('Detection method:', analysis.serviceWorker.detectionMethod);
console.log('Total entries:', analysis.serviceWorker.precacheManifest.length);
console.log('Bootstrap endpoints:', analysis.criticalPath.initialEndpoints);

// Critical path analysis
for (const preload of analysis.criticalPath.preloads) {
  console.log(`${preload.priority}: ${preload.chunk}`);
}

// Load sequence
for (const step of analysis.loadSequence) {
  console.log(`${step.order}. ${step.resource} (${step.type})`);
}
```

#### Version Monitoring

```typescript
import { VersionMonitor } from '@pplx-unofficial/code-graph';

const monitor = new VersionMonitor(
  'https://www.perplexity.ai',
  async (update) => {
    if (update.hasUpdate) {
      console.log('New version:', update.newVersion);
      console.log('Old version:', update.oldVersion);
      
      // Send notification
      await fetch('https://example.com/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
    }
  }
);

// Start monitoring (check every 5 minutes)
await monitor.startMonitoring(300000);

// Stop monitoring
// monitor.stopMonitoring();
```

#### Module Graph

```typescript
import { ModuleGraph, TypeScriptParser } from '@pplx-unofficial/code-graph';
import * as fs from 'fs/promises';

const graph = new ModuleGraph();
const parser = new TypeScriptParser();

// Parse a TypeScript file
const code = await fs.readFile('src/app.ts', 'utf-8');
const parseResult = parser.parse(code, 'src/app.ts');

// Create module node
const moduleNode = parser.createModuleNode('app', 'src/app.ts', parseResult);

// Add to graph
graph.addNode(moduleNode);

// Query graph
const dependencies = graph.getDependencies('app');
const dependents = graph.getDependents('app');
const paths = graph.findPaths('app', 'api-client');

// Detect cycles
const cycles = graph.detectCycles();
console.log('Circular dependencies:', cycles);

// Get statistics
const stats = graph.getStats();
console.log('Total modules:', stats.totalModules);
console.log('Average dependencies:', stats.avgDependencies);
```

#### Call Graph

```typescript
import { CallGraph } from '@pplx-unofficial/code-graph';

const callGraph = new CallGraph();

// Add functions
callGraph.addFunction('handleClick', 'Button.tsx', 45);
callGraph.addFunction('fetchData', 'api.ts', 12);

// Add calls
callGraph.addCall({
  caller: 'handleClick',
  callee: 'fetchData',
  line: 48,
  column: 5,
  callType: 'direct',
});

// Find call chains
const chains = callGraph.findCallChains('handleClick', 'fetchEndpoint');

// Build full call chain with context
const chain = callGraph.buildCallChain(
  '/rest/threads',
  [{ component: 'SidebarMenu.tsx', event: 'onClick', line: 89, userAction: 'Click threads button' }],
  ['handleClick', 'fetchData', 'fetchEndpoint']
);
```

#### Export Graphs

```typescript
import { 
  MermaidExporter, 
  MarkdownExporter, 
  GraphMLExporter 
} from '@pplx-unofficial/code-graph';

// Mermaid diagram
const mermaid = new MermaidExporter();
const diagram = mermaid.exportModuleGraph(graph);
await fs.writeFile('graph.mmd', diagram);

const callChainDiagram = mermaid.exportCallChain(chain);
await fs.writeFile('call-chain.mmd', callChainDiagram);

const bootstrapDiagram = mermaid.exportBootstrapFlow(analysis);
await fs.writeFile('bootstrap.mmd', bootstrapDiagram);

// Markdown documentation
const markdown = new MarkdownExporter();
const doc = markdown.exportBootstrapAnalysis(analysis);
await fs.writeFile('analysis.md', doc);

const chainDoc = markdown.exportCallChain(chain);
await fs.writeFile('call-chain.md', chainDoc);

// GraphML (for Gephi/Cytoscape)
const graphml = new GraphMLExporter();
const xml = graphml.exportModuleGraph(graph);
await fs.writeFile('graph.graphml', xml);
```

## Architecture

```
packages/code-graph/
├── src/
│   ├── core/                      # Core graph implementations
│   │   ├── module-graph.ts        # Module dependency graph
│   │   ├── call-graph.ts          # Function call graph
│   │   └── bootstrap-analyzer.ts  # Bootstrap sequence analysis
│   ├── parsers/                   # AST parsers
│   │   ├── typescript-parser.ts   # TypeScript/JavaScript parser
│   │   └── service-worker-parser.ts # Service Worker parser
│   ├── analyzers/                 # Analysis tools
│   │   └── version-detector.ts    # SW version auto-detection
│   ├── exporters/                 # Export formats
│   │   ├── mermaid-exporter.ts    # Mermaid diagrams
│   │   ├── markdown-exporter.ts   # Markdown docs
│   │   └── graphml-exporter.ts    # GraphML format
│   ├── monitoring/                # Version monitoring
│   │   └── version-monitor.ts     # Monitor version changes
│   ├── cli/                       # CLI commands
│   │   └── commands/
│   │       ├── bootstrap.ts       # Bootstrap command
│   │       ├── monitor.ts         # Monitor command
│   │       └── query.ts           # Query command
│   ├── types.ts                   # TypeScript types
│   └── index.ts                   # Main exports
└── README.md
```

## Use Cases

### 1. Understanding Application Bootstrap

Analyze how the application initializes:

```typescript
const analyzer = new BootstrapAnalyzer();
const analysis = await analyzer.analyzeBootstrap();

// Which chunks are critical?
console.log('Critical chunks:', analysis.criticalPath.preloads.length);

// Which endpoints are called during startup?
console.log('Bootstrap endpoints:', analysis.criticalPath.initialEndpoints);

// What's the load sequence?
for (const step of analysis.loadSequence) {
  console.log(`${step.order}. ${step.resource}`);
}
```

### 2. Tracking Version Changes

Monitor for new versions and analyze changes:

```typescript
const monitor = new VersionMonitor('https://www.perplexity.ai', async (update) => {
  if (update.hasUpdate) {
    console.log(`Version updated: ${update.oldVersion} → ${update.newVersion}`);
    
    // Analyze new version
    const analyzer = new BootstrapAnalyzer();
    const analysis = await analyzer.analyzeBootstrap();
    
    // Compare endpoints
    const newEndpoints = analysis.criticalPath.initialEndpoints;
    console.log('New bootstrap endpoints:', newEndpoints);
  }
});

await monitor.startMonitoring(300000);
```

### 3. Building Module Graphs

Analyze module dependencies:

```typescript
const graph = new ModuleGraph();
const parser = new TypeScriptParser();

// Parse multiple files
const files = ['src/app.ts', 'src/api.ts', 'src/components/Button.tsx'];
for (const file of files) {
  const code = await fs.readFile(file, 'utf-8');
  const result = parser.parse(code, file);
  const node = parser.createModuleNode(file, file, result);
  graph.addNode(node);
}

// Export to GraphML for visualization in Gephi
const exporter = new GraphMLExporter();
const xml = exporter.exportModuleGraph(graph);
await fs.writeFile('module-graph.graphml', xml);
```

### 4. Finding Call Chains

Trace how users reach endpoints:

```typescript
const callGraph = new CallGraph();

// Add all functions and calls from parsed code
// (This would typically be automated)

// Find all paths from UI to API
const chains = callGraph.findCallChains('SidebarMenu.onClick', 'fetchThreads');

for (const chain of chains) {
  console.log('Call chain:', chain.join(' → '));
}
```

## Advanced Topics

### Custom Version Detection

Extend the version detector with custom logic:

```typescript
import { ServiceWorkerVersionDetector } from '@pplx-unofficial/code-graph';

class CustomVersionDetector extends ServiceWorkerVersionDetector {
  async detectVersion() {
    // Try custom method first
    const customVersion = await this.tryCustomMethod();
    if (customVersion) {
      return {
        version: customVersion,
        swUrl: `https://www.perplexity.ai/sw-${customVersion}.js`,
        detectionMethod: 'custom' as any,
      };
    }
    
    // Fall back to standard detection
    return super.detectVersion();
  }
  
  private async tryCustomMethod(): Promise<string | null> {
    // Custom implementation
    return null;
  }
}
```

### Analyzing Specific Chunks

Download and analyze specific chunks:

```typescript
import { BootstrapAnalyzer } from '@pplx-unofficial/code-graph';

const analyzer = new BootstrapAnalyzer();
const analysis = await analyzer.analyzeBootstrap();

// Find chunks by pattern
const platformChunks = analysis.serviceWorker.precacheManifest.filter(
  entry => entry.url.includes('platform')
);

console.log('Platform chunks:', platformChunks);
```

## Troubleshooting

### Version Detection Fails

If version detection fails, try:

1. Check if the API endpoint is accessible
2. Try with manual SW URL: `--sw-url https://www.perplexity.ai/sw.js`
3. Use Playwright for JS context detection

### Service Worker Parsing Fails

If SW parsing fails:

1. The SW might have a different structure
2. Check if behind Cloudflare or other protection
3. Try downloading SW manually and analyzing locally

### Build Errors

If build fails:

1. Ensure all dependencies are installed: `npm install`
2. Check TypeScript version: `npm list typescript`
3. Run type check: `npm run typecheck`

## Contributing

Contributions welcome! Areas for improvement:

- [ ] Full call chain analysis from UI to endpoints
- [ ] React component flow analysis
- [ ] Performance profiling integration
- [ ] Interactive visualization (D3.js)
- [ ] Dead code detection
- [ ] Bundle size analysis

## License

MIT
