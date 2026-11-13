---
name: dotnet-build
description: Use when editing .NET build files, project configuration, or build diagnostics, to enable strict warnings, pin the SDK, and get observable telemetry out of the build.
globs:
  - "**/*.csproj"
  - "**/*.props"
  - "**/*.targets"
  - "**/global.json"
tags: [dotnet, msbuild, diagnostics, observability]
---

# MSBuild and Build Diagnostics

- **Nullable enabled in every project.** `<Nullable>enable</Nullable>` in every `csproj`. Absence belongs in the type system, not in a comment.
- **Warnings as errors in CI.** Set `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` in CI builds so the zero-warning policy is enforced automatically, not remembered.
- **Pin the SDK with `global.json`.** When several SDKs are installed, `global.json` locks the build to one version so results are reproducible across machines.
- **Commit `.csproj`, never `bin/` or `obj/`.** Project files are source; build output is not. Keep `bin` and `obj` out of version control and gitignored.
- **`dotnet build -bl` for binlogs.** Generate a binary log and read it with MSBuild Structured Log Viewer to diagnose build failures, dependency graphs, and slow targets instead of guessing from console output.
- **Diagnose production without taking dumps.** Reach for `dotnet-counters` and `dotnet-trace` first to watch allocations and GC events with low overhead. A dump is a last resort, and never taken blindly in production.
- **Distributed telemetry lives in `opentelemetry`.** Traces, metrics, and correlated logs across services are covered by `opentelemetry`; this rule covers the build and diagnostics, not the runtime signals.
