---
name: dependency-injection
description: Use when registering or resolving services in .NET, to pick the right lifetime, avoid captive dependencies, and dispose what the container owns.
trigger: model_decision
tags: [dotnet, dependency-injection, lifetimes]
---

# Dependency Injection

- **Match the lifetime to the dependency graph.** A `Singleton` must not depend on a `Scoped` or `Transient` service — the container captures it and reuses it past its scope (a *captive dependency*). Compose lifetimes inward: singleton → scoped → transient.
- **`Scoped` for per-request state, `Transient` for stateless.** A `DbContext` is scoped; a stateless service is transient; a thread-safe cache or client is a singleton. Pick by what the service owns, not by habit.
- **Dispose what the container created.** The container disposes what it instantiates at the end of its lifetime — but a transient registered with a scoped dependency is disposed with that scope. Let the container own disposal; do not `Dispose` injected services yourself.
- **Constructor injection first.** Dependencies are the constructor's parameters, visible and testable. Property injection and `IServiceProvider`-as-service-locator hide the graph and break at runtime, not compile time.
- **Register the interface, not the concrete.** Wire `AddScoped<IOrderService, OrderService>()` so tests can substitute a fake. A concrete-only registration is a seam you removed.
- **Validate the graph in development.** `ValidateOnBuild` / `ValidateScopes` catch misconfigured lifetimes and captive dependencies at startup instead of at first request.
- **Options are injected, not configuration.** Bind settings to `IOptions<T>` and inject that; reading `IConfiguration` by string key inside a service couples it to the raw config (see `aspnet-core`).
