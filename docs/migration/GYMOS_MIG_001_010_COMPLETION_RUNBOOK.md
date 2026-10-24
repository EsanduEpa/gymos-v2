# GymOS migration completion runbook — GYMOS-MIG-001 through GYMOS-MIG-010

Last updated: 24 October 2026, Asia/Colombo
Working branch: `codex/gymos-mig-001-010`

This is the continuation checklist for completing tasks GYMOS-MIG-001 through GYMOS-MIG-010. The authoritative requirements remain [MIGRATION_TASK_SPECS.md](MIGRATION_TASK_SPECS.md), the four migration maps and approved [DEC-02](decisions/DEC-02.md), [DEC-04](decisions/DEC-04.md) and [DEC-05](decisions/DEC-05.md). This runbook records the current implementation state and the remaining execution order; it does not broaden product scope or authorize production/shared-database operations.

The detailed remaining implementation sequence, responsibilities, integration limitations and acceptance gates after checkpoint `4105398` are in [GYMOS_MIG_005_010_REMAINING_WORK_PLAN.md](GYMOS_MIG_005_010_REMAINING_WORK_PLAN.md).

## Non-negotiable execution rules

- Modify GymOS V2 only. Do not change or execute GymOS V1.
- Never connect tests, migrations, cleanup, backup or restore tooling to an existing development, staging, production or V1 database.
- Database tests must create a new locally owned disposable PostgreSQL container, use random run-owned database names/markers and remove only resources whose ownership is revalidated.
- Preserve all committed migration files. Every later schema change must use a new additive migration.
- Do not import V1 data, password hashes or IDs.
- Keep build, lint, type-check and unit-test commands free of database creation, migration, seeding, backup and restore side effects.
- Do not store or print passwords, database URLs, encryption keys, enrollment proofs, health information or raw request bodies in operations, receipts, evidence or logs.
- Treat an unknown post-commit outcome as a reconciliation case. Never blindly repeat an external or financial effect.
- Update the task specification, master plan, tracker and JSON index only after the task's acceptance evidence exists.
- A task is `Completed` only when implementation, negative cases, required real-database/browser checks and evidence are complete.

## Current status and dependency order

| Task | Current state | Required next action |
|---|---|---|
| GYMOS-MIG-001 | Completed | Preserve evidence; rerun only if a later task explicitly requires a new baseline comparison. |
| GYMOS-MIG-002 | Completed | Preserve shared contracts and API client behavior. |
| GYMOS-MIG-003 | Completed | Preserve frozen identity migrations and evidence. |
| GYMOS-MIG-004 | Completed | Final evidence linked and all status views synchronized. |
| GYMOS-MIG-005 | Completed | Preserve verifier/gate evidence; rerun affected cases after task006 changes database leasing. |
| GYMOS-MIG-006 | Completed | Preserve bounded-pool and safe-shutdown evidence; reuse the lifecycle in task007. |
| GYMOS-MIG-007 | Completed | Preserve the owned database/browser harness and evidence; task008 adds it to CI. |
| GYMOS-MIG-008 | In progress | Local checks pass; hosted PR scanner/review awaits a configured Git remote. See task008 evidence. |
| GYMOS-MIG-009 | Completed for local disposable recovery drill | See [GYMOS-MIG-009 evidence](evidence/GYMOS-MIG-009.md) and [backup/restore runbook](runbooks/backup-restore.md). Managed/staging drill remains under Task 070; restored Master is intentionally unactivated pending repair. |
| GYMOS-MIG-010 | Blocked on external remediation | Esandu confirmed on 25 October that rotation/revocation has not happened and reuse has not been checked. Treat the V1 login as exposed; obtain provider containment and reuse/access-investigation evidence without recording the credential. Refreshed V2 source scan is in the evidence file. |

Required order:

```text
001 → 002 → 003 → 004 → 005 → 006 → 007 → 008
                              └──────→ 009
001 ─────────────────────────────────→ 010 (external remediation)
```

## Common completion procedure for every remaining task

