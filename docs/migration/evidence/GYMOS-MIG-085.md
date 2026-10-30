# GYMOS-MIG-085 — DEC-09 decision evidence

Status: **Blocked awaiting project-owner and accountable reviewer approval.** A concrete proposal is available in [DEC-09](../decisions/DEC-09.md).

- Revision reviewed: `b22bcf6af8ca5e66fe098922629bb58228a251fd` on `main`.
- Environment: local V2 checkout; read-only source inspection plus documentation changes.
- Inputs reviewed: task 085, decision register, Database Map DB10/DB12, Functionality Map D12/D15/D17/D18/D19 references, V1 coaching/member/session/dashboard/notification/export sources, Segment 01, and current V2 API/web foundation.
- Observed source: V1 T03 reads the latest two workout plans, latest two meal plans and ten sessions; health notes render in the trainer 360 view; its action relationship helper uses scheduled/active/completed sessions. The meal builder submits `dayOfWeek: 1` by default while the V1 schema comment states `0..6`; no day selector is rendered. NotificationBell polls every 20 seconds; owner dashboard refreshes every 30 seconds. No V2 coaching, metrics, notification, export or cross-role refresh feature implementation was found in the inspected foundation.
- Proposal coverage: relationship and health-note projections, note and builder bounds, ISO meal-day mapping, bounded history, metric windows/denominators, selected-gym polling, active cross-role freshness, CSV cap/snapshot and formula safety.
- Verification on 30 October 2026: `git diff --check` exited 0; local Markdown link audit over 49 migration Markdown files found no missing targets; task-coverage audit found 88/88 unique task IDs and 29/29 unique V1 route IDs. The segment/DEC-09/evidence files have no trailing whitespace. No app/database/browser test applies to this decision-only task. Proposal test examples are future acceptance requirements.
- Not performed: application/schema change, export, notification poll, provider interaction, project-owner approval, deployment, V1 modification, or customer-data access.

After explicit approval, record actual reviewers/date/result in DEC-09; update the decision register, task spec, tracker and affected segment handoffs together. Dependent implementation tasks may use only the approved result.
