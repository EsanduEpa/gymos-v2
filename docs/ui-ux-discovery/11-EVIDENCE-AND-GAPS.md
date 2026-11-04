# Evidence and gaps

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Audit boundary and provenance

Inspected the current working-tree source in `gymos-v2`, including its existing uncommitted edits. The older sibling `gymos` was not counted as current application scope. No environment files, database connection values, generated credentials or real member records were included in the output. All additions authored by this audit are the12 Markdown documents in this directory; helper scripts/fingerprints were temporary files outside the application tree.

The initial working tree already had modifications in `apps/web/src/app/admin/page.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/components/platform/registry.tsx` and `apps/web/tests/two-gym.e2e.spec.ts`. A separate untracked platform manual-environment test appeared during the audit; it was not authored or modified by this task and is not used as verification evidence. The source is therefore a working-tree snapshot, not a clean-release certification.

## Method and confidence

Read page components and nested routes; shared/domain components; Next actions/HTTP handlers/context/proxy; all controller route declarations; master/tenant schemas; shared contracts; service logic for tenancy/auth/publication, enrollment/lifecycle, sessions/quotes/credits, coaching relationships, finance/payroll, dashboard/analytics/support/provisioning; CSS/tokens; relevant integration/browser test source. References use repository-relative links with source line anchors. File references without a more specific anchor start at line1. No source values from live systems were queried.

“Implemented” means connected source, not verified deployed behavior. Confirmed issues identify actual code/logic; derived consequences are explained. Potential draft resets and saved-screen mobile density are qualified for current browser/user testing. Documentation is a discovery artifact, not a security penetration test, financial certification or runtime accessibility report.

## Visual evidence actually inspected

| Artifact | Scope/provenance | What can be said |
|---|---|---|
| `apps/web/test-results/migration-evidence/GYMOS-MIG-024/registry-1440.png` | Existing V2 synthetic test capture, visually opened in this audit | Dark desktop sidebar, light cards, aggregate overview, registry and creation form are visible |
| `apps/web/test-results/migration-evidence/GYMOS-MIG-024/registry-320.png` | Existing V2 synthetic test capture, visually opened in this audit | Drawer trigger, stacked registry cards and long page with creation form are visible |
| V2 migration-evidence directory |9 PNGs found; remaining7 not visually opened | Existence only, not current all-screen verification |
| `apps/web/tests/visual/fixtures/v1-baseline` |369 PNGs found; verification metadata says26 baseline screens/104 baseline images/168 states,120 assertions, widths1440/768/390/320 | Historical synthetic V1 evidence only; its passed metadata is not a fresh test result |

