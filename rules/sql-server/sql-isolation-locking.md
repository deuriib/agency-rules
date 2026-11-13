---
name: sql-isolation-locking
description: Use when designing concurrency in SQL Server, to pick the right isolation level and avoid deadlocks and blocking.
trigger: model_decision
tags: [sql-server, locking, isolation, concurrency]
---

# SQL Server: Isolation and Locking

- **Know your isolation levels.** The default `READ COMMITTED` takes shared locks per statement. `READ UNCOMMITTED`, `READ COMMITTED SNAPSHOT` (RCSI), `SNAPSHOT`, and `SERIALIZABLE` each trade consistency against concurrency. Choose deliberately, not by accident.
- **Enable RCSI or `SNAPSHOT` for read-heavy OLTP.** Snapshot isolation lets readers see a consistent version without blocking writers, removing most read/write blocking. Weigh the `tempdb` version-store cost before enabling it globally.
- **Use optimistic concurrency for updates.** Add a `rowversion` (or a version column) and verify it on update so two writers cannot silently overwrite each other. "Last write wins" without a check is data loss.
- **Acquire locks in a consistent order.** Deadlocks come from two transactions locking the same resources in a different order. A fixed order (and short transactions) makes them rare instead of routine.
- **Keep transactions short to reduce blocking.** The longer a transaction holds locks, the more it blocks. Do the I/O first, then the write, then commit.
- **`NOLOCK` is a footgun, not a fix.** It reads uncommitted data and can return missing or duplicated rows. Reach for snapshot isolation instead of a dirty read.
