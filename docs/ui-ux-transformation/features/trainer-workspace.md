# Trainer workspace transformation

## Existing implementation and scope

The Trainer root redirects to `/gyms/[slug]/trainer/schedule`. Seven existing page types provide the schedule, incoming requests, confirmed client directory, client profile, workout builder, meal builder and own earnings. Server pages use `requireGymContext(slug, 'TRAINER')`, private server-held credentials and validated contracts. Existing server actions enforce selected-gym access, published identities, current client relationships, session versions, policy quotes and stable operation keys.

This increment migrates the complete Trainer workspace to Atlas Light and Midnight Blue. It reuses the delivered appearance initialization, ThemeToggle, Geist font, Lucide icons, semantic tokens, role shell, primitives, notifications and session observer. There is one layout/component tree for both appearances. Member screens retain their existing appearance.

## Problems and target design

The previous Trainer shell used Classic colors and mixed icon styles. Pending cards, roster tables and the plan builders had independent hardcoded surfaces. Session actions were crowded on smaller screens. Completion used a browser prompt. Client profile links presented incomplete tab semantics while displaying every section. Workout forms contained example exercises and uncontrolled title/description fields. Request read failures could be omitted from the schedule entirely.

The target is a focused coaching workspace: My Schedule, Requests, Clients and Earnings; a readable daily landing page; explicit loaded-page versus date/filter counts; an active/next-session highlight; clear request decisions and session commands; mobile forms; honest empty/unavailable states; accessible profile section links; and explicit assignment of plans to confirmed clients.

Atlas uses white cards/navigation, a soft gray page and blue actions. Midnight uses navy layers, readable light text and cyan actions. Status colors, component dimensions, navigation structure and behavior stay consistent. Tenant identity remains visible through the gym name, initials and saved brand accent. No new client progress metrics, payouts, library management or unsupported features are implied.

## Existing-to-new mapping and preservation checklist

| Existing behavior | New location / treatment | Preservation requirement |
| --- | --- | --- |
| Trainer root and role gate | Existing schedule landing and server checks | Same authenticated role and selected-gym scope; normal sign-in and gym selection now land on the daily schedule |
| Schedule/Requests/Clients/Earnings routes | Shared collapsible gym shell | All destinations, notifications, gym switch and sign out retained |
| Date/filter counts | Three overview cards | Matching sessions uses `filterTotal`; in-progress count explicitly covers this loaded page; pending requests comes from its own verified response |
| Active or upcoming session in loaded data | Focus panel linking to the actual session card | Do not infer a global next session from paged data; label “Next in this view” |
| Daily/monthly date navigation and filters | Responsive schedule controls | Same query parameters, server filtering, pagination, 30-second/focus refresh and gym-local times |
| Pending accept/decline | Themed request cards on schedule and Requests | Same expected version, stable key, optional decline reason, credit hold only after acceptance |
| Start and complete | Prominent session actions | Same server-time windows, minimum duration, credit consumption, settlement and stored earning |
| Completion prompt | Shared ConfirmDialog | Explain the held-credit and earning consequences; Cancel/Escape returns focus; no command before confirmation |
| Member-visible notes | Expanded editor on completed session | Original limit and action retained; draft/action feedback survives session-version refresh |
| Policy cancel/no-show | Existing quote modal | Policy eligibility, acknowledgment, quote/version and idempotency unchanged |
| Client search/list/profile | Themed roster and named scroll region | Confirmed relationship-only exposure, original summary fields, search/pagination, private profile guards |
| Profile overview/plans/history | Real section anchors | All existing content remains visible; remove incomplete tab semantics |
| Workout creation | Client-scoped grouped exercise form | Same 1–100 rows, fields, validation, precise weight including zero, explicit assignment and safe retry |
| Initial workout content | One empty exercise row | Trainer explicitly enters the exercises; no prefilled examples can be mistaken for an assigned prescription |
| Workout title/description | Controlled fields | Preserve drafts across returned validation errors |
| Meal creation | Client-scoped form and live totals | Same day/type/food/nutrition rows, zero values, add/remove, assignment and server actions |
| Builder pending state | Disabled exercise/meal fieldsets and row additions | Submitted row structure is stable while saving; existing action keys retained |
| Earnings summary and records | Themed cards, month filter, itemized records and pay-period status | Existing endpoint, dates, pagination and totals; operational earnings clearly distinguished from payouts |
| Decimal earning display | Exact string/BigInt formatting | Preserve source precision without floating-point conversion; average calculated to four decimal places |
| Failed request read | Explicit schedule error and retry destination | Never treat an unavailable request list as an empty/zero list |

## Shared component integration

Extract the Owner/Trainer gym shell composition into `workspace.css` and use common gym identity/navigation classes. Owner and Trainer share that shell; platform styling remains under `.themed-workspace`. Owner composition remains in `owner.css`; Trainer composition is isolated in `trainer.css`. Existing builder `--ui-*` variables alias the same semantic tokens inside Trainer. No second theme provider, backend service, database schema or role contract is added.

Server-rendered TrainerScheduleOverview consumes the already-authorized schedule/request results. It makes no extra API calls or client-side mock data. Session cards expose stable anchor targets. Existing privacy and business guards remain on the server.

## Responsive and accessibility acceptance

Desktop: grouped sidebar, clear header, three summary cards, focused session highlight, request panel and spacious session cards. At tablet widths reduce filter columns and stack request actions. Below 768px use the existing focus-managed drawer. At 390/320px use two compact metric columns plus a full-width pending count, stacked session/request actions, 44px controls and 16px input text. Plan rows and nutrition totals reorganize rather than shrinking desktop content. Roster scrolling stays inside a named, keyboard-focusable region.

