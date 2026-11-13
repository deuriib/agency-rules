---
name: sql-indexing
description: Use when designing or reviewing SQL Server indexes, to match indexes to the query pattern and keep them covering and narrow.
trigger: model_decision
tags: [sql-server, indexing, performance]
---

# SQL Server: Indexing

- **Index for the actual workload, not the table in isolation.** Indexes exist to serve the queries that hit the table. Design from the real `WHERE`/`JOIN`/`ORDER BY` predicates, not from a guess about "common" columns.
- **Pick the clustered index carefully.** The clustered index is the physical row order, so choose a narrow, unique, ever-increasing key (an identity or a monotonic natural key). A wide or random clustered key fragments the table and bloats every nonclustered index.
- **Cover the query with `INCLUDE`.** Add columns in `INCLUDE` that the query selects but does not filter on, so the engine can satisfy the query from the index and skip the key/rid lookup. Keep the key narrow and the includes targeted.
- **Order the key for the predicate.** The leading key column should serve equality, then range, then the sort. A leading column the query does not filter on is a wasted index.
- **Do not over-index.** Every index costs on insert/update and in maintenance. Add an index for a measurable query, not for every column combination.
- **Review periodically.** Use the DMVs (`sys.dm_db_index_usage_stats`, missing index and unused/duplicate index reports) to find indexes that are never used and predicates that need one. An index nobody reads is a tax you pay on every write.
