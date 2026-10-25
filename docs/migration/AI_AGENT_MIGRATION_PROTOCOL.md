# GymOS V2 — AI Agent Migration Execution Protocol

Companion to [Master Plan §25](MIGRATION_EXECUTION_PLAN.md#25-ai-agent-execution-protocol). The selected [task specification](MIGRATION_TASK_SPECS.md), not this summary, defines scope/acceptance. Start with **GYMOS-MIG-001**. GYMOS-MIG-002 and077–088 own contract/decision gates; GYMOS-MIG-063–066 verify completion and071 controls release.

## Before starting

1. Read Master Plan, chosen task, its dependency rows, applicable four-map sections, approved §14.1, related ADRs and source traceability records.
2. Inspect relevant V1 files read-only and current V2 implementations, schemas, controllers, adapters and tests. Do not infer current files from a proposed target path.
3. Inspect Git status in both repositories, existing uncommitted work, tracker reservations/PRs and whether another task already delivers the requirement. Preserve unrelated edits/maps.
4. Confirm dependencies Completed with evidence, unresolved decision gates, environment guards and required access. A file or prior README statement is not runtime evidence. Reserve task/shared schema/contract ownership.
5. Set Ready/In Progress only when justified; if blocked record exact decision/evidence/owner and proceed only on independent approved preparation. Never invent a business rule to unblock yourself.

## During implementation

- Modify V2 only. No V1 source/config/schema/db change, import/ETL, copied V1 IDs/credentials or customer-data transfer.
- Follow vertical slices: presentation + typed API + backend rules + correct database boundary + auth/tenant/relationship + tests + evidence. Preserve V1 layout/fields/interactions while applying approved defects/scope corrections.
- Reuse current auth/guards/clients/provisioning/theme/member foundation where compatible. Thin Next Server Actions/server read adapters are permitted; Prisma/business settlement in web is prohibited. Web/mobile share Nest services.
- Use task-sized branches (`codex/gymos-mig-XXX-short-name`), reviewable PRs, limited dependencies and no unrelated refactor. Read apps/web/AGENTS.md and bundled Next guidance before code changes.
- Use additive reviewed migrations, pinned manifest/verifier and isolated synthetic tests. Builds do not mutate DBs. No reset/squash/destructive deploy without explicit owner authorization. Never run verify:milestone against unknown targets; its cleanup forcibly drops databases.
- Enforce current Master→gym→physical binding/schema→actor→relationship checks. No trusting browser slug/actor/fee/recipient/database name. Master outage fails closed. No cross-database ACID assumption.
- Commit required local business/receipt/audit/notification evidence together; reconcile cross-plane operations by persisted IDs. Idempotency key replays do not replace unique terminal settlement/hold/pay constraints. Preserve unknown outcomes before retry.
- Never put secrets/password hashes/database URLs/private health data in DTOs, logs, fixtures/screenshots or evidence. Temporary secrets are not replayed. Keep pending enrollment unpublished.
- Keep unsupported billing/receipts/subscriptions/global inbox/progress/new member-plan UI deferred. Product choices in map §14.1 remain settled; architectural changes need concrete change proposal and project-owner approval.

## Tests and evidence

Use task-specific scenarios plus relevant unit/DTO/API/database/E2E/visual checks. Test allowed/invalid/forbidden/foreign-ID/dependency-failure/retry cases; assert persisted effect counts, not only HTTP success. Session/money races need real PostgreSQL and synchronized concurrent requests. Use per-run Master+two tenant DBs, pinned clock/currency/timezone and >100 rows for page/export tests. Never run V1 against original data to produce visual evidence; use safe disposable copy/runtime with hashes unchanged.

Evidence directory proposed: `docs/migration/evidence/GYMOS-MIG-XXX/`. Record actual revision/runtime versions/environment, fixture manifest, commands and exit codes, redacted logs/results, database assertions, screen/state/viewport captures, intentional diff review, decision/risk/defect references, skipped checks/reasons and recovery observations. Missing evidence stays missing; no fabricated screenshots, percentages or test results.

## After implementation report

Report Task ID; created/modified files; implemented behavior; V1 behavior preserved; defects corrected; endpoints/contracts added/changed; Prisma migrations/constraints; authorization/tenant behavior; tests executed/results; build/typecheck/lint exits; screenshots/visual review; remaining issues; plan deviations/reviewer approvals; rollback/recovery evidence; and next task IDs whose dependencies are now satisfied.

Update task status and evidence links in tracker and authoritative specification together. Implemented = code exists; Verified = required evidence passed; Completed = acceptance+DoD reviewed, no unresolved critical defect and documentation current. Do not promote a task because a test was skipped or source files exist. Deferred disposition is not a Completed implementation.

## Change and collaboration control

Each shared schema/contract change names one coordinating owner and integration order. Before rebase/merge, inspect upstream changes and rerun only affected checks. Preserve user work; no force reset/clean. New scope receives a new stable task ID; old IDs are never reused. Update Master Plan/Task Specs and synchronized dependency/tracker/traceability views in one review. Record unresolved owner decisions rather than silently rewriting the roadmap.

Prepare deployment artifacts, staging evidence, migration plan and rollback first. Project owner approves the concrete production release under GYMOS-MIG-071; no implementation task grants standing production deployment permission. Exposed V1 credential follow-up010 may require separate external authorization; record status without reproducing values or editing V1.
