# GymOS V2 — Authoritative Task Specifications

> **30 October 2026 owner scope update:** [Segment 01 finalization](SEGMENT_01_FINALIZATION.md) supersedes earlier member-plan-delivery exclusions and suspension-earning proposals. Tasks 051/052 include authenticated read-only member access to own assigned workout/meal plans; trainer health access expires after 90 days as specified in DEC-09. Original inventory counts are not re-estimated effort. Owner finalization is recorded; separate accountable review remains pending.

This is the task-detail appendix of [Master Plan §12](MIGRATION_EXECUTION_PLAN.md#12-complete-task-breakdown-with-unique-ids), not a second roadmap. IDs/dependencies/status below are the authoritative definitions; the Master Plan index and tracker are synchronized views. All target paths labeled proposed are future work. Initial planning statuses were **Not Started**; live task statuses and evidence are maintained below. Source inspected23 October2026; no implementation is claimed.

## Task ID: GYMOS-MIG-001

### Task Name
Record a reproducible non-mutating V2 baseline

### Phase
0 — Foundation and architecture readiness

### Objective
Record a reproducible non-mutating V2 baseline. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for R00, A01, S01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for R00, A01, S01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for E01, E02, E03, E04, E05, E06, E07, E08. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
None. This is the first safe executable task.

### Implementation Scope
Record Node/pnpm/resolved package versions, both Git revisions and initial dirty files. Run existing API unit, API/web non-fixing lint and no-emit type checks using installed dependencies; capture exit codes and distinguish toolchain failure from product failure. Inspect milestone cleanup/environment assumptions and record its destructive behavior. Preserve all four untracked maps. Produce a baseline report and a command matrix; do not run provisioning, generation, seeds, migrations or milestone tests in this task.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/README.md](</Users/esanduepa/Desktop/Projects/gymos-v2/README.md>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/package.json](</Users/esanduepa/Desktop/Projects/gymos-v2/package.json>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/pnpm-workspace.yaml](</Users/esanduepa/Desktop/Projects/gymos-v2/pnpm-workspace.yaml>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/package.json](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/package.json>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/package.json](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/package.json>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/scripts/verify-milestone.mjs](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/scripts/verify-milestone.mjs>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/AGENTS.md](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/AGENTS.md>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/vitest.config.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/vitest.config.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/tsconfig.json](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/tsconfig.json>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tsconfig.json](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tsconfig.json>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.controller.spec.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.controller.spec.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-001.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
Each check has command, revision, exit code and redacted output. The existing greeting unit assertion is identified as scaffold coverage. Git/source hashes and database-operation log show no application or database mutation. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- Each check has command, revision, exit code and redacted output. The existing greeting unit assertion is identified as scaffold coverage. Git/source hashes and database-operation log show no application or database mutation.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No dependency installation, database connection, generated code, application fix or V1 execution. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Low

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. Evidence: [evidence/GYMOS-MIG-001.md](evidence/GYMOS-MIG-001.md).

#### Baseline command matrix (future task001 execution)

Run each independently, capture exit code/output, and do not install or fix anything in this task. Commands run from V2 root except `git -C` reference checks. Typecheck disables incremental files. If generated clients/toolchain are unavailable, record the blocker; do not generate or migrate as a shortcut.

```sh
node --version
pnpm --version
git status --short
git rev-parse HEAD
git -C /Users/esanduepa/Desktop/Projects/gymos status --short
git -C /Users/esanduepa/Desktop/Projects/gymos rev-parse HEAD
pnpm --dir apps/api test
pnpm --dir apps/api lint
pnpm --dir apps/web lint
pnpm --dir apps/api exec tsc --noEmit --incremental false
pnpm --dir apps/web exec tsc --noEmit --incremental false
```

Inspect package manifests/lockfile for resolved package versions. Do not run verify:milestone, e2e importing AppModule, provision/create-owner scripts, builds/generators, seed/reset/migrate or a V1 server here. Hash tracked application/config/schema inputs before/after and log only executed commands, with no secret/environment values.

## Task ID: GYMOS-MIG-002

### Task Name
Freeze remaining technical contracts and decision gates

### Phase
0 — Foundation and architecture readiness

### Objective
Freeze remaining technical contracts and decision gates. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C01, C04, C06, C12, C13, C22, C24, C26, C28, C55, C62. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Create shared runtime-validated success/error/pagination/money/identity core DTOs, typed transport conventions and contract tests in proposed packages/contracts and packages/api-client. Keep endpoint paths unprefixed for existing callers; declare compatible evolution and deprecation policy. Link feature-specific DTOs to their owning vertical-slice task rather than inventing all domains here. Triage DEC-01–DEC-12 and mark only dependent work blocked; approved map §14.1 remains authoritative.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed shared package manifests/exports/core schemas/tests under /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts and typed transport/fixtures under /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client; decision index updates only. No feature controllers/pages or Prisma schemas. The previously generated extra web-target sentence was a planning artifact error and is removed; this task owns shared packages only.

### Prisma Changes
None

### NestJS Changes
None: shared contract/typed-client packages and contract fixtures only. C/E references are consumers/examples; do not register their handlers or implement feature behavior in this task.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Schema tests reject unknown fields, invalid enum/date/money input; serialized fixtures contain no password hash, database location or unauthorized health data. Decisions identify owner, result and affected tests. Existing eight method/path pairs have explicit compatibility treatment. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Schema tests reject unknown fields, invalid enum/date/money input; serialized fixtures contain no password hash, database location or unauthorized health data. Decisions identify owner, result and affected tests. Existing eight method/path pairs have explicit compatibility treatment.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during freeze remaining technical contracts and decision gates. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. Evidence: [evidence/GYMOS-MIG-002.md](evidence/GYMOS-MIG-002.md).

## Task ID: GYMOS-MIG-003

### Task Name
Extend master identity and typed tenant access schema

### Phase
0 — Foundation and architecture readiness

### Objective
Extend master identity and typed tenant access schema. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for A01, A02, L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for A01, A02, L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C01, C03, C06. Read task-specific mapped source rows and decisions: DEC-02

### Dependencies
[GYMOS-MIG-002](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-002), [GYMOS-MIG-078](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078)

### Implementation Scope
Extend current master User/GymAccess instead of replacing them: canonical email database constraints, forced-change/security version and access status/version/actorKind/tenantActorId/enrollmentOperationId. Keep composite identity+gym key and one role per gym. Define independent tenant Member/Trainer IDs and reciprocal identity references. Update every identity writer including CLIs and fixtures to the same canonicalization; enforce role conflict and verified reuse without resetting an existing password. Create the minimal Member/Trainer actor metadata schema here so018 can execute reciprocal-tuple/publication policy tests before full enrollment slices. Pending base actors are not publishable;031/036 add full profile fields and orchestration. Before any database verification, create a minimal guarded per-run test setup under apps/api/test/support: explicitly allowlisted local/disposable host, unique owned run prefix, isolated Master and two tenant databases, ownership marker and cleanup restricted to those exact targets. Apply/generate only the current baseline plus this task’s reviewed migrations there. Tasks004–006 reuse this minimal guard for their database tests;007 expands it into full all-role/browser/fault harness after those foundations. Refuse any shared development/production/unknown database; no reset of existing data.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/auth.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/auth.controller.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-access.guard.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-access.guard.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/identity/identity.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/identity/identity.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/identity/identity.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/identity; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/identity.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/identity.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/identity and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/identity. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Master User/GymAccess extensions and canonical email CHECK/unique expression index. Also introduce minimum tenant Member/Trainer actor metadata NOW: independent id, nullable unique identityId, registrationState, enrollmentOperationId, version, status and required basic display name. No cross-DB FK. Full member/trainer profile and enrollment APIs extend these bases in031/036.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed identity boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-02 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Concurrent canonical-email variants create one identity; wrong actor kind/identity tuple and pending access fail closed; one identity has different roles in two gyms. Existing identity credentials remain unchanged on verified link. The minimal setup refuses a wrong host/name/missing run marker and cleans only its owned targets; it exists before003–006 integration checks and is reused by007. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Concurrent canonical-email variants create one identity; wrong actor kind/identity tuple and pending access fail closed; one identity has different roles in two gyms. Existing identity credentials remain unchanged on verified link. The minimal setup refuses a wrong host/name/missing run marker and cleans only its owned targets; it exists before003–006 integration checks and is reused by007.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during extend master identity and typed tenant access schema. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. Evidence: [evidence/GYMOS-MIG-003.md](evidence/GYMOS-MIG-003.md).
## Task ID: GYMOS-MIG-004

### Task Name
Implement durable operation and local receipt primitives

### Phase
0 — Foundation and architecture readiness

### Objective
Implement durable operation and local receipt primitives. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for S01, O03, O06 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for S01, O03, O06; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for E03, C12, C13, C39. Read task-specific mapped source rows and decisions: DEC-04

### Dependencies
[GYMOS-MIG-002](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-002), [GYMOS-MIG-003](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-003), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080)

### Implementation Scope
Implement the database map §§7.1/7.3 operation, immutable request digest, lease/version CAS, safe-result and typed checkpoint contracts. Provisioning scope remains provision-gym:<normalized slug> for its lifetime, with same-key/different-slug conflict. Add tenant CommandReceipt unique sourceMasterOperationId and deterministic event-key helpers. Claim receipts before effects; same key/body replays safe result, changed body conflicts, different key cannot duplicate a terminal domain effect. Never store plaintext credentials in request/result evidence.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/operations/operations.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/operations/operations.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/operations/operations.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/operations; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/operations.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/operations.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/operations and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/operations. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Proposed M.Operation/M.PlatformAuditLog; T.CommandReceipt/T.AuditLog; unique operation scope/key and required UNIQUE eventKey.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed operations boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-04 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Crash before/after each checkpoint resumes the same IDs; lease expiry reconciles evidence; changed digest returns409; audit-key content mismatch is integrity failure; no skipDuplicates masking. Safe results redact secrets. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Crash before/after each checkpoint resumes the same IDs; lease expiry reconciles evidence; changed digest returns409; audit-key content mismatch is integrity failure; no skipDuplicates masking. Safe results redact secrets.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during implement durable operation and local receipt primitives. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. Evidence: [GYMOS-MIG-004](evidence/GYMOS-MIG-004.md). Completion recorded 24 October 2026.
## Task ID: GYMOS-MIG-005

### Task Name
Verify tenant binding and actual installed schema

### Phase
0 — Foundation and architecture readiness

### Objective
Verify tenant binding and actual installed schema. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C06. Read task-specific mapped source rows and decisions: DEC-04 DEC-05

### Dependencies
[GYMOS-MIG-003](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-003), [GYMOS-MIG-004](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-004), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-081](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081)

### Implementation Scope
Add distinct tenant SchemaState and GymConfiguration singletons and immutable reviewed template manifests. A verifier compares actual _prisma_migrations names/checksums and schema/constraint postconditions to the pinned manifest before VERIFIED. Resolve master gym/access, verify physical masterGymId binding, expected/applied version/digest and API compatibility before ordinary reads/commands. Missing/mismatched metadata and Master outages return503; no fallback database or migration-on-read. Recovery metadata access is separately scoped.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/tenant-database.service.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/tenant-database.service.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/database.service.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/database.service.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-access.guard.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-access.guard.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/main.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/main.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/tenancy/tenancy.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/tenancy/tenancy.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/tenancy/tenancy.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/tenancy; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/tenancy.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/tenancy.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/tenancy and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/tenancy. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
M.Gym.expectedTenantSchemaVersion; T.SchemaState distinct from business config.version and T.GymConfiguration.masterGymId.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed tenancy boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-04 DEC-05 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Swap two registry targets, remove marker, mismatch checksum/version, leave APPLYING/FAILED and interrupt checkpoint: ordinary access denied with zero domain queries. Reverification recovers a lost master observation without claiming source SQL was applied. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Swap two registry targets, remove marker, mismatch checksum/version, leave APPLYING/FAILED and interrupt checkpoint: ordinary access denied with zero domain queries. Reverification recovers a lost master observation without claiming source SQL was applied.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during verify tenant binding and actual installed schema. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. Evidence: [GYMOS-MIG-005](evidence/GYMOS-MIG-005.md). Completion recorded 24 October 2026.

## Task ID: GYMOS-MIG-006

### Task Name
Bound tenant pools and implement safe shutdown

### Phase
0 — Foundation and architecture readiness

### Objective
Bound tenant pools and implement safe shutdown. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: DEC-05

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001), [GYMOS-MIG-005](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-005), [GYMOS-MIG-081](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081)

### Implementation Scope
Extend TenantDatabaseService cache with explicit per-client pool limits, maximum resident/active tenants, idle eviction that never disconnects in-flight work, admission/backpressure and connection acquisition/query timeouts. Keep server-resolved database names. Register signal shutdown hooks, drain requests and disconnect pools. Measure capacity per API replica and reserve Master/provisioning/admin connections. Do not assume one cached client equals one connection.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/tenant-database.service.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/tenant-database.service.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/database.service.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/database.service.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-access.guard.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-access.guard.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/main.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/main.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/tenancy/tenancy.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/tenancy/tenancy.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/tenancy/tenancy.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/tenancy; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/tenancy.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/tenancy.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/tenancy and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/tenancy.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed tenancy boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-05 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Load more tenant keys than the cap, hold an active request during eviction and terminate process: bounded connections, no cross-routing, active request completes/drains and clients close. Saturation produces retryable503 with no leaked database URL. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Load more tenant keys than the cap, hold an active request during eviction and terminate process: bounded connections, no cross-routing, active request completes/drains and clients close. Saturation produces retryable503 with no leaked database URL.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during bound tenant pools and implement safe shutdown. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. Evidence: [evidence/GYMOS-MIG-006.md](evidence/GYMOS-MIG-006.md).

## Task ID: GYMOS-MIG-007

### Task Name
Build disposable two-gym database and browser harness

### Phase
0 — Foundation and architecture readiness

### Objective
Build disposable two-gym database and browser harness. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for S01, O03, O06, M03, T01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for S01, O03, O06, M03, T01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for E01, E03, E04, E05, E06, E07, E08. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-002](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-002), [GYMOS-MIG-004](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-004), [GYMOS-MIG-005](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-005), [GYMOS-MIG-006](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-006)

### Implementation Scope
Create per-run isolated Master and two tenant databases with synthetic all-role/multi-gym accounts, >100 people, inactive/forced-change and related/unrelated actors. Guard database host/name/prefix and cleanup ownership before adopting existing milestone coverage; prohibit shared development or production targets. Add real-browser and database-integration harnesses with pinned clock/currency/time zone and fault injection. Empty GETs must create nothing. Seed only implemented schema, extending fixtures per later task.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.controller.spec.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.controller.spec.ts>)

### Expected Files to Create or Modify
Proposed /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/support/disposable-environment.ts (extend minimal003 guard), /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/fixtures, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tests, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/playwright.config.ts and guarded adaptation of /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/scripts/verify-milestone.mjs. No testing Nest controller/module or public test API.Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/testing and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/testing. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Test-only isolated databases/fixtures; no V1 data import.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed testing boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Wrong host/name and missing run marker refuse mutation; parallel test runs never share rows; cleanup removes only owned fixtures. Verify physical databases and isolation, not just HTML. Baseline can be rerun after failure without deleting unrelated data. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Wrong host/name and missing run marker refuse mutation; parallel test runs never share rows; cleanup removes only owned fixtures. Verify physical databases and isolation, not just HTML. Baseline can be rerun after failure without deleting unrelated data.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during build disposable two-gym database and browser harness. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. Evidence: [evidence/GYMOS-MIG-007.md](evidence/GYMOS-MIG-007.md).

## Task ID: GYMOS-MIG-008

### Task Name
Add workspace checks and isolated CI

### Phase
0 — Foundation and architecture readiness

### Objective
Add workspace checks and isolated CI. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001), [GYMOS-MIG-002](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-002), [GYMOS-MIG-007](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-007)

### Implementation Scope
Add separate build/typecheck/lint/unit/integration/browser jobs with pinned Node24/pnpm and cache keys including lockfile. Give database integration disposable services and scoped secrets; keep build commands free of migrations/seeds/CREATE DATABASE. Add secret scanning, dependency review and artifact retention. Verify currently empty shared directories need real manifests/exports before workspace imports. Document environment key requirements without values.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed /Users/esanduepa/Desktop/Projects/gymos-v2/.github/workflows/ci.yml, workspace/app package scripts only when necessary, shared package manifests/exports, /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/runbooks/ci.md. No CI Nest controller/module or API client.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed ci boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
A PR runs reproducibly from clean install; missing required key fails clearly; ordinary build cannot invoke environment-changing scripts. CI reports skipped optional suites and uploads redacted evidence. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- A PR runs reproducibly from clean install; missing required key fails clearly; ordinary build cannot invoke environment-changing scripts. CI reports skipped optional suites and uploads redacted evidence.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during add workspace checks and isolated ci. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
In Progress — implementation and local checks are complete; hosted pull-request run remains pending because no Git remote is configured.

