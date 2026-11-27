# GymOS release review

Use the [initial release runbook](INITIAL-RELEASE-RUNBOOK.md) to execute the release gates, the [release scope](../README.md#initial-web-release-scope) to decide what ships, and the [requirements review](GYMOS-REQUIREMENTS-REVIEW.md) for SRS and audit traceability. The [development checklist](AUDIT-REMAINING-CHECKLIST.md) tracks the wider backlog. This review records observed results and open acceptance work.

## Initial web release gates

| Gate | Evidence required on the release candidate |
| --- | --- |
| Owner-assisted membership and PT credit issue | Enroll a member, issue or renew a membership, and grant a PT pack after payment outside GymOS. Verify access dates, credit balances, actor and audit trail. Use the gym's external records for cash reconciliation. |
| PT delivery and payroll | Trace an owner booking and a member request through confirmation, credit hold, completion, earned revenue and fixed trainer pay. Exercise cancellation, rescheduling, no-show, corrections and payroll close. Include phone QR and browser virtual delivery when those flows are in the release scope. |
| Account access and gym boundaries | Test all four roles across two gyms. Include one-time credential handoff, recovery, logout and revocation, trainer access to assigned clients, and access/deletion for private coaching records. |
| Hosted operation and recovery | Verify deployed HTTPS and security headers, health, clean gym provisioning and credentials, installed migrations, scheduled-work recovery, and a restore to an isolated target. Agree and measure actual response time, capacity and recovery targets. |
| Client acceptance | Record the exact web/API revision and schema versions, the applicable test matrix, sanitized evidence, follow-ups and owner sign-off. Supply synthetic credentials privately. |

Run local browser acceptance at port 3002 using the [ordered scenarios](END-TO-END-MANUAL-SCENARIOS.md). The initial release uses manual sales. PayHere Sandbox and automated GymOS billing remain separately configurable review features. Physical entry and attendance, delegated staff roles, multi-branch, POS, equipment maintenance and localization are deferred. Mobile, wearables, engagement and AI remain on the broader backlog.

## Local verification record

- The November architecture cleanup passed both builds, workspace lint and type checks, unit and API health tests, and the owned backup/restore drill. The browser suite passed 44 scenarios. The opt-in synthetic PayHere callback and receipt scenario passed separately. The platform suite passed 36 of 37 in its initial run, and the Master migration case passed its focused rerun. The rebuilt manual fixture passed all four role logins across three synthetic gym databases. Hosted acceptance and owner sign-off remain open.
- Earlier local review verified independent workout template assignments, dated and weekly workout/meal views, training journal persistence, profile and shift updates, private measurements and photo access, membership overlap and renewals, single term PT allowances, and authorized CSV/PDF/Excel reporting. Repeat release-critical journeys on the pinned candidate.
- PayHere Sandbox membership success and a decline were observed on 19 November. Paid PT-pack confirmation and provider-delivered recurring subscription acceptance remain open. Phone QR elapsed-time acceptance, the full virtual session journey and the no-show deduction decision are tracked in the development checklist.
- For historical hosted smoke evidence, see [hosted deployment](HOSTED-DEPLOYMENT.md#historical-demo-evidence). For privacy and security acceptance, see [security review](SECURITY-REVIEW.md).

## Original QA audit findings

The [original audit](../gymos_v2_qa_audit_report.pdf) remains the source for finding IDs and reported measurements.

| Finding | Recorded remediation and remaining check |
| --- | --- |
| BUG-001, BUG-003 | Member/trainer registration and owner-assisted recovery have local regression evidence. Retest one-time handoff, retry, recovery eligibility and denied reuse on the candidate. |
| BUG-002, BUG-010, BUG-013 | Trainer actions, sampled text/focus contrast, civil date displays, copy and page theme were corrected. Spot-check both themes, narrow views, keyboard and zoom after deployment. |
| BUG-004, BUG-011 | Populated PT history is visible. Declined requests stay in history and are excluded from calendar counts. Compare across gym timezone boundaries. |
| BUG-005 | Plan edits apply to future terms, archived plans leave the picker, and referenced plans retain their history. Verify old and new term values side by side. |
| BUG-006A–C, NFR-01–03 | Local hardening headers, readiness and latency improvements have evidence. Record actual hosted headers, origin handling, warm/cold latency, capacity, uptime and recovery. |
| BUG-007, BUG-009 | New confirmations snapshot fixed trainer pay independently of pack value. Rates have field errors and historical obligations remain recorded. Verify deployed schema, defaults, overrides and payroll totals. |
| BUG-008, BUG-012 | Platform registry owner labels and application form recovery were corrected. Confirm whether the friendly unknown-gym page must return literal HTTP 404. |

## Manual issue log

| Scenario | Last recorded evidence |
| --- | --- |
| E01 | The November fix pass verified ordinary and refresh-only logout on port 3002. The browser preserves an uncertainty message when API revocation cannot be confirmed. |
| E04 | A previously pending synthetic reservation advanced to COMPLETE with the provisioning runner enabled. Replay reservation through credential handoff on the intended host. |
| E05 | The original manual session expiry on support exit was not independently reproduced. Recheck support exit, suspension and owner guidance in one candidate walkthrough. |
| E18 | The trainer client profile loaded after all historical session states were accepted. Later browser coverage exercised plan assignment, coaching and relationship scope. |

Record new findings by scenario ID with build revision, role and synthetic gym, reproduction steps, expected and observed outcome, impact, and sanitized evidence. Use **Pass**, **Fail**, or **Blocked** for execution status. Treat historical results as evidence for their recorded build.

Earlier client demo plans, QA remediation evidence, browser observations and November handoffs are available at Git revision `8b004bb`. For example, use `git show 8b004bb:docs/QA-AUDIT-PRIORITIZED-REMEDIATION-PLAN.md` for the full historical register.
