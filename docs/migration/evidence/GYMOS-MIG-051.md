# GYMOS-MIG-051 — Workout plan builder and assigned member view

**Status: In Progress.** The workout-plan schema, additive migration, trainer assignment API, member-own read API, trainer builder, trainer profile section and member page are implemented. Final integration review remains open.

## Implementation

- Tenant WorkoutPlan and WorkoutExercise use local member/trainer/parent RESTRICT foreign keys, stable member/trainer time indexes, bounded field constraints and deterministic exercise order.
- Assignment validates 1–100 rows, exact decimal weight and explicit zero, relationship and current master access fences, stable idempotency digest/receipt, a single audit event and one transaction.
- Member retrieval takes no actor/member ID input; it derives the member from authenticated access, fences access revocation and returns a bounded read-only page without trainer IDs or private fields.
- Builder begins with editable, unsaved Bench Press (4×10 at 60 kg) and Incline DB Flyes (3×12 at 16 kg) rows. It does not autosave. Explicit save assigns the current draft. An unknown response retains the idempotency key for retry.

## Verification

| Command/check | Result |
|---|---|
| pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma | Passed. |
| pnpm --dir packages/contracts build && pnpm --dir packages/contracts test | Passed 50/50 including workout bounds and member query minimization. |
| pnpm --dir apps/api exec tsc --noEmit --pretty false | Passed. |
| GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.coaching.ts | Current tenant manifest .6: passed as part of the 4/4 Task050–052 suite. The 051 case checks explicit zero, ordered rows, same-key replay, own-member retrieval, cross-member denial and effect counts. |
| Headed Chrome: GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/session-reads.e2e.spec.ts --headed | Final run passed 1/1 with navigation integrated. It saves an edited seeded sample with 0 kg and verifies member sees 0 kg with no edit/save affordance; persisted plan/exercise/receipt/audit counts are asserted. Cleanup reported six database drops, container removal and manifest removal. |

Member and trainer sidebar links are now integrated by the parent and are included in the final production build and headed browser run.

## Agent-performed native Chrome review — 4 November 2026

- The trainer created and assigned “Visible walkthrough strength plan” to the confirmed synthetic client. The trainer profile reloaded it with two persisted exercise rows; the member’s read-only Workout plans page displayed the same exercises and weights. The assignment was verified in the controlled Chrome window using a guarded disposable fixture; see the [acceptance ledger](SEGMENTS-06-07-ACCEPTANCE.md). No owner-observed acceptance is claimed.