## Task ID: GYMOS-MIG-009

### Task Name
Prove local/staging tenant backup and isolated restore

### Phase
0 — Foundation and architecture readiness

### Objective
Prove local/staging tenant backup and isolated restore. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: DEC-05

### Dependencies
[GYMOS-MIG-005](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-005), [GYMOS-MIG-007](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-007), [GYMOS-MIG-081](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081)

### Implementation Scope
Create individual-tenant and Master backup/restore runbooks and guarded tooling with encrypted storage, ownership manifest, retention and checksum verification. Restore a tenant into a new database, verify binding/version/domain counts and restore Master references through an explicit reviewed registry switch. Capture RPO/RTO measurements; do not overwrite a live tenant or assume an app revert restores data. Establish this before feature rollout, then repeat production drill in task070.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed guarded /Users/esanduepa/Desktop/Projects/gymos-v2/infrastructure/scripts/backup-tenant.mjs, /Users/esanduepa/Desktop/Projects/gymos-v2/infrastructure/scripts/restore-tenant.mjs, associated script tests and /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/runbooks/backup-restore.md. No recovery HTTP controller/module; deployment cutover remains reviewed operator procedure.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed recovery boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-05 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Backup A, mutate isolated fixture, restore A to a new target and prove B unchanged. Missing/corrupt backup and wrong-gym binding refuse cutover. Registry switch rollback and access suspension are demonstrated. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Backup A, mutate isolated fixture, restore A to a new target and prove B unchanged. Missing/corrupt backup and wrong-gym binding refuse cutover. Registry switch rollback and access suspension are demonstrated.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during prove local/staging tenant backup and isolated restore. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed for the local disposable recovery drill; managed/staging recovery remains a separate GYMOS-MIG-070 gate. Evidence: [GYMOS-MIG-009.md](evidence/GYMOS-MIG-009.md).

## Task ID: GYMOS-MIG-010

### Task Name
Track exposed V1 credential remediation and V2 secret hygiene

### Phase
0 — Foundation and architecture readiness

### Objective
Track exposed V1 credential remediation and V2 secret hygiene. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Open a redacted security record for the literal remote database credential at V1/scripts/check-db.js:6 and known demo credentials. Identify credential owner, revoke/rotate, investigate reuse/access and assess history/deploy-artifact remediation. This task may prepare and track the follow-up; external rotation and any V1 change require the owner’s separate authorization. Scan V2 without logging values and ensure no demo credential is reused. Never run the V1 script.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-010.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
Evidence records affected secret identifiers only, rotation/revocation status and owner acknowledgment; unresolved external rotation remains an explicit release blocker. Secret scan logs/artifacts contain no credential values. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- Evidence records affected secret identifiers only, rotation/revocation status and owner acknowledgment; unresolved external rotation remains an explicit release blocker. Secret scan logs/artifacts contain no credential values.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No V1 edit, remote database login or unapproved account/secret mutation. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Blocked. Evidence: [evidence/GYMOS-MIG-010.md](evidence/GYMOS-MIG-010.md).

## Task ID: GYMOS-MIG-011

### Task Name
Create V1 Classic semantic tokens

### Phase
1 — Shared UI and white-label foundation

### Objective
Create V1 Classic semantic tokens. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for L01, L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for L01, L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C05. Read task-specific mapped source rows and decisions: DEC-10

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001), [GYMOS-MIG-002](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-002), [GYMOS-MIG-086](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-086)

### Implementation Scope
Create an internal V1 Classic baseline using system typography, existing spacing, green/charcoal hierarchy and semantic brand/surface/text/border/status/focus tokens. Map fixed V1 classes per UI map §9; apply primary/logo over safe defaults. Semantic danger/warning/success remain distinct from brand. Preserve current V2 dynamic primary/logo capability. Internal preset is not an expanded user theme editor.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gyms.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gyms.controller.ts>)

### Expected Files to Create or Modify
Proposed /Users/esanduepa/Desktop/Projects/gymos-v2/packages/theme-tokens/src/classic.ts, package exports and /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/globals.css; no backend controller or extended theme schema.Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/theme and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/theme.

### Prisma Changes
None

### NestJS Changes
None; shared presentation/token task consumes existing typed backend contracts only.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-10 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Two fixture gyms render distinct brand accents with identical geometry; invalid/missing brand falls back safely. Status colors and contrast pass agreed thresholds at1440/768/390/320 widths. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Two fixture gyms render distinct brand accents with identical geometry; invalid/missing brand falls back safely. Status colors and contrast pass agreed thresholds at1440/768/390/320 widths.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during create v1 classic semantic tokens. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed 25 October 2026. V1 Classic tokens, safe gym-color fallback, contrast-aware foregrounds, visible focus, and two-gym responsive browser evidence are recorded in [GYMOS-MIG-011.md](evidence/GYMOS-MIG-011.md). Implementation revision: `06b8207`.

## Task ID: GYMOS-MIG-012

### Task Name
Extract accessible shared UI primitives

### Phase
1 — Shared UI and white-label foundation

### Objective
Extract accessible shared UI primitives. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for L02, X01, X02, X03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for L02, X01, X02, X03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-011](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-011)

### Implementation Scope
Adapt buttons, compact fields, feedback, cards, table/pager, badges, tabs, confirmation/modal shell and chart frame using the eleven shared V1 files and extraction patterns. Preserve variants, required labels, pending/errors and empty/loading states. Trap/restore modal focus, support Escape/backdrop per original workflow, and prevent background focus in mobile drawer. Do not migrate unused FormattedDate or TrainerPayChart as required UI.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed shared accessible primitives under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/ui and component tests; no backend/schema change.Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/ui and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/ui.

### Prisma Changes
None

### NestJS Changes
None; shared presentation/token task consumes existing typed backend contracts only.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Keyboard-only dialog/tab/table interactions pass; errors retain draft and do not close modal; pending prevents accidental duplicate UI intent while backend remains responsible for idempotency. Narrow table/tab layout remains usable. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Keyboard-only dialog/tab/table interactions pass; errors retain draft and do not close modal; pending prevents accidental duplicate UI intent while backend remains responsible for idempotency. Narrow table/tab layout remains usable.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during extract accessible shared ui primitives. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed 25 October 2026. Shared accessible controls, their use on current V2 screens, and focused keyboard/error/pending/narrow-width browser evidence are recorded in [GYMOS-MIG-012.md](evidence/GYMOS-MIG-012.md). Implementation revision: `76db2ac`.

## Task ID: GYMOS-MIG-013

### Task Name
Integrate role/gym dashboard chrome

### Phase
1 — Shared UI and white-label foundation

### Objective
Integrate role/gym dashboard chrome. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for L02, S01, O01, T01, M01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for L02, S01, O01, T01, M01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C01, C05, C06. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-019](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-019)

### Implementation Scope
Recreate DashboardChrome/Sidebar/Header geometry, role-appropriate links, current path selection, responsive drawer/body lock and support banner with server-provided actor/gym/theme context. Key state/cache by identity+gym+role and clear stale async work on switch. Hide subscription/payment navigation. Never fetch owner member list to render MEMBER entry. Keep token server-side and sanitize avatar/name projection.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/dashboard.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/dashboard.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/shell/shell.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/shell/shell.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/shell/shell.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/shell; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/shell.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/shell.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/shell and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/shell.

### Prisma Changes
None

### NestJS Changes
None; shared presentation/token task consumes existing typed backend contracts only.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
All roles enter allowed homes, drawer closes on path change/Escape, old-gym results cannot overwrite selected gym, and denied route gets role/gym-aware error destination. Selected-gym theme does not imply selected-gym authorization. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- All roles enter allowed homes, drawer closes on path change/Escape, old-gym results cannot overwrite selected gym, and denied route gets role/gym-aware error destination. Selected-gym theme does not imply selected-gym authorization.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during integrate role/gym dashboard chrome. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-014

### Task Name
Capture safe V1 baseline fixtures and visual manifest

### Phase
1 — Shared UI and white-label foundation

### Objective
Capture safe V1 baseline fixtures and visual manifest. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for A01, A02, S01, O01, O02, O03, O04, O05, O06, O07, O08, O09, O10, O11, O12, O13, O14, T01, T02, T03, T04, T05, T06, M01, M02, M03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for A01, A02, S01, O01, O02, O03, O04, O05, O06, O07, O08, O09, O10, O11, O12, O13, O14, T01, T02, T03, T04, T05, T06, M01, M02, M03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-007](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-007), [GYMOS-MIG-011](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-011), [GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012)

### Implementation Scope
Capture all26 rendered V1 references and states from a disposable read-only copy/runtime outside the original V1 checkout. Prepare matching synthetic fixtures without importing customer/development records, including any read-side-effect rows in that copy. Use UI map §11 capture manifest, frozen clock and1440x1000,768x1024,390x844,320px stress viewports. Redact one-time secrets. Record deferred O14/payment controls as reference-only, and do not claim uncaptured screenshots exist.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/analytics/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/analytics/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/analytics.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/analytics.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/audit.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/audit.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/dashboard.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/dashboard.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/subscription.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/subscription.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Verification/evidence files (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-014; scoped test fixtures/cases under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/visual and /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tests/visual. Fixes return to owning feature task; no unrelated source change.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Manifest lists source revision, fixture/browser/font/device scale/viewport/state, actual image path and capture outcome. Original V1 Git/hash comparison is unchanged; conditional dialogs/empty/error/long-content states are represented. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Manifest lists source revision, fixture/browser/font/device scale/viewport/state, actual image path and capture outcome. Original V1 Git/hash comparison is unchanged; conditional dialogs/empty/error/long-content states are represented.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during capture safe v1 baseline fixtures and visual manifest. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No server startup, build output, seed or database mutation in original V1; no invented screenshots. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed 25 October 2026. The disposable synthetic V1 fixture, 369-image manifest, 104 required baseline images, conditional-state gallery, independent verifier and original-checkout preservation proof are recorded in [GYMOS-MIG-014.md](evidence/GYMOS-MIG-014.md).

## Task ID: GYMOS-MIG-015

### Task Name
Integrate basic gym branding editor and fallback

### Phase
1 — Shared UI and white-label foundation

### Objective
Integrate basic gym branding editor and fallback. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O12, L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O12, L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C05. Read task-specific mapped source rows and decisions: DEC-10

### Dependencies
[GYMOS-MIG-011](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-011), [GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012), [GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-024](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-024), [GYMOS-MIG-027](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-027), [GYMOS-MIG-086](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-086)

### Implementation Scope
Add owner-only primary-color and nullable HTTPS-logo form to settings using current GET/PATCH theme foundation. Add optimistic theme version, platform audit and safe public DTO; validate six-hex and HTTPS length, handle inaccessible logo fallback without server-side arbitrary fetch. Refresh selected-gym shell/login-safe projection only; public theme includes no connection/identity data. Extended presets/fonts/modes stay deferred.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gyms.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gyms.controller.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/theme/theme.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/theme/theme.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/theme/theme.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/theme; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/theme.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/theme.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/theme and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/theme. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
M.Theme version; platform audit shares master transaction.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed theme boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-10 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Owner A changes brand without touching B; trainer/member/support writes403; stale version409; invalid URL422; missing logo/theme preserves usable layout and accessible status colors. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Owner A changes brand without touching B; trainer/member/support writes403; stale version409; invalid URL422; missing logo/theme preserves usable layout and accessible status colors.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during integrate basic gym branding editor and fallback. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-016

### Task Name
Extend login with session policy and forced-change enforcement

### Phase
2 — Authentication, identity and navigation

### Objective
Extend login with session policy and forced-change enforcement. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for A01, A02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for A01, A02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for E01, C01, C03. Read task-specific mapped source rows and decisions: DEC-02

### Dependencies
[GYMOS-MIG-002](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-002), [GYMOS-MIG-003](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-003), [GYMOS-MIG-007](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-007), [GYMOS-MIG-078](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078)

### Implementation Scope
Retain Argon2id/JWT issuer/audience validation and login throttles. Implement session identity projection, required-change restrictions, auth/security version and approved expiry/revocation policy; enforce these API-side on every protected handler. Resolve current active gyms and safe actor links, not stale token roles. Specify cookie-only vs API logout decision and optional C02 before adding revocation endpoint. Login failures avoid account enumeration.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/auth.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/auth.controller.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/auth-token.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/auth-token.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/super-admin.guard.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/super-admin.guard.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/auth/auth.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/auth/auth.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/auth/auth.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/auth; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/auth.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/auth.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/auth and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/auth. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Master auth/session security fields from003; session record only if DEC-02 chooses it.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed auth boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-02 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Expired/tampered/revoked tokens401, forced-change account can only reach approved session/change/logout operations, inactive access denied immediately within approved bound. No hash or bearer token reaches browser component props. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Expired/tampered/revoked tokens401, forced-change account can only reach approved session/change/logout operations, inactive access denied immediately within approved bound. No hash or bearer token reaches browser component props.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during extend login with session policy and forced-change enforcement. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed — see [GYMOS-MIG-016 evidence](evidence/GYMOS-MIG-016.md).

## Task ID: GYMOS-MIG-017

### Task Name
Implement temporary-credential issue/change/reissue

### Phase
2 — Authentication, identity and navigation

### Objective
Implement temporary-credential issue/change/reissue. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for A02, O03, O06 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for A02, O03, O06; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C03, C12, C13. Read task-specific mapped source rows and decisions: DEC-02

### Dependencies
[GYMOS-MIG-004](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-004), [GYMOS-MIG-016](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-016), [GYMOS-MIG-078](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078)

### Implementation Scope
Generate cryptographic temporary credentials for new identities, show once to authorized owner on first known successful handoff and require password change. Store only hash and safe delivery metadata. Lost response/secret uses authorized rotation and invalidates prior secret; never replay plaintext from operation receipts. Existing verified login reuse gets no reset. Preserve V1 current/new/confirm feedback and security validation while exact lifetime/verification evidence follow DEC-02. Owner reissue is limited to a new identity created by the same enrollment operation while its temporary handoff is still unacknowledged/required-change. It must not reset a verified pre-existing identity or a normal active account used in other gyms; those require the reviewed central account-security permission/workflow.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/auth.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/auth.controller.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/auth-token.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/auth-token.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/credentials/credentials.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/credentials/credentials.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/credentials/credentials.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/credentials; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/credentials.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/credentials.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/credentials and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/credentials. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Proposed M.CredentialDelivery linked UNIQUE operationId plus required-change/security version.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed credentials boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-02 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
First handoff only once, refresh/log/receipt contains no plaintext, old secret fails after reissue, existing multi-gym password unchanged and forced change enforced in direct API calls. Lost-response recovery reports committed state before rotation. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- First handoff only once, refresh/log/receipt contains no plaintext, old secret fails after reissue, existing multi-gym password unchanged and forced change enforced in direct API calls. Lost-response recovery reports committed state before rotation.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during implement temporary-credential issue/change/reissue. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed — see [GYMOS-MIG-017 evidence](evidence/GYMOS-MIG-017.md).

## Task ID: GYMOS-MIG-018

### Task Name
Enforce operational actor and resource authorization

### Phase
2 — Authentication, identity and navigation

### Objective
Enforce operational actor and resource authorization. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for L02, O02, T02, M03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for L02, O02, T02, M03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C06. Read task-specific mapped source rows and decisions: DEC-02 DEC-04

### Dependencies
[GYMOS-MIG-003](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-003), [GYMOS-MIG-004](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-004), [GYMOS-MIG-005](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-005), [GYMOS-MIG-016](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-016), [GYMOS-MIG-078](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080)

### Implementation Scope
Extend GymAccessGuard with current ACTIVE access/operation and reciprocal actor tuple. Master ACTIVE + local registration COMPLETE is required to publish an operational actor. Keep owner BASIC contact/history and pending recovery projections separate. Implement explicit role/relationship policies and safe404 for foreign IDs; no platform Super Admin blanket OWNER bypass. Fail closed on Master outage and enforce reviewed version/cache/revocation visibility bound.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-access.guard.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-access.guard.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/super-admin.guard.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/super-admin.guard.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/access/access.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/access/access.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/access/access.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/access; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/access.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/access.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/access and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/access.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed access boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-02 DEC-04 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Pending master+COMPLETE tenant never appears in selectable directories/counts; mismatched actor IDs and foreign-gym IDs cannot query data. Owner recovery and historical accounting remain honest; unrelated trainer/support never sees health notes. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Pending master+COMPLETE tenant never appears in selectable directories/counts; mismatched actor IDs and foreign-gym IDs cannot query data. Owner recovery and historical accounting remain honest; unrelated trainer/support never sees health notes.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during enforce operational actor and resource authorization. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed — see [GYMOS-MIG-018 evidence](evidence/GYMOS-MIG-018.md).

## Task ID: GYMOS-MIG-019

### Task Name
Implement role-aware root, gym selection and protected navigation

### Phase
2 — Authentication, identity and navigation

### Objective
Implement role-aware root, gym selection and protected navigation. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for R00, A01, T00, M00, L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for R00, A01, T00, M00, L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C01, C06. Read task-specific mapped source rows and decisions: DEC-10

### Dependencies
[GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012), [GYMOS-MIG-016](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-016), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-086](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-086)