1. Read the task section in `MIGRATION_TASK_SPECS.md`, its mapped source sections and approved decisions.
2. Confirm every dependency is `Completed` with evidence.
3. Inspect the dirty worktree and reserve only the task-owned files. Preserve all other changes.
4. Record the task as `In Progress` in the tracker/index before broad implementation starts.
5. Make additive, scoped changes. Do not implement downstream feature endpoints or UI that the task does not own.
6. Run focused unit/type checks first, then isolated database/browser checks where required.
7. Confirm cleanup removed only run-owned resources and that no container/database/process remains.
8. Run `git diff --check`, API/web lint and no-emit type checks. Run builds required by the task.
9. Create `docs/migration/evidence/GYMOS-MIG-00X.md` with exact commands, exit codes, environment boundary, assertions, failures corrected, file hashes and limitations.
10. Recheck V1 HEAD/status and the task001 tracked-file hashes. V1 must remain unchanged.
11. Synchronize `MIGRATION_EXECUTION_PLAN.md`, `MIGRATION_TASK_SPECS.md`, `MIGRATION_TASK_TRACKER.md` and `MIGRATION_PLAN_INDEX.json`.
12. Review the complete task diff before committing. Do not bulk-stage unrelated or unreviewed files.

## GYMOS-MIG-001 — reproducible baseline

Status: completed. Evidence: [GYMOS-MIG-001.md](evidence/GYMOS-MIG-001.md).

Preserve these results:

- Node, pnpm, dependency and Git revisions were recorded.
- API unit test, API/web lint and API/web no-emit checks passed.
- The original milestone script was identified as destructive and was not run.
- V1 and existing databases were not modified or accessed.

No additional work is required unless later final QA finds a baseline-evidence inconsistency.

## GYMOS-MIG-002 — shared contracts and API client

Status: completed. Evidence: [GYMOS-MIG-002.md](evidence/GYMOS-MIG-002.md).

Preserve these results:

- Strict runtime contracts, legacy E01–E08 response shapes, typed failures, decimal money/date/paging/idempotency primitives and actor/access types exist in `packages/contracts`.
- The API client uses origin-relative or validated HTTP(S) origins, no redirects, no-store requests and unknown-outcome handling for ambiguous mutations.
- Contract/client builds, type checks and 29 focused tests passed.

Do not weaken secret sanitization, retry classification or legacy response compatibility while wiring later packages into workspace/CI checks.

## GYMOS-MIG-003 — identity and tenant actor foundation

Status: completed. Evidence: [GYMOS-MIG-003.md](evidence/GYMOS-MIG-003.md).

Preserve these results:

- Canonical ASCII email enforcement exists in every current identity writer and in PostgreSQL constraints.
- Master identity security metadata, typed/PENDING access links, internal enrollment proofs and minimal tenant Member/Trainer actor metadata are additive.
- Existing-account proof consumption preserves the existing password/hash.
- Unverified linked MEMBER/TRAINER access fails closed.
- Eight real PostgreSQL integration tests, nine unit tests, lint, type checks and build passed.

Do not edit the task003 migration bytes. Public consent/recovery, password-change and full enrollment flows remain owned by later tasks.

## GYMOS-MIG-004 — durable operations, receipts and audits

Status: implementation and evidence completed. Evidence: [GYMOS-MIG-004.md](evidence/GYMOS-MIG-004.md).

The final evidence and frozen migration hashes have been reviewed. All four status views now record task004 as `Completed` with its evidence link and completion date.

Preserve these results:

- Master operations use immutable intent/digests, exact approved states, 30-second database-clock leases, 10-second heartbeat guidance, version CAS and typed monotonic checkpoints.
- Tenant receipts claim idempotency/source-operation identities before effects and commit domain effects, safe result and required audit atomically.
- `ta1`, `ma1` and `mv1` event keys use canonical tuples and SHA-256.
- Provisioning target tuples, prior checkpoint evidence, audits, operations and receipts are protected against unsafe rebinding/deletion.
- Seven pure tests, ten disposable-PostgreSQL integration tests, API type-check/lint/build passed.

Do not edit the frozen task004 migration SQL. Task005 and later changes use later migrations only.

## GYMOS-MIG-005 — tenant binding and installed-schema verification

Status: completed. Evidence: [GYMOS-MIG-005.md](evidence/GYMOS-MIG-005.md).

Already implemented in the working tree:

- New additive Master/Tenant schema-registry migrations.
- Master `Gym` registry version plus expected schema version, manifest digest and operation reference.
- Tenant `GymConfiguration` and `SchemaState` singletons with immutable physical gym binding.
- A versioned tenant manifest containing ordered migration checksums and schema postconditions.
- A full verifier for `_prisma_migrations`, tables, enum types, indexes, constraints, triggers and columns.
- APPLYING/VERIFIED/FAILED/REPAIR_REQUIRED attestation flow.
- A fresh request gate that checks Master expectations/operation evidence and tenant binding/state before member-domain queries.
- API lint and no-emit type-check currently pass.

