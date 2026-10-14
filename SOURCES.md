# Sources

Every value in `data/en301549-web.json` is derived by `scripts/build.mjs` from the
sources below, pinned in `sources.lock.json`. Pins were chosen on 2026-10-14.

| Source | URL | Pin | Licence | What we read |
|---|---|---|---|---|
| W3C ACT rules | https://github.com/w3c/wcag-act-rules | commit `f39b7f81cee60efe1f23205a893e031a7a02821b` | [W3C Document License](https://www.w3.org/copyright/document-license-2023/) (repository `LICENSE.md`) | `wcag-mapping.json`: rule id, name, permalink, `deprecated`, `proposed`, `frontmatter.accessibility_requirements` (forConformance, passed, failed, inapplicable). `_data/wcag-act-rules/implementations/*.json`: `version` and `actRuleMapping` (ruleId, ruleApproved, procedureNames, consistency). `_data/wcag-act-rules/act-implementations.yml`: `uniqueKey` and `type`. `_data/wcag-act-rules/requirements.json`: Understanding URL, number and level (cross-check). |
| axe-core | https://github.com/dequelabs/axe-core | tag `v4.14.0`, commit `e797173108eadfa4355fe06af331791734e1757f` | [MPL-2.0](https://github.com/dequelabs/axe-core/blob/v4.14.0/LICENSE) | `lib/rules/*.json`: `id`, `tags` (`EN-9.x.y.z`, `deprecated`, `experimental`), `enabled`. `package.json`: `version`. |
| WCAG 2.1 success criteria | https://www.w3.org/WAI/WCAG21/wcag.json | published 2026-09-03 (Last-Modified), SHA-256 `fc9f2e8a94421fc305dced3ec4020fde088572493d44da70789ceb6f775bb4d7` | [W3C Document License](https://www.w3.org/copyright/document-license-2023/) | `num`, `id`, `handle` (the W3C short name), `level`, `versions`. |
| ETSI EN 301 549 V3.2.1 | https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf | V3.2.1, 2021-03 | Copyright of the publishers; not redistributed | Version, date, and the structural rule that clause 9.x.y.z corresponds to WCAG 2.1 success criterion x.y.z (levels A and AA) for web content. |
| ETSI EN 301 549 V4.1.1 | https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf | V4.1.1, 2026-09 | Copyright of the publishers; not redistributed | Version and date only. Published stage (`_60`) on etsi.org. Per-clause content is not used yet. |

The `w3c/wcag` repository has no machine-readable success criteria file at a commit (its
root `wcag21.json` is a template), so the W3C published `wcag.json` is used and pinned by
its publication date and hash. The build stops if the hash changes. The ETSI PDFs are not
downloaded by the build; their hashes are recorded in `sources.lock.json` for reference.

## Licence notes

These are the project's reading of the upstream licences, not legal advice.

- **W3C Document License** (ACT rules, WCAG). It permits copying and distributing
  documents or portions of them, with a link to the original, the copyright notice and
  the document status. It grants no general right to create derivative documents. We
  store facts (identifiers, numbers, levels, outcomes, flags, URLs) and short names copied
  verbatim (WCAG short names, ACT rule names), with the notice below.
- **MPL-2.0** (axe-core). It applies to the axe-core source files. We store facts read
  from them (rule ids, tags, version), not the files or their descriptions.
- **EN 301 549**. No text of the standard is stored, only version, date and clause numbers.
- None of the upstream licences prevents redistributing the facts we store.

## Required notices

Copyright © 2023 W3C®. This software or document includes material copied from or
derived from Web Content Accessibility Guidelines (WCAG) 2.1
(https://www.w3.org/TR/WCAG21/), a W3C Recommendation, and from the W3C Accessibility
Conformance Testing (ACT) Rules (https://www.w3.org/WAI/standards-guidelines/act/rules/)
and their implementation reports, published by the W3C Accessibility Guidelines Working
Group. Approved ACT rules are published by the Working Group; proposed rules are drafts.
Licence: https://www.w3.org/copyright/document-license-2023/

Rule identifiers and tags from axe-core (https://github.com/dequelabs/axe-core),
Copyright Deque Systems, Inc., licensed under the Mozilla Public License 2.0.
