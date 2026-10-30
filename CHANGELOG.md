# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial scaffold.
- Conversion engine driven by `tools.json`.
- Renderers for **Google Antigravity**, **pi-agent**, **oh-my-pi (omp)**,
  and **OpenCode** (via `opencode-rules`).
- `mise.toml` with toolchain (`node@22`), tasks (`validate`, `convert`,
  `install`, `test`, `ci`), and post-install hook.
- Test suites for frontmatter parsing and every renderer.
- Documentation: architecture, rule spec, harness extension guide.

### Changed

- N/A

### Fixed

- N/A

---

## [0.1.0] — TBD

First tagged release. Reserved for the v0.1.0 cut once the harness set is
stable.
