import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFromReader } from '../scripts/lib/build.mjs';
import { directoryReader } from '../scripts/lib/sources.mjs';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const FIXTURES = join(ROOT, 'test', 'fixtures');

export function tempDir() {
  return mkdtempSync(join(tmpdir(), 'open-en301549-'));
}

export function buildFixtures(outDir, fixturesDir = FIXTURES) {
  const lock = JSON.parse(readFileSync(join(fixturesDir, 'sources.lock.json'), 'utf8'));
  return buildFromReader(directoryReader(fixturesDir), lock, outDir, { now: new Date('2000-01-01T00:00:00Z') });
}

export function readData(outDir) {
  return JSON.parse(readFileSync(join(outDir, 'en301549-web.json'), 'utf8'));
}
