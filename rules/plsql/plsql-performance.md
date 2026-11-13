---
name: plsql-performance
description: Use when tuning PL/SQL, to use bind variables, reduce context switching, and profile before optimizing.
globs:
  - "**/*.sql"
  - "**/*.pls"
  - "**/*.pkb"
  - "**/*.pks"
tags: [oracle, plsql, performance]
---

# PL/SQL: Performance

- **Bind variables everywhere.** Every SQL statement in PL/SQL should use bind variables (`:1`, `:name`), never a concatenated literal. Literals cause hard-parsing and cursor churn; binds let the engine reuse the plan.
- **Prefer static SQL over dynamic.** Static SQL is parsed once and is safer. Use `EXECUTE IMMEDIATE` / `DBMS_SQL` only when the statement shape must change at runtime, and still bind the values.
- **Minimize SQL↔PL/SQL context switches.** Each switch between the SQL engine and the PL/SQL engine is a cost. Bulk operations (`FORALL`/`BULK COLLECT`), set-based SQL, and pipelined table functions reduce the round-trips.
- **Profile before optimizing.** Run `DBMS_PROFILE` (or `DBMS_HPROF`) to find where time actually goes. A rewrite of the wrong routine is effort spent on the wrong problem.
- **Verify the plan with `DBMS_XPLAN` / `EXPLAIN PLAN`.** Confirm the SQL uses the expected access path. A bind-heavy query with stale statistics can still choose a bad plan.
- **Use `PRAGMA INLINE` and `NOCOPY` with care.** They help on measured hot paths (avoiding a subprogram call or an out-parameter copy), but they are micro-optimizations — apply them where the profile says to, not by default.
