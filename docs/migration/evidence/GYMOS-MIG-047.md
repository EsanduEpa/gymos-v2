# GYMOS-MIG-047 — Quoted cancellation and no-show

Status: **In Progress.** Evidence is from the uncommitted working tree on 3 November 2026. Lifecycle API/controller, strict contracts, API client, guarded tests and quote-first controls in the role read views are implemented. Hosted checks and cross-task review remain pending.

## Implemented

- Added a pure GET quote route at `/gyms/:slug/sessions/:sessionId/quote?action=CANCEL|NO_SHOW`; it does not write. Quotes include the authoritative session version, booked policy version, exact cutoff or no-show eligible instant, safe consequence, held ordinal/value, and a short-lived acknowledgment only where the consequence can be applied.
- Cancellation and no-show use the immutable `GymConfigurationVersion` snapshot referenced by the session. A domain-derived HMAC key from `JWT_SECRET` signs acknowledgments bound to gym, session, actor identity/role, session and policy versions, action, consequence, held ordinal/value/currency, and expiry. Commands recheck database server time and versions under the tenant transaction. Stale commands return 409 with a fresh quote; missing acknowledgment cannot apply a charge.
- Pending member withdrawal is free. A scheduled cancellation at or before `scheduledStartAt - cancellationWindowMinutes` releases its hold; strictly later cancellation consumes only when the booked policy toggle is enabled, otherwise releases. Charged late cancellation creates one distinct `LATE_CANCEL` earning and no trainer pay.
- Owner or assigned active trainer may mark an unstarted scheduled session missed only at or after start plus 15 minutes, inclusive. The command consumes its held credit once, writes one `MISSED_LATE` earning and no trainer pay. Terminal rewrites fail.
- All commands hold the selected-gym member/trainer access fence (and owner fence for owner actions) through the tenant transaction. State event, receipt, audit, hold resolution, settlement, earning, and recipient-bound persisted notification commit together. Member withdrawal notifies the assigned trainer through `TRAINER_SCHEDULE`; trainer/owner cancellation and no-show notify the member through `MEMBER_SESSIONS`.
- Receipt replay reconstructs the original cancellation/no-show response from persisted session event, settlement, hold/movements, earning, and notification rows. Cancellation notifications use ordinary cancellation wording; no-show has dedicated `SESSION_MISSED` content.
- Owner, trainer and member read views expose role-appropriate quote-first cancellation controls; trainers/owners also see the no-show action when the server-projected affordance allows it. The panel shows consequence, cutoff/eligibility time and held credit, requires acknowledgment for an eligible late cancellation/no-show, and refreshes stale quotes.

## Verification

- `pnpm --dir apps/api exec tsc --noEmit` — exit 0.
- `pnpm --dir packages/api-client typecheck` — exit 0.
- `pnpm --dir packages/contracts build` — exit 0.
- `pnpm --dir packages/contracts test` — exit 0; 49/49 tests passed in the latest shared-tree run, including strict cancellation/no-show DTOs and notification recipient shapes.
- `pnpm --dir apps/api exec vitest run src/sessions/session-lifecycle-policy.spec.ts` — exit 0; 2/2 tests passed. The exact policy boundaries tested are cancellation cutoff −1 ms/exact/+1 ms and no-show grace −1 ms/exact/+1 ms, plus disabled deduction and zero-minute cancellation window.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.session-cancel.ts --disableConsoleIntercept` — exit 0; 5/5 guarded disposable PostgreSQL tests passed. The suite verifies free and charged cancellation, explicit acknowledgment, idempotent replay and different-key terminal conflict, member withdrawal, no-show role/window, stale session quote, foreign session isolation, booking-policy snapshot behavior after current settings change, and a concurrent late-cancel/no-show race. The race left exactly one terminal settlement, audit, notification, consumed movement and distinct earning. Free cancellation released once; no cancellation/no-show created trainer pay. Harness cleanup reported six databases dropped, container removed and run manifest removed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/session-reads.e2e.spec.ts --headed` — exit 0; 1/1 headed browser test. It opens owner/trainer/member quote panels and verifies role-safe command visibility. It is agent-performed automated browser evidence, not owner-observed Chrome review.
- The final guarded run emitted a `pg` client deprecation warning about calling `client.query()` while another query is executing; it did not affect test results or cleanup.

## Remaining acceptance

- Task044's role controls and headed browser flow are integrated and tested; no owner-observed visual acceptance is claimed here because CUA cannot attach to the running Chrome window.
- Dependency completion, hosted checks and final cross-task review remain pending. Task remains In Progress.
