import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const temporary = await mkdtemp(path.join(root, 'node_modules', '.exports-check-'));
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}
try {
  const [{ filename }] = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary]));
  const installed = path.join(temporary, 'node_modules', manifest.name);
  await mkdir(installed, { recursive: true });
  run('tar', ['-xzf', path.join(temporary, filename), '--strip-components=1', '-C', installed]);
  const specifiers = Object.keys(manifest.exports ?? { '.': null }).map(
    (subpath) => manifest.name + (subpath === '.' ? '' : subpath.slice(1)),
  );
  const consumer = specifiers.map((specifier, index) =>
    `import * as api${index} from ${JSON.stringify(specifier)};\nconst symbols${index}: string[] = Object.keys(api${index});`,
  ).join('\n');
  for (const extension of ['cts', 'mts']) {
    await writeFile(path.join(temporary, `consumer.${extension}`), consumer);
  }
  run(path.join(root, 'node_modules', '.bin', 'tsc'), [
    '--ignoreConfig', '--noEmit', '--strict', '--module', 'NodeNext',
    '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--types', 'node',
    'consumer.cts', 'consumer.mts',
  ], temporary);
  run(process.execPath, ['-e', specifiers.map(s => `require(${JSON.stringify(s)});`).join('\n')], temporary);
  run(process.execPath, ['--input-type=module', '-e', specifiers.map(s => `await import(${JSON.stringify(s)});`).join('\n')], temporary);
  console.log(`Verified ${specifiers.length} packed export(s): CJS/ESM runtime and strict NodeNext declarations.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
