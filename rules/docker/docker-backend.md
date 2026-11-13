---
name: docker-backend
description: Use when containerizing a backend service, to keep it stateless, configured by environment, and gracefully shutting down.
trigger: model_decision
tags: [docker, backend, twelve-factor]
---

# Docker: Backend Services

- **Stateless by design.** Persist nothing to the container's local filesystem — write state to a database, cache, or mounted volume. A container that must be killed and replaced must not lose data.
- **Configure via environment variables.** Read configuration from env vars (injected by Compose/orchestrator), not baked into the image. The same image runs in every environment.
- **Log to stdout/stderr.** Structured logs to stdout so the orchestrator collects them. A log file inside the container is invisible and lost on restart.
- **Graceful shutdown on `SIGTERM`.** Trap the signal, stop accepting work, drain in-flight requests, then exit. A service that ignores it gets force-killed mid-request.
- **Expose a health check.** A `/healthz` (or `/live`/`/ready`) endpoint reports liveness and readiness; the orchestrator uses it to route and restart.
- **Retry connections to dependencies.** A database may start after the app. Retry with backoff at startup instead of relying on `depends_on` alone.
- **One process per container.** Run the app as PID 1 (or a thin init) — do not cram a supervisor, cron, and the app into one container. Split concerns across services.
- **`restart: unless-stopped` (or a managed restart policy).** A backend should come back after a crash, but not loop forever in a restart storm — the orchestrator's policy handles that.
