---
name: ef-core
description: Use when writing or reviewing EF Core data access, to keep queries trackable, configurations separated, and migrations safe.
trigger: model_decision
tags: [dotnet, ef-core, data-access]
---

# EF Core

- **Focused, cohesive `DbContext`.** One `DbContext` per bounded context, injected and configured via constructor options. Do not cram every entity into a single context — it grows into a tangle of unrelated migrations.
- **Entity configuration in `IEntityTypeConfiguration<T>`.** Move each entity's mapping into its own configuration class and apply with `modelBuilder.ApplyConfigurationsFromAssembly(...)`. Leave `OnModelCreating` empty of per-entity clutter.
- **`AsNoTracking()` for read-only queries.** Add it to queries that never mutate, so change-tracking overhead disappears. Track only when you intend to save.
- **Eager-load with `Include` / `ThenInclude`.** Load related data you will use in one query instead of lazy-loading and triggering N+1 round-trips. Split the load into projection queries for complex graphs.
- **EF Core for writes and aggregates; reach for a lighter tool for heavy reads.** Use EF Core where change tracking and aggregates help (commands, invariants). For complex read projections and reports, use Dapper or ADO.NET (see `dapper` and `ado-net`) instead of fighting the change tracker.
- **Small, descriptive migrations.** One migration per logical change, named for what it does. Inspect the generated SQL (`dotnet ef migrations script`) before applying to production; never let a migration run unreviewed.
- **No `InMemoryDatabase` for integration tests.** It does not enforce real SQL constraints or transactions, so it passes tests that a real database would fail. Use Testcontainers or a real database in Docker instead.
- **Use LINQ over raw SQL.** When you must write raw SQL, use `FromSqlInterpolated` or `ExecuteSqlInterpolatedAsync` (parameterized) — never concatenate input into `FromSqlRaw`. A value is data, not code.
