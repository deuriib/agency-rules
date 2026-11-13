---
name: dotnet-performance
description: Use when writing or optimizing hot-path .NET code, to measure before optimizing and avoid the allocations that dominate managed performance.
trigger: model_decision
tags: [dotnet, performance, allocations, benchmarkdotnet]
---

# .NET Performance

- **Measure before you optimize.** BenchmarkDotNet proves a change is faster; a guess is not a measurement. Optimize the measured hot path, not the code you suspect is slow.
- **Allocations dominate managed performance.** In a hot loop, an allocation is a future GC pause. Pool buffers (`ArrayPool<T>`), slice with `Span<T>`/`ReadOnlySpan<T>`, and build strings with `StringBuilder` instead of `+`.
- **Avoid LINQ in the hottest loop.** LINQ allocates enumerators and closures. It is fine everywhere else; in the inner loop, a `for`/`foreach` over a span or array wins. Materialize a query once rather than re-running it per iteration.
- **Avoid boxing.** Prefer generics and structs over `object`, and pass values as `in`/`ref` where it avoids copies. Boxing on a hot path is a silent allocation.
- **Parse with `string.AsSpan()` and `string.Create`.** Slice instead of `Substring`, and build a string in place with `string.Create` when the length is known — neither allocates intermediate strings.
- **Prefer small structs, but mind the copies.** `readonly struct` and `record struct` avoid heap allocation, yet a large struct passed by value copies every field. Keep structs small or pass by `in`.
- **Use the right task/value type.** Prefer `ValueTask` when a call is often synchronous, and `ArrayPool` over `new byte[]` for transient buffers. These are micro-optimizations — apply them where the profile says to.
