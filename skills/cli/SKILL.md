---
name: agency-rules-cli
description: Use when asked to apply, update, install, validate, or check the status of agency-rules rules for an AI coding harness, when a rule change needs compiling and shipping to Antigravity, pi-agent, oh-my-pi, OpenCode, Cursor, or Claude Code, when rules must be checked for duplicated or contradictory guidance, or when a convert or install run reports a partial build or installed nothing.
---

# Agency Rules CLI

`agency-rules` compiles one set of neutral Markdown rules into each harness's
native format.

```bash
npx agency-rules <cmd>          # any directory
mise run <task>                 # inside this repository, not 1:1 with the commands
```

`--help` lists the commands and `--version` prints the version read from
`package.json`. Every command has `<cmd> --help`.

Every command resolves its inputs through one helper (`scripts/lib/paths.mjs`):
`RULES_DIR` when set, else `./rules`, else the `rules/` shipped in the package.
The harness contract follows the same chain — `TOOLS_PATH` when set, else
`./tools.json`, else the packaged copy. `validate` is included, so
`npx agency-rules list` and `npx agency-rules validate` both work from anywhere.
Two exceptions are deliberate: `new` will not scaffold into the installed
package (it exits 1 instead), and `integrations/` never falls back — `convert`,
`install` and `list` read `INTEGRATIONS_DIR` (default `./integrations`)
relative to where you stand, so run those from the repository that holds the
compiled output, or point `INTEGRATIONS_DIR` at it. `TOOLS_PATH` exists for
exactly that case: when `RULES_DIR` and `INTEGRATIONS_DIR` point at another
checkout, its destinations must come from that checkout too, not from whichever
package happens to be installed.

## Pick the command from what was asked

| The user said | Run |
| --- | --- |
| "Apply the rules" / "update my config" | `validate` → `convert` → `install` |
| "Is everything installed?" / "are my rules current?" | `list --harness <id>` |
| "Add a new rule" | `new <slug> --description "…"`, then fill it in |
| "Why did CI fail?" | `validate`, then `eval` |
| "Are any rules duplicated?" | `eval` |
| "Do two rules disagree?" / "one says 60 days, another 90" | `eval` (contradiction section) |
| "Just show me what's available" | `list` |
| "Make OpenCode pick the rules up" | `install` (registers the plugin) |
| "Preview before writing anything" | add `--dry-run` to `convert` or `install` |
| "The install did nothing" / it exited 1 | full `convert`, then `install` again |

## The pipeline

`validate` → `eval` → `convert` → `install`. Each step exists because the next
one trusts it:

- **validate** proves every rule's frontmatter satisfies `rules/_schema.json`,
  matches its filename, and that no two rules share a name.
- **eval** runs two independent gates. No rule may **restate** another — a
  restated rule is a second source of truth that will drift — and no two rules
  may assert **contradictory numbers** for the same subject. Overlap is blind to
  the second defect: "reviewed 90 days before expiry" and "reviewed 60 days
  before expiry" share almost no wording, so only a numeric check finds them.
- **convert** compiles `rules/` into `integrations/<harness>/`, deleting each
  targeted harness directory first so nothing stale survives.
- **install** syncs those artifacts into the real harness directories and
  registers the harness plugin. It plans every target before it writes
  anything, and fails loudly when it would install nothing.

`mise run ci` runs validate → eval → check → convert → test.

## Commands

### `list`

```bash
agency-rules list                          # detected harnesses, project scope
agency-rules list --harness cursor         # names the status column's target
agency-rules list --harness cursor,piAgent # comma-separated list
agency-rules list --scope user
agency-rules list --json                   # includes status + per-harness detail
agency-rules list --no-status              # skip the filesystem check entirely
```

Status legend — the distinction matters, because each state has a different fix:

| Status | Meaning | Fix |
| --- | --- | --- |
| ✅ `synced` | Installed and byte-identical to the compiled output | none |
| 🔄 `modified` | Installed, but differs — edited locally, or not re-installed since a change | re-run `install`, or keep the edit deliberately |
| ⬜ `missing` | Compiled, never installed | `install` |
| ❓ `unbuilt` | In `rules/`, never compiled | `convert` |

