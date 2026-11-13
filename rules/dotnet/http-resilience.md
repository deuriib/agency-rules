---
name: http-resilience
description: Use when adding or configuring an outbound HTTP client, to apply the standard resilience handler and keep retries safe for non-idempotent methods.
trigger: model_decision
tags: [dotnet, http, resilience, polly]
---

# HTTP Resilience

- **Use the standard resilience handler.** For Refit or `HttpClient`, `AddStandardResilienceHandler()` gives you rate limiting, a total timeout, retry with exponential backoff, a circuit breaker, and an attempt timeout in one consistent policy. Do not hand-roll the same stack per client.
- **Only retry idempotent methods.** The standard handler retries `GET`, `HEAD`, and `OPTIONS` by default. Before enabling retries on `POST` or `PUT`, prove the method is idempotent — a retried non-idempotent call double-applies the effect.
- **Idempotency keys for mutating calls.** For `POST`/`PUT` you retry, send an idempotency key so the server can deduplicate; the client alone cannot make a non-idempotent operation safe.
- **Fail fast through the circuit breaker.** When the downstream is failing, the breaker opens and fails immediately instead of stacking timeouts. Let it; do not bypass it with a longer timeout.
- **Bound every call with a timeout.** A call without a timeout can hang a thread for the whole request budget. Use the attempt and total timeouts from the handler, and choose them from your SLO, not a default.
