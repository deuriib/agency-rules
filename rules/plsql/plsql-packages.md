---
name: plsql-packages
description: Use when organizing PL/SQL code into packages, to separate spec from body and choose invoker rights deliberately.
globs:
  - "**/*.sql"
  - "**/*.pls"
  - "**/*.pkb"
  - "**/*.pks"
tags: [oracle, plsql, packages]
---

# PL/SQL: Packages and Organization

- **Spec is the contract, body is the implementation.** The package spec declares the public surface callers depend on; the body implements it and can change without breaking callers. Keep the spec minimal and stable.
- **Choose invoker vs definer rights deliberately.** `AUTHID CURRENT_USER` runs with the caller's privileges (right for reusable, shared code); `AUTHID DEFINER` runs with the owner's privileges (right for a controlled, privileged path). Never default this by accident.
- **Expose only what callers need.** A spec with every helper public is an API you must now maintain and version. Keep helpers private in the body; the spec is the curated surface.
- **Group by cohesive domain, not by table CRUD.** A package should model a business capability (orders, payments), not a collection of table operations. Domain cohesion keeps the dependency graph small.
- **Initialize state once, deliberately.** The package body's initialization block runs once per session and sets package-level state. Use it for one-time setup; do not hide side effects there that the caller does not expect.
- **A package-level variable is session state, not a cache.** It persists for the session and is invisible across sessions. Do not use package globals where a table or a function argument is the honest choice.
