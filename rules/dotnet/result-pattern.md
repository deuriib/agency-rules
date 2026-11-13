---
name: result-pattern
description: Use when deciding how a .NET method reports failure, to return a Result for expected failures and reserve exceptions for the unexpected.
trigger: model_decision
tags: [dotnet, patterns, error-handling, functional]
---

# Result Pattern

- **Expected failures are values, not exceptions.** A not-found, a validation failure, or a rejected business rule is an outcome the caller is meant to handle — return it (`Result<T>`, `Result<T, TError>`, or `OneOf`). Exceptions are for the unexpected: bugs, contract violations, and infrastructure faults you cannot recover from locally.
- **A method throws or returns a `Result`, not both.** Pick one channel per failure class. If a method both throws and returns failure results for the same conditions, the caller cannot reason about which path to handle.
- **Model the error, not just the bool.** A `Result<T>` that only says "failed" discards the reason. Carry an error type with a code and a message so the caller can branch and the log can be queried. Stringly error codes are the boolean in disguise.
- **Compose with `Map` / `Bind` / `Match`.** Chain operations railway-style instead of nesting `if (result.IsSuccess)` and try/catch. The happy path reads top to bottom; each failure short-circuits to the handler.
- **Match the result at the boundary.** Keep the `Result` inside the application layer and convert it to HTTP at the API edge — `Ok` on success, `NotFound` / `ValidationProblem` / `BadRequest` on the matching error. Do not let a `Result` type leak into a response DTO or a database model.
- **Every `Result` is handled.** An error case left unchecked is a swallowed exception with extra steps. The compiler and the reviewer must both see that the failure branch was addressed.
- **Do not use `Result` to dodge exceptions entirely.** Recoverable, expected domain outcomes become results; genuine programmer errors still throw. A codebase that never throws hides bugs as `Result.Failure` values.
