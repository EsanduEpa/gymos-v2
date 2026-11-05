# Gym Owner workspace transformation

## Existing implementation and scope

Owner routes live under `/gyms/[slug]/owner`. Pages authorize through `requireGymContext(slug, 'OWNER')`, read server-held credentials and validated existing API contracts, and render `DashboardChrome`. OwnerDashboardLive refreshes the operational snapshot every 30 seconds. The existing member/trainer enrollment, consent, credential delivery, lifecycle, session booking, policy quotes, finance and versioned configuration actions remain authoritative.

This increment migrates the Owner shell and every existing Owner destination to the shared Atlas Light/Midnight Blue appearance. Trainer and Member workspaces retain their current appearance. Super Admin continues to use the same shared foundation.

Existing UX problems: ungrouped navigation with mixed symbols, no Owner theme controls, overlapping dashboard refresh toolbar, white-only metric/trainer surfaces, hardcoded calendar colors, dense uppercase form labels, small mobile controls, inaccessible horizontal table scrolling, and dashboard wording implying physical attendance. The dashboard API explicitly describes its activity metrics as session records and scheduled trainers, so labels must communicate those definitions.

## Design and old-to-new mapping

| Existing function | New location / treatment | Preserved behavior |
| --- | --- | --- |
| Owner session and gym access gate | Existing server pages | Current authorization and selected-gym isolation |
| Dashboard, Members, Trainers, Sessions | Workspace navigation group | Same routes, nested active navigation, named Lucide icons |
| Financials and Analytics | Business navigation group | Same reports, filters, operations and export routes |
| Configuration, Audit, Subscription | Management navigation group | All existing destinations retained; billing remains explicitly unavailable |
| Gym switching and sign out | Sidebar and footer | Existing context-clearing full navigation and revocation |
| Existing gym brand | Initials mark with saved brand accent, gym name and header | Tenant identity retained; global action/status colors use accessible shared tokens |
| Active records scheduled today | First dashboard metric: Active PT sessions today | Exact existing `membersInGym` value and readable definition |
| Active records across dates | Second dashboard metric: Active PT sessions | Existing `activeSessions` metric |
| Today's recognized operational value | Operational earnings metric and chart | Exact decimal value retained; explicitly not cash received |
| Trainers scheduled today | Fourth dashboard metric | Existing `trainersOnFloor`; no physical-presence claim |
| Pending confirmations | Daily workspace panel | Existing authorized pendingRequests count; link to session oversight |
| Common daily destinations | Register member, add trainer, book PT session shortcuts | Existing pages and backend workflows |
| Live refresh and snapshot | Separate nonoverlapping toolbar | 30-second refresh, gym-local snapshot, latest-request protection; explicit pending/retry and retained last values on failure |
| Earnings buckets | Eight two-hour columns | Exact source values; zero has zero-height colored bar; 06:00–22:00 range distinguished from full-day metric |
| Today's PT sessions | Named, keyboard-scrollable table | Same time/member/trainer/state/fee data, semantic status badges |
| Trainer schedule and activity | Today's trainer roster | Same counts/activity; names link to existing trainer profile; no “off duty” inference |
| Members and trainers | Shared themed directories and profiles | Existing search/status/level filters, pagination, enrollment, lifecycle, private details, membership/pack controls and one-time handoff |
| Calendar, session list, month overview | Themed calendar cells, ledger and overview | Existing date/month navigation, paging, booking/quote/cancellation/no-show actions and policy acknowledgment |
| Financials and analytics | Themed cards, tabs, tables and forms | Existing earnings/deferred/P&L, expenses/budgets, payroll close/approve, export and analytics windows |
| Configuration and audit | Consistent forms/tabs and readable records | Public profile, brand configuration, plans/rates/policy/version rules and audit filters/export |

## Shared components and integration

Reuse the existing Geist font, Lucide family, ThemeToggle, appearance initialization and display-only localStorage preference. Rename shared CSS scope from `.platform-dashboard` to `.themed-workspace` while retaining `.platform-dashboard` as the platform identity hook; add that shared scope to authorized Owner shells. This prevents competing theme implementations. `owner.css` handles Owner-specific composition and responsive layouts. Existing server actions/contracts/services/database schemas remain unchanged.

