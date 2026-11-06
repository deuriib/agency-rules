# CLI reference

The command is `agency-rules`, published on npm. Every command reads the rule
tree (`rules/`), the conversion contract (`tools.json`), and the compiled output
(`integrations/`) from the current directory, with environment overrides listed
[below](#environment).

Run the same commands through mise in this repository:

```bash
mise run validate
mise run convert
mise run install --all --scope project
mise run list --harness cursor
```

Every command accepts `--help`, and the top-level command accepts `--version`.

## new

Scaffold a rule in the neutral format.

```bash
mise run create-rule -- api-review --description "Use when reviewing REST endpoints."
```

| Argument | Type | Description |
| --- | --- | --- |
| `<slug>` | positional, required | Kebab-case rule name; must match `^[a-z][a-z0-9-]*$`. |
| `--category <name>` | string, default `base` | Directory under `rules/` to write into. |
| `--description <text>` | string | When the rule applies. Required when stdin is not a TTY; prompted for otherwise. |
| `--dry-run` | boolean | Print the skeleton without writing it. |

The command refuses a duplicate slug, an invalid category, and a missing
description. It also refuses to run against the packaged rules, because a
skeleton written into `node_modules` is a rule nobody will find again.

## validate

Validate every rule's frontmatter against `rules/_schema.json`.

| Flag | Type | Description |
| --- | --- | --- |
| — | — | No flags. |

It rejects unknown keys, duplicate YAML keys, duplicate slugs, invalid field
types, and a filename that disagrees with `name`. Every failure is reported with
the file and the reason; a single bad file does not abort the run.

Exit code is `1` when any rule fails, or when `rules/_schema.json` is missing.

## eval

Score how much of each rule is restated in another, and find numeric
contradictions — the same obligation stated with two different numbers.

```bash
mise run eval -- --json
mise run eval -- --rule devops
```

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--threshold <n>` | string (number) | `10` | Fail when a rule has this percentage of its units restated elsewhere. |
| `--min-units <n>` | string (number) | `2` | Ignore a rule until this many of its units are restated. |
| `--unit-threshold <n>` | string (number) | `0.35` | How much of a unit must match before it counts as restated. |
| `--min-tokens <n>` | string (number) | `5` | Ignore units shorter than this. |
| `--rule <slug>` | string | — | Score one rule against the rest. |
| `--top <n>` | string (number) | `10` | How many evidence rows to print. |
| `--json` | boolean | `false` | Emit machine-readable output. |

Every output mode gates on the same result: `--json` and `--rule` cannot report
a defect and still exit `0`.

## convert

Compile `rules/` into `integrations/<harness>/`.

```bash
mise run convert
```

| Flag | Type | Description |
| --- | --- | --- |
| `--harness <ids>` | string | Limit to comma-separated harness ids. |
| `--rules <slugs>` | string | Limit to comma-separated rule slugs. |
| `--dry-run` | boolean | Print the files that would be written; write nothing. |

Each harness directory is deleted before it is rewritten, so a renamed or
deleted rule cannot survive as a stale file. A filtered build produces a
manifest marked `partial: true` with the filter recorded, which tells `install`
that the directory is a slice of a build rather than a full one.

Exit code is `1` for an unknown harness or when no rule matches the filter.

## install

Copy compiled rules into the directories each harness reads.

```bash
mise run install --all --scope project
```

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--harness <ids>` | string | detect | Comma-separated harness ids from `tools.json`. |
| `--scope <scope>` | `project` \| `user` | `project` | Which destination column in `tools.json` to use. |
| `--rules <slugs>` | string | all | Install only the named rules. |
| `--all` | boolean | `false` | Ignore detection and target every declared harness. |
| `--dry-run` | boolean | `false` | Print the copy plan; write nothing. |

With no `--harness`, no `--all`, and a terminal attached, the command asks three
questions instead of guessing: harnesses, scope, and rules. Supplying the flags
skips the prompts, so scripted runs never block.

Every target is preflighted before the first write: a `--rules` list that
matches nothing, or an explicitly requested harness with no compiled output,
exits `1` and leaves the harness configuration untouched. `install` with nothing
auto-detected is a legitimate no-op and exits `0` — read the output rather than
trusting the status code alone.

## list

List rules and, optionally, their install status.

```bash
mise run list --harness cursor
```

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--harness <ids>` | string | detected | Check status against these harnesses. Unknown ids fail. |
| `--scope <scope>` | `project` \| `user` | `project` | Compare against project or user installs. |
| `--json` | boolean | `false` | Emit name, description, source path, and status as JSON. |
| `--no-status` | boolean | status on | Skip status checks and list rules only. |

Without `--harness`, status is shown for every harness detected on the machine.
The four statuses are documented in
[Installation and first run](getting-started.md#what-the-four-statuses-mean).

## Environment

| Variable | Used by | Effect |
| --- | --- | --- |
| `RULES_DIR` | `new`, `validate`, `eval`, `convert`, `list` | Read rules from this directory instead of `./rules` or the packaged copy. |
| `INTEGRATIONS_DIR` | `convert`, `install`, `list` | Compile to, and read compiled output from, this directory. Default `integrations`. |
| `TOOLS_PATH` | `convert`, `install`, `list` | Read the harness contract from this file instead of `./tools.json`. |

`TOOLS_PATH` exists because `RULES_DIR` and `INTEGRATIONS_DIR` can point at
another checkout: without a matching override, the compiled output of one
repository would be installed with the packaged contract of another.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success, or a legitimate no-op such as `install` with nothing detected. |
| `1` | A gate failed, a request cannot be fulfilled, or an argument is invalid. |

A failing `install` is decided before the first write, so exit `1` never means a
half-installed harness.
