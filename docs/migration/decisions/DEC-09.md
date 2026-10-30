# DEC-09 — Coaching privacy, metrics, exports and refresh guarantees

- Status: **Approved by project owner Esandu — 30 October 2026.**
- Prepared: 30 October 2026, Asia/Colombo.
- Resolution task: [GYMOS-MIG-085](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-085).
- Accountable reviewer: Esandu, project owner; owner explicitly accepts the decision-review responsibilities.
- Authority: Master Plan; Database Map DB10/DB12; Functionality Map F-D12/D15/D17/D18/D19.

## Preserved approved requirements

Health notes remain tenant-owned and visible only to the owner and a trainer with a confirmed relationship to that member. A member's `clientId`/query input does not prove a relationship. V1's unused `BodyMetric` read and `ProgressPhoto` model do not create a progress feature. Workout and meal builders remain trainer-only; the owner explicitly added member viewing of assigned workout and meal plans to the first release on 30 October 2026. Global inbox, push, and a new progress portal remain outside scope. V1 notification scope is selected gym. Exports stay within the finance/payroll all-filtered-under-cap and audit-visible-page scopes; session export preserves the currently filtered day scope.

## Proposed decision

| Area | Exact proposed default |
|---|---|
| Confirmed trainer/member relationship | A trainer may read the member's T03 profile, health notes and plans only while the same-gym identity is linked to that trainer and member and either a same-gym session between them is `SCHEDULED` or `ACTIVE`, or their most recent completed session was within the last 90 days. Owner-confirmed 30 October 2026: completed-session-based access expires 90 days after the last completed session; a new confirmed booking can restore access. `PENDING_CONFIRMATION`, `DECLINED`, `CANCELLED` and `MISSED` alone do not grant access. Recheck this predicate on every request; a revoked/deactivated identity or tenant actor denies access even if old sessions remain. Owners retain gym-scoped access. Owner-confirmed first-release scope includes authenticated member pages/APIs to view only their own assigned workout and meal plans; builders remain trainer-only. Assignment, publication and historical visibility contracts must be reconciled in the migration tasks before implementation. |
| Health and session notes | `healthNotes` is returned only in explicit owner and confirmed-related-trainer projections, never in directory/list/export/notification/audit/support-summary DTOs. Session notes remain visible to the member and the authorized owner/assigned trainer as in the V1 session cards; edit only by assigned trainer or owner while the session is `COMPLETED`, matching the rendered T01 control. Normalize line endings; maximum 4,000 Unicode code points; reject unknown fields and over-limit text with a field error. Empty string clears notes only when submitted intentionally. |
| Relationship revocation | Losing all qualifying scheduled/active sessions and reaching 90 days after the last completion removes trainer read access on the next request. At exactly completion time plus 90 elapsed days access expires; a confirmed booking restores eligibility. Use server UTC instants for this expiry. Deactivation, gym suspension, revoked access or broken reciprocal actor binding denies access regardless of session history. Do not copy health text into Master, global audit, notification, search index or logs. |
| Workout plan bounds and units | Preserve the rendered fields: plan title 1–120 chars; 1–100 exercise rows; exercise name 1–120 chars; sets integer 1–100; reps nullable integer 1–1,000; weight nullable decimal 0–1,000 kg to at most 3 fractional digits; duration nullable integer 1–1,440 minutes; notes nullable up to 4,000 code points. `0` weight/reps is preserved only where the field permits it; null means omitted. Duration/notes may be stored if accepted by the existing action contract, but no new visible controls are invented. |
| Meal plan day mapping | Store canonical ISO weekday `1=Monday … 7=Sunday` (not JavaScript's Sunday-zero convention). The V1 builder initializes rows to numeric `1` and offers no day selector; its persistence schema comment says `0..6`. The V2 form should display Monday as the preserved default and make day selection explicit only if the approved UI task accepts that necessary correction. Migration/API adapters must reject `0`, map no existing customer rows (fresh V2 only), and never silently reinterpret `1` as Sunday. |
| Meal plan bounds | Plan title 1–120 chars; 1–100 entries; food description 1–500 chars; one of the six V1 values `Breakfast`, `Lunch`, `Dinner`, `Snack`, `Pre-Workout`, `Post-Workout`; calories nullable integer 0–100,000 kcal; protein/carbs/fats nullable decimal 0–10,000 g with at most 2 fractional digits. All values are nonnegative; explicit zero is distinct from null. Live totals are derived from the draft and recomputed/validated by the server on save. |
| Profile history windows | T03 shows the most recent 2 workout plans, most recent 2 meal plans, and most recent 10 related sessions, stable sorted by `createdAt`/`scheduledAt` descending then ID descending. The DTO includes `hasMore` for each capped section; no count or empty state implies there are no older rows. Do not add BodyMetric/ProgressPhoto history to the screen. |
| Dashboard metric windows/denominators | O01 uses gym-local current-day bounds and explicit `asOf`/start/end instants. Preserve the source formulas while clarifying labels: “Members in Gym” is the count of `ACTIVE` PT session records scheduled today (not a distinct-member count); “Active Sessions” is all `ACTIVE` PT sessions without a day filter; “Trainers On Floor” is distinct trainers with any PT session scheduled today, regardless of status. These are session-derived proxies, never physical attendance. Today's revenue sums the approved operational earning rows created/recognized in the gym-local day; the O01 chart uses the same day in two-hour buckets from 06:00 through 22:00. O11 preserves the source windows: trainer utilization uses sessions scheduled in the trailing 30×24 hours against current shift length ×22 working days (label as an estimate); peak-hour chart uses sessions in the trailing 30×24 hours for 06:00–20:00 and average count per 30 days; member growth uses six calendar-month buckets including the current month, based on member creation date. Every response returns exact gym-local/UTC bounds, timezone, `asOf`, source count, numerator/denominator and formula. Never fabricate ratings or body metrics. |
| Selected-gym notification polling | Keep the V1 20-second bell poll. Poll only the active gym recipient scope; default list is 5 and hard maximum 100 per the existing proposed contract. Mark-one/all writes are explicit commands. Stop timers on unmount, logout and gym/role change; abort in-flight reads and ignore any response whose identity/gym/role key no longer matches. Poll failure retains the last known read state with an accessible stale/error indicator. No push or cross-gym global inbox in MVP. |
| Cross-role refresh guarantee | For active owner, trainer and member screens that display session/credit/earnings/notification state, the proposal is read-after-success immediately for the initiating actor and a maximum 30-second stale window for another active browser session. Focus/visibility return triggers an immediate revalidation. Use version/asOf values and discard older responses. Do not promise real-time delivery or guarantee refresh while a device is offline/background-suspended. Notification bell remains at its 20-second V1 interval. |
| CSV row cap and snapshot | `all-filtered` financial/payroll/session exports and audit visible-page export are capped at 10,000 data rows per request and 25 MiB uncompressed UTF-8. Exceeding either returns a stable 422 `EXPORT_LIMIT_EXCEEDED` with allowed scope/limit and no partial file. A tenant export reads one repeatable-read snapshot and emits `asOf`; audit export uses the page visible in O13, not all filtered audit events. Finance/payroll remain all-filtered under the cap; O08 remains all rows matching the selected day and its filters. No asynchronous export/job table is proposed at this cap. |
| CSV privacy and spreadsheet safety | Strict kind/column allowlists; same authorization and filters as the source page/API; no tokens, passwords, hashes, DB identifiers, health notes, raw JSON or unrelated tenant data. Quote/escape RFC 4180 fields. Prefix formula-leading cells (`=`, `+`, `-`, `@`, tab or CR) with an apostrophe before CSV quoting. Use UTF-8 BOM, no-store, safe filename/content disposition, and never place credentials in URL or file. Record only a safe audit event if the approved export policy requires it; audit event does not contain row contents. |

These numbers and semantics are approved under the final owner review disposition below, incorporating the owner amendments. Future changes require recorded owner approval; implementation remains separately verified.

## Alternatives and tradeoffs

| Alternative | Tradeoff versus proposal |
|---|---|
| Any historical trainer/member session grants indefinite relationship (rejected) | Easier to retain access, but canceled/declined/stale relationships could expose health data indefinitely. The active/confirmed state set is narrower and rechecked per request. |
| Persist zero-based meal days to match the schema comment | Avoids a migration rename, but V1 UI submits `1` as its default and has no selector; interpreting this as Sunday silently changes meaning. ISO weekday makes boundary semantics explicit. |
| Unlimited profile/CSV results | Fewer paging controls, but unbounded health/report reads can exhaust the tenant DB or disclose more than the visible UI. Bounded windows/caps are explicit. |
| Real-time cross-role push | Faster apparent synchronization, but requires device/subscription lifecycle and delivery guarantees beyond V1. Poll/revalidate gives bounded active-session freshness without new push scope. |

## Schema/API impact

- Health notes stay only in tenant `Member`; no Master copy and no global health search index. DTO types are separate for owner, confirmed trainer, member, support, notification and export consumers.
- Workout/meal aggregate request schemas enforce the bounds above; plan children save transactionally; metric totals are derived rather than stored as trusted client totals.
- Relationship authorization is a service policy over same-tenant typed actors and qualifying sessions; no cross-database FK or browser-supplied actor proof.
- C31–C33/C56/C62 or reviewed successor contracts include `asOf`, timezone/period bounds, stable ordering, caps, `hasMore`, and full-filter totals where applicable.
- Poll/cache keys include identity, current gym and role; selected-gym changes cancel/ignore stale responses. No global notification contract is added.
- Export uses one tenant snapshot, allowlisted fields, bounded rows/bytes, safe CSV encoding and no-store response.

## Expected tests

1. Related same-gym trainer can read approved health/profile fields; pending-only, declined-only, canceled-only, missed-only, unrelated, foreign-gym and deactivated actors cannot.
2. Owner and trainer projections differ only by approved fields; recursive forbidden-key scans find no health notes in list, audit, notification, CSV, support, or unauthorized responses.
3. Workout/meal row counts at 0/1/100/101, boundary text/numbers, zero versus null, malformed enums, excessive precision and unknown fields produce exact expected outcomes.
4. Meal day 1 round-trips as Monday; values 0 and 8 reject; changing the UI day preserves the exact ISO weekday through save and read.
5. T03 returns latest 2 plans/10 sessions in stable order and `hasMore` correctly for 0, exact cap and over-cap fixtures.
6. Dashboard metrics include actual time bounds/timezone/asOf and exact distinct-session-derived counts; fixtures with no sessions return zero and no fabricated attendance/rating.
7. Bell polls only selected gym every 20 seconds; a gym switch/logout cancels or ignores stale response; poll failure does not clear a known unread count.
8. Cross-role successful mutations become visible immediately to the initiator and within 30 seconds to an active polling/focused client; older version responses never overwrite newer data.
9. Export at exactly 10,000 rows and 25 MiB succeeds if both limits are respected; either limit exceeded returns 422 and no partial CSV. Filters and snapshot totals match the authorized source read.
10. CSV cells beginning with formula markers are neutralized before RFC escaping; CR/LF, commas, quotes, Unicode and BOM are tested; filenames and headers contain no user-controlled path or token.

These are future tests. No app, DB, browser, export or push behavior is claimed as implemented or runtime-verified by this proposal.

## Approval record

Project owner Esandu requested finalization on 30 October 2026 after discussing the proposals and confirming the business amendments. Record owner authorization to finalize these proposals with those amendments. No separate accountable reviewer approval is claimed; reviewer sign-off remains pending.

## Project-owner clarification — 30 October 2026

The owner selected a 90-day completed-session privacy window and explicitly included member login/viewing of assigned workout and meal plans in the first release, together with PT sessions. These instructions supersede earlier member-delivery exclusions in migration documents. The remaining maps/task acceptance criteria require scope reconciliation before implementation; no new feature is claimed complete and the 88-task inventory has not been re-estimated. Other DEC-09 details and reviewer sign-off remain pending.

## Finalization boundary — 30 October 2026

Owner authorization is recorded from this conversation. Historical proposal/preparation statements above describe earlier checkpoints. This document approves policy, not feature implementation; the final owner review disposition supersedes the earlier separate-reviewer gate. See [finalization record](../SEGMENT_01_FINALIZATION.md) for current verification and scope.

## Final owner review disposition — 30 October 2026

Esandu explicitly stated that decision review will be performed by the project owner and that this is acceptable. This supersedes the separate-reviewer gate and historical pending-review statements above. DEC-09 is approved under owner review with the recorded amendments. No independent specialist review is claimed. This approves policy, not implementation or production release.
