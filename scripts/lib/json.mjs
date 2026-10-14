// Stable JSON output: key order follows the schema, 2-space indent, trailing newline.

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Reorders object keys to follow schema.properties order, recursively.
// Keys not listed in the schema (for example under additionalProperties) are sorted.
export function orderBySchema(value, schema) {
  if (Array.isArray(value)) {
    return value.map((item) => orderBySchema(item, schema?.items));
  }
  if (!isPlainObject(value)) return value;
  const listed = Object.keys(schema?.properties ?? {});
  const rest = Object.keys(value).filter((k) => !listed.includes(k)).sort();
  const out = {};
  for (const key of [...listed.filter((k) => k in value), ...rest]) {
    const sub = schema?.properties?.[key] ?? (isPlainObject(schema?.additionalProperties) ? schema.additionalProperties : undefined);
    out[key] = orderBySchema(value[key], sub);
  }
  return out;
}

// En and em dashes are written as JSON escapes so data files stay free of them
// while keeping upstream values unchanged. They can only occur inside strings.
export function stringifyData(value) {
  return JSON.stringify(value, null, 2).replace(/[\u2013\u2014]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`) + '\n';
}
