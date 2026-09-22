import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { TypeScriptParser } from '../dist/index.mjs';

const require = createRequire(import.meta.url);
const CommonJSParser = require('../dist/index.js').TypeScriptParser;

for (const [format, Parser] of [['ESM', TypeScriptParser], ['CommonJS', CommonJSParser]]) {
  test(`${format} parser handles TypeScript, JSX, class fields and dynamic imports`, () => {
    const result = new Parser().parse(`
      import { client } from './client';
      export const widget = <section />;
      class Loader { endpoint: string = '/rest/threads'; }
      export async function load() {
        await import('./lazy');
        return client.get('/rest/threads');
      }
    `, 'example.tsx');
    assert.deepEqual(result.imports, ['./client']);
    assert.deepEqual(result.exports, ['widget', 'load']);
    assert.deepEqual(result.endpoints, ['/rest/threads']);
    assert.ok(result.calls.some(call => call.caller === 'load' && call.callee === 'client.get'));
  });
}
