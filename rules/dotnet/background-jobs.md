---
name: background-jobs
description: Use when adding or changing background work in .NET, to host it safely, avoid overlap, retry transient failures, and shut down cleanly.
trigger: model_decision
tags: [dotnet, hosted-service, background-jobs, reliability]
---

# Background Jobs

- **`BackgroundService` / `IHostedService` for long-running work.** Run recurring or queue-driven work in a hosted service, not on the request thread. A request that spawns background work and returns leaks it to a pool that may not outlive the request.
- **One job per concern.** A hosted service does one thing; several unrelated loops in one `ExecuteAsync` hide failures and block each other. Split them.
- **Prevent overlap.** Guard the loop with a `SemaphoreSlim` (or an equivalent lock) so a slow iteration cannot re-enter while the previous one is still running. Re-entry is the most common source of duplicate side effects.
- **Retry transient failures, but idempotently.** Retry with backoff and a bounded count; a job that fails forever must park the item, not hot-loop. Keep the work idempotent so a retry cannot double-apply.
- **Honor the `CancellationToken`.** Propagate it into every awaited call and stop promptly on `StopAsync`. A job that ignores cancellation keeps the host from shutting down cleanly.
- **Reach for a scheduler for cron or persistence.** Use Quartz or Hangfire when you need cron expressions, durable schedules, or distributed locking. Do not hand-roll a cron loop.
- **Make it observable.** Log the outcome of each iteration and expose a health check; a job that fails silently is invisible until the queue backs up.
