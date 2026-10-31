# Segment 03 — Platform Administration and Tenant Lifecycle

## Execution instructions for AI agents

Read DEC-03/04/05 and this file; verify identity, actor, schema, pool, and recovery prerequisites; preserve existing `/admin` creation behavior while making it recoverable; use disposable databases for all destructive tests; never provision/drop an unknown database.

## 1. Segment overview

- **Capability:** platform gym registry, provisioning, activation, support, suspension, and schema lifecycle.
- **Objective:** migrate S01 and harden current V2 provisioning into durable, resumable platform operations.
- **Result:** Super Admin can create/inspect gyms, enter explicitly scoped read-only support, suspend/reactivate safely, and roll tenant schemas with repair evidence.
- **Priority / complexity:** Critical / Large.
- **Dependencies:** segments 01–02; DEC-03/04/05; provider capacity deferred to segment 10.
- **In scope:** GYMOS-MIG-021–026.
- **Out of scope:** owner operational configuration, support mutations, subscription billing, production rollout.

## 2. Current V1 implementation

S01 `/admin` uses `app/(dashboard)/admin/page.tsx`, `AdminClient.tsx`, and `app/actions/admin.ts`. It shows a native table with Gym/address, owner, tier, member count, status, and action; selection writes an HttpOnly `superAdminGymId` context. “View Dashboard” only selects; sidebar Owner View navigates. V1 has no full create/edit/delete UI, pagination, search, or gym details page. Support context effectively grants owner-page behavior and lacks the approved read-only boundary.

Current V2 has `/admin`, `admin.controller.ts`, `gym-provisioning.service.ts`, `super-admin.guard.ts`, CLI scripts, physical DB creation/migration, owner/access/theme activation, and limited registry fields. The flow is synchronous/partially recoverable; CLI and API behavior differ; support context is absent.

## 3. Target V2 implementation

Master `Operation` reserves a stable slug/database target and checkpoints physical create, pinned tenant manifest application/verification, owner identity/access/theme, and activation. A controlled worker owns retries/leases/reconciliation. Tenant `GymConfiguration` and `SchemaState` prove identity/version/digest. Registry returns sanitized platform summaries. Support is explicit, short-lived, read-only, audited with original actor, and cannot bypass tenant/private-data policy. Suspension blocks new admission and drains pools; reactivation requires verified health. Rollout is additive/canary/repair-aware.

## 4. V1 to V2 UI migration

Preserve S01 table hierarchy, selected-row styling, select disabled state, explicit exit, and persistent “Viewing …” banner. Correct status badge color, row-action pending/error, counts semantics, and misleading navigation. Keep V2 gym creation as an additional existing capability, with operation progress/retry/repair states. Proposed target remains `/admin` plus optional operation detail UI only if task specifications require it; no invented general gym details product.

## 5. Backend and database migration

Master owns registry, generated database name, status, expected schema/manifest, provisioning operation, owner identity/access, theme, support session, and platform audit. Physical tenant DB owns schema/binding markers and local receipt/audit. No database name comes from client input. No ordinary HTTP request applies DDL. Cross-plane completion publishes ACTIVE only after verified tenant and reciprocal owner proof. Failure never deletes a reused identity; repair resumes idempotently.

## 6. Detailed tasks

### GYMOS-MIG-021 — reserve idempotent provisioning

- **Prerequisites:** 004,005,016,018,080,081. **Sources:** current admin/provisioner, S01, Operation schema.
- **Target:** adapt admin controller/provisioning service/operation contracts.
- **Instructions:** strict create DTO; canonical slug; server-generated unique DB name; idempotency key/digest; reserve operation/gym once; return 202/safe prior result; reject digest mismatch.
- **Acceptance/test:** same key one target, concurrent slug collision one winner, no physical DB before valid reservation, forbidden caller denied. **[ ]**

### GYMOS-MIG-022 — recoverable provisioning worker

- **Prerequisites:** 006,007,009,021,080,081. **Sources:** current `gym-provisioning.service.ts`, scripts, manifest/gate/recovery.
- **Target:** proposed worker/runner and operation reconciliation; converge CLIs on reviewed service.
- **Instructions:** lease operation; create exact reserved DB; apply pinned immutable manifest; verify binding/schema; checkpoint each step; classify retry/final/repair; reconcile response loss; bounded connection cleanup.
- **Acceptance/test:** injected crash after every step, retry/concurrency/lease expiry, wrong digest, orphan target, and cleanup refusal for unowned DB. **[ ]**

### GYMOS-MIG-023 — owner identity, theme, activation

- **Prerequisites:** 017,018,022. **Sources:** V2 current owner creation and approved identity reuse; S01 fields.
- **Target:** identity/access/theme finalization in operation service.
- **Instructions:** verified existing-login reuse or generated one-time credential; create reciprocal owner access/actor as approved; default Classic theme; activate only after proofs; safe one-time result.
- **Acceptance/test:** new/reused identity, role conflict, fault/retry, no password reset for reused identity, no ACTIVE partial gym. **[ ]**

