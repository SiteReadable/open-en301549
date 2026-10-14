// npm run build: downloads the pinned sources into .cache/, derives the entries,
// writes data/en301549-web.json and data/build-info.json.
//
// Offline mode for tests: node scripts/build.mjs --fixtures <dir> --out <dir>
// reads <dir>/sources.lock.json and the source files from <dir> instead of the network.

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildFromReader } from './lib/build.mjs';
import { directoryReader, fetchPinned } from './lib/sources.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { values } = parseArgs({ options: { fixtures: { type: 'string' }, out: { type: 'string' } } });
const outDir = resolve(values.out ?? join(root, 'data'));

try {
  let reader;
  let lock;
  let downloads = null;
  if (values.fixtures) {
    const dir = resolve(values.fixtures);
    lock = JSON.parse(readFileSync(join(dir, 'sources.lock.json'), 'utf8'));
    reader = directoryReader(dir);
  } else {
    lock = JSON.parse(readFileSync(join(root, 'sources.lock.json'), 'utf8'));
    ({ reader, downloads } = await fetchPinned(lock, join(root, '.cache')));
  }
  const { entries } = buildFromReader(reader, lock, outDir, { downloads });
  console.log(`Wrote ${entries.length} entries to ${outDir}`);
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exit(1);
}
