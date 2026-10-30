# Contributing to agency-rules

Thanks for your interest. This document explains how to get set up, the
standards we follow, and the review process.

---

## Prerequisites

Only one thing: [mise](https://mise.jdx.dev/getting-started.html).

```bash
# macOS / Linux
curl https://mise.run | sh

# or via package manager
brew install mise
```

Everything else (Node version, `npm ci`, tasks) is handled by mise.

---

## Setup

```bash
git clone https://github.com/<your-org>/agency-rules.git
cd agency-rules
mise install          # installs Node 22 and runs `npm ci`
mise run ci           # verifies the baseline is green
```

If `mise run ci` fails on a fresh clone, that's a bug — please open an issue.

---

## Development workflow

1. **Branch** from `main`: `git switch -c feat/my-rule`.
2. **Edit** files under `rules/` (or `scripts/lib/renderers/` for a new
   harness).
3. **Format + lint**: `mise run check` (Biome, write mode — fixes automatically).
4. **Validate**: `mise run validate`.
5. **Convert**: `mise run convert` and inspect `integrations/`.
   Use `mise run convert:dry-run` first if you just want to preview.
6. **Test**: `mise run test`.
7. **Commit** using Conventional Commits (see below).
8. **Push** and open a PR.

The `mise run ci` command runs all three checks. Run it before pushing.

---

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use |
| --- | --- |
| `feat:` | New rule, new harness, new capability |
| `fix:` | Bug fix in a renderer, schema, or task |
| `docs:` | Documentation only |
| `test:` | Test-only changes |
| `chore:` | Tooling, deps, CI, formatting |
| `refactor:` | Behavior-preserving restructuring |

Examples:

```
feat(rules): add python async conventions
feat(harness): support Cursor (.mdc)
fix(antigravity): join globs with comma, not space
docs(spec): clarify trigger precedence
```

A scope is optional but recommended (`rules`, `harness`, `docs`, `ci`).

---

## What gets reviewed

Reviewers check:

1. **Schema** — `mise run validate` passes and the rule's frontmatter is
   minimal (no unused fields).
2. **Description quality** — the `description` explains **when** the rule
   applies, not what it does. This is what harnesses use for matching.
3. **Renderer behavior** — for harness changes, output must be
   byte-identical across runs.
4. **Tests** — new renderers come with a test in `tests/convert.test.mjs`.
5. **No generated files committed** — `integrations/` is gitignored. Do not
   `git add -f` it.

---

## Adding a new rule — checklist

- [ ] File lives under `rules/<category>/<slug>.md`
- [ ] `name` matches the slug (kebab-case, ≤64 chars)
- [ ] `description` explains when to apply
- [ ] `globs` / `alwaysApply` / `trigger` used correctly
      (see [docs/RULE-SPEC.md](docs/RULE-SPEC.md))
- [ ] `mise run validate` passes
- [ ] `mise run convert` produces sensible output for all four harnesses
- [ ] PR references any related issue

## Adding a new harness — checklist

- [ ] Entry added to `tools.json` with all required keys
- [ ] Renderer created in `scripts/lib/renderers/<id>.mjs`
- [ ] Renderer registered in `scripts/lib/renderers/index.mjs`
- [ ] Test added to `tests/convert.test.mjs`
- [ ] `docs/ADDING-A-HARNESS.md` updated (table at the bottom)
- [ ] `mise run ci` passes

---

## Code style

- **JS**: ESM only, 4-space indent, single quotes, trailing commas, 100 cols.
  Formatted and linted by **Biome** — run `mise run check` before committing.
- **Markdown**: prose wrap at 100 cols for docs; rules keep their own body
  formatting.
- **JSON**: 2-space indent, handled by Biome.

---

## Reporting issues

Use the issue templates in `.github/ISSUE_TEMPLATE/`. For security issues,
see [SECURITY.md](SECURITY.md).
