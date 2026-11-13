---
name: dapper
description: Use when writing or reviewing Dapper data access in .NET, to map results efficiently, parameterize every value, and manage the connection and transaction explicitly.
trigger: model_decision
tags: [dotnet, dapper, data-access, micro-orm]
---

# Dapper

- **Dapper for the read side and hand-tuned SQL.** Use Dapper for complex projections, reports, and queries where the SQL should be in front of you — not as a replacement for EF Core's change tracking on the command side (see `ef-core`).
- **Open and close the connection explicitly.** `await using var conn = new SqlConnection(...); await conn.OpenAsync();` and let `using` dispose it. Do not rely on the connection being opened for you; explicit ownership makes the lifetime obvious.
- **Parameterize every value.** Pass an anonymous object or `DynamicParameters` — never concatenate input into the SQL string. Dapper turns the object's properties into parameters; a string is code, a parameter is data.
- **Use typed queries, not `dynamic`.** `Query<Order>(...)`, `QueryFirstOrDefault<T>`, and `QuerySingle<T>` over a `dynamic` result. The type gives you a compile-time contract; `dynamic` defers the error to runtime.
- **Multi-mapping with `splitOn`, not one query per row.** `Query<T1, T2, TReturn>(sql, map, param, splitOn: "Id")` loads a parent and child in one round-trip instead of an N+1 loop that queries per parent.
- **Read multiple result sets with `QueryMultiple`.** Return several grids in one command and read them with `grid.Read<T>()`; do not issue a separate command per result set.
- **No generic repository around Dapper.** Call Dapper directly where the SQL is specific. A `IDapperRepository<T>` hides the SQL and adds ceremony without value.
- **Async and cancellation end to end.** `QueryAsync` / `ExecuteAsync` with a `CancellationToken` (via a `CommandDefinition`). A synchronous call on a request path blocks the thread.
- **Reuse the open connection for the transaction.** Pass the same `DbConnection` and `DbTransaction` to every command so they share one transaction; do not open a new connection per statement.
