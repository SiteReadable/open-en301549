import { readFileSync } from 'node:fs';

// Minimal JSON Schema validator: only the keywords used by schema/entry.schema.json.
// Any other keyword throws, so the schema cannot silently grow past what is checked.

const ANNOTATIONS = new Set(['$schema', '$id', 'title', 'description']);
const SUPPORTED = new Set(['type', 'required', 'properties', 'additionalProperties', 'enum', 'pattern', 'items', 'minItems']);

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function matchesType(value, type) {
  const actual = typeOf(value);
  return actual === type || (type === 'number' && actual === 'integer');
}

export function validate(value, schema, path = '$') {
  const errors = [];
  for (const key of Object.keys(schema)) {
    if (!ANNOTATIONS.has(key) && !SUPPORTED.has(key)) {
      throw new Error(`Unsupported schema keyword "${key}" at ${path}`);
    }
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push(`${path}: expected type ${types.join(' or ')}, got ${typeOf(value)}`);
      return errors;
    }
  }

  if (schema.enum !== undefined && !schema.enum.some((option) => option === value)) {
    errors.push(`${path}: value ${JSON.stringify(value)} not in enum ${JSON.stringify(schema.enum)}`);
  }

  if (schema.pattern !== undefined && typeof value === 'string' && !new RegExp(schema.pattern, 'u').test(value)) {
    errors.push(`${path}: "${value}" does not match pattern ${schema.pattern}`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: expected at least ${schema.minItems} items, got ${value.length}`);
    }
    if (schema.items !== undefined) {
      value.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}[${i}]`)));
    }
  }

  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}: missing required property "${key}"`);
    }
    for (const [key, sub] of Object.entries(value)) {
      if (schema.properties && key in schema.properties) {
        errors.push(...validate(sub, schema.properties[key], `${path}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}: unexpected property "${key}"`);
      } else if (typeof schema.additionalProperties === 'object') {
        errors.push(...validate(sub, schema.additionalProperties, `${path}.${key}`));
      }
    }
  }

  return errors;
}

export function loadSchema() {
  return JSON.parse(readFileSync(new URL('../../schema/entry.schema.json', import.meta.url), 'utf8'));
}

// Validates a dataset file: an array of entries with unique clauses in clause order.
export function validateDataset(entries, schema = loadSchema()) {
  if (!Array.isArray(entries)) return ['$: dataset must be an array of entries'];
  const errors = entries.flatMap((entry, i) => validate(entry, schema, `$[${i}]`));
  const clauses = entries.map((e) => e?.clause);
  if (new Set(clauses).size !== clauses.length) errors.push('$: duplicate clauses');
  const parts = (c) => String(c).split('.').map(Number);
  for (let i = 1; i < clauses.length; i++) {
    const [a, b] = [parts(clauses[i - 1]), parts(clauses[i])];
    const d = a.map((n, k) => n - (b[k] ?? -1)).find((x) => x !== 0) ?? a.length - b.length;
    if (d > 0) errors.push(`$[${i}]: clause ${clauses[i]} is out of order`);
  }
  return errors;
}
