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
- `<slug>` should equal the frontmatter `name`.

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

| Field | Antigravity | pi-agent | oh-my-pi | OpenCode | Cursor | Claude Code |
| --- | --- | --- | --- | --- | --- | --- |
| `name` | (derived) | ✅ used | ✅ used | — | ✗ dropped (filename) | ✗ dropped |
| `description` | ✅ emitted | ✅ emitted | ✅ emitted | ✅ used for matching | ✅ emitted | ✗ dropped (not in schema) |
| `globs` | ✅ joined as string under `trigger: glob` | ✗ dropped | ✅ preserved | ✅ preserved | ✅ joined as string | ✅ → `paths`, array |
| `alwaysApply` | ✅ → `trigger: always_on` | ✗ dropped | ✅ preserved | ✗ dropped | ✅ preserved, suppresses `globs` | ✅ as *absence* of `paths` |
| `trigger` | ✅ emitted | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped |
| `match` | ✗ dropped | ✗ dropped | ✗ dropped | ✅ preserved | ✗ dropped | ✗ dropped |
| `tags` | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped |
| `tools` | ✗ dropped | ✅ preserved | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped |

"✗ dropped" means the field is not emitted in that harness's output. It does
not mean it's an error to set it — other harnesses may need it. The renderer
picks what its harness understands.

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