With several harnesses the column folds to one value: `unbuilt` wins over
everything (a rule that was never compiled cannot be installed anywhere),
`synced` only when **all** targets match, `missing` only when **every** target is
missing, and any other mixture — installed in one harness, edited in another —
collapses to `modified`.

`--no-status` skips detection and the filesystem check, so it answers "what
rules exist" without touching any harness. Without `--harness`, status needs a
detected harness; otherwise the header says so and the column stays empty.
Unknown ids and a `--scope` other than `project`/`user` exit 1. `--json` emits
one entry per rule: `name`, `description`, `source`, plus `status` and a
`harnesses` map when a target was resolved.

### `new`

```bash
agency-rules new api-review \
  --description "Use when reviewing REST endpoints, to catch missing validation."
agency-rules new api-review --description "…" --category security
agency-rules new api-review --description "…" --dry-run
```

Writes `rules/<category>/<slug>.md` with a skeleton. `--category` defaults to
`base`; slug and category must match `^[a-z][a-z0-9-]*$`
(`scripts/lib/rule-template.mjs`). Run it where the rules actually live: unlike
the read-only commands, `new` does not fall back to the packaged `rules/`. With
neither a local `rules/` nor `RULES_DIR` it exits 1 instead of writing a skeleton
into `node_modules`, where nobody would find it again. The message is
`❌ No local rules/ directory in <cwd>`. A `RULES_DIR` that does not exist is
refused the same way — `❌ RULES_DIR does not exist: <path>` — rather than
`mkdir -p`-ing a fresh tree somewhere nobody is looking. Both checks come after
the slug and category are validated, so a typo in the name reports the slug
error even outside a repository.

The description answers **when** the rule applies, never what it contains.
On a TTY an omitted `--description` is prompted for; only a non-interactive
shell turns it into an immediate exit 1, because it is the only field a harness
can match on and cannot be a placeholder. Exits 1 on an invalid slug or category,
when there is no local `rules/` and no `RULES_DIR`, when `RULES_DIR` does not
exist, on a name that already exists, on a non-interactive run without a
description, or on an existing file at the target path (`Refusing to
overwrite`).

### `validate`

```bash
agency-rules validate
```

Exits 1 when any rule fails, on any of:

- the JSON schema — required field missing, wrong type/enum/pattern, or an
  **unknown frontmatter key** (`additionalProperties: false`; the error names the
  key and suggests the near match, so `triger` is a failure rather than a silent
  miss);
- frontmatter `name` ≠ filename;
- duplicate `name` across two files, naming the first file that claimed it;
- invalid YAML frontmatter. Reported per file as the run continues, so one broken
  rule does not hide the other fifty.

Run it before `convert`; `convert` will happily compile a rule that fails the
schema. `validate` reads `rules/_schema.json` from the directory it resolved —
the packaged rules come with their schema, and `RULES_DIR` must point at a
directory holding both. A missing or unparseable schema is a one-line
`❌ Cannot read the rule schema at …` plus exit 1, not an ENOENT stack, because
this is the command CI gates on.

### `eval`

```bash
agency-rules eval                        # both gates
agency-rules eval --json                 # per-rule shares + every matched unit
agency-rules eval --rule devops          # dossier for one rule
agency-rules eval --threshold 5 --min-units 1
agency-rules eval --unit-threshold 0.25 --min-tokens 4 --top 20
```

**Overlap.** Splits each body into units (a bullet or a sentence), compares them
on word-pair overlap, and reports **the share of a rule that already exists
elsewhere** — scored against that rule's single closest neighbour, not the union
of all of them. Fails when ≥10% of a rule's units are restated *and* at least 2
units are.

