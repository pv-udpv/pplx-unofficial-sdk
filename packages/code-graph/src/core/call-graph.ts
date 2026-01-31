// ============================================================================
// Call Graph
// Tracks function calls and call chains
// ============================================================================

import type { FunctionCall, CallChain, CallNode, EntryPoint, Context } from '../types';

/**
 * Function call graph
 */
export class CallGraph {
  private calls: Map<string, FunctionCall[]> = new Map();
  private functions: Map<string, { module: string; line: number }> = new Map();

  /**
   * Add a function to the graph
   */
  addFunction(functionId: string, module: string, line: number): void {
    this.functions.set(functionId, { module, line });
  }

  /**
   * Add a function call
   */
  addCall(call: FunctionCall): void {
    if (!this.calls.has(call.caller)) {
      this.calls.set(call.caller, []);
    }
    this.calls.get(call.caller)!.push(call);
  }

  /**
   * Get all calls made by a function
   */
  getCalls(functionId: string): FunctionCall[] {
    return this.calls.get(functionId) || [];
  }

  /**
   * Get all functions that call a given function
   */
  getCallers(functionId: string): string[] {
    const callers: string[] = [];
    
    for (const [caller, calls] of this.calls.entries()) {
      if (calls.some(call => call.callee === functionId)) {
        callers.push(caller);
      }
    }

    return callers;
  }

  /**
   * Find all call chains from entry point to target
   */
  findCallChains(
    entryPoint: string,
    target: string,
    maxDepth: number = 10
  ): string[][] {
    const chains: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[], depth: number): void => {
      if (depth > maxDepth) return;
      
      if (current === target) {
        chains.push([...path, current]);
        return;
      }

      if (visited.has(current)) return;
      visited.add(current);

      const calls = this.getCalls(current);
      for (const call of calls) {
        dfs(call.callee, [...path, current], depth + 1);
      }

      visited.delete(current);
    };

    dfs(entryPoint, [], 0);
    return chains;
  }

  /**
   * Build call chain with full context
   */
  buildCallChain(
    endpoint: string,
    entryPoints: EntryPoint[],
    callPath: string[]
  ): CallChain {
    const callNodes: CallNode[] = callPath.map(functionId => {
      const func = this.functions.get(functionId);
      return {
        module: func?.module || 'unknown',
        function: functionId,
        line: func?.line || 0,
        type: this.inferNodeType(functionId),
      };
    });

    const contexts: Context[] = [
      {
        flow: this.inferFlowName(entryPoints[0]),
        frequency: this.inferFrequency(entryPoints[0]),
        authentication: 'required',
        errorHandling: [],
      },
    ];

    return {
      endpoint,
      entryPoints,
      callPath: callNodes,
      contexts,
    };
  }

  /**
   * Infer node type from function name
   */
  private inferNodeType(functionId: string): CallNode['type'] {
    const lower = functionId.toLowerCase();
    
    if (lower.includes('component') || lower.startsWith('use')) {
      return 'component';
    }
    if (lower.includes('service') || lower.includes('api')) {
      return 'service';
    }
    if (lower.includes('hook')) {
      return 'hook';
    }
    if (lower.includes('client') || lower.includes('fetch')) {
      return 'api-client';
    }
    
    return 'service';
  }

  /**
   * Infer flow name from entry point
   */
  private inferFlowName(entryPoint: EntryPoint): string {
    const component = entryPoint.component.replace(/\.tsx?$/, '');
    const event = entryPoint.event;
    return `${component}.${event}`;
  }

  /**
   * Infer frequency from entry point
   */
  private inferFrequency(entryPoint: EntryPoint): Context['frequency'] {
    const event = entryPoint.event.toLowerCase();
    
    if (event.includes('mount') || event.includes('init')) {
      return 'startup';
    }
    if (event.includes('interval') || event.includes('poll')) {
      return 'polling';
    }
    
    return 'on-demand';
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    totalFunctions: number;
    totalCalls: number;
    avgCallsPerFunction: number;
  } {
    const totalFunctions = this.functions.size;
    let totalCalls = 0;

    for (const calls of this.calls.values()) {
      totalCalls += calls.length;
    }

    return {
      totalFunctions,
      totalCalls,
      avgCallsPerFunction: totalFunctions > 0 ? totalCalls / totalFunctions : 0,
    };
  }
}
