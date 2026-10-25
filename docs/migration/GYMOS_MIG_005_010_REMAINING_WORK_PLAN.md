# GymOS remaining work plan — tasks 005–010

Prepared: 24 October 2026, Asia/Colombo.

Baseline commit: `4105398` — migration foundations and partial tenant schema verification.

Branch: `codex/gymos-mig-001-010`.

This plan covers the work remaining after tasks 001–004. It refines the [completion runbook](GYMOS_MIG_001_010_COMPLETION_RUNBOOK.md), follows the [task specifications](MIGRATION_TASK_SPECS.md), and uses the approved [DEC-04](decisions/DEC-04.md) and [DEC-05](decisions/DEC-05.md). It does not change task scope or authorize shared-database, production, or V1 operations.

## 1. Verified starting point

| Task | Status at baseline | Remaining work |
|---|---|---|
| 001–004 | Completed, evidence linked and status views synchronized | Preserve migrations, contracts, identity and operation invariants. |
| 005 | Completed on 24 October 2026 | Preserve evidence and rerun affected gate cases through task 006's bounded leases. |
| 006 | Completed on 24 October 2026 | Preserve the measured pool limits, timeout, eviction and shutdown evidence. |
| 007 | Completed on 24 October 2026 | Preserve the owned database/browser harness and evidence. |
| 008 | In progress; local implementation and checks complete | Run the hosted pull-request workflow when the repository remote is configured; capture secret/dependency job results. |
| 009 | Not integrated | Review and port the temporary recovery prototype; run real encrypted backup/restore drills. |
| 010 | Blocked on external evidence | Esandu must confirm credential remediation and investigation; finish the V2/CI scan. |

Existing passing checks include API typechecking/lint, 16 API unit tests, 1 tenant migration checksum test, 29 shared contract/client tests, and the prior 10-test disposable PostgreSQL operations suite. These results do **not** prove task 005's missing negative cases, task 006's capacity limits, browser behavior, CI execution or recoverability.

The task 006 prototype has been reviewed, ported and verified in maintained repository paths. The remaining prototype under `/tmp/gymos-task009-prototype` is reference material; its reported 14 passing tests are not repository integration evidence. Temporary files may disappear, so review and port its source/tests before relying on them.

## 2. Order, ownership and user inputs

Execute these milestones sequentially:

1. Finish **005**: prove tenant binding and installed-schema verification.
2. Finish **006**: integrate bounded database access and shutdown.
3. Finish **007**: establish the maintained two-gym HTTP/browser harness.
4. Finish **008**: reproduce the checks in isolated CI.
5. Finish **009**: prove encrypted recovery using the owned harness, then add its isolated CI job.
6. Close **010** after the external remediation evidence and final integrated scan are available.

Task 009 depends on 005 and 007; placing it after 008 is an execution choice so recovery can reuse CI and evidence conventions. Task 010's external investigation can proceed while 005–009 are implemented; it does not block their local work. Task 005 does not depend on task 006: close 005 on its own evidence, then rerun the relevant gate cases after 006 changes database access.

| Responsible party | Required action |
|---|---|
| Codex | Implement and test 005–009, maintain evidence/status, and perform redacted V2 scans. No new product decision is needed from the user for these tasks. |
| Esandu | For 010, confirm revocation/rotation, old-credential invalidation, reuse review, access review and history/artifact disposition. Supply only redacted status, timestamps and evidence references. |
| Execution environment | Local Docker PostgreSQL, compatible pinned browser tooling, and dependency-download access when required. Request sandbox access only when an actual operation requires it. |
| CI environment | A compatible runner and permission to execute the repository workflow. If hosted execution is unavailable, record it as unverified and retain local workflow checks; do not label an unrun hosted workflow as passing. |

Do not request database passwords, production URLs or customer records to complete the local implementation. Do not ask for DEC-04/DEC-05 approval again.

## 3. Task 005 — finish tenant binding and schema verification

### Already available

- Additive Master/Tenant schema-registry migrations and generated models.
- Immutable physical tenant binding, schema state and pinned migration manifest.
- Catalog/history verifier, attestation flow, Master registry version check and request gate.
- Member reads/writes routed through the gate.
- Provisioning-format disposable database support and a passing source checksum test.

### Work packages

