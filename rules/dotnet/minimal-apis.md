---
name: minimal-apis
description: Use when building or reviewing .NET HTTP endpoints, to pick Minimal APIs versus MVC and keep responses, validation, and middleware order consistent.
trigger: model_decision
tags: [dotnet, aspnet-core, http, api]
---

# Minimal APIs

- **Minimal APIs for small, focused services; MVC for large apps.** Choose Minimal APIs for microservices and single-purpose endpoints. Reach for MVC controllers when you need filters, model-binding conventions, or a large surface that benefits from them. Do not mix both styles in one service without a reason.
- **Consistent responses through `Results` helpers.** Return `Results.Ok(...)`, `Results.NotFound()`, `Results.NoContent()`, and `Results.Problem(...)` instead of hand-building `IResult` objects or raw JSON. A predictable shape is a contract the client relies on.
- **`ValidationProblem` for invalid payloads.** When model validation fails, return `Results.ValidationProblem(...)` so the 400 carries a machine-readable error shape. Validate with Data Annotations for simple cases and FluentValidation for complex rules; keep the rules out of the handler.
- **Middleware in dependency order.** Register the pipeline as: exception handling → HTTPS redirection → authentication → authorization → endpoint mapping. Authorization after authentication, and both before the endpoints they protect. `UseExceptionHandler` comes first so downstream failures reach it.
- **Endpoint handlers are thin.** Map a route to a small handler that validates, calls one application use case, and maps the result to a response. Business logic lives in the application layer, not inline in `MapGet`.
- **Typed results over throwing for expected failure.** A "not found" is `Results.NotFound()`, not an exception caught by middleware. Exceptions are for the unexpected.
