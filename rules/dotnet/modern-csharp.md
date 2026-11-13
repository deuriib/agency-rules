---
name: modern-csharp
description: Use when writing new C# code, to reach for the modern language features that reduce boilerplate and express intent, instead of pre-C# 12 idioms.
globs:
  - "**/*.cs"
tags: [dotnet, csharp, language, modern]
---

# Modern C# (C# 12 → 14)

The prohibitions — nullable, `dynamic`, `.Result`, `async void` — live in
`csharp`. This rule is about what to adopt, not what to avoid. Set
`<LangVersion>` to the SDK you target; each feature below is tagged with the
version that introduced it.

- **Primary constructors for simple dependencies.** `class UserService(IRepo repo, ILogger log)` removes the ceremony of a field per dependency. Use them when the constructor only captures parameters; fall back to an explicit constructor when you need validation, defaults, or overloads. (C# 12)
- **Collection expressions everywhere.** Write `int[] a = [1, 2, 3]` and `List<int> l = [..existing, 4]` — one syntax for arrays, `List<T>`, `Span<T>`, and `IEnumerable<T>`. Spread with `..` instead of concatenating. (C# 12)
- **`required` + `init` for non-optional state.** Mark members a caller must set with `required`, and make settable-once properties `init`. Compile-time enforcement beats a constructor that throws at runtime. (C# 11)
- **Pattern matching over `if` chains.** Reach for switch expressions, property patterns, `is not null`, and deconstruction before nested `if`/`else` and null checks. (C# 8–12)
- **`params` collections over `params` arrays.** Declare `params ReadOnlySpan<T>` (or any collection type) to avoid the per-call array allocation and let callers pass a list or span. (C# 13)
- **`System.Threading.Lock` for new synchronization.** Use `Lock` with `EnterScope()`; the `lock` statement selects the new API automatically when the target is a `Lock`. Prefer it over `Monitor`/`object` in new code. (C# 13)
- **`field` keyword for accessor logic.** Use the implicit backing field when a property needs null-checking, trimming, lazy init, or change notification — `set => field = value?.Trim()`. Disambiguate with `@field` when the type already has a member named `field`. (C# 14)
- **`Span<T>` / `ReadOnlySpan<T>` on hot paths.** Use spans and `string.AsSpan()` to avoid allocations when slicing strings or buffers; C# 14 lets them flow through implicit conversions and more APIs. Keep them local — spans cannot be boxed or stored on the heap. (C# 12–14)
- **Null-conditional assignment.** `obj?.Prop = value;` replaces the `if (obj is not null)` guard and evaluates the right side only when the target is non-null. (C# 14)
- **Raw string literals for embedded text.** Use `"""..."""` for JSON, SQL, and multi-line strings instead of escaping every quote. Leading indentation is stripped, so the literal stays readable. (C# 11)

## Use with care

- **Extension members are new — reach for them last.** The `extension` block is powerful but changes how readers resolve members and is still settling. Prefer a plain static helper or instance method until the pattern has proven itself in your codebase. (C# 14)
- **`field` shadows a member named `field`.** Inside the accessor the keyword wins, so rename the member or use `@field`. Review rather than assume.
- **Primary constructors are for wiring, not logic.** Keep the parameter list for capture; do not run non-trivial logic or side effects in a primary constructor body. Real setup goes in an explicit constructor body or a factory.
