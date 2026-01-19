/**
 * RFC-6902 JSON Patch Implementation
 * Used for incremental updates to SSE stream blocks
 */

import { applyPatch, Operation } from 'fast-json-patch';
import type { JsonPatchOp, Block, DiffBlock } from './types';

/**
 * Apply JSON Patch operations to a target object
 * @param target - The object to patch
 * @param patches - Array of JSON Patch operations
 * @returns The patched object
 */
export function applyJsonPatch<T = any>(target: T, patches: JsonPatchOp[]): T {
  if (!patches || patches.length === 0) {
    return target;
  }

  // Convert our JsonPatchOp to fast-json-patch Operation format
  const operations: Operation[] = patches.map(patch => ({
    op: patch.op,
    path: patch.path,
    value: patch.value,
    from: patch.from,
  } as Operation));

  try {
    // Clone target to avoid mutation
    const cloned = JSON.parse(JSON.stringify(target));
    const result = applyPatch(cloned, operations, false, false);
    return result.newDocument as T;
  } catch (error) {
    console.error('Failed to apply JSON patch:', error);
    return target;
  }
}

/**
 * Apply diff blocks to existing blocks
 * This is the core mechanism for incremental SSE updates
 * 
 * @param existingBlocks - Current blocks state
 * @param newBlocks - New blocks with potential diff_block patches
 * @returns Updated blocks array
 */
export function applyBlockPatches(
  existingBlocks: Block[],
  newBlocks: Block[]
): Block[] {
  // Create a map of existing blocks by intended_usage
  const blockMap = new Map<string, Block>();
  
  for (const block of existingBlocks) {
    blockMap.set(block.intended_usage, block);
  }

  // Apply patches or replace blocks
  for (const newBlock of newBlocks) {
    if (newBlock.diff_block) {
      // This is a diff update - apply patches to existing block
      const existing = blockMap.get(newBlock.intended_usage);
      
      if (existing) {
        // Apply patches to the specified field
        const field = newBlock.diff_block.field;
        const existingValue = (existing as any)[field] ?? {};
        const patchedValue = applyJsonPatch(existingValue, newBlock.diff_block.patches);
        
        // Update the block with patched value
        blockMap.set(newBlock.intended_usage, {
          ...existing,
          [field]: patchedValue,
        });
      } else {
        // No existing block, create new one with initial value
        const field = newBlock.diff_block.field;
        const patchedValue = applyJsonPatch({}, newBlock.diff_block.patches);
        
        blockMap.set(newBlock.intended_usage, {
          intended_usage: newBlock.intended_usage,
          [field]: patchedValue,
        });
      }
    } else {
      // Full block replacement
      blockMap.set(newBlock.intended_usage, newBlock);
    }
  }

  return Array.from(blockMap.values());
}

/**
 * Merge SSE entry with patches applied
 * @param existing - Existing entry
 * @param update - New entry update
 * @returns Merged entry
 */
export function mergeSSEEntry(
  existing: Partial<any>,
  update: Partial<any>
): any {
  const merged = { ...existing, ...update };
  
  // Apply block patches if present
  if (update.blocks && existing.blocks) {
    merged.blocks = applyBlockPatches(existing.blocks, update.blocks);
  } else if (update.blocks) {
    merged.blocks = update.blocks;
  }
  
  return merged;
}
