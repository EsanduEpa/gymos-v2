# GYMOS-MIG-042 — member request and trainer accept/decline

Status: **In Progress; API/UI slice, directory integration and guarded/browser verification are implemented.** Evidence captured 3 November 2026 on branch `codex/segment-06-management`, based on `7c09fd4`; changes are uncommitted.

## Implemented slice

- Member requests derive the member from authenticated gym access, require an active selected-gym trainer/member publication, active membership and at least one available unexpired pack credit, and validate gym-local time/DST/horizon. Pending sessions create no hold, settlement, earning or pay record.
- Member and trainer gym-access share locks remain held through each tenant command commit. Trainer decisions are assigned-trainer-only and version checked; acceptance rechecks member/trainer status and membership/credit, updates the session and reserves a credit in one tenant transaction. Decline creates no hold or settlement.
- Optional decline reasons are bounded to 500 characters, trimmed and line-ending normalized. The owner approved member visibility. They persist only on DECLINED sessions via `20261103040000_session_decline_reason`; the member read projection returns the reason only to the requesting member, while trainer and owner views return `null`.
- Request, acceptance and decline state events, audit rows, command receipts and required source-keyed notifications share the tenant transaction. Receipt safe results persist the session ID, stable notification event ID, notification state and retryability; role/actor and gym slug are derived from the access-locked party and selected gym on replay. Two-gym actor access is checked through tenant binding and Master access.
- Added safe member request options, pending trainer request list, Server Actions, member request route and trainer request review route. Unknown outcomes retain the same idempotency key; definite conflicts require refreshed state/new key.
- Added strict contracts, API client module, contract tests and an owned disposable PostgreSQL integration suite for zero-effect pending requests, accept/decline, stale versions, receipt replay, competing acceptance against the last credit, current-policy/expired-request rejection, and notification failure rollback.

## Verification

- `pnpm --dir packages/contracts build` — exit 0.
- `pnpm --dir packages/contracts test` — exit 0; 38/38 tests.
- `pnpm --dir apps/api exec vitest run --config vitest.config.session-requests.ts --disableConsoleIntercept` with `GYMOS_TEST_ALLOW_DOCKER=1` and approved escalation — exit 0; 4/4 guarded disposable PostgreSQL tests. Verified exactly one of two concurrent acceptances reserves the last credit, pending requests add zero holds/movements/settlement/earning/pay, replay returns the same receipt/session/event ID, decline creates no hold, stale and current-policy/expired decisions create no effects, and an injected HIRE_REQUEST notification insertion failure rolls back the session, receipt, audit, notification, hold and ledger writes. Harness reported `droppedDatabases: 6`, `containerRemoved: true`, `manifestRemoved: true`.
- `pnpm --dir apps/api exec vitest run --config vitest.config.session-reads.ts --disableConsoleIntercept` with `GYMOS_TEST_ALLOW_DOCKER=1` and approved escalation — exit 0; 5/5 Task 044 session/member-overview guarded tests. Verified decline reason appears on member own-session projection and is `null` for trainer/owner views. Both test fixtures reported cleanup of six disposable databases, the container and manifest.
- `pnpm --dir packages/api-client typecheck`, `pnpm --dir apps/api exec tsc --noEmit --pretty false` and `pnpm --dir apps/web exec tsc --noEmit --pretty false` — exit 0 after Task 044 compile fixes.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e --grep 'trainer roster/profile and member directory'` — exit 0; 1/1 guarded two-gym headed browser test. It follows the member-safe directory link to the selected trainer request form, submits a pending request and verifies no hold/movement is created, accepts another request as that trainer and verifies one held credit, declines a second request with a reason and verifies that reason in the requesting member's session view. Cleanup dropped six disposable databases and removed the container and run manifest. This is agent-performed automated browser review, not owner-observed Chrome acceptance.
- The controller/service and typed client are registered in the shared API module/barrels; Task039 now links to the working Task042 request route. Task044 reads the decline reason only in the member projection.

## Remaining acceptance

- Visible owner-observed Chrome review and hosted CI remain open. The CUA browser-control host is unavailable; no owner acceptance is claimed.
- Task 042 remains In Progress pending committed-revision and hosted checks and the full Task048 race gate. No task completion is claimed here.

## Agent-performed native Chrome review — 4 November 2026

- Synthetic member requests were accepted and declined by the assigned trainer in the dedicated Chrome window. The requesting member subsequently saw the persisted decline reason, one scheduled and one declined session, and the expected available/held credit counts. Agent-performed review only; see the [acceptance ledger](SEGMENTS-06-07-ACCEPTANCE.md).
