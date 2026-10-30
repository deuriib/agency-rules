# agency-rules

**Write rules once. Run them everywhere.**

`agency-rules` compiles a single set of generic Markdown rules into the
native formats expected by **Google Antigravity**, **pi-agent**,
**oh-my-pi (omp)**, and **OpenCode** (via the `opencode-rules` plugin).

The whole pipeline — toolchain, environment, and tasks — is managed by
[mise](https://mise.jdx.dev), so every collaborator and CI runner uses the
exact same Node version and the exact same commands.

---

## Why

Every coding agent has its own rule format:

| Harness | Format | Location |
| --- | --- | --- |
| Google Antigravity | YAML frontmatter with `trigger` | `.agents/rules/*.md` |
| pi-agent | Per-rule directory with `RULES.md` | `.pi/rules/<slug>/RULES.md` |
| oh-my-pi (omp) | Markdown with frontmatter | `.omp/rules/*.{md,mdc}` |
| OpenCode | Markdown via `opencode-rules` plugin | `.opencode/rules/*.md` |

Writing the same rule four times is a maintenance nightmare. `agency-rules`
lets you write it **once** in a neutral format and compile it to all four
with a single command, driven by a declarative contract (`tools.json`).

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
| `mise run validate` | Validate every rule's frontmatter against `rules/_schema.json` |
| `mise run check` | Format + lint + organize imports with Biome (write mode) |
| `mise run convert` | Compile `rules/` → `integrations/<harness>/` |
| `mise run convert:dry-run` | Preview which files `convert` would write (no writes) |
| `mise run install` | Copy compiled output into harness directories |
| `mise run install:dry-run` | Preview which files `install` would copy (no writes) |
| `mise run test` | Run the Node test suite |
| `mise run ci` | Full pipeline (`validate` → `check` → `convert` → `test`) |

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

## License

MIT — see [LICENSE](LICENSE).
