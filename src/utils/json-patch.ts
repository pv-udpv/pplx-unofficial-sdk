// ============================================================================
// JSON Patch Implementation (RFC 6902)
// Based on fast-json-patch
// ============================================================================

export type Operation = "add" | "remove" | "replace" | "move" | "copy" | "test";

export interface JsonPatchOperation {
  op: Operation;
  path: string;
  value?: any;
  from?: string;
}

export interface PatchResult {
  newDocument: any;
  test?: boolean;
}

// ============================================================================
// PATH UTILITIES
// ============================================================================

/**
 * Escape path component for JSON Pointer (RFC 6901)
 */
export function escapePathComponent(path: string): string {
  return path.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * Unescape path component from JSON Pointer
 */
export function unescapePathComponent(path: string): string {
  return path.replace(/~1/g, "/").replace(/~0/g, "~");
}

/**
 * Parse JSON Pointer path into segments
 */
function parsePath(path: string): string[] {
  if (path === "") return [];
  if (path.charAt(0) !== "/") {
    throw new Error(`Invalid JSON Pointer: ${path}`);
  }
  return path.substring(1).split("/").map(unescapePathComponent);
}

// ============================================================================
// DEEP CLONE
// ============================================================================

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  switch (typeof obj) {
    case "object":
      return JSON.parse(JSON.stringify(obj));
    case "undefined":
      return null as any;
    default:
      return obj;
  }
}

// ============================================================================
// OPERATIONS
// ============================================================================

/**
 * Get value at JSON Pointer path
 */
export function getValueByPointer(document: any, pointer: string): any {
  if (pointer === "") return document;
  
  const segments = parsePath(pointer);
  let current = document;
  
  for (const segment of segments) {
    if (current === null || current === undefined) {
      throw new Error(`Cannot read property '${segment}' of ${current}`);
    }
    current = current[segment];
  }
  
  return current;
}

/**
 * Set value at JSON Pointer path
 */
function setValueByPointer(document: any, pointer: string, value: any): void {
  if (pointer === "") {
    throw new Error("Cannot replace root document");
  }
  
  const segments = parsePath(pointer);
  const lastSegment = segments.pop()!;
  let current = document;
  
  for (const segment of segments) {
    if (!(segment in current)) {
      current[segment] = {};
    }
    current = current[segment];
  }
  
  current[lastSegment] = value;
}

/**
 * Remove value at JSON Pointer path
 */
function removeValueByPointer(document: any, pointer: string): any {
  const segments = parsePath(pointer);
  const lastSegment = segments.pop()!;
  let current = document;
  
  for (const segment of segments) {
    current = current[segment];
  }
  
  const removed = current[lastSegment];
  
  if (Array.isArray(current)) {
    current.splice(Number(lastSegment), 1);
  } else {
    delete current[lastSegment];
  }
  
  return removed;
}

// ============================================================================
// APPLY OPERATIONS
// ============================================================================

/**
 * Apply single patch operation
 */
export function applyOperation(
  document: any,
  operation: JsonPatchOperation
): PatchResult {
  const newDocument = deepClone(document);
  
  switch (operation.op) {
    case "add":
      setValueByPointer(newDocument, operation.path, operation.value);
      return { newDocument };
      
    case "remove": {
      const removed = removeValueByPointer(newDocument, operation.path);
      return { newDocument, removed };
    }
      
    case "replace":
      removeValueByPointer(newDocument, operation.path);
      setValueByPointer(newDocument, operation.path, operation.value);
      return { newDocument };
      
    case "move": {
      const value = getValueByPointer(newDocument, operation.from!);
      removeValueByPointer(newDocument, operation.from!);
      setValueByPointer(newDocument, operation.path, value);
      return { newDocument };
    }
      
    case "copy": {
      const value = getValueByPointer(newDocument, operation.from!);
      setValueByPointer(newDocument, operation.path, value);
      return { newDocument };
    }
      
    case "test": {
      const value = getValueByPointer(newDocument, operation.path);
      const equals = areEquals(value, operation.value);
      return { newDocument, test: equals };
    }
      
    default:
      throw new Error(`Unknown operation: ${operation.op}`);
  }
}

/**
 * Apply array of patch operations
 */
export function applyPatch(
  document: any,
  patches: JsonPatchOperation[]
): PatchResult {
  let current = document;
  
  for (const patch of patches) {
    const result = applyOperation(current, patch);
    
    if (patch.op === "test" && !result.test) {
      throw new Error(`Test operation failed at ${patch.path}`);
    }
    
    current = result.newDocument;
  }
  
  return { newDocument: current };
}

// ============================================================================
// EQUALITY CHECK
// ============================================================================

/**
 * Deep equality check
 */
export function areEquals(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === "object") {
    const isArrayA = Array.isArray(a);
    const isArrayB = Array.isArray(b);
    
    if (isArrayA !== isArrayB) return false;
    
    if (isArrayA) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!areEquals(a[i], b[i])) return false;
      }
      return true;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!areEquals(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

// ============================================================================
// DIFF BLOCKS HELPER
// ============================================================================

/**
 * Apply patches from diff blocks (Perplexity-specific)
 */
export function applyDiffBlockPatches(
  existingBlocks: any[],
  patches: JsonPatchOperation[]
): any[] {
  if (!patches || patches.length === 0) {
    return existingBlocks;
  }
  
  const result = applyPatch(existingBlocks, patches);
  return result.newDocument;
}
