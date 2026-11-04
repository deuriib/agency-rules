---
name: coding-standards
description: Use on every code edit, regardless of file type or language.
alwaysApply: true
tags: [base, quality]
---

# Coding Standards

These are the baseline expectations for any file you touch. Language-specific
rules live in `stacks/` and layer on top of these.

## Rules

- **Small functions.** Keep functions under 40 lines. If it needs a scroll, split it.
- **Named exports.** Prefer named exports over default exports so imports stay greppable and rename-safe.
- **No debug output.** Never commit `console.log` or any other debug print. Use a structured logger, or delete the statement before committing.

## Scope

- These rules apply to application source, scripts, and tests alike.
- Where a language rule under `stacks/` is stricter, the stricter rule wins.
