// Minimal reader for the gzipped tar archives GitHub serves for a commit.
// Supports ustar names with prefix, pax extended headers (path) and the pax
// global header, whose "comment" GitHub sets to the archived commit SHA.

import { gunzipSync } from 'node:zlib';

function field(block, start, length) {
  const raw = block.subarray(start, start + length);
  const end = raw.indexOf(0);
  return raw.subarray(0, end === -1 ? length : end).toString('utf8');
}

function parsePax(buffer) {
  const records = {};
  let offset = 0;
  while (offset < buffer.length) {
    const space = buffer.indexOf(0x20, offset);
    if (space === -1) break;
    const length = Number.parseInt(buffer.subarray(offset, space).toString('utf8'), 10);
    if (!Number.isFinite(length) || length <= 0) break;
    const record = buffer.subarray(space + 1, offset + length - 1).toString('utf8');
    const eq = record.indexOf('=');
    records[record.slice(0, eq)] = record.slice(eq + 1);
    offset += length;
  }
  return records;
}

// Returns { files: Map<path, Buffer>, globalComment } for regular files only.
export function readTarGz(gzipped) {
  const tar = gunzipSync(gzipped);
  const files = new Map();
  let globalComment = null;
  let nextPath = null;
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const name = field(header, 0, 100);
    const size = Number.parseInt(field(header, 124, 12).trim() || '0', 8);
    const type = String.fromCharCode(header[156] || 0x30);
    const prefix = field(header, 345, 155);
    const body = tar.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;

    if (type === 'g') {
      globalComment = parsePax(body).comment ?? globalComment;
    } else if (type === 'x') {
      nextPath = parsePax(body).path ?? null;
    } else {
      const path = nextPath ?? (prefix ? `${prefix}/${name}` : name);
      nextPath = null;
      if (type === '0') files.set(path, Buffer.from(body));
    }
  }
  return { files, globalComment };
}
