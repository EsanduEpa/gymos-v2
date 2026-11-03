# GYMOS-MIG-034 — session-pack issuance and balance projection

Status: **In Progress.** Current evidence is from the uncommitted working tree on `codex/segment-06-management`, based on `7c09fd4`. The implementation reuses Task 040's `SessionPack`, `PackCreditMovement`, and `CommandReceipt`; no second pack model or payment event was added.

## Implemented slice

- Added strict pack issuance and result contracts plus a typed API-client command.
- Added an owner-only selected-gym command for active local members. It validates whole credits (1–1,000), validity (1–3,650 days), exact nonnegative two-decimal price (including zero), configured gym currency and timezone, and emits a single transactional pack, ISSUE movement, command receipt and audit record.
- A repeated or concurrent request with the same idempotency key resolves to the one committed pack. Unpublished foreign member IDs return not found; non-owner access is denied.
- Owner member profile now projects available, held, consumed and expired credits from the append-only ledger. The read classifies unheld credits as expired after the gym-local exclusive end date without writing on GET. Held credits remain held after expiry.
- Added a member-profile issue form with explicit credits, validity, agreed price and gym currency. It states that entitlement issuance does not record payment.

## Verification

All commands ran against the working tree based on `7c09fd4`; no commit or hosted run exists.

- `pnpm --filter @gymos/contracts build` — exit 0.
- `pnpm --dir packages/contracts test` — exit 0; 30/30 tests, including zero-price and invalid count/price/currency/unknown-field pack inputs.
- `pnpm typecheck:workspace` — exit 0.
- `pnpm build:workspace` — exit 0; API and web production builds completed. After the subsequent trainer local-time formatting correction, `pnpm --dir apps/web build` also exited 0.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.packs.ts --disableConsoleIntercept` — exit 0; 1/1 guarded PostgreSQL integration test. It verified owner authorization, member-role denial, foreign-gym 404, fractional-credit rejection, concurrent same-key replay, zero-price issuance and exactly one persisted pack/ISSUE movement/committed receipt/audit. It also verified expired-unused balance projection is pure: movement, receipt and audit counts did not change on GET. Cleanup reported six owned databases dropped and the test container and manifest removed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.packs.ts` — exit 0; 1/1 guarded PostgreSQL integration test, additionally verifying conflicting same-key/different-price rejection and injected audit failure with unchanged pack, movement and receipt counts. Cleanup reported six owned databases dropped and the test container and manifest removed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config=playwright.manual.config.ts --grep 'trainer roster/profile and member directory|member roster and profile keep role'` — exit 0; 2/2 headed Playwright cases using `channel: 'chrome'`, synthetic two-gym fixtures and guarded test resources. The member journey issued a zero-price three-credit pack, showed three available credits, verified one persisted pack and checked the 320px layout. The trainer profile displayed the fixture session at 9:30 AM GMT+5:30 for `2026-11-01T04:00:00Z`. Both screenshots listed below were opened and visually reviewed.
- Related current-checkout checks: guarded session invariants 4/4, notification authorization/rollback 4/4, and trainer profile API 1/1; all reported six disposable databases, container and manifest cleaned.
- `git diff --check` — exit 0.

## Evidence and limits

- [Member pack panel at 320px](GYMOS-MIG-034/member-pack-panel-320.png).
- [Trainer session summary at 390px](GYMOS-MIG-037/owner-profile-session-summary-390.png) — time shown in the gym's Asia/Colombo zone.
- Headed Chrome-channel Playwright ran and screenshots were reviewed. The CUA browser bridge exposed the existing GitHub window rather than the Playwright test window, so this record does not claim that the owner independently watched or approved the run.
- The browser group initially found stale production artifacts; rebuilding fixed the contracts. It then exposed an invalid `Intl.DateTimeFormat` option combination; the formatter was corrected and the final headed browser group passed.

## Remaining acceptance

- Conflicting same-key/different-price behavior and post-write rollback are now verified. A temporary PostgreSQL trigger injected an audit failure; pack, movement and receipt row counts remained unchanged. The guarded integration test exited 0 (1/1), and cleanup reported six owned databases dropped plus test container and manifest removal.
- Task 040 and downstream session lifecycle tasks now have linked guarded evidence; Task 033 status/release and cross-gym isolation are implemented and tested. Task 048's combined barrier suite remains gated on the owner-confirmed Segment 08 Task 049 dependency.
- Full task/segment hosted checks, a committed reviewable revision and owner-observed Chrome review remain open. Do not mark Task 034 or Segment 07 complete until its dependency and release gates close.
