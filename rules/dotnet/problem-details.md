---
name: problem-details
description: Use when shaping HTTP error responses in a .NET API, to return RFC 9457 problem details, map exceptions globally, and never leak internals.
trigger: model_decision
tags: [dotnet, aspnet-core, http, errors, rfc-9457]
---

# Problem Details (RFC 9457)

The endpoint-level helpers (`Results.Problem`, `Results.ValidationProblem`) live
in `minimal-apis`. This rule covers the one consistent error contract for the
whole API.

- **One error shape: `application/problem+json`.** Return a `ProblemDetails` (RFC 9457, formerly RFC 7807) for every error. Fill the standard fields — `type`, `title`, `status`, `detail`, `instance` — and put machine-readable values in `extensions`.
- **Register `AddProblemDetails()`.** It makes the framework turn client and server errors that have no body into problem details, so even unmapped 4xx/5xx responses come back in the same shape.
- **Map exceptions globally with `IExceptionHandler`.** Implement `TryHandleAsync` to translate exceptions into a `ProblemDetails` and write it, instead of sprinkling try/catch per endpoint. `app.UseExceptionHandler()` is the fallback when no handler claims the exception — pair it with `AddProblemDetails()`.
- **Machine-readable error codes in `extensions`.** Put a stable error code, a `traceId`/`correlationId`, and validation failures in `extensions.errors`. Keep `title` and `detail` human-readable; a client branches on the code, never on prose.
- **Never leak internals in production.** No stack trace, exception type, SQL, or internal path reaches the client. The correlation ID does — it is how the operator finds the trace.
- **Customize centrally, not per response.** Use `ProblemDetailsOptions.CustomizeProblemDetails` (or a single `IProblemDetailsService`) to add common fields like machine name and trace ID once, rather than rebuilding the object in every handler.
- **One contract across every route.** Controllers, Minimal APIs, and middleware must agree on the same shape. A client that has to parse two error formats has none.
