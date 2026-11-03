# GYMOS-MIG-032 — partial implementation evidence

Status: **In Progress; not Verified or Completed.** Evidence captured on branch `codex/segment-05-member-enrollment`, based on `origin/main` at `97b16a7`; this working revision had not yet been committed when recorded.

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