**Contradictions.** Scans units for numeric claims (`90 days`, `30%`, `3
retries`) and compares the phrase around each number. Two claims from different
rules that share a subject strongly and disagree on the value are reported as
`same subject, different number`. The clean line carries its own denominator —
`No numeric contradictions — 13 numeric claim(s) compared (0 subject match(es))`
— because "no contradictions" over four claims means very little; with `--rule`
the same line is scoped: `No numeric contradictions involving <slug>`. The
check is deliberately narrow and has no flags: two claims must share ≥50% of
the smaller subject's word pairs, every subject needs at least 4 word pairs,
and a claim needs ≥3 content words. A contradiction written in unrelated
vocabulary is invisible; do not promise more than it can see.

| Flag | Default | Effect |
| --- | --- | --- |
| `--threshold` | `10` | fail when this share (%) of a rule's units is restated in its closest neighbour |
| `--min-units` | `2` | ignore a rule until this many units are restated |
| `--unit-threshold` | `0.35` | share of a unit's word pairs that must match to count |
| `--min-tokens` | `5` | ignore units shorter than this |
| `--top` | `10` | rows of evidence printed |
| `--rule <slug>` | — | dossier for one rule; both gates scoped to that rule |
| `--json` | — | `rules`, thresholds, `scopedTo`, `violations`, `numericClaims`, `contradictions`, `perRule`, `duplicates` |

When overlap flags something, the usual fix is to **reference** the owning rule,
not to merge the two rules. Two rules may legitimately share a topic; only shared
sentences are a defect. When a contradiction is flagged, one of the two numbers
is wrong or the two rules are a sequence that was not written clearly enough to
say so — ask which, and fix the source rule.

### `convert`

```bash
agency-rules convert
agency-rules convert --dry-run
agency-rules convert --harness cursor,opencode
agency-rules convert --rules typescript,go
```

Defaults to every harness in `tools.json` and every rule. Writes
`integrations/<harness>/` plus a `_manifest.json` that `install` trusts;
`--dry-run` writes nothing at all, the manifest included — it reports
`would reset <dir>/` and `would write <path> (N bytes)` instead.

Each targeted `integrations/<harness>/` is deleted before it is rewritten, so a
renamed or filtered-out rule leaves no orphan artifact behind.

`--harness` and `--rules` take comma-separated values. An unknown harness id
exits 1. A requested slug that does not exist only warns —
`⚠️  The following rules were not found: …` — and the run continues; it exits 1
only when *none* of the requested slugs matched. A harness `format` with no
renderer exits 1 **before the first reset**, so a build that cannot finish
leaves the previous output intact rather than half-rewritten; so does a rule
that fails to render, per harness.

A filtered `convert` is a **partial build**, and it announces one in every mode.
A real run says
`⚠️  Partial build: _manifest.json will list only these N rule(s)…`; a `--dry-run`
says
`⚠️  A real run with --rules would write a partial manifest: N rule(s) only…`,
because a dry run writes no manifest to be partial. It writes only the converted
subset, and records the slice in that harness's `_manifest.json`: `partial: true`
and `filter` set to the requested slugs. A full build writes `partial: false` and
`filter: null`. So the harness directory contains exactly those rules and a later
`install` installs exactly those rules, warning that the manifest it is reading
is partial. Re-run `convert` without `--rules` to restore the full manifest.

### `install`

```bash
agency-rules install                                   # interactive: 3 prompts
agency-rules install --harness cursor --scope project
agency-rules install --scope user --all
agency-rules install --rules typescript,go --dry-run
agency-rules install --harness cursor --scope project --rules typescript
```

Interactive mode asks for harnesses, scope, then rules — in that order, because
the rule list is read from the manifests of the harnesses you picked. Prompts
only appear when stdin is a TTY: `--harness` (or `--all`) and `--scope` remove
their own prompt, and `--rules` removes the last one, so a scripted run never
blocks. The rules menu takes `1,3`, `all`, or empty (= all); anything else is
`❌ Invalid selection "<token>" — expected 1-N or "all".` and exit 1. The
harness and scope prompts are looser: a harness answer with no number falls back
to auto-detection, and a scope answer that is neither `2` nor `user` means
`project`.

