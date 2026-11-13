---
name: opentelemetry
description: Use when adding or changing telemetry in a .NET app, to emit traces, metrics, and correlated logs through OpenTelemetry to one observability backend.
trigger: model_decision
tags: [dotnet, opentelemetry, observability, tracing, metrics]
---

# OpenTelemetry in .NET

- **Instrument with `ActivitySource` and `Meter`, not the SDK types.** Business code uses `System.Diagnostics.ActivitySource` (`StartActivity`) and `System.Diagnostics.Metrics.Meter` (`CreateCounter` / `CreateHistogram`). The OpenTelemetry SDK lives only in the composition root, never in your domain.
- **Wire signals with `AddOpenTelemetry()`.** Configure `.WithTracing(...)`, `.WithMetrics(...)`, and `.WithLogging(...)`, each with `AddOtlpExporter()`. Prefer the OTLP exporter to a collector or backend — not a vendor-specific SDK.
- **Add auto-instrumentation first.** `AddAspNetCoreInstrumentation()`, `AddHttpClientInstrumentation()`, `AddEntityFrameworkCoreInstrumentation()`, and `AddRuntimeInstrumentation()` emit spans and metrics for free. Write manual spans only where the libraries cannot see.
- **Name and version the service.** `ConfigureResource(r => r.AddService(serviceName, serviceVersion))` sets `service.name` / `service.version` so telemetry is attributable to a deployable. Unattributed spans are unqueryable.
- **Correlate logs with traces.** Let `.WithLogging()` attach `traceId` / `spanId` to log records so a log line links to its span. A log without a trace is an island.
- **Register your custom sources and meters.** `.AddSource("MyApp")` / `.AddMeter("MyApp")` so the provider listens to your manual `ActivitySource` / `Meter`. An activity nobody listens to is dropped.
- **Sample deliberately.** Configure a sampler (head-based, or tail-based via the collector) on high-volume paths. Trace everything and you pay for it; trace nothing and you cannot debug.
- **Keep attributes low-cardinality and PII-free.** Put request IDs and resource names in attributes — never emails, tokens, or unbounded values. High cardinality and PII poison the backend and the bill.
