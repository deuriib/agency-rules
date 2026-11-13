---
name: ado-net
description: Use when writing or reviewing ADO.NET data access in .NET, to parameterize commands, manage the connection and reader, and keep transactions explicit.
trigger: model_decision
tags: [dotnet, ado-net, data-access, sqlclient]
---

# ADO.NET

- **Prefer `Microsoft.Data.SqlClient`.** It is the current, maintained provider; `System.Data.SqlClient` is legacy. For other databases, work through `System.Data.Common`'s `DbConnection`/`DbCommand` so the code stays provider-agnostic.
- **Dispose the connection and command.** `await using var conn = new SqlConnection(...)` and `await using var cmd = conn.CreateCommand()` — `using` guarantees disposal and returns the connection to the pool. A leaked connection exhausts the pool under load.
- **Parameterize with `SqlParameter`, never concatenate.** `cmd.Parameters.Add(new SqlParameter("@id", id))` — never build SQL by interpolating input, which is injection. Prefer an explicit `SqlParameter` with a `SqlDbType` over `AddWithValue`, which infers the type and can guess wrong.
- **Read with `SqlDataReader` and typed getters.** `await reader.ReadAsync(ct)` in a loop, then `GetString(...)`, `GetInt32(...)` with `IsDBNull` checks instead of `reader["col"]` (which boxes and hides the type).
- **Async and cancellation throughout.** `OpenAsync`, `ExecuteReaderAsync`, `ExecuteNonQueryAsync`, and `ReadAsync` all take a `CancellationToken`. A synchronous ADO.NET call on a request path blocks a thread-pool thread.
- **Explicit transactions with `DbTransaction`.** `await using var tx = await conn.BeginTransactionAsync(ct)` and set `cmd.Transaction = tx` on every command. Commit once; roll back on failure. A command that misses the transaction silently runs outside it.
- **Set a `CommandTimeout`.** A command with no timeout runs the provider default and can hang a request. Set a timeout from your SLO and treat a timeout as a distinct, retryable-or-scalable failure.
- **Let the pool manage connections.** Open, use, dispose — never hold a connection open across user interaction or cache one. Pooling makes short-lived connections cheap; long-held connections are the bottleneck.
- **Connection string from configuration, never in code.** Load it from `IOptions<T>` / a secret store (see `aspnet-core`); never hard-code credentials in the connection string.
