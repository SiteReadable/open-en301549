// Shared by scripts/build.mjs (pinned downloads) and the tests (fixtures).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUTOMATION_RULE, SEED_RULE, deriveEntries, rankCriteria } from './derive.mjs';
import { stringifyData } from './json.mjs';
import { validateDataset } from './schema.mjs';
import { readInputs } from './sources.mjs';

export const DATA_FILE = 'en301549-web.json';
export const INFO_FILE = 'build-info.json';

export function buildFromReader(reader, lock, outDir, { downloads = null, now = new Date() } = {}) {
  const inputs = readInputs(reader);
  const dataPath = join(outDir, DATA_FILE);
  const previous = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, 'utf8')) : [];
  const entries = deriveEntries(inputs, lock, previous);

  const errors = validateDataset(entries);
  if (errors.length > 0) throw new Error(`Derived data does not validate:\n${errors.join('\n')}`);

  const info = {
    generated_at: now.toISOString(),
    generator: 'scripts/build.mjs',
    data_file: `data/${DATA_FILE}`,
    data_license: 'CC-BY-4.0',
    entry_count: entries.length,
    pinned_on: lock.pinned_on,
    seed: {
      rule: SEED_RULE,
      size: lock.seed_size,
      ranking: rankCriteria(inputs).map(({ clause, count }) => ({ clause, approved_act_rules_with_complete_automation: count })),
    },
    automation_rule: AUTOMATION_RULE,
    sources: lock.sources,
    downloads,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(dataPath, stringifyData(entries));
  writeFileSync(join(outDir, INFO_FILE), stringifyData(info));
  return { entries, info };
}
