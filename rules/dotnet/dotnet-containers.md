---
name: dotnet-containers
description: Use when containerizing a .NET app or writing its Dockerfile, to use the .NET-specific runtime images and enable AOT where it fits.
trigger: model_decision
tags: [dotnet, docker, containers, deployment]
---

# .NET Containers

General Dockerfile hygiene — multi-stage builds, non-root users, pinning by
digest, `HEALTHCHECK`, and `.dockerignore` — lives in `docker-images`. This rule
covers the .NET specifics on top of it.

- **Use the .NET runtime images.** Base on `mcr.microsoft.com/dotnet/aspnet` (or `runtime`) — the maintained images matching your target framework — and prefer the chiseled/distroless variants, which drop the shell and package manager and run non-root by default.
- **`dotnet publish` in the build stage, copy the `publish/` output.** Build with `dotnet publish -c Release --no-restore` in the SDK stage and copy only the `publish/` directory into the runtime stage. Never ship the SDK or the project source.
- **Match the base image to the `TargetFramework`.** The image tag must match the framework you compile against (`8.0`, `9.0`, `10.0`); a mismatch fails at runtime, not build time.
- **Enable AOT or trimming where it fits.** For CLI tools and small services, `PublishAot` (or aggressive trimming) yields a faster start and a tiny footprint — but verify the app is trim/AOT-safe before shipping it.
- **Wire an ASP.NET health endpoint.** Map `AddHealthChecks()` to `/health` (or `/healthz`) and point the image's `HEALTHCHECK` at it, so the orchestrator probes the app itself.
