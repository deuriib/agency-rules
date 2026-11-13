---
name: tsql-style
description: Use when writing T-SQL, to keep queries SARGable, handle NULL explicitly, and follow a consistent naming and layout.
globs:
  - "**/*.sql"
tags: [sql, tsql, style]
---

# T-SQL: Style and SARGability

- **Keep predicates SARGable.** Do not wrap an indexed column in a function (`WHERE YEAR(CreatedAt) = 2025`, `WHERE LOWER(Email) = ...`); the engine cannot seek on the result. Rewrite as a range (`CreatedAt >= '2025-01-01' AND CreatedAt < '2026-01-01'`) so the index is used.
- **Handle `NULL` explicitly.** T-SQL uses three-valued logic: `NULL` is neither equal nor unequal. Write `IS NULL` / `IS NOT NULL` and remember that `NOT IN (...)` and `<>` drop rows when `NULL` is involved — `NOT EXISTS` is the safe equivalent.
- **Explicit column lists on `INSERT`.** `INSERT INTO t (a, b) VALUES (...)` — never `INSERT INTO t VALUES (...)` or `SELECT *`. An implicit column list breaks the moment the schema changes.
- **One consistent naming and layout.** Choose schemas (`dbo.`, `sales.`), a casing convention, and keyword style, and apply it across the batch. Aliases on every multi-table query.
- **Terminate statements with `;`.** It is not always optional, and it is never wrong. Terminate every statement so future statements that require it do not break.
- **Make the intent visible.** Format joins clearly, alias tables, and name things for what they mean. A query the next person cannot read is a bug in waiting.
