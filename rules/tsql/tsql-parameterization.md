---
name: tsql-parameterization
description: Use when writing dynamic T-SQL or building queries from input, to parameterize values and quote identifiers safely.
globs:
  - "**/*.sql"
tags: [sql, tsql, security, injection]
---

# T-SQL: Parameterization and Dynamic SQL

- **Parameterize every value.** Never concatenate input into SQL — that is how SQL injection happens. Pass values as parameters (`@id`, `@name`); the value is data, not code.
- **Dynamic SQL via `sp_executesql` with parameters.** When the query shape must be dynamic, use `sp_executesql @sql, N'@id INT', @id` so the parameters stay parameters. Avoid `EXEC(@sql)` with an interpolated string — it has no parameter boundary.
- **Quote identifiers with `QUOTENAME`.** If a table or column name must come from input or metadata, wrap it in `QUOTENAME(...)` — and still allow-list it. Never interpolate a raw identifier into the statement.
- **Allow-list object names.** User-supplied table/column names are not parameters, so the only defense is a checked allow-list of the names you actually permit. `QUOTENAME` is not a substitute for the allow-list.
- **This is a trust boundary.** Dynamic SQL built from input is attacker-controlled code. Screen it against the injection rule in `trust-boundaries` before it ships.
