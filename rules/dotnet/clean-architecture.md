---
name: clean-architecture
description: Use when adding a project, assembly, or reference in a .NET solution, to keep layer dependencies pointing inward and the domain free of infrastructure.
trigger: model_decision
tags: [dotnet, architecture, layers]
---

# Clean Architecture

- **Domain is pure and dependency-free.** The domain layer references nothing — not Application, Infrastructure, or API, and no EF Core, ASP.NET, or IO packages. It holds entities, value objects, and domain logic only.
- **Application references only Domain.** Use cases, DTOs, and port interfaces live here. They depend on abstractions, never on concrete infrastructure or delivery mechanisms.
- **Infrastructure implements Application's interfaces.** It references Domain and Application and adapts external systems (databases, HTTP clients, queues, files) to the ports the application defines.
- **API is the composition root.** It references Application and Infrastructure, wires dependency injection, and translates HTTP to use cases. It contains no business logic.
- **Dependencies flow inward only.** Domain ← Application ← Infrastructure ← API. Any reference against this direction is a design error — break the cycle by introducing an interface in the inner layer, never by loosening the dependency rule.
- **Enforce the boundary with a test.** Add an architecture fitness test that fails when a forbidden reference appears, so the rule survives refactors instead of living only in a diagram.