The rules menu is built from the union of the selected harnesses'
`_manifest.json` files, **not** from `rules/`. Consequence: it only lists rules
that were actually compiled for those harnesses — an empty menu means "run
`convert` first", not "there are no rules". A target the preflight already
skipped contributes no slugs, so the menu never offers a rule whose harness
cannot receive it.

`install` **syncs**: it classifies each file `🆕 added`, `🔄 updated`, or
`⏭️  unchanged (skipped)` and writes only the first two. An unchanged file keeps
its mtime, which matters because a harness watching its rules directory treats a
timestamp bump as a reload. The summary reports added/updated/unchanged counts
and how many harnesses it actually reached.

**Everything is planned before anything is written.** `install` resolves each
target's manifest and destination first, decides the outcome of the run, and only
then copies. Three consequences, all deliberate: the partial-build warning
arrives *before* the partial build is copied; a run that is going to fail does
not touch the destination directories at all; and an uninstallable target is
reported with its reason instead of being discovered halfway through the copy
loop.

**OpenCode plugin.** A harness with a `plugin` entry in `tools.json`
(`opencode` → `opencode-rules@latest`) also gets that entry appended to the
`plugin` array of the config file declared in `tools.json` at
`plugin.config[scope]` — currently `opencode.json` at the project root for
`project` and `~/.config/opencode/opencode.json` for `user`. The path is contract
data resolved relative to where you stand, not a hardcoded OpenCode assumption:
a harness whose plugin has no config path for the requested scope is warned
about (`no plugin config path for scope …`) and skipped, never guessed at. The
file is created when absent, the rest of the JSON is preserved, and an entry
already present is logged and left alone. A file that is not valid JSON is
warned about and skipped — a corrupted config is never clobbered. When something
changed, the summary gains `Updated N plugin config(s)`, or the dry-run wording
`Would update N plugin config(s)`; an already-registered plugin contributes no
count.

**A partial manifest is flagged.** When a harness's `_manifest.json` has
`partial: true`, the preflight warns — before anything is copied — that its
compiled output is partial, quotes the flag, and names the fix: run a full
`convert` first, or the rules left out of that build stay stale at their
installed content. A warning that arrived after the partial build had been
copied was a warning too late to act on.

**Installing nothing is a failure.** Exit 1 when none of the `--rules` slugs
exist in the compiled output — `❌ none of the requested rules exist in the
compiled output: <slugs>` — and when nothing was installable at all:
`❌ none of the requested harnesses could be installed: cursor (no compiled
output)`, or `… cursor (no dest for scope "user" in tools.json)`, or `… cursor
(manifest lists no files)`, with one reason per target. The wording follows how the fleet was chosen — `requested` for
`--harness`, `--all`, or a harness set picked in the interactive menu, and
`detected` only when auto-detection chose — because a fleet with an unbuilt
`integrations/` used to print `🎉 Installed 0 file(s)` and exit 0, which is the
same green-but-empty run. Both forms come with
`Run "agency-rules convert" (or "mise run convert" in this repository) without
--rules to compile first.` on the next line. Because the decision is made in the
preflight, such a run leaves the destination directories untouched. The `❌` line
is printed *instead of* the `🎉 Installed …` summary, so a red error never sits
under a success line. `--dry-run` does not soften this: a dry run of an
impossible request still exits 1.

**A manifest that cannot be read is not a stack trace.** A `_manifest.json` that
is missing (what a `convert` killed halfway leaves behind) or corrupt (a hand
edit) exits 1 with `❌ <id>: cannot read <path>/_manifest.json (invalid JSON: …)`
and the fix — run `convert` — instead of a `SyntaxError` trace aimed at the
reader of `planInstall`.

**A manifest that lists no files is a broken build.** `⚠️  <id>: <path> lists no
files, skipping` — because the gate counts installable targets, not files, so an
empty manifest would otherwise end in `🎉 Installed 0 file(s)` and exit 0. A
manifest whose `files` key is missing or is not an array gets the same treatment
instead of crashing the copy loop. `convert` cannot emit that shape (it fails on
zero rules and writes one file per rule), so it only arrives from a hand-edited
or third-party manifest.

