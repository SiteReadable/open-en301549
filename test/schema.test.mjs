import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSchema, validate, validateDataset } from '../scripts/lib/schema.mjs';

test('type, including type lists and integer as number', () => {
  assert.deepEqual(validate('x', { type: 'string' }), []);
  assert.equal(validate(1, { type: 'string' }).length, 1);
  assert.deepEqual(validate(null, { type: ['string', 'null'] }), []);
  assert.deepEqual(validate(3, { type: 'number' }), []);
  assert.equal(validate([], { type: 'object' }).length, 1);
  assert.equal(validate(null, { type: 'object' }).length, 1);
});

test('enum compares by value, including null and booleans', () => {
  assert.deepEqual(validate(null, { enum: ['complete', null] }), []);
  assert.deepEqual(validate(true, { enum: [true, 'unverified'] }), []);
  assert.equal(validate('true', { enum: [true] }).length, 1);
});

test('pattern applies to strings only', () => {
  assert.deepEqual(validate('9.1.1.1', { pattern: '^9\\.' }), []);
  assert.equal(validate('1.1.1', { pattern: '^9\\.' }).length, 1);
  assert.deepEqual(validate(null, { type: ['string', 'null'], pattern: '^x$' }), []);
});

test('required, properties and additionalProperties', () => {
  const schema = { type: 'object', required: ['a'], properties: { a: { type: 'string' } }, additionalProperties: false };
  assert.deepEqual(validate({ a: 'x' }, schema), []);
  assert.match(validate({}, schema)[0], /missing required property "a"/);
  assert.match(validate({ a: 'x', b: 1 }, schema)[0], /unexpected property "b"/);
  const open = { type: 'object', additionalProperties: { type: 'string' } };
  assert.deepEqual(validate({ k: 'v' }, open), []);
  assert.equal(validate({ k: 1 }, open).length, 1);
});

test('items and minItems', () => {
  const schema = { type: 'array', minItems: 1, items: { enum: ['2.0', '2.1'] } };
  assert.deepEqual(validate(['2.1'], schema), []);
  assert.equal(validate([], schema).length, 1);
  assert.match(validate(['2.2'], schema)[0], /\$\[0\]/);
});

test('unsupported keywords throw instead of being ignored', () => {
  assert.throws(() => validate('x', { minLength: 1 }), /Unsupported schema keyword "minLength"/);
});

test('the entry schema only uses supported keywords', () => {
  const schema = loadSchema();
  assert.equal(validate({}, schema).length > 0, true);
});

test('dataset must be sorted by clause with unique clauses', () => {
  const schema = { type: 'object' };
  assert.deepEqual(validateDataset([{ clause: '9.1.4.3' }, { clause: '9.1.4.12' }], schema), []);
  assert.match(validateDataset([{ clause: '9.1.4.12' }, { clause: '9.1.4.3' }], schema)[0], /out of order/);
  assert.match(validateDataset([{ clause: '9.1.1.1' }, { clause: '9.1.1.1' }], schema)[0], /duplicate/);
  assert.match(validateDataset({}, schema)[0], /array/);
});