The V1 capture harness explicitly sets `original = resolve(root, '../gymos')`, copies that source and seeds disposable fixtures. Therefore its screens/payment/billing/rating visuals do not establish V2 implementations. [apps/web/tests/visual/v1-baseline.spec.ts:17](../../apps/web/tests/visual/v1-baseline.spec.ts#L17), [apps/web/tests/visual/fixtures/v1-baseline/verification.json:1](../../apps/web/tests/visual/fixtures/v1-baseline/verification.json#L1). V2 test source corroborates platform capture intent, but current screenshot/source equivalence was not recertified. Existing synthetic names/counts are not reproduced as operational data in these documents.

## Reconciliation and counts

- 39 `apps/web/src/app/**/page.tsx` files matched to S01–S39 exactly once:35 content-bearing routes, including subscription placeholder and gated mocked test screen, plus4 pure redirect entry routes (`/`, `/gyms/[slug]`, `/gyms/[slug]/trainer`, `/gyms/[slug]/member`). Root/gym resolver also contain unavailable/loading fallbacks but are classified by routing purpose.
- 2 non-page Next HTTP handlers: GET session and POST CSV export.
- 46 feature groups,45 with implemented source including partial/backend/CLI groups plus1 subscription placeholder; not the number of atomic functions.26 audit issues with severity/confidence.
- Global USER/SUPER_ADMIN plus gym OWNER/TRAINER/MEMBER explicitly documented; four working role experiences and extra non-role account states distinguished.
- 21 master models,26 tenant models; relationship/field ledger below. Enum inventory below separates access, lifecycle, session and finance states.
- No pages for subscription backend, attendance, payment/payout, exercise completion/progress, ratings or general role editor discovered. Renewal and existing-owner consent endpoints are present without connected UI; recent-member-session endpoint is unmounted in owner profile; generic role placeholder is unmounted.

## Key source index and feature cross-check

| Area / features | Primary implementation evidence | Supporting verification source (not run here) |
|---|---|---|
| Identity/navigation F01–03 | [apps/api/src/auth.controller.ts:1](../../apps/api/src/auth.controller.ts#L1), [apps/api/src/credentials.controller.ts:1](../../apps/api/src/credentials.controller.ts#L1), [apps/web/src/app/actions.ts:1](../../apps/web/src/app/actions.ts#L1), [apps/web/src/lib/gym-context.ts:1](../../apps/web/src/lib/gym-context.ts#L1), [apps/web/src/components/navigation/session-lifecycle.tsx:1](../../apps/web/src/components/navigation/session-lifecycle.tsx#L1) | [apps/api/src/auth-token.spec.ts:1](../../apps/api/src/auth-token.spec.ts#L1), [apps/web/tests/two-gym.e2e.spec.ts:952](../../apps/web/tests/two-gym.e2e.spec.ts#L952) |
| Tenant isolation/publication F03/45 | [apps/api/src/gym-access.guard.ts:1](../../apps/api/src/gym-access.guard.ts#L1), [apps/api/src/tenancy/tenant-schema-gate.service.ts:1](../../apps/api/src/tenancy/tenant-schema-gate.service.ts#L1), [apps/api/src/identity/publication-policy.ts:1](../../apps/api/src/identity/publication-policy.ts#L1), [apps/api/src/identity/gym-access-fence.ts:1](../../apps/api/src/identity/gym-access-fence.ts#L1) | [apps/api/src/gym-access.guard.spec.ts:1](../../apps/api/src/gym-access.guard.spec.ts#L1), [apps/api/test/tenancy/tenant-schema.integration.test.ts:1](../../apps/api/test/tenancy/tenant-schema.integration.test.ts#L1) |
| Platform F04–08 | [apps/api/src/admin.controller.ts:1](../../apps/api/src/admin.controller.ts#L1), [apps/api/src/platform/provisioning-worker.ts:1](../../apps/api/src/platform/provisioning-worker.ts#L1), [apps/api/src/platform/platform-registry.service.ts:1](../../apps/api/src/platform/platform-registry.service.ts#L1), [apps/api/src/platform/support-session.service.ts:1](../../apps/api/src/platform/support-session.service.ts#L1), [apps/api/src/platform/gym-lifecycle.service.ts:1](../../apps/api/src/platform/gym-lifecycle.service.ts#L1) | [apps/api/test/platform/worker.integration.test.ts:1](../../apps/api/test/platform/worker.integration.test.ts#L1), [apps/api/test/platform/support.integration.test.ts:1](../../apps/api/test/platform/support.integration.test.ts#L1), [apps/api/test/platform/lifecycle.integration.test.ts:1](../../apps/api/test/platform/lifecycle.integration.test.ts#L1) |
| Member/plan/pack F09–16 | [apps/api/src/gyms.controller.ts:1](../../apps/api/src/gyms.controller.ts#L1), [apps/api/src/member-enrollment.service.ts:1](../../apps/api/src/member-enrollment.service.ts#L1), [apps/api/src/member-lifecycle.service.ts:1](../../apps/api/src/member-lifecycle.service.ts#L1), [apps/api/src/configuration.controller.ts:1](../../apps/api/src/configuration.controller.ts#L1), [apps/api/src/packs.controller.ts:1](../../apps/api/src/packs.controller.ts#L1) | [apps/api/test/members/member-lifecycle.integration.test.ts:1](../../apps/api/test/members/member-lifecycle.integration.test.ts#L1), [apps/api/test/packs/packs.integration.test.ts:1](../../apps/api/test/packs/packs.integration.test.ts#L1) |
| Trainer F17–21 | [apps/api/src/trainer-enrollment.service.ts:1](../../apps/api/src/trainer-enrollment.service.ts#L1), [apps/api/src/trainers.controller.ts:1](../../apps/api/src/trainers.controller.ts#L1), [apps/api/src/trainer-lifecycle.service.ts:1](../../apps/api/src/trainer-lifecycle.service.ts#L1) | [apps/api/test/trainers/trainers.integration.test.ts:1](../../apps/api/test/trainers/trainers.integration.test.ts#L1), [apps/api/test/trainers/trainer-lifecycle.integration.test.ts:1](../../apps/api/test/trainers/trainer-lifecycle.integration.test.ts#L1) |
| Sessions F22–28 | [apps/api/src/sessions/booking.service.ts:1](../../apps/api/src/sessions/booking.service.ts#L1), [apps/api/src/sessions/session-requests.service.ts:1](../../apps/api/src/sessions/session-requests.service.ts#L1), [apps/api/src/sessions/session-reads.service.ts:1](../../apps/api/src/sessions/session-reads.service.ts#L1), [apps/api/src/sessions/session-lifecycle.service.ts:1](../../apps/api/src/sessions/session-lifecycle.service.ts#L1), [apps/api/src/sessions/session-state.ts:1](../../apps/api/src/sessions/session-state.ts#L1) | [apps/api/test/sessions/session-booking.integration.test.ts:1](../../apps/api/test/sessions/session-booking.integration.test.ts#L1), [apps/api/test/session-requests/session-requests.integration.test.ts:1](../../apps/api/test/session-requests/session-requests.integration.test.ts#L1), [apps/web/tests/session-reads.e2e.spec.ts:1](../../apps/web/tests/session-reads.e2e.spec.ts#L1) |
| Coaching F29–31 | [apps/api/src/coaching/coaching.service.ts:1](../../apps/api/src/coaching/coaching.service.ts#L1), [packages/contracts/src/coaching.ts:1](../../packages/contracts/src/coaching.ts#L1), [apps/web/src/components/coaching/workout-plan-builder.tsx:1](../../apps/web/src/components/coaching/workout-plan-builder.tsx#L1), [apps/web/src/components/coaching/meal-plan-builder.tsx:1](../../apps/web/src/components/coaching/meal-plan-builder.tsx#L1) | [apps/api/test/coaching/coaching.integration.test.ts:1](../../apps/api/test/coaching/coaching.integration.test.ts#L1) |
| Notifications/audit F32/40 | [apps/api/src/notifications.controller.ts:1](../../apps/api/src/notifications.controller.ts#L1), [apps/api/src/notifications.service.ts:1](../../apps/api/src/notifications.service.ts#L1), [apps/web/src/components/navigation/notifications-bell.tsx:1](../../apps/web/src/components/navigation/notifications-bell.tsx#L1) | [apps/api/test/notifications/notifications.integration.test.ts:1](../../apps/api/test/notifications/notifications.integration.test.ts#L1), [apps/web/tests/notifications-bell.e2e.spec.ts:1](../../apps/web/tests/notifications-bell.e2e.spec.ts#L1) |
| Finance F33–39 | [apps/api/src/finance/finance.service.ts:1](../../apps/api/src/finance/finance.service.ts#L1), [apps/api/src/finance/payroll.service.ts:1](../../apps/api/src/finance/payroll.service.ts#L1), [packages/contracts/src/finance.ts:1](../../packages/contracts/src/finance.ts#L1), [apps/web/src/components/finance/finance-forms.tsx:1](../../apps/web/src/components/finance/finance-forms.tsx#L1) | [apps/api/test/finance/segment08.integration.test.ts:1](../../apps/api/test/finance/segment08.integration.test.ts#L1), [apps/api/src/finance/finance-arithmetic.spec.ts:1](../../apps/api/src/finance/finance-arithmetic.spec.ts#L1) |
| Dashboard/analytics F41/42 | [apps/api/src/dashboard/dashboard.service.ts:1](../../apps/api/src/dashboard/dashboard.service.ts#L1), [apps/api/src/analytics/analytics.service.ts:1](../../apps/api/src/analytics/analytics.service.ts#L1) | Backend/source inspection only for this audit; no fresh aggregate reconciliation run |
| Config/theme F43/44 | [apps/web/src/components/configuration/owner-gym-configuration.tsx:1](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L1), [packages/theme-tokens/src/classic.ts:1](../../packages/theme-tokens/src/classic.ts#L1), [apps/api/src/configuration.controller.ts:1](../../apps/api/src/configuration.controller.ts#L1), [apps/api/src/gyms.controller.ts:1](../../apps/api/src/gyms.controller.ts#L1) | [apps/api/test/platform/configuration.integration.test.ts:1](../../apps/api/test/platform/configuration.integration.test.ts#L1), [packages/theme-tokens/test/classic.test.mjs:1](../../packages/theme-tokens/test/classic.test.mjs#L1) |
| Maintenance F45 | [apps/api/src/platform/schema-rollout.service.ts:1](../../apps/api/src/platform/schema-rollout.service.ts#L1), [apps/api/scripts/schema-rollout.mjs:1](../../apps/api/scripts/schema-rollout.mjs#L1), [infrastructure/recovery/recovery.mjs:1](../../infrastructure/recovery/recovery.mjs#L1) | [apps/api/test/platform/rollout.integration.test.ts:1](../../apps/api/test/platform/rollout.integration.test.ts#L1), [apps/api/test/recovery/task009.integration.test.ts:1](../../apps/api/test/recovery/task009.integration.test.ts#L1) |
| Placeholder F46 | [apps/web/src/app/gyms/[slug]/owner/subscription/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/subscription/page.tsx#L1) | Explicit source unavailable message, no billing model/controller |

## Complete API controller endpoint ledger

This ledger is extracted from every `*.controller.ts` decorator in `apps/api/src` and checked against AppModule registration. Routes below are **API server paths**, not Next pages or server-action names. Method parameters identify scope; no concrete tenant/member identities are included. Exact role details are in the named controller/services and file01; raw support context is permitted only on summary/exit. A health/root API route is infrastructure, not another UI screen.

| Method | API path | Primary scope | Source |
|---|---|---|---|
| GET | `/admin/gyms` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/admin.controller.ts:14](../../apps/api/src/admin.controller.ts#L14) |
| GET | `/admin/analytics/summary` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/admin.controller.ts:20](../../apps/api/src/admin.controller.ts#L20) |
| POST | `/admin/analytics/refresh` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/admin.controller.ts:22](../../apps/api/src/admin.controller.ts#L22) |
| POST | `/admin/gyms` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/admin.controller.ts:29](../../apps/api/src/admin.controller.ts#L29) |
| GET | `/admin/operations/:id` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/admin.controller.ts:39](../../apps/api/src/admin.controller.ts#L39) |
| POST | `/admin/operations/:id/retry` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/admin.controller.ts:41](../../apps/api/src/admin.controller.ts#L41) |
| POST | `/admin/operations/:id/credentials/issue` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/admin.controller.ts:52](../../apps/api/src/admin.controller.ts#L52) |
| POST | `/admin/operations/:id/credentials/reissue` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/admin.controller.ts:58](../../apps/api/src/admin.controller.ts#L58) |
| POST | `/admin/operations/:id/credentials/acknowledge` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/admin.controller.ts:65](../../apps/api/src/admin.controller.ts#L65) |
| GET | `/gyms/:slug/analytics` | OWNER within verified gym (domain rules apply) | [apps/api/src/analytics/analytics.controller.ts:9](../../apps/api/src/analytics/analytics.controller.ts#L9) |
| GET | `/` | Public/authentication or health | [apps/api/src/app.controller.ts:8](../../apps/api/src/app.controller.ts#L8) |
| POST | `/auth/login` | Public/authentication or health | [apps/api/src/auth.controller.ts:30](../../apps/api/src/auth.controller.ts#L30) |
| POST | `/auth/logout` | Signed identity; password gate handled by operation | [apps/api/src/auth.controller.ts:90](../../apps/api/src/auth.controller.ts#L90) |
| GET | `/auth/session` | Signed identity; password gate handled by operation | [apps/api/src/auth.controller.ts:112](../../apps/api/src/auth.controller.ts#L112) |
| GET | `/gyms/:slug/me/clients` | TRAINER; confirmed relationship required | [apps/api/src/coaching/coaching.controller.ts:11](../../apps/api/src/coaching/coaching.controller.ts#L11) |
| GET | `/gyms/:slug/me/clients/:memberId` | TRAINER; confirmed relationship required | [apps/api/src/coaching/coaching.controller.ts:20](../../apps/api/src/coaching/coaching.controller.ts#L20) |
| POST | `/gyms/:slug/me/clients/:memberId/workout-plans` | TRAINER; confirmed relationship required | [apps/api/src/coaching/coaching.controller.ts:27](../../apps/api/src/coaching/coaching.controller.ts#L27) |
| POST | `/gyms/:slug/me/clients/:memberId/meal-plans` | TRAINER; confirmed relationship required | [apps/api/src/coaching/coaching.controller.ts:37](../../apps/api/src/coaching/coaching.controller.ts#L37) |
| GET | `/gyms/:slug/me/workout-plans` | Own MEMBER | [apps/api/src/coaching/coaching.controller.ts:47](../../apps/api/src/coaching/coaching.controller.ts#L47) |
| GET | `/gyms/:slug/me/meal-plans` | Own MEMBER | [apps/api/src/coaching/coaching.controller.ts:56](../../apps/api/src/coaching/coaching.controller.ts#L56) |
| GET | `/gyms/:slug/configuration` | OWNER within verified gym (domain rules apply) | [apps/api/src/configuration.controller.ts:70](../../apps/api/src/configuration.controller.ts#L70) |
| POST | `/gyms/:slug/configuration` | OWNER within verified gym (domain rules apply) | [apps/api/src/configuration.controller.ts:86](../../apps/api/src/configuration.controller.ts#L86) |
| POST | `/gyms/:slug/membership-plans` | OWNER within verified gym (domain rules apply) | [apps/api/src/configuration.controller.ts:122](../../apps/api/src/configuration.controller.ts#L122) |
| GET | `/gyms/:slug/members/:memberId/membership-eligibility` | OWNER or own MEMBER | [apps/api/src/configuration.controller.ts:149](../../apps/api/src/configuration.controller.ts#L149) |
| POST | `/gyms/:slug/members/:memberId/memberships` | OWNER within verified gym (domain rules apply) | [apps/api/src/configuration.controller.ts:169](../../apps/api/src/configuration.controller.ts#L169) |
| POST | `/auth/change-password` | Signed identity; password gate handled by operation | [apps/api/src/credentials.controller.ts:13](../../apps/api/src/credentials.controller.ts#L13) |
| POST | `/gyms/:slug/enrollments/:operationId/credentials/issue` | OWNER, scoped enrollment delivery | [apps/api/src/credentials.controller.ts:34](../../apps/api/src/credentials.controller.ts#L34) |
| POST | `/gyms/:slug/enrollments/:operationId/credentials/reissue` | OWNER, scoped enrollment delivery | [apps/api/src/credentials.controller.ts:48](../../apps/api/src/credentials.controller.ts#L48) |
| POST | `/gyms/:slug/enrollments/:operationId/credentials/acknowledge` | OWNER, scoped enrollment delivery | [apps/api/src/credentials.controller.ts:63](../../apps/api/src/credentials.controller.ts#L63) |
| GET | `/gyms/:slug/dashboard` | OWNER within verified gym (domain rules apply) | [apps/api/src/dashboard/dashboard.controller.ts:9](../../apps/api/src/dashboard/dashboard.controller.ts#L9) |
| GET | `/gyms/:slug/financials/revenue` | OWNER within verified gym (domain rules apply) | [apps/api/src/finance/finance.controller.ts:13](../../apps/api/src/finance/finance.controller.ts#L13) |
| GET | `/gyms/:slug/financials/deferred-revenue` | OWNER within verified gym (domain rules apply) | [apps/api/src/finance/finance.controller.ts:22](../../apps/api/src/finance/finance.controller.ts#L22) |
| GET | `/gyms/:slug/financials/pnl` | OWNER within verified gym (domain rules apply) | [apps/api/src/finance/finance.controller.ts:31](../../apps/api/src/finance/finance.controller.ts#L31) |
| GET | `/gyms/:slug/me/earnings` | Own TRAINER | [apps/api/src/finance/finance.controller.ts:38](../../apps/api/src/finance/finance.controller.ts#L38) |
| GET | `/gyms/:slug/financials/expenses` | OWNER within verified gym (domain rules apply) | [apps/api/src/finance/finance.controller.ts:47](../../apps/api/src/finance/finance.controller.ts#L47) |
| POST | `/gyms/:slug/financials/expenses` | OWNER within verified gym (domain rules apply) | [apps/api/src/finance/finance.controller.ts:54](../../apps/api/src/finance/finance.controller.ts#L54) |
| GET | `/gyms/:slug/financials/budgets` | OWNER within verified gym (domain rules apply) | [apps/api/src/finance/finance.controller.ts:61](../../apps/api/src/finance/finance.controller.ts#L61) |
| POST | `/gyms/:slug/financials/export` | OWNER within verified gym (domain rules apply) | [apps/api/src/finance/finance.controller.ts:68](../../apps/api/src/finance/finance.controller.ts#L68) |
| POST | `/gyms/:slug/financials/budgets` | OWNER within verified gym (domain rules apply) | [apps/api/src/finance/finance.controller.ts:77](../../apps/api/src/finance/finance.controller.ts#L77) |
| GET | `/gyms/:slug/payroll/periods` | OWNER commands; OWNER/own TRAINER reads | [apps/api/src/finance/finance.controller.ts:84](../../apps/api/src/finance/finance.controller.ts#L84) |
| GET | `/gyms/:slug/payroll/current` | OWNER commands; OWNER/own TRAINER reads | [apps/api/src/finance/finance.controller.ts:91](../../apps/api/src/finance/finance.controller.ts#L91) |
| POST | `/gyms/:slug/payroll/periods/:periodId/close` | OWNER commands; OWNER/own TRAINER reads | [apps/api/src/finance/finance.controller.ts:98](../../apps/api/src/finance/finance.controller.ts#L98) |
| POST | `/gyms/:slug/payroll/periods/:periodId/approve` | OWNER commands; OWNER/own TRAINER reads | [apps/api/src/finance/finance.controller.ts:105](../../apps/api/src/finance/finance.controller.ts#L105) |
| GET | `/gyms/:slug/theme` | Public active-gym brand metadata only | [apps/api/src/gyms.controller.ts:78](../../apps/api/src/gyms.controller.ts#L78) |
| PATCH | `/gyms/:slug/theme` | OWNER within verified gym (domain rules apply) | [apps/api/src/gyms.controller.ts:105](../../apps/api/src/gyms.controller.ts#L105) |
| GET | `/gyms/:slug/theme/settings` | OWNER within verified gym (domain rules apply) | [apps/api/src/gyms.controller.ts:141](../../apps/api/src/gyms.controller.ts#L141) |
| GET | `/gyms/:slug/public-profile` | OWNER within verified gym (domain rules apply) | [apps/api/src/gyms.controller.ts:158](../../apps/api/src/gyms.controller.ts#L158) |
| PATCH | `/gyms/:slug/public-profile` | OWNER within verified gym (domain rules apply) | [apps/api/src/gyms.controller.ts:169](../../apps/api/src/gyms.controller.ts#L169) |
| GET | `/gyms/:slug/access` | Current OWNER/TRAINER/MEMBER binding | [apps/api/src/gyms.controller.ts:191](../../apps/api/src/gyms.controller.ts#L191) |
| GET | `/gyms/:slug/members` | OWNER within verified gym (domain rules apply) | [apps/api/src/gyms.controller.ts:202](../../apps/api/src/gyms.controller.ts#L202) |
| GET | `/gyms/:slug/members/:memberId` | OWNER within verified gym (domain rules apply) | [apps/api/src/gyms.controller.ts:268](../../apps/api/src/gyms.controller.ts#L268) |
| POST | `/gyms/:slug/members` | OWNER within verified gym (domain rules apply) | [apps/api/src/gyms.controller.ts:330](../../apps/api/src/gyms.controller.ts#L330) |
| POST | `/gyms/:slug/member-registrations` | OWNER within verified gym (domain rules apply) | [apps/api/src/gyms.controller.ts:372](../../apps/api/src/gyms.controller.ts#L372) |
| POST | `/gyms/:slug/trainer-registrations` | OWNER within verified gym (domain rules apply) | [apps/api/src/gyms.controller.ts:384](../../apps/api/src/gyms.controller.ts#L384) |
| POST | `/gyms/:slug/member-enrollments/:operationId/consent` | Intended signed identity/operation; no existing gym link required | [apps/api/src/gyms.controller.ts:396](../../apps/api/src/gyms.controller.ts#L396) |
| POST | `/gyms/:slug/trainer-enrollments/:operationId/consent` | Intended signed identity/operation; no existing gym link required | [apps/api/src/gyms.controller.ts:409](../../apps/api/src/gyms.controller.ts#L409) |
| POST | `/gyms/:slug/members/:memberId/status` | OWNER within verified gym (domain rules apply) | [apps/api/src/member-lifecycle.controller.ts:13](../../apps/api/src/member-lifecycle.controller.ts#L13) |
| GET | `/gyms/:slug/member-lifecycle/:operationId` | OWNER within verified gym (domain rules apply) | [apps/api/src/member-lifecycle.controller.ts:24](../../apps/api/src/member-lifecycle.controller.ts#L24) |
| POST | `/gyms/:slug/member-lifecycle/:operationId/resume` | OWNER within verified gym (domain rules apply) | [apps/api/src/member-lifecycle.controller.ts:31](../../apps/api/src/member-lifecycle.controller.ts#L31) |
| GET | `/gyms/:slug/me/notifications` | Own OWNER/TRAINER/MEMBER notification recipient | [apps/api/src/notifications.controller.ts:31](../../apps/api/src/notifications.controller.ts#L31) |
| POST | `/gyms/:slug/me/notifications/:notificationId/read` | Own OWNER/TRAINER/MEMBER notification recipient | [apps/api/src/notifications.controller.ts:51](../../apps/api/src/notifications.controller.ts#L51) |
| POST | `/gyms/:slug/me/notifications/read-all` | Own OWNER/TRAINER/MEMBER notification recipient | [apps/api/src/notifications.controller.ts:65](../../apps/api/src/notifications.controller.ts#L65) |
| GET | `/gyms/:slug/audit` | OWNER within verified gym (domain rules apply) | [apps/api/src/notifications.controller.ts:81](../../apps/api/src/notifications.controller.ts#L81) |
| POST | `/gyms/:slug/members/:memberId/session-packs` | OWNER within verified gym (domain rules apply) | [apps/api/src/packs.controller.ts:21](../../apps/api/src/packs.controller.ts#L21) |
| POST | `/admin/gyms/:id/lifecycle` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/platform/gym-lifecycle.controller.ts:10](../../apps/api/src/platform/gym-lifecycle.controller.ts#L10) |
| GET | `/admin/lifecycle/:id` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/platform/gym-lifecycle.controller.ts:17](../../apps/api/src/platform/gym-lifecycle.controller.ts#L17) |
| POST | `/admin/lifecycle/:id/resume` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/platform/gym-lifecycle.controller.ts:19](../../apps/api/src/platform/gym-lifecycle.controller.ts#L19) |
| POST | `/auth/provisioning/:id/owner-consent` | Intended signed-in owner identity/operation | [apps/api/src/platform/provisioning-owner.controller.ts:11](../../apps/api/src/platform/provisioning-owner.controller.ts#L11) |
| POST | `/admin/support-sessions` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/platform/support-session.controller.ts:9](../../apps/api/src/platform/support-session.controller.ts#L9) |
| GET | `/admin/support-sessions/:id/gyms/:slug/summary` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/platform/support-session.controller.ts:14](../../apps/api/src/platform/support-session.controller.ts#L14) |
| DELETE | `/admin/support-sessions/:id` | SUPER_ADMIN; support summary/exit additionally context-scoped | [apps/api/src/platform/support-session.controller.ts:16](../../apps/api/src/platform/support-session.controller.ts#L16) |
| GET | `/gyms/:slug/session-booking-options` | OWNER within verified gym (domain rules apply) | [apps/api/src/sessions/booking.controller.ts:11](../../apps/api/src/sessions/booking.controller.ts#L11) |
| POST | `/gyms/:slug/sessions/bookings` | OWNER within verified gym (domain rules apply) | [apps/api/src/sessions/booking.controller.ts:20](../../apps/api/src/sessions/booking.controller.ts#L20) |
| GET | `/gyms/:slug/member-session-overview` | OWNER within verified gym (domain rules apply) | [apps/api/src/sessions/member-session-overview.controller.ts:11](../../apps/api/src/sessions/member-session-overview.controller.ts#L11) |
| POST | `/gyms/:slug/sessions/:sessionId/start` | OWNER/assigned TRAINER; own MEMBER for quote/cancel only | [apps/api/src/sessions/session-lifecycle.controller.ts:28](../../apps/api/src/sessions/session-lifecycle.controller.ts#L28) |
| PATCH | `/gyms/:slug/sessions/:sessionId/notes` | OWNER/assigned TRAINER; own MEMBER for quote/cancel only | [apps/api/src/sessions/session-lifecycle.controller.ts:35](../../apps/api/src/sessions/session-lifecycle.controller.ts#L35) |
| POST | `/gyms/:slug/sessions/:sessionId/complete` | OWNER/assigned TRAINER; own MEMBER for quote/cancel only | [apps/api/src/sessions/session-lifecycle.controller.ts:42](../../apps/api/src/sessions/session-lifecycle.controller.ts#L42) |
| GET | `/gyms/:slug/sessions/:sessionId/quote` | OWNER/assigned TRAINER; own MEMBER for quote/cancel only | [apps/api/src/sessions/session-lifecycle.controller.ts:49](../../apps/api/src/sessions/session-lifecycle.controller.ts#L49) |
| POST | `/gyms/:slug/sessions/:sessionId/cancel` | OWNER/assigned TRAINER; own MEMBER for quote/cancel only | [apps/api/src/sessions/session-lifecycle.controller.ts:56](../../apps/api/src/sessions/session-lifecycle.controller.ts#L56) |
| POST | `/gyms/:slug/sessions/:sessionId/no-show` | OWNER/assigned TRAINER; own MEMBER for quote/cancel only | [apps/api/src/sessions/session-lifecycle.controller.ts:63](../../apps/api/src/sessions/session-lifecycle.controller.ts#L63) |
| GET | `/gyms/:slug/sessions` | OWNER within verified gym (domain rules apply) | [apps/api/src/sessions/session-reads.controller.ts:11](../../apps/api/src/sessions/session-reads.controller.ts#L11) |
| GET | `/gyms/:slug/me/sessions` | Own TRAINER/MEMBER | [apps/api/src/sessions/session-reads.controller.ts:20](../../apps/api/src/sessions/session-reads.controller.ts#L20) |
| GET | `/gyms/:slug/members/:memberId/recent-sessions` | OWNER within verified gym (domain rules apply) | [apps/api/src/sessions/session-reads.controller.ts:29](../../apps/api/src/sessions/session-reads.controller.ts#L29) |
| GET | `/gyms/:slug/me/session-request-options` | MEMBER | [apps/api/src/sessions/session-requests.controller.ts:10](../../apps/api/src/sessions/session-requests.controller.ts#L10) |
| GET | `/gyms/:slug/me/session-requests` | TRAINER reads / MEMBER creates | [apps/api/src/sessions/session-requests.controller.ts:17](../../apps/api/src/sessions/session-requests.controller.ts#L17) |
| POST | `/gyms/:slug/me/session-requests` | TRAINER reads / MEMBER creates | [apps/api/src/sessions/session-requests.controller.ts:24](../../apps/api/src/sessions/session-requests.controller.ts#L24) |
| POST | `/gyms/:slug/sessions/:sessionId/respond` | Assigned TRAINER | [apps/api/src/sessions/session-requests.controller.ts:33](../../apps/api/src/sessions/session-requests.controller.ts#L33) |
| GET | `/gyms/:slug/trainers` | OWNER within verified gym (domain rules apply) | [apps/api/src/trainers.controller.ts:56](../../apps/api/src/trainers.controller.ts#L56) |
| GET | `/gyms/:slug/trainers/:trainerId` | OWNER within verified gym (domain rules apply) | [apps/api/src/trainers.controller.ts:78](../../apps/api/src/trainers.controller.ts#L78) |
| GET | `/gyms/:slug/me/trainer-directory` | MEMBER | [apps/api/src/trainers.controller.ts:109](../../apps/api/src/trainers.controller.ts#L109) |
| PUT | `/gyms/:slug/trainers/:trainerId/shift` | OWNER within verified gym (domain rules apply) | [apps/api/src/trainers.controller.ts:130](../../apps/api/src/trainers.controller.ts#L130) |
| POST | `/gyms/:slug/trainers/:trainerId/status` | OWNER within verified gym (domain rules apply) | [apps/api/src/trainers.controller.ts:180](../../apps/api/src/trainers.controller.ts#L180) |
| GET | `/gyms/:slug/trainer-lifecycle/:operationId` | OWNER within verified gym (domain rules apply) | [apps/api/src/trainers.controller.ts:192](../../apps/api/src/trainers.controller.ts#L192) |
| POST | `/gyms/:slug/trainer-lifecycle/:operationId/resume` | OWNER within verified gym (domain rules apply) | [apps/api/src/trainers.controller.ts:199](../../apps/api/src/trainers.controller.ts#L199) |

**Extracted endpoint count: 94 across 22 controller source files.** HTTP handlers/controllers do not imply a connected UI; compare the feature/screen catalog.


## Model and relationship dictionary

Source-derived field **names/types only**, no record values/default credentials/connection data. Prisma relation fields show ownership and graph directions; master-to-tenant identity/operation references are intentionally scalar. Private hashes/database/credential-intent field names are omitted from the compact dictionary below where their values must never become UI DTOs; see system overview for security architecture. Supporting metadata models do not imply user-facing editors.

### Master

- **User** — `originalPlatformAudits: PlatformAuditLog[]`, `initiatedOperations: Operation[]`, `subjectOperations: Operation[]`, `platformAudits: PlatformAuditLog[]`, `credentialDeliveries: CredentialDelivery[]`, `issuedCredentials: CredentialDelivery[]`, `id: String`, `email: String`, `globalRole: GlobalRole`, `displayName: String?`, `mustChangePassword: Boolean`, `authVersion: Int`, `version: Int`, `passwordChangedAt: DateTime?`, `credentialExpiresAt: DateTime?`, `gymAccesses: GymAccess[]`, `enrollmentProofs: EnrollmentProof[]`, `createdAt: DateTime`, `updatedAt: DateTime`. [packages/database-master/prisma/schema.prisma:41](../../packages/database-master/prisma/schema.prisma#L41)
- **Gym** — `platformAudits: PlatformAuditLog[]`, `operations: Operation[]`, `expectedTenantOperationId: String?`, `expectedTenantOperation: Operation?`, `id: String`, `slug: String`, `name: String`, `status: GymStatus`, `version: Int`, `publicProfileVersion: Int`, `expectedTenantSchemaVersion: String?`, `expectedTenantManifestDigest: String?`, `gymAccesses: GymAccess[]`, `theme: Theme?`, `enrollmentProofs: EnrollmentProof[]`, `credentialDeliveries: CredentialDelivery[]`, `createdAt: DateTime`, `updatedAt: DateTime`. [packages/database-master/prisma/schema.prisma:64](../../packages/database-master/prisma/schema.prisma#L64)
- **GymAccess** — `userId: String`, `gymId: String`, `role: GymRole`, `linkStatus: AccessLinkStatus`, `actorKind: ActorKind?`, `tenantActorId: String?`, `enrollmentOperationId: String?`, `version: Int`, `user: User`, `gym: Gym`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:86](../../packages/database-master/prisma/schema.prisma#L86)
- **EnrollmentProof** — `id: String`, `identityId: String`, `gymId: String`, `role: GymRole`, `enrollmentOperationId: String`, `authVersion: Int`, `issuedAt: DateTime`, `expiresAt: DateTime`, `consumedAt: DateTime?`, `identity: User`, `gym: Gym`. [packages/database-master/prisma/schema.prisma:106](../../packages/database-master/prisma/schema.prisma#L106)
- **Theme** — `ownerOperations: Operation[]`, `id: String`, `gymId: String`, `gym: Gym`, `primaryColor: String`, `logoUrl: String?`, `version: Int`, `updatedAt: DateTime`. [packages/database-master/prisma/schema.prisma:124](../../packages/database-master/prisma/schema.prisma#L124)
- **Operation** — `provisioningIntent: ProvisioningIntent?`, `lifecycleIntent: GymLifecycleIntent?`, `trainerLifecycleIntent: TrainerLifecycleIntent?`, `memberLifecycleIntent: MemberLifecycleIntent?`, `schemaRolloutTarget: SchemaRolloutTarget?`, `id: String`, `kind: OperationKind`, `actorIdentityId: String`, `actor: User`, `scopeKey: String`, `idempotencyKey: String`, `requestedSlug: String?`, `supportContextId: String?`, `gymId: String?`, `gym: Gym?`, `expectedForGym: Gym?`, `subjectIdentityId: String?`, `subject: User?`, `ownerThemeId: String?`, `ownerTheme: Theme?`, `intendedTenantTemplateVersion: String?`, `intendedTenantManifestDigest: String?`, `appliedTenantTemplateVersion: String?`, `appliedTenantManifestDigest: String?`, `tenantSchemaVerifiedAt: DateTime?`, `tenantActorId: String?`, `tenantCommandReceiptId: String?`, `tenantMembershipId: String?`, `state: OperationState`, `step: String`, `version: Int`, `attemptCount: Int`, `leaseExpiresAt: DateTime?`, `leaseRequiresReconciliation: Boolean`, `errorCode: String?`, `createdAt: DateTime`, `updatedAt: DateTime`, `lastAttemptAt: DateTime?`, `audits: PlatformAuditLog[]`, `credentialDelivery: CredentialDelivery?`. [packages/database-master/prisma/schema.prisma:163](../../packages/database-master/prisma/schema.prisma#L163)
- **PlatformAuditLog** — `id: String`, `eventKey: String`, `actorIdentityId: String`, `actor: User`, `originalActorIdentityId: String?`, `originalActor: User?`, `gymId: String?`, `gym: Gym?`, `operationId: String?`, `operation: Operation?`, `eventCode: String`, `resourceType: String`, `resourceId: String`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:217](../../packages/database-master/prisma/schema.prisma#L217)
- **CredentialDelivery** — `id: String`, `operationId: String`, `operation: Operation`, `identityId: String`, `identity: User`, `issuedByIdentityId: String`, `issuedBy: User`, `gymId: String`, `gym: Gym`, `authVersion: Int`, `version: Int`, `lastReissueKey: String?`, `lastReissueDigest: String?`, `issuedAt: DateTime`, `expiresAt: DateTime`, `acknowledgedAt: DateTime?`. [packages/database-master/prisma/schema.prisma:241](../../packages/database-master/prisma/schema.prisma#L241)
- **ProvisioningIntent** — `operationId: String`, `operation: Operation`, `name: String`, `reuseIdentity: Boolean`, `actorAuthVersion: Int`, `currency: String`, `timezone: String`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:264](../../packages/database-master/prisma/schema.prisma#L264)
- **GymRegistrySummary** — `gymId: String`, `memberCount: Int?`, `trainerCount: Int?`, `observedAt: DateTime?`, `schemaVersion: String?`, `health: String`, `version: Int`. [packages/database-master/prisma/schema.prisma:277](../../packages/database-master/prisma/schema.prisma#L277)
- **SupportSession** — `id: String`, `actorIdentityId: String`, `authVersion: Int`, `gymId: String`, `scope: String`, `reasonCode: String`, `explanation: String`, `issuedAt: DateTime`, `expiresAt: DateTime`, `revokedAt: DateTime?`, `revocationReason: String?`, `version: Int`, `events: SupportEvent[]`. [packages/database-master/prisma/schema.prisma:287](../../packages/database-master/prisma/schema.prisma#L287)
- **SupportEvent** — `id: String`, `eventKey: String`, `supportSessionId: String`, `session: SupportSession`, `originalActorIdentityId: String`, `gymId: String`, `scope: String`, `route: String`, `outcome: String`, `reasonReference: String`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:305](../../packages/database-master/prisma/schema.prisma#L305)
- **GymLifecycleIntent** — `operationId: String`, `operation: Operation`, `expectedGymVersion: Int`, `target: String`, `reason: String`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:320](../../packages/database-master/prisma/schema.prisma#L320)
- **TrainerLifecycleIntent** — `operationId: String`, `operation: Operation`, `trainerId: String`, `expectedAccessVersion: Int`, `expectedTrainerVersion: Int`, `targetStatus: String`, `reason: String`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:329](../../packages/database-master/prisma/schema.prisma#L329)
- **MemberLifecycleIntent** — `operationId: String`, `operation: Operation`, `memberId: String`, `expectedAccessVersion: Int`, `expectedMemberVersion: Int`, `targetStatus: String`, `reason: String`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:342](../../packages/database-master/prisma/schema.prisma#L342)
- **SchemaRollout** — `id: String`, `actorIdentityId: String`, `idempotencyKey: String`, `targetVersion: String`, `targetDigest: String`, `batchSize: Int`, `state: String`, `version: Int`, `targets: SchemaRolloutTarget[]`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:355](../../packages/database-master/prisma/schema.prisma#L355)
- **SchemaRolloutTarget** — `operationId: String`, `operation: Operation`, `rolloutId: String`, `rollout: SchemaRollout`, `ordinal: Int`, `ownershipOperationId: String`, `sourceOperationId: String`, `sourceVersion: String`, `sourceDigest: String`, `expectedGymVersion: Int`, `reviews: SchemaRepairReview[]`. [packages/database-master/prisma/schema.prisma:370](../../packages/database-master/prisma/schema.prisma#L370)
- **SchemaRepairReview** — `id: String`, `operationId: String`, `target: SchemaRolloutTarget`, `actorIdentityId: String`, `approvedAttempt: Int`, `reason: String`, `observedVersion: String`, `observedDigest: String`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:385](../../packages/database-master/prisma/schema.prisma#L385)
- **SchemaRolloutApproval** — `id: String`, `rolloutId: String`, `expectedVersion: Int`, `actorIdentityId: String`, `reason: String`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:398](../../packages/database-master/prisma/schema.prisma#L398)
- **MasterSchemaState** — `id: String`, `templateVersion: String`, `manifestDigest: String`, `verifiedAt: DateTime`, `version: Int`. [packages/database-master/prisma/schema.prisma:408](../../packages/database-master/prisma/schema.prisma#L408)
- **MasterSchemaDeployment** — `id: String`, `manifestDigest: String`, `templateVersion: String`, `createdAt: DateTime`. [packages/database-master/prisma/schema.prisma:416](../../packages/database-master/prisma/schema.prisma#L416)

**Enums:**

- `GlobalRole`: `USER`, `SUPER_ADMIN`.
- `GymRole`: `OWNER`, `TRAINER`, `MEMBER`.
- `GymStatus`: `PROVISIONING`, `ACTIVE`, `FAILED`, `SUSPENDED`.
- `AccessLinkStatus`: `PENDING`, `ACTIVE`, `FAILED`, `REVOKED`.
- `ActorKind`: `MEMBER`, `TRAINER`.
- `OperationKind`: `PROVISION_GYM`, `REGISTER_MEMBER`, `REGISTER_TRAINER`, `UPDATE_GYM_PROFILE`, `CHANGE_ACCESS`, `CHANGE_TRAINER_ACCESS`, `CHANGE_MEMBER_STATUS`, `ROLLOUT_TENANT_SCHEMA`.
- `OperationState`: `PENDING`, `MASTER_PREPARED`, `TENANT_COMMITTED`, `COMPLETE`, `FAILED_RETRYABLE`, `FAILED_FINAL`, `REPAIR_REQUIRED`.

### Tenant

- **Member** — `id: String`, `fullName: String`, `email: String?`, `status: MemberStatus`, `identityId: String?`, `registrationState: MemberRegistrationState`, `enrollmentOperationId: String?`, `version: Int`, `phone: String?`, `dateOfBirth: DateTime?`, `emergencyContact: String?`, `healthNotes: String?`, `sessionPacks: SessionPack[]`, `memberships: MembershipTerm[]`, `sessionsAsMember: PTSession[]`, `workoutPlans: WorkoutPlan[]`, `mealPlans: MealPlan[]`, `createdAt: DateTime`, `updatedAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:40](../../packages/database-tenant/prisma/schema.prisma#L40)
- **SessionPack** — `id: String`, `memberId: String`, `member: Member`, `issuedCredits: Int`, `price: Decimal`, `currency: String`, `totalMinorUnits: BigInt`, `creditBaseMinorUnits: BigInt`, `creditRemainder: Int`, `creditAllocationPolicyVersion: String`, `validityDays: Int`, `startDate: DateTime`, `endDateExclusive: DateTime`, `status: SessionPackStatus`, `version: Int`, `commandReceiptId: String`, `actorIdentityId: String`, `idempotencyKey: String`, `createdAt: DateTime`, `creditMovements: PackCreditMovement[]`, `holds: SessionCreditHold[]`. [packages/database-tenant/prisma/schema.prisma:68](../../packages/database-tenant/prisma/schema.prisma#L68)
- **Trainer** — `id: String`, `fullName: String`, `email: String?`, `phone: String?`, `level: TrainerLevel?`, `specialisations: String[]`, `yearsExperience: Int?`, `shiftStart: String?`, `shiftEnd: String?`, `bio: String?`, `identityId: String?`, `registrationState: TrainerRegistrationState`, `enrollmentOperationId: String?`, `status: TrainerStatus`, `version: Int`, `sessions: PTSession[]`, `workoutPlans: WorkoutPlan[]`, `mealPlans: MealPlan[]`, `createdAt: DateTime`, `updatedAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:95](../../packages/database-tenant/prisma/schema.prisma#L95)
- **WorkoutPlan** — `id: String`, `memberId: String`, `member: Member`, `trainerId: String`, `trainer: Trainer`, `name: String`, `description: String?`, `createdAt: DateTime`, `exercises: WorkoutExercise[]`. [packages/database-tenant/prisma/schema.prisma:118](../../packages/database-tenant/prisma/schema.prisma#L118)
- **WorkoutExercise** — `id: String`, `planId: String`, `plan: WorkoutPlan`, `sortOrder: Int`, `name: String`, `sets: Int`, `reps: Int?`, `weightKg: Decimal?`, `durationMinutes: Int?`, `notes: String?`. [packages/database-tenant/prisma/schema.prisma:133](../../packages/database-tenant/prisma/schema.prisma#L133)
- **MealPlan** — `id: String`, `memberId: String`, `member: Member`, `trainerId: String`, `trainer: Trainer`, `name: String`, `createdAt: DateTime`, `entries: MealPlanEntry[]`. [packages/database-tenant/prisma/schema.prisma:149](../../packages/database-tenant/prisma/schema.prisma#L149)
- **MealPlanEntry** — `id: String`, `planId: String`, `plan: MealPlan`, `sortOrder: Int`, `dayOfWeek: Int`, `mealType: String`, `foodItem: String`, `calories: Int?`, `proteinGrams: Decimal?`, `carbsGrams: Decimal?`, `fatsGrams: Decimal?`. [packages/database-tenant/prisma/schema.prisma:163](../../packages/database-tenant/prisma/schema.prisma#L163)
- **PTSession** — `id: String`, `memberId: String`, `member: Member`, `trainerId: String`, `trainer: Trainer`, `state: PTSessionState`, `version: Int`, `type: SessionType`, `scheduledStartAt: DateTime`, `scheduledEndAt: DateTime`, `gymTimezone: String`, `fee: Decimal`, `currency: String`, `confirmationRate: Decimal?`, `confirmationLevel: TrainerLevel?`, `confirmationShiftStart: String?`, `confirmationShiftEnd: String?`, `configurationVersion: Int`, `confirmedAt: DateTime?`, `startedAt: DateTime?`, `endedAt: DateTime?`, `notes: String?`, `declineReason: String?`, `createdByIdentityId: String`, `updatedAt: DateTime`, `createdAt: DateTime`, `stateEvents: SessionStateEvent[]`, `creditHold: SessionCreditHold?`, `settlement: SessionSettlement?`, `revenueRecords: RevenueRecord[]`, `payRecord: PayRecord?`, `payCorrection: TrainerPayCorrection?`. [packages/database-tenant/prisma/schema.prisma:227](../../packages/database-tenant/prisma/schema.prisma#L227)
- **SessionStateEvent** — `id: String`, `sessionId: String`, `session: PTSession`, `fromState: PTSessionState?`, `toState: PTSessionState`, `committedVersion: Int`, `actorIdentityId: String`, `receiptId: String`, `receipt: CommandReceipt`, `eventKey: String`, `createdAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:266](../../packages/database-tenant/prisma/schema.prisma#L266)
- **SessionCreditHold** — `id: String`, `sessionId: String`, `session: PTSession`, `packId: String`, `pack: SessionPack`, `state: SessionCreditHoldState`, `creditOrdinal: Int`, `creditValueMinorUnits: BigInt`, `heldAt: DateTime`, `resolvedAt: DateTime?`, `version: Int`, `movements: PackCreditMovement[]`. [packages/database-tenant/prisma/schema.prisma:283](../../packages/database-tenant/prisma/schema.prisma#L283)
- **PackCreditMovement** — `id: String`, `packId: String`, `pack: SessionPack`, `holdId: String?`, `hold: SessionCreditHold?`, `kind: PackCreditMovementKind`, `availableDelta: Int`, `heldDelta: Int`, `consumedDelta: Int`, `expiredDelta: Int`, `creditOrdinal: Int?`, `sourceKey: String`, `receiptId: String`, `receipt: CommandReceipt`, `actorIdentityId: String`, `createdAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:300](../../packages/database-tenant/prisma/schema.prisma#L300)
- **SessionSettlement** — `id: String`, `sessionId: String`, `session: PTSession`, `kind: SessionSettlementKind`, `creditConsumed: Boolean`, `creditValue: Decimal`, `currency: String`, `sourceReceiptId: String`, `sourceReceipt: CommandReceipt`, `createdAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:321](../../packages/database-tenant/prisma/schema.prisma#L321)
- **RevenueRecord** — `id: String`, `sessionId: String`, `session: PTSession`, `payCorrections: TrainerPayCorrection[]`, `category: OperationalEarningCategory`, `amount: Decimal`, `currency: String`, `sourceKey: String`, `createdAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:334](../../packages/database-tenant/prisma/schema.prisma#L334)
- **TrainerPayPeriod** — `id: String`, `cadence: PayPeriod`, `localStartDate: DateTime`, `localEndDateExclusive: DateTime`, `timezone: String`, `utcStartAt: DateTime`, `utcEndAt: DateTime`, `state: PayPeriodState`, `version: Int`, `calculatedTotal: Decimal`, `createdAt: DateTime`, `updatedAt: DateTime`, `records: PayRecord[]`, `corrections: TrainerPayCorrection[]`, `sourcedCorrections: TrainerPayCorrection[]`, `approvedAt: DateTime?`, `approvedByIdentityId: String?`. [packages/database-tenant/prisma/schema.prisma:354](../../packages/database-tenant/prisma/schema.prisma#L354)
- **PayRecord** — `id: String`, `sessionId: String`, `session: PTSession`, `periodId: String`, `period: TrainerPayPeriod`, `amount: Decimal`, `currency: String`, `sourceKey: String`, `confirmationRate: Decimal`, `confirmationLevel: TrainerLevel`, `createdAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:377](../../packages/database-tenant/prisma/schema.prisma#L377)
- **TrainerPayCorrection** — `id: String`, `sessionId: String`, `session: PTSession`, `originalPeriodId: String`, `originalPeriod: TrainerPayPeriod`, `originalEarningId: String`, `originalEarning: RevenueRecord`, `correctionPeriodId: String`, `correctionPeriod: TrainerPayPeriod`, `amount: Decimal`, `currency: String`, `reason: String`, `actorIdentityId: String`, `sourcePeriodState: PayPeriodState`, `sourcePeriodVersion: Int`, `sourcePeriodApprovedAt: DateTime?`, `sourcePeriodApprovedByIdentityId: String?`, `sourceKey: String`, `createdAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:393](../../packages/database-tenant/prisma/schema.prisma#L393)
- **Notification** — `id: String`, `recipientIdentityId: String`, `sourceEventKey: String`, `eventCode: String`, `title: String`, `message: String`, `linkKind: NotificationLinkKind`, `resourceId: String?`, `readAt: DateTime?`, `createdAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:424](../../packages/database-tenant/prisma/schema.prisma#L424)
- **GymConfiguration** — `id: String`, `masterGymId: String`, `currency: String?`, `timezone: String?`, `address: String`, `phone: String?`, `email: String?`, `payPeriod: PayPeriod`, `defaultSessionFee: Decimal`, `level2SessionFee: Decimal?`, `introSessionFee: Decimal?`, `level1BaseRate: Decimal`, `level2BaseRate: Decimal`, `offShiftPremium: Decimal`, `cancellationWindowMinutes: Int`, `lateCancelDeduction: Boolean`, `minimumSessionDurationMinutes: Int`, `version: Int`, `policyVersions: GymConfigurationVersion[]`, `createdAt: DateTime`, `updatedAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:455](../../packages/database-tenant/prisma/schema.prisma#L455)
- **GymConfigurationVersion** — `id: String`, `gymConfigurationId: String`, `gymConfiguration: GymConfiguration`, `configurationVersion: Int`, `currency: String?`, `timezone: String?`, `address: String`, `phone: String?`, `email: String?`, `payPeriod: PayPeriod`, `defaultSessionFee: Decimal`, `level2SessionFee: Decimal?`, `introSessionFee: Decimal?`, `level1BaseRate: Decimal`, `level2BaseRate: Decimal`, `offShiftPremium: Decimal`, `cancellationWindowMinutes: Int`, `lateCancelDeduction: Boolean`, `minimumSessionDurationMinutes: Int`, `createdAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:479](../../packages/database-tenant/prisma/schema.prisma#L479)
- **MembershipPlan** — `id: String`, `name: String`, `description: String?`, `price: Decimal`, `currency: String`, `durationDays: Int`, `status: MembershipPlanStatus`, `version: Int`, `createdAt: DateTime`, `updatedAt: DateTime`, `memberships: MembershipTerm[]`. [packages/database-tenant/prisma/schema.prisma:514](../../packages/database-tenant/prisma/schema.prisma#L514)
- **MembershipTerm** — `id: String`, `memberId: String`, `member: Member`, `planId: String`, `plan: MembershipPlan`, `startDate: DateTime`, `endDateExclusive: DateTime`, `agreedPrice: Decimal`, `currency: String`, `planNameSnapshot: String`, `configurationVersion: Int`, `actorIdentityId: String`, `idempotencyKey: String`, `createdAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:529](../../packages/database-tenant/prisma/schema.prisma#L529)
- **SchemaState** — `id: String`, `state: SchemaVerificationState`, `appliedTemplateVersion: String?`, `appliedManifestDigest: String?`, `verifiedMigrations: Json`, `appliedAt: DateTime?`, `verifiedAt: DateTime?`, `lastOperationId: String?`, `version: Int`, `updatedAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:549](../../packages/database-tenant/prisma/schema.prisma#L549)
- **CommandReceipt** — `id: String`, `actorIdentityId: String`, `commandKind: String`, `idempotencyKey: String`, `resourceType: String?`, `resourceId: String?`, `sourceMasterOperationId: String?`, `state: CommandReceiptState`, `createdAt: DateTime`, `updatedAt: DateTime`, `committedAt: DateTime?`, `audits: AuditLog[]`, `sessionEvents: SessionStateEvent[]`, `settlements: SessionSettlement[]`, `packCreditMovements: PackCreditMovement[]`, `expenses: ExpenseRecord[]`, `budgets: CategoryBudget[]`. [packages/database-tenant/prisma/schema.prisma:563](../../packages/database-tenant/prisma/schema.prisma#L563)
- **AuditLog** — `id: String`, `eventKey: String`, `receiptId: String`, `receipt: CommandReceipt`, `actorIdentityId: String`, `originalActorIdentityId: String?`, `eventCode: String`, `resourceType: String`, `resourceId: String`, `createdAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:588](../../packages/database-tenant/prisma/schema.prisma#L588)
- **ExpenseRecord** — `id: String`, `category: ExpenseCategory`, `amount: Decimal`, `currency: String`, `accountingDate: DateTime`, `description: String?`, `recurring: Boolean`, `version: Int`, `commandReceiptId: String`, `commandReceipt: CommandReceipt`, `createdByIdentityId: String`, `createdAt: DateTime`, `updatedAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:616](../../packages/database-tenant/prisma/schema.prisma#L616)
- **CategoryBudget** — `id: String`, `category: ExpenseCategory`, `month: DateTime`, `amount: Decimal`, `currency: String`, `version: Int`, `commandReceiptId: String`, `commandReceipt: CommandReceipt`, `actorIdentityId: String`, `createdAt: DateTime`, `updatedAt: DateTime`. [packages/database-tenant/prisma/schema.prisma:634](../../packages/database-tenant/prisma/schema.prisma#L634)

**Enums:**

- `MemberStatus`: `ACTIVE`, `INACTIVE`, `SUSPENDED`.
- `MemberRegistrationState`: `BASIC`, `PENDING`, `COMPLETE`, `FAILED`.
- `TrainerRegistrationState`: `PENDING`, `COMPLETE`, `FAILED`.
- `TrainerStatus`: `ACTIVE`, `DEACTIVATED`.
- `TrainerLevel`: `LEVEL_1`, `LEVEL_2`.
- `SessionPackStatus`: `ACTIVE`, `EXPIRED`, `DEPLETED`.
- `PTSessionState`: `PENDING_CONFIRMATION`, `SCHEDULED`, `ACTIVE`, `COMPLETED`, `MISSED`, `CANCELLED`, `DECLINED`.
- `SessionType`: `IN_PERSON`, `VIRTUAL`, `INTRODUCTORY`.
- `SessionCreditHoldState`: `HELD`, `CONSUMED`, `RELEASED`.
- `PackCreditMovementKind`: `ISSUE`, `HOLD`, `RELEASE`, `CONSUME`, `EXPIRE`.
- `SessionSettlementKind`: `COMPLETED`, `MISSED`, `LATE_CANCELLED`, `FREE_CANCELLED`, `WITHDRAWN`, `LIFECYCLE_RELEASE`.
- `OperationalEarningCategory`: `COMPLETED_SESSION`, `MISSED_LATE`, `LATE_CANCEL`, `EXPIRED_UNUSED`, `MEMBERSHIP_DAILY`.
- `PayPeriodState`: `OPEN`, `CLOSED`, `APPROVED`.
- `NotificationLinkKind`: `OWNER_SESSIONS`, `TRAINER_SCHEDULE`, `MEMBER_SESSIONS`, `TRAINER_REQUESTS`.
- `CommandReceiptState`: `RUNNING`, `COMMITTED`, `REJECTED`.
- `SchemaVerificationState`: `APPLYING`, `VERIFIED`, `FAILED`, `REPAIR_REQUIRED`.
- `PayPeriod`: `WEEKLY`, `MONTHLY`.
- `MembershipPlanStatus`: `ACTIVE`, `INACTIVE`.
- `ExpenseCategory`: `RENT`, `UTILITIES`, `EQUIPMENT`, `MARKETING`, `SALARIES`, `MAINTENANCE`, `OTHER`.


## Complete root CSS variable values

Source: `apps/web/src/app/globals.css` root block. Component-specific dimensions/breakpoints are documented in file04; inline tenant values are validated at runtime.

| Variable | Defined value |
|---|---|
| `--classic-primary` | `#007a35` |
| `--classic-primary-hover` | `#00622a` |
| `--classic-on-primary` | `#ffffff` |
| `--classic-focus` | `#45b472` |
| `--classic-primary-soft` | `#eaf5ee` |
| `--classic-primary-border` | `#bbebd0` |
| `--classic-page` | `#f4f5f7` |
| `--classic-surface` | `#ffffff` |
| `--classic-surface-muted` | `#f5f4f5` |
| `--classic-surface-hover` | `#f9fafb` |
| `--classic-text` | `#171b28` |
| `--classic-text-secondary` | `#4a4d58` |
| `--classic-text-muted` | `#8b8e98` |
| `--classic-border` | `#e1e1e4` |
| `--classic-navigation` | `#171b28` |
| `--classic-navigation-muted` | `#a4a7b0` |
| `--classic-navigation-hover` | `#202534` |
| `--classic-navigation-border` | `#232736` |
| `--classic-success` | `#146142` |
| `--classic-success-soft` | `#ddf5e7` |
| `--classic-warning` | `#8a3f00` |
| `--classic-warning-soft` | `#fff0e0` |
| `--classic-danger` | `#a31319` |
| `--classic-danger-soft` | `#fde4e4` |
| `--classic-info` | `#1d4ed8` |
| `--classic-info-soft` | `#eff6ff` |
| `--ink` | `var(--classic-text)` |
| `--muted` | `var(--classic-text-muted)` |
| `--line` | `var(--classic-border)` |
| `--paper` | `var(--classic-page)` |
| `--brand` | `var(--classic-primary)` |


## Unverified items and open questions

| Gap | Known from source | Required follow-up before relying on it |
|---|---|---|
| Current runtime health/tests | Source and existing tests present; no API/browser/database execution in this audit | Run isolated owned tests/current UI with synthetic fixtures; do not use production records |
| Visual coverage | Only saved V2 registry1440/320 visually inspected | Current screenshots for every role/screen/modal/error at approved widths; clarify saved capture drift |
| Assistive technology | Semantic/focus patterns and specific code concerns identified | Keyboard/zoom/reduced-motion/screen reader/contrast audit on actual rendered pages |
| Provisioning worker | Worker/service/scripts exist; not registered as automatic loop in HTTP AppModule | Confirm deployment scheduler/worker ownership and operational runbook |
| Existing owner consent | API present, no web page/action found | Define private owner journey and completion/retry handoff |
| Enrollment return | returnTo supplied but ignored at login | Reproduce signed-out/forced-password consent; implement safe validated return continuity |
| Membership renewal | API only, no connected form | Decide feature-completion scope and product copy; keep entitlements separate from cash |
| Payment/billing/payout | No supporting current models/actions, explicit billing placeholder | Separate product/integration scope and finance semantics approval |
| Attendance/progress/ratings | No supporting domain records/actions; proxy/copy only | Clarify whether future scope exists; do not invent metrics |
| Brand scope | Accent/logo store; logo unmounted and Classic overrides | Define expected per-role logo/color surfaces and contrast validation |
| Coaching history/current plan | Latest previews, append-only create/read, no date ranges/archive | Decide effective/current/archived plan model before calendar semantics change |
| Date/financial projections | Concrete calculations and contract mismatches identified | Reconcile dashboard vs finance; isolate tests for0.5% conversion, six-place rates, closed-period correction and gym-local month edge |
| Search publication predicate | OR overwritten when q used | Verify isolated unpublished actor search; repair at backend, not presentation |
| Performance | Read fan-out and sequential calendar loading visible in source | Measure large tenant latency, pool capacity, throttling and caching needs; no live performance assertions |
| Role/product research | Fixed role model and dynamic relationship reconstructed | Validate actual staff tasks, landing priority, localization/week-start/brand goals and success metrics with users |

## Verification performed for the documentation

The final audit checks exact requested filenames,39 route coverage with no extra/missing paths,46 feature sections,26 issues, endpoint extraction versus registered controllers,21/26 model counts, existence/line bounds of every evidence link, absence of unresolved template markers and unchanged fingerprints for source files recorded before documentation authoring. Application build/tests were not run because this task changes documentation only and database/browser suites would exercise mutable runtime dependencies. Their presence is recorded, never reported as a passing run by this audit. Actual check results are appended after generation.


## Final documentation verification results

- **Passed:** all 12 requested Markdown filenames present; all 39 page routes matched exactly once with no missing/extra routes; 46 feature groups and 26 issue records present.
- **Passed:** 94 unique method/path controller endpoints across 22 controller files extracted; all exported controller classes occur in AppModule registration. Two Next HTTP handlers are separately accounted for.
- **Passed:** all 21 master and 26 tenant models included in the model dictionary; both enum sets and root CSS variables captured.
- **Passed:** source link targets and line bounds validated; no unresolved reference markers remain. Source locations reflect the inspected working-tree content.
- **Passed:** 407 recorded application/package/infrastructure source fingerprints unchanged during documentation authoring; final working-tree additions from this audit are only `docs/ui-ux-discovery/`. Existing edits were not reverted or altered by the audit.
- **Confirmed with a read-only synthetic calculation:** extracted percent conversion maps `0.5` percent to ratio `0.05` instead of `0.005`; normal inputs `40` and `5` yield `0.4` and `0.05`. This did not execute an application action, change settings or access a database.
- **Not run:** application build, API integration/browser suites, production checks, fresh full-screen capture or screen-reader audit. Findings requiring those checks remain explicitly qualified.

Source revision observed at final reconciliation: `543c231` (working-tree source fingerprints are the stronger scope boundary for this audit because other workspace activity may commit pre-existing changes). No application fix or UI redesign was implemented.