1. **Create a dedicated tenancy integration suite.** Start a new owned PostgreSQL container, apply genuine Master/Tenant migrations and create two distinct gym/tenant fixtures. Use real operation checkpoints and actual verification results to establish readiness. Keep incomplete/mismatched fixtures explicitly separate.
2. **Prove installation and binding.** Verify a valid installation; reject immutable binding changes and swapped targets. Test missing binding/state, APPLYING/FAILED/REPAIR_REQUIRED, wrong version/digest and unsupported API compatibility.
3. **Prove drift detection.** Independently inject changed, unfinished and extra migration history, plus missing table/column/enum/index/constraint/trigger postconditions. Use isolated targets or restore the owned fixture between cases. Never edit committed migration files to manufacture failures.
4. **Prove no domain access on rejection.** Instrument the gate callback and inspect persisted row counts. Each failed gate must return a fixed safe 503 with zero domain callbacks/effects. A Master outage must deny access without falling back to another tenant.
5. **Prove registry observation and recovery.** A stale `Gym.version` conflicts; successful observation and its `mv1` audit commit together. Inject audit failure and verify rollback. Reverify actual installation after a lost Master observation; never claim SQL executed merely because a marker exists.
6. **Prove current member behavior.** With a genuinely verified fixture, list/create works, duplicate member email remains a safe 409, tenant A cannot reach B, and reads create no records.
7. **Resolve and document integration findings.** Correct verifier/gate/registry defects within task scope, then run focused regression checks and finish task 005 evidence.

### Existing provisioning compatibility gap

The current `GymProvisioningService.create` migrates and activates a gym but does not establish the operation/schema observation required by the new gate. Therefore a gym created through that legacy path can be ACTIVE yet have member requests rejected with 503. This is a real integration limitation, not proof that the gate failed.

Record and test that safe rejection. The complete durable provisioning lifecycle belongs to tasks 021–023; tasks 005–010 must not silently claim that lifecycle is delivered. The task 007 harness must prepare verified fixtures using the internal operation/verifier boundaries. It must report legacy provisioning compatibility separately rather than invent verification rows or bypass the gate. Any proposed scope expansion to fix the full public provisioning flow must be identified explicitly before implementation.

### Completion gate and deliverables

- All listed positive/negative database and HTTP cases pass; failed gates execute zero domain callbacks.
- Manifest source checksums and immutable binding constraints are verified.
- Full evidence in `docs/migration/evidence/GYMOS-MIG-005.md`, including failure corrections and the provisioning limitation.
- Task 005 synchronized to Completed in the four status views only after these checks pass. Task 006's later regression is not a prerequisite for this completion.

## 4. Task 006 — bounded pools and safe shutdown

### Work packages

1. Review/port the typed lease manager, pool configuration and single-admission helper into maintained API infrastructure. Port meaningful prototype tests and rerun them against the actual integrated source.
2. Replace the unbounded client map with callback leases; remove the raw `forDatabase` escape after converting its callers. The tenant gate's metadata checks and domain callback must share the same protected lease.
3. Apply approved limits: Master max 4 connections, max 8 resident tenant clients with max 2 connections each, and provisioning/admin max 1. Queue at most 64 admissions, wait at most 3 seconds, use 5-second ordinary statement timeouts and evict idle clients after 60 seconds.
4. Validate database names and URL options. Convert recognized availability/saturation failures to a fixed retryable 503 while preserving domain errors. Never classify errors by dumping driver messages or URLs.
5. Serialize provisioning admission across the process, including migration-subprocess capacity. Count subprocess/operator/test/backup connections separately from the steady 21-connection budget.
6. Register SIGTERM/SIGINT hooks and closing-request 503 behavior. Stop new work, drain active tenant callbacks, then close pools. At the 10-second deadline report sanitized timeout status; do not disconnect active work or falsely report a clean shutdown.
7. Run real database and subprocess tests: 9+ busy tenant keys, actual `pg_stat_activity` counts, timeout/cancellation, idle release, protected active leases, safe saturation and SIGTERM during active work. Use a real 60-second idle check at least once; timer simulation alone is insufficient evidence.
8. Rerun the affected task 005 rejection and member-success cases through the bounded API.

### Completion gate and deliverables

- Ninth busy tenant cannot allocate an overflow client; connection counts respect the per-process budget.
- Active work is never evicted; saturation is safe; normal shutdown closes all drained resources.
- `docs/migration/evidence/GYMOS-MIG-006.md` records actual counts, timeouts, shutdown outcomes and cleanup.
- Integrate production configuration, tests and operator notes; synchronize status and make a task-sized commit.

## 5. Task 007 — maintained disposable two-gym harness

### Work packages