Still a zero exit: a `--rules` slug missing from one of several manifests is
warned about while the rest install; a selected harness with no output is warned
about and skipped (`⚠️  <id>: no compiled output at <resolved INTEGRATIONS_DIR>/<id>,
skipping. Run "agency-rules convert" first.`); and **nothing detected** stops
after warning:

    ⚠️  No harness detected. Pass --harness <id> or --all to force.

Whatever the preflight dropped is then counted in a trailing line, after the
summary and in dry-run and real runs alike:

    ⚠️  N harness(es) skipped — see the warnings above.

It counts targets dropped for missing compiled output, a manifest that lists no
files, or a missing `dest` for the requested scope — not a harness that was
reached but had no matching rules.
Partial success is still exit 0: only "nothing installable" fails. A zero exit
from `install` therefore does not mean "installed" — read the output.

## Exit codes

The skill asks agents to branch on status, so know which failures are silent.

| Command | Exits 1 when |
| --- | --- |
| `list` | no rules found · unknown `--harness` id · `--scope` not `project`/`user` |
| `new` | invalid slug or category · no local `rules/` and no `RULES_DIR` · `RULES_DIR` does not exist · name already exists · no `--description` in a non-interactive shell · target file exists |
| `validate` | no rules found · `_schema.json` missing or unparseable · any rule fails the schema, the filename check, or name uniqueness, or has invalid YAML |
| `eval` | overlap gate breached · numeric contradiction · unknown `--rule` · no rules found |
| `convert` | unknown `--harness` · no rules found · no requested rule matched · no renderer for a harness `format` · render error |
| `install` | unknown `--harness` · invalid `--scope` · invalid menu answer · none of the `--rules` slugs exist in the compiled output · nothing installable at all (requested or detected) · an unreadable `_manifest.json` |

`list`, `convert` and `install` also exit 1 when the harness contract cannot be
read:

    ❌ Cannot read the harness contract at <path> (<reason>).

`<reason>` is `file not found` or `invalid JSON: …`, and a follow-up line points
at `TOOLS_PATH`. `list` reads the contract even with `--no-status`, so listing
what rules exist still needs a readable `tools.json`.

Everything else exits 0 — including runs that changed nothing (`--dry-run`, or a
fully synced fleet) and runs that did nothing because they could not: `install`
with nothing auto-detected, `install` when a requested slug is missing from one
of several manifests, and `convert --rules` where only some of the slugs matched.

`eval`'s modes no longer disagree: text, `--json` and `--rule` all compute
`gateFailed = violations || contradictions`, so a contradiction fails the run
whichever flag you passed, and `--json` also carries it in `contradictions`.
`--rule <slug>` is scoped, not exempt — it prints the dossier, still runs the
contradiction section, and gates on that rule's own overlap violations and
contradictions, so a defect in another rule does not fail a scoped run. A scoped
`--json` reports `scopedTo` (`null` when unscoped) and scopes the gate only:
`violations` and `contradictions` count that rule, while `rules`, `numericClaims`,
`perRule` and `duplicates` stay whole-corpus. A consumer that reads `perRule`
while `--rule` is set gets every rule, not the scoped one.

## Harness ids

Pass these to `--harness`, and expect them in `tools.json`:

| id | Label | `project` dest | `user` dest |
| --- | --- | --- | --- |
| `antigravity` | Google Antigravity | `.agents/rules/{slug}.md` | `~/.gemini/config/rules/{slug}.md` |
| `piAgent` | Pi Coding Agent | `.pi/rules/{slug}/RULES.md` | `~/.pi/agent/rules/{slug}/RULES.md` |
| `ohMyPi` | oh-my-pi (omp) | `.omp/rules/{slug}.md` | `~/.omp/agent/rules/{slug}.md` |
| `opencode` | OpenCode (via opencode-rules) | `.opencode/rules/{slug}.md` | `~/.config/opencode/rules/{slug}.md` |
| `cursor` | Cursor | `.cursor/rules/{slug}.mdc` | `~/.cursor/rules/{slug}.mdc` |
| `claudeCode` | Claude Code | `.claude/rules/{slug}.md` | `~/.claude/rules/{slug}.md` |