### Implementation Scope
Replace V2 marketing scaffold root with V1-style authenticated entry. Provide explicit no-gym and multi-gym choices, preserve one role per gym, canonical /gyms/[slug]/{owner,trainer,member} routes and role redirects. Centralize URL builders including notification targets, callbacks and support return. Protect pages using server API context and show forbidden/expired/missing states distinctly. Never infer authorization from slug or route alone.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/navigation/navigation.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/navigation/navigation.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/navigation/navigation.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/navigation; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/navigation.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/navigation.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/navigation and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/navigation.

### Prisma Changes
None

### NestJS Changes
None; shared presentation/token task consumes existing typed backend contracts only.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-10 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Single/multi/no-gym identities and platform admin reach correct destinations; unsafe callback blocked; owner→member gym switch clears caches/forms/polls and performs no forbidden roster request. Legacy URL handling follows DEC-10. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Single/multi/no-gym identities and platform admin reach correct destinations; unsafe callback blocked; owner→member gym switch clears caches/forms/polls and performs no forbidden roster request. Legacy URL handling follows DEC-10.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during implement role-aware root, gym selection and protected navigation. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed — see [GYMOS-MIG-019 evidence](evidence/GYMOS-MIG-019.md).

## Task ID: GYMOS-MIG-020

### Task Name
Harden web session transport and safe logout

### Phase
2 — Authentication, identity and navigation

### Objective
Harden web session transport and safe logout. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for A01, A02, L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for A01, A02, L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C01, C02, C03. Read task-specific mapped source rows and decisions: DEC-02 DEC-11

### Dependencies
[GYMOS-MIG-016](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-016), [GYMOS-MIG-017](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-017), [GYMOS-MIG-019](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-019), [GYMOS-MIG-078](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078), [GYMOS-MIG-087](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-087)

### Implementation Scope
Keep HttpOnly Secure production SameSite cookie and server-only API adapters; validate responses at runtime rather than casts. Thin Server Actions perform transport/form mapping and authorized refresh, never business settlement. Implement approved logout/expiry behavior, origin/CSRF checks for same-origin mutations, safe error redaction and no-store private responses. Define backend/mobile token transport policy independently of browser cookie transport.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/web-auth/web-auth.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/web-auth/web-auth.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/web-auth/web-auth.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/web-auth; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/web-auth.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/web-auth.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/web-auth and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/web-auth.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed web-auth boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-02 DEC-11 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Cookie cleared and server session revoked when policy requires; back/cached pages cannot disclose old identity data; forged origin/cross-site state change rejected; token absent from JS/URL/log/download output. Stale responses discarded after logout. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Cookie cleared and server session revoked when policy requires; back/cached pages cannot disclose old identity data; forged origin/cross-site state change rejected; token absent from JS/URL/log/download output. Stale responses discarded after logout.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during harden web session transport and safe logout. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-021

### Task Name
Reserve idempotent provisioning operations

### Phase
3 — Platform administration and provisioning

### Objective
Reserve idempotent provisioning operations. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for S01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for S01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for E03. Read task-specific mapped source rows and decisions: DEC-04 DEC-05

### Dependencies
[GYMOS-MIG-004](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-004), [GYMOS-MIG-005](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-005), [GYMOS-MIG-016](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-016), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-081](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081)

### Implementation Scope
Adapt existing POST/admin/gyms to a durable operation request with currency/timezone, generated owner-credential intent and pinned tenant manifest. Lookup immutable slug/key before duplicate checks; persist one generated databaseName and master Gym reservation in the same master transaction. Return operationId/pending outcome and proposed authorized status/retry API. Conflicting keys/bodies cannot adopt another gym; do not generate new target on retry. Adapt the existing web create-form transport minimally to display durable pending/status/error outcomes from this API change; defer full registry/support presentation to024.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-provisioning.service.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-provisioning.service.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/admin.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/admin.controller.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/provisioning/provisioning.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/provisioning/provisioning.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/provisioning/provisioning.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/provisioning; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/provisioning.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/provisioning.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/provisioning and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/provisioning. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
M.Operation/Gym provisioning fields and key constraints from004/005.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed provisioning boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-04 DEC-05 before dependent behavior is coded.

### Authorization Requirements
Platform SUPER_ADMIN only for registry/provision/lifecycle; support is explicit read-only context, never tenant mutation bypass.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Concurrent same request yields one operation/gym/databaseName; changed slug/body same key409; lost response finds same operation after Gym exists. Owner identity is verified/reused according to policy rather than duplicate-email rejection. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Concurrent same request yields one operation/gym/databaseName; changed slug/body same key409; lost response finds same operation after Gym exists. Owner identity is verified/reused according to policy rather than duplicate-email rejection.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during reserve idempotent provisioning operations. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-022

### Task Name
Move physical provisioning to recoverable worker

### Phase
3 — Platform administration and provisioning

### Objective
Move physical provisioning to recoverable worker. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for S01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for S01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for E03. Read task-specific mapped source rows and decisions: DEC-04 DEC-05

### Dependencies
[GYMOS-MIG-006](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-006), [GYMOS-MIG-007](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-007), [GYMOS-MIG-009](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-009), [GYMOS-MIG-021](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-021), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-081](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081)

### Implementation Scope
Extend existing CREATE DATABASE + Prisma deploy sequence in a bounded worker, using persisted target, least-privilege provisioner and pinned reviewed artifact. Verify ownership before using an existing target; record actual template evidence and binding before checkpoint. Handle process death, DDL failure, migration failure and Master outage with retryable/repair states. Recovery may inspect its target but cannot bypass ordinary tenant access gates. Do not auto-drop ambiguous databases.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-provisioning.service.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-provisioning.service.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/admin.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/admin.controller.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/provisioning/provisioning.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/provisioning/provisioning.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/provisioning/provisioning.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/provisioning; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/provisioning.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/provisioning.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/provisioning and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/provisioning. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
T.SchemaState/GymConfiguration initialized and verified; no reset or blanket DROP.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed provisioning boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-04 DEC-05 before dependent behavior is coded.

### Authorization Requirements
Platform SUPER_ADMIN only for registry/provision/lifecycle; support is explicit read-only context, never tenant mutation bypass.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Fault-inject each external success before checkpoint; resume same database with one schema/binding and no duplicate owner. Unknown target ownership→REPAIR_REQUIRED. API request does not block on a migration child process. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Fault-inject each external success before checkpoint; resume same database with one schema/binding and no duplicate owner. Unknown target ownership→REPAIR_REQUIRED. API request does not block on a migration child process.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during move physical provisioning to recoverable worker. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-023

### Task Name
Finalize owner identity, theme and gym activation

### Phase
3 — Platform administration and provisioning

### Objective
Finalize owner identity, theme and gym activation. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for S01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for S01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for E03, C05, C06. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-017](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-017), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-022](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-022)

### Implementation Scope
After verified tenant readiness, atomically finalize owner User or verified reuse, OWNER access, theme, platform audit and master operation COMPLETE/ACTIVE. Validate one-role conflict and preserve existing identity password. One-time credential handoff follows017 and is not persisted in safeResult. Reconcile failures between tenant verification/master activation without duplicating physical work or deleting a global identity used elsewhere.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-provisioning.service.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gym-provisioning.service.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/admin.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/admin.controller.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/provisioning/provisioning.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/provisioning/provisioning.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/provisioning/provisioning.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/provisioning; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/provisioning.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/provisioning.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/provisioning and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/provisioning. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Master-local activation transaction only; no cross-database transaction.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed provisioning boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Platform SUPER_ADMIN only for registry/provision/lifecycle; support is explicit read-only context, never tenant mutation bypass.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Partial finalization rolls back locally; committed tenant with failed Master stays unavailable; retry activates exactly one owner/access/theme. Two-gyms identity login works; changed existing credentials count remains zero. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Partial finalization rolls back locally; committed tenant with failed Master stays unavailable; retry activates exactly one owner/access/theme. Two-gyms identity login works; changed existing credentials count remains zero.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during finalize owner identity, theme and gym activation. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-024

### Task Name
Migrate registry and scoped read-only support

### Phase
3 — Platform administration and provisioning

### Objective
Migrate registry and scoped read-only support. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for S01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for S01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for E02, C04, C07. Read task-specific mapped source rows and decisions: DEC-03 DEC-09

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-020](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-020), [GYMOS-MIG-023](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-023), [GYMOS-MIG-079](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-079), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Preserve V2 gym-create capability within V1 registry design; add true member counts/pagination/provisioning progress/recovery links with safe DTOs. Implement proposed POST/admin/support-sessions and DELETE/admin/support-sessions/:id with original actor, selected gym, reason, expiry and audit. Support reads only approved owner-summary projections; no mutation permission or private health data. Exit invalidates context and pending requests. Cross-gym summaries use bounded jobs/read models, not unbounded request fan-out.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/admin.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/admin.controller.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/super-admin.guard.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/super-admin.guard.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/admin/admin.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/admin/admin.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/admin/admin.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/admin; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/admin.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/admin.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/admin and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/admin. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Proposed M.SupportSession/M.PlatformAuditLog and versioned summary projection.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed admin boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-03 DEC-09 before dependent behavior is coded.

### Authorization Requirements
Platform SUPER_ADMIN only for registry/provision/lifecycle; support is explicit read-only context, never tenant mutation bypass.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Platform account without GymAccess may enter approved support only; all tenant writes403; expiry/exit denies subsequent calls. Registry Members counts members rather than all users and summary failures show stale/unavailable, not fabricated zeros. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Platform account without GymAccess may enter approved support only; all tenant writes403; expiry/exit denies subsequent calls. Registry Members counts members rather than all users and summary failures show stale/unavailable, not fabricated zeros.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate registry and scoped read-only support. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-025

### Task Name
Suspend and reactivate tenant access safely

### Phase
3 — Platform administration and provisioning

### Objective
Suspend and reactivate tenant access safely. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for S01, L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for S01, L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C06. Read task-specific mapped source rows and decisions: DEC-02 DEC-04

### Dependencies
[GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-023](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-023), [GYMOS-MIG-024](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-024), [GYMOS-MIG-078](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080)

### Implementation Scope
Add proposed platform-only gym lifecycle command with expected version, reason and audit. Suspension blocks new context and ordinary tenant reads/writes, drains affected cached context without deleting DB/history. Reactivation requires verified schema/binding and operational checks. Preserve gym suspension versus member/trainer business status distinctions. Document queued operation handling and recovery privilege while suspended.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/tenant-lifecycle/tenant-lifecycle.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/tenant-lifecycle/tenant-lifecycle.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/tenant-lifecycle/tenant-lifecycle.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/tenant-lifecycle; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/tenant-lifecycle.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/tenant-lifecycle.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/tenant-lifecycle and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/tenant-lifecycle. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Master Gym version/status and platform audit.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed tenant-lifecycle boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-02 DEC-04 before dependent behavior is coded.

### Authorization Requirements
Platform SUPER_ADMIN only for registry/provision/lifecycle; support is explicit read-only context, never tenant mutation bypass.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Existing cookie/pool cannot bypass suspension; B unaffected; stale transition409; reactivation with bad marker503. Audit preserves actor/reason; no database deletion or false subscription entitlement inference. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Existing cookie/pool cannot bypass suspension; B unaffected; stale transition409; reactivation with bad marker503. Audit preserves actor/reason; no database deletion or false subscription entitlement inference.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during suspend and reactivate tenant access safely. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-026

### Task Name
Orchestrate versioned tenant schema rollout and repair

### Phase
3 — Platform administration and provisioning

### Objective
Orchestrate versioned tenant schema rollout and repair. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: DEC-05

### Dependencies
[GYMOS-MIG-005](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-005), [GYMOS-MIG-007](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-007), [GYMOS-MIG-009](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-009), [GYMOS-MIG-022](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-022), [GYMOS-MIG-025](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-025), [GYMOS-MIG-081](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081)

### Implementation Scope
Implement explicit master+tenant deploy tooling: immutable manifest/version, per-tenant lease/progress, expected target, canary batch, postcondition verification and actual installed evidence. Failed tenant remains gated while healthy gyms continue. Resume interrupted migrations only after evidence review; never edit applied migration SQL or mark resolved automatically. Preserve migration histories by default; squash only with explicit DB14 approval. Keep schema deploy outside builds.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/schema-rollout/schema-rollout.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/schema-rollout/schema-rollout.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/schema-rollout/schema-rollout.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/schema-rollout; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/schema-rollout.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/schema-rollout.ts.  Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Migration manifest/SchemaState/Gym expected-version lifecycle; additive migrations with custom constraints.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed schema-rollout boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-05 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Simulate one failed tenant, lost marker/master checkpoint and mixed versions; only supported VERIFIED tenants accept traffic. Restore/forward repair demonstrates compatibility and recorded tenant version, not source-directory version. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Simulate one failed tenant, lost marker/master checkpoint and mixed versions; only supported VERIFIED tenants accept traffic. Restore/forward repair demonstrates compatibility and recorded tenant version, not source-directory version.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during orchestrate versioned tenant schema rollout and repair. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-027

### Task Name
Migrate operational gym profile and configuration reads

### Phase
4 — Gym configuration and membership foundations

### Objective
Migrate operational gym profile and configuration reads. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O12 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O12; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C38, C39. Read task-specific mapped source rows and decisions: DEC-01 DEC-06 DEC-07

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-023](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-023), [GYMOS-MIG-077](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-077), [GYMOS-MIG-082](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083)

### Implementation Scope
Create tenant-local operational contacts/address/pay cadence/currency/timezone configuration and five-tab settings read model. Currency/timezone originate from provisioning; currency immutable after financial activity. Profile name crosses Master registry and tenant contacts: use reviewed operation/recovery or explicitly separate saves, never pretend cross-database atomicity. Keep optimistic config version separate from schema version.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/configuration/configuration.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/configuration/configuration.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/configuration/configuration.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/configuration; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/configuration.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/configuration.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/configuration and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/configuration. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
T.GymConfiguration singleton, config business version; optional master-operation profile update.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed configuration boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-01 DEC-06 DEC-07 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Owner reads/saves valid fields; trainer/member/support write403; stale version409; partial cross-plane save has explicit pending/recovery outcome. Currency lock rejects after first financial activity. Invalid IANA zone and pay cadence rejected. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Owner reads/saves valid fields; trainer/member/support write403; stale version409; partial cross-plane save has explicit pending/recovery outcome. Currency lock rejects after first financial activity. Invalid IANA zone and pay cadence rejected.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate operational gym profile and configuration reads. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-028

### Task Name
Migrate membership plans and owner plan form

### Phase
4 — Gym configuration and membership foundations

### Objective
Migrate membership plans and owner plan form. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O12, O03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O12, O03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C11, C40. Read task-specific mapped source rows and decisions: DEC-06 DEC-07

### Dependencies
[GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-027](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-027), [GYMOS-MIG-082](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083)

### Implementation Scope
Add tenant MembershipPlan list/detail/create and owner inline Add Plan UI with name/description/agreed decimal price/currency/positive integer duration. Retain no edit/delete-plan parity assumption; define active/eligible plan status without changing existing membership snapshots. Populate full registration picker only from authorized current-gym plans. Zero-price plan is valid when policy allows, not a missing value.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/memberships/memberships.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/memberships/memberships.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/memberships/memberships.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/memberships; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/memberships.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/memberships.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/memberships and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/memberships. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
T.MembershipPlan and eligibility/status/version/index; Money uses approved exact storage.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed memberships boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-06 DEC-07 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Create plan then select it for registration; foreign/disabled plan rejected; decimal/negative/fractional-duration/blank-name inputs tested. New plan pricing cannot rewrite existing agreed membership values. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Create plan then select it for registration; foreign/disabled plan rejected; decimal/negative/fractional-duration/blank-name inputs tested. New plan pricing cannot rewrite existing agreed membership values.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate membership plans and owner plan form. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-029

### Task Name
Migrate rates, pay percentages and cancellation settings

### Phase
4 — Gym configuration and membership foundations

### Objective
Migrate rates, pay percentages and cancellation settings. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O12 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O12; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C41, C42, C43. Read task-specific mapped source rows and decisions: DEC-06 DEC-07 DEC-08

