// ============================================================================
// Module Graph
// Builds dependency graph from JavaScript modules
// ============================================================================

import type { ModuleNode } from '../types';

/**
 * Module dependency graph
 */
export class ModuleGraph {
  private nodes: Map<string, ModuleNode> = new Map();
  private edges: Map<string, Set<string>> = new Map();

  /**
   * Add a module node to the graph
   */
  addNode(node: ModuleNode): void {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, new Set());
    }

    // Add edges for imports
    for (const importPath of node.imports) {
      this.addEdge(node.id, importPath);
    }
  }

  /**
   * Add an edge (dependency) between modules
   */
  addEdge(from: string, to: string): void {
    if (!this.edges.has(from)) {
      this.edges.set(from, new Set());
    }
    this.edges.get(from)!.add(to);
  }

  /**
   * Get a module node by ID
   */
  getNode(id: string): ModuleNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all dependencies of a module
   */
  getDependencies(moduleId: string): string[] {
    return Array.from(this.edges.get(moduleId) || []);
  }

  /**
   * Get all modules that depend on a given module (reverse dependencies)
   */
  getDependents(moduleId: string): string[] {
    const dependents: string[] = [];
    
    for (const [nodeId, deps] of this.edges.entries()) {
      if (deps.has(moduleId)) {
        dependents.push(nodeId);
      }
    }

    return dependents;
  }

  /**
   * Get all modules in the graph
   */
  getAllModules(): ModuleNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Find all paths from one module to another
   */
  findPaths(from: string, to: string, maxDepth: number = 10): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[], depth: number): void => {
      if (depth > maxDepth) return;
      
      if (current === to) {
        paths.push([...path, current]);
        return;
      }

      if (visited.has(current)) return;
      visited.add(current);

      const deps = this.getDependencies(current);
      for (const dep of deps) {
        dfs(dep, [...path, current], depth + 1);
      }

      visited.delete(current);
    };

    dfs(from, [], 0);
    return paths;
  }

  /**
   * Detect cycles in the graph
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      if (stack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        if (cycleStart >= 0) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      stack.add(node);

      const deps = this.getDependencies(node);
      for (const dep of deps) {
        dfs(dep, [...path, node]);
      }

      stack.delete(node);
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return cycles;
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    totalModules: number;
    totalEdges: number;
    avgDependencies: number;
    maxDependencies: number;
  } {
    const totalModules = this.nodes.size;
    let totalEdges = 0;
    let maxDependencies = 0;

    for (const deps of this.edges.values()) {
      totalEdges += deps.size;
      maxDependencies = Math.max(maxDependencies, deps.size);
    }

    return {
      totalModules,
      totalEdges,
      avgDependencies: totalModules > 0 ? totalEdges / totalModules : 0,
      maxDependencies,
    };
  }

  /**
   * Export graph as adjacency list
   */
  toAdjacencyList(): Record<string, string[]> {
    const adj: Record<string, string[]> = {};
    
    for (const [nodeId, deps] of this.edges.entries()) {
      adj[nodeId] = Array.from(deps);
    }

    return adj;
  }

  /**
   * Export graph to DOT format for GraphViz
   */
  toDOT(): string {
    let dot = 'digraph ModuleGraph {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';

    // Add nodes
    for (const node of this.nodes.values()) {
      const label = node.path.split('/').pop() || node.id;
      dot += `  "${node.id}" [label="${label}"];\n`;
    }

    dot += '\n';

    // Add edges
    for (const [from, deps] of this.edges.entries()) {
      for (const to of deps) {
        dot += `  "${from}" -> "${to}";\n`;
      }
    }

    dot += '}\n';
    return dot;
  }
}
