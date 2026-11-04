# agency-rules

**Write rules once. Run them everywhere.**

`agency-rules` compiles a single set of generic Markdown rules into the
native formats expected by **Google Antigravity**, **pi-agent**,
**oh-my-pi (omp)**, and **OpenCode** (via the [opencode-rules](https://github.com/frap129/opencode-rules) plugin).

The whole pipeline — toolchain, environment, and tasks — is managed by
[mise](https://mise.jdx.dev), so every collaborator and CI runner uses the
exact same Node version and the exact same commands.

---

## Why

Every coding agent has its own rule format:

| Harness (`--harness` id) | Format | Location |
| --- | --- | --- |
| `antigravity` — Google Antigravity | YAML frontmatter with `trigger` | `.agents/rules/*.md` |
| `piAgent` — pi-agent | Per-rule directory with `RULES.md` | `.pi/agent/rules/<slug>/RULES.md` |
| `ohMyPi` — oh-my-pi (omp) | Markdown with frontmatter | `.omp/rules/*.{md,mdc}` |
| `opencode` — OpenCode | Markdown via [opencode-rules](https://github.com/frap129/opencode-rules) plugin | `.opencode/rules/*.md` |
| `cursor` — Cursor | Markdown with `description` / `globs` / `alwaysApply` | `.cursor/rules/*.mdc` |
| `claudeCode` — Claude Code | Markdown with `paths` for conditional loading | `.claude/rules/*.md` |

**pi-agent needs a loader.** Pi does not read `<agent-dir>/rules` on its own, so
`piAgent` output is only live when a rules extension is installed — the
reference one reads each `RULES.md`, puts its `name` and `description` in the
system prompt, and exposes the body through a `read_rule` tool. That loader
resolves rules from `<agent-dir>/rules`, which is why the project destination
mirrors it as `.pi/agent/rules` rather than `.pi/rules`: a path the compiler
writes and the loader never reads installs cleanly and reaches no prompt.
Every other harness here is read natively by its agent.

Writing the same rule four times is a maintenance nightmare. `agency-rules`
lets you write it **once** in a neutral format and compile it to all four
with a single command, driven by a declarative contract (`tools.json`).

---

## Global CLI Usage

You can also use `agency-rules` directly via `npx` without cloning the repository:

```bash
# Scaffold a new rule skeleton
npx agency-rules new api-review --description "Use when reviewing REST endpoints, to catch missing validation."

# Validate rules
npx agency-rules validate

# Score textual overlap between rules (fails above the gate)
npx agency-rules eval

# See which rules are installed, and whether they still match the compiled output
npx agency-rules list --harness antigravity

# Compile rules
npx agency-rules convert

# Install rules interactively
npx agency-rules install
```

`new` refuses a slug that already exists, a slug that is not kebab-case, and a
missing `--description` — the description is the only field a harness can match
on, so it cannot be generated as a placeholder.

### Catching duplication

The most common defect in a growing rule set is a rule that restates one that
already exists, which produces two sources of truth that drift apart. `eval`
measures it instead of trusting review:

```bash
npx agency-rules eval                  # gate at 10% of a rule's units restated
npx agency-rules eval --json           # machine-readable
npx agency-rules eval --rule devops    # evidence for one rule
```

Every mode gates on the same thing, so `--json` and `--rule` cannot report a
defect and still exit 0: a contradiction fails `eval` whichever flag you ran it
with, and `--rule` gates on that rule's own overlap share and contradictions.

It splits each body into units (a bullet or a sentence), compares them on
word-pair overlap, and reports the **share of a rule that already exists
elsewhere**, per rule and per pair. The gate requires both a percentage and a
minimum unit count, so one shared sentence in a small rule cannot fail a build.

The same command also checks for **numeric contradictions** — two rules stating
the same obligation with a different number, which is worse than duplication
because a reader trusts whichever they saw first:

```text
❌ 1 numeric contradiction(s) — same subject, different number
   87.5%  contracts [60|day] vs post-sale [90|day]
          **No auto-renewal without review**, and the review runs in two ordered windows
          **Auto-renewals are reviewed 90 days before expiry** — the commercial conversation
```

The subject of a claim is taken as the words around the number, not the whole
sentence: two rules can state one obligation with completely different surrounding
clauses. Output reports **how many claims were compared** alongside the result,
because "no contradictions" means little without the denominator — the check is
deliberately conservative and a contradiction phrased in unrelated vocabulary
around the number will not be caught.

---

## Quick Start

```bash
# 1. Install toolchain + dependencies (one time)
git clone https://github.com/<your-org>/agency-rules.git
cd agency-rules
mise install

# 2. Compile rules to every harness
mise run convert

# 3. Install into harnesses detected on your machine
mise run install --scope project
```

That's it. Your rules are now live in `.agents/`, `.pi/`, `.omp/`, and
`.opencode/` (and the `opencode-rules` plugin is registered in
`opencode.json` automatically).

---

## Repository layout

```
agency-rules/
├── rules/              ← source of truth (Markdown + YAML frontmatter)
├── integrations/       ← compiled output (generated, gitignored)
├── scripts/            ← convert, install, validate + renderers
├── tests/              ← node:test suites for renderers and parsing
├── docs/               ← architecture, spec, extension guide
├── tools.json          ← the conversion contract
└── mise.toml           ← toolchain + tasks
```

---

1. **Validate**: `mise run validate`.
2. **Convert**: `mise run convert` and inspect `integrations/`.
3. **Test**: `mise run test`.

## Commands

All commands go through mise:

| Command | What it does |
| --- | --- |
| `mise run setup` | Install Node dependencies (`npm ci`) |
| `mise run create-rule -- <slug>` | Scaffold a new rule skeleton |
| `mise run validate` | Validate every rule's frontmatter against `rules/_schema.json` |
| `mise run eval` | Score textual overlap between rules (fails above the gate) |
| `mise run check` | Format + lint + organize imports with Biome (write mode) |
| `mise run convert` | Compile `rules/` → `integrations/<harness>/` |
| `mise run convert:dry-run` | Preview which files `convert` would write (no writes) |
| `mise run install` | Sync compiled output into harness directories |
| `mise run install:dry-run` | Preview which files `install` would copy (no writes) |
| `mise run test` | Run the Node test suite |
| `mise run ci` | Full pipeline (`validate` → `eval` → `check` → `convert` → `test`) |

See `mise tasks` for the up-to-date list.

### Dry-run workflow

The typical inner loop uses dry-runs first to inspect what will change
before anything hits disk:

```bash
mise run convert:dry-run            # see generated file paths + sizes
mise run convert                    # actually write to integrations/
mise run install:dry-run -- --all   # see copy destinations
mise run install -- --all           # actually copy into harness dirs
```

### Interactive installer

Run `mise run install` (or `npx agency-rules install`) with no arguments and it
asks three questions instead of guessing:

```text
🎯 Select harnesses to install into:
  1) antigravity (Google Antigravity)
  2) piAgent (Pi Coding Agent)
  ...
  5) cursor (Cursor)
  6) claudeCode (Claude Code)
  7) Detect automatically
  8) All harnesses

🌍 Select installation scope:
  1) project (local to this repo)
  2) user (global for your user)

📚 Select rules to install:
  1) agentmemory
  2) architecture
  ...
  all) All
```

- **Harnesses** accepts a comma-separated list (`1,5`), `detect` to use the
  directories already on your machine, or `all` to ignore detection.
- **Scope** decides which destination column in `tools.json` is used.
- **Rules** reads its list from the compiled manifests of the harnesses you
  picked, so you can never select a rule that was not built for them. Enter
  selects everything.

Every prompt is skipped when the equivalent flag is supplied, so scripted runs
never block:

```bash
npx agency-rules install --harness cursor --scope project --rules typescript,go
```

`install` is also a **sync**, not a blind copy: each rule is classified as
`🆕 added`, `🔄 updated`, or `⏭️ unchanged (skipped)`, and only the first two are
written. An unchanged file keeps its mtime, which matters because a harness
watching its rules directory treats a timestamp bump as a reload.

Two cases that used to look like success now fail loudly: a `--rules` list that
matches nothing in the compiled output, and an explicitly requested `--harness`
whose `integrations/` does not exist. Both exit 1 instead of printing
`🎉 Installed 0 file(s)`, and both are decided **before** anything is copied, so
a failing run leaves your harness config untouched. `install` with **nothing
auto-detected** is still a zero exit — that is a legitimate no-op — so read the
output rather than trusting the status code alone.

To see where you stand at any time:

```bash
npx agency-rules list --harness cursor
# ✅ synced   installed and matches the compiled output
# 🔄 modified installed, but your local copy differs (edited, or not re-installed)
# ⬜ missing  compiled, never installed
# ❓ unbuilt  in rules/, never compiled
```

---

## Adding a rule

1. Create `rules/<category>/<slug>.md` following
   [`docs/RULE-SPEC.md`](docs/RULE-SPEC.md).
2. Run `mise run validate` — it must pass.
3. Run `mise run convert` — inspect `integrations/` to sanity-check output.
4. Open a PR.

---

## Adding a harness

See [`docs/ADDING-A-HARNESS.md`](docs/ADDING-A-HARNESS.md). It's roughly:

1. Add an entry in `tools.json`.
2. Add a renderer in `scripts/lib/renderers/`.
3. Register the renderer in `scripts/lib/renderers/index.mjs`.
4. Add tests in `tests/convert.test.mjs`.

The conversion engine itself never changes.

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — data flow, contracts, caching.
- [Rule spec](docs/RULE-SPEC.md) — the neutral frontmatter format.
- [Adding a harness](docs/ADDING-A-HARNESS.md) — extension guide.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Pull requests welcome.

## Security

See [SECURITY.md](SECURITY.md) for responsible disclosure.

![Repobeats analytics](https://repobeats.com/deuriib/agency-rules?theme=light&size=medium&period=30)

## License

MIT — see [LICENSE](LICENSE).