### Dependencies
[GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012), [GYMOS-MIG-027](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-027), [GYMOS-MIG-028](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-028), [GYMOS-MIG-082](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Migrate session base/level/intro override rates, trainer tier/off-shift pay terms and policy controls. Parse blank optional overrides as null and explicit0 as zero; never coerce blank into0 or use truthiness defaults. Validate finite nonnegative values, percentage/premium relationships and policy bounds. Apply changes to future confirmations only; existing snapshot immutable. Show versioned success/error without wiping edits. The noShowDeduction switch conflicts with the approved mandatory eligible no-show consumption: retire its editable behavior in MVP and show the fixed policy read-only with explanation. lateCancelDeduction remains editable and enforced. Do not expose an ignored switch.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/configuration/configuration.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/configuration/configuration.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/configuration/configuration.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/configuration; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/configuration.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/configuration.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/configuration and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/configuration. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Tenant configuration rate/policy fields and optimistic version/audit.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed configuration boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-06 DEC-07 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Blank/null/zero transitions and invalid percentages/NaN rejected as specified. Exact zero-hour cutoff and minimum duration remain0 if allowed. Changing config cannot alter confirmed session fee/pay. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Blank/null/zero transitions and invalid percentages/NaN rejected as specified. Exact zero-hour cutoff and minimum duration remain0 if allowed. Changing config cannot alter confirmed session fee/pay.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate rates, pay percentages and cancellation settings. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-030

### Task Name
Implement date-derived membership eligibility and renewal

### Phase
4 — Gym configuration and membership foundations

### Objective
Implement date-derived membership eligibility and renewal. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O02, O04, O12 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O02, O04, O12; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C10, C11, C44. Read task-specific mapped source rows and decisions: DEC-07

### Dependencies
[GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-028](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-028), [GYMOS-MIG-029](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-029), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083)

### Implementation Scope
Implement reusable scheduled-date eligibility and non-overlapping term invariants. Preserve identity/member status independently from expired entitlement. Retire check-expiries mutation: control refreshes derived data. Add proposed POST/gyms/:slug/members/:id/memberships renewal command with planId/start policy/expectedVersion/idempotencyKey; renewal starts after current term and captures price/dates. Validate owner-only and actor availability; renewal is not payment. Exact term inclusivity follows DEC-07.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/memberships/memberships.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/memberships/memberships.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/memberships/memberships.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/memberships; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/memberships.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/memberships.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/memberships and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/memberships. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
T.Membership local Member/Plan FKs, agreed price/date snapshot and non-overlap constraint/lock.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed memberships boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-07 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Old expired term cannot mark a currently entitled identity EXPIRED; overlapping concurrent renewals rejected; scheduled session date outside coverage fails. Refresh GET changes no row. Term price snapshot remains stable. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Old expired term cannot mark a currently entitled identity EXPIRED; overlapping concurrent renewals rejected; scheduled session date outside coverage fails. Refresh GET changes no row. Term price snapshot remains stable.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during implement date-derived membership eligibility and renewal. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-031

### Task Name
Migrate full member registration vertical slice

### Phase
5 — Member management

### Objective
Migrate full member registration vertical slice. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C12. Read task-specific mapped source rows and decisions: DEC-02 DEC-04 DEC-07

### Dependencies
[GYMOS-MIG-017](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-017), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-023](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-023), [GYMOS-MIG-028](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-028), [GYMOS-MIG-030](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-030), [GYMOS-MIG-078](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083)

### Implementation Scope
Implement owner form with fullName/login email/phone/DOB/plan/emergency contact/health notes and credential handoff. Master prepares PENDING access+operation, tenant transaction commits member+initial membership agreed value+receipt+audit, then Master activates reciprocal access+operation. Verify existing person before global identity reuse; reject same-gym role conflict. Local COMPLETE is not published until Master activation. Existing POST/members remains basic contact only and cannot receive this form. No registration payment/revenue cash row.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gyms.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gyms.controller.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/members/members.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/members/members.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/members/members.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/members; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/members.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/members.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/members and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/members. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Extend existing T.Member with profile/registration state/identity refs; Membership local transaction; master preparation/finalization separate.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed members boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-02 DEC-04 DEC-07 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Happy path owner→one-time handoff→forced change→correct gym access; failure at each boundary resumes same identity/member/term. Lost handoff never replays secret. DOB/plan/email/privacy validation, foreign plan, duplicate key and identity role conflict have zero extra effects. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Happy path owner→one-time handoff→forced change→correct gym access; failure at each boundary resumes same identity/member/term. Lost handoff never replays secret. DOB/plan/email/privacy validation, foreign plan, duplicate key and identity role conflict have zero extra effects.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate full member registration vertical slice. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-032

### Task Name
Migrate paged member list and complete profile

### Phase
5 — Member management

### Objective
Migrate paged member list and complete profile. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O02, O04 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O02, O04; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C09, C10. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-030](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-030), [GYMOS-MIG-031](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-031)

### Implementation Scope
Replace100-row list cap with stable page/search/status/full-filter totals. Migrate all member fields/profile tabs, last sessions with truthful bounds, membership history and independently paged derived entitlement/pack history. Basic/unlinked, pending recovery, previously active historical and operational people are explicitly labeled/separately counted. Use agreed prices rather than current plan price; no PAID badge, receipt or cash total. Preserve profile missing/empty states and navigation.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gyms.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gyms.controller.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/members/members.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/members/members.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/members/members.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/members; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/members.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/members.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/members and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/members. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Tenant profile/search/history indexes; no payment ledger required for C10 derived history.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed members boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
With125+ records search reaches beyond100 and totals match filters; separate history pagers do not overwrite each other. Owner-only health and recovery DTO fields absent for other roles; password/database fields absent recursively. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- With125+ records search reaches beyond100 and totals match filters; separate history pagers do not overwrite each other. Owner-only health and recovery DTO fields absent for other roles; password/database fields absent recursively.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate paged member list and complete profile. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-033

### Task Name
Make member status changes recoverable and release future holds

### Phase
5 — Member management

### Objective
Make member status changes recoverable and release future holds. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O04 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O04; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C14. Read task-specific mapped source rows and decisions: DEC-02 DEC-04 DEC-08

### Dependencies
[GYMOS-MIG-004](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-004), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-031](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-031), [GYMOS-MIG-040](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-040), [GYMOS-MIG-043](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-043), [GYMOS-MIG-078](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Migrate status confirmation with strict enum/version/reason. On suspension/deactivation revoke future eligibility, cancel affected pending/future confirmed sessions and release held credits free, preserving settled history. Master access and tenant profile updates need operation/checkpoints and denied interim state; never assume atomic cross-database change. Retain reactivation policy and owner history. UI keeps dialog/error on rejection.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gyms.controller.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/gyms.controller.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/members/members.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/members/members.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/members/members.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/members; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/members.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/members.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/members and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/members. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Master access version/state plus tenant status/cancellation/hold/audit/receipt transactions.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed members boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-02 DEC-04 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Suspend with multiple bookings cancels only approved future states and releases each hold once; retry/failure cannot charge or enable interim access. Concurrent booking vs status change respects approved revocation bound. Reactivation does not resurrect cancelled sessions. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Suspend with multiple bookings cancels only approved future states and releases each hold once; retry/failure cannot charge or enable interim access. Concurrent booking vs status change respects approved revocation bound. Reactivation does not resurrect cancelled sessions.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during make member status changes recoverable and release future holds. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-034

### Task Name
Migrate session-pack issuance and balance projection

### Phase
5 — Member management

### Objective
Migrate session-pack issuance and balance projection. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O04 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O04; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C19. Read task-specific mapped source rows and decisions: DEC-06 DEC-07 DEC-08

### Dependencies
[GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-030](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-030), [GYMOS-MIG-031](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-031), [GYMOS-MIG-040](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-040), [GYMOS-MIG-082](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Migrate Issue Pack dialog with positive integer count/duration, exact nonnegative price/currency and expiry. Persist agreed price/total and immutable origin; balance derives from credit movements plus active holds. Show available/held/consumed/expired unused separately; no payment recorded. Preserve90-day/default form behavior only where reviewed, and do not claim fixed450 is a dynamic rate. Issuance is owner-only idempotent receipt+audit.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/packs/packs.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/packs/packs.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/packs/packs.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/packs; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/packs.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/packs.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/packs and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/packs. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Extend/use SessionPack base from040 for issuance snapshot/origin/indexes; do not create a second pack model. Local member FK; no payment record.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed packs boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-06 DEC-07 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Zero-price valid pack, invalid fraction/negative/foreign member rejected; duplicate intent issues one pack. Held credit remains reserved after expiry; available projection excludes expired unheld credits and never goes negative. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Zero-price valid pack, invalid fraction/negative/foreign member rejected; duplicate intent issues one pack. Held credit remains reserved after expiry; available projection excludes expired unheld credits and never goes negative.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate session-pack issuance and balance projection. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-035

### Task Name
Verify member enrollment and recovery journey

### Phase
5 — Member management

### Objective
Verify member enrollment and recovery journey. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O02, O03, O04, A02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O02, O03, O04, A02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C09, C10, C12, C19. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-007](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-007), [GYMOS-MIG-020](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-020), [GYMOS-MIG-031](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-031), [GYMOS-MIG-032](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-032), [GYMOS-MIG-034](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-034)

### Implementation Scope
Integrate owner registration, retained error draft, one-time credential display/copy/continue, forced password change and member role entry in two gyms. Test existing-login verified reuse and current basic-member behavior separately. Inject tenant commit before lost Master activation/response and exercise authorized operation recovery. Compare member forms/profile states with V1 fixtures.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.controller.spec.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.controller.spec.ts>)

### Expected Files to Create or Modify
Verification/evidence files (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-035; scoped test fixtures/cases under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/testing and /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tests/testing. Fixes return to owning feature task; no unrelated source change.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
One identity with separate actor IDs works across gyms without password reset; no pending actor leaks to list/options; repeated recovery creates no extra member/term/pack/audit. Clipboard failure is visible and secret cleared on exit. Evidence includes persisted counts and UI/API results. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- One identity with separate actor IDs works across gyms without password reset; no pending actor leaks to list/options; repeated recovery creates no extra member/term/pack/audit. Clipboard failure is visible and secret cleared on exit. Evidence includes persisted counts and UI/API results.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during verify member enrollment and recovery journey. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-036

### Task Name
Migrate trainer registration and credential handoff

### Phase
6 — Trainer management

### Objective
Migrate trainer registration and credential handoff. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O06 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O06; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C13. Read task-specific mapped source rows and decisions: DEC-02 DEC-04 DEC-07

### Dependencies
[GYMOS-MIG-017](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-017), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-023](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-023), [GYMOS-MIG-027](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-027), [GYMOS-MIG-078](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083)

### Implementation Scope
Extend the minimal Trainer actor from003, distinct from Member and migrate full name/email/phone/level/specialisations/experience/shift/bio form. Use same enrollment operation/receipt/activation protocol as member registration without membership assignment or payment. Validate integer nonnegative experience, level, trimmed bounded specialization rows and paired shift strings. Preserve success credential copy→trainer profile; default shift only under reviewed policy.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/trainers; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/trainers.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/trainers.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/trainers and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/trainers. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
T.Trainer with independent PK/identity ref/registration state/level/status/shift; no tenant password.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed trainers boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-02 DEC-04 DEC-07 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
New trainer forced-change login and verified existing login reuse work; same-gym role conflict rejected; failures resume one actor/access/audit. Unpublished trainer never appears in member directory or booking options. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- New trainer forced-change login and verified existing login reuse work; same-gym role conflict rejected; failures resume one actor/access/audit. Unpublished trainer never appears in member directory or booking options.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate trainer registration and credential handoff. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-037

### Task Name
Migrate trainer roster, profile and shift approval

### Phase
6 — Trainer management

### Objective
Migrate trainer roster, profile and shift approval. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O05, O07 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O05, O07; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C15, C16, C18. Read task-specific mapped source rows and decisions: DEC-07 DEC-09

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-029](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-029), [GYMOS-MIG-036](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-036), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Migrate searchable/paged roster and trainer detail, specialization/bio, bounded session/performance summaries and shift approval feedback. Use full totals and honest recent-history labels; ratings without submissions are unavailable. Validate shift in gym zone with reviewed overnight rules. Shift changes affect new confirmations only; current session snapshot stays immutable. Correct success-colored error feedback.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/trainers; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/trainers.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/trainers.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/trainers and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/trainers. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Trainer shift/version/indexes and local audit.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed trainers boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-07 DEC-09 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Search/paging beyond100; inactive/pending projection rules; shift invalid/gap/overnight cases; wrong role/foreign trainer rejected. Config/shift changes do not change confirmed pay terms. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Search/paging beyond100; inactive/pending projection rules; shift invalid/gap/overnight cases; wrong role/foreign trainer rejected. Config/shift changes do not change confirmed pay terms.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate trainer roster, profile and shift approval. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-038

### Task Name
Migrate trainer deactivation and reactivation

### Phase
6 — Trainer management

### Objective
Migrate trainer deactivation and reactivation. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O07 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O07; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C17. Read task-specific mapped source rows and decisions: DEC-02 DEC-04 DEC-08

### Dependencies
[GYMOS-MIG-004](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-004), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-036](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-036), [GYMOS-MIG-040](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-040), [GYMOS-MIG-043](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-043), [GYMOS-MIG-078](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Implement strict trainer status command and confirmation using shared recoverable access/status orchestration. Deactivation prevents login-context/booking eligibility, cancels affected future pending/confirmed sessions and releases holds without fee. Preserve past session/pay/coaching history and do not delete global identity. UI reports committed/pending/rejected outcome and requires explicit recovery after partial cross-plane failure.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/trainers; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/trainers.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/trainers.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/trainers and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/trainers. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Master access status/version and tenant Trainer/Session/Hold/Receipt/Audit updates.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed trainers boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-02 DEC-04 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Concurrent accept/book vs deactivate has deterministic denied/released outcome; no duplicate cancellation/audit/pay. Other gym role of same identity remains usable. Reactivation cannot restore already cancelled bookings. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Concurrent accept/book vs deactivate has deterministic denied/released outcome; no duplicate cancellation/audit/pay. Other gym role of same identity remains usable. Reactivation cannot restore already cancelled bookings.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate trainer deactivation and reactivation. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-039

### Task Name
Migrate member trainer directory

### Phase
6 — Trainer management

### Objective
Migrate member trainer directory. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for M01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for M01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C35. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-036](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-036), [GYMOS-MIG-037](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-037)

### Implementation Scope
Migrate active published trainer cards/search/request links using member-safe directory DTO. Show level/specs/bio and truthful unavailable ratings, never private trainer contact/pay fields without approved contract. Route to selected-gym trainer-bound request page and handle no results/missing/inactive trainer. Directory is not an owner-wide member roster.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/trainers/trainers.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/trainers; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/trainers.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/trainers.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/trainers and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/trainers.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed trainers boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Member entry succeeds without GET/members; pending/deactivated trainers hidden; cross-gym trainer URL404; long names/narrow cards preserve V1 hierarchy. Server authorization checked independently of visible request link. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Member entry succeeds without GET/members; pending/deactivated trainers hidden; cross-gym trainer URL404; long names/narrow cards preserve V1 hierarchy. Server authorization checked independently of visible request link.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate member trainer directory. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-040

### Task Name
Implement session aggregate, holds and transition constraints

### Phase
7 — Sessions, scheduling and settlement

### Objective
Implement session aggregate, holds and transition constraints. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O08, T01, M03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O08, T01, M03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C20, C22, C24, C25, C26, C27, C28. Read task-specific mapped source rows and decisions: DEC-04 DEC-06 DEC-07 DEC-08

### Dependencies
[GYMOS-MIG-002](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-002), [GYMOS-MIG-004](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-004), [GYMOS-MIG-007](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-007), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-029](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-029), [GYMOS-MIG-030](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-030), [GYMOS-MIG-036](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-036), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-082](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Create session version/state events, durable unique credit hold/session, movements, unique settlement/session and source-linked revenue/base-pay uniqueness. Implement formal machine in Master Plan §20 using command-specific services, row locks/CAS and collision protection across full intervals. Define lock order and bounded deadlock retries; guard last-credit claims and member/trainer overlapping bookings. Rate/level/shift snapshot at confirmation. Session schema is not a generic arbitrary status endpoint.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/sessions; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/sessions.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/sessions.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/sessions and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/sessions. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Base T.SessionPack schema (member FK, total/remaining/price/expiry/status/snapshot/constraints) belongs HERE before034 issuance/UI. Add T.PTSession/SessionStateEvent/SessionCreditHold/SessionSettlement/PackCreditMovement/RevenueRecord/PayRecord/PayPeriod with local FKs and reviewed unique/exclusion/CHECK constraints.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed sessions boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-04 DEC-06 DEC-07 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Database constraints reject duplicate hold/settlement/pay origin, invalid balances/states and overlapping intervals under concurrency. Different request keys cannot bypass terminal invariants. Failed audit/receipt insertion rolls back local effects. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Database constraints reject duplicate hold/settlement/pay origin, invalid balances/states and overlapping intervals under concurrency. Different request keys cannot bypass terminal invariants. Failed audit/receipt insertion rolls back local effects.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during implement session aggregate, holds and transition constraints. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-041

### Task Name
Migrate owner booking with atomic credit reservation

### Phase
7 — Sessions, scheduling and settlement

### Objective
Migrate owner booking with atomic credit reservation. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O09 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O09; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C21, C22. Read task-specific mapped source rows and decisions: DEC-07 DEC-08

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-034](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-034), [GYMOS-MIG-037](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-037), [GYMOS-MIG-040](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-040), [GYMOS-MIG-043](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-043), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Migrate owner booking options/form and selected-gym member/trainer/type/date/time/duration/notes. Recheck operational actors, active membership covering scheduled time, unexpired available pack, member/trainer interval collision and future allowed time server-side. In one tenant transaction create SCHEDULED+hold+confirmation snapshots+receipt/audit. Show held-credit outcome and navigate to oversight only after known commit.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/sessions; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/sessions.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/sessions.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/sessions and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/sessions. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Session/hold/snapshot/local receipt transaction from040.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed sessions boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-07 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Last credit raced by two bookings permits one; touching intervals versus real overlap follows reviewed rule. Inactive/expired/foreign actors, insufficient credit and stale options return useful errors without extra effects. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Last credit raced by two bookings permits one; touching intervals versus real overlap follows reviewed rule. Inactive/expired/foreign actors, insufficient credit and stale options return useful errors without extra effects.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate owner booking with atomic credit reservation. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-042

