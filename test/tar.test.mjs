import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { readTarGz } from '../scripts/lib/tar.mjs';

function header(name, size, type, prefix = '') {
  const block = Buffer.alloc(512);
  block.write(name, 0, 'utf8');
  block.write(size.toString(8).padStart(11, '0'), 124, 'utf8');
  block.write(type, 156, 'utf8');
  block.write(prefix, 345, 'utf8');
  return block;
}

function pad(body) {
  return Buffer.concat([body, Buffer.alloc((512 - (body.length % 512)) % 512)]);
}

function pax(records) {
  const text = Object.entries(records)
    .map(([k, v]) => {
      const record = ` ${k}=${v}\n`;
      let length = record.length + 1;
      while (String(length).length + record.length !== length) length = String(length).length + record.length;
      return `${length}${record}`;
    })
    .join('');
  return Buffer.from(text, 'utf8');
}

function entry(name, type, body, prefix) {
  return Buffer.concat([header(name, body.length, type, prefix), pad(body)]);
}

test('reads files, ustar prefix, pax path and the global commit comment', () => {
  const sha = 'a'.repeat(40);
  const longPath = `repo-abc/${'d/'.repeat(60)}file.json`;
  const tar = Buffer.concat([
    entry('pax_global_header', 'g', pax({ comment: sha })),
    entry('repo-abc/', '5', Buffer.alloc(0)),
    entry('a.json', '0', Buffer.from('{"a":1}'), 'repo-abc'),
    entry('PaxHeader', 'x', pax({ path: longPath })),
    entry('ignored-name', '0', Buffer.from('long')),
    Buffer.alloc(1024),
  ]);
  const { files, globalComment } = readTarGz(gzipSync(tar));
  assert.equal(globalComment, sha);
  assert.deepEqual([...files.keys()], ['repo-abc/a.json', longPath]);
  assert.equal(files.get('repo-abc/a.json').toString(), '{"a":1}');
  assert.equal(files.get(longPath).toString(), 'long');
});
