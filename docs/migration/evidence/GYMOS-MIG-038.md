# GYMOS-MIG-038 — trainer deactivation and reactivation

Status: **In Progress.** Evidence captured 3 November 2026 from the uncommitted working tree on `codex/segment-06-management`, based on `7c09fd4`. There is no commit or hosted PR run.

## Implemented slice

- Added a trainer-specific Master operation kind and durable lifecycle intent with expected access/trainer versions, target status and reason.
- Added owner-only status, operation status and explicit resume endpoints plus a trainer profile form that requires confirmation and a reason.
- Deactivation revokes the trainer's selected-gym access before tenant publication, then changes local trainer status through a command receipt and audit. Reactivation changes tenant status before republishing the link. Cancelled sessions are never restored.
- Added resumable future pending/confirmed session cancellation. Each session gets a stable release command; its hold release, cancellation audit and member notification commit together, preserve session history and can resume after an injected interruption.
- Added a shared Master Gym/GymAccess row-lock fence. Owner shift approval uses it; trainer status revocation serializes against the same trainer link. Booking (041), request/acceptance (042), session reads and lifecycle commands use the selected-gym fence through their required tenant boundaries.

## Verification

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.trainer-lifecycle.ts` — exit 0; 1/1 guarded integration test against six uniquely owned disposable databases. It injected a notification insert failure after cancellation/audit writes for the second session and verified that whole tenant transaction rolled back. The test also verified deactivation remains blocked while an active access fence is held, confirmed access revocation denies later fenced work, resumed and cancelled each eligible session once, released both holds and inserted both notifications exactly once, replayed the same lifecycle command, reactivated the trainer without restoring cancelled sessions, and confirmed the same identity's other gym access remains active. The fixture, container and manifest were cleaned.
- `pnpm --dir apps/api exec vitest run src/identity/gym-access-fence.spec.ts src/sessions/session-state.spec.ts src/sessions/session-transactions.spec.ts` — exit 0; 12/12 unit tests. Mock fence coverage does not replace the guarded cross-plane barrier test above.

## Remaining acceptance

- Task 048's complete barrier-synchronized cross-boundary race suite remains gated on Task 049, which the owner confirmed stays with the finance/operational value segment. The specific booking, request and cancel/no-show races have separate guarded evidence.
- Demonstrate deactivation/reactivation in the correct owner-visible Chrome application when the browser-control host is available. Current CUA errors are `browser access host unavailable` and `cgWindowNotFound`; no owner-observed UI review is claimed.
- No hosted checks or owner acceptance are claimed.

## Agent-performed native Chrome review — 4 November 2026

- The owner gym’s synthetic trainer was deactivated and reactivated in the dedicated Chrome window, with a reason supplied for each action; the successful recovery state was visible. No future held session was cancelled during that status review. Agent-performed review only; no owner-observed acceptance is claimed.
- Task 048 remains gated on Task 049, which remains outside this run in Segment 08. No 049 implementation is included.
