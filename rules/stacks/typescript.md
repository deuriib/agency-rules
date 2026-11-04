---
name: typescript
description: Use when editing TypeScript or TSX source files, to keep typing and imports strict.
globs:
  - "**/*.ts"
  - "**/*.tsx"
tags: [language, typescript]
---

# TypeScript Rules

- **No `any` unless absolutely necessary.** Reach for `unknown` plus a narrowing check, a generic, or a precise union first. If `any` is genuinely required, justify it in a comment on the same line.
- **Top-level imports only.** No `import()` inside function bodies or conditional blocks — it hides dependencies and breaks tree-shaking guarantees.
- **`interface` over `type` for object shapes.** Use `type` only for unions, intersections, mapped types, or aliases of primitives.

## Examples

```ts
// ✅ good
interface User {
  id: string;
  name: string;
}
```

```ts
// ❌ avoid
type User = { id: string; name: string; };
```
