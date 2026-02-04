# @pplx-unofficial/code-graph

> Code dependency graph and call chain analysis for Perplexity AI

## Features

- 🔍 **Service Worker Version Auto-Detection** - Automatically detect SW version using multiple methods
- 📦 **Bootstrap Analysis** - Analyze application initialization sequence
- 🕸️ **Module Dependency Graph** - Build complete module dependency graphs
- 📞 **Call Chain Tracing** - Trace function calls from UI to API endpoints
- 📊 **Multiple Export Formats** - GraphML, Mermaid, Markdown
- 🔄 **Version Monitoring** - Monitor for SW version changes

## Installation

```bash
npm install @pplx-unofficial/code-graph
```

## CLI Usage

### Bootstrap Analysis

Analyze application bootstrap sequence with automatic version detection:

```bash
pplx-graph bootstrap

# With custom Service Worker URL
pplx-graph bootstrap --sw-url https://www.perplexity.ai/sw.js

# Export as Markdown
pplx-graph bootstrap --format markdown --output bootstrap.md

# Export as Mermaid diagram
pplx-graph bootstrap --format mermaid --output bootstrap.mmd
```

### Version Monitoring

Monitor for Service Worker version changes:

```bash
pplx-graph monitor

# Custom check interval (5 minutes)
pplx-graph monitor --interval 300000

# With webhook notifications
pplx-graph monitor --webhook https://example.com/webhook
```

### Query Graph

Query the code graph (coming soon):

```bash
pplx-graph query how-to-reach /rest/threads
pplx-graph query where-is /rest/threads
pplx-graph query contexts /rest/threads
```

## Programmatic API

### Bootstrap Analysis

```typescript
import { BootstrapAnalyzer } from '@pplx-unofficial/code-graph';

const analyzer = new BootstrapAnalyzer();
const analysis = await analyzer.analyzeBootstrap({
  autoDetectVersion: true
});

console.log('Version:', analysis.serviceWorker.version);
console.log('Bootstrap endpoints:', analysis.criticalPath.initialEndpoints);
```

### Version Detection

```typescript
import { ServiceWorkerVersionDetector } from '@pplx-unofficial/code-graph';

const detector = new ServiceWorkerVersionDetector();
const versionInfo = await detector.detectVersion();

console.log('Version:', versionInfo.version);
console.log('Detection method:', versionInfo.detectionMethod);
console.log('SW URL:', versionInfo.swUrl);
```

### Version Monitoring

```typescript
import { VersionMonitor } from '@pplx-unofficial/code-graph';

const monitor = new VersionMonitor(
  'https://www.perplexity.ai',
  async (update) => {
    console.log('New version:', update.newVersion);
    console.log('Changes:', update.changes);
  }
);

await monitor.startMonitoring(300000); // Check every 5 minutes
```

### Module Graph

```typescript
import { ModuleGraph, TypeScriptParser } from '@pplx-unofficial/code-graph';

const graph = new ModuleGraph();
const parser = new TypeScriptParser();

// Parse a file
const code = await fs.readFile('src/app.ts', 'utf-8');
const parseResult = parser.parse(code, 'src/app.ts');
const moduleNode = parser.createModuleNode('app', 'src/app.ts', parseResult);

// Add to graph
graph.addNode(moduleNode);

// Query graph
const dependencies = graph.getDependencies('app');
const dependents = graph.getDependents('app');
const paths = graph.findPaths('app', 'api-client');
```

### Export Graphs

```typescript
import { 
  MermaidExporter, 
  MarkdownExporter, 
  GraphMLExporter 
} from '@pplx-unofficial/code-graph';

// Mermaid
const mermaid = new MermaidExporter();
const diagram = mermaid.exportModuleGraph(graph);
await fs.writeFile('graph.mmd', diagram);

// Markdown
const markdown = new MarkdownExporter();
const doc = markdown.exportBootstrapAnalysis(analysis);
await fs.writeFile('analysis.md', doc);

// GraphML (for Gephi/Cytoscape)
const graphml = new GraphMLExporter();
const xml = graphml.exportModuleGraph(graph);
await fs.writeFile('graph.graphml', xml);
```

## Version Detection Methods

The Service Worker version detector tries multiple methods in priority order:

1. **API Endpoint** - `GET /api/version`
2. **JS Context** - Extract from `window.__PPL_CONFIG__.version` (requires Playwright)
3. **Query Parameter** - Parse from SW registration URL
4. **Fallback** - Use default `/sw.js`

## Architecture

```
packages/code-graph/
├── src/
│   ├── core/               # Core graph implementations
│   │   ├── module-graph.ts
│   │   ├── call-graph.ts
│   │   └── bootstrap-analyzer.ts
│   ├── parsers/            # AST parsers
│   │   ├── typescript-parser.ts
│   │   └── service-worker-parser.ts
│   ├── analyzers/          # Analysis tools
│   │   └── version-detector.ts
│   ├── exporters/          # Export formats
│   │   ├── mermaid-exporter.ts
│   │   ├── markdown-exporter.ts
│   │   └── graphml-exporter.ts
│   ├── monitoring/         # Version monitoring
│   │   └── version-monitor.ts
│   └── cli/                # CLI commands
│       └── commands/
```

## License

MIT
