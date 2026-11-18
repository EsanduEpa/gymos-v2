# GymOS V2: Prioritized QA Remediation Plan

Prepared: 2026-11-14  
Rechecked against the original PDF: 2026-11-15  
Source: [GymOS V2 / FitCore QA audit](../gymos_v2_qa_audit_report.pdf), audited 2026-11-11 to 2026-11-12  
Status: Sections 1–6 completed locally. Hosted verification and release approval are pending.

## Approved decisions and implementation sections

The user approved the following decisions on 2026-11-14. These supersede pending decision language elsewhere in this original audit plan for these specific subjects.

- Keep this release entitlement-only, with staff-assisted recovery and four current roles. Defer payment collection and receipts, email delivery, biometrics, AI, gamification, and Manager and Front Desk roles.
- Describe PT records as session history. Physical gym attendance stays outside the release scope.
- Trainer remuneration is independent of member pack value: use an explicit rate, a default by trainer level, and an optional trainer-specific override. Snapshot the applicable rate when a booking is confirmed. Completed promotional/free-pack sessions still earn the agreed trainer rate.
- Cancellation/no-show remuneration must follow an explicit policy visible before confirmation. Specific policy amounts remain to be established from existing rules and product review; approval of this principle does not invent those amounts.
- Preserve approved payroll and historical settlements; use audited adjustments for corrections. Do not retroactively recalculate historical obligations without reviewing their original terms.
- Membership price/duration edits affect future memberships only. Existing terms remain unchanged. Archive retired plans; deletion is allowed only for unused, unreferenced plans.
- Reproduce audit findings against current code. Obtain additional audit evidence when necessary without delaying reproducible fixes.

Each section includes investigation, implementation, focused regression checks, and manual acceptance on port 3002.

| Section | Focus | Issues | Completion gate |
| --- | --- | --- | --- |
| 1 | Account creation and recovery | BUG-001, BUG-003 | Member/trainer credential handoff and owner recovery work end to end with role and tenant protections intact |
| 2 | Memberships and operational records | BUG-004, BUG-005, BUG-008, BUG-011 | Plan edits/archive preserve history; member history, calendar totals, and registry owner names are correct |
| 3 | Trainer pay and financial consistency | BUG-007, BUG-009 | Approved rate rules, booking snapshots, readable validation, and payroll reconciliation pass zero/non-zero pack cases |
| 4 | Security, performance, and monitoring | BUG-006A, BUG-006B, BUG-006C | Effective header policies, measured latency improvements, and documented health/CORS behavior are verified |
| 5 | Interface and application usability | BUG-002, BUG-010, BUG-012, BUG-013 | Trainer actions, application retries, contrast, dates, grammar, and themes pass representative desktop/mobile checks |
| 6 | Final regression and release evidence | All issues, scope reconciliation, verification gaps | Cross-role journeys pass; current scope, unresolved gaps, and deployment-dependent evidence are documented |

### Section 1 tasks: Account creation and recovery

- [x] Reproduce member/trainer submission and owner recovery with synthetic accounts.
- [x] Repair credential handoff, pending/error states, and safe repeated-submission behavior.
- [x] Repair recovery result rendering while preserving expiry, single use, and gym-scoped authorization.
- [x] Verify first login, recovery, invalid submissions, and cross-gym denial.

On 2026-11-14, rapid double submits reproduced a lost one-time password for both registration forms. The first request could issue the password while the second returned a replay response with no password. A single submit succeeded. Owner recovery failed validation because the server action omitted the current password submitted by the form.

The rebuilt app on port 3002 passed the rapid double-submit, first sign-in, first password change, and replacement trainer password checks. Owner recovery rejected an incorrect current password, issued a link for an eligible member, and let that member reset their password and sign in. Using the consumed link with a different password was rejected. Cross-gym access to owner recovery was denied and the platform-admin flow still issued a link. The identity integration suite and focused browser regressions passed. Recheck the two fixes on the deployed revision during release verification.

### Section 2 tasks: Memberships and operational records

- [x] Correct member session-history data and distinguish failed loading from genuinely empty history.
- [x] Implement approved plan editing/archiving rules with historical-term preservation and API enforcement.
- [x] Resolve owner-name lookup/display in the platform registry.
- [x] Align daily/monthly calendar counts with documented session status rules.
- [x] Verify history, plan lifecycle, counts, and tenant isolation together.

The member profile now shows recent scheduled, active, completed, missed, and cancelled PT sessions in the gym's timezone. Owners can browse more through the session ledger. The member calendar excludes declined requests from its daily and monthly counts. Members can still see declined requests and trainer messages in My PT Sessions.

Owners can edit active membership plans and archive retired plans. Future terms use the edited price and duration. The original terms keep their agreed values and dates. Deletion requires an archived plan with no membership or application references. Plans with an application still being processed must wait until the application is resolved before editing or archiving. The registry uses the gym account or identity display name, with owner email as a fallback when no name is recorded.

The rebuilt app passed browser checks on port 3002 for populated member history, plan editing and retirement at a 390 px viewport, registry owner display, and the member calendar. Three focused browser regressions and 17 API integration checks passed, including rejection of stale and cross-gym plan updates, renewal at the new price and duration, deletion protection, calendar filtering, and application approval. Recheck on the deployed revision during release verification.

### Section 3 tasks: Trainer pay and financial consistency

- [x] Compare existing remuneration rules and stored data with the approved rate model.
- [x] Add level defaults, trainer overrides, and confirmation-time pay amounts.
- [x] Preserve earlier bookings, approved payroll, and historical terms.
- [x] Surface the existing zero-pay rule for cancellations and no-shows before confirmation.
- [x] Reconcile completed free and paid pack sessions, corrections, earnings, payroll, and exports.
- [x] Replace raw pay-rate schema errors with accessible field-level messages.

The previous formula applied a percentage to the member's allocated pack-credit value. The gym now sets a fixed pay amount for each trainer level and can override it on an individual trainer's profile. The off-shift percentage applies to that amount before it is saved when an owner books, a trainer accepts, or an owner confirms a replacement booking. For example, an agreed LKR 34.50 pays the trainer LKR 34.50 on completion for either a free or a paid credit. Operational revenue still follows the member's agreed pack value. Cancelled sessions and no-shows earn zero trainer pay under the existing policy.

The migration initializes future defaults using the gym's nominal session fees and former level percentages. Bookings already confirmed at migration time retain their original pay calculation. Approved payroll stays intact and corrections use the saved booking terms. Review the seeded defaults and individual overrides before confirming live bookings. Apply the migration using the controlled tenant schema rollout before switching the deployed API to this revision.

