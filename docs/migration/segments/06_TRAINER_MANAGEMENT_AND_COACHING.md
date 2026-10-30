# Segment 06 — Trainer Management and Coaching

## Execution instructions for AI agents

Read O05–O07, M01, T02–T05 and DEC-07/09; verify identity/config/member/session relationship prerequisites; implement sanitized trainer/relationship contracts before UI; preserve builder interactions without persisting sample rows until Save.

## 1. Segment overview

- **Capability:** trainer enrollment/management, member directory, confirmed-client coaching, workout and meal plans.
- **Objective:** migrate O05–O07, M01, T02–T05 as secure vertical slices.
- **Result:** owners manage trainers; members see a safe active directory; trainers see only confirmed clients and author/retrieve bounded plans.
- **Priority / complexity:** High / Large.
- **Dependencies:** segments 02–05; session booking/confirmation/read tasks 041/042/044; DEC-07/09.
- **In scope:** GYMOS-MIG-036–039,050–052.
- **Out of scope:** progress/community/ratings, global trainer marketplace, nutrition automation.

## 2. Current V1 implementation

O05 roster searches name/email and displays level, specialisations, shifts, status. O06 form captures name/email/phone, level, experience, specialisations, shifts and one-time credentials. O07 shows profile/performance, active/deactivate confirmation and editable shift approval. M01 shows active trainer cards with name search and Request link. T02 lists assigned clients; T03 shows banner/stats and Overview/Workouts/Meal Plans/History (last 2 plans, last 10 sessions). T04 dynamic workout rows (name, sets, reps, weight; typed duration/notes mismatch). T05 dynamic meals/day/type/food/macros with live totals and a 0..6 versus 1..7 mismatch. Relevant sources are the exact pages/clients/forms and `actions/trainers.ts`, `actions/plans.ts`, `lib/authz.ts`.

## 3. Target V2 implementation

Trainer enrollment mirrors member saga with tenant `Trainer` profile and Master typed access. Shift and status commands are versioned/audited and coordinate future sessions. Directory DTO is member-safe. A confirmed trainer-client relationship is derived or materialized only from approved session states; authorization checks relationship at request time. Workout/meal plans and rows live in tenant DB, transact as aggregates, validate explicit limits/units/day mapping, and expose only related trainer/owner/client-safe projections.

## 4. V1 to V2 UI migration

Preserve roster/profile/registration layouts, handoff, shift inputs, directory cards/search, client table/360 tabs, builder add/remove/edit, seeded draft appearance, and macro totals. Fix status/shift feedback so failure never looks successful. Specialisations normalize from a typed array. Builders must treat initial samples as local draft only and distinguish zero from null. Each list/tab has loading/empty/error states and responsive parity.

## 5. Backend and database migration

Extend tenant Trainer with phone/level/experience/specialisations/shifts and version. Proposed relationship/read models and WorkoutPlan/Exercise/MealPlan/Entry follow Database Map after DEC-09. Store exact numeric nutrition/weight units as approved. No cross-DB FK; identityId is external reference. Deactivation preserves history and uses session service for future obligations. Health/notes access is minimized by projection.

## 6. Detailed tasks

| Done | Task and objective | Prerequisites / sources | Implementation and target behavior | Acceptance and testing |
|---|---|---|---|---|
| [ ] | **036 Trainer registration/handoff** | 017,018,023,027,078,080,083; O06/action | Enrollment operation; tenant profile+receipt; reciprocal access; generated credential only for new identity; typed fields | New/reuse/conflict/fault/retry/secret redaction/two-gym tests |
| [ ] | **037 Roster/profile/shift approval** | 013,018,029,036,083,085; O05/O07 | Paged sanitized queries; status/performance semantics; versioned bounded local-time shifts; accurate UI result | >page search, null/specialisation normalization, overnight/boundary, stale version, role/foreign tests |
| [ ] | **038 Deactivate/reactivate** | 004,018,036,040,043,078,080,084; O07 | Recoverable transition; handle future holds/sessions per policy; audit/notify; keep history | repeat/concurrent/stale, active/future sessions, notification failure, other gym unaffected |
| [ ] | **039 Member trainer directory** | 013,018,036,037; M01 | Active member-safe trainer query, name search/page if needed, request links with gym context | MEMBER-only safe projection, inactive absent, no private pay/phone if unapproved, empty/error/foreign gym |
| [ ] | **050 Confirmed-client roster/360** | 013,018,041,042,044,085; T02/T03 | Relationship gate; paged clients; bounded plans/history/metrics; safe health projection | pending/declined/old/unrelated/foreign relationship tests; counts/window semantics; tabs/states |
| [ ] | **051 Workout builder/retrieval** | 012,050,085; T04/action | Aggregate transaction; explicit rows/limits/zero-null/units; trainer must be confirmed; preserve draft on error | row validation/max/concurrent save/repeat/foreign client; retrieve last-two; browser dynamic form |
| [ ] | **052 Meal builder/macros** | 012,050,085; T05/action | Approved day mapping and meal types; exact bounded macros; server recomputation/validation; aggregate save | day boundaries, zero/null, totals, max rows, relationship/repeat/foreign tests; local totals match server |

Verified target files do not yet exist for these domains. Follow repository conventions under proposed Nest feature modules, tenant Prisma migration, shared contracts/client, and the existing route destinations; record actual created paths in handoff.

## 7. Security and multi-tenancy checklist

- [ ] Owner-only enrollment/status/shift; member-safe directory; trainer self/confirmed-client only.
- [ ] Relationship and gym are server-resolved on every coaching request.
- [ ] Private health/pay/access/identity fields omitted by explicit selects.
- [ ] Deactivation cannot strand or double-settle sessions/holds.
- [ ] Builder payloads have strict row/length/numeric/unit limits.

## 8. Testing and verification

Use contract tests, tenant DB service/integration tests, identity/operation failure injection, relationship role matrix, and targeted O05–O07/M01/T02–T05 Playwright/visual/accessibility tests. Verify aggregate transaction counts, no persisted sample rows before Save, safe projections, and two-gym isolation. Run lint/typecheck for changed packages.

## 9. Definition of done

- [ ] Seven tasks pass with exact V1 screens/workflows or documented approved corrections.
- [ ] Enrollment/status are recoverable and isolated.
- [ ] Directory/360 privacy is enforced server-side.
- [ ] Workout/meal aggregates validate, save, and retrieve without scope invention.

## 10. Agent checkpoints

Stop until DEC-09 fixes relationship, privacy, metrics, limits and meal-day mapping. Include authenticated read-only member viewing of own assigned workout/meal plans under tasks 051/052 per the owner scope amendment. Do not create progress, ratings, or community UI. Do not infer authorization from `clientId` query parameters.

## 11. Progress and handoff

- **Status:** NOT STARTED
- **Completed:** none
- **Remaining:** 036–039,050–052
- **Next recommended task:** GYMOS-MIG-036; execute 050 only after sessions establish confirmed relationships.
- **Files/tests/issues/blockers/decisions:** _fill during execution_


## Owner scope amendment — 30 October 2026

Tasks 051/052 also own member read APIs/pages and assignment verification. Follow the [finalization acceptance requirements](../SEGMENT_01_FINALIZATION.md). Original seven task IDs are retained; scope and effort have increased. No member plan feature is implemented by this update.
