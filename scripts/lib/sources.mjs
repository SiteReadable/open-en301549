// Reading the pinned source files, either from downloaded archives (build)
// or from a directory with the same layout (offline tests with fixtures).
//
// Layout, relative to each source root:
//   act/  wcag-mapping.json, _data/wcag-act-rules/{requirements.json,act-implementations.yml,implementations/*.json}
//   axe/  package.json, lib/rules/*.json
//   wcag/ wcag.json

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readTarGz } from './tar.mjs';

export const ACT_DATA = '_data/wcag-act-rules';

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function directoryReader(root) {
  return {
    read: (source, path) => readFileSync(join(root, source, path), 'utf8'),
    list: (source, dir) => readdirSync(join(root, source, dir)).sort().map((name) => `${dir}/${name}`),
  };
}

// archives: { act: Map, axe: Map } with the top-level directory stripped; wcag: string.
export function archiveReader(archives) {
  return {
    read(source, path) {
      if (source === 'wcag' && path === 'wcag.json') return archives.wcag;
      const file = archives[source]?.get(path);
      if (!file) throw new Error(`File ${path} not found in pinned ${source} archive`);
      return file.toString('utf8');
    },
    list(source, dir) {
      return [...archives[source].keys()]
        .filter((p) => p.startsWith(`${dir}/`) && !p.slice(dir.length + 1).includes('/'))
        .sort();
    },
  };
}

export function readInputs(reader) {
  const jsonFiles = (source, dir) => reader.list(source, dir).filter((p) => p.endsWith('.json'));
  const implementations = {};
  for (const path of jsonFiles('act', `${ACT_DATA}/implementations`)) {
    implementations[basename(path, '.json')] = JSON.parse(reader.read('act', path));
  }
  return {
    actMapping: JSON.parse(reader.read('act', 'wcag-mapping.json')),
    requirements: JSON.parse(reader.read('act', `${ACT_DATA}/requirements.json`)),
    implementationsYml: reader.read('act', `${ACT_DATA}/act-implementations.yml`),
    implementations,
    axeVersion: JSON.parse(reader.read('axe', 'package.json')).version,
    axeRules: jsonFiles('axe', 'lib/rules').map((path) => JSON.parse(reader.read('axe', path))),
    wcag: JSON.parse(reader.read('wcag', 'wcag.json')),
  };
}

async function download(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Cannot reach ${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function cached(cacheDir, name, url) {
  const file = join(cacheDir, name);
  if (!existsSync(file)) writeFileSync(file, await download(url));
  return readFileSync(file);
}

async function resolveTag(repo, tag) {
  const response = await fetch(`https://api.github.com/repos/${repo}/git/ref/tags/${tag}`, {
    headers: { accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error(`Cannot resolve tag ${tag} of ${repo}: HTTP ${response.status}`);
  let object = (await response.json()).object;
  if (object.type === 'tag') {
    const annotated = await fetch(object.url, { headers: { accept: 'application/vnd.github+json' } });
    if (!annotated.ok) throw new Error(`Cannot read annotated tag ${tag} of ${repo}: HTTP ${annotated.status}`);
    object = (await annotated.json()).object;
  }
  return object.sha;
}

async function githubArchive(cacheDir, source) {
  const name = `${source.repo.replace('/', '-')}-${source.commit}.tar.gz`;
  const gz = await cached(cacheDir, name, `https://codeload.github.com/${source.repo}/tar.gz/${source.commit}`);
  const { files, globalComment } = readTarGz(gz);
  if (globalComment !== source.commit) {
    throw new Error(`Archive ${name} is for commit ${globalComment}, expected ${source.commit}`);
  }
  const stripped = new Map();
  for (const [path, body] of files) stripped.set(path.slice(path.indexOf('/') + 1), body);
  return { files: stripped, archive: { file: `.cache/${name}`, sha256: sha256(gz) } };
}

// Downloads (or reuses from cacheDir) the pinned files and verifies every pin.
// Throws instead of falling back to any other source.
export async function fetchPinned(lock, cacheDir) {
  mkdirSync(cacheDir, { recursive: true });
  const { act, axe, wcag } = lock.sources;

  const tagCommit = await resolveTag(axe.repo, axe.tag);
  if (tagCommit !== axe.commit) {
    throw new Error(`Tag ${axe.tag} of ${axe.repo} now points to ${tagCommit}, lock says ${axe.commit}`);
  }

  const actArchive = await githubArchive(cacheDir, act);
  const axeArchive = await githubArchive(cacheDir, axe);

  const wcagFile = await cached(cacheDir, 'w3c-WCAG21-wcag.json', wcag.url);
  const wcagHash = sha256(wcagFile);
  if (wcagHash !== wcag.sha256) {
    throw new Error(`${wcag.url} has SHA-256 ${wcagHash}, lock says ${wcag.sha256}. W3C republished it; a maintainer must review and update the pin.`);
  }

  return {
    reader: archiveReader({ act: actArchive.files, axe: axeArchive.files, wcag: wcagFile.toString('utf8') }),
    downloads: {
      act: actArchive.archive,
      axe: axeArchive.archive,
      wcag: { file: '.cache/w3c-WCAG21-wcag.json', sha256: wcagHash },
    },
  };
}
