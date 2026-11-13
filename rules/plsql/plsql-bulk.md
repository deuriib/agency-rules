---
name: plsql-bulk
description: Use when writing PL/SQL that loops over rows, to bulk-bind with FORALL and BULK COLLECT instead of row-by-row SQL.
globs:
  - "**/*.sql"
  - "**/*.pls"
  - "**/*.pkb"
  - "**/*.pks"
tags: [oracle, plsql, performance]
---

# PL/SQL: Bulk Processing

- **`FORALL` + `BULK COLLECT` over row-by-row.** Issue DML against a collection in one bulk bind instead of a SQL statement per row. Row-by-row turns a set engine into an interpreter and multiplies context switches.
- **Bound memory with `LIMIT`.** A `BULK COLLECT ... LIMIT n` fetches in batches so a large result does not blow out the session's memory. Fetch in a loop, process, then fetch the next batch.
- **Capture per-row errors with `SAVE EXCEPTIONS`.** `FORALL ... SAVE EXCEPTIONS` lets the bulk operation continue and reports failures in `SQL%BULK_EXCEPTIONS` instead of aborting the whole batch on the first bad row.
- **Prefer the implicit cursor `FOR` loop.** Let the engine manage open/fetch/close for simple loops. Only an explicit cursor (with `LIMIT` bulk fetch) is justified when you need the batch control.
- **Minimize SQL↔PL/SQL context switches.** Each switch between the two engines is a cost. Bulk operations, set-based SQL, and pipelined functions reduce the round-trips.
- **Size the collection before the bulk bind.** A `FORALL` over a collection with the right shape avoids the engine re-copying it; keep the index/collection aligned.
