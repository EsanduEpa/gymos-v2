# GYMOS-MIG-037 — trainer roster, profile and shift approval

Status: **In Progress**. Owner roster/profile and versioned shift approval are implemented and tested. The owner profile now reads bounded session summaries from the Segment 07 `PTSession` aggregate. Ratings remain unavailable because member rating submissions do not exist. Evidence was recorded against working tree changes based on `origin/main` plus Task 036 closeout commit `7c09fd4`; the feature changes were uncommitted at evidence capture.

## Implemented

- Owner-only `GET /gyms/:slug/trainers` supports name/email search, status/level filters and server-side paging up to 100 rows. Counts cover the full filter. Publication requires matching active/revoked Master trainer access, completed `REGISTER_TRAINER` operation, and committed tenant receipt.
- Owner-only `GET /gyms/:slug/trainers/:trainerId` returns profile contact fields only to owners. Tenant actor ID is not conflated with Master identity ID. Session history and totals are tenant-derived and capped at ten recent rows; ratings remain unavailable.
- Owner-only `PUT /gyms/:slug/trainers/:trainerId/shift` checks current owner authority, expected profile version, paired shift interval/overnight semantics, 15–960 minute duration, and configured gym timezone. Updates use a row lock, deterministic version-scoped replay key, one tenant receipt and one audit record. Existing session snapshots are not changed.
- V2 owner roster and profile routes show loading-independent error, no-results and shift feedback. The shift form preserves current values on failure and reports the gym timezone on success.

## Verification

- `pnpm --dir packages/contracts build` — exit 0.
- `pnpm --dir apps/api exec tsc -p tsconfig.json --noEmit` — exit 0.
- `pnpm --dir apps/api lint` — exit 0.
- `pnpm --dir apps/web exec tsc -p tsconfig.json --noEmit` — exit 0.
- `pnpm --dir apps/web lint` — exit 0.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.trainers.ts --disableConsoleIntercept` — exit 0; 1/1 integration test. A guarded PostgreSQL run tested 106 registered trainers across two gyms, paging 100+ rows, search/status/level totals, role and foreign-gym denial, Master publication and tenant receipt checks, member projection omission of email/phone/identity IDs, inactive directory exclusion, invalid shift zero effects, 15-minute and 960-minute boundaries, overnight shift behavior, same-key concurrent/replay safety, and one receipt/audit per committed version. Cleanup removed six owned databases, the container and run manifest.
- `pnpm build:workspace` — exit 0; API and web builds completed and the new routes were emitted.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e --grep 'trainer roster/profile and member directory'` — exit 0; 1/1 browser test at 390px. It verified the owner roster/profile and member directory render without horizontal page overflow and that the member card omits trainer contact details.

## Visual review

Codex reviewed the captured 390px screenshots. They show the roster table in a contained horizontal scroller, the profile and shift form stacked for mobile, and member-safe trainer cards. Screenshots: [owner roster](GYMOS-MIG-037/owner-roster-390.png), [owner profile](GYMOS-MIG-037/owner-profile-390.png). This was agent review of automated browser output, not an independent owner browser session.

## Remaining acceptance

- The owner profile summary is now implemented and verified: latest ten rows ordered by scheduled start descending then ID descending, all-state total with `hasMore`, total completed sessions, completed rows in the loaded window, and distinct related members with SCHEDULED/ACTIVE/COMPLETED history. Ratings remain unavailable because no rating submissions exist.
- Booking/request providers 041/042 and lifecycle commands are now implemented; the profile uses their shared PT session records. Task041/042/044 have separate acceptance evidence, so this task does not claim those journeys from its profile test alone.
- Re-run on a committed revision, complete owner-visible Chrome review and hosted PR checks before moving to Verified/Completed.

## Session-summary follow-up — 3 November 2026

