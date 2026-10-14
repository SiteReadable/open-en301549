import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { validateDataset } from '../scripts/lib/schema.mjs';
import { ROOT } from './helpers.mjs';

const EM_DASH = '\u2014';
const EN_DASH = '\u2013';

function repoFiles() {
  // Tracked files plus new files not yet committed, minus ignored ones.
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter((f) => f && existsSync(join(ROOT, f)));
}

test('no em dash or en dash in any repository file', () => {
  const offending = [];
  for (const file of repoFiles()) {
    readFileSync(join(ROOT, file), 'utf8').split('\n').forEach((line, i) => {
      if (line.includes(EM_DASH) || line.includes(EN_DASH)) offending.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(offending, []);
});

test('licence files exist', () => {
  assert.match(readFileSync(join(ROOT, 'LICENSE'), 'utf8'), /^MIT License\n\nCopyright \(c\) \d{4} The open-en301549 contributors/);
  assert.match(readFileSync(join(ROOT, 'LICENSES/CC-BY-4.0.txt'), 'utf8'), /^Attribution 4\.0 International/);
});

test('the committed dataset validates against the schema', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'data/en301549-web.json'), 'utf8'));
  assert.deepEqual(validateDataset(data), []);
});

test('every committed entry has at least one source with a pin', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'data/en301549-web.json'), 'utf8'));
  assert.ok(data.length > 0);
  for (const entry of data) {
    assert.ok(entry.sources.length >= 1, entry.clause);
    assert.ok(entry.sources.every((s) => /^\S+$/.test(s.commit_or_version)), entry.clause);
  }
});
