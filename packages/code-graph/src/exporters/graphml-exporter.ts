// ============================================================================
// GraphML Exporter
// Exports graphs to GraphML format for Gephi/Cytoscape
// ============================================================================

import type { ModuleGraph } from '../core/module-graph';

/**
 * Exports graphs to GraphML format
 */
export class GraphMLExporter {
  /**
   * Export module graph to GraphML
   */
  exportModuleGraph(graph: ModuleGraph): string {
    const modules = graph.getAllModules();
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"\n';
    xml += '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
    xml += '         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns\n';
    xml += '         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n\n';

    // Define keys for node attributes
    xml += '  <key id="d0" for="node" attr.name="path" attr.type="string"/>\n';
    xml += '  <key id="d1" for="node" attr.name="type" attr.type="string"/>\n';
    xml += '  <key id="d2" for="node" attr.name="size" attr.type="int"/>\n\n';

    // Start graph
    xml += '  <graph id="G" edgedefault="directed">\n\n';

    // Add nodes
    xml += '    <!-- Nodes -->\n';
    modules.forEach(module => {
      xml += `    <node id="${this.escapeXml(module.id)}">\n`;
      xml += `      <data key="d0">${this.escapeXml(module.path)}</data>\n`;
      xml += `      <data key="d1">${this.escapeXml(module.type)}</data>\n`;
      if (module.size) {
        xml += `      <data key="d2">${module.size}</data>\n`;
      }
      xml += '    </node>\n';
    });

    xml += '\n    <!-- Edges -->\n';

    // Add edges
    let edgeId = 0;
    modules.forEach(module => {
      module.imports.forEach(importPath => {
        xml += `    <edge id="e${edgeId++}" source="${this.escapeXml(module.id)}" target="${this.escapeXml(importPath)}"/>\n`;
      });
    });

    xml += '\n  </graph>\n';
    xml += '</graphml>\n';

    return xml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
