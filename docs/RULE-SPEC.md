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

| Field | Antigravity | pi-agent | oh-my-pi | OpenCode |
| --- | --- | --- | --- | --- |
| `name` | (derived) | ✅ used | ✅ used | — |
| `description` | ✅ emitted | ✅ emitted | ✅ emitted | ✅ used for matching |
| `globs` | ✅ joined as string under `trigger: glob` | ✗ dropped | ✅ preserved | ✅ preserved |
| `alwaysApply` | ✅ → `trigger: always_on` | ✗ dropped | ✅ preserved | ✗ dropped |
| `trigger` | ✅ emitted | ✗ dropped | ✗ dropped | ✗ dropped |
| `match` | ✗ dropped | ✗ dropped | ✗ dropped | ✅ preserved |
| `tags` | ✗ dropped | ✗ dropped | ✗ dropped | ✗ dropped |
| `tools` | ✗ dropped | ✅ preserved | ✗ dropped | ✗ dropped |

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

### Always-on baseline

```markdown
---
name: coding-standards
description: Baseline rules applied to every edit regardless of file type.
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
description: Mandatory rules for editing TypeScript and TSX files.
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
description: Use this rule when reviewing REST API endpoint definitions.
---

# API Review
...
```

Compiles to Antigravity `trigger: model_decision`. Other harnesses get just
`name` + `description`.

```
