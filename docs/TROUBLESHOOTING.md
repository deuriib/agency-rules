# Troubleshooting

Every stall on the [Quick Start](../README.md#quick-start) path, in the order you
hit it, with the exact output and the one command that clears it.

| Symptom you can search for | Section |
| --- | --- |
| `No harness detected` | [1. `install` installed nothing](#1-install-installed-nothing) |
| A menu appears and waits | [2. `install` blocks on a menu](#2-install-blocks-on-a-menu) |
| `no compiled output` | [3. Install before convert](#3-install-before-convert) |
| `No local rules/ directory` | [4. `new` outside a clone](#4-new-outside-a-clone) |
| `sources up-to-date, skipping` | [5. mise skipped your edit](#5-mise-skipped-your-edit) |
| `Could not find '…tests/**/*.test.mjs'` | [6. The test glob does not expand](#6-the-test-glob-does-not-expand) |
| `restate another rule` / `numeric contradiction` | [7. The rule gates failed](#7-the-rule-gates-failed) |

---

## 1. `install` installed nothing

```console
$ mise run install --scope project
⚠️  No harness detected. Pass --harness <id> or --all to force.
$ echo $?
0
```

**Cause.** `install` without `--all` or `--harness` copies into the harness
directories already on your machine. A fresh clone has none, so detection finds
nothing — and that branch exits 0 on purpose, because a repository that has not
adopted any harness is a legitimate no-op.

**Fix.** Name the fleet instead of inferring it:

```bash
mise run install --all --scope project
mise run list --harness copilot    # every row should read ✅ synced
```

---

## 2. `install` blocks on a menu

```console
🎯 Select harnesses to install into:
  1) antigravity (Google Antigravity)
  ...
  8) Detect automatically
  9) All harnesses

Choice [1-9] (comma-separated for multiple, default: detect):
```

**Cause.** With no `--harness`, no `--all`, or no `--scope`, and a terminal
attached, `install` asks rather than guesses. That is the intended behaviour for
a human exploring; it is a hang for a script.

**Fix.** Pass the flags, or run it non-interactively:

```bash
mise run install --all --scope project
mise run install --all --scope project </dev/null   # no TTY, no prompts
```

---

## 3. Install before convert

```console
$ mise run install --harness cursor --scope project
⚠️  cursor: no compiled output at integrations/cursor, skipping. Run "agency-rules convert" first.
❌ none of the requested harnesses could be installed: cursor (no compiled output)
```

**Cause.** `install` copies what `convert` compiled. Nothing has been compiled
yet for that harness, or the last build was filtered with `--rules`.

**Fix.**

```bash
mise run convert
mise run install --harness cursor --scope project
```

---

## 4. `new` outside a clone

```console
$ npx agency-rules new api-review --description "Use when reviewing REST endpoints."
❌ No local rules/ directory in /home/you/some-project
```

**Cause.** `new` scaffolds into a local `rules/` tree on purpose; it will not
write into an installed package where nobody would find it again. It also
requires `--description` whenever stdin is not a terminal.

**Fix.** Run it inside a clone, or point it at one:

```bash
mise run create-rule -- api-review --description "Use when reviewing REST endpoints."
RULES_DIR=/path/to/rules npx agency-rules new api-review --description "…"
```

---

## 5. mise skipped your edit

```console
$ mise run eval
[eval] sources up-to-date, skipping
```

**Cause.** Each mise task declares the files it depends on. A file the task reads
but does not declare is invisible to the cache, so an edit to it produces a stale
result and a green task. `sources` lists were extended for this reason; if you
add an import to a task's code, add it there too.

**Fix.** Force the run, then fix the declaration in `mise.toml`:

```bash
mise run --force eval
```

---

## 6. The test glob does not expand

```console
$ node --test 'tests/**/*.test.mjs'
Could not find '/…/tests/**/*.test.mjs'
```

**Cause.** `node --test` only expands glob patterns from Node 21 up.
`package.json` declares `>=20.12` for the published CLI, which is not the same
requirement as running the suite.

**Fix.** Use the pinned toolchain, which is Node 22:

```bash
mise run test
```

---

## 7. The rule gates failed

```console
$ mise run eval
❌ 2 rule(s) restate another rule
❌ 1 numeric contradiction(s) — same subject, different number
```

**Cause.** Two gates run over `rules/`: a rule may not **restate** another (fails
at ≥10% of its units restated, and at least 2 units), and two rules may not state
**contradictory numbers** for the same subject — `60 days` in one rule and `90
days` in another survive an overlap check cleanly.

**Fix.** Reference the owning rule instead of restating it, and check which of the
two numbers is wrong:

```bash
mise run eval -- --rule devops     # dossier for one rule
mise run eval -- --json            # every matched unit, machine-readable
```
