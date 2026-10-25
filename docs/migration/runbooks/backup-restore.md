# GymOS V2 backup and restore runbook

This runbook describes the guarded recovery boundary delivered for GYMOS-MIG-009. The checked-in integration drill runs only against an explicitly enabled, local disposable PostgreSQL container. It does not provide a hosted backup service or authorize a shared, staging, or production restore.

## Backup handling

Use a protected, separately managed 32-byte key file with owner-only read/write permissions. Keep it outside the backup directory and outside the Git checkout. The tooling rejects repository paths, symbolic links, broad file permissions, an unavailable key, and nonlocal or unowned database targets before it starts a database dump. Never put the key or database URL in command arguments, logs, evidence, or source control.

Master and each tenant are backed up as separate PostgreSQL custom-format archives from a consistent snapshot. The encrypted envelope authenticates the scope, source run, tenant binding, schema digest, snapshot time, PostgreSQL tool version, counts, and data digest. A manifest records the encrypted file checksum, size, and nonsecret key identifier. A partial dump or failed encryption is not published as a complete backup.

## Tenant restore

1. Verify that the source database and destination belong to the same explicitly authorized recovery run.
2. Verify the manifest scope, binding, key identifier, encrypted checksum, and AES-GCM authentication before starting `pg_restore`.
3. Restore with error-stop and one transaction into a newly created, empty, owned target. Never clean or overwrite the source database.
4. Verify the installed schema, migration history, tenant binding, counts, and data digest against the authenticated metadata.
5. Suspend the affected gym, stop new pool use, wait for existing leases to drain, and verify the target again.
6. Switch the registry with an expected-version compare-and-set and a local audit event. Keep the old database available. If a later check fails, use the same guarded process to switch back.
7. Confirm another tenant's counts and data digest remain unchanged.

If any pre-restore check fails, do not run the restore command. If target verification fails, mark only the new owned target as failed and leave the registry unchanged. If a registry transition has an uncertain outcome, inspect the current version and audit history before retrying.

## Master restore

Restore Master only to a separate new target. Verify its actual migration history and schema, then compare identities, security versions, gym bindings, tenant actors, operation states, and receipts with current evidence. A mismatch produces a repair-required or review-required result. The drill deliberately never activates a restored Master automatically. Resolve every proposed repair through a separately reviewed operator procedure before any future activation.

## Retention

Before pruning, authenticate every candidate artifact and its tenant or Master scope. Keep at least one known-good generation and one verified generation from each of at least seven distinct UTC dates. If fewer than seven verified dates are present, delete nothing. The pruner rechecks each selected artifact immediately before removing its encrypted archive and manifest; a failed verification aborts pruning. Policy tests use simulated dates and do not establish seven days of actual backup history.

## Local disposable drill

Run `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:recovery:owned` from the V2 repository. This command creates a per-run local database container, random disposable database password, temporary private backup/key/plaintext directories, and synthetic two-tenant fixtures. It removes owned databases, the container, and temporary artifacts in cleanup. Do not disable the ownership checks or point the test at a remote Docker context or database.

The evidence file `docs/migration/evidence/GYMOS-MIG-009.md` records the tested revision, command, measured backup age and restore time, the reconciliation outcome, and cleanup. The local RPO/RTO measurements are fixture results, not a service guarantee. Repeat a managed-provider recovery rehearsal under GYMOS-MIG-070 before relying on provider backups or production recovery targets.
