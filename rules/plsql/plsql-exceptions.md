---
name: plsql-exceptions
description: Use when writing PL/SQL exception handling, to handle named exceptions and never silently swallow WHEN OTHERS.
globs:
  - "**/*.sql"
  - "**/*.pls"
  - "**/*.pkb"
  - "**/*.pks"
tags: [oracle, plsql, exceptions]
---

# PL/SQL: Exception Handling

- **`WHEN OTHERS` must log or re-raise — never swallow.** A bare `WHEN OTHERS THEN NULL;` hides the failure and returns a success. At minimum, log it (to a log table or `DBMS_APPLICATION_INFO`) or re-raise. A swallowed exception is a silent bug.
- **Handle named exceptions explicitly.** Catch `NO_DATA_FOUND`, `TOO_MANY_ROWS`, `DUP_VAL_ON_INDEX`, and the others you expect, so each has a specific, intended behavior. `WHEN OTHERS` is the fallback, not the plan.
- **Raise business errors with `RAISE_APPLICATION_ERROR`.** Use codes in the reserved range `-20000 .. -20999` for application errors so the caller can distinguish a business rejection from a system failure, and the message is meaningful.
- **Re-raise with `RAISE` to preserve the original.** Inside a handler, a bare `RAISE;` re-raises the same exception without losing its identity or stack. `RAISE_APPLICATION_ERROR` replaces it — use it only when you intend to.
- **Do not use exceptions for control flow.** Checking existence with `SELECT ... INTO` and catching `NO_DATA_FOUND` is slower and less clear than an explicit `SELECT COUNT(*)`/`EXISTS` test. Exceptions are for exceptional paths.
- **Let the caller decide the boundary.** A low-level routine reports its error; it is the caller (or the top of the call stack) that decides to commit, roll back, or translate. Do not swallow deep and force the caller to guess.
