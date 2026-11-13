---
name: caching
description: Use when adding or changing a cache in .NET, to pick the right cache, avoid stampedes, and keep invalidation explicit.
trigger: model_decision
tags: [dotnet, caching, performance]
---

# Caching

- **`HybridCache` for combined L1/L2.** In .NET 9+, `AddHybridCache()` unifies in-process and distributed caching with stampede protection and serialization built in. Prefer it over wiring `IMemoryCache` + `IDistributedCache` by hand.
- **`IMemoryCache` for one instance, `IDistributedCache` for many.** An in-process cache is per instance; a multi-instance deployment that caches shared state in memory serves stale or divergent data. Use distributed storage when the cache must be shared.
- **Guard against the cache stampede.** When a key expires, several requests racing to rebuild it can hammer the source. Rebuild through a single-flight / lock (`GetOrCreateAsync`) so one caller populates and the rest wait.
- **Invalidation is explicit; TTL is not correctness.** A short TTL shrinks the stale window, it does not guarantee freshness. Invalidate (or version) the key when the underlying data changes.
- **Cache expensive, idempotent reads — not fresh writes.** Cache the result of a costly, stable lookup; never cache a command, a just-written entity, or anything with a side effect.
- **Never cache secrets, PII, or per-user data in a shared cache.** A shared cache keyed only by ID can cross tenant or user boundaries. Include the tenant/user in the key or keep the value out of shared storage.
- **Use a sentinel for negative results.** Cache "not found" with a marker and its own TTL so an absent value does not trigger a rebuild on every miss.
