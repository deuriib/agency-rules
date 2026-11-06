# Write rules once. Run them everywhere.

`agency-rules` compiles a single set of generic Markdown rules into the native
format expected by seven coding agents: **Google Antigravity**, **pi-agent**,
**oh-my-pi (omp)**, **OpenCode**, **Cursor**, **Claude Code**, and
**GitHub Copilot**.

Write a rule once in a neutral format. Validate it, score it for duplication,
compile it to every harness, and install it where each agent reads it.

[Get started](getting-started.md){ .md-button .md-button--primary }
[Browse the rule library](https://deuriib.github.io/agency-rules/rules/){ .md-button }

## Why one source of truth

Every harness has its own rule format and its own directory. Writing the same
rule seven times produces seven copies that drift apart, and the copy nobody
re-reads is the one an agent silently follows.

`agency-rules` keeps one source in `rules/` and derives every native file from a
declarative contract. The contract — [`tools.json`](https://github.com/deuriib/agency-rules/blob/main/tools.json) — is
the single place where formats, paths, destinations, and frontmatter mappings
live.

## How it works

1. **Write** a rule under `rules/<category>/<slug>.md` in Markdown with YAML
   frontmatter. The [rule specification](RULE-SPEC.md) defines every field.
2. **Compile** with `mise run convert`. Renderers turn the neutral rule into each
   harness's native format under `integrations/`.
3. **Install** with `mise run install`. The compiled files are copied to the
   directories your agents read, and OpenCode's plugin is registered when needed.

## The rule library

The repository ships a working rule set across eight categories — engineering
baseline, stacks, security, privacy, legal, finance, revenue, and marketing.
Every page in the [rule library](https://deuriib.github.io/agency-rules/rules/) renders the rule body exactly
as harnesses receive it, together with the frontmatter that decides when it
loads.

## Quality gates

Two gates run on every change before a rule reaches any agent:

- **`validate`** checks every rule against the JSON Schema, rejects unknown
  fields, duplicate slugs, and a filename that disagrees with `name`.
- **`eval`** scores how much of each rule restates another, and flags two rules
  that state the same obligation with a different number.

`mise run ci` runs both, plus the converter, the formatter, the test suite, and
this documentation build.

## Explore the documentation

| Start here | Go deeper |
| --- | --- |
| [Installation and first run](getting-started.md) | [Architecture](ARCHITECTURE.md) |
| [CLI reference](cli.md) | [Rule specification](RULE-SPEC.md) |
| [Harness reference](https://deuriib.github.io/agency-rules/reference/harnesses/) | [Adding a harness](ADDING-A-HARNESS.md) |
| [Rule library](https://deuriib.github.io/agency-rules/rules/) | [Troubleshooting](TROUBLESHOOTING.md) |

Project pages: [Contributing](https://deuriib.github.io/agency-rules/contributing/) ·
[Security](https://deuriib.github.io/agency-rules/security/) ·
[Changelog](https://deuriib.github.io/agency-rules/changelog/) · [DX evidence](dx/SCORECARD.md).

---

`agency-rules` is MIT licensed. The source lives at
[github.com/deuriib/agency-rules](https://github.com/deuriib/agency-rules).
