import assert from 'node:assert/strict';
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { stringifyData } from '../scripts/lib/json.mjs';
import { applyReview, localDate } from '../scripts/lib/review.mjs';
import { FIXTURES, buildFixtures, readData, tempDir } from './helpers.mjs';

function review(outDir, clause, notes) {
  const file = join(outDir, 'en301549-web.json');
  writeFileSync(file, stringifyData(applyReview(readData(outDir), clause, notes, '2000-01-02')));
}

test('applyReview sets the review of one entry only', () => {
  const entries = [{ clause: '9.1.1.1', review: { status: 'pending' } }, { clause: '9.2.4.2', review: { status: 'pending' } }];
  const out = applyReview(entries, '9.1.1.1', 'checked', '2000-01-02');
  assert.deepEqual(out[0].review, { status: 'reviewed', reviewer: 'maintainer', date: '2000-01-02', notes: 'checked' });
  assert.equal(out[1].review.status, 'pending');
  assert.throws(() => applyReview(entries, '9.9.9.9', 'x', '2000-01-02'), /No entry for clause/);
  assert.match(localDate(new Date(2026, 0, 5)), /^2026-01-05$/);
});

test('review data survives a rebuild of unchanged entries', () => {
  const out = tempDir();
  buildFixtures(out);
  review(out, '9.1.3.4', 'checked by hand');
  const before = readFileSync(join(out, 'en301549-web.json'));
  buildFixtures(out);
  assert.deepEqual(readFileSync(join(out, 'en301549-web.json')), before);
  assert.equal(readData(out).find((e) => e.clause === '9.1.3.4').review.status, 'reviewed');
});

test('review is reset to pending when derived values change', () => {
  const fixtures = tempDir();
  cpSync(FIXTURES, fixtures, { recursive: true });
  const out = tempDir();
  buildFixtures(out, fixtures);
  review(out, '9.1.1.1', 'checked');
  review(out, '9.1.3.4', 'checked');

  // Upstream renames an ACT rule used by 9.1.1.1 only.
  const mappingFile = join(fixtures, 'act/wcag-mapping.json');
  const mapping = JSON.parse(readFileSync(mappingFile, 'utf8'));
  mapping['act-rules'].find((r) => r.frontmatter.id === 'fx0002').frontmatter.name = 'Fixture rule two, renamed';
  writeFileSync(mappingFile, JSON.stringify(mapping));

  buildFixtures(out, fixtures);
  const data = readData(out);
  assert.deepEqual(data.find((e) => e.clause === '9.1.1.1').review, { status: 'pending', reviewer: null, date: null, notes: null });
  assert.equal(data.find((e) => e.clause === '9.1.3.4').review.status, 'reviewed');
});
