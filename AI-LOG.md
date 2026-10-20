# AI log

A public summary of every AI-assisted work session on this repository, as asked by the
NLnet generative AI policy. A session is added once its log has been exported.

| Date | Tool | Model and version | What was asked | Commits |
|---|---|---|---|---|
| 2026-10-14 to 2026-10-15 | Claude Code | Claude Opus, version not recorded | Set up the seed repository: find and pin the upstream sources and propose the schema, automation rule and seed selection, then, after the maintainer's approval, write the schema, scripts, tests and documentation and build the 10 example entries. | `adaeae6`, `7498ecd`, `f85900a`, `f097031`, `f0c16e9` |

| 2026-10-20 | Claude Code | Claude Opus, version not recorded | Prepare a read-only review checklist for the 9 pending entries, then, after the maintainer's own review, add the CI workflow, this log, the PROVENANCE update and the README status line. | `77814db`, `783b793`, `a1d4f08`, `4a3e568` |

Dataset values are not written by the AI assistant. They are produced by a deterministic
script, `scripts/build.mjs`, from the pinned sources listed in [SOURCES.md](SOURCES.md).
Every entry is reviewed by the maintainer before its review status becomes `reviewed`;
only the maintainer runs the review command. The full session logs are available to the
funder on request.

See also [PROVENANCE.md](PROVENANCE.md).