Required completion steps:

1. Done: extended the disposable PostgreSQL helper with additional random run-owned provisioning-format databases; container and ownership guards remain in place.
2. Done: added a passing manifest test comparing committed tenant migration source checksums to the ordered manifest. Dedicated negative integration validation remains pending.
3. Add real PostgreSQL integration tests for:
   - successful initial verification and immutable binding;
   - two physical tenant databases bound to distinct Master gyms;
   - swapped registry targets;
   - missing `GymConfiguration` or `SchemaState`;
   - APPLYING, FAILED and REPAIR_REQUIRED states;
   - wrong template version or manifest digest;
   - changed/unfinished/extra `_prisma_migrations` history;
   - missing table, column, enum, index, constraint or trigger;
   - unsupported API compatibility;
   - Master outage returning a sanitized 503;
   - zero domain callback/query execution on every failed gate;
   - lost Master observation recovered by rereading actual tenant evidence rather than claiming migration execution.
4. Verify registry CAS: stale `Gym.version` must conflict and the successful observation must write an `mv1` audit in the same Master transaction.
5. Verify normal member list/create behavior through the gate, including preservation of the existing safe duplicate-email 409.
6. Run Prisma format/generate using the installed cached engine, then focused unit/integration tests, API unit tests, API/web lint, no-emit checks and builds.
7. Confirm all disposable databases/container are removed and V1 remains unchanged.
8. Write `evidence/GYMOS-MIG-005.md`, record hashes and synchronize status to `Completed`.

Task005 completion gate: no ordinary tenant read or command can run when physical binding, installed history, manifest, API compatibility, Master expectation or operation observation is missing/mismatched.

## GYMOS-MIG-006 — bounded pools and safe shutdown

Status: completed on 24 October 2026. Repository implementation and verification are recorded in `evidence/GYMOS-MIG-006.md`.

Required completion steps:

1. Port the reviewed prototype into task-owned API files without replacing task005's `withDatabase` verification boundary.
2. Replace the unbounded tenant-client map with reference-counted callback leases:
   - maximum eight resident tenant clients;
   - maximum two PostgreSQL connections per tenant pool;
   - maximum 64 queued admissions;
   - three-second admission timeout;
   - five-second statement timeout;
   - 60-second idle eviction;
   - never evict or disconnect a client with active leases.
3. Configure a Master pool maximum of four and a separate provisioning/admin capacity maximum of one. Count migration/backup/operator connections separately.
4. Parse/sanitize database URLs before applying database name and timeout controls. Reject unreviewed URL options and preserve only approved TLS switches.
5. Convert pool/admission/connection/query availability failures to a fixed retryable 503 without URL, database name or driver-message leakage. Preserve domain exceptions such as member-email 409.
6. Add a process-wide provisioning admission semaphore so concurrent web requests cannot create unbounded admin connections/migration subprocesses.
7. Enable Nest shutdown hooks for SIGTERM/SIGINT and `return503OnClosing`. Stop new admissions, drain tenant callbacks, then close Master/provisioning pools. Log a sanitized timeout if the ten-second budget is exceeded while allowing an active callback to finish safely.
8. Port the 22 passing prototype tests into the repository and add real database/process tests for 9+ tenant keys, bounded `pg_stat_activity`, active-lease protection, query timeout, sanitized saturation, idle cleanup and SIGTERM behavior.
9. Rerun task005 negative gate tests through the bounded lease API.
10. Run focused/full checks, write `evidence/GYMOS-MIG-006.md`, verify cleanup and synchronize status.

Task006 completion gate: the ninth busy tenant cannot create an overflow client, active work is never disconnected, saturation is a safe retryable 503 and shutdown closes every idle/drained owned pool.

## GYMOS-MIG-007 — disposable two-gym database and browser harness

Status: completed on 24 October 2026. See `evidence/GYMOS-MIG-007.md` and `../../infrastructure/testing/README.md` for results and commands.

Required completion steps:

