import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// TypeScript emits declarations without bundling. Give each JS module format
// its own declaration tree so NodeNext resolves the matching module identity.
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(filename);
    } else if (entry.name.endsWith('.d.ts')) {
      const source = await readFile(filename, 'utf8');
      const rewrite = (extension) => source.replace(
        /((?:from\s*|import\s*\(\s*)["'])(\.{1,2}\/[^"']+)(["'])/g,
        (_, prefix, specifier, quote) => `${prefix}${specifier.replace(/\.(?:mjs|cjs|js)$/, '')}.${extension}${quote}`,
      );
      await writeFile(filename, rewrite('js'));
      await writeFile(filename.replace(/\.d\.ts$/, '.d.mts'), rewrite('mjs'));
    }
  }
}
await visit(path.resolve('dist'));
