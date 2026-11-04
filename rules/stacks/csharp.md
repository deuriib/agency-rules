---
name: csharp
description: Use when editing C# source files, to keep nullable reference types, async, and generics strict.
globs:
  - "**/*.cs"
tags: [language, csharp]
---

# C# Rules

- **Nullable reference types on.** Enable `<Nullable>enable</Nullable>` and treat the resulting warnings as errors. Absence belongs in the type, not in a comment or a `Debug.Assert`.
- **No `dynamic` unless interop.** It disables the type system for every expression it touches. Acceptable only at a COM or dynamic-JSON boundary, narrowed to a typed model immediately.
- **No non-generic collections.** `ArrayList` and `Hashtable` box every value and defer the type error to runtime. Use `List<T>` and `Dictionary<TKey, TValue>`.
- **`record` or `readonly struct` for values.** No publicly settable property on a value type — use `init`.
- **No `.Result` or `.Wait()` on a `Task`.** They deadlock in a synchronization context and rewrap the failure in `AggregateException`. `await` it.
- **No `async void`** outside an event handler — the caller cannot observe the failure.
- **Exhaustive pattern matching.** A switch over your own closed hierarchy is a switch expression with no silent `_` arm.
- **No unsafe casts.** Use `is` / `as` with a null check. Suppress a warning on the narrowest scope, with the reason.
