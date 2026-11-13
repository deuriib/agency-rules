---
name: tsql-set-based
description: Use when writing T-SQL, to prefer set-based operations over row-by-row cursors and loops.
globs:
  - "**/*.sql"
tags: [sql, tsql, performance]
---

# T-SQL: Set-Based over Row-by-Row

- **Set-based over RBAR.** SQL is a set language; write `UPDATE`/`INSERT ... SELECT`/`MERGE` against the whole set instead of a cursor or `WHILE` loop that processes one row at a time. Row-by-row turns a relational engine into an interpreter and is orders of magnitude slower.
- **A cursor is a last resort, documented.** When a cursor is genuinely required (e.g. calling a procedure per row), say why in a comment. An unexplained cursor is a red flag in review.
- **Join and filter in one statement.** Use `UPDATE ... FROM ... JOIN` and `DELETE ... WHERE EXISTS` instead of fetching IDs into a loop and issuing a statement per row.
- **Batch large writes in chunks.** For a bulk delete or update on a huge table, process in bounded chunks (e.g. `TOP (N)` per loop with a checkpoint) rather than one transaction that locks the table and bloats the log.
- **Verify with the actual plan, not intuition.** Confirm the set-based rewrite scans/seeks as expected and measure logical reads and duration. A set-based query with a bad plan is not automatically fast.
