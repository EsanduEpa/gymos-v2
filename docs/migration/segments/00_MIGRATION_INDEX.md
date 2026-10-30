# GymOS V1 → V2 Feature Migration Index

> **Current verified status — 30 October 2026 at `bdf3b41`:** Segment 01 is COMPLETED (23/23); overall 27/88 tasks completed. All 11 hosted checks passed at [run 41013407287](https://github.com/EsanduEpa/gymos-v2/actions/runs/41013407287). Owner-approved decisions and owner-attested external remediation with independently verified local cleanup/scanning are reflected in current evidence. Older audit checkpoints are historical.

> **Audit baseline:** 25 October 2026. **Purpose:** execution navigation, not implementation evidence. V1 remains the behavioral/UI reference; V2's approved Master/tenant architecture is the technical target. The authoritative task details remain in [`../MIGRATION_TASK_SPECS.md`](../MIGRATION_TASK_SPECS.md), and live evidence remains in [`../evidence/`](../evidence/).

## 1. Objective and authority

Preserve the required V1 workflows, screens, business rules, and role experiences while moving them into V2's Next.js web + NestJS modular monolith + separate Master and per-gym PostgreSQL databases. Preserve verified V2 foundations rather than rewriting them. Correct known V1 security, concurrency, accounting, and tenant-boundary defects as required by the approved decisions.

Order of authority when sources disagree:

1. Explicit project-owner decisions and approved ADRs.
2. Approved MVP addenda in the existing migration maps.
3. The master plan and authoritative task specifications.
4. The four source maps and traceability appendix.
5. V1 code as evidence of existing behavior, never as authority to reproduce a known defect.

No segment may modify V1, import customer data, preserve V1 IDs, invent deferred product features, or bypass Nest authorization with frontend-only checks.

## 2. Architectural difference summary

| Concern | V1 source state | Approved V2 target |
|---|---|---|
| Runtime | Integrated Next.js application with Server Actions/direct Prisma | Next.js web adapters calling one NestJS REST business surface |
| Data ownership | One PostgreSQL schema with `gymId` filtering | Master identity/registry/access/operations plus one physical tenant database per gym |
| Identity | One `User` mixes global identity and gym actor | Master `User`/`GymAccess`; independent tenant `Member`/`Trainer` actors linked by typed IDs |
| Authorization | Role checks plus application filtering | Current Master access, tenant binding/schema gate, actor/relationship policy, safe 404 for foreign IDs |
| Commands | Several non-idempotent multi-write actions | Durable Master operations, tenant command receipts, local transactions, explicit unknown/recovery outcomes |
| Money/time | Floats and implicit local/date behavior | Approved exact money/date/time contracts, fee/pay snapshots, versioned policy |
| UI | 29 route responsibilities, 26 rendered pages, role dashboard chrome | Preserve V1 hierarchy and interactions using shared accessible primitives and semantic theme tokens |
| Delivery | Web-only V1 | Web MVP first; mobile is an explicitly gated later segment using the same APIs |

## 3. Current verified state — 30 October 2026

- Completed tasks include Segment 01 IDs 001–012, 014 and 077–086; overall 27/88. See tracker for the full current status.
- GYMOS-MIG-008 completed; all 11 hosted checks passed at current verified revision `bdf3b41` in run 41013407287.
- GYMOS-MIG-010 completed based on owner-attested Neon rotation/redeployment, smoke checks, non-reuse and follow-up; local hardcoded URL removal and V2 scan were independently verified. Provider logs and historical access are not independently verified.
- Decision tasks 077, 079, 082–085 are completed under project-owner review; independent specialist review is not claimed.
- Implemented V2 code already includes identity/access schema, tenant schema verification, bounded tenant leases, durable operation/receipt/audit primitives, disposable two-gym tests, recovery tooling, shared contracts/client, Classic tokens, shared UI primitives, and V1 visual fixtures.
- Most V1 business domains and role screens remain not started. Existing V2 member CRUD is a basic contact slice, not full enrollment.

Statuses in this directory reflect linked evidence, not the existence of a plan. The next dependency-satisfied handoff is GYMOS-MIG-013; Segment 02 work was not started during Segment 01 closure.

## 4. Segment list and execution order

| Order | Segment | Capability | Tasks owned | Status | Depends on |
|---:|---|---|---:|---|---|
| 1 | [01 — Platform Foundation and Decision Gates](01_PLATFORM_FOUNDATION_AND_DECISION_GATES.md) | Preserve verified infrastructure; finish CI, security containment, and product/technical decisions | 23 | COMPLETED | None |
| 2 | [02 — Identity, Authentication, and Application Shell](02_IDENTITY_AUTH_AND_APPLICATION_SHELL.md) | Login, forced password change, role/gym routing, protected chrome, logout | 6 | IN PROGRESS (4/6 tasks) | 01 |
| 3 | [03 — Platform Administration and Tenant Lifecycle](03_PLATFORM_ADMIN_AND_TENANT_LIFECYCLE.md) | Gym registry, provisioning, activation, support, suspension, schema rollout | 6 | WAITING FOR PREREQUISITES | 01, 02 |
| 4 | [04 — Gym Configuration and Membership Rules](04_GYM_CONFIGURATION_AND_MEMBERSHIP_RULES.md) | Branding, profile, plans, rates, policies, membership eligibility | 5 | WAITING FOR PREREQUISITES | 01–03 |
| 5 | [05 — Member Enrollment and Account Management](05_MEMBER_ENROLLMENT_AND_ACCOUNT_MANAGEMENT.md) | Full registration, list/profile, status, packs, recovery journey | 5 | NOT STARTED | 02–04; session base from 07 for status/pack invariants |
| 6 | [06 — Trainer Management and Coaching](06_TRAINER_MANAGEMENT_AND_COACHING.md) | Trainer enrollment/roster/directory, client 360, workout and meal plans | 7 | NOT STARTED | 02–05; session reads from 07 for confirmed relationships |
| 7 | [07 — PT Sessions, Notifications, and Lifecycle](07_PT_SESSIONS_NOTIFICATIONS_AND_LIFECYCLE.md) | Booking/request, holds, transitions, views, notifications, exact-once settlement | 9 | NOT STARTED | 02, 04–06 |
| 8 | [08 — Finance, Dashboards, Analytics, and Exports](08_FINANCE_DASHBOARDS_ANALYTICS_AND_EXPORTS.md) | Operational earning, expenses, budgets, payroll, dashboards, audit and CSV | 10 | NOT STARTED | 03–07 |
| 9 | [09 — Scope Closure, Parity, and Quality Gates](09_SCOPE_CLOSURE_PARITY_AND_QUALITY_GATES.md) | Deferred-scope honesty, coverage reconciliation, two-gym, visual/accessibility and security gates | 5 | NOT STARTED | 01–08 |
| 10 | [10 — Deployment, Recovery, and Controlled Release](10_DEPLOYMENT_RECOVERY_AND_CONTROLLED_RELEASE.md) | Provider policy, staging, cutover, observability, managed recovery, launch | 6 | NOT STARTED | 01, 02, 03, 09 |
| 11 | [11 — Mobile Applications](11_MOBILE_APPLICATIONS.md) | Gated Expo member/trainer subset and release pipelines | 6 | NOT STARTED | 07–10 and explicit DEC-12 approval |

Segments express ownership, not permission to ignore task-level dependencies. When a later segment supplies a prerequisite (notably the session aggregate needed by member/trainer status work), execute the prerequisite task first and return to the owning segment; do not duplicate it.

## 5. Dependency overview

```text
01 Foundation/decisions
 ├─> 02 Identity/shell ──> 03 Platform/tenancy ──> 04 Configuration
 │                           │                       │
 │                           └───────────────────────┼─> 05 Members
 │                                                   └─> 06 Trainers
 └──────────────────────────────────────────────────────> 07 Sessions
 03 + 04 + 05 + 06 + 07 ──> 08 Finance/insights
 01–08 ──> 09 Parity/quality ──> 10 Release
 07–10 + DEC-12 ──> 11 Mobile
```

DEC-01/03/06/07/08/09 are owner-approved and their decision-recording tasks are complete; their rules govern downstream feature implementation. DEC-11 (provider/release) and DEC-12 (mobile) remain open decision gates. Approved DEC-02/04/05/10 must be followed, not reopened without change control.

## 6. Agent execution rules

For every segment session:

1. Read the entire segment and its referenced ADRs/evidence.
2. Inspect the current source; paths marked **proposed** are not proof that a file exists.
3. Verify every prerequisite from evidence and current tests. Do not infer completion from code presence.
4. Reserve shared schemas/contracts/guards before concurrent work.
5. Complete one smallest safe task at a time and run its targeted tests.
6. Keep business rules in Nest services; use shared runtime contracts at every boundary.
7. Enforce Master access, tenant binding/schema, actor/relationship, and resource ownership server-side.
8. Preserve V1 layout/flow unless an approved decision explicitly changes it.
9. Update task checkboxes, progress, coverage, evidence, and handoff only after verification.
10. Record discrepancies and stop at a named decision/external checkpoint; do not guess.
11. Avoid unrelated changes, destructive database operations, V1 writes, and secret values in logs/docs.
12. Finish with changed files, commands/exit codes, scenarios verified, unresolved risks, and next task.

## 7. Interrupted-session recovery

Start from the segment's **Progress and Handoff** section, then reconcile it with `../MIGRATION_TASK_TRACKER.md`, `MIGRATION_PROGRESS.md`, linked evidence, Git status, and current source. Re-run the narrow verification for the last claimed completed task. If records disagree, downgrade the local claim and document the discrepancy; never erase prior evidence. Resume the first dependency-satisfied unchecked task.

## 8. Overall migration checklist

- [x] Source inventories and original migration maps preserved.
- [x] Baseline, core contracts, identity/operation/tenant safety foundations, test harness, recovery drill, tokens/primitives, and visual fixtures evidenced.
- [ ] Remaining decisions approved and recorded.
- [ ] V1 credential exposure contained with external evidence.
- [ ] All web vertical slices implemented and verified.
- [ ] Every V1 route/workflow/control disposition reconciled.
- [ ] Two-gym cross-role, visual/accessibility, security/isolation/capacity gates pass.
- [ ] Deferred/mock functionality is hidden or honestly labeled.
- [ ] Staging deployment, migration/cutover, observability, and managed restore pass.
- [ ] Production approval owners sign off and controlled launch completes.
- [ ] Mobile scope is either explicitly approved and delivered or explicitly deferred.

## 9. Final integration and release criteria

Release requires completed segments 01–10, no unresolved critical security/tenant/data-integrity defect, all required decisions approved, GYMOS-MIG-010 containment evidence, full source-to-task coverage, role and foreign-tenant negative tests, exact-once session/financial invariants, visual/accessibility review, a representative staging rehearsal, managed backup/restore evidence, redacted operational telemetry, an approved rollback/cutover plan, and named production approval. Segment 11 is release-blocking only if DEC-12 puts mobile in the same release.

## 10. Coverage audit statement

The accompanying [coverage matrix](MIGRATION_COVERAGE_MATRIX.md) assigns all 88 authoritative `GYMOS-MIG-*` tasks exactly once and maps all 29 V1 route responsibilities. This is complete static planning coverage, not runtime parity. Remaining ambiguity is explicitly assigned to decision tasks; no claim of 100% implemented functionality is made.

**First executable segment:** `01_PLATFORM_FOUNDATION_AND_DECISION_GATES.md`.