### Task Name
Migrate member request and trainer accept/decline

### Phase
7 — Sessions, scheduling and settlement

### Objective
Migrate member request and trainer accept/decline. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for M02, T01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for M02, T01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C23, C24, C36, C37. Read task-specific mapped source rows and decisions: DEC-04 DEC-07 DEC-08

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-034](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-034), [GYMOS-MIG-039](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-039), [GYMOS-MIG-040](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-040), [GYMOS-MIG-043](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-043), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Member request derives member from authenticated actor, checks eligibility/available unexpired credit and future trainer slot, creates PENDING without hold and exactly one trainer HIRE_REQUEST notification. Assigned trainer strictly ACCEPT/DECLINEs pending version; acceptance rechecks eligibility and atomically holds one credit+SCHEDULED snapshots, decline has no settlement. Emit selected-gym member BOOKED/DECLINED notification and audit in local transaction. Pending request grants no client-health relationship.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/sessions; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/sessions.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/sessions.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/sessions and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/sessions. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Session/hold/notification/audit/receipt atomic local writes.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed sessions boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-04 DEC-07 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Two trainers accepting requests for last credit yields one hold; stale/invalid decision409/422; pending request produces0 hold/pay/earned value. Notification failure rolls back or gives durable committed-delivery state per contract; retries never duplicate business or notification. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Two trainers accepting requests for last credit yields one hold; stale/invalid decision409/422; pending request produces0 hold/pay/earned value. Notification failure rolls back or gives durable committed-delivery state per contract; retries never duplicate business or notification.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate member request and trainer accept/decline. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-043

### Task Name
Provide minimum selected-gym notifications and audit reads

### Phase
7 — Sessions, scheduling and settlement

### Objective
Provide minimum selected-gym notifications and audit reads. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for L02, O13 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for L02, O13; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C57, C59, C60, C61. Read task-specific mapped source rows and decisions: DEC-04 DEC-09

### Dependencies
[GYMOS-MIG-004](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-004), [GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-040](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-040), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Implement minimum tenant notification storage/read/count/mark-one/all and basic authorized audit read before booking journey ships. Derive recipient from actor mapping, dedupe source event, use typed safe gym/role link. Thin actions mark; same-origin authenticated GET polls/read only, five newest plus true unread total. Cancel old-gym requests on context switch and preserve unread on failure. No global inbox/external push scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/audit.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/audit.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/notifications/notifications.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/notifications/notifications.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/notifications/notifications.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/notifications; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/notifications.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/notifications.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/notifications and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/notifications. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
T.Notification recipientIdentityId/index/event uniqueness and T.AuditLog/receipt fields.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed notifications boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-04 DEC-09 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
A cannot read/mark B notification or another recipient; mark retries idempotent; request/response event appears once with correct destination; revoked access denied; audit insert failure aborts required business transaction. No GET marks or writes. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- A cannot read/mark B notification or another recipient; mark retries idempotent; request/response event appears once with correct destination; revoked access denied; audit insert failure aborts required business transaction. No GET marks or writes.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during provide minimum selected-gym notifications and audit reads. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-044

### Task Name
Migrate owner/trainer/member session read views

### Phase
7 — Sessions, scheduling and settlement

### Objective
Migrate owner/trainer/member session read views. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O08, T01, M03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O08, T01, M03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C20, C37, C63. Read task-specific mapped source rows and decisions: DEC-07 DEC-09

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-041](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-041), [GYMOS-MIG-042](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-042), [GYMOS-MIG-043](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-043), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Migrate daily filters/date arrows/Today/pagination, monthly member view/More overlay, trainer schedule/live timer and member pending/history cards. C63 separates lifetime pack totals from month bookings and independent full-filter totals. Show command affordances from server policy/version/time, display inline errors and retain dialogs. Timer is display-only; pure reads never settle sessions. Refresh reads within approved cross-role bound.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/sessions; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/sessions.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/sessions.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/sessions and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/sessions.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed sessions boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-07 DEC-09 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
All three roles see same version/asOf and correct gym, month/date/filter totals; >100 rows handled; stale poll cannot overwrite newer state; timer initializes/resets correctly. Screens preserve meaningful tabs/notes and distinguish empty from unavailable. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- All three roles see same version/asOf and correct gym, month/date/filter totals; >100 rows handled; stale poll cannot overwrite newer state; timer initializes/resets correctly. Screens preserve meaningful tabs/notes and distinguish empty from unavailable.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate owner/trainer/member session read views. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-045

### Task Name
Implement Start and safe shared notes

### Phase
7 — Sessions, scheduling and settlement

### Objective
Implement Start and safe shared notes. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for T01, O08 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for T01, O08; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C25, C29. Read task-specific mapped source rows and decisions: DEC-07 DEC-08

### Dependencies
[GYMOS-MIG-040](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-040), [GYMOS-MIG-044](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-044), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Start only assigned trainer/authorized owner on SCHEDULED with held credit and approved start window/active-session rules. Set startedAt once with version/receipt/event/audit. Notes command validates bounded text, allowed edit states and shared visibility; member cards display approved shared notes, never private health notes. Preserve trainer notes modal and show failure without closing. Notes never trigger money/pay.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/sessions; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/sessions.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/sessions.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/sessions and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/sessions. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Session timestamps/version/events, local receipt/audit; no settlement on Start/notes.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed sessions boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-07 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Double Start replays or conflicts safely with one startedAt; premature/foreign/inactive starts rejected. Notes save failure retains input; notes retries change no credits/earned/pay. Server time controls eligibility. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Double Start replays or conflicts safely with one startedAt; premature/foreign/inactive starts rejected. Notes save failure retains input; notes retries change no credits/earned/pay. Server time controls eligibility.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during implement start and safe shared notes. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-046

### Task Name
Complete started session exactly once with earnings

### Phase
7 — Sessions, scheduling and settlement

### Objective
Complete started session exactly once with earnings. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for T01, O08, T06 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for T01, O08, T06; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C26, C34, C49. Read task-specific mapped source rows and decisions: DEC-06 DEC-07 DEC-08

### Dependencies
[GYMOS-MIG-029](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-029), [GYMOS-MIG-040](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-040), [GYMOS-MIG-045](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-045), [GYMOS-MIG-082](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Complete only ACTIVE+startedAt satisfying approved elapsed-duration rule; reject direct SCHEDULED completion. Atomically consume original held credit, close session, append one settlement/movement/completed earned record and trainer pay from confirmation snapshot, create first weekly/monthly period if needed, write receipt/audit. Serialize period close/completion per DEC-08. Snapshot rate/config remains historical. No second-key repeat can create another effect.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/sessions; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/sessions.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/sessions.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/sessions and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/sessions. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Tenant settlement, hold consume, movement/revenue/pay/period/events/audit/receipt one local transaction.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed sessions boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-06 DEC-07 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Parallel completion and retries yield one debit/earned/pay; failed local insert rolls everything back. Held booking completes after pack expiry. Current rates/trainer level changed after confirmation cannot alter payment. Too-early/never-started session has0 effects. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Parallel completion and retries yield one debit/earned/pay; failed local insert rolls everything back. Held booking completes after pack expiry. Current rates/trainer level changed after confirmation cannot alter payment. Too-early/never-started session has0 effects.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during complete started session exactly once with earnings. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-047

### Task Name
Implement no-show and quoted cancellation

### Phase
7 — Sessions, scheduling and settlement

### Objective
Implement no-show and quoted cancellation. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O08, T01, M03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O08, T01, M03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C27, C28. Read task-specific mapped source rows and decisions: DEC-07 DEC-08

### Dependencies
[GYMOS-MIG-033](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-033), [GYMOS-MIG-038](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-038), [GYMOS-MIG-040](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-040), [GYMOS-MIG-044](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-044), [GYMOS-MIG-045](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-045), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
No-show only confirmed not-started SCHEDULED at server start+15min or later: consume hold once, distinct missed earned value and0 trainer pay. Pending withdrawal free. Confirmed cancellation at exact cutoff or earlier releases hold; strictly inside consumes once only when toggle enabled, with distinct late-cancel value and0 pay. Use proposed read-only cancellation quote + policyVersion acknowledgment in C28; changed policy/time consequence requires explicit refreshed acknowledgment. Reject terminal rewrites.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/sessions/sessions.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/sessions; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/sessions.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/sessions.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/sessions and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/sessions. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Hold resolution, settlement/movement/value/event/audit/receipt local transactions.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed sessions boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-07 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Test grace minus1ms/exact grace, cutoff minus/exact/plus boundary, toggle false/true, zero window, concurrent cancel/complete/no-show and stale quote. One terminal settlement maximum; free cancellation releases exactly once. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Test grace minus1ms/exact grace, cutoff minus/exact/plus boundary, toggle false/true, zero window, concurrent cancel/complete/no-show and stale quote. One terminal settlement maximum; free cancellation releases exactly once.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during implement no-show and quoted cancellation. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-048

### Task Name
Prove session financial and concurrency invariants

### Phase
7 — Sessions, scheduling and settlement

### Objective
Prove session financial and concurrency invariants. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O08, O09, T01, T06, M02, M03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O08, O09, T01, T06, M02, M03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C22, C23, C24, C26, C27, C28, C34, C49. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-007](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-007), [GYMOS-MIG-033](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-033), [GYMOS-MIG-038](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-038), [GYMOS-MIG-041](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-041), [GYMOS-MIG-042](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-042), [GYMOS-MIG-043](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-043), [GYMOS-MIG-044](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-044), [GYMOS-MIG-046](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-046), [GYMOS-MIG-047](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-047), [GYMOS-MIG-049](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-049)

### Implementation Scope
Run database-backed barrier-synchronized races for last credit, overlapping trainer/member intervals, accept/deactivate, completion duplicates, cancel/no-show/complete competition and payroll close. Inject response loss, audit/notification failure and process restart. Assert persisted effects plus each role UI/read model within approved delay; disabling buttons does not count as backend evidence.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.controller.spec.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.controller.spec.ts>)

### Expected Files to Create or Modify
Verification/evidence files (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-048; scoped test fixtures/cases under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/testing and /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tests/testing. Fixes return to owning feature task; no unrelated source change.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
For each successful terminal session exactly one settlement and credit movement, pay only for completed; available+held/used conservation, no negative balance, unique audit/notification per event, and no cross-gym data. Record exact rejected outcomes and retry counts. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- For each successful terminal session exactly one settlement and credit movement, pay only for completed; available+held/used conservation, no negative balance, unique audit/notification per event, and no cross-gym data. Record exact rejected outcomes and retry counts.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during prove session financial and concurrency invariants. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-049

### Task Name
Expose lifecycle earnings and operational value baseline

### Phase
7 — Sessions, scheduling and settlement

### Objective
Expose lifecycle earnings and operational value baseline. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O10, T06, O04 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O10, T06, O04; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C34, C45, C48, C49. Read task-specific mapped source rows and decisions: DEC-06 DEC-08

### Dependencies
[GYMOS-MIG-032](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-032), [GYMOS-MIG-043](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-043), [GYMOS-MIG-046](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-046), [GYMOS-MIG-047](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-047), [GYMOS-MIG-082](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Provide pure trainer-own earnings, owner revenue/deferred/current-period reads needed to verify lifecycle. Separate completed/no-show/late-cancel earned lines, available/held/expired unused pack value and membership term-based values. GET/current returns null until first completed pay, never creates a period. Approval is not payout; cashReceived unavailable/null. Bind T06 and minimum O10 panels with decimal-string DTOs and truthful period scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/finance; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/finance.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/finance.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/finance and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/finance. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Read projections over approved tenant origins; no separate mutable deferred balance.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed finance boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-06 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Known fixture yields exact earned/remaining/held amounts and one trainer base pay. Empty GET writes0 rows; own-only trainer scope. Reports distinguish asOf/window and do not fabricate cash/PAID/ratings. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Known fixture yields exact earned/remaining/held amounts and one trainer base pay. Empty GET writes0 rows; own-only trainer scope. Reports distinguish asOf/window and do not fabricate cash/PAID/ratings.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during expose lifecycle earnings and operational value baseline. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-050

### Task Name
Migrate confirmed-client roster and360 profile

### Phase
8 — Trainer clients and coaching plans

### Objective
Migrate confirmed-client roster and360 profile. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for T02, T03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for T02, T03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C30, C31. Read task-specific mapped source rows and decisions: DEC-09

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-041](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-041), [GYMOS-MIG-042](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-042), [GYMOS-MIG-044](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-044), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Define confirmed relationship from approved SCHEDULED/ACTIVE/COMPLETED history and expose assigned client roster/profile tabs with independent bounded histories and builder links. Pending-only requests grant no relationship. Validate local actor IDs every read/save; health notes owner or related trainer only, excluded from support/member/unrelated projections. Remove unused body-metric fetch and label recent10/two-plan sections honestly.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/coaching/coaching.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/coaching/coaching.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/coaching/coaching.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/coaching; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/coaching.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/coaching.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/coaching and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/coaching.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed coaching boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-09 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Pending-only/unrelated/foreign client denied404; valid confirmed client visible; deactivation/history behavior follows approved policy. DTO recursive scan excludes password/private fields; all four profile tabs and empty states render. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Pending-only/unrelated/foreign client denied404; valid confirmed client visible; deactivation/history behavior follows approved policy. DTO recursive scan excludes password/private fields; all four profile tabs and empty states render.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate confirmed-client roster and360 profile. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-051

### Task Name
Migrate workout builder and retrieval

### Phase
8 — Trainer clients and coaching plans

### Objective
Migrate workout builder and retrieval. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for T03, T04 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for T03, T04; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C31, C32. Read task-specific mapped source rows and decisions: DEC-09

### Dependencies
[GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012), [GYMOS-MIG-050](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-050), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Preserve client preselect, title/description and dynamic exercise rows, add/remove/edit, name/sets/reps/weight and save→client journey. Validate bounded nested DTO rows at runtime, positive counts, optional fields and relationship at commit. Store plan+children+audit/receipt in tenant transaction and expose through client profile history. Keep source seeded draft behavior until reviewed; never autosave sample content. Optional duration/notes are schema/action-supported but not rendered editor controls in V1; retain their contract disposition without inventing new UI. There is no V1 rest/instruction editor. Explicit zero weight must survive serialization.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/coaching/coaching.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/coaching/coaching.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/coaching/coaching.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/coaching; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/coaching.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/coaching.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/coaching and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/coaching. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
T.WorkoutPlan/WorkoutExercise local FKs, order/constraint/index and receipt/audit.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed coaching boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-09 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Related trainer saves/retrieves exact exercise order/fields once; invalid/empty/oversized row set or changed relationship rejects with draft retained; foreign member cannot be assigned. Member web plan delivery is not silently added. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Related trainer saves/retrieves exact exercise order/fields once; invalid/empty/oversized row set or changed relationship rejects with draft retained; foreign member cannot be assigned. Member web plan delivery is not silently added.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate workout builder and retrieval. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-052

### Task Name
Migrate meal builder and live macro totals

### Phase
8 — Trainer clients and coaching plans

### Objective
Migrate meal builder and live macro totals. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for T03, T05 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for T03, T05; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C31, C33. Read task-specific mapped source rows and decisions: DEC-09

### Dependencies
[GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012), [GYMOS-MIG-050](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-050), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Preserve client/title, dynamic food/meal rows and live calories/protein/carbs/fat totals. Resolve V1 day comment0..6 versus builder1/proposed1..7 before persistence; preserve actual one-day-oriented UI rather than invent weekly editor. Validate units, nonnegative finite macros and row bounds, recompute/validate aggregate server-side. Transactionally assign plan+children+audit/receipt and retrieve in client tab.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/coaching/coaching.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/coaching/coaching.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/coaching/coaching.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/coaching; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/coaching.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/coaching.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/coaching and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/coaching. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
T.MealPlan/MealPlanEntry with reviewed day/unit CHECKs and local parent/member/trainer FKs.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed coaching boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-09 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Add/remove/edit changes live totals accurately; server totals reject manipulated values/NaN/overflow; same intent stores one plan; invalid assignment retains rows. Correct day mapping and relationship/privacy regression pass. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Add/remove/edit changes live totals accurately; server totals reject manipulated values/NaN/overflow; same intent stores one plan; invalid assignment retains rows. Correct day mapping and relationship/privacy regression pass.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate meal builder and live macro totals. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-053

### Task Name
Reconcile membership and pack operational earning

### Phase
9 — Operational finance and payroll

### Objective
Reconcile membership and pack operational earning. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O10, O04 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O10, O04; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C45, C48. Read task-specific mapped source rows and decisions: DEC-06 DEC-07

### Dependencies
[GYMOS-MIG-030](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-030), [GYMOS-MIG-034](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-034), [GYMOS-MIG-046](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-046), [GYMOS-MIG-047](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-047), [GYMOS-MIG-049](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-049), [GYMOS-MIG-082](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083)

### Implementation Scope
Finalize daily membership earning from agreed term price, equal pack-price shares with reviewed residual allocation and separate completed/missed/late categories. Never recognize whole membership at registration or held credit as used. Show expired unused and suspension-affected value separately until Finance approves treatment. Reconcile projections to immutable movements/settlements and explain method/currency/asOf; no cash or tax/accounting claim.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/finance; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/finance.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/finance.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/finance and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/finance. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Tenant value read models/origin constraints only; approved membership accrual representation if DEC-06 selects persisted events.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed finance boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-06 DEC-07 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Price/count with repeating decimal conserves total under approved rounding; partial term/date boundaries and zero-price packs match fixtures. Suspended/expired ambiguous value stays separately labeled. Reports and profile history agree without duplicate earning. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Price/count with repeating decimal conserves total under approved rounding; partial term/date boundaries and zero-price packs match fixtures. Suspended/expired ambiguous value stays separately labeled. Reports and profile history agree without duplicate earning.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during reconcile membership and pack operational earning. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-054

### Task Name
Migrate expense capture and listing

### Phase
9 — Operational finance and payroll

### Objective
Migrate expense capture and listing. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O10 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O10; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C46, C51. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012), [GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-027](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-027), [GYMOS-MIG-049](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-049)

