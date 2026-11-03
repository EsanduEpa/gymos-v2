# GYMOS-MIG-050 — Confirmed-client coaching API

**Status: In Progress.** Trainer client roster/profile APIs, strict role-safe contracts, bounded credit summaries, and trainer pages are implemented. Workout and meal assignment/read flows are covered in later task evidence. Do not mark this task complete until integration review and remaining prerequisite checks are closed.

## Behavior and bounds

- Client eligibility requires an active session, a future confirmed scheduled session, or a completed session within the approved 90 elapsed-day window. Pending-only, unrelated, inactive, stale completed, and revoked-link members do not qualify.
- Every profile request rechecks the same-gym member binding and relationship. Trainer and target member access fences are held across private health-note reads and assignment commands.
- Roster candidates are fetched from tenant tables in keyset batches of 200. Each batch checks only those candidate IDs against active master member links, matching registration operations and committed tenant receipts. Only current-page IDs receive detailed projection and grouped SQL credit totals.
- Exact full-filter totals still require scanning the eligible tenant candidate set and validating each batch cross-plane. This is bounded in memory and per master query, but total work remains O(eligible related tenant candidates); it avoids loading every gym master membership or movement row into application memory.
- Profile credit balance comes from a grouped SQL ledger projection for that member; no complete movement rows are returned. Trainer responses keep private health notes in the authorized relationship-gated profile only.

## Verification

| Command/check | Result |
|---|---|
| pnpm --dir packages/contracts build && pnpm --dir packages/contracts test | Passed 50/50 including coaching schema boundaries. |
| pnpm --dir apps/api exec tsc --noEmit --pretty false | Passed. |
| GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.coaching.ts | Current manifest .6: passed 4/4 across Tasks050–052. Assertions include eligible/pending/unrelated/old completed/inactive cases, privacy, foreign gym, revocation, bounded roster totals, pack balances, own-member workout/meal reads and command effects. Cleanup is awaited in afterAll. The last headed browser run independently reported cleanup of six databases, container and manifest. |
| pnpm --dir apps/web exec tsc --noEmit --pretty false | Passed before the final screenshot-only spec amendment. |
| Focused web ESLint on coaching and session files | Passed before the final screenshot-only spec amendment. |

The exact-total candidate scan remains linear in the filtered eligible tenant candidate set; each scan iteration is bounded to 200 candidates and master verification queries are chunked to those candidates.
