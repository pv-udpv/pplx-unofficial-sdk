// ============================================================================
// Markdown Exporter
// Exports analysis to human-readable Markdown documentation
// ============================================================================

import type { BootstrapAnalysis, CallChain } from '../types';

/**
 * Exports analysis to Markdown format
 */
export class MarkdownExporter {
  /**
   * Export bootstrap analysis to Markdown
   */
  exportBootstrapAnalysis(analysis: BootstrapAnalysis): string {
    let md = '# Bootstrap Analysis\n\n';

    // Service Worker Info
    md += '## Service Worker\n\n';
    md += `- **Version**: ${analysis.serviceWorker.version}\n`;
    md += `- **Detection Method**: ${analysis.serviceWorker.detectionMethod}\n`;
    md += `- **URL**: ${analysis.serviceWorker.url}\n`;
    md += `- **Total Entries**: ${analysis.serviceWorker.precacheManifest.length}\n\n`;

    // Critical Path
    md += '## Critical Path\n\n';
    md += `**Entry Point**: \`${analysis.criticalPath.entrypoint}\`\n\n`;

    if (analysis.criticalPath.preloads.length > 0) {
      md += '### Preloaded Chunks\n\n';
      md += '| Chunk | Priority | Load Trigger |\n';
      md += '|-------|----------|-------------|\n';
      
      for (const preload of analysis.criticalPath.preloads.slice(0, 10)) {
        md += `| ${preload.chunk} | ${preload.priority} | ${preload.loadTrigger} |\n`;
      }
      md += '\n';
    }

    // Initial Endpoints
    if (analysis.criticalPath.initialEndpoints.length > 0) {
      md += '### Initial Endpoints\n\n';
      analysis.criticalPath.initialEndpoints.forEach(endpoint => {
        md += `- \`${endpoint}\`\n`;
      });
      md += '\n';
    }

    // Load Sequence
    if (analysis.loadSequence.length > 0) {
      md += '## Load Sequence\n\n';
      md += '| Order | Resource | Type | Parallel |\n';
      md += '|-------|----------|------|----------|\n';
      
      for (const step of analysis.loadSequence.slice(0, 20)) {
        const resource = step.resource.length > 50 
          ? '...' + step.resource.slice(-47) 
          : step.resource;
        md += `| ${step.order} | ${resource} | ${step.type} | ${step.parallel ? '✓' : '✗'} |\n`;
      }
      md += '\n';
    }

    // Metrics
    md += '## Performance Metrics\n\n';
    md += `- **Total Size**: ${this.formatBytes(analysis.metrics.totalSize)}\n`;
    md += `- **Critical Size**: ${this.formatBytes(analysis.metrics.criticalSize)}\n`;
    md += `- **Parallel Requests**: ${analysis.metrics.parallelRequests}\n`;
    md += `- **Estimated Load Time**: ${analysis.metrics.estimatedLoadTime}ms\n\n`;

    return md;
  }

  /**
   * Export call chain to Markdown
   */
  exportCallChain(chain: CallChain): string {
    let md = `# Call Chain: ${chain.endpoint}\n\n`;

    // Entry Points
    if (chain.entryPoints.length > 0) {
      md += '## Entry Points\n\n';
      chain.entryPoints.forEach(ep => {
        md += `### ${ep.component}\n\n`;
        md += `- **Event**: ${ep.event}\n`;
        md += `- **Line**: ${ep.line}\n`;
        md += `- **User Action**: ${ep.userAction}\n\n`;
      });
    }

    // Call Path
    if (chain.callPath.length > 0) {
      md += '## Execution Flow\n\n';
      
      const layers = this.groupByLayer(chain.callPath);
      
      for (const [layer, nodes] of Object.entries(layers)) {
        md += `### ${this.formatLayer(layer)}\n\n`;
        
        nodes.forEach(node => {
          md += `- **${node.function}** (${node.module}:${node.line})\n`;
        });
        md += '\n';
      }
    }

    // Contexts
    if (chain.contexts.length > 0) {
      md += '## Context\n\n';
      chain.contexts.forEach(ctx => {
        md += `- **Flow**: ${ctx.flow}\n`;
        md += `- **Frequency**: ${ctx.frequency}\n`;
        md += `- **Authentication**: ${ctx.authentication}\n\n`;
      });
    }

    return md;
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Group call nodes by type/layer
   */
  private groupByLayer(nodes: any[]): Record<string, any[]> {
    const layers: Record<string, any[]> = {
      'component': [],
      'hook': [],
      'service': [],
      'api-client': [],
    };

    nodes.forEach(node => {
      if (layers[node.type]) {
        layers[node.type].push(node);
      }
    });

    return layers;
  }

  /**
   * Format layer name
   */
  private formatLayer(layer: string): string {
    const names: Record<string, string> = {
      'component': '🎨 UI Layer',
      'hook': '🪝 State Management',
      'service': '⚙️ Service Layer',
      'api-client': '📡 API Client',
    };
    return names[layer] || layer;
  }
}