Keep original tenant brand variables intact. Use semantic action colors for shared controls; the gym brand is visible in its identity mark. Owner-only surface overrides cover remaining legacy inline/component patterns. Session CSS modules use existing theme aliases so both appearances work without duplicated components. Scrollable owner tables are keyboard focusable and named.

## Desktop and mobile

Desktop: 248px collapsible sidebar, grouped navigation, 76px header, four metrics, earnings/quick-actions split, session table and trainer cards. Sidebar scrolls when its content exceeds the available height. At 1024px use two-column metrics and stacked main panels. Below 768px use the existing modal drawer with explicit close focus, Escape, focus return and scroll lock. At 390/320px retain compact two-column metrics, stack forms/cards/quick actions, use 44px controls and 16px input text, and confine table overflow to keyboard-scrollable regions. Header identity compresses without squeezing the theme/notification controls.

Both appearances share dimensions, structure, action order and spacing. Status colors remain distinct. Native required validation, pending states, error/success feedback, empty states, and one-time secret handling are retained. Respect reduced motion and visible keyboard focus.

## Acceptance and verification

- All sixteen existing route variants (including profiles and finance/session views) render in both appearances at desktop and 320px without root overflow.
- Dashboard geometry matches across appearances at 1440/1024/768/390/320px; preference survives reload/navigation.
- Exact dashboard metric counts match the real API; operational earning and attendance meaning remain explicit.
- Manual refresh failures retain the previous snapshot, expose retry, and recover without a reload.
- Collapsed navigation survives reload and stays usable; mobile drawer focus/Escape works.
- Member search and empty/matching results work; every configuration tab stays usable on a narrow viewport.
- Existing configuration draft recovery, member/trainer credential workflows, booking/policy workflows, role/tenant checks and platform appearance are checked through real-API browser scenarios.
- Production build, type checks, lint and whitespace validation pass.

Validation results and preview status are recorded below after execution. Generated screenshots are kept under `apps/web/test-results/ui-transformation/gym-owner/` and are not source assets.

## Scope limits

No new attendance, payment collection, billing, payout or unsupported reporting capability is introduced. Gym subscription remains an honest unavailable screen. Session activity does not prove physical presence. This increment is a UI transformation, not a backend migration or an accessibility certification.

## Validation results — 2026-11-05

| Check | Result |
| --- | --- |
| Production web build, type checking and prerendering | Passed |
| Standalone web TypeScript check | Passed |
| Web lint and `git diff --check` | Passed |
| Focused real-API browser suite on final build | **7 passed (1.2m)** |
| Normal Owner sign-in against the persistent local preview | Passed; both appearances, no browser page errors |

Final browser command:

`GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test tests/two-gym.e2e.spec.ts tests/owner-session-booking.e2e.spec.ts --grep 'owner appearance|owner gym configuration|owner can acknowledge|trainer registration enforces|platform appearance|owner can choose'`

Verified: exact live API metric mapping; both appearances at five dashboard widths with equal geometry; all sixteen route variants in both themes at desktop/320px; every configuration tab; member search/empty/matching results; persisted theme/collapse; mobile drawer focus wrap/Escape/return; reduced motion; preserved snapshot after a deliberately aborted refresh and successful retry; version-zero member credential acknowledgment without replacement; trainer enrollment, denied-role/other-gym requests, one-time handoff and required password change; booking/quote/credit allocation/notification; configuration draft retention on failure and zero-price plan creation; real expense creation in only the selected tenant; normal gym switching with theme retained; member denied the Owner workspace; and Super Admin appearance/support-modal regression checks.

The injected failed transport is explicitly asserted separately from unexpected browser errors. Existing stale heading/field selectors in booking and trainer enrollment tests were updated to match their current screens; business assertions were retained. Production code changes remain in the web application; no services, auth rules, database schemas or financial commands changed. Each disposable test environment removed its own six databases, container and manifest. Existing persistent manual-test data was retained.

Visual inspection covered desktop light, mobile dark, dark calendar, mobile member profile and dark financials. This caught and corrected unequal mobile metric heights, legacy checkbox sizing and crowded finance filters. Generated captures include dashboard variants, every tested Owner route and normal-sign-in preview captures. This is focused regression coverage rather than the complete application suite or a screen-reader/WCAG certification.

The verified production preview is running at `http://localhost:3002/login` against the existing manual-test API. `owner@gymos.test` uses its existing password. The manual launcher also resumed the development preview at port 3000 because that port was free. No database setup/reset was run.
