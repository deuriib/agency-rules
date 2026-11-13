---
name: sql-backup-recovery
description: Use when designing or testing SQL Server backup and recovery, to meet RPO/RTO and prove restores actually work.
trigger: model_decision
tags: [sql-server, backup, recovery, dr]
---

# SQL Server: Backup and Recovery

- **Define RPO and RTO first.** RPO is how much data you can afford to lose; RTO is how long you can be down. Pick the backup strategy (FULL/DIFF/LOG and their frequency) from those numbers, not from a default.
- **Test restores on a schedule.** A backup you have never restored is a wish, not a backup. Run restore drills and verify recovery time against your RTO.
- **Transaction log backups for point-in-time recovery.** If you must recover to a point in time, take regular log backups so the log can be replayed. Full backups alone give you only the last full's data.
- **Keep backups off the instance.** A backup on the same disk as the database dies with the disk. Store copies offsite or off-instance, and protect them as data.
- **Monitor the backup jobs.** A silently failing backup job is worse than none — you believe you are protected and you are not. Alert on failure and on missed jobs.
- **Back up the encryption keys too.** If the database is TDE-encrypted, the certificate/key is required to restore it. Without a backed-up key, the backup is unreadable.
