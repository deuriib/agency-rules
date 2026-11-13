---
name: fast-endpoints
description: Use when building or reviewing a FastEndpoints API, to follow the REPR pattern, validate per request, and group shared endpoint configuration.
trigger: model_decision
tags: [dotnet, fastendpoints, http, api]
---

# FastEndpoints (REPR)

- **One endpoint per file: request → endpoint → response.** Follow the REPR pattern — a request DTO, an endpoint that handles it, and a response DTO. Never fold multiple endpoints or a controller-style class into one file.
- **Configure routes in `Configure()`, handle in `HandleAsync`.** Set the verb and path in `Configure()` and put the logic in `HandleAsync(req, ct)`. Respond with the `Send.*` helpers (`Send.OkAsync`, `Send.NotFoundAsync`); do not hand-build raw results.
- **Validate with `Validator<TRequest>`.** Derive a FluentValidation validator from `Validator<TRequest>`; FastEndpoints auto-discovers it per request DTO and runs it before the handler. Use `ThrowError(...)` for an immediate response, or `AddError(...)` + `ThrowIfAnyErrors(422)` to accumulate several.
- **Group shared config with `Group`.** When endpoints share a route prefix, roles, or error shape, put them in a `Group` and call `Group<T>()` in `Configure()` instead of repeating the settings. `SubGroup` layers on top of a parent.
- **Authorization is per endpoint, deny by default.** Call `RequireAuthorization()` / roles or `AllowAnonymous()` explicitly on every endpoint. A new endpoint with no decision must not be reachable.
- **Keep the endpoint thin.** An endpoint validates, calls one application use case, and maps the result to a response. Business logic belongs in the application layer, not inline in `HandleAsync`.
- **Thread the cancellation token.** `HandleAsync(req, ct)` passes `ct` into every awaited call that accepts one, so a cancelled request stops its work.