### Implementation Scope
Migrate Log Expense dialog/category/amount/date/description/recurring flag and filtered list. Use exact decimal/date-only/currency validation, owner-only command with idempotent receipt/audit. Recurring flag is metadata, not a scheduler or payment instruction. Empty/error state and retained modal draft must reflect real result. Date windows use gym-local accounting dates.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/finance; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/finance.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/finance.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/finance and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/finance. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
T.ExpenseRecord exact Money/accountingDate/local origin and category/date indexes.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed finance boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Each category and positive amount accepted; NaN/negative/currency mismatch/invalid date/foreign gym rejected. Retry creates one expense. Recurring=true creates no later expense automatically. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Each category and positive amount accepted; NaN/negative/currency mismatch/invalid date/foreign gym rejected. Retry creates one expense. Recurring=true creates no later expense automatically.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate expense capture and listing. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-055

### Task Name
Migrate category budgets and variance

### Phase
9 — Operational finance and payroll

### Objective
Migrate category budgets and variance. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O10 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O10; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C47, C52. Read task-specific mapped source rows and decisions: DEC-06

### Dependencies
[GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012), [GYMOS-MIG-027](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-027), [GYMOS-MIG-054](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-054), [GYMOS-MIG-082](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082)

### Implementation Scope
Preserve existing required category and amount inputs and action optional-month=current-gym-month behavior. Add strict month anchor and category enum, UNIQUE(category,month), optimistic idempotent upsert and all seven categories. Compare expenses in same currency/local month and define zero-budget/over-budget semantics via DEC-06. Keep correct errors/pending controls; do not report missing V1 budget inputs as a defect.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/finance; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/finance.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/finance.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/finance and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/finance. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
T.CategoryBudget unique category/month and date-first-of-month CHECK.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed finance boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-06 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Set current/default and explicit month; duplicate concurrent category/month has one row; zero budget/positive actual displays reviewed variance; all seven rows visible with accurate totals. Cross-role/gym writes rejected. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Set current/default and explicit month; duplicate concurrent category/month has one row; zero budget/positive actual displays reviewed variance; all seven rows visible with accurate totals. Cross-role/gym writes rejected.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate category budgets and variance. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-056

### Task Name
Migrate payroll close, approval and adjustments

### Phase
9 — Operational finance and payroll

### Objective
Migrate payroll close, approval and adjustments. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O10, T06 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O10, T06; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C49, C54, C55. Read task-specific mapped source rows and decisions: DEC-08

### Dependencies
[GYMOS-MIG-018](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-018), [GYMOS-MIG-046](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-046), [GYMOS-MIG-049](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-049), [GYMOS-MIG-053](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-053), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Implement OPEN→CLOSED→APPROVED versioned owner-only commands, no repeated approval/payout inference. Serialize first-pay creation and close with completion so every eligible pay belongs to exactly one correct weekly/monthly period. Handle corrections after approval only as documented adjustment in later open period; add proposed adjustment contract only after DEC-08 schema review. Preserve owner confirmations and display failures; pure current-period GET creates nothing.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/payroll/payroll.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/payroll/payroll.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/payroll/payroll.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/payroll; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/payroll.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/payroll.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/payroll and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/payroll. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
PayPeriod boundary uniqueness/state/version and PayRecord unique base origin/adjustment reference.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed payroll boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Parallel close/completion and close/approve calls match signed boundary policy with no missing/duplicate pay. Empty current=null; approved immutable base totals and later adjustment provenance reconcile. Approval never generates payment receipt. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Parallel close/completion and close/approve calls match signed boundary policy with no missing/duplicate pay. Empty current=null; approved immutable base totals and later adjustment provenance reconcile. Approval never generates payment receipt.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate payroll close, approval and adjustments. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-057

### Task Name
Migrate finance panels, operational P&L and charts

### Phase
9 — Operational finance and payroll

### Objective
Migrate finance panels, operational P&L and charts. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O10 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O10; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C45, C46, C47, C48, C49, C50. Read task-specific mapped source rows and decisions: DEC-06 DEC-08

### Dependencies
[GYMOS-MIG-012](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-012), [GYMOS-MIG-053](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-053), [GYMOS-MIG-054](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-054), [GYMOS-MIG-055](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-055), [GYMOS-MIG-056](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-056), [GYMOS-MIG-082](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082), [GYMOS-MIG-084](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084)

### Implementation Scope
Complete six-panel finance screen with period/type filters, true full-filter totals and configured chart labels/pay snapshots. Compute consistent current/prior payroll/expense basis without salary double counting or excluding partly overlapping periods. Name operational surplus/earned value explicitly; cash unavailable. Keep accounting-sync disabled/coming-soon and payment/receipt controls hidden. Link exports to061 when ready.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/finance/finance.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/finance; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/finance.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/finance.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/finance and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/finance.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed finance boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-06 DEC-08 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Known cross-month payroll/expense fixture reconciles panels, prior comparison and totals; no hardcoded40/50/10% conflicts with settings. Empty unavailable data distinct from0. Visual and chart interactions match V1 hierarchy. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Known cross-month payroll/expense fixture reconciles panels, prior comparison and totals; no hardcoded40/50/10% conflicts with settings. Empty unavailable data distinct from0. Visual and chart interactions match V1 hierarchy.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate finance panels, operational p&l and charts. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-058

### Task Name
Migrate live owner dashboard with honest metrics

### Phase
10 — Analytics, audit, exports and scope

### Objective
Migrate live owner dashboard with honest metrics. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C08. Read task-specific mapped source rows and decisions: DEC-07 DEC-09

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-032](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-032), [GYMOS-MIG-037](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-037), [GYMOS-MIG-043](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-043), [GYMOS-MIG-044](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-044), [GYMOS-MIG-049](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-049), [GYMOS-MIG-053](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-053), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Migrate four summary cards, session chart, low-credit/no-show alerts, table/trainer cards and manual/interval refresh. Publish exact metric dictionary with gym-local window/denominator/asOf and distinguish active PT sessions/trainers with bookings from physical attendance. Align revenue date basis with finance and handle out-of-hours buckets. Spinner follows actual request; stale/error state is explicit, B context discarded.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/dashboard.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/dashboard.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/analytics/analytics.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/analytics/analytics.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/analytics/analytics.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/analytics; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/analytics.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/analytics.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/analytics and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/analytics.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed analytics boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-07 DEC-09 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Frozen fixtures at local midnight/bucket boundaries match metric definitions; no synthetic floor headcount/attendance claims. Data refresh reaches each role within agreed delay and selected-gym changes cannot retain old alerts. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Frozen fixtures at local midnight/bucket boundaries match metric definitions; no synthetic floor headcount/attendance claims. Data refresh reaches each role within agreed delay and selected-gym changes cannot retain old alerts.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate live owner dashboard with honest metrics. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-059

### Task Name
Migrate operational analytics and platform summaries

### Phase
10 — Analytics, audit, exports and scope

### Objective
Migrate operational analytics and platform summaries. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O11, S01 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O11, S01; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C07, C56. Read task-specific mapped source rows and decisions: DEC-07 DEC-09

### Dependencies
[GYMOS-MIG-024](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-024), [GYMOS-MIG-037](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-037), [GYMOS-MIG-044](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-044), [GYMOS-MIG-053](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-053), [GYMOS-MIG-058](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-058), [GYMOS-MIG-083](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Migrate utilization/peak-session/signup series with reviewed windows, upper bounds/status filters, denominators and truthful labels. Ratings unavailable absent inputs. Produce bounded secure cross-gym summary jobs that store minimum counts/asOf/version in Master projection and continue if one tenant unavailable, displaying stale status. Do not join separate databases or synchronously query unlimited gyms.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/analytics/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/analytics/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/analytics.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/analytics.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/analytics/analytics.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/analytics/analytics.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/analytics/analytics.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/analytics; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/analytics.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/analytics.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/analytics and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/analytics. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Proposed minimal M.GymSummary projection; tenant aggregates read local records.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed analytics boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-07 DEC-09 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Known30-day/6-month windows including future sessions and overnight shifts give reviewed results; partial tenant outage marks stale summaries rather than0 and cannot expose health/finance detail. Owner only sees selected-gym analytics. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Known30-day/6-month windows including future sessions and overnight shifts give reviewed results; partial tenant outage marks stale summaries rather than0 and cannot expose health/finance detail. Owner only sees selected-gym analytics.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate operational analytics and platform summaries. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-060

### Task Name
Complete audit screen and filter taxonomy

### Phase
10 — Analytics, audit, exports and scope

### Objective
Complete audit screen and filter taxonomy. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O13 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O13; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C57. Read task-specific mapped source rows and decisions: DEC-04 DEC-09

### Dependencies
[GYMOS-MIG-013](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-013), [GYMOS-MIG-024](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-024), [GYMOS-MIG-043](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-043), [GYMOS-MIG-056](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-056), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Extend minimum audit read into V1-style action filter/pages20 with stable totals, allowed taxonomy, redacted details and original support actor. Required eventKey dedupe already exists; do not defer core audit writes to this task. Validate enum/page/range and safe resource labels; preserve current-page export scope label. Important administrative/session/finance actions must have source-stable events without secret/health payloads.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/audit.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/audit.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-master/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos-v2/packages/database-tenant/prisma/schema.prisma>)
- [/Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/audit/audit.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/audit/audit.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/audit/audit.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/audit; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/audit.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/audit.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/audit and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/audit. Review only relevant master/tenant schemas and NEW timestamped migrations in existing packages/database-*/prisma/migrations; never rewrite applied SQL.

### Prisma Changes
Audit read indexes/taxonomy/retention only; existing required writes from004/043.

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed audit boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-04 DEC-09 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Every emitted event type filterable or explicitly grouped; malformed filter/page422; no cross-tenant/support-privacy leak. Retry does not duplicate event and tampered same-key content is visible integrity failure. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Every emitted event type filterable or explicitly grouped; malformed filter/page422; no cross-tenant/support-privacy leak. Retry does not duplicate event and tampered same-key content is visible integrity failure.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during complete audit screen and filter taxonomy. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-061

### Task Name
Migrate authenticated scoped CSV downloads

### Phase
10 — Analytics, audit, exports and scope

### Objective
Migrate authenticated scoped CSV downloads. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O08, O10, O13 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O08, O10, O13; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C62. Read task-specific mapped source rows and decisions: DEC-09

### Dependencies
[GYMOS-MIG-020](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-020), [GYMOS-MIG-044](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-044), [GYMOS-MIG-057](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-057), [GYMOS-MIG-060](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-060), [GYMOS-MIG-085](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085)

### Implementation Scope
Implement authenticated same-origin web GET streaming Nest exports; tokens server-side, no state mutation. Sessions/finance/payroll export every filtered row up to reviewed cap; audit exports exactly visible filtered page. Validate kind/date/page/filters and same authorization as source screen before headers. Escape delimiters/quotes/newlines, mitigate spreadsheet formula execution, safe filename/content disposition/no-store and clear limit/unavailable errors. Snapshot/asOf behavior follows DEC-09.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/audit.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/audit.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/exports/exports.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/exports/exports.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/exports/exports.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/exports; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/exports.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/exports.ts. Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/exports and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/exports.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed exports boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-09 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Rows beyond100 exported when under cap; cap+1 fails clearly, never truncates. Audit row count equals current page. Unauthorized request receives no CSV body; formula/newline fixtures safe; failed download reports useful UI error. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Rows beyond100 exported when under cap; cap+1 fails clearly, never truncates. Audit row count equals current page. Unauthorized request receives no CSV body; formula/newline fixtures safe; failed download reports useful UI error.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during migrate authenticated scoped csv downloads. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-062

### Task Name
Record deferred billing, progress and theme scope

### Phase
10 — Analytics, audit, exports and scope

### Objective
Record deferred billing, progress and theme scope. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for O14, O04 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for O14, O04; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C53, C58. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-002](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-002), [GYMOS-MIG-015](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-015), [GYMOS-MIG-032](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-032), [GYMOS-MIG-057](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-057)

### Implementation Scope
Keep O14 subscription route/navigation, desk-payment/receipt controls and cash/paid labels absent from MVP while retaining source-reference mapping. Record future linked-payment allocation/partial balance/overpayment/refund-reversal requirements and real/null master subscription contract. ProgressPhoto/BodyMetric, check-in/community/ratings/external accounting/global inbox/expanded themes remain separate product proposals. Do not create unused payment/subscription tables simply to mirror V1.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/subscription.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/subscription.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-062.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.Proposed web routes/components: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug] for referenced role paths in Traceability Appendix; shared presentation under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/scope and server-only adapters under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/api/scope.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed scope boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
Adapt only presentation/transport explicitly named in Implementation Scope; source/contract references alone do not authorize other screens. Thin Server Actions/read adapters use scoped refresh and typed errors, no Prisma/business rules. Exact route/component mapping is in Traceability Appendix.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
MVP navigation/routes cannot invoke C53/C58 or mock payment portal; member history accurately shows entitlement/pack value, not paid status. Every deferred source/component/model/control has explicit owner/re-entry decision and no false parity claim. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- MVP navigation/routes cannot invoke C53/C58 or mock payment portal; member history accurately shows entitlement/pack value, not paid status. Every deferred source/component/model/control has explicit owner/re-entry decision and no false parity claim.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No payment gateway, refund engine, subscription enforcement, progress/mobile feature implementation. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-063

### Task Name
Reconcile final source-to-task parity and deferred inventory

### Phase
11 — Complete parity and system validation

### Objective
Reconcile final source-to-task parity and deferred inventory. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-015](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-015), [GYMOS-MIG-024](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-024), [GYMOS-MIG-025](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-025), [GYMOS-MIG-026](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-026), [GYMOS-MIG-030](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-030), [GYMOS-MIG-035](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-035), [GYMOS-MIG-037](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-037), [GYMOS-MIG-038](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-038), [GYMOS-MIG-039](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-039), [GYMOS-MIG-048](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-048), [GYMOS-MIG-050](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-050), [GYMOS-MIG-051](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-051), [GYMOS-MIG-052](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-052), [GYMOS-MIG-057](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-057), [GYMOS-MIG-058](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-058), [GYMOS-MIG-059](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-059), [GYMOS-MIG-060](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-060), [GYMOS-MIG-061](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-061), [GYMOS-MIG-062](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-062)

