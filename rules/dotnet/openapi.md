---
name: openapi
description: Use when adding or reviewing OpenAPI documentation to a .NET API, to generate the contract, document operations, and serve it with Scalar in development.
trigger: model_decision
tags: [dotnet, openapi, scalar, swagger, api-docs]
---

# OpenAPI and Scalar

- **The OpenAPI document is the contract.** Generate it from the code with the built-in `AddOpenApi()` / `MapOpenApi()` (.NET 9+), Swashbuckle, or NSwag, and treat it as a published artifact. A hand-written document that drifts from the code is worse than none.
- **Serve it with Scalar, not Swagger UI.** `app.MapScalarApiReference()` (package `Scalar.AspNetCore`) gives a modern, interactive reference. Swagger UI is the legacy default; prefer Scalar for new projects.
- **Gate the UI to development.** Wrap `MapOpenApi()` and `MapScalarApiReference()` in `if (app.Environment.IsDevelopment())`. Exposing interactive docs in production leaks your surface and invites probing.
- **Document every operation.** Add summaries, descriptions, and parameter docs via XML comments (`<summary>` with `GenerateDocumentationFile`) or `[OpenApiOperation]`, and declare responses with `ProducesResponseType<T>()`. An endpoint without a description is a contract nobody can read.
- **Show real examples.** Provide request/response examples so the consumer sees the shape, not just the schema. A schema without an example is half-documented.
- **Version the document with the API.** Each API version gets its own document (see `api-versioning`). Do not point the docs at a version that no longer exists.
- **The document must build in CI.** Generating the OpenAPI document is part of the build; a change that breaks it is a failing change, not a follow-up.
