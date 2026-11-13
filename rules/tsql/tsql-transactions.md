---
name: tsql-transactions
description: Use when writing T-SQL transactions and error handling, to keep the transaction atomic and the error handling explicit.
globs:
  - "**/*.sql"
tags: [sql, tsql, transactions]
---

# T-SQL: Transactions and Error Handling

- **`SET XACT_ABORT ON`.** Turn it on at the top of the batch so a runtime error rolls back the transaction and stops execution automatically. Without it, SQL Server continues after many errors, leaving a half-committed state.
- **`TRY/CATCH` plus `XACT_STATE()` to decide commit vs rollback.** In the `CATCH`, read `XACT_STATE()`: `1` → the transaction is committable; `0` → no transaction; `-1` → it is doomed, so roll back. Never commit a doomed transaction.
- **Keep transactions short.** Open the transaction, do the work, commit — no user interaction, no long-running work, no network calls inside. A transaction held open blocks others and bloats the log.
- **Match `BEGIN TRAN` / `COMMIT` / `ROLLBACK` explicitly.** Relying on implicit transaction behavior makes the boundary invisible to the next reader. Name the transaction (`BEGIN TRAN Transfer`) so nested logic is readable.
- **Use `SAVE TRAN` for partial rollback, deliberately.** When only part of the work must be undone, mark a savepoint and roll back to it. A savepoint is a deliberate, documented decision — not a substitute for a clean transaction boundary.
- **Roll back the whole unit on error.** Treat a logical unit as atomic. If a step fails, roll back the entire unit, or use a savepoint to preserve the earlier, already-validated work — never leave a mix by accident.
