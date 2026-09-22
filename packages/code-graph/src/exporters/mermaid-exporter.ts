// ============================================================================
// Mermaid Exporter
// Exports graphs to Mermaid diagram format
// ============================================================================

import type { ModuleGraph } from '../core/module-graph';
import type { CallChain, BootstrapAnalysis } from '../types';

/**
 * Exports graphs to Mermaid format
 */
export class MermaidExporter {
  /**
   * Export module graph to Mermaid flowchart
   */
  exportModuleGraph(graph: ModuleGraph): string {
    let mermaid = 'graph LR\n';

    const modules = graph.getAllModules();
    const nodeIds = new Map<string, string>();

    // Create sanitized node IDs
    modules.forEach((module, index) => {
      const label = module.path.split('/').pop() || module.id;
      const nodeId = `M${index}`;
      nodeIds.set(module.id, nodeId);
      mermaid += `  ${nodeId}["${label}"]\n`;
    });

    mermaid += '\n';

    // Add edges
    for (const module of modules) {
      const fromId = nodeIds.get(module.id);
      for (const importPath of module.imports) {
        const toId = nodeIds.get(importPath);
        if (fromId && toId) {
          mermaid += `  ${fromId} --> ${toId}\n`;
        }
      }
    }

    return mermaid;
  }

  /**
   * Export call chain to Mermaid flowchart
   */
  exportCallChain(chain: CallChain): string {
    let mermaid = 'graph TD\n';

    // Entry point
    mermaid += `  EP["👤 ${chain.entryPoints[0]?.userAction || 'User Action'}"]\n`;
    mermaid += '  EP --> N0\n\n';

    // Call path
    chain.callPath.forEach((node, index) => {
      const icon = this.getNodeIcon(node.type);
      const label = `${icon} ${node.function}`;
      mermaid += `  N${index}["${label}"]\n`;
      
      if (index < chain.callPath.length - 1) {
        mermaid += `  N${index} --> N${index + 1}\n`;
      }
    });

    // Endpoint
    const lastIndex = chain.callPath.length;
    mermaid += `  N${lastIndex - 1} --> API["🌐 ${chain.endpoint}"]\n`;

    return mermaid;
  }

  /**
   * Export bootstrap analysis to Mermaid flowchart
   */
  exportBootstrapFlow(analysis: BootstrapAnalysis): string {
    let mermaid = 'graph TD\n';

    // Service Worker
    mermaid += `  SW["🔧 Service Worker v${analysis.serviceWorker.version}"]\n`;
    mermaid += '  SW --> EP\n\n';

    // Entry point
    mermaid += `  EP["📦 ${analysis.criticalPath.entrypoint}"]\n`;
    
    // Preloads
    analysis.criticalPath.preloads.slice(0, 5).forEach((preload, index) => {
      const priority = preload.priority === 'critical' ? '🔴' : '🟡';
      mermaid += `  P${index}["${priority} ${preload.chunk}"]\n`;
      mermaid += `  EP --> P${index}\n`;
    });

    mermaid += '\n';

    // Initial endpoints
    analysis.criticalPath.initialEndpoints.forEach((endpoint, index) => {
      mermaid += `  API${index}["🌐 ${endpoint}"]\n`;
      mermaid += `  EP --> API${index}\n`;
    });

    return mermaid;
  }

  /**
   * Get icon for node type
   */
  private getNodeIcon(type: string): string {
    const icons: Record<string, string> = {
      'component': '🎨',
      'hook': '🪝',
      'service': '⚙️',
      'api-client': '📡',
    };
    return icons[type] || '📄';
  }
}
