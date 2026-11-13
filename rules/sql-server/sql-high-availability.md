---
name: sql-high-availability
description: Use when designing SQL Server high availability and disaster recovery, to choose the right technology for the RTO and read-scale needs.
trigger: model_decision
tags: [sql-server, high-availability, always-on]
---

# SQL Server: High Availability and Disaster Recovery

- **Always On Availability Groups for HA + DR + read scale.** An AG replicates a database across replicas with automatic or manual failover and optional readable secondaries. It is the default answer for high availability.
- **Match the technology to the RTO.** Availability Groups give fast failover; log shipping gives a delayed, manual DR copy; replication distributes data but is not a recovery plan. Pick by how much downtime you can tolerate.
- **Sync vs async commit is a data-loss vs latency trade-off.** Synchronous commit guarantees no data loss on failover but adds latency; asynchronous tolerates loss for distance. Decide and document which you are accepting.
- **Monitor quorum and failover health.** An AG with a lost witness or a broken quorum may not fail over when you need it. Alert on replica health and quorum state before the outage.
- **Replication is data distribution, not DR.** Merge/transactional replication moves data to subscribers for reporting or scale-out; it does not give you a point-in-time recoverable copy. Do not mistake it for a backup.
- **Test failover regularly.** A failover you have never run will not run cleanly under pressure. Drill it, measure it, and document the procedure.
