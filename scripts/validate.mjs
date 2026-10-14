// npm run validate [-- <file>]: validates the dataset against schema/entry.schema.json.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataset } from './lib/schema.mjs';

const file = resolve(process.argv[2] ?? fileURLToPath(new URL('../data/en301549-web.json', import.meta.url)));
const errors = validateDataset(JSON.parse(readFileSync(file, 'utf8')));
if (errors.length > 0) {
  console.error(`${file} is invalid:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`${file} is valid.`);
