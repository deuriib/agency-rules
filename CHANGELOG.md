# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.19.5](https://github.com/deuriib/agency-rules/compare/v0.19.4...v0.19.5) (2026-11-04)


### Bug Fixes

* **install:** register the plugin in the current key, without a shadowing config ([aa830ad](https://github.com/deuriib/agency-rules/commit/aa830add6f92ad49919ddeec51bf9683a0220661))

## [0.19.4](https://github.com/deuriib/agency-rules/compare/v0.19.3...v0.19.4) (2026-11-04)


### Bug Fixes

* **tools:** point the piAgent project destination at .pi/agent/rules ([3568802](https://github.com/deuriib/agency-rules/commit/35688028f0a46a068945976ce59a80a8d21612ff))

## [0.19.3](https://github.com/deuriib/agency-rules/compare/v0.19.2...v0.19.3) (2026-11-04)


### Bug Fixes

* **pkg:** declare the bin target without a ./ prefix ([#101](https://github.com/deuriib/agency-rules/issues/101)) ([e4a5a90](https://github.com/deuriib/agency-rules/commit/e4a5a9037867b0093f778d996edf3536a27cc90f)), closes [#100](https://github.com/deuriib/agency-rules/issues/100)

## [0.19.2](https://github.com/deuriib/agency-rules/compare/v0.19.1...v0.19.2) (2026-11-04)


### Bug Fixes

* **install:** treat a manifest that lists no files as a broken build ([#98](https://github.com/deuriib/agency-rules/issues/98)) ([80d6756](https://github.com/deuriib/agency-rules/commit/80d6756ccfec5868a62608168fbe513a32084d02)), closes [#97](https://github.com/deuriib/agency-rules/issues/97)

## [0.19.1](https://github.com/deuriib/agency-rules/compare/v0.19.0...v0.19.1) (2026-11-04)


### Bug Fixes

* **cli:** make every command's exit code match its message ([b1b6fa2](https://github.com/deuriib/agency-rules/commit/b1b6fa296a2422a80b88c7ce66d5f314a050e969))

## [0.19.0](https://github.com/deuriib/agency-rules/compare/v0.18.0...v0.19.0) (2026-11-04)


### Features

* **rules:** add FIN finance guidelines ([#92](https://github.com/deuriib/agency-rules/issues/92)) ([82a3b48](https://github.com/deuriib/agency-rules/commit/82a3b48f0f26d93355b50f472072c838399636cd))

## [0.18.0](https://github.com/deuriib/agency-rules/compare/v0.17.0...v0.18.0) (2026-11-04)


### Features

* **eval:** detect numeric contradictions between rules ([#89](https://github.com/deuriib/agency-rules/issues/89)) ([4d0ecf0](https://github.com/deuriib/agency-rules/commit/4d0ecf0195ce1843e52faa118875e71896b2f202))

## [0.17.0](https://github.com/deuriib/agency-rules/compare/v0.16.0...v0.17.0) (2026-11-04)


### Features

* **rules:** add LEG legal guidelines ([#87](https://github.com/deuriib/agency-rules/issues/87)) ([7b64d78](https://github.com/deuriib/agency-rules/commit/7b64d7825289a15d2b48d219447f097cf1f95065))


### Bug Fixes

* restore eval and make the CI gate actually gate ([#83](https://github.com/deuriib/agency-rules/issues/83)) ([c769123](https://github.com/deuriib/agency-rules/commit/c769123b00e6de71ef9d134e1d5980b95aa806ce))

## [0.16.0](https://github.com/deuriib/agency-rules/compare/v0.15.0...v0.16.0) (2026-11-04)


### Features

* **rules:** add PRV privacy guidelines ([#78](https://github.com/deuriib/agency-rules/issues/78)) ([7cf5691](https://github.com/deuriib/agency-rules/commit/7cf5691c8bf7777032578883268b7258d4b7cb6b))


### Bug Fixes

* **validate:** harden frontmatter validation ([#81](https://github.com/deuriib/agency-rules/issues/81)) ([b5f3446](https://github.com/deuriib/agency-rules/commit/b5f3446eb4cc92892e02a3240b88f1c5e9db07c4))

## [0.15.0](https://github.com/deuriib/agency-rules/compare/v0.14.2...v0.15.0) (2026-11-04)


### Features

* **rules:** add MKT marketing guidelines ([#73](https://github.com/deuriib/agency-rules/issues/73)) ([c30d328](https://github.com/deuriib/agency-rules/commit/c30d328f27eedd4547fcd5f832c4f23092353eff))

## [0.14.2](https://github.com/deuriib/agency-rules/compare/v0.14.1...v0.14.2) (2026-11-04)


### Bug Fixes

* **release:** treat a duplicate npm publish as success, not a failure ([#70](https://github.com/deuriib/agency-rules/issues/70)) ([2635bdc](https://github.com/deuriib/agency-rules/commit/2635bdcab7a9b798af793f4827dd6f93d1e9c7ab))

## [0.14.1](https://github.com/deuriib/agency-rules/compare/v0.14.0...v0.14.1) (2026-11-04)


### Bug Fixes

* **docs:** repair the two malformed opencode-rules links ([#68](https://github.com/deuriib/agency-rules/issues/68)) ([ad01d6f](https://github.com/deuriib/agency-rules/commit/ad01d6f499fa5a0f61be4d60c1d788348dce8a4d))

## [0.14.0](https://github.com/deuriib/agency-rules/compare/v0.13.0...v0.14.0) (2026-11-04)


### Features

* **cli:** add eval command with a duplication gate ([#61](https://github.com/deuriib/agency-rules/issues/61)) ([0a2f638](https://github.com/deuriib/agency-rules/commit/0a2f638cc05c7831e48744da2141990e62101633))
* **cli:** add rule generator command ([#58](https://github.com/deuriib/agency-rules/issues/58)) ([8aedac6](https://github.com/deuriib/agency-rules/commit/8aedac6f6dc50de079ba3cd12c37059826a1da15))
* **cli:** add rule selection to interactive install ([#62](https://github.com/deuriib/agency-rules/issues/62)) ([e54c1f0](https://github.com/deuriib/agency-rules/commit/e54c1f019b6aa4f040474e8c3c396890f5df1f7c))
* **cli:** show installation and sync status in list ([#64](https://github.com/deuriib/agency-rules/issues/64)) ([2ecfda0](https://github.com/deuriib/agency-rules/commit/2ecfda0db4a1f90308161a7812f7d74b03d10318))
* **cli:** sync installed rules by content, not by copying everything ([#63](https://github.com/deuriib/agency-rules/issues/63)) ([6d0e444](https://github.com/deuriib/agency-rules/commit/6d0e44446756b2f0f0db18f7f5cba763afdb6877))
* **eval:** add overlap scoring library ([#60](https://github.com/deuriib/agency-rules/issues/60)) ([0fdae7e](https://github.com/deuriib/agency-rules/commit/0fdae7e382cb917332e4fc38c01aadc0ff0591b6))
* **harness:** support Cursor and Claude Code ([#65](https://github.com/deuriib/agency-rules/issues/65)) ([e8e7a75](https://github.com/deuriib/agency-rules/commit/e8e7a75689af133152369355a9ce387e61e381df))
* **rules:** add automation rule ([#55](https://github.com/deuriib/agency-rules/issues/55)) ([17fcaea](https://github.com/deuriib/agency-rules/commit/17fcaea1ac291dde85e8f93c0b207e1a3f746d29))

## [0.13.0](https://github.com/deuriib/agency-rules/compare/v0.12.0...v0.13.0) (2026-11-04)


### Features

* **rules:** add deny-hard-gates rule ([#51](https://github.com/deuriib/agency-rules/issues/51)) ([8b9849d](https://github.com/deuriib/agency-rules/commit/8b9849dfda81e03eb42e40fc1012fd78e4805579))
* **rules:** add DOCS documentation guidelines ([#50](https://github.com/deuriib/agency-rules/issues/50)) ([24369d0](https://github.com/deuriib/agency-rules/commit/24369d0d1cb9c083724a5c305f152a493598c539))
* **rules:** add foundation-conduct rule ([#54](https://github.com/deuriib/agency-rules/issues/54)) ([8ebb085](https://github.com/deuriib/agency-rules/commit/8ebb0857dacc1d96a4e5f0c68445382d2e4ab7d4))
* **security:** add SEC security guidelines ([#53](https://github.com/deuriib/agency-rules/issues/53)) ([45dcb41](https://github.com/deuriib/agency-rules/commit/45dcb41516b2c964cc955cb6fefb94d6dc8fd311))

## [0.12.0](https://github.com/deuriib/agency-rules/compare/v0.11.1...v0.12.0) (2026-11-04)


### Features

* **rules:** add ENG engineering standards ([#47](https://github.com/deuriib/agency-rules/issues/47)) ([53f6a35](https://github.com/deuriib/agency-rules/commit/53f6a35931342707e1c3a98c5227064e06b9e860))
* **rules:** add TST testing guidelines ([4243eb5](https://github.com/deuriib/agency-rules/commit/4243eb525b873726b7f239a577a94d4570365dd7))

## [0.11.1](https://github.com/deuriib/agency-rules/compare/v0.11.0...v0.11.1) (2026-11-04)


### Bug Fixes

* **rules:** drop NAME-## prefixes in favor of bold lead-ins ([997c845](https://github.com/deuriib/agency-rules/commit/997c845eef21ffaaa69d78afe522216825d554bc))

## [0.11.0](https://github.com/deuriib/agency-rules/compare/v0.10.0...v0.11.0) (2026-11-04)


### Features

* **rules:** add minimal-code rule ([5963f6c](https://github.com/deuriib/agency-rules/commit/5963f6cba6d123c30092dd0a6dbafb2cdc8f6718))

## [0.10.0](https://github.com/deuriib/agency-rules/compare/v0.9.0...v0.10.0) (2026-11-03)


### ⚠ BREAKING CHANGES

* **contract:** harness ids are now the agent tool ids (`piAgent`, `ohMyPi` instead of `pi-agent`, `oh-my-pi`) and destination templates use the single-brace `{slug}` placeholder. `--harness pi-agent` must become `--harness piAgent`. The `tools.json` contract version is 2.

### Refactors

* **contract:** one vocabulary with `agency-agents` — `{slug}` and camelCase harness ids

## [0.9.0](https://github.com/deuriib/agency-rules/compare/v0.8.0...v0.9.0) (2026-11-02)


### Features

* **rules:** add mcp-gateway-protocol rules ([bde758c](https://github.com/deuriib/agency-rules/commit/bde758c))
* **rules:** refine the agentmemory lesson guidance ([82befdc](https://github.com/deuriib/agency-rules/commit/82befdc))

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
