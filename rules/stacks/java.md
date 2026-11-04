---
name: java
description: Use when editing Java source files, to keep the type system strict and nullability expressed in the type.
globs:
  - "**/*.java"
tags: [language, java]
---

# Java Rules

- **No raw types.** Always parameterize generics — `List<String>`, not `List`. A raw type erases the compiler's only defence against `ClassCastException`.
- **No unchecked casts.** A cast is a claim the compiler cannot verify. Narrow with `instanceof` pattern matching first. When a cast is unavoidable, suppress on the narrowest scope with a comment naming the invariant that makes it true.
- **No nullable returns.** Return `Optional<T>` where absence is expected. Never return `null` for a collection or array — return the empty one.
- **`record` and `final` fields for data.** Records for value carriers, `final` everywhere else. Mutable public state turns every reader into a potential writer.
- **Sealed hierarchies with exhaustive switches.** Model a closed set as a `sealed` interface and switch over it without a `default` arm, so a new variant breaks the build instead of falling through.
- **No mutable static state.** A `static` field that changes is a global with a lifetime you do not control. Inject the dependency.
- **Close resources with try-with-resources.** Never a bare `try/finally`.
- **Never an empty catch.** Either handle it, wrap it with context, or let it propagate.