1. Promote the existing helper into maintained test infrastructure. Capture run ID, container ID/label, loopback port and exact created targets in a private ownership manifest; revalidate them before database mutations and cleanup.
2. Guard local Docker context, host, name, marker and container ownership. Never adopt an existing database. Prove wrong host/name/marker causes zero mutations, including destructive cleanup attempts.
3. Build synthetic fixtures through real migrations and verifier/operation boundaries: owners, multi-gym identity, linked member/trainer metadata, pending/inactive/forced-change cases and more than 100 people. Fixture fields do not imply the corresponding later UI/security feature is implemented.
4. Replace or disable the unsafe root `verify:milestone` path that loads `.env`. The supported entry point must create its owned environment itself, use test-only generated secrets, and offer no arbitrary-target override.
5. Start API/web only on loopback, with isolated ports and a dedicated temporary browser profile. Pin browser tooling and explicitly configure deterministic test time/time zone; add currency fixtures only where supported by implemented schema.
6. Add real HTTP and browser tests for login, gym navigation, verified owner access, theme/member behavior, denied role access and cross-gym isolation. Check database rows/effect counts behind UI outcomes. Report unsupported provisioning and later portal behavior honestly.
7. Run two harness instances concurrently, inject startup/test failures, and prove each run cleans up only its own resources. Re-run successfully after failure.
8. Store redacted screenshots/traces only for browser cases that actually executed; remove tokens, cookies, request secrets and private fixture data from retained artifacts.

### Completion gate and deliverables

- Passing HTTP/browser tests backed by physical A/B database evidence.
- Ownership refusal, concurrent-run isolation and failure cleanup pass.
- Maintained harness entry point, fixture builders, browser config and operator runbook.
- `docs/migration/evidence/GYMOS-MIG-007.md`, with cleanup and explicit coverage limitations; synchronize status and commit.

## 6. Task 008 — repeatable workspace and isolated CI checks

### Work packages

1. Add documented workspace commands for generation, shared-package builds, builds, typechecking, lint, unit, database and browser checks. Generate Prisma clients without connecting to a database. Build shared contracts/client packages before consumers.
2. Pin Node 24, pnpm 9.15.0 and browser tooling; install with the frozen lockfile. Lock cache identity to tool versions and the lockfile. Pin workflow actions/scanners and use minimum required token permissions.
3. Add distinct build, typecheck/lint, unit, disposable integration, browser, secret-scan and dependency-review jobs. Build/type/lint/unit jobs receive no database credentials and cannot call migrations/seeds/provisioning/recovery.
4. Reuse the owned runner for mutation jobs; enable database work explicitly and never consume shared service secrets. Test that missing configuration fails with actionable sanitized errors.
5. Scan tracked source and retained generated artifacts/logs with redacted output. Narrowly document fixture/template exceptions; do not silence an entire directory. Review V1 credential/demo reuse privately without importing the secret into CI or printing it.
6. Bound artifact retention and verify artifacts are sanitized before upload. Failed, skipped and unrun jobs must remain distinguishable.
7. Reproduce a clean install and local job commands, then execute the hosted workflow where repository access permits. Record the actual revision/run references. A configured workflow alone does not satisfy execution evidence.

### Completion gate and deliverables

- Repeatable clean install/build/checks; non-mutating jobs have no database-changing path.
- Disposable database/browser jobs run and produce safe evidence; secret/dependency checks report actual results.
- CI workflows, workspace scripts and environment-key documentation with names only.
- `docs/migration/evidence/GYMOS-MIG-008.md`, including any hosted-run blocker; synchronize status only when acceptance is met.

## 7. Task 009 — authenticated backup and isolated recovery

### Work packages

1. Review/port crypto, recovery and retention prototype modules into maintained recovery tooling. Validate canonical paths and reject repository artifact/key storage, symlinks and unsafe key permissions. Use a separate protected 32-byte key; disposable drills generate and remove their own key outside Git.
2. Create separate Master and tenant custom-format PostgreSQL archives from consistent source snapshots. Record source binding, schema manifest, tool versions, UTC snapshot time, counts and deterministic nonsecret integrity evidence.
3. Encrypt with AES-256-GCM, random nonce and authenticated allowlisted metadata. Publish complete artifacts atomically only after subprocess completion, encryption and hashing succeed. Never publish partial backups or keys.
4. Before invoking restore, verify checksum, metadata, key identity and authentication into private temporary storage. Never feed unauthenticated plaintext to PostgreSQL.
5. Restore tenant A only into a new owned target. Run full migration/catalog/binding verification and compare authenticated counts/invariants. Keep source A and tenant B intact; exclude the harness ownership schema from the dump so restore cannot overwrite the new target marker.
6. Suspend A, drain its leased client, reverify the destination and switch its registry with version CAS plus local audit evidence. Test reactivation and an audited rollback to the preserved old target. A failure after suspension stays recoverable and suspended rather than being falsely reported active.
7. Restore Master to a separate new target and verify its actual Master schema/history. Reconcile its older identities/access/security metadata, routes and operations against current tenant evidence; never automatically activate an older registry or resurrect stale access.
8. Inject corrupt/truncated backup, missing/wrong key, wrong gym, unsafe path, missing manifest, schema mismatch, failed restore and stale registry version. Verify refusal before cutover and zero changes to B.
9. Implement retention protecting at least seven distinct verified daily generations and the last known-good copy. Use simulated dates for policy tests; do not claim seven days of actual history from one drill.
10. Measure backup age at simulated failure and elapsed recovery through verified access. Report whether the local RPO ≤24 hours and RTO ≤60 minutes targets passed. Add an isolated recovery CI job after the tooling is integrated.

