---
name: go
description: Use when editing Go source files, to keep error handling explicit and every goroutine owned.
globs:
  - "**/*.go"
tags: [language, go]
---

# Go Rules

- **No `interface{}` / `any` unless necessary.** Reach for a type parameter or a concrete type. When you must accept anything, narrow it back at the boundary in one place.
- **Never ignore an error.** Assigning `_` is a decision: handle it, wrap it, or comment why dropping it is safe.
- **Wrap errors with context.** `fmt.Errorf("loading user %s: %w", id, err)` keeps the chain intact for `errors.Is` and `errors.As`.
- **No `panic` outside `main`.** A library that panics kills its caller's process. Return an error.
- **No `init()` with side effects.** Initialization order is invisible to the reader; wire dependencies explicitly in `main`.
- **Small interfaces, declared where they are consumed.** Only the methods that caller needs — not the whole object.
- **`context.Context` first, and honour cancellation.** Every blocking call takes one and checks it.
- **Every goroutine has an owner.** Each `go func` needs a documented exit condition — context cancellation, channel close, or `WaitGroup`.
- **Bound your concurrency.** No unbuffered fan-out that spawns a goroutine per item, and no channel buffer sized by traffic. Use a worker pool or a semaphore.
- **Cleanup with `defer`.** Never `runtime.SetFinalizer`.
