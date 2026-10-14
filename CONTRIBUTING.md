# Contributing

Issues are welcome: wrong mappings, outdated pins, unclear documentation, ideas.

Every correction must cite a source: a URL to the primary source, plus a commit SHA,
release tag or publication date. Corrections without a source cannot be accepted.

Dataset values are not edited by hand. A correction changes the build (`scripts/`), the
pins (`sources.lock.json`) or the upstream source itself, and the data is then rebuilt
with `npm run build`. Please run `npm test` before opening a pull request.

Do not copy text from the EN 301 549 standard into issues or files; refer to clause
numbers only.
