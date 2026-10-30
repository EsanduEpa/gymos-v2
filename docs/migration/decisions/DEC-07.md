# DEC-07 — Gym time, term boundaries and scheduling input bounds

- Status: **Blocked — concrete proposal awaiting project-owner approval.**
- Prepared: 26 October 2026, Asia/Colombo.
- Resolution task: [GYMOS-MIG-083](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-083).
- Accountable reviewer: project owner with Scheduling/Product + Database.
- Authority: Master Plan; Database map DB03/DB04/DB05; Functionality map F-D01/F-D06/F-D08.

## Preserved approved requirements

The gym's IANA timezone controls local dates and schedule display. Membership terms cannot overlap. Cancellation exactly at the cutoff is free; a session can be marked no-show starting exactly 15 minutes after scheduled start. A credit valid when held remains valid for that booking after its pack later expires.

## Proposed decision

| Area | Exact proposed default |
|---|---|
| Term boundary | Membership and pack validity use half-open gym-local dates `[startDate, endDateExclusive)`. `endDateExclusive` must be after `startDate`; the UI's last covered day is one day earlier. Renewal begins at the prior `endDateExclusive`. |
| Session storage | Persist start/end as UTC instants plus the applied gym timezone and relevant policy versions. APIs accept ISO instants; owner scheduling UI may submit local date/time with zone and explicit offset. |
| DST gaps | Reject a local time that does not exist in the selected IANA zone with a field error and valid alternatives. Never shift it silently. |
| DST ambiguity | Require an explicit UTC offset when a local time occurs twice. Reject an offset that is not valid for that local time/zone. |
| Overnight shifts | Allowed. Recurring local shifts with end time less than or equal to start time end on the next local day. The resolved duration must remain within the maximum. |
| Duration precision | Session and shift times use one-minute precision. PT session duration is 15–480 minutes inclusive. Recurring trainer shift duration is 15–960 minutes inclusive. |
| Start tolerance | A trainer may start a confirmed session from 15 minutes before scheduled start until scheduled end. Starting earlier or after scheduled end fails; the owner must reschedule or apply the later lifecycle action. |
| Cancellation/no-show | Cancellation at `scheduledStart - cancellationWindow` is free; any later cancellation follows the late policy. No-show is allowed at `scheduledStart + 15 minutes`, inclusive, if the session has not started/completed/cancelled. |
| Input maxima | Plan/pack duration: 1–3,650 days; pack credits: 1–1,000; cancellation window: 0–10,080 minutes (7 days); schedule horizon: 365 local days; recurring pattern generation: at most 366 occurrences per request. |
| Pack eligibility | At confirmation, the pack must cover the session's gym-local start date and have an available credit. Later pack expiry does not invalidate the hold. |
| Pack order | Choose the eligible pack with earliest `endDateExclusive`, then earliest purchase/creation instant, then lexicographically smallest stable pack ID. Explicit valid owner/member selection overrides automatic order. |
| Overlap | Session/shift ranges are half-open instants `[startAt,endAt)`; touching boundaries do not overlap. Database constraints/transaction locks, not pre-read alone, enforce conflicts. |

## Alternatives and tradeoffs

| Alternative | Tradeoff versus proposal |
|---|---|
| Inclusive stored end dates | Matches some UI wording, but makes durations, renewal and range constraints more error-prone. The UI can still show the last covered day. |
| Silently choose an offset during DST ambiguity | Easier input, but can book the wrong instant. Explicit offset makes intent auditable. |
| Disallow overnight shifts | Simpler validation, but excludes common late shifts. A maximum duration bounds them safely. |
| FIFO pack selection | Simple, but may waste a pack that expires earlier. Earliest expiry is predictable and preserves later-valid credits. |

## Schema/API impact

- Date-only eligibility fields use `startDate` and `endDateExclusive` names and database non-overlap constraints.
- Time-bound records store UTC instants, gym timezone and immutable applied versions.
- Local-time DTOs require zone and an offset when ambiguous and return structured DST errors.
- Range exclusion/locking uses half-open semantics consistently.
- Confirmation stores the chosen pack/credit and its allocation; later reads never reselect it.

## Expected tests

1. A term is active on its start and last covered local date, inactive at `endDateExclusive`; renewal at that boundary does not overlap.
2. DST gap input rejects and ambiguous input rejects without a valid explicit offset; both valid offsets produce their distinct UTC instants.
3. An overnight shift resolves to the next day and respects the duration maximum.
4. Start at exactly 15 minutes early and no-show at exactly 15 minutes late succeed; one minute outside the allowed boundary fails.
5. Cancellation exactly at cutoff is free and one instant later is late.
6. Auto-selection uses earliest expiry and stable tie-breaks; a held credit remains attached after pack expiry.
7. Touching half-open sessions succeed while true overlap is rejected under concurrency.

These are future implementation tests. No application behavior is claimed by this proposal.

## Approval record

Awaiting the project owner's explicit approval or requested changes. Until then DEC-07 and GYMOS-MIG-083 remain blocked.
