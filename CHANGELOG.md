# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0](https://github.com/deuriib/agency-rules/compare/v0.7.0...v0.8.0) (2026-10-31)


### Features

* **rules:** add Nexus Strategy references ([75d4013](https://github.com/deuriib/agency-rules/commit/75d40130eb4fe71e96778c50622418fed5be1672))
* **rules:** add Nexus Strategy references ([ef54d1c](https://github.com/deuriib/agency-rules/commit/ef54d1c6c05e38ab4ab79044729d23757289ca12)), closes [#16](https://github.com/deuriib/agency-rules/issues/16)

## [0.7.0](https://github.com/deuriib/agency-rules/compare/v0.6.1...v0.7.0) (2026-10-31)


### Features

* **cli:** support comma-separated lists for rules and harnesses ([925de5f](https://github.com/deuriib/agency-rules/commit/925de5f8526a11f120d85c9b4bd93a393ef6604c))
* **cli:** support comma-separated lists for rules and harnesses ([1c7d74e](https://github.com/deuriib/agency-rules/commit/1c7d74e2d7c6929f50659a7852dda7ccc0fe607e)), closes [#13](https://github.com/deuriib/agency-rules/issues/13)

## [0.6.1](https://github.com/deuriib/agency-rules/compare/v0.6.0...v0.6.1) (2026-10-31)


### Bug Fixes

* **pkg:** move runtime dependencies out of devDependencies ([b39c1c8](https://github.com/deuriib/agency-rules/commit/b39c1c8e1f4e46c36c5854f8887b64c335cce01a))

## [0.6.0](https://github.com/deuriib/agency-rules/compare/v0.5.0...v0.6.0) (2026-10-31)


### Features

* **rules:** add Agentmemory MCP guidelines ([0d68b32](https://github.com/deuriib/agency-rules/commit/0d68b32e91b5385087b34d9dc93b45576bf88ceb))
* **rules:** add Agentmemory MCP guidelines ([1c846f5](https://github.com/deuriib/agency-rules/commit/1c846f5715137ea0d98d5365b99e4589a129a92b)), closes [#14](https://github.com/deuriib/agency-rules/issues/14)
* **rules:** add subagent delegation guidelines ([4527e1f](https://github.com/deuriib/agency-rules/commit/4527e1f7a16fb131a09406083562d59ff9f0eb8b))
* **rules:** add subagent delegation guidelines ([1042370](https://github.com/deuriib/agency-rules/commit/1042370beb15a15e9f9a57831a754da4ee05edbc)), closes [#15](https://github.com/deuriib/agency-rules/issues/15)


### Bug Fixes

* unused variable via biome ([7bd25b1](https://github.com/deuriib/agency-rules/commit/7bd25b1c8c1b28521d6aaee57e1d5179e0cfafab))

## [0.5.0](https://github.com/deuriib/agency-rules/compare/v0.4.1...v0.5.0) (2026-10-31)


### Features

* **cli:** add 'list' command to display available rules ([15a7302](https://github.com/deuriib/agency-rules/commit/15a73025cd8ae1f90ab4a8602ac68817306aa128))

## [0.4.1](https://github.com/deuriib/agency-rules/compare/v0.4.0...v0.4.1) (2026-10-31)


### Bug Fixes

* **pkg:** include rules directory in npm bundle and resolve package paths ([3877a97](https://github.com/deuriib/agency-rules/commit/3877a97e22ec5b79c183c47f3ed7b026171684e5))

## [0.4.0](https://github.com/deuriib/agency-rules/compare/v0.3.2...v0.4.0) (2026-10-31)


### Features

* **cli:** expose agency-rules binary and router ([dfb6b95](https://github.com/deuriib/agency-rules/commit/dfb6b95b8b6d9ac6f4622479527f182d9c1e637c))

## [0.3.2](https://github.com/deuriib/agency-rules/compare/v0.3.1...v0.3.2) (2026-10-31)


### Bug Fixes

* **ci:** completely remove NODE_AUTH_TOKEN to enforce OIDC ([59b966d](https://github.com/deuriib/agency-rules/commit/59b966dbdf29502b127f5b271de42f9ca56687f9))
* **ci:** completely remove NODE_AUTH_TOKEN to enforce OIDC ([a8229a7](https://github.com/deuriib/agency-rules/commit/a8229a7fc912f26b34dec9a2735a659ce63d12a9))

## [0.3.1](https://github.com/deuriib/agency-rules/compare/v0.3.0...v0.3.1) (2026-10-31)


### Bug Fixes

* **ci:** resolve npm E404 by enforcing OIDC trusted publishing ([4266f4a](https://github.com/deuriib/agency-rules/commit/4266f4afd6a933c1835973e52ce09b4e620221a4))

## [0.3.0](https://github.com/deuriib/agency-rules/compare/v0.2.0...v0.3.0) (2026-10-31)


### Features

* **skills:** add writing-rules skill for rule authoring ([41b99d7](https://github.com/deuriib/agency-rules/commit/41b99d7416fa52463303fc150e237fbc26ba90e1))


### Bug Fixes

* **ci:** correct labels config file extension ([51617c6](https://github.com/deuriib/agency-rules/commit/51617c68abcf95b13040b1cfeadcbf52013ff9d4))
* **ci:** use node 24 for npm trusted publishing ([cf49055](https://github.com/deuriib/agency-rules/commit/cf4905539693f5a1d38ed902abc5a5c7c32d1635))

## [0.2.0](https://github.com/deuriib/agency-rules/compare/v0.1.0...v0.2.0) (2026-10-31)


### Features

* bootstrap agency-rules with mise and four harness renderers ([c1bf3c9](https://github.com/deuriib/agency-rules/commit/c1bf3c9f078d84f578f2e37633dcc87fc98f3831))
* **install:** add interactive mode and harness/scope parameters ([e1996be](https://github.com/deuriib/agency-rules/commit/e1996bec3da5a34db23c06181dcb0071b35f5eff))
* **rules:** enforce conventional commits standard ([53f78b9](https://github.com/deuriib/agency-rules/commit/53f78b97a8669db60b7ac2110f10d9ad5658df39))


### Bug Fixes

* **ci:** add missing mise sidecar for biome ([ded656e](https://github.com/deuriib/agency-rules/commit/ded656e16acc862ef975069459bc8dd324adc051))
* **install:** resolve biome linting errors and formatting ([04f4fee](https://github.com/deuriib/agency-rules/commit/04f4feeabcd2667d66b95865d0b7dd687cdd4798))

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