1. Move the disposable runner into maintained infrastructure/testing modules with a private per-run ownership manifest.
2. Guard every write and cleanup using exact run ID, container ID/label, local Unix Docker context, loopback port, database-name allowlist and per-database marker.
3. Support an owned Master, tenant A, tenant B and additional fresh provisioning/restore targets. Never adopt an existing database/container.
4. Apply genuine Prisma migration histories and task005 attestation; never fabricate `_prisma_migrations` or VERIFIED markers.
5. Seed synthetic implemented-schema fixtures only:
   - owners, trainer/member actor metadata and multi-gym identity cases;
   - active, pending, forced-change and mismatched cases;
   - more than 100 people for paging/cap checks;
   - explicit test currency/time zone only when their schema owner has implemented those fields.
6. Harden or replace `apps/api/scripts/verify-milestone.mjs` so it can execute only inside the owned runner. Remove all ability to load arbitrary inherited database URLs or drop a target based only on a name pattern.
7. Start API/web on loopback with generated test-only secrets and no root `.env` loading.
8. Add real HTTP and browser coverage for currently implemented behavior: login, selected gym, owner access, theme/member flows, negative role access and cross-gym isolation. Do not claim unimplemented member/trainer portal UI.
9. Pin compatible browser tooling in the workspace and CI; use a dedicated temporary profile and retain redacted screenshots/traces only when the browser actually runs.
10. Prove two parallel runs do not share rows/resources; failure cleanup removes only its own container; wrong host/name/marker results in zero mutations.
11. Write the harness runbook and `evidence/GYMOS-MIG-007.md`, capture physical isolation/effect counts and synchronize status.

Task007 completion gate: a failed or parallel run cannot touch any resource it did not create and revalidate, and browser success is backed by physical two-tenant database evidence.

## GYMOS-MIG-008 — workspace checks and isolated CI

Status: in progress; local implementation verified on 25 October 2026. Hosted pull-request scan/review remains pending because this checkout has no Git remote. See `evidence/GYMOS-MIG-008.md` and `runbooks/ci.md`.

Required completion steps:

1. Add CI configuration with pinned Node 24 and pnpm 9.15.0. Cache keys must include the lockfile.
2. Keep distinct jobs for:
   - dependency install/workspace validation;
   - shared-package/API/web builds;
   - lint and no-emit type checks;
   - unit tests;
   - disposable PostgreSQL integration tests;
   - browser tests;
   - secret scan;
   - dependency review.
3. Ensure build/lint/type/unit jobs have no database service credentials and cannot invoke migrations, seeds, provisioning, backup or restore.
4. Give integration/browser jobs only scoped disposable-service credentials and explicit mutation opt-in.
5. Build shared packages before consumers and verify every workspace import has a real package manifest/export.
6. Add documented environment-key names without values. Missing required keys must fail with sanitized actionable messages.
7. Add secret scanning for tracked source and generated artifacts/logs. Rescan the V2 tree and explicitly confirm no V1 credential/demo password reuse without recording values.
8. Upload redacted test/evidence artifacts with bounded retention. Report optional-suite skips clearly; never report a skipped browser/database suite as passing.
9. Prove a clean install and full PR workflow are reproducible, then write `evidence/GYMOS-MIG-008.md` and synchronize status.

Task008 completion gate: ordinary CI builds cannot change a database, while isolated integration/browser jobs reproduce tasks003–007 with no secret-bearing artifacts.

## GYMOS-MIG-009 — encrypted backup and isolated restore

Status: Completed for the local disposable recovery drill. Runbook: [backup-restore.md](runbooks/backup-restore.md). Evidence: [GYMOS-MIG-009.md](evidence/GYMOS-MIG-009.md). The staged Master is repair-required and never autoactivated; managed-provider recovery remains GYMOS-MIG-070.

Required completion steps:

