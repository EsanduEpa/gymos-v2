# GYMOS-MIG-040 — session aggregate, holds and transition constraints

Status: **In Progress; foundation verified, task acceptance incomplete.** Evidence was captured 3 November 2026 from uncommitted working-tree changes on `codex/segment-06-management`, based on `7c09fd4`. No commit or hosted PR checks exist for this work.

## Implemented foundation

- Added the tenant PT session aggregate, state-event history, credit holds, immutable pack movements, settlement, operational earning, pay period/record and notification models, with additive migration `20261103010000_pt_session_and_notification_foundation`.
- Added state-shape and movement checks, append-only event/ledger triggers, foreign keys and indexes, plus a half-open GiST exclusion constraint for overlapping scheduled/active sessions per member or trainer.
- Added named transition rules, interval overlap and eligible-pack ordering helpers. Added transactional reservation and hold resolution primitives with documented Member → Trainer → SessionPack lock order, eligibility rechecks and source-keyed ledger effects.
- Added command helpers that lock/version-check a session, validate the actor relationship, snapshot acceptance values and append state/audit records in the caller’s transaction. Tasks 041/042 and 045–047 now consume the named transitions and hold primitives through role-guarded HTTP commands; no generic status setter was added.
- Added a transaction callback wrapper that retries only PostgreSQL serialization/deadlock errors, at most three attempts. Its contract requires callers to create a fresh transaction per attempt and keep non-database effects outside the callback.

## Verification

- `pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma` — exit 0.
- `pnpm exec prisma generate --schema packages/database-tenant/prisma/schema.prisma` — exit 0.
- `pnpm --dir apps/api exec vitest run src/sessions/session-state.spec.ts src/sessions/session-transactions.spec.ts --disableConsoleIntercept` — exit 0; 8/8 unit tests, including retryable SQLSTATE/Prisma errors, no retry for uniqueness/application failures and the three-attempt bound.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.sessions.ts --disableConsoleIntercept` — exit 0; 3/3 guarded disposable PostgreSQL tests. Verified single-winner concurrent last-credit reservation and exactly-once consumption, simultaneous overlap rejection while allowing touching half-open intervals, versioned named transition behavior, invalid direct completion, stale retry denial and audit-conflict rollback. Harness output confirmed removal of six owned databases, container and run manifest.
- `pnpm typecheck:workspace` — exit 0.
- `pnpm lint:workspace` — exit 0 after the audit-query cleanup; no lint warnings on the final run.
- `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test && pnpm --dir packages/api-client typecheck` — exit 0; 28 contract tests passed.
- `pnpm build:workspace` and `pnpm --dir apps/web build` — exit 0 (recorded during implementation).
- `git diff --check` — exit 0.

The migration checksum is `752b61acf2704e1cab46f51a2109db43f7bca896e27f34ca60e626b76e0f3022`; the static tenant template manifest contains the same checksum. The migration was exercised only by guarded disposable test databases. No demo database or V1 database was used or changed.

## Consumer integration follow-up — 3 November 2026

- The guarded booking suite (041, 3/3), request suite (042, 4/4), start/completion/correction suite (045/046, 3/3), and quoted cancellation/no-show suite (047, 5/5) now exercise the foundation at its command boundaries. Coverage includes last-credit and interval races, stale/versioned transitions, exact-once ledger resolution, replay, role/foreign-gym denial, notification/audit rollback, and pay/revenue outcomes.
- Task 033 also consumes the same state/hold foundation for resumable member status changes, future release and selected-gym notification recovery; its guarded suite and in-process route guard checks pass.
- Role read and C63 suites pass 5/5 and 2/2. The headed two-gym role journey checks read purity and role-visible session commands.

## Remaining acceptance

- Task 048's combined barrier-synchronized cross-boundary race suite remains open. Its dependency on Task 049 conflicts with Segment 07's explicit ownership boundary; owner direction is pending before any finance-scope expansion.
- Hosted checks on the final committed revision and owner-observed Chrome review remain open. The CUA browser-control host is unavailable, so no independent owner-visible review is claimed.
- Preserve the additive migration; do not rewrite it after applying it to any persistent environment.
