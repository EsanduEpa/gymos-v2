# Member workspace transformation

## Existing implementation

The Member root previously redirected to the trainer directory. Existing pages cover trainer discovery, a trainer-specific session request form, own PT sessions, a session/meal calendar, assigned workout plans and assigned meal plans. The server verifies the selected gym and MEMBER role with `requireGymContext`, reads the existing `/me/*` API contracts with server-held credentials and uses the shared session observer. Session requests, withdrawal and policy cancellation already have server actions and durable version/key protections.

This increment introduces a Member home at the existing Member root and migrates all seven Member destinations onto Atlas Light and Midnight Blue. Super Admin, Owner and Trainer keep the delivered shared foundation. No backend service or schema is added. Standalone membership/profile, workout completion, goals, streaks and progress tracking remain separate capability work.

## Target design

A personal training workspace: welcoming home, latest assigned workout, confirmed upcoming PT sessions, monthly completed PT count, exact credit balances, weekly nutrition guidance and clear next actions. Desktop uses the shared collapsible sidebar and header. Mobile has Home, Workouts, Sessions and More shortcuts; More opens the same full navigation drawer. Light/Dark, notifications, gym identity/switching and sign out remain available.

Both appearances use the same structure and geometry. Atlas has white surfaces on soft gray with blue actions. Midnight has navy layers, light readable text and cyan actions. Semantic success/warning/error colors remain distinct. Meal-plan calendar markers add a scoped semantic nutrition pair. Geist, Lucide, existing shared primitives and the existing display-only preference mechanism are reused.

## Preservation map

| Existing feature | New treatment | Preserved behavior |
| --- | --- | --- |
| Member landing / gym selection | Existing `/member` now renders Home | Login and gym entry still use the existing role path; no auth-rule change |
| Role navigation | Home, Workouts, Meal Plans, PT Sessions, Calendar, Find a Trainer | Original destinations and all available actions retained |
| Appearance / notifications / sign out | Shared themed gym header and sidebar | Same preference, notification actions, expiry and revocation behavior |
| Latest assigned workout | Prominent home card, preview of three exercises, deep link to actual plan | Existing authorized plan order/data; explicitly not a dated or completed workout |
| Assigned workout total | Home metric | Existing paged API total, unavailable marker on failure |
| Monthly PT completion | Home metric | Verified COMPLETED session count for the current gym-local month; not workout completion |
| Upcoming PT schedule | Home preview of three confirmed sessions | Existing state/date-filtered personal session endpoint; 30 calendar dates including today, current snapshot excludes past start times |
| Bounded upcoming reads | First 100 scheduled records in the date window | Explicit notice if more results exist; full PT Sessions remains available |
| Credit balance | Home metric and detailed panel | Existing unheld/held/consumed/expired projection; future-dated packs are not represented as automatically bookable today |
| Meal preview | Latest assigned plan and link | No inferred daily target, compliance or nutrition goal |
| Workout reading | Clear exercise cards with sets/reps/weight/duration/instructions | Exact zero weight, optional fields, text, paging and read-only scope |
| Meal reading | Day disclosures and recorded plan totals | Food entries, calendar weekday, units, exact zero and missing-nutrient distinction; no editing/assignment action |
| Trainer directory | Themed cards, search and paging | Authorized active directory fields, original privacy and Request session links |
| Request form | Grouped mobile-friendly fields and controlled draft | Existing date/time/offset/type/duration/note inputs, validation, key/retry and selected-date eligibility rules |
| Pending requests | Existing session cards and withdrawal quote | No credit held until acceptance; withdrawal keeps quote/version semantics |
| Confirmed cancellation | Existing policy dialog | Current quote, explicit late-cancellation acknowledgment, version, credit and settlement rules unchanged |
| Session history | Themed date/month filters, counts, statuses and notes | Own sessions only; existing paging, refresh and member-safe projection |
| Calendar | Theme-aware month grid and day details | PT statuses, gym-local dates, recurring weekly meal entries and existing preview caps |
| Calendar keyboard use | One tab stop with arrow/Home/End movement | Buttons remain labeled, selectable by pointer/keyboard and reflected in the day panel |
| Partial calendar | Notice before grid and honest empty-date language | No partial date claims a complete absence; links lead to full paged pages |
| Selected calendar day | New “View this day’s sessions” link | Existing day-filtered PT Sessions route |

