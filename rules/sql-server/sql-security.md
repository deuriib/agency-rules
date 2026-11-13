---
name: sql-security
description: Use when securing a SQL Server instance or database, to grant least privilege, encrypt data, and protect rows by policy.
trigger: model_decision
tags: [sql-server, security, least-privilege]
---

# SQL Server: Security

The cross-cutting identity and data principles live in `identity-and-data`.
This rule covers the SQL Server specifics.

- **Least privilege, always.** Grant the minimum permissions an account needs. Application accounts get per-object `SELECT`/`EXECUTE` grants, never `sysadmin` or `db_owner`. A service that runs as `sa` turns any SQL bug into a full takeover.
- **Prefer roles over per-login grants.** Put permissions on database roles and assign principals to roles. A matrix of per-user grants is impossible to review and easy to leak.
- **Isolate tenants with Row-Level Security.** Use RLS (a security predicate) so a tenant's query can only see its own rows, even if the query itself is wrong. Application-level filtering is not a boundary.
- **Protect sensitive columns with Always Encrypted.** Keep the keys outside the database so the DB (and its operator) never sees plaintext. Pair it with a column-level policy of what is "sensitive".
- **Encrypt at rest (TDE) and in transit (TLS).** TDE protects the files at rest; TLS protects the connection. Both are defaults, not optional, for any data worth guarding.
- **Audit who changed what.** Enable SQL Audit (or temporal tables) for sensitive tables so a change is traceable to a principal. A data change with no actor is a liability (see `domain-auditing`).
