---
name: aspire
description: Use when modeling, running, or observing a distributed application with Aspire, to define the system in an AppHost, wire service discovery, and get telemetry by default.
trigger: model_decision
tags: [dotnet, aspire, orchestration, observability, nodejs]
---

# Aspire

Aspire (formerly .NET Aspire) is a code-first orchestration and observability
layer for distributed applications. As of **Aspire 13** it is multi-language:
you author the AppHost in C# or TypeScript and orchestrate .NET, Node.js,
Python, Go, and more.

- **The AppHost is the single source of truth.** Model every resource — projects, containers, databases, caches, frontends — in one `AppHost.cs` (or `apphost.mts`) with `DistributedApplication.CreateBuilder`. A new teammate should read one file to understand the system, not five terminals.
- **Express relationships, never hand-wire them.** `WithReference(db)` injects the connection string/endpoint as an environment variable (service discovery); `WaitFor(db)` enforces startup order. Never hardcode `localhost:5432` or a service URL — the reference is what makes dev and production behave identically.
- **`AddServiceDefaults()` for telemetry, health, and resilience.** The ServiceDefaults project wires OpenTelemetry, health checks, service discovery, and Polly resilience in one call. Do not hand-roll the same wiring per service.
- **One command, one dashboard.** Run `aspire run` and inspect logs, traces, metrics, and resources in the Aspire Dashboard. A distributed app whose logs live in five terminals is unobservable.
- **Node.js is a first-class citizen.** Orchestrate JavaScript/TypeScript through the `Aspire.Hosting.JavaScript` NuGet package: `AddJavaScriptApp` (npm scripts), `AddNodeApp` (run a file), `AddViteApp` (Vite), and `AddNextJsApp` (Next.js). npm/yarn/pnpm/bun are auto-detected, and the Node version is read from `.nvmrc` or `package.json` `engines.node`.
- **Deploy the same model.** Publish the same AppHost to containers, Kubernetes, or a cloud target; Aspire generates production Dockerfiles (multi-stage, non-root) and keeps the local topology aligned with production. Do not keep a separate deploy script that drifts from dev.
- **Scaffold and share with agents.** `aspire new` starts a template; `aspire agent init` exposes the app model to AI coding agents so they see resources, logs, and traces instead of guessing at runtime state.

## Use with care

- **Aspire is orchestration, not your framework or your cloud.** It does not replace ASP.NET Core or Node, and it is not a production runtime. It composes and observes what you already build.
- **Next.js support is experimental.** `AddNextJsApp` is marked experimental and requires `output: "standalone"` in the Next config; suppress `ASPIREJAVASCRIPT001` if you adopt it.