## Integration and state behavior

Member Home is a server component under Suspense. Initial session discovery, latest workout and latest meal reads run independently in parallel. The verified session snapshot supplies gym-local date/time and credit data. Bounded confirmed-session and monthly-completion reads follow using the same endpoint. Partial errors leave unrelated sections usable and show unavailable markers instead of invented zeros. Home has an explicit snapshot timestamp and refresh link; it does not claim to be a live attendance view.

The shared shell gains the MEMBER branch and removes the obsolete Classic navigation branch. Mobile More and the header menu use the same dialog, scroll lock and focus trap, with focus returned to the actual opening control. Hidden desktop/mobile navigation is excluded by normal display rules. Owner/Trainer navigation remains unchanged.

Calendar date buttons use roving focus. Existing module colors now consume theme aliases; no separate dark component is maintained. An explicit calendar month reuses its first verified read rather than doing a redundant discovery request. Request drafts persist after recoverable errors. The request fields become editable once their handlers are ready, so an early date entry cannot be reset during page startup. Workout/meal read errors now offer a retry link; guarded 403/404 reads remain protected.

## Responsive / accessibility acceptance

- Dashboard geometry matches across modes at 1440/1024/768/390/320px.
- Every existing Member page renders in both modes at desktop/320px without root overflow.
- Compact two-column mobile metrics, stacked main panels, readable exercise/nutrition details and touch-friendly actions.
- Bottom shortcuts clear the page content and device safe area; drawer traps focus and returns it to More or the header menu.
- Named links/controls, visible focus, semantic status text, reduced motion and readable color pairs.
- Native required/range validation and server validation remain authoritative.
- New members receive useful empty states; failed reads are distinguishable from empty records.

## QA plan

Use real API services and owned two-gym disposable databases. Seed actual assigned plans, zero-weight exercises, recorded/missing nutrition, nonempty sessions, pending requests, valid memberships and held credits. Check home values against those fixtures, plan pagination/details, calendar day selection, directory search, request failure recovery, request/withdrawal without credit reservation, late cancellation acknowledgment/credit consumption, read-only Member actions and other-gym denial.

A local forwarding proxy injects a 503 only for the own-workout read in the outage scenario; all other traffic still uses the real API and database. It returns no mock business data. Recovery must restore the real assigned plan, while the home continues showing independent meal/credit information. Authentication traces are disabled; deliberate screenshots use synthetic nonsecret data.

Run the production build, TypeScript, lint, whitespace and focused Member browser suite. Recheck Trainer coaching and existing Owner/Super Admin appearance workflows because navigation and shared session components are reused. Open generated screenshots and correct visual issues before refreshing the persistent preview.

## Delivered validation

The final production build (including TypeScript), ESLint and whitespace check passed. Ten focused Chromium checks passed against disposable two-gym databases: four Member flows, three Trainer flows, two Owner flows and the Super Admin appearance flow. They covered both themes, responsive widths, keyboard navigation, exact assigned-plan and credit data, request retry and withdrawal, cancellation policy, protected reads, and recovery from an isolated workout-read failure. Owned test databases and containers were removed after the run. Normal Member sign-in on the refreshed local production preview reached Home, both themes and mobile More worked, and the browser reported no page errors. The persistent manual data was retained.

## Scope limits

Home is a dated snapshot. Upcoming preview is limited to the current 30-date window and first 100 matching records. Calendar keeps its existing 100-session/100-meal-plan caps with notices. Credit dates and membership eligibility are rechecked by the existing request/accept commands. No payments, fake fitness metrics, workout completion, automated recommendations, native app or unauthorized profile edits are introduced.
