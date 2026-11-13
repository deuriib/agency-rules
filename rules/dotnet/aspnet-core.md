---
name: aspnet-core
description: Use when configuring, hosting, or wiring a .NET application, to keep secrets out of code, configuration typed, and cancellation propagated.
trigger: model_decision
tags: [dotnet, aspnet-core, configuration, hosting]
---

# ASP.NET Core Configuration and Hosting

- **Secrets stay out of source control.** Use `dotnet user-secrets` in development and a secret store (Azure Key Vault, AWS Secrets Manager, or equivalent) in production. Never hard-code a secret in `appsettings.json` or a source file — a committed secret is compromised, not "temporary".
- **Typed configuration via `IOptions<T>`.** Bind settings to a strongly-typed class with `IOptions<T>` / `IOptionsSnapshot<T>` and validate it on startup. Do not inject `IConfiguration` and read keys by string across the codebase — a typo then fails at runtime instead of at startup.
- **Propagate `CancellationToken` end to end.** Every async controller, endpoint, and handler takes a `CancellationToken` and passes it to every awaited call that accepts one. An ignored token means a request keeps burning resources after the client disconnects.
- **Fail fast on bad configuration.** Validate options at startup (`.ValidateOnStart()` or manual validation) so a missing setting stops the boot instead of appearing later as a runtime error.
- **One composition root.** Wire DI in one place, not scattered across static helpers and service locators. A service locator hides dependencies; constructor injection shows them.
