# Migration Coverage Matrix

> **Segment 04 automated completion — 31 October 2026 at `c9af453`:** Segments 01–04 completed (23/6/6/5 tasks); **40/88 completed, 48 remaining**. All 11 hosted checks passed in [run 41210839760](https://github.com/EsanduEpa/gymos-v2/actions/runs/41210839760). [Segment 04 handoff](../SEGMENT_04_HANDOFF.md). Owner manual acceptance for Segments 02–04 remains pending; PRs #1–4 remain draft/unmerged under the manual safeguard.

This matrix assigns every authoritative task and every V1 route responsibility to one owning segment. A dependency may consume an outcome but must not duplicate ownership. Task statuses reflect the tracker synchronized 31 October 2026.

## 1. Authoritative task coverage (88/88 assigned)

| Original ID | Feature / functionality | Primary V1 source or evidence | Target V2 destination | Owning segment | Execution task | Status |
|---|---|---|---|---|---|---|
| GYMOS-MIG-001 | Reproducible baseline | V1/V2 repositories and maps | `docs/migration/evidence` | 01 | GYMOS-MIG-001 | COMPLETED |
| GYMOS-MIG-002 | Shared contracts/client | V1 actions and DTO shapes | `packages/contracts`, `packages/api-client` | 01 | GYMOS-MIG-002 | COMPLETED |
| GYMOS-MIG-003 | Identity/typed access schema | `lib/auth.ts`, V1 `User` | Master `User/GymAccess`; tenant actors | 01 | GYMOS-MIG-003 | COMPLETED |
| GYMOS-MIG-004 | Operations/receipts/audit primitives | multi-write V1 actions | Master `Operation`; tenant `CommandReceipt/AuditLog` | 01 | GYMOS-MIG-004 | COMPLETED |
| GYMOS-MIG-005 | Tenant binding/schema gate | V1 `gymId` filtering | tenancy verifier/gate/registry | 01 | GYMOS-MIG-005 | COMPLETED |
| GYMOS-MIG-006 | Bounded pools/shutdown | V1 single Prisma client | tenant lease/pool services | 01 | GYMOS-MIG-006 | COMPLETED |
| GYMOS-MIG-007 | Disposable two-gym harness | V1 role journeys | `apps/api/test/support`, Playwright fixture | 01 | GYMOS-MIG-007 | COMPLETED |
| GYMOS-MIG-008 | Workspace/CI checks | package scripts | workspace checks/hosted CI | 01 | GYMOS-MIG-008 | COMPLETED (11 hosted checks passed) |
| GYMOS-MIG-009 | Backup/isolated restore | V1 DB operational risk | `infrastructure/recovery`, runbook | 01 | GYMOS-MIG-009 | COMPLETED (local) |
| GYMOS-MIG-010 | Exposed credential containment | V1 `scripts/check-db.js` | external remediation evidence/V2 hygiene | 01 | GYMOS-MIG-010 | COMPLETED (owner-attested external; local scan verified) |
| GYMOS-MIG-011 | Classic semantic tokens | `app/globals.css`, V1 UI | `packages/theme-tokens` | 01 | GYMOS-MIG-011 | COMPLETED |
| GYMOS-MIG-012 | Shared accessible UI primitives | `components/shared`, layout patterns | `apps/web/src/components/ui` | 01 | GYMOS-MIG-012 | COMPLETED |
| GYMOS-MIG-013 | Role/gym dashboard chrome | dashboard layout/sidebar/header | proposed web dashboard shell | 02 | GYMOS-MIG-013 | COMPLETED |
| GYMOS-MIG-014 | Safe V1 visual fixtures | all V1 rendered screens | `apps/web/tests/visual` | 01 | GYMOS-MIG-014 | COMPLETED |
| GYMOS-MIG-015 | Branding editor/fallback | O12 plus V2 theme scaffold | gym config web/API/theme | 04 | GYMOS-MIG-015 | COMPLETED |
| GYMOS-MIG-016 | Login/session/forced-change enforcement | A01; `lib/auth.ts` | auth controller/service/policies | 02 | GYMOS-MIG-016 | COMPLETED |
| GYMOS-MIG-017 | Temporary credential/change/reissue | A02; `actions/account.ts` | auth/identity credential commands | 02 | GYMOS-MIG-017 | COMPLETED |
| GYMOS-MIG-018 | Actor/resource authorization | `lib/authz.ts` | Nest guards/policies | 02 | GYMOS-MIG-018 | COMPLETED |
| GYMOS-MIG-019 | Role-aware root/navigation | R00/T00/M00/L02 | web route builder/guards | 02 | GYMOS-MIG-019 | COMPLETED |
| GYMOS-MIG-020 | Session transport/logout | Auth.js/session/logout | web BFF actions + auth API | 02 | GYMOS-MIG-020 | COMPLETED |
| GYMOS-MIG-021 | Provisioning reservation | V1 admin/create assumptions | operations + admin provisioning service | 03 | GYMOS-MIG-021 | COMPLETED |
| GYMOS-MIG-022 | Recoverable physical provisioning | V2 current synchronous provisioner | provisioning worker/checkpoints | 03 | GYMOS-MIG-022 | COMPLETED |
| GYMOS-MIG-023 | Owner/theme/gym activation | S01 owner bootstrap | identity/access/theme activation | 03 | GYMOS-MIG-023 | COMPLETED |
| GYMOS-MIG-024 | Registry/read-only support | S01; `actions/admin.ts` | platform registry/support session | 03 | GYMOS-MIG-024 | COMPLETED |
| GYMOS-MIG-025 | Suspend/reactivate tenant | S01 status | Master access/gym lifecycle | 03 | GYMOS-MIG-025 | COMPLETED |
| GYMOS-MIG-026 | Tenant schema rollout/repair | database map | versioned orchestrator/repair | 03 | GYMOS-MIG-026 | COMPLETED |
| GYMOS-MIG-027 | Gym profile/config reads | O12; `actions/gym-config.ts` | tenant configuration module | 04 | GYMOS-MIG-027 | COMPLETED |
| GYMOS-MIG-028 | Membership plans/form | O12 Plans tab | membership-plan module/UI | 04 | GYMOS-MIG-028 | COMPLETED |
| GYMOS-MIG-029 | Rates/pay/cancellation policy | O12 remaining tabs | configuration policy DTOs/schema | 04 | GYMOS-MIG-029 | COMPLETED |
| GYMOS-MIG-030 | Membership eligibility/renewal | `Membership`, expiry action | membership terms/service | 04 | GYMOS-MIG-030 | COMPLETED |
| GYMOS-MIG-031 | Member registration | O03; `actions/members.ts` | member enrollment saga/API/UI | 05 | GYMOS-MIG-031 | NOT STARTED |
| GYMOS-MIG-032 | Member list/profile | O02/O04 | member query/detail/UI | 05 | GYMOS-MIG-032 | NOT STARTED |
| GYMOS-MIG-033 | Member status/hold release | O04 status action | recoverable member status command | 05 | GYMOS-MIG-033 | NOT STARTED |
| GYMOS-MIG-034 | Session packs/balance | O04; `actions/packs.ts` | pack/hold ledger projection | 05 | GYMOS-MIG-034 | NOT STARTED |
| GYMOS-MIG-035 | Enrollment recovery journey | O03→O04 | two-gym browser/integration evidence | 05 | GYMOS-MIG-035 | NOT STARTED |
| GYMOS-MIG-036 | Trainer registration | O06; `actions/trainers.ts` | trainer enrollment saga/API/UI | 06 | GYMOS-MIG-036 | NOT STARTED |
| GYMOS-MIG-037 | Trainer roster/profile/shifts | O05/O07 | trainer queries/status/shift UI | 06 | GYMOS-MIG-037 | NOT STARTED |
| GYMOS-MIG-038 | Trainer deactivate/reactivate | O07 | recoverable trainer status command | 06 | GYMOS-MIG-038 | NOT STARTED |
| GYMOS-MIG-039 | Member trainer directory | M01 | member-safe trainer query/UI | 06 | GYMOS-MIG-039 | NOT STARTED |
| GYMOS-MIG-040 | Session aggregate/holds/transitions | `PTSession`, pricing/session actions | tenant session module/schema | 07 | GYMOS-MIG-040 | NOT STARTED |
| GYMOS-MIG-041 | Owner booking | O09; `bookSession` | atomic booking API/UI | 07 | GYMOS-MIG-041 | NOT STARTED |
| GYMOS-MIG-042 | Request + accept/decline | M02/T01 | request/response commands/UI | 07 | GYMOS-MIG-042 | NOT STARTED |
| GYMOS-MIG-043 | Notifications/audit reads | bell; notification/audit actions | selected-gym notification/audit module | 07 | GYMOS-MIG-043 | NOT STARTED |
| GYMOS-MIG-044 | Session read views | O08/T01/M03 | role projections/pages | 07 | GYMOS-MIG-044 | NOT STARTED |
| GYMOS-MIG-045 | Start/shared notes | T01; session actions | guarded lifecycle commands | 07 | GYMOS-MIG-045 | NOT STARTED |
| GYMOS-MIG-046 | Complete exactly once | `endSession` | settlement transaction/receipt | 07 | GYMOS-MIG-046 | NOT STARTED |
| GYMOS-MIG-047 | No-show/cancellation | O08/M03 session actions | quoted terminal commands | 07 | GYMOS-MIG-047 | NOT STARTED |
| GYMOS-MIG-048 | Session concurrency proof | known lifecycle defects | barrier integration/e2e tests | 07 | GYMOS-MIG-048 | NOT STARTED |
| GYMOS-MIG-049 | Lifecycle earning baseline | V1 revenue/pay effects | operational value read model | 08 | GYMOS-MIG-049 | NOT STARTED |
| GYMOS-MIG-050 | Confirmed clients/360 | T02/T03 | relationship query/profile | 06 | GYMOS-MIG-050 | NOT STARTED |
| GYMOS-MIG-051 | Workout plans and assigned member view | T04; `saveWorkoutPlan` | trainer authoring/retrieval and authenticated member read-only own-assignment view | 06 | GYMOS-MIG-051 | NOT STARTED |
| GYMOS-MIG-052 | Meal plans/macros and assigned member view | T05; `saveMealPlan` | trainer authoring/retrieval and authenticated member read-only own-assignment view | 06 | GYMOS-MIG-052 | NOT STARTED |
| GYMOS-MIG-053 | Membership/pack earning | O10 Revenue/Deferred | finance earning reconciliation | 08 | GYMOS-MIG-053 | NOT STARTED |
| GYMOS-MIG-054 | Expenses | O10; expense actions | expense module/dialog/list | 08 | GYMOS-MIG-054 | NOT STARTED |
| GYMOS-MIG-055 | Budgets/variance | O10; budget actions | budget module/chart | 08 | GYMOS-MIG-055 | NOT STARTED |
| GYMOS-MIG-056 | Payroll close/approval | O10/T06 | payroll module/read models | 08 | GYMOS-MIG-056 | NOT STARTED |
| GYMOS-MIG-057 | Finance panels/P&L/charts | O10 | finance page/read APIs | 08 | GYMOS-MIG-057 | NOT STARTED |
| GYMOS-MIG-058 | Owner dashboard | O01 | dashboard aggregate/UI | 08 | GYMOS-MIG-058 | NOT STARTED |
| GYMOS-MIG-059 | Operational analytics | O11/S01 summary | analytics APIs/UI | 08 | GYMOS-MIG-059 | NOT STARTED |
| GYMOS-MIG-060 | Audit screen/taxonomy | O13 | audit query/filter/UI | 08 | GYMOS-MIG-060 | NOT STARTED |
| GYMOS-MIG-061 | Scoped CSV | H02/O08/O10/O13 | authenticated export API | 08 | GYMOS-MIG-061 | NOT STARTED |
| GYMOS-MIG-062 | Deferred scope record | O14/progress/theme extras | scope guards/navigation | 09 | GYMOS-MIG-062 | NOT STARTED |
| GYMOS-MIG-063 | Final source parity | all V1 inventory/maps | traceability/coverage reconciliation | 09 | GYMOS-MIG-063 | NOT STARTED |
| GYMOS-MIG-064 | Two-gym cross-role journeys | all role journeys | Playwright/API integration | 09 | GYMOS-MIG-064 | NOT STARTED |
| GYMOS-MIG-065 | Visual/responsive/a11y parity | V1 fixtures | browser visual/accessibility evidence | 09 | GYMOS-MIG-065 | NOT STARTED |
| GYMOS-MIG-066 | Security/isolation/capacity gate | authz/tenant defects | penetration/negative/load evidence | 09 | GYMOS-MIG-066 | NOT STARTED |
| GYMOS-MIG-067 | Independent staging deploy | deployment intent | web/API/provider configuration | 10 | GYMOS-MIG-067 | NOT STARTED |
| GYMOS-MIG-068 | Migration/cutover controls | schema/cutover risk | release orchestrator/flags | 10 | GYMOS-MIG-068 | NOT STARTED |
| GYMOS-MIG-069 | Health/logs/limits | operational risk | telemetry/rate/health endpoints | 10 | GYMOS-MIG-069 | NOT STARTED |
| GYMOS-MIG-070 | Managed DR rehearsal | local task 009 | provider restore/registry switch | 10 | GYMOS-MIG-070 | NOT STARTED |
| GYMOS-MIG-071 | Production acceptance/launch | all release evidence | signed release record | 10 | GYMOS-MIG-071 | NOT STARTED |
| GYMOS-MIG-072 | Mobile contract subset | stable web APIs | shared mobile contract profile | 11 | GYMOS-MIG-072 | NOT STARTED |
| GYMOS-MIG-073 | Expo/auth/theme shell | no V1 mobile source | proposed mobile app | 11 | GYMOS-MIG-073 | NOT STARTED |
| GYMOS-MIG-074 | Member mobile flows | M01–M03 behavior | proposed member native screens | 11 | GYMOS-MIG-074 | NOT STARTED |
| GYMOS-MIG-075 | Trainer mobile flows | T01/T02/T03/T06 behavior | proposed trainer native screens | 11 | GYMOS-MIG-075 | NOT STARTED |
| GYMOS-MIG-076 | Mobile tests/releases | approved mobile scope | Android/iOS pipelines | 11 | GYMOS-MIG-076 | NOT STARTED |
| GYMOS-MIG-077 | Decide config ownership | O12/data map | DEC-01 | 01 | GYMOS-MIG-077 | COMPLETED (owner-reviewed decision) |
| GYMOS-MIG-078 | Decide identity policy | A01/A02 | DEC-02 | 01 | GYMOS-MIG-078 | COMPLETED |
| GYMOS-MIG-079 | Decide support scope | S01 | DEC-03 | 01 | GYMOS-MIG-079 | COMPLETED (owner-reviewed decision) |
| GYMOS-MIG-080 | Decide operation protocol | multi-write actions | DEC-04 | 01 | GYMOS-MIG-080 | COMPLETED |
| GYMOS-MIG-081 | Decide schema/pool/recovery | database architecture | DEC-05 | 01 | GYMOS-MIG-081 | COMPLETED |
| GYMOS-MIG-082 | Decide money/earning | pricing/financials | DEC-06 | 01 | GYMOS-MIG-082 | COMPLETED (owner-reviewed decision) |
| GYMOS-MIG-083 | Decide time/term/scheduling | sessions/memberships | DEC-07 | 01 | GYMOS-MIG-083 | COMPLETED (owner-reviewed decision) |
| GYMOS-MIG-084 | Decide settlement/payroll | session/payroll actions | DEC-08 | 01 | GYMOS-MIG-084 | COMPLETED (owner-reviewed decision) |
| GYMOS-MIG-085 | Decide coaching/privacy/export | plans/analytics/exports | DEC-09 | 01 | GYMOS-MIG-085 | COMPLETED (owner-reviewed decision) |
| GYMOS-MIG-086 | Decide routes/Classic/brand | all web UI | DEC-10 | 01 | GYMOS-MIG-086 | COMPLETED |
| GYMOS-MIG-087 | Decide provider/release | deployment unknowns | DEC-11 | 10 | GYMOS-MIG-087 | NOT STARTED |
| GYMOS-MIG-088 | Decide mobile scope | no V1 mobile | DEC-12 | 11 | GYMOS-MIG-088 | NOT STARTED |

## 2. V1 route responsibility coverage (29/29 assigned)

| Route ID | V1 URL | Owning segment/task | Disposition |
|---|---|---|---|
| R00 | `/` | 02 / 019 | Role+gym-aware redirect |
| A01 | `/login` | 02 / 016,020 | Preserve centered form; adapt auth policy |
| A02 | `/change-password` | 02 / 017 | Preserve form/success flow; enforce server-side |
| S01 | `/admin` | 03 / 024 | Registry + explicit read-only support context; keep V2 create |
| O01 | `/owner` | 08 / 058 | Honest live metrics and refresh |
| O02 | `/owner/members` | 05 / 032 | Paged member roster |
| O03 | `/owner/members/new` | 05 / 031 | Full enrollment + one-time credential handoff |
| O04 | `/owner/members/[id]` | 05 / 032–034 | Profile/tabs/status/pack; deferred fake payment/receipt removed |
| O05 | `/owner/trainers` | 06 / 037 | Trainer roster |
| O06 | `/owner/trainers/new` | 06 / 036 | Trainer enrollment/handoff |
| O07 | `/owner/trainers/[id]` | 06 / 037,038 | Profile, shifts, status |
| O08 | `/owner/sessions` | 07 / 044,047 | Daily/monthly views and safe overrides |
| O09 | `/owner/sessions/book` | 07 / 041 | Owner booking with atomic hold |
| O10 | `/owner/financials` | 08 / 053–057,061 | Six panels; honest operational accounting |
| O11 | `/owner/analytics` | 08 / 059 | Operational analytics |
| O12 | `/owner/gym-config` | 04 / 015,027–029 | Five tabs + scoped branding editor |
| O13 | `/owner/audit-log` | 08 / 060,061 | Paged/filterable audit + scoped export |
| O14 | `/owner/subscription` | 09 / 062 | Deferred; hidden from MVP navigation, no fake billing |
| T00 | `/trainer` | 02 / 019 | Gym-scoped schedule redirect |
| T01 | `/trainer/schedule` | 07 / 042,044–047 | Request response and lifecycle |
| T02 | `/trainer/clients` | 06 / 050 | Confirmed-client roster only |
| T03 | `/trainer/clients/[id]` | 06 / 050 | Privacy-limited 360 view |
| T04 | `/trainer/plans/workout/new` | 06 / 051 | Workout builder/retrieval |
| T05 | `/trainer/plans/meal/new` | 06 / 052 | Meal builder/macros |
| T06 | `/trainer/earnings` | 08 / 056,057 | Own verified earnings only |
| M00 | `/member` | 02 / 019 | Gym-scoped trainer-directory redirect |
| M01 | `/member/trainers` | 06 / 039 | Member-safe active trainer directory |
| M02 | `/member/trainers/[id]/book` | 07 / 042 | Session request with authoritative eligibility |
| M03 | `/member/sessions` | 07 / 044,047 | Own requests/history/cancel/withdraw |

Additional interfaces: L01/L02/X01–X03 belong to segments 01/02/09; H01 belongs to 02; H02 belongs to 08. All 44 exported V1 Server Actions, 20 models, 14 enums, 39 workflow dossiers, 65 proposed contracts (63 source-derived plus C64/C65 for owner-approved new scope), and 8 existing V2 operations remain mapped in [`../MIGRATION_TRACEABILITY.md`](../MIGRATION_TRACEABILITY.md).

## 3. Audit findings

- **Uncovered authoritative tasks:** none.
- **Uncovered V1 routes:** none.
- **Intentional overlap:** task dependencies only; ownership remains single. Session aggregate task 040 is a prerequisite for member/trainer status and pack invariants, but remains owned by segment 07.
- **Decision gates:** 077, 079 and 082–085 are completed and approved; 087 and 088 remain open and gate their downstream deployment/mobile work. Segment 02 automated verification is complete and owner manual acceptance remains pending. Segment 03 tasks 021–026 are locally/hosted verified in their separate stacked PR; owner manual acceptance and all merges remain pending.
- **Conflicts:** approved addenda override stale pre-start completion, fake DeskPayment/receipt/subscription billing, expanded theme, and meal-day assumptions. See `../MIGRATION_DECISIONS.md`.
- **Coverage conclusion:** all 88 original task IDs have one unique segment assignment; all 29/29 route responsibilities have a static owner. Runtime/visual/functional parity is not yet proven and must not be described as 100% migrated.
