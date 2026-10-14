# Provenance

## AI assistance

The following files were written with AI assistance (Claude Opus, through Claude Code),
directed and checked by a human maintainer:

- `README.md`, `SOURCES.md`, `PROVENANCE.md`, `CONTRIBUTING.md`
- `LICENSE` (the standard MIT text, with the project copyright line)
- `.gitignore`, `package.json`
- `schema/entry.schema.json`
- `sources.lock.json` (the pins were looked up in the upstream repositories and sites on
  2026-10-14 and are verified by the build on every run)
- `scripts/` (all files)
- `test/` (all files, including the synthetic fixtures in `test/fixtures/`)

Not written with AI assistance:

- `LICENSES/CC-BY-4.0.txt`: the official text from
  https://creativecommons.org/licenses/by/4.0/legalcode.txt, unmodified.

Every commit made with AI assistance ends with the trailer `Assisted-by: Claude Opus (AI)`.

## Dataset values

The values in `data/en301549-web.json` and `data/build-info.json` are produced by a
deterministic script, `scripts/build.mjs`, from the sources listed in
[SOURCES.md](SOURCES.md) and pinned in `sources.lock.json`. No value is typed by hand or
by the AI assistant. A value that cannot be derived is `null`, with the reason in the
entry's `null_reasons`. Two builds on the same pins produce a byte-identical
`data/en301549-web.json`.

## Human review

Each entry is reviewed by a human maintainer against its sources before its
`review.status` becomes `reviewed`. The build script never sets `reviewed`; only
`npm run review -- <clause> "<notes>"`, run by the maintainer, does. When a later build
changes any derived value of an entry, its review is reset to `pending`.
