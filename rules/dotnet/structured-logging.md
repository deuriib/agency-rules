---
name: structured-logging
description: Use when adding or changing logging in a .NET application, to log structured properties, correlate requests, and route to multiple sinks.
trigger: model_decision
tags: [dotnet, serilog, logging, observability]
---

# Structured Logging

- **Message templates with named properties.** Log `logger.LogInformation("Order {OrderId} created", orderId)` — never string interpolation. Named properties are queryable; interpolated text bakes values into an opaque string.
- **Correlate with a `CorrelationId`.** Add middleware to read or create an `X-Correlation-ID` and push it via `LogContext.PushProperty(...)`, and forward it on outbound HTTP calls. One ID ties a distributed flow together.
- **Enrich and route to multiple sinks.** Configure Serilog with several destinations (console, file, Seq, OpenTelemetry) and enrich with `Enrich.FromLogContext()` and machine name so every entry carries its context.
- **Log events, not payloads.** Record what happened and its identifiers, never sensitive data, tokens, or full request bodies. A structured property must not become a data-leak vector.
- **One logging API, consistent levels.** Pick levels deliberately — `Debug` for noisy detail, `Information` for business events, `Warning` for recoverable anomalies, `Error` for failures that need attention. Do not log `Error` for an expected rejection.
