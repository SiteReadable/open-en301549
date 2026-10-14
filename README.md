# open-en301549

An open, vendor-neutral dataset that maps the web-relevant clauses of the European
standard EN 301 549 to WCAG success criteria, W3C ACT rules and the rules of automated
accessibility engines, with an automation status per clause.

**Status: seed, 10 example entries.** This is not the full dataset. It shows the schema,
the licences, the provenance and a reproducible build on a small, rule-selected sample.
See the [roadmap](#roadmap) for what is planned.

## What is in it

| Path | What it is |
|---|---|
| `data/en301549-web.json` | The entries, sorted by clause. |
| `data/build-info.json` | Sources, pins, seed ranking and timestamp of the last build. |
| `schema/entry.schema.json` | JSON Schema (2020-12) for one entry. |
| `sources.lock.json` | The pinned upstream sources. |
| `SOURCES.md` | Each upstream source, its licence and what we read from it. |
| `PROVENANCE.md` | How the files and values were produced, including AI assistance. |

Each entry has:

- `clause`: the EN 301 549 clause number. For web content, clause 9.x.y.z corresponds to
  WCAG 2.1 success criterion x.y.z. No text of the standard is stored.
- `en_versions`: whether the clause exists in V3.2.1 and V4.1.1. V4.1.1 is published, but
  the per-clause check against it is a planned milestone, so it is `"unverified"` for now.
- `title` and `wcag`: the W3C short name of the success criterion, its level, the WCAG
  versions it belongs to and its Understanding page.
- `act_rules`: non-deprecated W3C ACT rules that map to the criterion for conformance,
  with their outcomes (secondary mappings are excluded).
- `engines`: automated engine rules, either from the W3C ACT implementation reports
  (`via: "act-implementation"`, with the reported consistency) or from the
  `EN-9.x.y.z` tags in the axe-core rule files (`via: "engine-tags"`).
- `automation` and `automation_basis`: see below.
- `manual_test`: reserved, `null` in the seed.
- `null_reasons`: why each derived `null` is `null`.
- `sources`: the pinned sources behind the entry.
- `review`: `pending` until a human maintainer has checked the entry.

## How `automation` is derived

Decision table `decision-table-v1`, applied by `scripts/lib/derive.mjs` to the ACT data.
"Mapped" means the ACT rule lists the criterion with `forConformance: true`; "approved"
means the rule is neither proposed nor deprecated.

| `automation` | Condition |
|---|---|
| `automatable` | A mapped, approved ACT rule has `passed: "satisfied"` and at least one automated implementation of that rule has consistency `complete`. |
| `partial` | Otherwise, a mapped, approved ACT rule has at least one automated implementation with consistency `complete` or `partial`. |
| `manual` | Otherwise. |

Which implementations count as automated comes from the `type` field of
`act-implementations.yml` in the ACT repository: `Automated tool` and `Linter` count;
`Semi-automated tool` and `Test methodology` never count as automation. Engine tags are
recorded but never change `automation`.

A pass in most ACT rules means "further testing needed", so `automatable` is rare by
design. `automation_basis` lists the ACT rules and tools behind each decision, so a
reviewer can see when a decision rests on a single tool.

## Seed selection

The 10 entries are chosen by a rule, recorded with the counts in `data/build-info.json`:
WCAG 2.1 level A and AA criteria ranked by the number of approved ACT rules that map to
them and have at least one automated implementation with consistency `complete`; ties
are broken by clause number.

## Build, test, validate, review

Requires Node 20 or later. There are no dependencies to install.

```sh
npm run build      # downloads the pinned sources into .cache/ and rebuilds data/
npm test           # offline tests against synthetic fixtures in test/fixtures/
npm run validate   # validates data/en301549-web.json against the schema
npm run review -- 9.1.1.1 "Checked against the linked sources."
```

`npm run build` verifies every pin (archive commit, release tag, file hash) and stops if
one does not match. Two builds on the same pins produce a byte-identical
`data/en301549-web.json`. A rebuild keeps the review of entries whose derived values did
not change, and resets the others to `pending`.

Only `npm run review`, run by a maintainer after checking an entry by hand, sets an
entry to `reviewed`. The build never does.

## Licences

- Code (scripts, tests, schema): [MIT](LICENSE).
- Data (`data/`): [CC-BY-4.0](LICENSES/CC-BY-4.0.txt). The licence covers this
  compilation and the project's own contributions. Values taken from upstream sources
  keep their upstream terms; see [SOURCES.md](SOURCES.md) for the required notices.

Copyright: The open-en301549 contributors.

## How to cite

> The open-en301549 contributors. *open-en301549: EN 301 549 web clauses mapped to WCAG,
> W3C ACT rules and automated engine rules* (seed, version 0.1.0). 2026.
> https://github.com/SiteReadable/open-en301549. Data licensed under CC-BY-4.0.

Please also give the commit of this repository you used; `data/build-info.json` records
the upstream pins behind it.

## Roadmap

Planned milestones, not part of this seed:

1. Full inventory of the web-relevant clauses of EN 301 549.
2. Per-clause differences between V4.1.1 and V3.2.1.
3. Governance rules for maintainers, reviews and corrections.
4. Manual test steps for each clause (`manual_test`).
5. An evidence format for recording test results against the dataset.
6. An Annex V generator.

## Contributing

Issues and corrections are welcome; every correction must cite a source. See
[CONTRIBUTING.md](CONTRIBUTING.md).
