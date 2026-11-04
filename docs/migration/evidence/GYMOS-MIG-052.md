# GYMOS-MIG-052 — Meal builder, macro totals and member view

**Status: In Progress.** The additive meal schema, trainer assignment API, computed nutrition totals, trainer builder/profile history, and authenticated member read-only page are implemented. Final integration review remains open.

## Implementation

- MealPlan and MealPlanEntry are tenant-local with RESTRICT member/trainer/parent FKs, stable time indexes, row ordering and database CHECK constraints. Meal type is a TEXT value guarded by CHECK, per parent-approved migration contract.
- Input validation accepts 1–100 rows, Monday–Sunday numeric mapping (1–7), the six approved meal types, bounded food text, integer calories and nonnegative Decimal(7,2) macros. The browser totals update as rows change; the API recomputes totals from accepted values and does not accept caller totals.
- Assignment is limited to an active same-gym trainer/client relationship. Plan, entries, idempotency receipt and audit event commit together under the current master access fences. Replay with the same key returns the immutable result.
- Member meal retrieval takes no member ID, derives the authenticated actor, checks current membership/access, and returns only that member’s bounded plan projection. The trainer profile shows the two newest assigned meal plans and hasMore; members cannot edit or assign.

## Verification

| Command/check | Result |
|---|---|
| pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma | Passed. |
| pnpm --dir packages/contracts build && pnpm --dir packages/contracts test | Passed 50/50 including day mapping, macros, bounds, strict DTOs and member query minimization. |
| pnpm --dir apps/api exec tsc --noEmit --pretty false | Passed. |
| GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.coaching.ts | Current manifest .6: passed 4/4 covering Task050–052. Meal test checks idempotent replay, server totals, ordered Monday/Sunday rows, own-member access, foreign member denial and effect counts. |
| pnpm --dir apps/api build && pnpm --dir apps/web build | Passed; production output includes trainer meal builder and member meal plans routes. |
| GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/session-reads.e2e.spec.ts --headed | Passed 1/1 with Task044 and Task051 coverage included. Browser interaction tests add/edit two meal rows, check live totals (500 kcal, 37.50 g protein), save and assign, verify member view and persisted rows/receipt/audit counts. Cleanup explicitly reported 6 databases dropped, container removed and manifest removed. |

The headed artifacts are tracked in GYMOS-MIG-044 evidence. They were inspected by the agent and are not owner-observed; visible CUA Chrome is unavailable.

## Agent-performed native Chrome review — 4 November 2026

- The trainer created and assigned a Monday breakfast meal plan for the confirmed synthetic client. Live totals showed 500 kcal, 25 g protein, 60 g carbs and 12 g fat. The member’s read-only Meal plans page showed the assigned food item and the same totals. This was reviewed in the controlled Chrome window with the disposable fixture alive; see the [acceptance ledger](SEGMENTS-06-07-ACCEPTANCE.md). No owner-observed acceptance is claimed.
