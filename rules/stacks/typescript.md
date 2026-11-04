---
name: typescript
description: Use when editing TypeScript or TSX source files, to keep typing and imports strict.
globs:
  - "**/*.ts"
  - "**/*.tsx"
tags: [language, typescript]
---

# TypeScript Rules

- **`strict` is on, including `noImplicitAny`.** A rule under `// @ts-nocheck` or a `tsconfig` without `strict` is not TypeScript, it is JavaScript with extra steps.
- **No `any` unless absolutely necessary.** Reach for `unknown` plus a narrowing check, a generic, or a precise union first. If `any` is genuinely required, justify it in a comment on the same line.
- **`unknown` at every trust boundary.** Input from `JSON.parse`, `fetch`, `process.env`, or a form is `unknown` until a type guard or schema proves otherwise.
- **Model closed sets as discriminated unions.** A tag field plus exhaustive `switch` or `never` check, so adding a variant breaks the build instead of falling through.
- **Top-level imports only.** No `import()` inside function bodies or conditional blocks — it hides dependencies and breaks tree-shaking guarantees.
- **`interface` over `type` for object shapes.** Use `type` only for unions, intersections, mapped types, or aliases of primitives.
- **No non-null assertion (`!`) to silence the compiler.** It is a claim you have already handled `null`, unchecked. Narrow with a guard or restructure so the value is non-nullable.
- **No `@ts-ignore`.** It suppresses every error on the next line, including ones you have not seen. Use `@ts-expect-error` with a comment, so it fails once the error is gone.
- **No unsafe casts.** A cast through `unknown` (`x as unknown as T`) is a lie the compiler cannot catch. Validate instead.
- **`readonly` and immutable updates by default.** `readonly` on interface fields, `ReadonlyArray<T>` / `readonly T[]`, and `as const` for literals. A type carrying a `Date` or mutable array is mutable in practice regardless of the annotation.
- **No stringly-typed code.** A union of literals or an enum, not `string`. Never key a `Record` with a bare `string` when the set of keys is known.

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
