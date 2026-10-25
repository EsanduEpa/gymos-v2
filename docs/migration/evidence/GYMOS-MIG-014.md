# GYMOS-MIG-014 — Safe V1 visual baseline

Status: **Completed.**

Date: 25 October 2026, Asia/Colombo. V1 source: `058aa8532741c4cb84289589fd2cf89282882988`. V2 starting revision: `fe0dbaf`. Task branch: `codex/gymos-mig-014-v1-baseline`. The manifest records hashes of the exact capture harness, fixture, verifier and configuration used, so the evidence remains attributable after the task commit.

Dependencies are Completed: [007](GYMOS-MIG-007.md), [011](GYMOS-MIG-011.md), [012](GYMOS-MIG-012.md). No decision gate is outstanding for this task.

## Artifacts

- [Review gallery](GYMOS-MIG-014/gallery.html): searchable local image index, including viewport, state, role, deferred-reference labels and observed overflow.
- [Capture manifest](GYMOS-MIG-014/manifest.json): actual image paths and SHA-256 digests, source/harness revisions, browser/package/font versions, viewport/device scale, frozen time, outcomes, native-dialog text and persisted effect counts.
- [Fixture summary](GYMOS-MIG-014/fixture.json) and [portable synthetic records](GYMOS-MIG-014/synthetic-records.json): two gyms, all four roles, long names/biographies, more than 25 member/trainer/client rows, more than 21 audit rows, all session statuses, pack balances, coaching plans, charts, expenses, budgets and payroll. Passwords and hashes are excluded.
- [V1 preservation and cleanup](GYMOS-MIG-014/preservation.json): before/after Git state and source hashes, original generated-client hashes and `.next` file-metadata digest, removal of the owned container/databases, private ownership manifest and disposable checkout.
- [Independent evidence verification](GYMOS-MIG-014/verification.json): required screen/state coverage, image existence/signature/hash checks, assertions, cleanup and preservation results.

## Capture method and boundaries

The runner copies tracked V1 source into a new temporary directory outside the original checkout. It excludes `.env` files and never loads original configuration or records. Installed packages are read through a symlink; the stale installed Prisma client is replaced **inside the copy only** by a fresh client generated from the copied schema. All copied source imports point to that client.

The Task 007 ownership helper creates a new labelled PostgreSQL 17 container on a random loopback port. V1 uses its original single-database architecture with two synthetic gyms in one owned database; this is not a new claim of V2 physical tenant isolation. The other helper-owned databases remain disposable. Migration/seed/action writes target only this new database. Browser requests are restricted to the disposable loopback server. The signing key and login password are random runtime values and are not saved in evidence.

A current pay period and subscription are precreated for both gyms because V1 finance/subscription reads can otherwise insert them. The initial 26 page visits must leave all tracked persisted effect counts unchanged. Later fixture-only registration creates one forced-change identity per successful submit; duplicate/invalid/foreign-resource cases and scenario before/after counts are recorded separately. Profile access across gyms and member access to owner navigation are rejected by the original source. These checks document V1 reference behavior; they do not establish downstream V2 authorization or financial correctness.

The deterministic standard is UTC, `en-US`, device scale 1 and `2026-10-24T12:00:00.000Z`. Baseline screens use 1440×1000, 768×1024, 390×844 and 320×700. Conditional states use desktop and mobile; the drawer also has a 320px reference. The manifest records the computed V1 font stack. Match these inputs when adapting the portable fixture to future V2 screens.

Only documented capture adaptations are applied to the disposable copy: hide Next's development indicator; pin application/browser Date without freezing the compiler; disable Recharts animation; extend the password-success sign-out delay from 1.6 to 60 seconds; and add a fixture-only route rendering the original error, missing-resource and loading components. No fields, page layouts, business computations or displayed content are rewritten. Full-page images retain original overflow; focused overlay/chart crops retain the source component bounds. Temporary-password code elements are masked. Password inputs remain masked by the browser. Native alerts/confirms are recorded as text and dismissed; their screenshots show the page after dismissal, and are never presented as pictures of the native dialog.

## Coverage and source limitations

All 26 rendered references are required at all four widths: A01–A02, S01, O01–O14, T01–T06 and M01–M03. Additional captures cover all six finance tabs, all five settings tabs, all three member-profile tabs and all four client-profile tabs; dialogs, actual server validation errors, native form validation, loading/pending, credential handoff/Copy, empty/no-match/paging/long-content states, session status/warning variants, banners, drawer and notifications. R00/T00/M00 are verified as redirects and have no invented standalone images. X01–X03 render the unchanged authored components in a fixture route.

O14, O04 desk payments, billing/receipt labels and native payment alerts are **reference only**. Approved functionality-map §14.1 still hides these from the V2 MVP. V1's dollar formatting, proxy dashboard metrics, attendance/payment/rating labels, scheduled completion/no-show controls, negative macro inputs and green shift-error styling are observations to correct in their owning V2 tasks; screenshots do not approve their business semantics. V1 has no per-gym theme editor, so the two fixture gyms keep its Classic colors and distinct names; V2 theme isolation remains established by Task 011.

V1 cannot show an authorized trainer profile with no session relationship/history: the page requires a confirmed relationship and loads that trainer's sessions. Empty coaching-plan tabs are captured on a related client; empty history is captured in the separate trainer/member list views. There is no invented V1 gym-branded login, macro minimum-validation message, working receipt/download, or billing portal. Native browser validation bubbles and OS dialog chrome are not page content and are not claimed as captured.

## Verification

The accepted browser run passed in 9.1 minutes and the independent verifier passed with 369 image files, 26 baseline screens, 104 required baseline images, 168 named states, 120 passing persisted-effect/coverage assertions and zero captured page-wide horizontal overflows. The manifest contains no scenario failures or browser errors. The verifier recalculated every image SHA-256 digest and PNG dimensions, checked the required state matrix, confirmed the executed harness hashes, and generated the review gallery. Exact commands and exit codes are in [command-results.json](GYMOS-MIG-014/command-results.json).

The V1 preservation record proves the source remained at `058aa8532741c4cb84289589fd2cf89282882988`, with an empty Git status and all 148 tracked/source hash entries unchanged. Original generated-client hashes and the `.next` metadata digest also match. Cleanup removed the owned container, its four helper databases, ownership manifest and disposable checkout.

Visual review sampled desktop, tablet, mobile, 320px stress, redacted credential handoff, modal, chart and empty/error references through the generated gallery. Earlier incomplete attempts exposed a stale installed V1 client, a capture-clock transformation issue, short waits during cold compilation and paused-request cleanup races; fixes were confined to the runner and disposable copy, and those attempts are excluded from acceptance evidence.

No V2 product page, API, contract, authorization policy or persistent Prisma schema changes. Product builds/API suites are not required for this evidence-only task. The targeted browser run uses a real disposable database and original source actions, rather than a production database or imported fixtures. Task 065 still owns V1/V2 visual and accessibility parity after the remaining feature tasks are implemented.