### Implementation Scope
Regenerate source inventories and compare all29 routes/74 TSX/44 exports/20 models/14 enums and C/E/workflow/control registers to delivered commits. Classify each as Complete/Corrected/Deferred/Missing/Failed verification with evidence. A deferred O14/unused chart is an intentional disposition, never implemented parity. Any new route/action discovered gets a task or approved disposition before gate.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-063.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
No source item lacks task/disposition; all released C contracts have tested implementation mapping and DTO version. Report fresh counts and limitations without invented percentage. Missing/failed critical items keep milestone open. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- No source item lacks task/disposition; all released C contracts have tested implementation mapping and DTO version. Report fresh counts and limitations without invented percentage. Missing/failed critical items keep milestone open.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-064

### Task Name
Run complete two-gym cross-role journeys

### Phase
11 — Complete parity and system validation

### Objective
Run complete two-gym cross-role journeys. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for A01, A02, S01, O03, O06, O08, T01, T03, M03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for A01, A02, S01, O03, O06, O08, T01, T03, M03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-007](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-007), [GYMOS-MIG-035](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-035), [GYMOS-MIG-038](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-038), [GYMOS-MIG-048](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-048), [GYMOS-MIG-051](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-051), [GYMOS-MIG-052](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-052), [GYMOS-MIG-057](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-057), [GYMOS-MIG-063](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-063)

### Implementation Scope
Run owner plan→member/trainer enrollment→forced change→pack→member request/trainer accept→Start/Complete→owner value/trainer earnings, plus booking/no-show/cancel/renew/suspend/recover/support flows. Verify browser interaction, API response, physical persisted counts and other-role updates. Include Master outage, expired session, provisioning failure, lost response and revoked access.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.controller.spec.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.controller.spec.ts>)

### Expected Files to Create or Modify
Verification/evidence files (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-064; scoped test fixtures/cases under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/testing and /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tests/testing. Fixes return to owning feature task; no unrelated source change.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
All roles in A/B and multi-gym identity agree on state within bound; all rejection paths leave0 unintended effects. No secret/health leakage or repeated financial effects. Evidence references exact task/test/commit/environment/fixture IDs. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- All roles in A/B and multi-gym identity agree on state within bound; all rejection paths leave0 unintended effects. No secret/health leakage or repeated financial effects. Evidence references exact task/test/commit/environment/fixture IDs.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during run complete two-gym cross-role journeys. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-065

### Task Name
Complete visual, responsive and accessibility parity

### Phase
11 — Complete parity and system validation

### Objective
Complete visual, responsive and accessibility parity. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for X01, X02, X03, L01, L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for X01, X02, X03, L01, L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-014](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-014), [GYMOS-MIG-063](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-063), [GYMOS-MIG-064](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-064)

### Implementation Scope
Compare equivalent V1/V2 fixtures at1440/768/390/320 with all rendered MVP screens, dialogs, tabs, charts and invalid/loading/empty states. Freeze/mask only documented time/animation differences, never content. Review intentional behavior corrections separately from geometry differences. Run keyboard/screen-reader form/dialog/drawer checks and fix regressions within owning feature tasks.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Verification/evidence files (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-065; scoped test fixtures/cases under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/visual and /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tests/visual. Fixes return to owning feature task; no unrelated source change.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Capture manifest and reviewed diff artifacts show every required screen/state; no unexplained high-impact layout/content differences, focus traps, clipped essential controls or wrong-role links. Deferred screen references not required as active MVP pages. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Capture manifest and reviewed diff artifacts show every required screen/state; no unexplained high-impact layout/content differences, focus traps, clipped essential controls or wrong-role links. Deferred screen references not required as active MVP pages.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during complete visual, responsive and accessibility parity. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-066

### Task Name
Run security, isolation and capacity gate

### Phase
11 — Complete parity and system validation

### Objective
Run security, isolation and capacity gate. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-006](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-006), [GYMOS-MIG-010](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-010), [GYMOS-MIG-026](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-026), [GYMOS-MIG-048](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-048), [GYMOS-MIG-061](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-061), [GYMOS-MIG-064](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-064)

### Implementation Scope
Execute endpoint role/actor/foreign-ID matrix for every released operation, serialization/CSRF/session/revocation/support expiry checks and constrained pool load. Scan credentials/dependencies and review exposed V1 credential follow-up status. Measure tenant/read/booking/export latency and connection usage under declared concurrency. Fix identified critical defects via linked task PRs and rerun affected evidence.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Verification/evidence files (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-066; scoped test fixtures/cases under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/security and /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tests/security. Fixes return to owning feature task; no unrelated source change.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
No unresolved critical security defect; zero cross-tenant or unauthorized health/finance results; bounded pools and meaningful429/503 under saturation. Test scope/capacity and accepted residual risk documented, with no unsupported production-performance claim. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- No unresolved critical security defect; zero cross-tenant or unauthorized health/finance results; bounded pools and meaningful429/503 under saturation. Test scope/capacity and accepted residual risk documented, with no unsupported production-performance claim.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during run security, isolation and capacity gate. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-067

### Task Name
Prepare independent staging web/API deployment

### Phase
12 — Deployment and production readiness

### Objective
Prepare independent staging web/API deployment. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: DEC-05 DEC-11

### Dependencies
[GYMOS-MIG-008](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-008), [GYMOS-MIG-009](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-009), [GYMOS-MIG-020](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-020), [GYMOS-MIG-022](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-022), [GYMOS-MIG-026](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-026), [GYMOS-MIG-069](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-069), [GYMOS-MIG-081](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081), [GYMOS-MIG-087](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-087)

### Implementation Scope
Select hosting only after documenting actual provider database-count/create privileges/connection budget/TLS/network/backup limits, expected gyms and replica capacity/cost. Deploy web/API separately with isolated Master/two tenant staging DBs and secrets. Keep runtime tenant DB role separate from provisioner and migration role. Add readiness/dependency health routes proposed in appendix; greeting is liveness only. Run smoke tests without production credentials.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/deployment/deployment.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/deployment/deployment.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/deployment/deployment.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/deployment; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/deployment.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/deployment.ts.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed deployment boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
No feature screen required; update typed server client or diagnostics only when this boundary changes.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-05 DEC-11 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Staging bootstrap from reviewed release artifact succeeds; web/API deploy independently; wrong environment fails guard. Provider capacity evidence and secret ownership recorded. Builds perform no migration or provisioning. Inject staging dependency/worker outage and prove health/alert delivery there;069 requires local/test evidence only and can complete before staging exists. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Staging bootstrap from reviewed release artifact succeeds; web/API deploy independently; wrong environment fails guard. Provider capacity evidence and secret ownership recorded. Builds perform no migration or provisioning. Inject staging dependency/worker outage and prove health/alert delivery there;069 requires local/test evidence only and can complete before staging exists.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during prepare independent staging web/api deployment. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-068

### Task Name
Implement release migration and feature-cutover controls

### Phase
12 — Deployment and production readiness

### Objective
Implement release migration and feature-cutover controls. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: DEC-05 DEC-11

### Dependencies
[GYMOS-MIG-008](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-008), [GYMOS-MIG-026](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-026), [GYMOS-MIG-063](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-063), [GYMOS-MIG-067](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-067), [GYMOS-MIG-081](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081), [GYMOS-MIG-087](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-087)

### Implementation Scope
Define additive expand/backfill-on-disposable-fixtures/contract compatibility sequence, per-gym version gates and explicit approvals for deployment/database cutover. Canary API/web and tenant migrations, pause on failure, record actual schema evidence and feature flags scoped per gym. Backward-compatible releases coexist within declared window. Incompatible DDL needs forward fix/restore plan before release; code rollback alone cannot reverse it.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/deployment/deployment.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/deployment/deployment.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/deployment/deployment.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/deployment; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/deployment.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/deployment.ts.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed deployment boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
No feature screen required; update typed server client or diagnostics only when this boundary changes.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-05 DEC-11 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Rehearse old/new app compatibility, one failed tenant migration, stopped rollout and restoration/forward recovery. No unreviewed source-history squash or auto-migration from web build. Feature flag rollback leaves consistent state. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Rehearse old/new app compatibility, one failed tenant migration, stopped rollout and restoration/forward recovery. No unreviewed source-history squash or auto-migration from web build. Feature flag rollback leaves consistent state.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during implement release migration and feature-cutover controls. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-069

### Task Name
Add operational health, redacted logs and limits

### Phase
12 — Deployment and production readiness

### Objective
Add operational health, redacted logs and limits. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: DEC-04 DEC-05 DEC-11

### Dependencies
[GYMOS-MIG-006](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-006), [GYMOS-MIG-016](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-016), [GYMOS-MIG-022](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-022), [GYMOS-MIG-043](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-043), [GYMOS-MIG-049](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-049), [GYMOS-MIG-080](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080), [GYMOS-MIG-081](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081), [GYMOS-MIG-087](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-087)

### Implementation Scope
Add request/operation/gym identifiers without database URLs/secrets/health text, readiness/dependency and worker health, error tracking, pool/queue/provisioning/schema-age/reconciliation metrics and alert thresholds. Preserve current Nest throttling and add reviewed login/command/export policy per authenticated identity/tenant with cross-replica store when needed. Audit storage and app logs have distinct retention/access.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/observability/observability.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/observability/observability.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/observability/observability.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/observability; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/observability.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/observability.ts.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed observability boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; this task owns shared infrastructure/contracts/schema/tests, not downstream role pages. Referenced features are consumers only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-04 DEC-05 DEC-11 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Inject Master/tenant/worker outage and pool saturation: readiness/alerts distinguish scope, logs correlate retries without secrets and other gyms continue where safe. Rate controls yield429 and no side effects; alerts verified with injected local/test dependencies; staging alert drill belongs to067/070. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Inject Master/tenant/worker outage and pool saturation: readiness/alerts distinguish scope, logs correlate retries without secrets and other gyms continue where safe. Rate controls yield429 and no side effects; alerts verified with injected local/test dependencies; staging alert drill belongs to067/070.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during add operational health, redacted logs and limits. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-070

### Task Name
Rehearse managed backup and disaster recovery

### Phase
12 — Deployment and production readiness

### Objective
Rehearse managed backup and disaster recovery. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: DEC-05 DEC-11

### Dependencies
[GYMOS-MIG-009](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-009), [GYMOS-MIG-026](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-026), [GYMOS-MIG-067](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-067), [GYMOS-MIG-068](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-068), [GYMOS-MIG-069](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-069), [GYMOS-MIG-081](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081), [GYMOS-MIG-087](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-087)

### Implementation Scope
Repeat isolated restore drill using selected managed-provider backups: individual tenant, Master loss and registry/identity references, schema evidence and key access. Measure and approve production RPO/RTO; define restore point consistency/reconciliation for cross-database operations. Rotate recovered secrets per owner process and verify B unaffected. Recovery switch requires human deployment approval and tested rollback.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Verification/evidence files (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-070; scoped test fixtures/cases under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/recovery and /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tests/recovery. Fixes return to owning feature task; no unrelated source change.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-05 DEC-11 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Restored A binding/marker/domain balances/operation/audit history verified with exact times and checksums; Master recovery reconciles pending operations rather than enabling mismatched access. Corrupt/missing backup fails safely; disaster runbook has accountable operators. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Restored A binding/marker/domain balances/operation/audit history verified with exact times and checksums; Master recovery reconciles pending operations rather than enabling mismatched access. Corrupt/missing backup fails safely; disaster runbook has accountable operators.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during rehearse managed backup and disaster recovery. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-071

### Task Name
Complete production acceptance and controlled launch

### Phase
12 — Deployment and production readiness

### Objective
Complete production acceptance and controlled launch. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: DEC-11

### Dependencies
[GYMOS-MIG-064](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-064), [GYMOS-MIG-065](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-065), [GYMOS-MIG-066](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-066), [GYMOS-MIG-068](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-068), [GYMOS-MIG-069](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-069), [GYMOS-MIG-070](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-070), [GYMOS-MIG-087](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-087)

### Implementation Scope
Assemble final acceptance evidence, owner decisions, unresolved risk/deferred scope, deployment/cutover/rollback checklist and on-call ownership. Obtain explicit production deployment approval only after concrete staging artifact/rehearsal results exist. Smoke test all roles/two gyms with synthetic safe accounts; monitor provisioning/session/value errors and rollback triggers. V1 remains reference demo, no customer-data transfer/cutover synchronization.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Verification/evidence files (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-071; scoped test fixtures/cases under /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/release and /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/tests/release. Fixes return to owning feature task; no unrelated source change.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-11 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Signed release gate with no critical security/financial/isolation gap, current restore evidence and compatible versions. Deployment/rollback approval recorded; failed smoke pauses launch. Documentation reflects actual deployed contracts rather than planned availability. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Signed release gate with no critical security/financial/isolation gap, current restore evidence and compatible versions. Deployment/rollback approval recorded; failed smoke pauses launch. Documentation reflects actual deployed contracts rather than planned availability.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during complete production acceptance and controlled launch. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-072

### Task Name
Freeze mobile API subset and scope

### Phase
13 — Mobile preparation and development

### Objective
Freeze mobile API subset and scope. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for M01, M02, M03, T01, T02, T06 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for M01, M02, M03, T01, T02, T06; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C01, C06, C23, C24, C25, C26, C28, C30, C34, C35, C37. Read task-specific mapped source rows and decisions: DEC-12

### Dependencies
[GYMOS-MIG-002](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-002), [GYMOS-MIG-020](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-020), [GYMOS-MIG-048](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-048), [GYMOS-MIG-050](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-050), [GYMOS-MIG-057](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-057), [GYMOS-MIG-088](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-088)

### Implementation Scope
Define Expo/member/trainer MVP subset from stable shared REST contracts; share types/runtime validators/client while keeping authorization/business in Nest. Record mobile-specific secure-token renewal/revocation and deep-link/gym context policy. Approve any feature absent from V1 separately. Mobile may begin after stable lifecycle contracts rather than waiting for production launch; web release remains independently gated.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-072.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-12 before dependent behavior is coded.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
Contract tests use same request/response/error shapes for web/mobile; chosen device OS/support/release scope documented. No duplicate finance/session business logic or unsupported member plan/progress requirement. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- Contract tests use same request/response/error shapes for web/mobile; chosen device OS/support/release scope documented. No duplicate finance/session business logic or unsupported member plan/progress requirement.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-073

### Task Name
Create Expo shell, secure auth and gym themes

### Phase
13 — Mobile preparation and development

### Objective
Create Expo shell, secure auth and gym themes. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for A01, A02, L02 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for A01, A02, L02; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for E01, C01, C03, C05, C06. Read task-specific mapped source rows and decisions: DEC-12

### Dependencies
[GYMOS-MIG-072](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-072), [GYMOS-MIG-088](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-088)

### Implementation Scope
Create proposed apps/mobile Expo workspace with role navigation, gym selector, primary/logo theme adaptation and accessible native primitives. Store tokens in platform-secure storage per signed auth policy; clear all identity/gym query state on logout/switch. Reuse shared API client with independent transport implementation. Do not copy Next DOM components or Server Actions.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile/mobile.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile/mobile.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile/mobile.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/mobile; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/mobile.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/mobile.ts. Proposed native files: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/mobile/src/features/mobile; native tests. No Next DOM copy.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed mobile boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; native client uses shared API.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-12 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Android/iOS simulator login/forced change/expired session/multi-gym selection pass; token never in ordinary async storage/log/deep link. Theme changes cannot retain another gym data. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Android/iOS simulator login/forced change/expired session/multi-gym selection pass; token never in ordinary async storage/log/deep link. Theme changes cannot retain another gym data.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during create expo shell, secure auth and gym themes. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-074

### Task Name
Implement member mobile directory and session flows

### Phase
13 — Mobile preparation and development

### Objective
Implement member mobile directory and session flows. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for M01, M02, M03 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for M01, M02, M03; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C23, C28, C35, C36, C37. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-039](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-039), [GYMOS-MIG-042](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-042), [GYMOS-MIG-044](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-044), [GYMOS-MIG-047](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-047), [GYMOS-MIG-073](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-073)

### Implementation Scope
Build native member trainer directory, request form, session history and cancellation quote from same API policies. Handle offline/timeout as unknown outcome and reconcile operation/version before retry; no speculative credit deduction on device. Preserve approved MVP scope and accessibility while adapting touch/navigation.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile/mobile.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile/mobile.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile/mobile.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/mobile; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/mobile.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/mobile.ts. Proposed native files: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/mobile/src/features/mobile; native tests. No Next DOM copy.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed mobile boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; native client uses shared API.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Member requests without hold, sees acceptance/hold, cancels with exact server quote; foreign gym/offline/retry/expiry scenarios preserve one intent. Same persisted state visible on web and native. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Member requests without hold, sees acceptance/hold, cancels with exact server quote; foreign gym/offline/retry/expiry scenarios preserve one intent. Same persisted state visible on web and native.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during implement member mobile directory and session flows. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-075

### Task Name
Implement trainer mobile session and earnings flows

### Phase
13 — Mobile preparation and development

### Objective
Implement trainer mobile session and earnings flows. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for T01, T02, T06 in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for T01, T02, T06; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for C24, C25, C26, C27, C29, C30, C34, C37. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-045](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-045), [GYMOS-MIG-046](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-046), [GYMOS-MIG-047](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-047), [GYMOS-MIG-049](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-049), [GYMOS-MIG-050](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-050), [GYMOS-MIG-073](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-073)

### Implementation Scope
Build trainer native request response, schedule/start/complete/no-show/shared notes, assigned client list and own earnings using shared endpoints. Show server-time eligibility and pending/committed outcomes; device timer cannot authorize completion. Related-client privacy and selected-gym notification rules remain identical to web.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx>)
- [/Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile/mobile.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile/mobile.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile/mobile.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/mobile; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/mobile.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/mobile.ts. Proposed native files: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/mobile/src/features/mobile; native tests. No Next DOM copy.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed mobile boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; native client uses shared API.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Cross-device simultaneous actions produce one settlement/pay, stale version feedback retains input, unrelated private notes denied. Earnings/credits reconcile to web within measured bound. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Cross-device simultaneous actions produce one settlement/pay, stale version feedback retains input, unrelated private notes denied. Earnings/credits reconcile to web within measured bound.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during implement trainer mobile session and earnings flows. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-076

### Task Name
Prepare mobile tests and Android/iOS release pipelines

### Phase
13 — Mobile preparation and development

### Objective
Prepare mobile tests and Android/iOS release pipelines. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
V1 source behavior and deviations are enumerated for cross-cutting infrastructure in the Traceability Appendix. V2 source-existing surface is limited to E01–E08 plus diagnostic GET/; all other mapped C responsibilities are proposed/partial. Current readiness and preserved services are in Master Plan §5.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: DEC-12

### Dependencies
[GYMOS-MIG-066](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-066), [GYMOS-MIG-073](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-073), [GYMOS-MIG-074](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-074), [GYMOS-MIG-075](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-075), [GYMOS-MIG-088](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-088)

### Implementation Scope
Add native unit/component/API/device journey suites and signing/build pipelines with separate development/staging/production app IDs/endpoints/secrets. Test restore/logout/deep links/network transitions and submit reviewed release artifacts only after owner approval. Push notifications are conditional new scope: record explicit provider/consent/token ownership decision before adding; in-app bell remains required shared functionality.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Proposed, not existing: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile-release/mobile-release.module.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile-release/mobile-release.controller.ts, /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/modules/mobile-release/mobile-release.service.ts and task-owned DTO/policy files only as applicable; /Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/test/mobile-release; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/contracts/src/mobile-release.ts; /Users/esanduepa/Desktop/Projects/gymos-v2/packages/api-client/src/mobile-release.ts. Proposed native files: /Users/esanduepa/Desktop/Projects/gymos-v2/apps/mobile/src/features/mobile-release; native tests. No Next DOM copy.

### Prisma Changes
None

### NestJS Changes
Perform only backend changes explicitly named in Implementation Scope through the proposed mobile-release boundary, extending existing compatible services. C/E references identify consuming boundaries; they do not authorize implementing those endpoints here. Infrastructure/schema/token/UI/test tasks do not implement downstream feature handlers. Add/change a controller only where this task scope explicitly owns that HTTP behavior. Keep business services shared by web/mobile.

### Next.js Changes
None; native client uses shared API.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. Resolve DEC-12 before dependent behavior is coded.

### Authorization Requirements
Enforce mapped contract roles and current gym access in NestJS, then local resource actor/relationship. OWNER administers gym people/config/finance; TRAINER acts only on assigned sessions/confirmed clients/own earnings; MEMBER acts only on self and member-safe directory. Public theme and anonymous login are explicitly limited exceptions. Foreign IDs safe404; support read-only and excludes private health notes.

### Validation and Error Handling
Use strict runtime DTOs and mapped field schemas. Successful reads200, creates201 or explicitly documented202 pending; errors401 expired/invalid,403 forbidden,404 missing/foreign resource,409 stale/version/idempotency/collision conflict,422 field validation,429 rate limit,503 dependency unavailable. Unknown post-commit outcome resolves operation/receipt before retry; no generic failure that encourages duplicate financial effects. No GET writes.

### Testing Requirements
Installable signed staging builds pass all-role/two-gym flows on supported Android/iOS versions; no production key in source/artifacts. Store release approval and rollback/version policy documented. Unapproved push is Deferred, not silently implemented. Run targeted unit/runtime-validator, real database integration and API role/tenant negative cases for changed boundaries; real-browser E2E/visual checks for changed screens. No unrelated broad suite repetition after passing checks.

### Acceptance Criteria
- Installable signed staging builds pass all-role/two-gym flows on supported Android/iOS versions; no production key in source/artifacts. Store release approval and rollback/version policy documented. Unapproved push is Deferred, not silently implemented.
- Success and rejected/failure cases include persisted effect counts and role/gym-safe UI/API behavior; changed reads are pure and sanitized.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: partial or stale outcome during prepare mobile tests and android/ios release pipelines. Preserve authoritative state/version and fail safely; do not infer success from visible UI.

### Rollback or Recovery
Revert scoped application change behind gym-scoped flag only while schema/API compatible. Additive schema changes remain; do not DROP data or reverse DDL automatically. Pause affected operation/tenant, inspect receipt/checkpoints and recover verified steps; use approved forward migration or isolated restore plus reviewed registry switch for incompatible state. Never delete shared global identity as enrollment compensation.

### Out of Scope
No new product functionality beyond the named contracts. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
High

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-077

### Task Name
Resolve Master/tenant configuration ownership and profile-save boundary

### Phase
0 — Foundation and architecture readiness

### Objective
Resolve Master/tenant configuration ownership and profile-save boundary. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-01, accountable to Architecture lead, using DB01; F-D07/D08/D16. Tenant config owns operational currency/zone/rates; choose staged C39 operation or separate saves; define safe pending projection. No cross-database atomic save. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-077.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Blocked — DEC-01 proposal and evidence prepared on 26 October 2026; awaiting explicit project-owner approval.

## Task ID: GYMOS-MIG-078

### Task Name
Resolve Identity verification, credential lifetime and revocation

### Phase
0 — Foundation and architecture readiness

### Objective
Resolve Identity verification, credential lifetime and revocation. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-02, accountable to Security + Product, using DB02; F-D03/D04. Choose canonical international email/collation, verified-login reuse evidence, DOB/age bounds, secret lifetime/ack/reissue, allowed forced-change endpoints and exact token/revocation policy. One role per gym and no existing-password reset are settled. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-078.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. Evidence: [decisions/DEC-02.md](decisions/DEC-02.md).

## Task ID: GYMOS-MIG-079

### Task Name
Resolve Read-only support scope and expiry

### Phase
0 — Foundation and architecture readiness

### Objective
Resolve Read-only support scope and expiry. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-03, accountable to Platform security + Product, using DB08; F-D05. Set reason/expiry, entry/exit invalidation, allowed summary fields and status handling. Support has original actor, no health notes and no tenant write; these are settled. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-079.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Blocked — DEC-03 proposal and evidence prepared on 26 October 2026; awaiting explicit project-owner approval.

## Task ID: GYMOS-MIG-080

### Task Name
Resolve Operation, audit and delivery consistency protocol

### Phase
0 — Foundation and architecture readiness

### Objective
Resolve Operation, audit and delivery consistency protocol. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-04, accountable to Backend reliability + Security, using DB08/DB09/DB10; F-D13/D16/D18. Approve lease/digest/idempotency retention, exact safe committed/pending outcomes, retry permissions and deterministic event taxonomy/retention. Required business+audit+receipt and in-app notification commit locally; optional delivery uses durable outbox. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-080.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. Evidence: [decisions/DEC-04.md](decisions/DEC-04.md).

## Task ID: GYMOS-MIG-081

### Task Name
Resolve Schema compatibility, pooling and recovery policy

### Phase
0 — Foundation and architecture readiness

### Objective
Resolve Schema compatibility, pooling and recovery policy. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-05, accountable to Database + Platform operations, using DB14; F-D13. Approve immutable manifest registry, migration-history preservation, strict mismatch gates, rollout/cache bounds, connection budgets and measured backup targets. No provider/DB capacity is assumed; no reset/squash without separate owner authorization. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-081.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. Evidence: [decisions/DEC-05.md](decisions/DEC-05.md).

## Task ID: GYMOS-MIG-082

### Task Name
Resolve Exact money and operational earning policy

### Phase
0 — Foundation and architecture readiness

### Objective
Resolve Exact money and operational earning policy. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-06, accountable to Finance + Database, using DB06; F-D07/D10. Approve currency set, Decimal precision (19,4 proposed only), minor-unit residual allocation, zero-budget semantics and reports. Early suspension earning/expired unused recognition must be approved or kept separate/unavailable; payments remain deferred. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-082.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Blocked — DEC-06 proposal and evidence prepared on 26 October 2026; awaiting explicit project-owner approval.

## Task ID: GYMOS-MIG-083

### Task Name
Resolve Gym time, term boundaries and scheduling input bounds

### Phase
0 — Foundation and architecture readiness

### Objective
Resolve Gym time, term boundaries and scheduling input bounds. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-07, accountable to Scheduling/Product + Database, using DB03/DB04/DB05; F-D01/D06/D08. Choose date inclusivity, DST ambiguity/gap rejection, overnight shifts, start tolerance/minimum duration precision, input maxima and pack order. Suggested earliest-expiry then stable ID is a proposal. Exact cancellation equality and15-minute no-show are settled. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-083.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Blocked — DEC-07 proposal and evidence prepared on 26 October 2026; awaiting explicit project-owner approval.

## Task ID: GYMOS-MIG-084

### Task Name
Resolve Settlement locking, payroll periods and correction policy

### Phase
0 — Foundation and architecture readiness

### Objective
Resolve Settlement locking, payroll periods and correction policy. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-08, accountable to Finance/Payroll + Backend, using DB05/DB07; F-D02/D11. Review lock order/exclusion constraints, local week/month boundaries (Monday proposed), close-vs-completion retry, immutable approved corrections and quote version acknowledgment. Approval is not payout; completed-only trainer pay is settled. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-084.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Blocked — DEC-08 proposal and evidence prepared on 26 October 2026; awaiting explicit project-owner approval.

## Task ID: GYMOS-MIG-085

### Task Name
Resolve Coaching privacy, metrics, exports and refresh guarantees

### Phase
0 — Foundation and architecture readiness

### Objective
Resolve Coaching privacy, metrics, exports and refresh guarantees. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-09, accountable to Coaching/Privacy + Finance + Frontend, using DB10/DB12; F-D12/D15/D17/D18/D19. Freeze relationship states, note edit/day/unit/row bounds, metric windows/denominators, export safety cap/snapshot, selected-gym polling and numerical cross-role refresh SLA. No unsupported member-plan delivery/global inbox; health ownership and export scopes are settled. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-085.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Blocked — DEC-09 proposal and evidence prepared on 30 October 2026; awaiting project-owner and accountable Coaching/Privacy, Finance, and Frontend review. Evidence: [GYMOS-MIG-085.md](evidence/GYMOS-MIG-085.md).

## Task ID: GYMOS-MIG-086

### Task Name
Resolve Routes, Classic baseline and branding projection

### Phase
0 — Foundation and architecture readiness

### Objective
Resolve Routes, Classic baseline and branding projection. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-10, accountable to Design/Frontend + Product, using DB13; F-D09/D20. Review gym chooser/no-access/legacy redirects, logo fallback, public-safe DTO and supported browsers/visual tolerance. V1 geometry/system font and primary+HTTPS-logo editor are settled; expanded preset/font/mode editor is future. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-086.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Completed. DEC-10 approved as written by Esandu, project owner/Product, 25 October 2026. No separate named Design/Frontend reviewer was recorded; visual review remains GYMOS-MIG-065. Evidence: [GYMOS-MIG-086.md](evidence/GYMOS-MIG-086.md).

## Task ID: GYMOS-MIG-087

### Task Name
Resolve Provider capacity, release approvals and environment policy

### Phase
12 — Deployment and production readiness

### Objective
Resolve Provider capacity, release approvals and environment policy. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-001](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-001)