1. Port the reviewed crypto, recovery and retention modules into `infrastructure/recovery` with pure tests and operator documentation.
2. Require a separate 32-byte encryption key from a protected source. Reject missing/wrong-permission keys before database work. Never place the key in Git, backup metadata, argv, evidence or logs.
3. Produce separate Master and individual-tenant PostgreSQL custom-format backups. Stream through AES-256-GCM using a random 12-byte nonce, authenticated canonical metadata and a 16-byte tag.
4. Record source kind, gym/binding, schema version/digest, UTC snapshot time, tool format/version, ownership, encrypted payload checksum/size and non-secret key ID.
5. Publish a backup atomically only after dump/encryption/hash/authentication succeed. Partial artifacts never count as backups.
6. Before restore, verify envelope hash, metadata, key and GCM authentication completely into a private temporary plaintext file. Never pipe unauthenticated plaintext to `pg_restore`.
7. Restore only into a newly created task007-owned target. Never use `--clean`, overwrite the source tenant or accept a shared/existing database.
8. Run task005 full history/catalog/binding verification and compare expected row counts/invariants before any registry change.
9. Suspend the affected test gym, drain its pool and use `Gym.version` CAS for a reviewed registry switch with `mv1` audit. Preserve the old target and demonstrate rollback. Prove tenant B is unchanged.
10. Stage Master restore separately and reconcile its registry/access/operation observations against current tenant bindings/receipts. Do not auto-activate an older restored registry.
11. Test corrupt/truncated artifact, wrong key, wrong gym, missing manifest, unsafe path/name, stale registry version, schema mismatch and restore-command failure. All must refuse cutover.
12. Implement at least seven verified daily-generation retention semantics without deleting the last known-good generation. Do not claim an actual seven-day history until scheduling has produced it.
13. Measure backup age and restore elapsed time. Report whether the proposed development RPO ≤24h and RTO ≤60m were actually achieved in the isolated drill.
14. Write `evidence/GYMOS-MIG-009.md`, preserve only redacted drill measurements, prove cleanup and synchronize status. Completed locally; repeat provider-specific recovery in GYMOS-MIG-070.

Task009 completion gate: tenant A and Master backups are authenticated and restorable to new targets, A can switch and roll back through CAS, B remains unchanged, and corrupt/wrong-binding artifacts cannot reach restore or cutover.

## GYMOS-MIG-010 — exposed V1 credential remediation and V2 secret hygiene

Status: blocked. Evidence: [GYMOS-MIG-010.md](evidence/GYMOS-MIG-010.md).

Already completed:

- The exposed remote credential location was confirmed without executing the V1 script or recording its value.
- Esandu is recorded as the credential owner.
- A redacted V2 source scan found no matching V1 credential reuse, tracked real environment file, private key, token or remote database URL. CI rescan remains required by task008.

Required external completion steps:

1. Esandu must revoke or rotate the exposed remote database credential in the owning provider/service.
2. Record owner acknowledgment, remediation timestamp and a non-secret credential identifier only.
3. Investigate whether the credential was reused and review provider access/audit history for unexpected access. Record the conclusion without copying secret values or sensitive logs.
4. Determine whether Git history, deployment artifacts, CI logs/caches or provider configuration contain the old value and record the remediation disposition.
5. If a V1 source/history change is required, handle it under separate explicit authorization. This task does not authorize editing V1.
6. Run the task008 V2 secret scan and confirm evidence/log artifacts themselves contain no credential value.
7. Update `evidence/GYMOS-MIG-010.md` with owner acknowledgment and status. Keep the task `Blocked` until revocation/rotation is confirmed; then verify all acceptance items and mark it `Completed`.

Task010 completion gate: ownership alone is insufficient. Completion requires confirmed revocation/rotation, reuse/access/history assessment and a clean redacted V2/CI scan.

## Final gate for GYMOS-MIG-001 through GYMOS-MIG-010

Do not declare the range complete until all items below are true:

- Tasks001–010 show `Completed` consistently in the task specification, master plan, tracker and JSON index.
- Evidence reports exist for all ten tasks and link to exact passing command results.
- All additive Master/Tenant migrations deploy from empty databases using genuine Prisma history.
- The manifest hashes match source migration bytes and the physical schema verifier passes.
- Missing/swapped/stale/failed tenant metadata produces sanitized 503 responses before domain queries.
- Pool/client/connection counts remain within the approved 4 Master + 8×2 tenant + 1 provisioning per-process ceiling, with separately counted test/migration/backup connections.
- Two-gym HTTP/browser isolation and cleanup ownership tests pass.
- CI separates non-mutating builds from isolated database/browser/recovery jobs and secret scanning passes.
- Encrypted tenant/Master restore drill, CAS switch and rollback pass; RPO/RTO measurements are recorded honestly.
- V1 HEAD/status and all task001 V1 tracked-file hashes remain unchanged.
- No existing/shared database was migrated, reset, restored over or deleted.
- The V1 credential revocation/rotation and investigation are confirmed by Esandu without exposing the credential in repository evidence.
