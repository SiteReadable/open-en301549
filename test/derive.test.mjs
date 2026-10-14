import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { classifyAutomation, compareClause, isAutomatedType, parseImplementationTypes, rankCriteria } from '../scripts/lib/derive.mjs';
import { readInputs, directoryReader } from '../scripts/lib/sources.mjs';
import { validateDataset } from '../scripts/lib/schema.mjs';
import { FIXTURES, ROOT, buildFixtures, readData, tempDir } from './helpers.mjs';

const byClause = (entries) => Object.fromEntries(entries.map((e) => [e.clause, e]));

test('implementation types are read from the YAML list, comments ignored', () => {
  const types = parseImplementationTypes(readFileSync(join(FIXTURES, 'act/_data/wcag-act-rules/act-implementations.yml'), 'utf8'));
  assert.deepEqual(types, {
    'tool-auto': 'Automated tool',
    'tool-lint': 'Linter',
    'tool-nover': 'Automated tool',
    'tool-semi': 'Semi-automated tool',
    'tool-method': 'Test methodology',
  });
  assert.throws(() => parseImplementationTypes('- name: x\n  type: Linter\n'), /without uniqueKey/);
});

test('only automated tools and linters count as automation; unknown types throw', () => {
  assert.equal(isAutomatedType('Automated tool'), true);
  assert.equal(isAutomatedType('Linter'), true);
  assert.equal(isAutomatedType('Semi-automated tool'), false);
  assert.equal(isAutomatedType('Test methodology'), false);
  assert.throws(() => isAutomatedType('Crowd'), /Unknown implementation type/);
});

test('decision table', () => {
  const rule = (id, passed, consistencies, proposed = false) => ({
    rule: { frontmatter: { id }, proposed },
    requirement: { passed },
    implementations: consistencies.map((consistency, i) => ({ tool: `t${i}`, consistency })),
  });
  assert.equal(classifyAutomation([rule('a', 'satisfied', ['complete'])]).automation, 'automatable');
  assert.equal(classifyAutomation([rule('a', 'satisfied', ['partial'])]).automation, 'partial');
  assert.equal(classifyAutomation([rule('a', 'further testing needed', ['complete'])]).automation, 'partial');
  assert.equal(classifyAutomation([rule('a', 'satisfied', ['complete'], true)]).automation, 'manual');
  assert.equal(classifyAutomation([rule('a', 'satisfied', [])]).automation, 'manual');
  assert.equal(classifyAutomation([]).automation, 'manual');
  assert.deepEqual(classifyAutomation([rule('b', 'satisfied', ['complete', 'partial']), rule('a', 'further testing needed', ['complete'])]).basis, {
    rule: 'decision-table-v1',
    act_rules: ['b'],
    tools: ['t0'],
  });
});

test('clauses compare numerically', () => {
  assert.ok(compareClause('9.1.4.3', '9.1.4.12') < 0);
  assert.ok(compareClause('9.4.1.2', '9.1.1.1') > 0);
});

test('seed ranking follows the rule on the fixtures', () => {
  const ranking = rankCriteria(readInputs(directoryReader(FIXTURES)));
  // 1.1.1: two approved rules (deprecated fx0006 excluded); 1.3.4 and 2.4.2: one each.
  // 1.4.3 has only a partial implementation, 4.1.2 only semi-automated and methodology
  // results, 3.1.1 only a proposed rule, 2.4.9 is AAA: none of them is ranked.
  assert.deepEqual(ranking.map((r) => [r.clause, r.count]), [['9.1.1.1', 2], ['9.1.3.4', 1], ['9.2.4.2', 1]]);
});

test('build from fixtures derives the expected entries', () => {
  const out = tempDir();
  const { entries } = buildFixtures(out);
  const e = byClause(entries);
  assert.deepEqual(Object.keys(e), ['9.1.1.1', '9.1.3.4', '9.2.4.2']);
  assert.deepEqual(e['9.1.1.1'].act_rules.map((r) => r.id), ['fx0001', 'fx0002']);
  assert.equal(e['9.1.1.1'].automation, 'partial');
  assert.equal(e['9.2.4.2'].automation, 'automatable');
  assert.deepEqual(e['9.2.4.2'].automation_basis.tools, ['tool-nover']);
  // Secondary mapping of fx0001 to 4.1.2 does not create a 4.1.2 entry.
  assert.equal(e['9.4.1.2'], undefined);
  // Semi-automated tools never appear as engines.
  assert.ok(entries.every((x) => x.engines.every((g) => g.engine !== 'tool-semi' && g.engine !== 'tool-method')));
  // Engine tags skip deprecated, disabled and experimental rules.
  assert.deepEqual(
    e['9.1.1.1'].engines.filter((g) => g.via === 'engine-tags').map((g) => g.rule_id),
    ['fixture-alt'],
  );
  assert.equal(e['9.1.3.4'].engines.some((g) => g.via === 'engine-tags'), false);
  // Numeric versions become strings; a missing version is null with a reason.
  assert.ok(e['9.1.1.1'].engines.some((g) => g.engine === 'tool-lint' && g.engine_version === '2.5'));
  const nover = e['9.2.4.2'].engines.find((g) => g.engine === 'tool-nover');
  assert.equal(nover.engine_version, null);
  assert.ok(e['9.2.4.2'].null_reasons['engines[engine=tool-nover].engine_version']);
  assert.equal(e['9.1.1.1'].en_versions['4.1.1'], 'unverified');
});

test('data from a fixtures build validates against the schema', () => {
  const out = tempDir();
  buildFixtures(out);
  assert.deepEqual(validateDataset(readData(out)), []);
});

test('build from fixtures is deterministic', () => {
  const a = tempDir();
  const b = tempDir();
  buildFixtures(a);
  buildFixtures(b);
  const first = readFileSync(join(a, 'en301549-web.json'));
  assert.deepEqual(readFileSync(join(b, 'en301549-web.json')), first);
  // A rebuild over existing output, through the CLI, gives the same bytes.
  const cli = spawnSync(process.execPath, [join(ROOT, 'scripts/build.mjs'), '--fixtures', FIXTURES, '--out', a], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(readFileSync(join(a, 'en301549-web.json')), first);
  assert.ok(first.toString().endsWith('}\n]\n'));
});

test('every entry has at least one source with a pin', () => {
  const out = tempDir();
  for (const entry of buildFixtures(out).entries) {
    assert.ok(entry.sources.length >= 1);
    assert.ok(entry.sources.every((s) => s.url && /^\S+$/.test(s.commit_or_version) && s.retrieved));
  }
});

test('no entry is reviewed after a build from fixtures', () => {
  const out = tempDir();
  assert.ok(buildFixtures(out).entries.every((e) => e.review.status === 'pending' && e.review.reviewer === null));
});

test('upstream en dashes are escaped in the data file, values unchanged', () => {
  const out = tempDir();
  buildFixtures(out);
  const raw = readFileSync(join(out, 'en301549-web.json'), 'utf8');
  assert.equal(/[\u2013\u2014]/.test(raw), false);
  assert.equal(JSON.parse(raw)[0].act_rules[0].name, 'Fixture rule one \u2013 dash escape test');
});
