# Architecture

This document explains how `agency-rules` turns one set of generic rules into
seven native harness formats, and why the pipeline is shaped the way it is.

---

## Data flow

```
         rules/*.md                     tools.json
         (source of truth)              (contract)
              │                              │
              │                              │
              ▼                              ▼
    ┌────────────────────────────────────────────┐
    │  scripts/validate.mjs  (schema + uniqueness)│
    └────────────────────────────────────────────┘
                        │
                        ▼
    ┌────────────────────────────────────────────┐
    │  scripts/convert.mjs                        │
    │    for each harness:                        │
    │      render = renderers[harness.format]     │
    │      for each rule:                         │
    │        write render(rule, harness)          │
    │      write _manifest.json                   │
    └────────────────────────────────────────────┘
                        │
                        ▼
              integrations/<harness>/...
              (compiled, gitignored)
                        │
                        ▼
    ┌────────────────────────────────────────────┐
    │  scripts/install.mjs                        │
    │    detect harnesses                         │
    │    copy files to harness.dest[scope]        │
    │    register plugins (opencode)              │
    └────────────────────────────────────────────┘
                        │
                        ▼
                  user's harness dirs
```

---

## Layers

| Layer | File(s) | Responsibility |
| --- | --- | --- |
| **Source** | `rules/**/*.md` | Generic Markdown + YAML frontmatter. |
| **Schema** | `rules/_schema.json` | JSON Schema enforcing the neutral format. |
| **Contract** | `tools.json` | Declares each harness: format, integration path, install destinations, frontmatter mapping, plugin metadata. |
| **Engine** | `scripts/convert.mjs` | Iterates over rules × harnesses, calls the right renderer, writes output + manifest. |
| **Renderers** | `scripts/lib/renderers/*.mjs` | Pure functions: `(rule, harness) → markdown string`. No I/O. |
| **Installer** | `scripts/install.mjs` | Preflights every target (manifest + destination) before writing, copies compiled files to real destinations, registers plugins. A request it cannot fulfil fails before the first write. |
| **Validator** | `scripts/validate.mjs` | Runs the schema and checks slug uniqueness before anything else runs. |
| **Overlap eval** | `scripts/eval.mjs`, `scripts/lib/overlap.mjs`, `scripts/lib/contradictions.mjs` | Two checks, because they catch different defects. **Overlap** scores shared phrasing and fails when a rule restates another. **Contradictions** finds the same subject with a different number — two rules stating one obligation as 60 days and 90 days pass an overlap check cleanly. Pure maths in the libraries, reporting in the command. |
| **Orchestration** | `mise.toml` | Pins Node version, defines tasks, composes `ci`, wires the `postinstall` hook. |

Each layer has exactly one job. Renderers never touch the filesystem; the
engine never hardcodes a harness; the installer never renders.

---

## Why `tools.json` is the single source of truth

Every harness-specific decision lives there:

- **Which renderer** to use (`format`).
- **What path** the output takes inside `integrations/<harness>/` (`integrationPath`).
- **Where** the file ultimately lands for `project` and `user` scopes (`dest`).
- **Which frontmatter fields** are required and how they map (`frontmatter`).
- **Whether** plugin registration is needed (`plugin`).

Adding a harness is additive: one `tools.json` entry + one renderer +
one test. The engine, installer, and validator never change.

---

## Determinism guarantees

- **Pure renderers.** Same input → same output byte for byte. No timestamps,
  no random ordering. Manifests are sorted by slug.
- **Full reset on convert.** `integrations/<harness>/` is deleted before
  being rewritten. No stale files survive a rename, and a build filtered with
  `--rules` produces a directory that contains exactly those rules.
- **Manifest as index.** `integrations/<harness>/_manifest.json` records
  every file the installer should copy. The installer trusts the manifest,
  not a directory walk. A filtered build sets `partial: true` and records the
  `filter`, so `install` can tell a full build apart from a slice of one, and a
  manifest that lists no files is treated as a broken build rather than an
  empty install.
- **Locked toolchain.** `mise.lock` pins exact versions of Node and any
  installed CLIs, so a version bump is a reviewable diff rather than a drifting
  cache. CI installs the pinned toolchain through `jdx/mise-action`; `--locked`
  is not passed there today, so drift is caught by the lock diff and by a failing
  build rather than by a flag.

---

## Caching

`mise run convert` declares:

```toml
sources = ["rules/**/*.md", "tools.json", "scripts/lib/**/*.mjs"]
outputs = ["integrations/**/*"]
```

If no source has changed since the last run, mise skips the task entirely.
This keeps the inner loop fast as the rules tree grows.

---

## OpenCode plugin registration

OpenCode needs `opencode-rules` registered in its config. Both the path and the
key are contract data, not assumptions: `tools.json` declares them per scope
under `plugin.config.project` / `plugin.config.user` and `plugin.key`
(`plugins` — the schema deprecates `plugin`). The installer:

1. Looks for a config at the declared path, then at the same stem with the other
   supported extension (`.json` / `.jsonc`), because both are the same config to
   OpenCode. Creating the declared one beside an existing sibling would leave two
   files claiming one role with no rule saying which wins.
2. Reads it as strict JSON, falling back to JSONC. A file that is neither is
   warned about and skipped — a corrupted config is never clobbered.
3. Reports the entry as already registered when it appears under the declared key
   or either legacy name (`plugins`, `plugin`), so a config written before the
   deprecation does not receive a second copy.
4. Appends to a strict-JSON config and writes it back with 2-space indentation.
   A JSONC config is read but never rewritten: re-serializing it would drop every
   comment and reformat what the user maintains by hand, so the installer names
   the edit instead of performing a destructive one.
5. Creates a config only when none exists at either extension — and, for
   `project` scope, only when the user-scope config registers no plugins at all.
   OpenCode merges its config sources and a later `plugins` array replaces the
   earlier one for that key, so a project file created here would silently drop
   every plugin the user registered globally.

A harness whose `plugin` has no config path, or no key, for the requested scope
is warned about and skipped rather than guessed at.

---

## Security considerations

- Rule slugs are validated against `^[a-z][a-z0-9-]*$` before they reach the
  filesystem, preventing path traversal via `{slug}` substitution.
- `install.mjs` only reads from `integrations/` and writes to paths derived
  from `tools.json` — it never reads arbitrary user input paths.
- Renderers do not execute rule content; they only stringify it. No `eval`,
  no shell, no dynamic imports.
