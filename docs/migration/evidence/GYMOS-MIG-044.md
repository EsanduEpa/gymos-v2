# GYMOS-MIG-044 — Role-based PT session read views

**Status: In Progress.** The API, role pages, C63 owner monthly overview, Task045/046 lifecycle controls, Task047 quote-first cancel/no-show UI, and focused browser scenario are implemented. Completion still depends on the remaining prerequisite task reviews and integration gates. Browser screenshots were captured and agent-reviewed; they are not owner-observed. See the tracked [session evidence directory](GYMOS-MIG-044/).

## Scope

- Read-only owner gym ledger, trainer schedule, member session cards, and bounded member-profile session history with strict role projections, selected-gym checks, safe foreign-resource denials, and database asOf.
- Local day/month/range boundaries are calculated in the gym timezone by PostgreSQL. Filters include date/month, state, search, role context, bounded pagination and stable ordering. Full-filter totals and independent month booking totals are returned.
- Owner C63 overview separates lifetime pack-credit balances from selected-month state counts and independent matching-session totals. Member pages keep lifetime credit totals separate from their monthly state counts.
- Member projections include the stored decline reason only for that member. Owner/trainer/member pages include gym-local times, empty/error/retryable states and refresh preserving filters. Trainer elapsed time is display-only.
- Trainer cards mount API-backed start, complete and notes controls from Task045/046. Owner/trainer/member cancel and no-show policy controls request a fresh quote before submission; charged cancellation and no-show require explicit acknowledgment and the server token.

## Verification

| Command/check | Result |
|---|---|
| pnpm --dir packages/contracts build && pnpm --dir packages/contracts test | Passed 50/50 after coaching contract additions. |
| pnpm --dir apps/api exec tsc --noEmit --pretty false | Passed. |
| pnpm --dir apps/web exec tsc --noEmit --pretty false and focused ESLint on owned pages/actions/components/spec | Passed after final UI and test edits. |
| pnpm --dir apps/api build && pnpm --dir apps/web build | Passed; production build includes trainer clients, trainer workout/meal builders, member workout/meal plans, owner sessions, trainer schedule and member sessions. |
| GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.session-reads.ts | Current tenant manifest .6: passed 5/5 across 2 files. afterAll awaited fixture close and disposable-environment cleanup; Vitest suppresses its cleanup console line on passing runs. |
| GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.member-session-overview.ts | Current tenant manifest .6: passed 2/2 for C63 monthly overview. afterAll awaited fixture close and disposable-environment cleanup; Vitest suppresses its cleanup console line on passing runs. |
| GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/session-reads.e2e.spec.ts --headed | Passed 1/1, final headed Chrome run. Covers owner/trainer/member session reads and quote panels, C63, paging/filters, 390px member layout, workout assignment preserving 0 kg, live meal totals, explicit plan assignment, member read-only pages, nav links and persisted row/receipt/audit effects. Cleanup reported 6 databases dropped, container removed, manifest removed. |
| Agent-performed visual review | Six final captures in the evidence directory (owner month ledger, active trainer, member mobile, member workout plans, trainer meal builder, member meal plans) were inspected by the agent. They are agent-reviewed, not owner-observed. CUA visible Chrome remains unavailable with Browsers: Error: browser access host is unavailable. |

## Artifacts and remaining gates

Tracked screenshots: owner-sessions-month.png, trainer-active-session.png, member-sessions-mobile.png, member-workout-plans.png, trainer-meal-plan-builder.png, and member-meal-plans.png. Remaining prerequisite review is needed before marking this task verified or complete. No hosted checks or owner-visible Chrome review are claimed.

## Agent-performed native Chrome review — 4 November 2026

- The member session page showed one scheduled and one declined session, month-state totals and the stored decline reason. The trainer schedule showed the accepted session on its gym-local day; its cancellation quote displayed the cutoff and credit consequence, then was dismissed without submission. This supplements, but does not replace, the automated role/filter/pagination evidence. No owner-observed acceptance is claimed; see the [acceptance ledger](SEGMENTS-06-07-ACCEPTANCE.md).
