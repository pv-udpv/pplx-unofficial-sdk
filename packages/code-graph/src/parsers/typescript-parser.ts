// ============================================================================
// TypeScript Parser
// Parses TypeScript/JavaScript code to extract imports, exports, and calls
// ============================================================================

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { ModuleNode, FunctionCall } from '../types';

export interface ParseResult {
  imports: string[];
  exports: string[];
  calls: FunctionCall[];
  endpoints: string[];
}

/**
 * Get callee name from call expression
 */
function getCalleeName(callee: any): string | null {
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression') {
    const object = callee.object.type === 'Identifier' ? callee.object.name : '';
    const property = callee.property.type === 'Identifier' ? callee.property.name : '';
    return object && property ? `${object}.${property}` : null;
  }
  return null;
}

/**
 * Get current function name from path
 */
function getCurrentFunction(path: any): string {
  let current = path;
  
  while (current) {
    if (current.node.type === 'FunctionDeclaration' && current.node.id) {
      return current.node.id.name;
    }
    if (current.node.type === 'ArrowFunctionExpression' || 
        current.node.type === 'FunctionExpression') {
      const parent = current.parent;
      if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        return parent.id.name;
      }
    }
    current = current.parentPath;
  }

  return 'anonymous';
}

/**
 * Check if string is an API endpoint
 */
function isEndpoint(value: string): boolean {
  const patterns = [
    /^\/rest\//,
    /^\/api\//,
    /^\/auth\//,
    /^\/user\//,
    /^\/analytics\//,
    /^\/config\//,
  ];

  return patterns.some(pattern => pattern.test(value));
}

/**
 * TypeScript/JavaScript parser using Babel
 */
export class TypeScriptParser {
  /**
   * Parse TypeScript/JavaScript file
   */
  parse(code: string, filepath: string): ParseResult {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'dynamicImport',
      ],
    });

    const imports: string[] = [];
    const exports: string[] = [];
    const calls: FunctionCall[] = [];
    const endpoints: string[] = [];

    traverse(ast, {
      ImportDeclaration(path) {
        imports.push(path.node.source.value);
      },

      ExportNamedDeclaration(path) {
        if (path.node.source) {
          imports.push(path.node.source.value);
        }
        if (path.node.declaration) {
          // Export declaration
          const declaration = path.node.declaration;
          if (declaration.type === 'FunctionDeclaration' && declaration.id) {
            exports.push(declaration.id.name);
          }
          if (declaration.type === 'VariableDeclaration') {
            for (const decl of declaration.declarations) {
              if (decl.id.type === 'Identifier') {
                exports.push(decl.id.name);
              }
            }
          }
        }
      },

      ExportDefaultDeclaration(path) {
        exports.push('default');
      },

      CallExpression: (path: any) => {
        // Track function calls
        const callee = getCalleeName(path.node.callee);
        if (callee) {
          calls.push({
            caller: getCurrentFunction(path),
            callee,
            line: path.node.loc?.start.line || 0,
            column: path.node.loc?.start.column || 0,
            callType: 'direct',
          });
        }

        // Extract API endpoints from string literals
        const args = path.node.arguments;
        for (const arg of args) {
          if (arg.type === 'StringLiteral') {
            const value = arg.value;
            if (isEndpoint(value)) {
              endpoints.push(value);
            }
          }
        }
      },
    });

    return { imports, exports, calls, endpoints };
  }

  /**
   * Create module node from parsed result
   */
  createModuleNode(
    id: string,
    filepath: string,
    parseResult: ParseResult
  ): ModuleNode {
    return {
      id,
      path: filepath,
      type: this.inferModuleType(filepath),
      imports: parseResult.imports,
      exports: parseResult.exports,
    };
  }

  /**
   * Infer module type from filepath
   */
  private inferModuleType(filepath: string): ModuleNode['type'] {
    if (filepath.endsWith('.css') || filepath.endsWith('.scss')) {
      return 'style';
    }
    if (filepath.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
      return 'asset';
    }
    return 'script';
  }
}
