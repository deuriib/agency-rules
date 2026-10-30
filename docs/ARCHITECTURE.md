# Architecture

This document explains how `agency-rules` turns one set of generic rules into
four native harness formats, and why the pipeline is shaped the way it is.

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
| **Installer** | `scripts/install.mjs` | Detects harnesses, copies compiled files to real destinations, registers plugins. |
| **Validator** | `scripts/validate.mjs` | Runs the schema and checks slug uniqueness before anything else runs. |
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
  being rewritten. No stale files survive a rename.
- **Manifest as index.** `integrations/<harness>/_manifest.json` records
  every file the installer should copy. The installer trusts the manifest,
  not a directory walk.
- **Locked toolchain.** `mise.lock` pins exact versions of Node and any
  installed CLIs. CI uses `mise install --locked` to fail on drift.

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

OpenCode needs `opencode-rules` registered in `opencode.json`. The installer:

1. Reads (or creates) `opencode.json`.
2. Ensures `config.plugin` is an array.
3. Appends `"opencode-rules@latest"` if it isn't already present.
4. Writes the config back with 2-space indentation.

If the file exists but is invalid JSON, the installer warns and skips rather
than overwriting — a corrupted config is never silently clobbered.

---

## Security considerations

- Rule slugs are validated against `^[a-z][a-z0-9-]*$` before they reach the
  filesystem, preventing path traversal via `{{slug}}` substitution.
- `install.mjs` only reads from `integrations/` and writes to paths derived
  from `tools.json` — it never reads arbitrary user input paths.
- Renderers do not execute rule content; they only stringify it. No `eval`,
  no shell, no dynamic imports.