Validate matching geometry across themes at 1440/1024/768/390/320px; all seven destinations plus monthly schedule at desktop/320px; persisted appearance/collapse; contrast and visible focus; modal focus/Escape/cancellation; reduced motion; no root overflow; keyboard-accessible plan rows and profile anchors; and honest loading/error/empty states.

## QA plan

Use owned disposable two-gym fixtures and the real API. Authentication traces/screenshots are disabled; intentional screenshots contain only synthetic nonsecret UI. Test nonempty active/scheduled/pending sessions, verified pack balances, read-only counts, confirmed clients and both blank/populated builders.

Functional checks: client search and absence; workout validation/draft retention and zero-weight assignment; meal totals and assignment; relationship and other-gym denial; member read-only access to assigned plans; request accept/credit hold and decline; completion cancellation then settlement/credit consumption; member-visible notes; session start using server time; own operational earnings; Owner and Super Admin regression checks. Complete production build, type/lint/whitespace checks and visually inspect screenshots before resuming the persistent preview.

## Limits

No fabricated productivity metrics, physical attendance, native mobile app, payout processing, client progress tracking or standalone global plan library. The upcoming-session highlight covers loaded results only. Existing profile limits (latest two plans, latest ten related sessions) remain explicit. This is focused regression coverage, not WCAG certification or the complete application regression suite.

## Trainer calendar extension

The Trainer workspace now has a separate Calendar destination and a shortcut from My Schedule. It loads the trainer's own session records for the selected gym-local month, across all API pages, and groups them by day. Confirmed and active sessions count as sessions to attend; pending confirmations count as requests to review. Completed, cancelled, declined and missed sessions remain visible with distinct statuses. Selecting a date shows member, gym-local time, type and notes, with links to the day schedule or request review. The calendar uses the shared Atlas Light/Midnight Blue styling, keyboard day navigation and accessible mobile layout. If any API page fails, it explicitly marks the view as incomplete and links to My Schedule. No new activity records or backend permissions are introduced.

The extension passed the production build, TypeScript, lint, whitespace check and all four focused Trainer browser scenarios. Calendar checks included both themes at desktop/320px, member role denial, day selection and schedule navigation, and a month with more than 100 sessions to verify complete pagination. Screenshots were reviewed at desktop and 320px.

## Required functional repair found during QA

A client with a session pack caused `CoachingService.listClients` to fail response validation: the full pack summary included `consumed` and `expired`, while the existing strict roster contract accepts only `available` and `held`. Map the existing summary explicitly to those two permitted fields. The full profile balance, ledger calculations, authorization and database schema remain unchanged. The real-API browser test now searches a confirmed client with five issued credits/two holds and asserts exactly `{ available: 3, held: 2 }` before exercising the roster and plan workflows. The existing coaching integration suite also verifies relationship privacy, role/gym fences, reads and assignment rules.

## Validation results — 2026-11-05

| Check | Result |
| --- | --- |
| Production web build, TypeScript and prerendering | Passed |
| API build | Passed |
| Standalone web TypeScript check | Passed |
| Web lint / whitespace validation | Passed |
| API lint | Passed; existing unused `monthStart` warning in unchanged analytics service |
| Trainer + Owner + Super Admin browser suite | **6 passed (1.4m)** |
| Final Trainer landing/credential routing recheck | **4 passed (49.8s)** |
| Existing coaching integration suite | **4 passed (7.62s)** |
| Persistent manual preview, normal Trainer sign-in | Passed; daily schedule landing, both themes, client roster, no browser page errors |

The browser runs cover seven distinct scenarios (three Trainer workflows, two Owner appearance workflows, Super Admin appearance and Trainer enrollment/credential sign-in); the final four recheck the changed Trainer landing behavior. These are focused checks, not the complete repository suite.

Commands:

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test tests/trainer-workspace.e2e.spec.ts tests/two-gym.e2e.spec.ts --grep 'trainer appearance|trainer coaching|trainer accepts|owner appearance|platform appearance'`
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test tests/trainer-workspace.e2e.spec.ts tests/two-gym.e2e.spec.ts --grep 'trainer appearance|trainer coaching|trainer accepts|trainer registration enforces'`
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.coaching.ts --disableConsoleIntercept`

Verified nonempty schedules, exact active/pending counts, matching theme geometry at five widths, metric contrast, all Trainer destinations in both themes at 1440/320px without root overflow or failed-data alerts, monthly paging layout, persisted appearance/collapse, mobile drawer focus wrap/Escape, reduced motion, client search, exact roster pack summary, relationship/gym/role denial, native validation and server-error draft preservation, exact zero-weight workout assignment, meal totals and assignment, member read-only plan visibility, accepting/declining requests, confirmation cancellation without state change, completion with one settlement/consumed hold, retained notes feedback, member-visible notes, start using server time, operational earnings and real credential sign-in landing on Schedule.

Visual review opened desktop Light and mobile Midnight populated schedules and the Midnight workout builder. It corrected legacy time-badge width, mobile pending-panel padding and the hidden refresh explanation. Trainer time badges now use the compact 24-hour gym-local format. Completion dialog behavior was checked by keyboard in the real workflow.

Screenshots are generated/ignored under `apps/web/test-results/ui-transformation/trainer/`; normal preview captures use the `manual-preview-*` prefix. Each owned test environment removed its own six databases, container and manifest. No persistent manual-test database reset or seed was performed.

The verified build is running at `http://localhost:3002/login`. Sign in with the existing `trainer@gymos.test` account/password and choose a gym. The manual-test API was restarted to load the roster response repair; a separate production web process serves port 3002 while the manual launcher also maintains its development preview on port 3000.
