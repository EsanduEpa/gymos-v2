# GYMOS-MIG-032 — acceptance evidence

Status: **Completed** for Segment 05 at code revision `bab9b97`, with final documentation and hosted PR checks recorded in [Segment 05 handoff](../SEGMENT_05_HANDOFF.md). Earlier sections below preserve historical partial-revision findings; the final acceptance section supersedes them.

## Implemented and locally checked

- Added owner member list paging, search and status filters with accurate result totals; explicit owner profile projection; profile, membership summary, and web navigation/pages. Pending/unpublished completed registrations are hidden from the normal list until the Master operation is complete.
- Contracts and client build passed. Contract tests passed **26/26**. API/web TypeScript checks passed. The disposable tenancy integration suite passed **21/21**, including the list publication behavior and a 125-row paging case. Its harness cleaned all disposable databases/container.

## Remaining acceptance work

- Task 040 does not yet provide session/hold and pack ledgers, so pack and recent-session history are explicitly described as unavailable. Current task code must not be treated as a complete profile projection.
- Support/member/trainer-specific DTO boundaries, recursive forbidden-key checks, broad foreign-ID and role-denial cases, UI loading/error/empty accessibility/browser checks, and fully sourced bounded billing history remain outstanding.
- Full task 032 acceptance requires those items and review of the final committed revision; no completion is claimed.

## Follow-up verification — 3 November 2026

Code and tests added in commit `41a6ad5` on `codex/segment-05-member-enrollment`.

- Membership-term history no longer silently truncates at 100. Owner profile API now accepts validated `page`/`pageSize`, returns stable `(startDate DESC, id DESC)` ordering and exact page/total metadata, clamps out-of-range pages, and selects only the page’s term fields. The web profile exposes previous/next history navigation and the total.
- The disposable tenancy integration suite passed **26/26**, including 125 terms, total/page metadata, out-of-range page clamping, stable order and distinct first/last pages.
- The two Chromium enrollment journeys passed **2/2**. The new-member journey rendered the 26-term profile on two pages and opened the oldest term on page 2.
- API/web TypeScript checks, focused web ESLint, contract build, API build, web build, and `git diff --check` all passed.

Still incomplete: role-specific member/support/trainer projections beyond explicit denial, recursive forbidden-field auditing, empty/loading/error/accessibility browser cases, foreign-resource denial matrix, and operational/pending state coverage. Session history, pack history, and confirmed-trainer health remain deliberately assigned to tasks 044, 034, and 050. Task 032 remains In Progress; owner manual acceptance is not recorded.

The profile paging browser journey and API assertions above were followed by an owner-version-zero credential-flow correction in `5d9cf8a`; that correction does not change profile paging. Latest checked-in paging implementation is therefore still `41a6ad5`.

## Final code-revision acceptance — 3 November 2026

Revision `bab9b9776ab5afa9dd4d192764b64a70636ba02c` on PR [#6](https://github.com/EsanduEpa/gymos-v2/pull/6) adds strict BASIC/OPERATIONAL/HISTORICAL roster and profile account states, full-filter summary/status counts, gymwide pending-enrollment count, phone search, exact published operation tuple checks, and repeatable-read list snapshot. The profile shows joined date and nullable fields; session history, pack ledger/history and confirmed-trainer health remain assigned to tasks 044, 034 and 050.

- Disposable tenancy integration: `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` — **30/30, exit 0**, 8 owned databases/container cleaned. This includes 125-row page5 search/status totals; 125 term history rows, stable ordering/page clamp; phone/null search; operational/historical classification; pending/foreign/missing safe404; MEMBER/TRAINER/SUPPORT owner-endpoint denial; invalid query422; pure read counts and no health notes in the list.
- Two-gym Chromium: `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts --reporter=line` — **19/19, exit 0**, 7 owned databases/container/manifest cleaned. Owner Beta data remains isolated; member/trainer/admin sessions receive403 on owner list/profile, owner foreign IDs receive the same404 body as missing IDs, and session projections contain no private health, credential, password hash or database field. The existing audited support session exposes only a summary and no owner member list. The browser verifies no-match empty state, explicit counts, keyboard tabs/panel focus, 320px width, dependency-error alert/retry and Suspense loading for roster/profile while tenant reads wait.
- `pnpm --dir packages/contracts test` — **26/26, exit 0**; workspace typecheck/lint and API/web builds — **exit 0**. Owner DTOs are strict allowlists and reject recursively serialized unknown/private fields at contract boundaries. Owner profile includes private health notes only through its protected owner endpoint.
- Agent visual review, on synthetic disposable data only: `apps/web/test-results/migration-evidence/GYMOS-MIG-032/{roster-desktop,profile-320,profile-error-320}.png`. These generated captures are intentionally Git-ignored and remain local. The review caught a clipped mobile tab; the final profile tabs wrap and all labels are visible. No real data or credential screenshot was retained.

**Manual acceptance record:** owner-delegated agent visual review is recorded separately from automated assertions. The owner authorized Codex to run manual tests and merge after verification; this record does not claim an independent owner browser session. Hosted checks and final PR review are recorded in the Segment 05 handoff.
