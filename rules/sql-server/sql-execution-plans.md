---
name: sql-execution-plans
description: Use when troubleshooting or tuning a slow SQL Server query, to read the actual plan and use Query Store instead of guessing.
trigger: model_decision
tags: [sql-server, execution-plan, query-store]
---

# SQL Server: Execution Plans and Query Store

- **Read the actual plan, not the estimated one.** Enable the actual plan (`SET STATISTICS IO, TIME ON`, or SSMS "Include Actual Execution Plan") so you see what the optimizer really did, not what it predicted. Estimated and actual diverge when statistics are stale.
- **Look for the expensive and the wrong operators.** Scans where a seek is expected, key/rid lookups in a loop, sort/table spools, and warnings on operators all point at the problem. The operator with the highest cost is where to look first.
- **Treat cost percentage as a hint, not a verdict.** Cost is a relative model. Measure logical reads, duration, and rows — the things you can improve — not the cost number alone.
- **Use Query Store to find regressions.** Query Store keeps a history of plans per query. When a query suddenly slows, compare plans and force the last good one rather than blindly adding hints.
- **Understand parameter sniffing before reaching for `OPTION (RECOMPILE)`.** A plan compiled for one parameter value can be wrong for another. Fix it with statistics, a plan guide, or Query Store — `RECOMPILE` on every execution is a tax, not a fix.
- **Keep statistics current.** Stale statistics produce bad cardinality estimates and bad plans. Maintain them with auto-update and, for skewed data, filtered statistics.
