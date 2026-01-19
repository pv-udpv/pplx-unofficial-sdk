/**
 * JSON Patch (RFC-6902) implementation
 * Extracted from pplx-stream-D3-uFWQX.js
 */

import type { JsonPatchOp } from './types'

/**
 * JSON Patch error
 */
export class JsonPatchError extends Error {
  constructor(
    message: string,
    public code: string,
    public index?: number,
    public operation?: JsonPatchOp,
    public tree?: any
  ) {
    super(message)
    this.name = 'JsonPatchError'
  }
}

/**
 * Escape JSON Pointer component
 */
export function escapePathComponent(str: string): string {
  return str.replace(/~/g, '~0').replace(/\//g, '~1')
}

/**
 * Unescape JSON Pointer component
 */
export function unescapePathComponent(str: string): string {
  return str.replace(/~1/g, '/').replace(/~0/g, '~')
}

/**
 * Get value by JSON Pointer path
 */
export function getValueByPointer(doc: any, pointer: string): any {
  if (pointer === '') return doc

  const parts = pointer.split('/').slice(1) // Remove leading ''
  let current = doc

  for (const part of parts) {
    const key = unescapePathComponent(part)
    if (current === null || current === undefined) {
      throw new JsonPatchError(
        `Cannot read property '${key}' of ${current}`,
        'OPERATION_PATH_UNRESOLVABLE'
      )
    }
    current = current[key]
  }

  return current
}

/**
 * Deep clone value
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(deepClone) as any
  
  const cloned: any = {}
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      cloned[key] = deepClone(value[key])
    }
  }
  return cloned
}

/**
 * Deep equality check
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false
      }
      return true
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false

    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (!deepEqual(a[key], b[key])) return false
    }
    return true
  }
  return a !== a && b !== b // NaN === NaN
}

/**
 * Apply single patch operation
 */
function applyOperation(
  doc: any,
  operation: JsonPatchOp,
  validateOperation = true
): { newDocument: any; removed?: any; test?: boolean } {
  if (validateOperation) {
    validateOp(operation)
  }

  const path = operation.path || ''
  const parts = path.split('/').slice(1)

  if (path === '') {
    // Root operations
    switch (operation.op) {
      case 'add':
      case 'replace':
        return { newDocument: operation.value }
      case 'remove':
        return { newDocument: null, removed: doc }
      case 'test':
        return { newDocument: doc, test: deepEqual(doc, operation.value) }
      default:
        throw new JsonPatchError(
          `Unsupported operation at root: ${operation.op}`,
          'OPERATION_OP_INVALID'
        )
    }
  }

  const newDoc = deepClone(doc)
  let parent = newDoc
  const lastKey = unescapePathComponent(parts[parts.length - 1])

  // Navigate to parent
  for (let i = 0; i < parts.length - 1; i++) {
    const key = unescapePathComponent(parts[i])
    if (parent === null || parent === undefined) {
      throw new JsonPatchError(
        `Cannot access property '${key}' of ${parent}`,
        'OPERATION_PATH_UNRESOLVABLE'
      )
    }
    parent = parent[key]
  }

  // Apply operation
  const isArray = Array.isArray(parent)
  let removed: any

  switch (operation.op) {
    case 'add':
      if (isArray) {
        const index = lastKey === '-' ? parent.length : parseInt(lastKey, 10)
        parent.splice(index, 0, deepClone(operation.value))
      } else {
        parent[lastKey] = deepClone(operation.value)
      }
      break

    case 'remove':
      if (isArray) {
        removed = parent.splice(parseInt(lastKey, 10), 1)[0]
      } else {
        removed = parent[lastKey]
        delete parent[lastKey]
      }
      break

    case 'replace':
      removed = parent[lastKey]
      parent[lastKey] = deepClone(operation.value)
      break

    case 'move': {
      const value = getValueByPointer(newDoc, operation.from!)
      const moveOp: JsonPatchOp = { op: 'add', path: operation.path, value }
      const removeOp: JsonPatchOp = { op: 'remove', path: operation.from! }
      applyOperation(newDoc, removeOp, false)
      applyOperation(newDoc, moveOp, false)
      break
    }

    case 'copy': {
      const value = getValueByPointer(doc, operation.from!)
      parent[lastKey] = deepClone(value)
      break
    }

    case 'test': {
      const actual = parent[lastKey]
      const test = deepEqual(actual, operation.value)
      if (!test) {
        throw new JsonPatchError(
          'Test operation failed',
          'TEST_OPERATION_FAILED'
        )
      }
      return { newDocument: newDoc, test }
    }
  }

  return { newDocument: newDoc, removed }
}

/**
 * Validate patch operation
 */
function validateOp(op: JsonPatchOp): void {
  if (!op || typeof op !== 'object') {
    throw new JsonPatchError('Operation must be an object', 'OPERATION_NOT_AN_OBJECT')
  }

  if (!['add', 'remove', 'replace', 'move', 'copy', 'test'].includes(op.op)) {
    throw new JsonPatchError(
      `Invalid operation: ${op.op}`,
      'OPERATION_OP_INVALID'
    )
  }

  if (typeof op.path !== 'string') {
    throw new JsonPatchError('Path must be a string', 'OPERATION_PATH_INVALID')
  }

  if ((op.op === 'move' || op.op === 'copy') && typeof op.from !== 'string') {
    throw new JsonPatchError(
      `Operation ${op.op} requires 'from' property`,
      'OPERATION_FROM_REQUIRED'
    )
  }

  if (
    (op.op === 'add' || op.op === 'replace' || op.op === 'test') &&
    op.value === undefined
  ) {
    throw new JsonPatchError(
      `Operation ${op.op} requires 'value' property`,
      'OPERATION_VALUE_REQUIRED'
    )
  }
}

/**
 * Apply array of patches to document
 */
export function applyPatch<T = any>(
  doc: T,
  patches: JsonPatchOp[],
  validateOperations = true
): { newDocument: T; removed?: any[] } {
  if (!Array.isArray(patches)) {
    throw new JsonPatchError('Patches must be an array', 'SEQUENCE_NOT_AN_ARRAY')
  }

  let current: any = doc
  const removed: any[] = []

  for (let i = 0; i < patches.length; i++) {
    try {
      const result = applyOperation(current, patches[i], validateOperations)
      current = result.newDocument
      if (result.removed !== undefined) {
        removed.push(result.removed)
      }
    } catch (error) {
      if (error instanceof JsonPatchError) {
        error.index = i
        error.operation = patches[i]
      }
      throw error
    }
  }

  return { newDocument: current, removed }
}

/**
 * Validate patches without applying
 */
export function validate(patches: JsonPatchOp[]): JsonPatchError | null {
  if (!Array.isArray(patches)) {
    return new JsonPatchError('Patches must be an array', 'SEQUENCE_NOT_AN_ARRAY')
  }

  for (let i = 0; i < patches.length; i++) {
    try {
      validateOp(patches[i])
    } catch (error) {
      if (error instanceof JsonPatchError) {
        error.index = i
        error.operation = patches[i]
        return error
      }
      throw error
    }
  }

  return null
}
