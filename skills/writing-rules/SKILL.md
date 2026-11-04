---
name: writing-rules
description: Use when creating or modifying generic rules in the agency-rules repository, or when adapting a coding rule to be compiled into harness-specific formats like Antigravity, pi-agent, oh-my-pi, or OpenCode.
---

# Writing Rules

## Overview

`agency-rules` acts as a rules compiler. You write a rule once in a neutral, generic format, and the `convert` script compiles it into the native format of multiple AI coding harnesses based on the contract defined in `tools.json`.

Core principle: The rule body must remain harness-agnostic. Any harness-specific behavior is handled exclusively by the YAML frontmatter and the corresponding renderer.

## When to Use

- When adding a new coding standard, language-specific guideline, or project constraint.
- When updating an existing rule's scope (e.g., changing file globs).
- When fixing a rule that failed validation (`mise run validate`).

## Rule Format

Every rule lives in `rules/<category>/<slug>.md` and consists of YAML frontmatter followed by a Markdown body.

### Frontmatter Fields

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `name` | ✅ | string | Unique kebab-case identifier (e.g., `typescript-strict`). |
| `description` | ✅ | string | **When** to apply the rule (not what it does). |
| `globs` | ❌ | string \| string[] | File patterns that trigger the rule. |
| `alwaysApply` | ❌ | boolean | If `true`, ignores `globs` and always applies. |
| `trigger` | ❌ | enum | Antigravity-specific trigger (`always_on`, `glob`, `model_decision`, `manual`). |
| `match` | ❌ | enum | OpenCode-specific matching logic (`any` or `all`). |
| `tags` | ❌ | string[] | Freeform metadata for search. |
| `tools` | ❌ | string[] | pi-agent specific tool requirements. |

### Best Practices

- **Description:** Focus on the *symptoms* and *context*. Use third-person. Do not summarize the rule's contents.
- **Body:** Keep it strictly Markdown. Do not include harness-specific directives (like `@cursor-rule` or `--- antigravity:`) in the body.
- **Name:** Must match the regex `^[a-z][a-z0-9-]*$` (lowercase, numbers, hyphens, max 64 chars).

### Description patterns

The `description` answers **when should an agent load this rule?** — never
what the rule says. Harnesses match on this field, so a description that
summarizes content makes the rule invisible at the moment it is needed.

| ❌ Avoid | ✅ Prefer |
| --- | --- |
| `Rules for Python.` | `Use when editing Python modules, to keep typing and imports consistent.` |
| `Enforce Conventional Commits format for all git commit messages.` | `Use when writing or amending a git commit message, to pick the right type and scope.` |
| `TypeScript coding standards.` | `Use when editing TypeScript or TSX files, to keep typing strict.` |
| `Baseline rules applied to every edit.` | `Use on every code edit, regardless of file type or language.` |
| `This rule contains our security checklist and best practices for auth.` | `Use when touching authentication, sessions, or permission checks.` |

The reliable test: if the description survives being read *before* the agent
sees the body, it is a good description. If it only makes sense *after*
reading the body, it is a summary, not a trigger.

## Workflow

1. **Draft the rule:** Create `rules/<category>/<slug>.md`.
2. **Validate:** Run `mise run validate`. This checks the frontmatter against `rules/_schema.json` and ensures no duplicate names exist.
3. **Compile:** Run `mise run convert`. This generates the output in `integrations/<harness>/`.
4. **Inspect:** Check `integrations/` to ensure the frontmatter mapped correctly (e.g., Antigravity got a `trigger`, OpenCode got a `description`).
5. **Test:** Run `mise run ci` to ensure everything remains green.

## Examples

### Example 1: Glob-based Rule (File-specific)

```markdown
---
name: typescript-strict
description: Use when editing TypeScript or TSX source files, to keep typing and imports strict.
globs:
  - "**/*.ts"
  - "**/*.tsx"
tags: [language, typescript]
---

# TypeScript Strict Rules

- No `any` unless justified in a comment.
- Prefer `interface` over `type` for object shapes.
```

### Example 2: Always-On Rule (Global)

```markdown
---
name: commit-conventions
description: Use when writing, amending, or reviewing a git commit message, to choose the right type and scope.
alwaysApply: true
tags: [git, commits]
---

# Git Commit Conventions

All commit messages must follow the Conventional Commits specification...
```

### Example 3: Description-only Rule (Model Decision)

No `globs`, no `alwaysApply`. The rule is loaded when the model judges the
description relevant — Antigravity derives `trigger: model_decision`, while
pi-agent and OpenCode keep just `name` + `description`.

```markdown
---
name: api-review
description: Use when reviewing REST API endpoint definitions, to catch missing validation and inconsistent error shapes.
tags: [review, api]
---

# API Review

- Every endpoint validates its input and returns a consistent error shape.
```

## Common Mistakes

- **Forgetting to validate:** Writing the rule and immediately trying to convert. Always run `mise run validate` first.
- **Harness-specific body:** Adding Antigravity-specific `trigger` syntax inside the Markdown body. The body must be plain Markdown.
- **Vague descriptions:** Writing `description: Rules for Python` instead of `description: Use when editing Python modules, to keep typing and imports consistent`. See [Description patterns](#description-patterns).
- **Summary descriptions:** Describing what the rule contains (`This rule covers our auth checklist`) instead of when to load it (`Use when touching authentication`).
- **Invalid slug:** Using spaces or capital letters in `name` (e.g., `My Rule` instead of `my-rule`).
