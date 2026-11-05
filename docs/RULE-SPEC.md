# Rule Specification

The neutral format for a rule: **Markdown with YAML frontmatter**.
Every rule compiles to every harness, so the frontmatter must carry enough
information to derive each harness's expectations.

---

## File layout

```
rules/
├── _schema.json
├── <category>/
│   └── <slug>.md
```

- `_schema.json` is the JSON Schema. It is not a rule and is skipped.
- Any file starting with `_` is skipped.
- `<slug>` **must** equal the frontmatter `name`. `validate` enforces it: a file
  whose name disagrees with its `name` field is an error, because every reference
  in every other rule resolves by slug while `list` and the manifests show the
  filename.
- **Unknown frontmatter keys are rejected.** The schema sets
  `additionalProperties: false`, so a typo such as `triger` fails instead of being
  silently ignored — which matters most for `trigger`, where a silent miss would
  let the derivation chain in *Antigravity trigger precedence* take over without
  the author noticing. The error names the key and suggests the near match.
- **Duplicate keys are rejected.** YAML forbids them; `validate` reports
  `invalid YAML frontmatter: duplicated mapping key (line N)` rather than aborting
  the run.

---

## Frontmatter fields

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `name` | ✅ | string, `^[a-z][a-z0-9-]*$`, ≤64 | Unique identifier. Used as the slug. |
| `description` | ✅ | string, 1–1024 | **When** the rule applies (not what it says). Harnesses use this for matching. |
| `globs` | ❌ | string \| string[] | File patterns that trigger the rule. |
| `alwaysApply` | ❌ | boolean | If `true`, ignore `globs` and always apply. |
| `trigger` | ❌ | `always_on` \| `glob` \| `model_decision` \| `manual` | Explicit trigger for Antigravity. Overrides auto-derivation. |
| `match` | ❌ | `any` \| `all` | OpenCode: match any glob or all globs. |
| `tags` | ❌ | string[] | Freeform metadata. Ignored by all harnesses. |
| `tools` | ❌ | string[] | pi-agent: tools the rule provides. Preserved verbatim. |

---

## Body

The body is Markdown. It is copied verbatim into every compiled output.
Don't put harness-specific syntax here — anything that must differ goes in
the frontmatter and is handled by the renderer.

---

## Compatibility matrix

| Field | Antigravity | pi-agent | oh-my-pi | OpenCode | Cursor | Claude Code | GitHub Copilot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `name` | (derived) | ✅ used | ✅ used | — | ✗ dropped (filename) | ✗ dropped | ✗ dropped (filename) |
| `description` | ✅ emitted | ✅ emitted | ✅ emitted | ✅ used for matching | ✅ emitted | ✗ dropped (not in schema) | ✅ emitted |
| `globs` | ✅ joined as string under `trigger: glob` | ✗ dropped | ✅ preserved | ✅ preserved | ✅ joined as string | ✅ → `paths`, array | ✅ joined into `applyTo` |
| `alwaysApply` | ✅ → `trigger: always_on` | ✗ dropped | ✅ preserved | ✗ dropped | ✅ preserved, suppresses `globs` | ✅ as *absence* of `paths` | ✅ → `applyTo: "**"`, suppresses `globs` |
| `trigger` | ✅ emitted | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped |
| `match` | ✗ dropped | ✗ dropped | ✗ dropped | ✅ preserved | ✗ dropped | ✗ dropped | ✗ dropped |
| `tags` | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped |
| `tools` | ✗ dropped | ✅ preserved | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped |

"✗ dropped" means the field is not emitted in that harness's output. It does
not mean it's an error to set it — other harnesses may need it. The renderer
picks what its harness understands.

### GitHub Copilot's `applyTo`

Copilot injects a path-specific instruction file only when its `applyTo` glob
matches a file it is working on, so the renderer always emits the field and
never drops it conditionally: a file without one installs cleanly and reaches no
prompt. Multiple globs are joined with commas, which is the syntax Copilot
documents. A rule with no `globs`, or with `alwaysApply: true`, compiles to
`applyTo: "**"` — every file.

That last case is the one to know about: this rule set has 45 rules without
`globs`, so a full `copilot` install is 51 files and about 128 KB of instruction
text that Copilot may inject on any file. It is the same always-available model
the other harnesses use, but Copilot charges for it in context rather than only
in a tool listing. Add `globs` to a rule if that cost shows up.

---

## Antigravity trigger precedence

Antigravity requires a `trigger` field. The renderer resolves it in this
order:

1. Explicit `trigger` in the rule.
2. `alwaysApply: true` → `always_on`.
3. `globs` present → `glob`.
4. Only `description` → `model_decision`.
5. Nothing → `manual`.

When `trigger: glob`, the renderer joins the `globs` array with commas into a
single string, which is the format Antigravity's YAML parser expects.

---

## Examples

Every `description` below answers **when** to load the rule, never what it
contains — that is the only thing harnesses can match on before the body is
read.

### Always-on baseline

```markdown
---
name: coding-standards
description: Use on every code edit, regardless of file type or language.
alwaysApply: true
tags: [base]
---

# Coding Standards
...
```

Compiles to Antigravity `trigger: always_on`, oh-my-pi `alwaysApply: true`,
and pi-agent / OpenCode with just `name` + `description`.

### Scoped to file globs

```markdown
---
name: typescript
description: Use when editing TypeScript or TSX source files, to keep typing strict.
globs:
  - "**/*.ts"
  - "**/*.tsx"
tags: [language, typescript]
---

# TypeScript Rules
...
```

Compiles to Antigravity `trigger: glob` + `globs: "**/*.ts,**/*.tsx"`,
oh-my-pi and OpenCode with the original array, pi-agent without `globs`.

### Description-only (model decision)

```markdown
---
name: api-review
description: Use when reviewing REST API endpoint definitions, to catch missing validation.
---

# API Review
...
```

Compiles to Antigravity `trigger: model_decision`. Other harnesses get just
`name` + `description`.

```
