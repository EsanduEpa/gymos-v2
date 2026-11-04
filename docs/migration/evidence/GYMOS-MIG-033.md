# GYMOS-MIG-033 — Recoverable member status and future hold release

Status: **In Progress.** Working-tree evidence on `codex/segment-06-management`, base `7c09fd4`, 3 November 2026.

## Implemented

- Owner-only member status commands create a typed Master `CHANGE_MEMBER_STATUS` operation with a durable `MemberLifecycleIntent`, version checks, resumable checkpoints and a tenant status receipt/audit.
- Deactivation or suspension revokes only the selected gym's `GymAccess` link before changing tenant status. Reactivation changes tenant status before republishing access. Failures after revocation remain resumable; reactivation does not restore cancelled sessions.
- Future `PENDING_CONFIRMATION` and `SCHEDULED` sessions are cancelled in bounded batches. Each command releases any held credit, writes one audit and a member notification in the tenant transaction. Active/completed history is preserved. Replay reconstructs a stable cancellation count from committed release receipts and `MEMBER_SESSION_RELEASED` audit evidence; skipped stale candidates do not count as cancelled.
- The guarded fixture now registers the same identity as an active member in Gym B, with its own completed enrollment operation, tenant receipt, access link and pending session. Suspending and later changing that identity's Gym A member status leaves the Gym B member status, pending session and active GymAccess link unchanged.
- Added the owner member profile status form and recovery action. Failures retain the request key; pending cross-plane outcomes expose a resume action.
- Added additive Master migration `20261103040000_member_lifecycle_intent/migration.sql`; SHA-256 `304c97681a03e5bff34226bafeda0d0385aed6d22e40ed412cc64437f1a7eebc`.

## Verification

- `pnpm --dir packages/contracts build` and `pnpm --dir packages/contracts test` — exit 0; 47/47 tests.
- `pnpm --dir packages/api-client typecheck`, `pnpm --dir apps/api exec tsc --noEmit --pretty false`, and `pnpm --dir apps/web exec tsc --noEmit --pretty false` — exit 0.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.member-lifecycle.ts --disableConsoleIntercept` — exit 0; 1/1 guarded disposable PostgreSQL test. It verifies injected notification failure leaves the pending session and held credit unchanged after access revocation; recovery cancels multiple future sessions and releases each hold once; a stale boundary candidate that becomes past is skipped and excluded from the count; stale expected version has zero effects; a completed session remains unchanged; same-key replay is stable; reactivation preserves cancellation history; ACTIVE/INACTIVE/SUSPENDED transitions work when access is already revoked; and a same-identity Gym B enrollment, active link and pending session remain unchanged by Gym A lifecycle operations. Cleanup: six disposable databases dropped, test container removed and run manifest removed.
- `pnpm --dir apps/api exec vitest run src/member-lifecycle.controller.spec.ts --disableConsoleIntercept` — exit 0; 1/1 no-database Nest/Supertest route test. It signs Gym B owner and member tokens, invokes the production `GymAccessGuard` against mocked Master/tenant lookups, and sends requests through `app.getHttpServer()`. A Gym A operation ID queried under Gym B returns 404 with the Master lookup scoped to owner identity and Gym B ID; a valid Gym B member receives 403 from the owner-only status-history route.
- No visible owner-observed Chrome review or hosted checks are recorded.

## Remaining acceptance

- Run the member status headed UI flow and visible Chrome review when the browser-control host is available.
- Complete shared Task 048 booking/status race verification and hosted checks.

## Hosted rollout follow-up — 4 November 2026

- PR #8 hosted run `41776997248` exposed that the two lifecycle intent migrations already present in `packages/database-master/prisma/migrations` were missing from `MASTER_TEMPLATE_MANIFEST`. Added both checksummed migrations, their table/column postconditions, and advanced the Master template version to `master-2026-11-03.1`; no migration was removed or rewritten.
- Focused reproduction and verification: `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.platform.ts test/platform/rollout.integration.test.ts --testNamePattern='deploys/verifies the immutable Master chain only through the owned runner and refuses missing ownership' --disableConsoleIntercept` — exit 0; 1 passed, 8 skipped. Cleanup reported five owned databases dropped and the disposable container removed.
- Task 033 remains In Progress. Task 048 is still gated on Task 049, which remains in Segment 08.