### Implementation Scope
Prepare one focused decision record for DEC-11, accountable to Project owner + Platform operations, using Environment/deployment constraints. Verify actual hosting/account plan and DB create/count/connection/TLS/backups/region limits, budget, independent deploy strategy and staging/production approval owners. Set retention/observability/rate limits and deploy/rollback triggers. No production credentials or provider choice inferred. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-087.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.

## Task ID: GYMOS-MIG-088

### Task Name
Resolve Mobile scope, token lifecycle and optional push

### Phase
13 — Mobile preparation and development

### Objective
Resolve Mobile scope, token lifecycle and optional push. Deliver the concrete outcomes in Implementation Scope and Acceptance Criteria.

### Current State
Approved MVP choices are recorded in map §14.1; the named technical subdecision remains unapproved/unverified. No ADR approval is inferred from this plan.

### Required Inputs
[UI map](UI_MIGRATION_MAP.md) §§2–7,10,13,16,18 for shared scope; [Functionality map](FUNCTIONALITY_MIGRATION_MAP.md) §§2–3,10–12,14.1,15; [Database map](DATABASE_MIGRATION_MAP.md) §§4,6–9,11–14.1; [API register](MIGRATION_TRACEABILITY.md#api-contract-register) for No new public contract; internal/verification task.. Read task-specific mapped source rows and decisions: No additional unresolved decision assigned; honor approved map §14.1.

### Dependencies
[GYMOS-MIG-048](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-048)

### Implementation Scope
Prepare one focused decision record for DEC-12, accountable to Mobile/Product + Security, using Phase13; F-D04/D12/D18. Approve Expo/OS/device support, member/trainer subset, secure token policy/store release and whether new push is commissioned. Progress/plan delivery beyond V1 requires new scope. Native UI uses same Nest business logic. Record options, selected result, tradeoffs, schema/API impact and concrete expected test examples; do not treat a proposed default as approved. Request the responsible owner’s answer only after a concrete reviewable proposal exists. Update this plan through change control without reopening settled MVP scope.

### Files to Inspect
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/src/app.module.ts>)
- [/Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts](</Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/lib/gymos.ts>)

### Expected Files to Create or Modify
Documentation/evidence only (proposed): /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-088.md; ADR under /Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/decisions when applicable. No application file expected.

### Prisma Changes
None

### NestJS Changes
None; evidence/review task only.

### Next.js Changes
None; evidence/review task only.

### Business Rules
Apply this task’s Implementation Scope, approved map §14.1 and Master Plan §20. The listed C/E contract DTO/auth/result rows in the Traceability Appendix apply within this task’s scope and the approved corrections. No upstream V1 defect overrides an approved correction. No additional unresolved decision is assigned to this task.

### Authorization Requirements
Read-only inspection/decision evidence only; no operational permission granted by this task.

### Validation and Error Handling
Check source/evidence/ADR validity and mark missing evidence explicitly; do not execute an application workflow to validate documentation.

### Testing Requirements
ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose. Documentation links, source paths, IDs and evidence redaction are checked; no application test is invented for document-only changes.

### Acceptance Criteria
- ADR contains the actual reviewer/date/result or explicitly remains Blocked; each affected task links the signed result and has unambiguous expected outcomes. No implementation marked verified from decision prose.
- All statements distinguish observed source, prior evidence, proposed work and unresolved decisions.
- Evidence identifies revision, environment/fixtures, commands/exit codes and any skipped or unavailable verification.

### Definition of Done
Dependencies Completed with linked evidence; task-specific acceptance checklist met; implemented scope and relevant tests reviewed; role/tenant/privacy/error behavior verified where applicable; no unresolved critical defect; documentation/contracts/tracker updated; exact commands, exit codes and artifacts recorded. Implemented without evidence is not Verified or Completed.

### Known Risks
See linked risk register for tenant/identity/operation/schema/financial exposure. Main task-specific hazard: claiming evidence or approval that has not been obtained.

### Rollback or Recovery
Preserve previous documentation and append correction/decision history; do not erase evidence or mark unexecuted checks passing.

### Out of Scope
No application code, database operation or external approval implied by this planning task. No V1 modification, customer-data import, V1-ID preservation, new payment/subscription capability or unapproved product-rule invention.

### Deliverables
Scoped reviewed PR/decision record, mapped contracts/schema changes when specified, targeted test results, redacted verification evidence and UI screenshots only when actually captured; tracker/coverage links updated.

### Estimated Complexity
Medium

### Suggested Work Unit
One focused task PR with the named scope. If implementation evidence shows this exceeds a focused session, propose numbered new task IDs and split by a complete usable boundary before coding; retain this ID and dependencies as an integration gate, never silently mark partial work Completed.

### Status
Not Started.