### GYMOS-MIG-024 — registry and scoped read-only support

- **Prerequisites:** 013,020,023,079,085. **Sources:** S01 UI/admin action, DEC-03/09.
- **Target:** platform registry/support controller/service/contracts and `/admin` UI.
- **Instructions:** aggregate only approved summaries without cross-tenant Prisma joins; create/revoke/expire explicit support context; navigate owner read surfaces; preserve original actor; deny all commands/private health.
- **Acceptance/test:** registry empty/loading/error/pagination if contract uses it; select/exit; expired/forged/wrong gym; every mutation forbidden; audit event linked. **[ ]**

### GYMOS-MIG-025 — suspend/reactivate safely

- **Prerequisites:** 018,023,024,078,080. **Sources:** V1 registry status and Master GymStatus.
- **Target:** platform gym lifecycle command and status UI.
- **Instructions:** idempotent state/version command; block admission/token use; drain tenant pools; retain data; reactivate only after schema/binding/owner checks; audit reason/actor.
- **Acceptance/test:** active requests during transition, stale version, repeat command, failure to drain/verify, other gyms unaffected. **[ ]**

### GYMOS-MIG-026 — versioned schema rollout and repair

- **Prerequisites:** 005,007,009,022,025,081. **Sources:** two Prisma migration trees, manifest/verifier/registry.
- **Target:** controlled rollout/canary/repair orchestration and evidence.
- **Instructions:** immutable version/digest; preflight; additive migration; per-tenant lease/checkpoint/postconditions; canary then batches; never auto-DDL on request; mark mismatch repair-required; compatible rollback is forward repair/isolated restore.
- **Acceptance/test:** mixed versions, failed tenant, tampered checksum, interrupted batch, canary stop, unaffected tenants and admission behavior. **[ ]**

## 7. Security and multi-tenancy checklist

- [ ] SUPER_ADMIN guard plus explicit support policy; no implicit owner mutation.
- [ ] DB names and connection information never accepted/returned publicly.
- [ ] Binding/schema proof precedes access and activation.
- [ ] Suspension stops admission and drains safely.
- [ ] Support excludes private health/credentials and records original actor.
- [ ] DDL/cleanup limited to explicit owned environments/targets.

## 8. Testing and verification

Use owned disposable DB configurations and targeted Playwright admin journeys. Verify operation state/effect counts at each injected failure; two gyms prove isolation. Run relevant unit, tenancy, pool, environment, identity, operation, recovery, contract/client, and browser tests plus changed-package lint/typecheck. Do not use `verify:milestone` against unknown environments.

## 9. Definition of done

- [ ] S01 registry/context and existing create capability work with honest states.
- [ ] Provisioning/suspension/schema rollout are idempotent, resumable, audited, and isolated.
- [ ] All six tasks and negative/fault tests pass; no partial gym is published ACTIVE.
- [ ] Runbooks/evidence distinguish local harness from provider capabilities.

## 10. Agent checkpoints

Stop if DEC-03 is unapproved, provider limits are needed for a production claim, or any test target is not disposable/owned. Do not compensate by deleting an existing user or tenant DB.

## 11. Progress and handoff

- **Current status:** WAITING FOR PREREQUISITES (30 October 2026); decision gates DEC-01/03/06/07/08/09 applicable to this segment are approved.
- **Completed:** none
- **Remaining:** 021–026
- **Files/tests/issues/blockers/decisions:** The 26 October checkpoint below is historical. Current prerequisites are Segment 02 shell/session work; policy decisions 077/079/082/083 are completed. Segment 03 implementation tasks remain Not Started. No Segment 03 application work was performed during Segment 01 closure. Run history is in [SEGMENT_RUN_ISSUES.md](../SEGMENT_RUN_ISSUES.md).
- **Next recommended task:** GYMOS-MIG-021 after segment 02 authorization prerequisites.


## Owner-authorized implementation — 30 October 2026

Segment 03 is IN PROGRESS on `codex/segment-03-platform-lifecycle`, based on verified unmerged Segment 02 revision `0c969eb`. The owner explicitly authorizes independent Segment 03 work while Segment 02 manual acceptance remains PENDING. PRs #1/#2 remain draft/unmerged. Task 021's reservation boundary passed owned API/browser and operation regressions; [checkpoint](../evidence/GYMOS-MIG-021.md). Tasks 022–026 remain. Provider/environment/release choices remain task 087; no real provider resources or Segment 04 work are authorized here.

## Integrated local checkpoint — 31 October 2026

**IN PROGRESS:** all six tasks 021–026 are implemented and locally verified; final hosted checks remain pending. This supersedes the pre-start and first-task progress notes above. Platform integration31/31, production browser10/10, operation10/10, encrypted recovery1/1, unit/build/lint/type/workspace checks pass. [Integrated handoff](../SEGMENT_03_HANDOFF.md) records scope, commands, evidence, remaining manual review and stacked-PR safeguards. No provider or production capability is inferred; task087 remains open. Owner manual acceptance for Segment02 and03 remains pending.