The synthetic test instance on port 3002 passed field validation, persistence of level rates and the off-shift premium, setting and clearing a trainer override, and booking screen checks. Completion, trainer requests, session corrections, and finance passed 22 integration cases. The focused free-pack correction check also confirmed the same pay in trainer earnings and the payroll CSV. Workspace type checks and the API/web builds passed.

### Section 4 tasks: Security, performance, and monitoring

- [x] Inspect web/API response headers and implement appropriate policies without breaking application behavior.
- [x] Establish a reproducible performance baseline, trace bottlenecks, and compare before/after results.
- [x] Confirm actual health endpoints and protected-resource CORS behavior locally.
- [x] Record which checks require the deployed environment.

The web and API now serve CSP, frame blocking, content type protection, referrer policy, and permissions policy headers. The web policy allows the inline scripts and styles used by the current rendering mode, restricts external scripts to the web origin, and blocks dynamic code evaluation in production. Chrome confirmed framing was blocked and the tested signed-in flows emitted no CSP violations. The local private responses and preflight did not expose any cross-origin permission. A request from a foreign origin could not submit a web mutation.

The web `/api/health` and API `/healthz` report process liveness. API `/readyz` checks master database connectivity and returns a generic 503 on failure. The Render Blueprint and wake command now use `/readyz`. The probes return no environment or account details. Deployed endpoint and hosting checks are in [the deployment runbook](DEPLOY-VERCEL-RENDER-NEON.md#health-and-browser-security-checks).

The owner dashboard previously used a minute-by-minute search for timezone boundaries, repeatedly constructing formatters. It now uses the database to calculate the current gym day and both boundaries in one query. The web requests gym branding and access in parallel after it validates the signed-in gym.

Local measurements used the test database and a synthetic `test-alpha` owner on ports 3002 and 3003. A single client sent one warm-up request and 20 sequential measured GETs per route, with no errors in either run. TTFB measures when headers arrived. Full response includes the document or JSON body. Values are milliseconds.

| Route | Before TTFB p50 / p95 | After TTFB p50 / p95 | Before full p50 / p95 | After full p50 / p95 |
| --- | ---: | ---: | ---: | ---: |
| Web sign-in | 2.2 / 3.2 | 2.4 / 4.3 | 9.6 / 12.9 | 10.2 / 15.3 |
| Web session | 12.2 / 20.2 | 13.7 / 18.0 | 12.3 / 20.4 | 13.8 / 18.2 |
| API session | 9.6 / 11.8 | 10.0 / 23.0 | 9.6 / 11.8 | 10.0 / 23.2 |
| API owner access | 6.4 / 7.2 | 6.5 / 7.9 | 6.4 / 7.3 | 6.6 / 8.0 |
| API owner dashboard | 286.3 / 797.5 | 17.4 / 20.9 | 286.4 / 797.7 | 17.5 / 21.0 |
| Web owner dashboard | 2.6 / 6.2 | 2.6 / 2.8 | 328.6 / 1048.3 | 48.9 / 57.4 |
| Web owner sessions | 2.7 / 4.9 | 2.7 / 3.1 | 97.3 / 114.3 | 91.9 / 99.0 |

Before release, repeat the timing sample through Vercel and Render in the intended user region, separating warm traffic from the first request after provider idle. Record response errors and evaluate the agreed 300 ms p95 API target alongside full page response times. Confirm effective headers including edge HSTS, Render readiness, and real worker/gym status on the published revision.

### Section 5 tasks: Interface and application usability

- [x] Fix trainer request action overlap, including long content and zoomed layouts.
- [x] Preserve safe application input on errors and normalize gym codes according to accepted rules.
- [x] Measure and fix failing text contrast in both themes.
- [x] Standardize intended date formats, date-only handling, pluralization, and dark root surfaces.
- [x] Verify keyboard operation and representative desktop/mobile widths.

Trainer request details and actions now wrap independently on both Requests and Schedule. Opening a member note expands the row. The disposable browser tests exercised both buttons and keyboard focus with long names and notes at 1440, 1024, 768, 390 and 320 pixels and simulated 200% zoom. Accepting held one credit, declining held none, and cancelling the accepted session returned the reserved credit. The port 3002 fixture had no pending requests at verification time. Its trainer pages passed the empty-state and width checks.

Application links and the gym-code form trim whitespace and use lowercase codes. Unknown codes offer a route back to gym-code entry. The API returns 404 for an unknown gym. The streamed web page renders the not-found view with `noindex` and retains HTTP 200. Validation errors keep name, email, phone and consent in form state. Passwords must be re-entered after a failed submission. The disposable browser test confirmed that the public applicant could correct the password and submit, an owner could approve based on the recorded consent, and the accepted applicant could open the member workspace. The same test checked correction and retry for a signed-in applicant. Five application API integration cases passed.

Account security and audit timestamps display day, short month, year and 24-hour time in Asia/Colombo. Session times use their gym timezone. Birth dates and membership term dates keep their calendar day. The date helpers passed Colombo midnight, month-end and year-end checks with process timezones on either side of UTC. The owner attention heading uses “1 session needs review” for a single session and the plural for other counts.

Contrast was measured from computed browser styles on port 3002. Dark mode used `#0a1528` on the root, body and workspace around the Security page.

| Sample | Light foreground / background | Light ratio | Dark foreground / background | Dark ratio |
| --- | --- | ---: | --- | ---: |
| Security helper | `#586478` / `#ffffff` | 5.98:1 | `#a2b3c9` / `#17243b` | 7.27:1 |
| Financials tab and public application helper | `#586478` / `#f3f6fa` | 5.52:1 | `#a2b3c9` / `#0a1528` | 8.54:1 |
| Financials placeholder | `#586478` / `#ffffff` | 5.98:1 | `#a2b3c9` / `#17243b` | 7.27:1 |
| Financials input border | `#8190a5` / `#ffffff` | 3.25:1 | `#6a7b94` / `#17243b` | 3.60:1 |
| Financials input focus outline | `#2563eb` / `#ffffff` | 5.17:1 | `#43d9e8` / `#17243b` | 9.12:1 |

All six focused browser scenarios passed together. The API and web builds, focused linting and whitespace checks passed.

### Section 6 tasks: Final regression and release evidence

- [x] Rebuild/restart the isolated test instance and run relevant cross-feature journeys.
- [x] Record evidence and final status for every audit issue, including already-fixed or unreproduced findings.
- [x] Update V2 scope documentation using the approved exclusions and keep future capabilities in a separate backlog.
- [x] Review capacity, backup/restore, encryption, provisioning, and deployment verification gaps; record missing evidence honestly.
- [x] Complete the release checklist with explicit outstanding risks and any decisions still required.

The rebuilt test app passed all four synthetic role logins and credit-balance checks across three gyms. Chrome also confirmed rapid registration submits delivered one credential for each account, both first-login password changes worked, and owner recovery refused reuse. Headers, liveness, readiness, protected CORS, cross-origin mutation rejection, frame blocking and an authenticated audit CSV download passed on port 3002.

The first PT suite run found an outdated legacy-upgrade assertion. The expected result now includes the nullable trainer-pay field and compares every original booking value. The rerun passed all 57 cases, including preservation of legacy bookings and reminder backfill. The final finance-only rerun passed all three cases after the report change below.

The local finance walkthrough exposed a 5-second database transaction timeout while reading revenue. The revenue report now resolves each gym-local midnight once per report date and reuses it across membership lines. Four follow-up requests for the synthetic November window returned 275 lines and succeeded in 522–690 ms while other local checks ran. This was a diagnostic sample. The release latency target remains open for this route.

The 14 November full browser run passed 39 of 40 cases on the rebuilt applications. Its sole failure was a test selector for the former “Attendance” label. The test now checks keyboard focus on “PT Session History.” The application-to-enrollment and cross-gym isolation cases also passed in sequence after the isolation test was updated to check changes from its actual pre-test counts. A fresh full run on 15 November passed all 40 tests in 5.9 minutes using disposable databases.

Workspace builds and type checks passed. Lint passed with four existing unused-code warnings. The unit suite passed 187 tests, identity passed 20, applications passed 5, platform and rollout passed 33, and the recovery/deployment utility checks passed 20. The encrypted restore drill passed separately. The secret scan covered tracked changes and new text source files and found no matches.

**Execution order:** Start with Section 1, then Section 2. Prioritize confirmed P1 work in Sections 4 and 5 before lower-priority polish; section numbers group related changes rather than replacing severity. Section 3 must move ahead of release if investigation establishes incorrect financial obligations. Section 6 closes the work after the relevant sections pass. No section is complete merely because its code changes are written.

## 1. Purpose and evidence boundaries

This document converts the audit into an actionable backlog: what to investigate, what to change, and how to prove each issue is resolved. It covers all 13 reported defects, requirements gaps, and untested production-readiness areas.

The PDF describes a black-box review of a deployed application. The implementation sections record which observations were reproduced locally, which were corrected, and which still need evidence from a deployed revision. See [the results by audit issue](#12-evidence-and-completion-record).

The report references screenshots, execution logs, three baseline documents, and `rtm_baseline.md`. Those supporting artifacts have not been independently reviewed here. Request them when a reproduction or scope decision depends on them. Record the deployed revision and current repository revision before comparing results; a finding may already be fixed or may be deployment-specific.

The reported 91-requirement scorecard is 7 pass, 41 partial, 5 fail, 35 not implemented, 2 requiring clarification, and 1 not testable. These are requirement classifications, not 91 independent defects. Several requirements repeat the same capability across documents. The 7.7% full-pass figure includes older and deliberately excluded scope, so it must not be used alone as a V2 quality score.

## 2. Priority rules and release policy

| Priority | Meaning | Required action |
| --- | --- | --- |
| P0 | Core workflow blocks access or credential delivery | Investigate first and resolve before release |
| P1 | Significant operational failure or release hardening concern | Resolve and verify before release, or document an explicit justified acceptance decision |
| P2 | Incorrect secondary behavior, confusing information, or usability failure | Address in the next remediation cycle; raise priority if investigation reveals financial or access-control harm |
| P3 | Presentation consistency and polish | Complete after functional remediation |
| Scope decision | Capability absent from older specifications or intentionally excluded | Decide applicability before treating it as implementation work |
| Verification gap | Production claim not established by the audit | Gather evidence; absence of evidence is not proof of a defect |

Priorities below retain the audit's P0-P3 assignments for traceability. BUG-006 is split into three work items because security headers, performance, and health routing have different causes and acceptance criteria. Their individual release impact must be assessed after verification.

## 3. Master issue register

BUG-001, BUG-003, BUG-004, BUG-005, BUG-007, BUG-008, BUG-009, and BUG-011 are fixed and verified locally. BUG-006A–C passed local verification and await hosted checks. The remaining entries are **Unverified / open**. Suggested owners are functions, not assigned people.

| Order | ID | Priority | Reported issue | Suggested owner | PDF pages |
| --- | --- | --- | --- | --- | --- |
| 1 | BUG-001 | P0 | Member/trainer creation hides temporary credentials and stays pending | Web + API | 9, 12, 15 |
| 2 | BUG-003 | P1 | Owner recovery produces neither link nor error | Web + API/security | 10, 12, 15 |
| 3 | BUG-004 | P1 | Member attendance tab incorrectly appears empty | Web + API | 8, 12 |
| 4 | BUG-005 | P1 | Membership plans cannot be edited or retired | Product + Web + API | 8, 12 |
| 5 | BUG-002 | P1 | Trainer request actions overlap desktop content | Web/UI | 12, 14 |
| 6 | BUG-006A | P1 | Missing HTTP security headers | Web + deployment/security | 12, 15 |
| 7 | BUG-006B | P1 | Slow observed response times | API + Web + deployment | 12, 15 |
| 8 | BUG-006C | P1 review | Health route returns 404 with wildcard CORS | API + deployment | 12, 15 |
| 9 | BUG-007 | P2 | Session fee and trainer earnings appear inconsistent | Product/finance + API + Web | 10, 13 |
| 10 | BUG-011 | P2 | Declined requests inflate calendar totals | Web + API | 13 |
| 11 | BUG-008 | P2 | Platform registry lacks owner names | API + Web | 13 |
| 12 | BUG-009 | P2 | Pay-rate validation displays a raw pattern error | Web + API/contracts | 13 |
| 13 | BUG-012 | P2 | Application errors lose input; gym code handling is inconsistent | Web + API | 13 |
| 14 | BUG-010 | P2 | Light-theme secondary text has reported low contrast | Web/design | 13, 14 |
| 15 | BUG-013 | P3 | Dates, pluralization, and dark page background are inconsistent | Web/design | 13, 14, 17 |

## 4. P0: Restore reliable account creation

### BUG-001: Member and trainer creation stalls before credential handoff

**Reported behavior:** A valid submission appears to create the account, but the page remains on “Working.” and never displays the one-time temporary password. The report observed an initial successful HTTP response followed by an aborted request. Duplicate-email validation reportedly worked.

**Impact:** Staff cannot deliver credentials in a system that intentionally sends no email. Retrying may leave staff confused about which accounts exist.

**Investigate:**

1. Reproduce both member and trainer creation using unique synthetic identities.
2. Trace submit handler, server action, API response, navigation, and pending state together. A successful HTTP status alone does not establish application success.
3. Determine whether the second request is a duplicate mutation, navigation, or another request. Do not implement a speculative race fix solely from the PDF.
4. Confirm whether the account and audit record exist when the handoff fails, without logging passwords or recovery tokens.

**Implementation work:**

- Establish a single submission path with explicit pending, success, and failure states.
- Preserve the successful response until the credential handoff is rendered. Avoid navigation that discards it.
- Prevent accidental repeated submission and make retry behavior safe at the mutation boundary.
- Preserve existing one-time credential handling; do not put credentials in URLs, logs, analytics, or browser persistence.
- Return a clear failure state if the outcome is uncertain. Use the approved recovery workflow for already-created accounts rather than attempting to retrieve stored plaintext passwords.
- Handle both new identities and any supported existing-identity enrollment cases according to current account rules.

**Acceptance criteria:**

- [ ] Valid member creation displays the intended handoff and the new member can complete first login.
- [ ] Valid trainer creation displays the intended handoff and the trainer can complete first login.
- [ ] Rapid double-click, slow response, and safe retry do not create duplicate accounts or duplicate enrollment events.
- [ ] Duplicate identity and validation failures show readable messages and leave the form usable.
- [ ] No password or token appears in diagnostic evidence.
- [ ] Recovery works for an account created during a failed handoff.

**Dependency:** Complete BUG-003 alongside this issue so the fallback recovery route is dependable. Add regression coverage around the mutation-to-handoff transition, not only account insertion.

## 5. P1: Release-critical functional and technical work

### BUG-003: Owner-assisted recovery silently fails

**Reported behavior:** The owner page returns HTTP 200 but shows neither a recovery link nor an error; platform-admin recovery reportedly works.

**Implementation work:**

1. Reproduce owner and platform-admin recovery with comparable synthetic cases.
2. Compare authorization, input validation, response shape, server action state, and result rendering. Do not copy platform-admin privileges into the owner flow.
3. Handle success and every failure explicitly, including incorrect current password, invalid attestation, ineligible target, and expired authorization.
4. Display the approved one-time fragment link with reliable copy behavior; preserve token expiry and single-use enforcement.
5. Retain gym scoping and audit events without storing the recovery secret in logs.

**Acceptance criteria:**

- [ ] An authorized owner can issue and use a recovery link for an eligible account in their gym.
- [ ] A link cannot be reused after successful recovery, and expired links fail clearly.
- [ ] Wrong owner password, invalid input, and disallowed target produce readable errors.
- [ ] Cross-gym and unauthorized recovery remain denied.
- [ ] Platform-admin recovery continues to work under its own access rules.

### BUG-004: Member attendance history shows a false empty state

**Reported behavior:** A member with a known PT session sees “No sessions recorded yet.”

**Implementation work:**

1. Verify the member identity, gym enrollment, date window, pagination, timezone, and session statuses used by the detail query.
2. Compare the detail result with the owner session list for the same synthetic member.
3. Define which statuses belong in this history. Include scheduled/completed sessions promised by the UI; agree how cancelled, declined, and missed sessions should appear.
4. Correct mapping or filtering only after identifying the mismatch. Keep tenant filters intact.
5. Distinguish genuine empty history from loading or fetch failure. Label this as PT session history where necessary; it does not prove physical gym attendance.

**Acceptance criteria:**

- [ ] Expected sessions appear with accurate dates and statuses.
- [ ] A member with no qualifying sessions receives the genuine empty state.
- [ ] Fetch errors do not masquerade as empty history.
- [ ] Other members' and other gyms' sessions never appear.
- [ ] Date boundaries and pagination do not hide qualifying history.

### BUG-005: Membership plans cannot be edited or retired

**Reported behavior:** Owners can add plans but cannot change or retire them.

**Implementation work:**

1. Confirm the supported plan lifecycle and how existing membership terms preserve their agreed values and duration.
2. Add owner-authorized editing for allowed fields and an active/archive state for future selection.
3. Keep historical memberships and accounting unchanged when a catalog plan changes. Use versioning or snapshots if required by the current data model.
4. Prevent new issuance from archived plans while preserving historical display.
5. Treat hard deletion as optional: allow it only if the approved product behavior and reference checks make it safe. Archiving is the default retirement solution.
6. Audit changes and enforce rules on the API, not only through hidden controls.

**Acceptance criteria:**

- [ ] An owner can edit permitted fields and archive a plan in their gym.
- [ ] Edited prices/durations apply to future issuance according to the agreed policy.
- [ ] Existing terms, financial history, and reports remain accurate.
- [ ] Archived plans cannot be newly assigned and remain readable in historical records.
- [ ] Unauthorized changes and unsafe deletion are rejected.

### BUG-002: Trainer request actions overlap desktop content

**Reported behavior:** The accept button overlaps metadata and helper copy at 1440 × 900; mobile stacking reportedly avoids the collision.

**Implementation work:**

- Inspect the request row's grid/flex sizing, wrapping, fixed widths, and positioning.
- Give metadata, message entry, and action buttons room to wrap independently.
- Support long member names, long labels, error messages, and keyboard focus without obscuring controls.

**Acceptance criteria:**

- [ ] Accept and decline remain readable and operable at 1440, 1024, 768, and 390 pixel viewport widths.
- [ ] Enlarged text/200% zoom and long content do not obscure controls.
- [ ] No horizontal overflow or overlap; visible keyboard focus remains intact.
- [ ] Accept/decline still produce the correct request and credit transitions.

### BUG-006A: Verify and add appropriate HTTP security headers

**Reported behavior:** HSTS was present, while CSP, frame restrictions, content-type protection, referrer policy, and permissions policy were absent on inspected responses.

**Implementation work:**

1. Inspect effective headers from the deployed web and API paths, including redirects and error responses. Identify which layer owns them.
2. Define a Content Security Policy around actual scripts, styles, images, connections, and any approved embedding requirements.
3. Validate CSP without breaking application hydration, forms, or approved assets; use a staged report-only evaluation where appropriate before enforcement.
4. Configure appropriate frame restrictions, `X-Content-Type-Options`, referrer policy, and permissions policy. Preserve existing HSTS behavior.
5. Check for contradictory or duplicated headers across application and hosting layers.

**Acceptance criteria:**

- [ ] Intended policies are present on relevant deployed responses and their behavior is verified.
- [ ] Authentication, credential handoff, plans, exports, and protected navigation still work.
- [ ] Unapproved framing is blocked according to the agreed embedding policy.
- [ ] CSP enforcement has no unexplained violations in representative workflows.

**Important qualification:** A missing header is a hardening finding; the audit does not demonstrate exploitation. Choose policies for this application rather than blindly copying a blanket configuration.

### BUG-006B: Diagnose response latency and establish a valid performance baseline

**Reported behavior:** Observed response times range from roughly 0.8 seconds to 28.8 seconds, depending on route and conditions.

**Evidence limit:** A collection of remote TTFB observations does not by itself establish API p95 processing time. The report combines SSR pages, API responses, authentication states, and cold behavior. The original <300 ms requirement must be mapped to a defined measurement boundary.

**Implementation work:**

1. Define representative routes, dataset sizes, user region, concurrency, warm/cold conditions, and whether the target covers server processing or end-to-end latency.
2. Collect repeatable samples and report sample count, median, p95, and errors separately for API and page requests.
3. Trace web-to-API calls, API-to-database queries, connection startup, authentication, and serialized request waterfalls.
4. Fix measured bottlenecks: unnecessary sequential requests, repeated reads, excessive result sizes, missing indexes, or unsuitable connection configuration, as supported by evidence.
5. Cache only where tenant/user isolation and freshness are demonstrably preserved. Do not cache personalized responses across users.
6. Repeat the same workload after changes and retain comparable before/after results.

**Acceptance criteria:**

- [ ] Measurement method and agreed performance target are documented.
- [ ] Representative routes meet that target, or any remaining gap has an explicit release decision.
- [ ] Cold-start behavior is separately reported and explained.
- [ ] Improvements do not increase errors, stale financial results, or cross-tenant exposure.

### BUG-006C: Clarify health routing and CORS behavior

**Reported behavior:** `/api/health` returns 404 with `Access-Control-Allow-Origin: *`.

**Implementation work:**

- Determine the actual monitoring contract and whether health checks belong to the web host, API host, or both.
- If a health endpoint is required, implement minimal liveness/readiness behavior with appropriate access controls and no sensitive configuration disclosure.
- If this path is intentionally unsupported, correct monitoring/documentation rather than adding an unnecessary route.
- Trace the origin of wildcard CORS and restrict protected API behavior to the intended cross-origin policy.

**Acceptance criteria:**

- [ ] Monitoring uses a documented endpoint with expected healthy/unhealthy behavior.
- [ ] Health responses disclose no secrets or unnecessary infrastructure details.
- [ ] Protected authenticated responses follow the approved CORS policy.
- [ ] Unsupported paths remain safe and predictable.

**Important qualification:** Wildcard CORS on a 404 response is not proof that authenticated data can be read cross-origin. Verify the actual protected-resource behavior before assigning security impact.

## 6. P2: Financial clarity, reporting, and usability

### BUG-007: Session fee and payroll accrual appear inconsistent

**Reported behavior:** A session displays LKR 50 while earnings/payroll show LKR 0.00 for a zero-value PT pack. The report also mentions a base-rate setting.

**Implementation work:**

1. Confirm the approved distinction between nominal fee, agreed pack unit value, recognized session revenue, and trainer remuneration.
2. Trace the stored settlement snapshot and rate policy for the example; establish whether zero is correct or a calculation error.
3. Show an understandable breakdown of the values that actually determine earnings. Do not force payment to match a display label without validating the contract.
4. Test non-zero and zero-value packs, relevant trainer levels, cancellation/no-show rules, and corrected sessions.
5. If calculations are wrong, correct them through the existing audited adjustment process. Do not silently rewrite approved payroll or historical settlements.

**Acceptance criteria:**

- [ ] Product/finance confirms the calculation rules with worked examples.
- [ ] Member/session, trainer earnings, owner payroll, and exports reconcile to those rules.
- [ ] Zero earnings have an explicit, accurate explanation when valid.
- [ ] Corrections and payroll locking preserve financial history.

**Priority escalation:** Raise to P1 if investigation finds actual underpayment, overpayment, or incorrect posted financial results.

### BUG-011: Declined requests inflate calendar totals

**Implementation work:** Define active-session versus historical-request counts; centralize the status rules used by daily badges and monthly totals. Keep declined history available if needed, clearly labeled and separate from active counts. Refresh counts after a status change.

**Acceptance criteria:**

- [ ] Declined requests do not inflate counts labeled as active sessions.
- [ ] Daily badges, monthly summaries, and visible lists agree.
- [ ] Pending, confirmed, cancelled, completed, and missed cases follow documented rules.
- [ ] Month boundaries use the intended gym timezone.

### BUG-008: Platform registry shows “Name unavailable” for owners

**Implementation work:** Trace the registry's owner identity source and any cross-database mapping. Distinguish unavailable profile data from a broken lookup. Return only information appropriate to the platform-admin role; avoid solving this by exposing unrestricted tenant data.

**Acceptance criteria:**

- [ ] Every synthetic gym with an owner name displays the correct owner.
- [ ] Missing/removed owner data has an accurate fallback.
- [ ] Registry refresh and supported ownership updates remain consistent.
- [ ] Registry access stays restricted to authorized platform users.

### BUG-009: Pay-rate validation exposes raw schema text

**Implementation work:** Translate validation failures into field-specific messages based on the actual allowed amount format and range. Keep client/server validation consistent. Preserve other valid input and move focus to an accessible error summary or invalid field where appropriate.

**Acceptance criteria:**

- [ ] Invalid text, unsupported decimals, empty values, and out-of-range amounts show readable errors.
- [ ] Valid boundary values save correctly under the current financial rules.
- [ ] No raw regular expression or internal schema structure is displayed.
- [ ] Errors are accessible and do not erase unrelated input.

### BUG-012: Application validation loses input and gym codes behave inconsistently

**Implementation work:**

- Confirm canonical gym-code rules. If codes are case-insensitive, normalize whitespace/case consistently before validation and lookup.
- Provide an understandable unavailable-gym result with a clear next step, while preserving appropriate HTTP behavior.
- Return field-level validation errors and retain safe non-password values for correction. Do not put sensitive application data into query strings.
- Preserve existing anti-abuse and access controls.

**Acceptance criteria:**

- [ ] Mixed-case and whitespace variants follow the approved code rules.
- [ ] Unknown codes produce a useful, consistent response.
- [ ] Invalid submission preserves permitted non-secret fields; passwords follow the intended secure form behavior.
- [ ] Correcting an error allows submission without re-entering the entire application.
- [ ] Existing apply → owner decision → consent → member access flow still works.

### BUG-010: Low-contrast secondary text in light mode

**Implementation work:** Measure foreground/background pairs for the affected helper text, captions, placeholders, and controls. Adjust shared theme tokens when the issue is systemic; inspect both themes so a shared change does not cause regressions.

**Acceptance criteria:**

- [ ] Normal text meets the intended WCAG AA 4.5:1 contrast threshold; qualifying large text meets 3:1.
- [ ] Required control boundaries and focus indicators are checked against applicable non-text contrast requirements.
- [ ] Financials, applications, and security pages are readable in light and dark themes.
- [ ] Record measured color pairs and ratios rather than relying only on screenshots.

**Evidence limit:** The PDF states low contrast but does not supply a complete measured contrast inventory. Confirm actual failures before changing all muted colors.

## 7. P3: Presentation consistency

### BUG-013: Dates, pluralization, and dark background

**Implementation work:**

- Standardize user-facing timestamp formatting using the agreed locale and `Asia/Colombo` timezone.
- Treat birth dates and other date-only values as calendar dates so timezone conversion cannot shift the day.
- Keep export/machine formats explicit rather than forcing every output into a display format.
- Use correct singular/plural messages for zero, one, and multiple sessions.
- Apply the active theme to the root/body surface and verify loading, scrolling, and empty-page states.

**Acceptance criteria:**

- [ ] Audit, security, profile, and session screens use intentional, documented date formats.
- [ ] Midnight/month boundaries and date-only values remain correct.
- [ ] “1 session needs review” and plural alternatives render correctly.
- [ ] Dark mode has no unintended light background around the workspace.

**Evidence limit:** Numeric dates such as `12/11/2026` are ambiguous without context. Verify actual formatter behavior before concluding that a particular view uses month/day ordering.

## 8. Approved V2 scope

The product owner approved the current release scope on 14 November 2026. The [README scope](../README.md#current-scope) describes the four supported roles, entitlement-only finance, PT records and staff-assisted recovery. The [future capabilities backlog](V2-FUTURE-CAPABILITIES.md) keeps approved exclusions and unprioritized enhancements with their audit requirement IDs.

The implementation uses a Next.js web app, a NestJS API, a PostgreSQL master database for identities and the registry, and a dedicated PostgreSQL database for each gym. V2 ships as responsive web. The original proposal scorecard remains a record of that proposal. A revised score needs the underlying requirements and an approved V2 measurement baseline.

## 9. Verification gaps outside the 13 defects

| Gate | Evidence on the current worktree | Evidence needed before release | Accountable role |
| --- | --- | --- | --- |
| 500+ user capacity | The local benchmark used one client and synthetic data. The pool and API tests cover connection limits and tenant isolation. | Define the concurrency target, traffic mix and representative tenant sizes. Run a load test against owned staging and record p95 latency, errors, resource usage, and bottlenecks. | Release/hosting operator |
| 99.5% uptime and scheduled work | On port 3002 the scheduled runner saw three gyms and reported no skipped gyms or failures in the sampled sweeps. The demo configuration sleeps when idle. | Agree on the uptime window and measure it. Verify restart recovery and scheduled work latency on the intended host under representative traffic. | Release/hosting operator |
| Backup and <4-hour recovery | An encrypted synthetic restore staged Master, verified and switched Tenant A, rolled it back, and proved Tenant B unchanged. The test reported 3.61 s for its recovery interval and 9.45 s end to end. The staged Master required operator reconciliation. | Verify the target's actual backup schedule, retention, recovery-point objective and key custody. Rehearse a representative restore and reconciliation into separate owned targets. Record recovery time and data loss. | Database operator |
| Encryption and PII | The deployment bootstrap requires certificate-verified PostgreSQL TLS. The synthetic backup drill used authenticated AES-256-GCM archives. Passwords use Argon2id. | Confirm the applicable PII policy, verify database storage and backup encryption and actual runtime grants, and establish whether any fields require application-level encryption. Verify key access and rotation in the intended environment. | Security and database operators |
| Gym provisioning and schema rollout | The local manual sync verified all three owned gyms. Automated provisioning and rollout exercise real PostgreSQL targets and safe failure paths. Earlier hosted setup verified two synthetic gyms on a previous revision. | Rehearse provisioning and tenant migration `20261114090000_trainer_session_pay` on the intended synthetic host. Verify grants, manifest, dashboard readiness, owner credential handoff and recovery. Review initialized pay rates before confirming live bookings. | Database and release operators |
| Deployed security and identity | Section 4 verified local security headers, CORS, readiness and frame blocking. Cross-role tests target both pages and API mutations. | Verify effective HTTPS/HSTS and headers, Origin enforcement, monitoring and throttling on the intended release. Review existing public signup email ownership and privileged MFA findings before real-data use. | Security and release operators |

The [Neon deployment runbook](DEPLOY-VERCEL-RENDER-NEON.md) gives the role, migration, health and smoke-test procedure. The checked-in Free hosting setup is intended for synthetic demonstrations. Previous hosted setup evidence belongs to the [demo setup record](DEMO-NEON-SETUP.md). The [predeployment security review](security-review/2026-11-07-predeployment.md) tracks the earlier signup and privileged-access findings.

## 10. Execution sequence

### Stage 1: Establish a reproducible baseline

1. Record repository revision, deployed revision if available, audit date, and fixture version.
2. Obtain supporting audit evidence where needed and map demo identifiers to synthetic local test cases.
3. Reproduce BUG-001 and BUG-003 first, then the remaining P1 findings.
4. Update each issue to confirmed, already resolved, not reproduced, or scope-dependent, with evidence. Do not mark an issue resolved solely because one retry succeeds.

### Stage 2: Restore access and operational reliability

1. Fix credential handoff and owner recovery.
2. Correct member history and plan lifecycle behavior.
3. Resolve trainer request layout.
4. Verify header policies, measure performance, and resolve the monitoring contract.

### Stage 3: Reconcile money and secondary views

1. Establish payroll semantics and verify zero/non-zero examples.
2. Align calendar totals and registry ownership display.
3. Improve validation, application recovery after errors, and measured text contrast.

### Stage 4: Finish consistency and scope alignment

1. Standardize dates, grammar, and theme surfaces.
2. Complete the scope decision register and revised requirements baseline.
3. Complete infrastructure evidence appropriate to the intended release.
4. Re-run affected end-to-end journeys and document the release decision.

No reliable effort estimate should be assigned until reproduction identifies the actual cause and required migration or deployment work. Use these stages as dependency order, not promised durations.

## 11. Safe testing and regression strategy

Follow [manual-testing.md](manual-testing.md) before running the application or tests. Its environment isolation rules are mandatory.

### Environment requirements

- Browser/manual acceptance: `http://localhost:3002`; API: `http://127.0.0.1:3003`.
- Development remains on web 3000/API 3001. Do not perform browser acceptance testing there.
- Use the separate owned synthetic testing databases and the ignored `.env.manual-test.json`; never copy secrets from that file into evidence or this document.
- Never point the testing API at root `.env` development databases, reuse test databases for development, or copy real data into fixtures.
- Rebuild the applications, synchronize current migrations, and restart the testing instance after code/schema changes so results reflect the current implementation.
- Do not reconnect old backed-up databases without the separate recovery review required by repository instructions.

The documented existing-fixture startup sequence is:

```sh
pnpm --dir apps/api build
pnpm --dir apps/web build
pnpm manual:sync
pnpm manual:start
```

With the testing application running, `pnpm manual:check` checks fixture access and baseline data. It does not replace issue-specific acceptance testing. Follow the runbook's stop/rebind instructions if ports or the owned database container change.

### Automated checks

Choose checks according to the affected layers. Relevant existing root scripts include:

| Change area | Existing check to consider |
| --- | --- |
| Contracts/types and cross-layer changes | `pnpm typecheck:workspace` |
| Lintable application changes | `pnpm lint:workspace` |
| Business logic and component-supporting utilities | `pnpm test:unit` or focused tests within the affected package |
| Recovery authorization and token lifecycle | `pnpm test:recovery:owned` |
| PT status, booking, credit and settlement behavior | `pnpm test:pt:owned` |
| Financial calculations and payroll locking | `pnpm test:finance:owned` |
| Application/consent behavior | `pnpm test:cf:owned` |
| Schema/database behavior | `pnpm test:database:owned` |

Read the relevant test setup before invoking database suites. Keep their owned/disposable fixtures isolated. Add regression tests for meaningful broken behaviors; do not add tests merely to assert cosmetic implementation details.

### Cross-feature regression journeys

- [x] Owner creates member and trainer → credentials delivered → first login succeeds.
- [x] Owner recovery → target resets access → token reuse fails.
- [x] Applicant applies → owner approves/rejects → consent gates member access.
- [x] Owner edits/archives a plan → historical membership retains its agreed terms → future selection respects status.
- [x] Member requests PT → trainer accepts/declines → calendars and credit balances agree.
- [x] Free/late cancellation and no-show/correction → correct settlements and earnings.
- [x] Payroll closes/approves → state locks and reports remain consistent.
- [x] Workout/meal edits → assigned member sees the intended content.
- [x] Cross-role and cross-gym reads and writes are denied. Support mode remains read-only.
- [x] Representative desktop and mobile screens and both themes remain usable.

Preserve the behaviors the audit reported as working: role/tenant isolation, session revocation, application consent, cancellation policy, settlement correction, payroll state transitions, and safe CSV export.

## 12. Evidence and completion record

Verification date: 14 November 2026. The tested snapshot is the local worktree based on `fc9754e`, with the remediation changes applied and tenant schema `tenant-2026-11-14.1`. Verification used the isolated synthetic app and disposable PostgreSQL 17 fixtures. The deployment revision for this work is pending.

| Issue | Local disposition and evidence | Owner area | Remaining release evidence |
| --- | --- | --- | --- |
| BUG-001 | Fixed. Rapid repeat submission previously lost the one-time result. Member and trainer forms now accept a single submit, show the handoff, and enforce first-login password change. | Web and identity | Replay the two registrations on the target revision. |
| BUG-003 | Fixed. The owner recovery action now forwards the current password. Wrong reauthentication, successful one-use redemption and denied reuse are covered. | Web and identity | Replay the owner recovery journey on the target revision. |
| BUG-004 | Fixed. Owner member history reads recorded PT sessions from the selected gym, with a distinct unavailable view. | Member records | Check populated and empty case after rollout. |
| BUG-005 | Fixed. Plan revisions apply to future terms, archiving hides a plan from new selection, and referenced plans cannot be deleted. | Memberships | Verify the hosted plan workflow with synthetic data. |
| BUG-002 | Fixed. Details and actions stay operable on both trainer pages, including long text, narrow widths and simulated 200% zoom. | Trainer workspace | Spot-check the hosted trainer request screens. |
| BUG-006A | Locally verified. Web and API send CSP and other hardening headers. Chrome blocked framing and completed an authenticated CSV download. | Security and deployment | The audit's public login still lacked the five headers on 15 November. Roll out and verify the effective policies on the target web/API responses. |
| BUG-006B | Local improvement verified. Owner dashboard API p95 fell from 797.5 ms to 20.9 ms in the comparable local sequential sample. The cause of the audit's hosted outliers remains unconfirmed. | API performance and deployment | Sample warm and first-after-idle traffic from the target region, then run the representative workload. |
| BUG-006C | Locally verified. Web `/api/health` and API `/healthz` provide liveness. API `/readyz` provides Master connectivity, with a generic 503 on failure. | API and deployment | The audit's public health endpoint still returned 404 with wildcard CORS on 15 November. Roll out and verify health checks, protected CORS and scheduled work through the actual hosts. |
| BUG-007 | Fixed for future confirmations. Trainer pay follows the saved pay amount independently of zero or non-zero pack allocation. Historical obligations and approved payroll are preserved. | Finance and PT | Apply the controlled migration and confirm per-gym defaults and overrides before live bookings. |
| BUG-011 | Fixed. Declined requests remain in PT history and are excluded from the member calendar counts. | Member calendar | Verify hosted counts and gym timezone. |
| BUG-008 | Fixed. Platform registry displays the owner's available name and a useful fallback. Registry access stays platform-only. | Platform registry | Spot-check the hosted synthetic gyms. |
| BUG-009 | Fixed. Rate inputs show field-specific amount errors. Valid rates and overrides persist. | Gym configuration | Check the migrated configuration and saved values after rollout. |
| BUG-012 | Fixed for form behavior. Both application paths preserve permitted fields, show validation errors, and retry successfully. The public flow reached owner approval and member access. | Applications | The unknown-code page uses the framework's streamed not-found response with `noindex` and HTTP 200. A strict web 404 would require a separate routing change if the release contract requires it. |
| BUG-010 | Locally verified for sampled pages. Text contrast ranged from 5.52:1 to 8.54:1. Sampled control edges and focus outlines also passed. | Shared appearance | Hosted visual spot-check. |
| BUG-013 | Fixed. Security and audit use Asia/Colombo timestamps, session times follow the gym, and date-only values preserve their civil date. Review copy uses singular/plural grammar, and dark mode extends to the root. | Shared appearance and reporting | Hosted visual spot-check. |

The implementation sections link each disposition to the tests and observed behavior. Deployment-specific entries stay open until the target revision is verified.

### Recheck against the original PDF on 15 November 2026

The PDF lists 13 defects on pages 12–13. The table above has 15 rows because BUG-006 has three checks. The 12 other defect IDs have local fixes under the approved V2 scope. The PDF's broader scorecard on pages 3–8 compares 91 requirements across the older GymOS and FitCore documents. It needs separate stakeholder sign-off and a revised requirements baseline.

Of the five requirements the PDF marked FAIL, AUTH-04 and WF-O2 have local one-time credential handoff and recovery evidence. RPT-02 has locally verified PT session history under the approved V2 scope. NFR-03 has a local header fix, while the cited hosted login still lacks those headers. NFR-01 remains open for release performance.

| PDF item | Evidence from the recheck | Remaining work |
| --- | --- | --- |
| BUG-006 and NFR-01/03, pages 12, 15, 17–18 | Public GET to the audit's Vercel login returned 200 and HSTS. That response lacked the five hardening headers listed in the PDF. Public GET to `/api/health` returned 404 with `Access-Control-Allow-Origin: *`. The corrected local build has the headers and health endpoints. | Roll out the local changes to restricted hosting. Verify effective headers, health and CORS on the deployed revision. Measure warm and cold latency separately and investigate the revenue route, which took 522–690 ms in four local diagnostic requests. |
| BUG-007, pages 13 and 17 | New confirmations save the trainer's agreed pay amount. Local settlement tests use both zero-price and paid pack credits. The booking details identify the old calculation on legacy bookings. | Roll out the trainer-pay tenant migration, review defaults and overrides per gym, and verify a synthetic paid and free session through hosted earnings, payroll and CSV. Existing booked amounts and settlements follow their original terms. |
| BUG-010, pages 13–14 and 17 | Rechecked the three pages named in the PDF on port 3002. The Owner Applications subtitle and enrollment helper, Expenses budget helper, and Security helper measured 5.52–5.98:1 in light mode and 7.27–8.54:1 in dark mode. | Repeat the visual checks on the deployed revision. |
| BUG-012, pages 13 and 17 | Mixed-case codes and surrounding spaces are normalized. Retry preserves contact details and consent while clearing the password. Unknown gyms use a friendly missing-gym screen and `noindex`. | Confirm whether the written acceptance criteria require a literal 404 for the streamed web page, which currently returns 200. The upstream theme API returns 404. |
| NFR-02 and follow-up testing, pages 15 and 18 | Local provisioning, access restrictions, paid-pack earnings and encrypted restore have direct test evidence. The restore drill used a small synthetic dataset. The repository documents TLS and encrypted archives. It contains no evidence establishing AES-256 column-level encryption for member PII. | Verify actual hosted daily backups and point-in-time recovery, a representative restore within four hours, 500+ concurrent users, and 99.5% uptime. Confirm the PDF's column-level PII encryption requirement and establish its implementation and verification if retained. |
| Scope sign-off, pages 17–18 | The product owner's exclusions are recorded in the [current scope](../README.md#current-scope). Body metrics and photos, plus the other unresolved feature groups, remain in the [future backlog](V2-FUTURE-CAPABILITIES.md). | Confirm formal stakeholder approval against the source requirements. Decide whether and when to deliver remaining capabilities, including body metrics and photos. The original companion requirements files were unavailable for this recheck. |

### Local verification on 16 November 2026

On the isolated synthetic environment with tenant schema `tenant-2026-11-16.1`, seven coaching and three finance integration tests passed. Six Chromium workflows passed on port 3002 for dietary notes, private progress, dated workouts and meals, finance downloads and trainer analytics. The [developer review guide](CLIENT-REVIEW.md) records the workflows and their remaining acceptance criteria.

The revenue route returned identical data for a fixed 667-line report after the change. Across 12 measured local requests per version, p95 dropped from 301 ms to 77 ms. BUG-006 and the corresponding hosted performance and security checks remain pending. The temporary hosted rehearsal was stopped.

## 13. Release decision checklist

- [x] BUG-001 credential handoff and BUG-003 owner recovery are verified end to end on port 3002.
- [ ] Confirmed P1 failures are resolved and verified; any exception has an explicit release decision with impact and mitigation.
- [x] Payroll correctness is verified on synthetic free and non-zero packs, including cancellation, corrections and approved payroll.
- [x] Role and tenant protections passed local read and mutation checks.
- [ ] Security headers and monitoring behavior are verified on the intended deployment.
- [x] Performance target and comparable local results are documented. Target environment results remain open.
- [ ] Backup/recovery, capacity, and other infrastructure claims have evidence appropriate to the release commitment.
- [x] Accepted V2 scope is documented separately from future features.
- [ ] Product owner has assigned named owners and milestones to any additional work selected for release.
- [x] The audited local worktree passed the full browser suite in a single run. Match the hosted rehearsal to the tested revision.
- [ ] Final sign-off records any remaining uncertainty and the accountable risk decision.

**Review disposition**

Implementation continues against the full PDF. The [developer review guide](CLIENT-REVIEW.md) tracks the open specification, implementation and test work before client handoff. Public or real-member use remains pending the hosted security, migration, monitoring, recovery and capacity checks in [Section 9](#9-verification-gaps-outside-the-13-defects).
