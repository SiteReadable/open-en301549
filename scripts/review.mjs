// npm run review -- <clause> "<notes>"
// Marks one entry as reviewed by the maintainer, dated today. Run only by a human
// maintainer after checking the entry against its sources.

import { readFileSync, writeFileSync } from 'node:fs';
import { stringifyData } from './lib/json.mjs';
import { applyReview, localDate } from './lib/review.mjs';
import { validateDataset } from './lib/schema.mjs';

const [clause, notes] = process.argv.slice(2);
if (!clause) {
  console.error('Usage: npm run review -- <clause> "<notes>"');
  process.exit(1);
}

const file = new URL('../data/en301549-web.json', import.meta.url);
try {
  const entries = applyReview(JSON.parse(readFileSync(file, 'utf8')), clause, notes, localDate());
  const errors = validateDataset(entries);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  writeFileSync(file, stringifyData(entries));
  console.log(`Marked ${clause} as reviewed.`);
} catch (error) {
  console.error(`Review failed: ${error.message}`);
  process.exit(1);
}