- Working tree basis: existing uncommitted Segment 06 changes on `codex/segment-06-management` at `7c09fd4`; Segment 07 session schema and migration are also uncommitted. This evidence is not from a committed revision.
- Changed only the trainer profile response and schema, plus its existing integration fixture/assertions. The response exposes only session ID, state, type, scheduled instants and creation instant; it omits member identity, session notes, fee and pay. Counts use the authenticated gym's verified tenant database and trainer ID already matched to the completed Master registration and tenant receipt.
- `pnpm --dir packages/contracts build` — exit 0.
- `pnpm --dir apps/api exec tsc -p tsconfig.json --noEmit` — exit 0.
- `pnpm --dir apps/api lint` — exit 0 on the latest closeout run, with no warnings. An earlier same-day run reported an unused variable in a concurrent notifications test; that warning was absent on the final run.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.trainers.ts --disableConsoleIntercept` — exit 0; 1/1 guarded disposable PostgreSQL integration test. Profile assertions covered empty history (`totalCount: 0`, `hasMore: false`), 16 sessions with the newest ten and `hasMore: true`, stable ID tie ordering, completed-in-window and total-completed counts, exclusion of a second member with only pending/declined/cancelled/missed sessions from related-client totals, safe projection fields, pure-read zero writes, and unchanged confirmed shift snapshots after shift edits. The run removed six owned databases, its container, and run manifest.
- No browser check was run during this API-only follow-up. The prior 390px browser/visual evidence above predates the session-summary UI update; a refreshed visible check is pending after the owner profile panel change. No independent owner acceptance session is claimed here.
- Closeout recheck — 3 November 2026: the contract build, API typecheck, API lint, and guarded trainer integration were rerun after extending the test fixtures. All exited 0; the integration again passed 1/1 and cleaned its owned databases, container and manifest. Added assertions cover 16 total sessions, qualifier-state filtering for related clients, safe summary key allowlist, no effects from GET, and confirmed shift snapshot immutability.

## Owner-profile UI follow-up — 3 November 2026

- Current route and browser spec now render/assert the three session metrics, recent-session state/date, and truthful unavailable-rating message. The existing browser test also checks 390px page width and retains the directory privacy checks.
- Final headed Chrome-channel Playwright rerun, after the pack-form idempotency-state change, passed against the guarded synthetic two-gym fixture: `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config=playwright.manual.config.ts --grep 'trainer roster/profile and member directory|member roster and profile keep role'` — exit 0, 2/2 tests. The manual config was temporary and removed after the run.
- I inspected the latest [390px screenshot](GYMOS-MIG-037/owner-profile-session-summary-390.png). It shows `Nov 1, 2026, 9:30 AM GMT+5:30` for `2026-11-01T04:00Z`, consistent with the fixture gym's Asia/Colombo timezone; SHA-256 `24df691056f74920a365631e129ff452afe44ba0e1a226021d301178e7513631`.
- The native CUA bridge still showed an existing GitHub window instead of the Playwright window, so this is headed browser automation and screenshot review, not independent or user-observed acceptance. The current Task 037 API integration results above also passed.
- The updated screenshot supersedes the earlier UTC-display artifact and pending screenshot-replacement note. Task 037 remains **In Progress** because the working tree is uncommitted and hosted checks have not run. No staging or commit was performed.
- Formal Task 037 prerequisites 013, 018, 029, 036, 083 and 085 are Completed in the tracker. Task 039's request destination is a separate downstream acceptance; it does not provide Task 037's owner roster/profile/shift dependency.

## Provider integration follow-up — 3 November 2026

- Tasks 041 and 042 now provide the owner booking and member request/session consumers. The profile still reads only the bounded, sanitized session summary described above.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e --grep 'trainer roster/profile and member directory'` — exit 0; 1/1 guarded two-gym browser test. At 390px it rechecked the owner profile session metrics and gym-local timestamp, member-safe directory projection, and followed the selected trainer request link to the M02 `Request a trainer` route. Cleanup dropped six disposable databases and removed the container and run manifest.
- This run used headed Playwright automation and test fixtures; it was not owner-observed Chrome review. The CUA browser-control host remains unavailable. Task 037 remains In Progress pending owner-visible review and hosted checks.