### Completion gate and deliverables

- Real authenticated Master/A backups restore to new owned targets; A switch/rollback succeeds and B's counts/digest remain unchanged.
- Negative cases deny restore/cutover as appropriate; staged Master reconciliation is explicit.
- Tooling, tenant/Master runbooks, retention policy and measured drill evidence in `docs/migration/evidence/GYMOS-MIG-009.md`.
- Local disposable gate completed and recorded in the evidence file; the restored Master remains staged for repair and is never autoactivated. No staging/production/provider guarantee is claimed; managed-provider rehearsal remains GYMOS-MIG-070.

## 8. Task 010 — credential remediation and final secret hygiene

### Esandu's external checklist

- [ ] Acknowledge ownership of nonsecret incident identifier `V1-REMOTE-DB-001` and record an incident/evidence reference.
- [ ] Revoke or rotate the exposed credential through its provider; record UTC time and a redacted change reference.
- [ ] Confirm the old value is unusable and required consumers work with a replacement; address existing sessions if required.
- [ ] Review actual environment/CI/deployment stores and known demo credentials for reuse; remediate confirmed reuse.
- [ ] Review available access/audit records and record the conclusion or missing-log limitations.
- [ ] Record a decision on source/history, logs/caches, deployment artifacts and backups containing the old value.

Provide status and evidence references only; never paste passwords, URLs containing credentials or raw sensitive logs. External rotation and V1 source/history changes require their own authorization. No V1 script will be executed by this plan.

### Codex's remaining checklist

- [ ] Integrate the owner's redacted acknowledgment/remediation/investigation evidence into the existing task 010 record.
- [ ] Re-run the integrated task 008 scans after task 009, including recovery evidence/artifacts eligible for retention.
- [ ] Verify actual environment files/keys/backups remain outside Git and no known demo credential is reused in durable environments.
- [ ] Record reviewer sign-off and residual risk. Keep task 010 Blocked until the external evidence is complete; do not substitute a passing source scan for revocation.

## 9. Execution and evidence discipline

For each milestone:

1. Start from the recorded checkpoint and inspect the worktree; mark only the current task In Progress.
2. Preserve frozen migrations. Add a new migration only if an implementation defect requires schema change; update its manifest in the same task and test fresh installation.
3. Run focused tests first, then the affected real database/HTTP/browser/process checks. Run API/web/shared-package checks when those boundaries change; avoid repeating unrelated suites with no new reason.
4. Record exact commands, exit codes, revision, actual fixture boundary, persisted effects, negative cases and cleanup in the task evidence. Missing or skipped checks are not passes.
5. Recheck V1 preservation and run-owned cleanup. Do not connect to existing development, staging, production or V1 databases.
6. Review the diff and synchronize the task specification, execution plan, tracker and JSON index. Update this plan/runbook as work progresses.
7. Commit each completed task as a coherent change. If an intermediate checkpoint is needed, label it partial and retain the incomplete status. Push or hosted execution must not be implied by a local commit.

## 10. Final acceptance for the range

The range is complete only when:

- [ ] Tasks 001–010 have consistent Completed statuses and linked evidence.
- [ ] Tenant verification rejects all specified mismatches before domain access; valid fixtures retain member behavior.
- [x] Actual pool limits, backpressure, timeout and shutdown behavior meet task 006's measured requirements.
- [x] The owned harness passes HTTP/browser, concurrent isolation and failed-run cleanup checks.
- [ ] A clean CI run covers builds/checks, isolated integration/browser, secret/dependency review and recovery.
- [ ] Master/A recovery, A switch/rollback, B preservation, authentication failure cases and RPO/RTO evidence pass.
- [ ] Esandu's external remediation and investigation evidence closes task 010.
- [ ] V1 and all existing/shared databases remain untouched.
- [ ] The handoff explicitly identifies downstream provisioning tasks 021–023 and other later features; completion through 010 is not represented as the full GymOS migration being finished.

**Next executable action:** implement task 005's dedicated owned-PostgreSQL tenancy integration suite. No further user decision is needed to begin that work.
