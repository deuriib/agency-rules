---
name: agency-rules-cli
description: Use when asked to apply, update, install, validate, or check the status of agency-rules rules for an AI coding harness, or when a rule change needs compiling and shipping to Antigravity, pi-agent, oh-my-pi, OpenCode, Cursor, or Claude Code.
---

# Agency Rules CLI

`agency-rules` compiles one set of neutral Markdown rules into each harness's
native format. Every command below is available as `npx agency-rules <cmd>` or,
inside this repository, `mise run <task>`.

## Pick the command from what was asked

| The user said | Run |
| --- | --- |
| "Apply the rules" / "update my config" | `validate` → `convert` → `install` |
| "Is everything installed?" / "are my rules current?" | `list --harness <id>` |
| "Add a new rule" | `new <slug> --description "…"`, then fill it in |
| "Why did CI fail?" | `validate`, then `eval` |
| "Are any rules duplicated?" | `eval` |
| "Just show me what's available" | `list` |
| "Preview before writing anything" | add `--dry-run` to `convert` or `install` |

## The pipeline

`validate` → `eval` → `convert` → `install`. Each step exists because the next
one trusts it:

- **validate** proves every rule's frontmatter satisfies `rules/_schema.json`
  and that no two rules share a name.
- **eval** proves no rule restates another. A restated rule is a second source
  of truth that will drift.
- **convert** compiles `rules/` into `integrations/<harness>/`.
- **install** syncs those artifacts into the real harness directories.

`mise run ci` runs validate → eval → check → convert → test.

## Commands

### `list`

```bash
agency-rules list                          # detected harnesses, project scope
agency-rules list --harness cursor         # names the status column's target
agency-rules list --scope user
agency-rules list --json                   # includes status + per-harness detail
agency-rules list --no-status              # skip the filesystem check
```

Status legend — the distinction matters, because each state has a different fix:

| Status | Meaning | Fix |
| --- | --- | --- |
| ✅ `synced` | Installed and byte-identical to the compiled output | none |
| 🔄 `modified` | Installed, but differs — edited locally, or not re-installed since a change | re-run `install`, or keep the edit deliberately |
| ⬜ `missing` | Compiled, never installed | `install` |
| ❓ `unbuilt` | In `rules/`, never compiled | `convert` |

With several harnesses, `synced` requires **all** of them to match.

### `new`

```bash
agency-rules new api-review \
  --description "Use when reviewing REST endpoints, to catch missing validation."
agency-rules new api-review --description "…" --category security
agency-rules new api-review --description "…" --dry-run
```

Writes `rules/<category>/<slug>.md` with a skeleton. Exits 1 on an invalid slug,
a slug that already exists, or a missing description — **the description is the
only field a harness can match on**, so it is required rather than defaulted.

### `validate`

```bash
agency-rules validate
```

Exits 1 on a schema violation or a duplicate rule name. Run it before `convert`;
`convert` will happily compile a rule that fails the schema.

### `eval`

```bash
agency-rules eval                        # the gate
agency-rules eval --json                 # per-rule shares + every matched unit
agency-rules eval --rule devops          # evidence for one rule
agency-rules eval --threshold 5 --min-units 1
```

Splits each body into units (a bullet or a sentence), compares them on word-pair
overlap, and reports **the share of a rule that already exists elsewhere**. Fails
when ≥10% of a rule's units are restated *and* at least 2 units are.

When it flags something, the usual fix is to **reference** the owning rule, not
to merge the two rules. Two rules may legitimately share a topic; only shared
sentences are a defect.

### `convert`

```bash
agency-rules convert
agency-rules convert --dry-run
agency-rules convert --harness cursor,opencode
agency-rules convert --rules typescript,go
```

Writes `integrations/<harness>/` plus a `_manifest.json` that `install` trusts.

### `install`

```bash
agency-rules install                                   # interactive: 3 prompts
agency-rules install --harness cursor --scope project
agency-rules install --scope user --all
agency-rules install --rules typescript,go --dry-run
agency-rules install --harness cursor --scope project --rules typescript
```

Interactive mode asks for harnesses, scope, then rules — in that order, because
the rule list is read from the manifests of the harnesses you picked. Every
prompt is skipped when its flag is supplied, so scripted runs never block.

`install` **syncs**: it classifies each file `🆕 added`, `🔄 updated`, or
`⏭️ unchanged (skipped)` and writes only the first two. An unchanged file keeps
its mtime, which matters because a harness watching its rules directory treats a
timestamp bump as a reload.

## Harness ids

Pass these to `--harness`, and expect them in `tools.json`:

```
antigravity   Google Antigravity    .agents/rules/*.md
piAgent       pi-agent              .pi/rules/<slug>/RULES.md
ohMyPi        oh-my-pi (omp)        .omp/rules/*.md
opencode      OpenCode              .opencode/rules/*.md
cursor        Cursor                .cursor/rules/*.mdc
claudeCode    Claude Code           .claude/rules/*.md
```

Ids are camelCase and match the agent tool vocabulary (`piAgent`, not
`pi-agent`). A mistyped id exits 1 rather than converting into nothing.

## Rules that hold regardless

- **Never edit `integrations/`.** It is generated and gitignored; `convert`
  overwrites it. Edit `rules/` and recompile.
- **Never edit a harness's installed rule directly.** `install` will overwrite it
  on the next run, and `list` will report it `modified` until then. Edit the
  source rule instead.
- **Validate before converting**, and convert before installing. `install` reads
  `integrations/`, not `rules/`.
- **`--dry-run` before a destructive-looking run** when the user's real config is
  in the destination paths.
- **A failed `eval` is duplication, not a broken build.** Report which rule
  restates which, and propose the reference, rather than deleting a clause to
  make the number go away.

## Environment

| Variable | Purpose |
| --- | --- |
| `RULES_DIR` | Read rules from somewhere other than `./rules` |
| `INTEGRATIONS_DIR` | Read compiled output from somewhere other than `./integrations` |

Both make an end-to-end check possible in a throwaway directory without touching
a real harness config:

```bash
mkdir -p /tmp/check && cd /tmp/check
INTEGRATIONS_DIR=$OLDPWD/integrations npx agency-rules install \
  --harness cursor --scope project --dry-run
```
