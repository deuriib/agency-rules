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
description: Enforce strict TypeScript patterns for all .ts and .tsx files.
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
description: Enforce Conventional Commits format for all git commit messages.
alwaysApply: true
tags: [git, commits]
---

# Git Commit Conventions

All commit messages must follow the Conventional Commits specification...
```

## Common Mistakes

- **Forgetting to validate:** Writing the rule and immediately trying to convert. Always run `mise run validate` first.
- **Harness-specific body:** Adding Antigravity-specific `trigger` syntax inside the Markdown body. The body must be plain Markdown.
- **Vague descriptions:** Writing `description: Rules for Python` instead of `description: Use when editing Python modules to enforce type hints`.
- **Invalid slug:** Using spaces or capital letters in `name` (e.g., `My Rule` instead of `my-rule`).