Compiled output lands at `integrations/<id>/` using each harness's
`integrationPath`: `<slug>.md` for four of them, `<slug>/RULES.md` for piAgent,
`<slug>.mdc` for Cursor. oh-my-pi reads either extension and gets `.md`.

Detection, used when `--harness` is omitted, looks for each harness's own
directory — `.agents`, `.pi`, `.omp`, `.opencode`, `.cursor`, `.claude` in the
current directory or the matching home path — plus `GEMINI.md` / `AGENTS.md` for
antigravity and `CLAUDE.md` for Claude Code. A harness with none of those is not
detected, even if its rules are installed.

Ids are camelCase and match the agent tool vocabulary (`piAgent`, not
`pi-agent`). A mistyped id exits 1 rather than converting into nothing.

## Rules that hold regardless

- **Never edit `integrations/`.** It is generated and gitignored; `convert`
  deletes and rewrites each targeted `integrations/<harness>/`, so a local edit
  there is lost and a renamed rule leaves nothing behind. Edit `rules/` and
  recompile. `install` follows `_manifest.json`, not a directory walk, so a
  filtered build installs only the rules it lists.
- **Never edit a harness's installed rule directly.** `install` will overwrite it
  on the next run, and `list` will report it `modified` until then. Edit the
  source rule instead.
- **Validate before converting**, and convert before installing. `install` reads
  `integrations/`, not `rules/`.
- **`--dry-run` before a destructive-looking run** when the user's real config is
  in the destination paths.
- **A failed `eval` is duplication or disagreement, not a broken build.** Report
  which rule restates which, or which two rules disagree on a number, and propose
  the reference or the correction — rather than deleting a clause to make the
  number go away.

## `mise run` in this repository

Inside the repo, tasks wrap the same commands and mise exports `RULES_DIR` and
`INTEGRATIONS_DIR` as absolute paths, so each task works from any directory. The
task names are **not** 1:1 with the commands:

| Command | Task |
| --- | --- |
| `new` | `mise run create-rule -- <slug>` — there is no `mise run new` |
| `validate` | `mise run validate` |
| `eval` | `mise run eval` |
| `convert` | `mise run convert` |
| `convert --dry-run` | `mise run convert:dry-run` |
| `install` | `mise run install` — **depends on `convert`**, so it recompiles first |
| `install --dry-run` | `mise run install:dry-run` — does not convert |
| `list` | `mise run list` |

The remaining tasks are `setup`, `fmt`, `lint`, `check`, `test`, `ci`, and
`release`. On a full apply, `mise run install` is enough: it converts for you.

## Environment

| Variable | Purpose |
| --- | --- |
| `RULES_DIR` | Read rules from somewhere other than `./rules` — and the directory `new` scaffolds into; it must exist, `new` will not create it |
| `INTEGRATIONS_DIR` | Read compiled output from somewhere other than `./integrations` |
| `TOOLS_PATH` | Read the harness contract from somewhere other than `./tools.json` — set it alongside the two above, so destinations come from the same checkout as the artifacts |

A `tools.json` that is missing or is not valid JSON stops `list`, `convert` and
`install` with the one-line `❌ Cannot read the harness contract at <path>
(<reason>).` and exit 1, not an ENOENT stack — a bad `TOOLS_PATH` is user input.

Together they make an end-to-end check possible in a throwaway directory without
touching a real harness config:

```bash
mkdir -p /tmp/check && cd /tmp/check
INTEGRATIONS_DIR=$OLDPWD/integrations TOOLS_PATH=$OLDPWD/tools.json \
  npx agency-rules install --harness cursor --scope project --dry-run
```
