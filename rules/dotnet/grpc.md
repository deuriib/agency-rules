---
name: grpc
description: Use when building or reviewing a gRPC service or client in .NET, to keep contracts stable, deadlines set, and streaming correct.
trigger: model_decision
tags: [dotnet, grpc, rpc]
---

# gRPC

- **The `.proto` is the contract.** Define messages and services in `.proto` and generate code; treat it as a published API. Version additively and never renumber or reuse a field or method — that is how clients break silently.
- **Set a deadline on every call.** A gRPC call without a deadline can hang indefinitely and pin threads. Configure `CallOptions.Deadline` (or a timeout) on the client, and have the server honor cancellation.
- **Pick the right call shape.** Unary for one request → one response; server-streaming for a stream out; client-streaming for a stream in; bidirectional for a live conversation. Do not stream a payload that fits in one message, and do not cram a stream into a unary call.
- **Propagate `CancellationToken`.** The client's token becomes the server's; when the caller cancels, the server stops work instead of finishing a response nobody reads.
- **Prefer gRPC over JSON for internal service-to-service.** Binary, schema-first, and strongly typed beats hand-built JSON clients for internal RPC. Keep JSON/HTTP for external, browser, or tooling-facing surfaces.
- **Use the status model, not exceptions.** Report errors with a proper status code plus a typed `details` payload; the client branches on status, not on an exception message that leaks internals.
- **Keep messages small; chunk large bodies.** A single huge message forces one big allocation and defeats streaming back-pressure. Stream large or unbounded payloads.
