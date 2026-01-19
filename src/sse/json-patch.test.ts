/**
 * Unit Tests for JSON Patch Implementation
 */

import { describe, it, expect } from 'vitest';
import { applyJsonPatch, applyBlockPatches, mergeSSEEntry } from './json-patch';
import type { Block, JsonPatchOp } from './types';

describe('JSON Patch', () => {
  describe('applyJsonPatch', () => {
    it('should apply add operation', () => {
      const target = { items: [1, 2, 3] };
      const patches: JsonPatchOp[] = [
        { op: 'add', path: '/items/3', value: 4 },
      ];
      
      const result = applyJsonPatch(target, patches);
      expect(result.items).toEqual([1, 2, 3, 4]);
    });

    it('should apply replace operation', () => {
      const target = { name: 'John', age: 30 };
      const patches: JsonPatchOp[] = [
        { op: 'replace', path: '/age', value: 31 },
      ];
      
      const result = applyJsonPatch(target, patches);
      expect(result.age).toBe(31);
    });

    it('should apply remove operation', () => {
      const target = { name: 'John', age: 30, city: 'NYC' };
      const patches: JsonPatchOp[] = [
        { op: 'remove', path: '/city' },
      ];
      
      const result = applyJsonPatch(target, patches);
      expect(result).not.toHaveProperty('city');
    });

    it('should handle empty patches array', () => {
      const target = { name: 'John' };
      const result = applyJsonPatch(target, []);
      expect(result).toEqual(target);
    });

    it('should not mutate original target', () => {
      const target = { value: 1 };
      const patches: JsonPatchOp[] = [
        { op: 'replace', path: '/value', value: 2 },
      ];
      
      applyJsonPatch(target, patches);
      expect(target.value).toBe(1); // Original unchanged
    });
  });

  describe('applyBlockPatches', () => {
    it('should apply diff_block patches to existing blocks', () => {
      const existingBlocks: Block[] = [
        {
          intended_usage: 'answer',
          text: 'Hello',
        },
      ];

      const newBlocks: Block[] = [
        {
          intended_usage: 'answer',
          diff_block: {
            field: 'text',
            patches: [
              { op: 'replace', path: '', value: 'Hello World' },
            ],
          },
        },
      ];

      const result = applyBlockPatches(existingBlocks, newBlocks);
      expect(result[0].text).toBe('Hello World');
    });

    it('should create new block if not exists', () => {
      const existingBlocks: Block[] = [];

      const newBlocks: Block[] = [
        {
          intended_usage: 'answer',
          diff_block: {
            field: 'text',
            patches: [
              { op: 'add', path: '/0', value: 'H' },
              { op: 'add', path: '/1', value: 'i' },
            ],
          },
        },
      ];

      const result = applyBlockPatches(existingBlocks, newBlocks);
      expect(result).toHaveLength(1);
      expect(result[0].intended_usage).toBe('answer');
    });

    it('should replace full block when no diff_block', () => {
      const existingBlocks: Block[] = [
        {
          intended_usage: 'answer',
          text: 'Old text',
        },
      ];

      const newBlocks: Block[] = [
        {
          intended_usage: 'answer',
          text: 'New text',
        },
      ];

      const result = applyBlockPatches(existingBlocks, newBlocks);
      expect(result[0].text).toBe('New text');
    });

    it('should handle multiple blocks', () => {
      const existingBlocks: Block[] = [
        { intended_usage: 'answer', text: 'Answer' },
        { intended_usage: 'sources', text: 'Sources' },
      ];

      const newBlocks: Block[] = [
        {
          intended_usage: 'answer',
          diff_block: {
            field: 'text',
            patches: [{ op: 'replace', path: '', value: 'Updated Answer' }],
          },
        },
      ];

      const result = applyBlockPatches(existingBlocks, newBlocks);
      expect(result).toHaveLength(2);
      expect(result.find((b: Block) => b.intended_usage === 'answer')?.text).toBe('Updated Answer');
      expect(result.find((b: Block) => b.intended_usage === 'sources')?.text).toBe('Sources');
    });
  });

  describe('mergeSSEEntry', () => {
    it('should merge entries with block patches', () => {
      const existing = {
        uuid: '123',
        status: 'PENDING',
        blocks: [{ intended_usage: 'answer', text: 'Hello' }],
      };

      const update = {
        status: 'COMPLETED',
        blocks: [
          {
            intended_usage: 'answer',
            diff_block: {
              field: 'text',
              patches: [{ op: 'replace', path: '', value: 'Hello World' }],
            },
          },
        ],
      };

      const result = mergeSSEEntry(existing, update);
      expect(result.status).toBe('COMPLETED');
      expect(result.blocks[0].text).toBe('Hello World');
    });

    it('should handle updates without blocks', () => {
      const existing = {
        uuid: '123',
        status: 'PENDING',
      };

      const update = {
        status: 'COMPLETED',
        final: true,
      };

      const result = mergeSSEEntry(existing, update);
      expect(result.status).toBe('COMPLETED');
      expect(result.final).toBe(true);
    });
  });
});
