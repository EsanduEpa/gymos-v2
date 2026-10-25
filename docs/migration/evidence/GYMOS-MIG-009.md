# GYMOS-MIG-009 — encrypted backup and isolated recovery

Status: **Completed for the local disposable recovery drill.** Managed/staging provider backups and disaster recovery remain a separate GYMOS-MIG-070 gate. No customer or shared database was used.

## Environment and command

- Environment: macOS development host; local Docker Unix socket; PostgreSQL 17 disposable container; synthetic two-gym fixture.
- Run: `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:recovery:owned`
- Final run result: exit 0; Vitest 1 integration test passed.
- Additional checks: `node --test infrastructure/recovery/recovery.test.mjs` (16 passed); API pool tests (23 passed); API TypeScript check passed; API lint passed; recovery JavaScript syntax checks passed; CI workflow Prettier check passed.
- Git base before Task 9 changes: `df9556b89ebe50c3d8dc3f0ca8e922ae7ae8d7a3`; Task 9 commit: `24e0af9`.

## Drill result

- Master and tenant A backups were written as authenticated encrypted archives. Both were restored to new, owned databases and verified against installed schema/migration history, binding, table counts, and data digests.
- A synthetic member was added after the backup. Restoring the earlier tenant A snapshot removed that later member from the restored copy.
- Tenant A was suspended, its active lease drained, new use refused during suspension, then its registry was switched by version check with `mv1` audit events. A second guarded switch rolled it back to the preserved original target.
- Tenant B remained unchanged: 12 members and the same data digest before and after the switch and rollback. Tenant A's snapshot had 127 members.
- Corrupting the encrypted archive was rejected before the restore callback. Pure tests also cover wrong gym/run/schema, missing manifest, wrong key, truncated ciphertext, changed authenticated metadata, failed producers, unsafe metadata/path, and stale version.
- The Master archive restored and passed actual schema/history/count/data checks, but reconciliation returned `REPAIR_REQUIRED` because the synthetic fixture has no current actor evidence and operation receipts. It stayed unselected and was never activated. This is the safe expected result; any real Master switch requires a separately reviewed repair procedure.
- Backup age at the simulated change: **584 ms** (local measured RPO). Restore and verified tenant access: **945 ms** (local measured RTO). Both are within the proposed development targets of 24 hours and 60 minutes. These are single-run fixture measurements, not provider service guarantees.
- Cleanup reported 8 owned databases dropped, the disposable container removed, and the run ownership manifest removed. The temporary key, backup files, manifests, and plaintext work directory were removed with the local run.

## Retention and operator instructions

`infrastructure/recovery/retention.mjs` authenticates candidate archives before planning deletion and reauthenticates each selected generation immediately before removing its encrypted file and manifest. The policy keeps a known-good generation and at least seven distinct verified UTC dates; if fewer than seven dates exist or any candidate fails verification, it removes nothing. Tests simulate dates only; seven days of actual backup history have not been accumulated.

The operator steps and limits are in [backup-restore.md](../runbooks/backup-restore.md). CI has an isolated recovery job that retains only a safe summary for seven days; it uploads no archive, key, database URL, plaintext, or raw test output. The hosted CI job has not run in this checkout because the repository has no configured Git remote.
