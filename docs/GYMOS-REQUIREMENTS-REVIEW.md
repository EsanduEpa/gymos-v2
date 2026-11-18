# GymOS requirements review

Reviewed 16 November 2026. The product owner selected the narrower GymOS scope, the current four roles and fixed trainer pay. Use the [ordered checklist](AUDIT-REMAINING-CHECKLIST.md) for development. Use the source references below to verify acceptance details when working on a task.

| Source | How it was used |
| --- | --- |
| GymOS SRS v1.0, working draft dated 2 August 2026 | Main functional reference. Sections 5, 7, 9, 12, 16, 23 and 31 cover scope, roles, requirements, business rules, integrations, targets and open questions. |
| GymOS Role Function List v2.0 | Cross-check for member, trainer and owner workflows. Pages 7–9 describe earlier delegated access and GymOS service billing. |
| FitCore Software Project Proposal v1.0, May 2025 | Earlier proposal used to identify acceptance details and conflicts. Sections 4–6, 11 and 13 cover features, expansion, security and acceptance targets. |
| GymOS V2 QA audit, 11–12 November 2026 | Original findings and audit identifiers. The new review uses source inspection and recorded local evidence for current status. [Audit report](../gymos_v2_qa_audit_report.pdf) |

The standalone Project Scope & Workflow Map (Doc 3) and `rtm_baseline.md` named on the audit's first page were unavailable in the workspace. The SRS incorporates Doc 3 and includes its own traceability table in §32. This review maps the SRS's 81 functional IDs and gives current work items. The auditor's separate 91-item scorecard still needs its companion baseline for a line-by-line recalculation.

## Roles and trainer pay

| Role | Working permission boundary |
| --- | --- |
| SuperAdmin | Platform administration and current scoped support. The SRS also describes acting as a gym Owner across gyms. Confirm the specific operational actions and access controls before expanding existing support permissions. |
| Gym Owner | Manage operations, enrollment, access overrides, trainers, payroll, finances, audit and the GymOS subscription for their gym. |
| Trainer | Manage own schedule, earnings, profile and assigned clients. Access client plans and progress within the assigned relationship. Level 1 and Level 2 determine pay settings. |
| Member | Manage own profile, plans, records, sessions, membership and payments. Use their assigned trainer's communication and coaching functions when available. |

Manager and Front Desk roles are deferred. Owners perform the gym-level staff actions in the SRS and receive access alerts. The earlier delegated-manager limits are recorded in FR-080 and BR-085 for future review.

Current trainer pay uses the configured fixed session amount or trainer override, with the existing off-shift adjustment. The app saves the amount at confirmation and pays it on qualifying completion. Continue to test zero pay for no-shows and late cancellations and preserve historical pay. The fee-percentage formula in FR-044, FR-051 and BR-041–044 is deferred by the product owner's decision.

## GymOS subscription rules

FR-079, BR-087, UC-15 and SCR-29 describe recurring GymOS service billing at the gym level. The Owner needs to see tier and billing status, request an upgrade or downgrade and update billing details and payment method. A failed or lapsed payment triggers an Owner notice and a seven-day grace period. Resolving billing during that window restores full access. Verify boundaries at the start and end of the grace period and test each gym independently. Exact features gated after seven days, reactivation after the grace period, invoice requirements and delegated platform actions depend on the billing decision below.

FR-018–020 cover separate member purchases, renewals and payment history. A failed attempt can be retried and must leave membership and packs unchanged. A confirmed purchase updates the intended entitlement and issues confirmation. Reuse the current settlement and entitlement protections when adding payment events.

## Decisions to resolve

| Before checklist task | Decision still needed | Source |
| --- | --- | --- |
| 5–6 | Agree Owner access to health metrics and photos, trainer and member permissions, upload limits, private storage, consent and retention. FitCore includes admin progress reports and one-hour signed links. The SRS leaves detailed access and retention terms open. | FR-007–008, FitCore PRG-02–06 and §11 |
| 8–9, 22–23 | Confirm payment gateway, saved payment methods, cash/bank transfer, refunds, receipts and reconciliation. PayHere appears in both documents. Confirm options for Stripe/iPay and Xero/QuickBooks. Agree how to report payment-date cash receipts and the current daily earned allocation before changing recognition. | FR-018–020, FR-066–070, BR-063–064, SRS Q-03, FitCore MEM-02–08 |
| 10 | Choose the tier names, prices, billing frequency, feature entitlements, upgrade/downgrade effective dates and exact post-grace restrictions and restoration. The Role Function List proposes Starter/Growth/Pro/Enterprise. The SRS also records an earlier FitCore tier catalogue and leaves the choice open. | Role Function List §§3.1, 3.9, FR-079, UC-15, SRS Q-09 |
| 11–12 | Confirm the kiosk vendor, fingerprint/face support, device authentication, QR/offline fallback and check-out rules. FitCore specifies ZKTeco fingerprint with a QR fallback, optional checkout and a sub-two-second target. | FR-010–013, FR-077–078, SRS Q-06, Q-11, FitCore BIO-01–07 |
| 14 | Confirm automatic no-show timing and any distinct trainer or Owner completion rules. SRS FR-017 links a no-show to the missed start. Current code uses a 15-minute eligibility grace. | FR-017, FR-036–039, FR-052, FR-064 |
| 16–17 | Confirm email OTP and activation delivery, channel choices and whether WhatsApp is included. SRS specifies a 30-day membership expiry push. FitCore calls for WhatsApp/SMS at 7, 3 and 1 days. The 30-day onboarding journey is separate. | FR-001–002, FR-009, FR-012, SRS Q-04, Q-10, FitCore AUTH-03, MEM-05 |
| 28–31 | Confirm mobile version/offline support and the first wearable and AI providers, consent, permitted data and access to stored AI conversations. GymOS Phase 3 includes wearables and AI. FitCore's AI plan-adjustment extension and white-label apps are deferred with the other FitCore-only premium work. | SRS §§5, 16, 20 and 22.1, FR-006, FR-025–027, FR-035, FR-040, FR-074–076, FitCore §§5–6 |
| 32–35 | Verify the scope of data protection and retention, operational SuperAdmin permissions, hosted performance and recovery requirements. The audit benchmarks are API p95 under 300 ms, 500+ concurrent users, 99.5% monthly uptime, daily backups and recovery under four hours. The FitCore proposal also gives 30-day backup retention, TLS 1.3 and AES-256 for PII and biometric data. SRS §§19–23 leave many technical targets open. Record the agreed targets and verify them when hosting resumes under the free-only constraint. | SRS §§7, 19–23, Q-07, Q-13, FitCore §5, audit NFR-01–03 |

## SRS functional requirements matched to the checklist

The status reflects current source and recorded local checks. Acceptance on the exact client review build belongs to checklist items 33–36.

| SRS IDs | Current implementation or remaining requirement | Checklist |
| --- | --- | --- |
| FR-001, FR-056 | Owner registration and handoff exist. Paid activation, external credential delivery and onboarding sequence remain. FR-056 duplicates FR-001. | 9, 16, 18 |
| FR-002–004 | Web sign-in, member health notes and profile photo edits, and term and pack information exist. Complete mobile sign-in and renewal views. | 4, 7, 16, 28 |
| FR-005–008 | Member fitness goals exist, along with basic member-entered measurements and authorized trainer reads. Wearable connections, progress photos, remaining measurement fields and trainer measurement entry remain. | 3, 5, 6, 29 |
| FR-009 | Add scheduled onboarding and track completion and skips. | 18, 24 |
| FR-010–013 | Membership records exist. Biometric access, overrides, expiry notifications for entry, check-in history and streaks remain. | 11, 12, 17, 25 |
| FR-014–017 | Booking, lifecycle and cancellation controls exist. Finish QR timing, reminders and automated no-show handling. | 13, 14, 17 |
| FR-018–020 | Membership and pack entitlements exist. Add purchases, renewal, payment methods and history. | 7–9 |
| FR-021–022 | Assigned workout and meal views have local evidence. Finish home-after-check-in and mobile checks. | 12, 28 |
| FR-023–025 | Solo exercise and daily nutrition logs exist. Add the wearable-based wellness score and recovery indicator. | 3, 29 |
| FR-026–028 | Add plan-aware AI conversations, check-in prompts and private trainer messaging. | 19, 30 |
| FR-029–030 | Directory and PT request exist. Add the marketplace eligibility, response window and moderated reviews. | 20 |
| FR-031–033 | Add streaks, milestone rewards, challenges and opt-in leaderboard. | 25 |
| FR-034–035 | Trainer profile editing, availability and shift requests with Owner approval exist. Add marketplace visibility and per-client AI controls. | 4, 20, 30 |
| FR-036–039 | Scheduling, manual lifecycle, completed-session notes and rescheduling exist. Finish live timing, notes coverage and reminder behavior. | 13–14 |
| FR-040–042 | Assigned client roster and profile exist. Add wearable data and alerts, streak and churn context. | 24–26, 29 |
| FR-043 | Request accept/decline exists. Complete marketplace expiry and introductory-session workflow. | 20 |
| FR-044–046, FR-051 | Fixed trainer pay and payroll exist. Verify agreed model, shift breakdowns, itemization and period handling. The percentage formula is deferred. | 15 |
| FR-047–048 | Public trainer detail exists. Add marketplace switches and the full virtual delivery workflow. | 20–21 |
| FR-049–050 | Gym settings and membership plan editing/retirement exist. Verify remaining profile fields and included PT allowances. | 7, 24 |
| FR-052–055 | Cancellation settings, trainer setup and deactivation exist. Verify accepted policies and account lifecycle, then add engagement settings and message templates. | 4, 14, 20, 25–26 |
| FR-057–059 | Member list, details and suspension exist. Add churn context, access overrides, onboarding progress and manual outreach. | 12, 24–26 |
| FR-060 | The trainer submits a recurring shift and the Owner approves or declines it. Approved hours affect new confirmations. | 4 |
| FR-061–065 | Basic trainer performance, PT oversight and correction exist. Add remaining metrics, visibility controls, live status and session-log export. | 13–15, 20, 22–24 |
| FR-066–070 | Revenue, expenses, budget, deferred value, P&L and selected exports exist. Extend reporting, comparisons and external exports. | 22–23 |
| FR-071–073 | Owner operations and some analytics exist. Add occupancy, retention, onboarding, engagement, adoption and attendance reporting. | 12, 24–26, 29 |
| FR-074–076 | Add owner AI Q&A, weekly management reports, anomaly checks and forecasts. | 23, 31 |
| FR-077–078 | Add live access logs, denial reporting, device settings and biometric re-enrollment. | 11–12 |
| FR-079 | Owner subscription screen is a placeholder. Implement the agreed service billing and grace-period rules. | 10 |
| FR-080 | Manager invitation is deferred. Keep the four-role model. | 1, 33 |
| FR-081 | Audit history and selected downloads exist. Complete Owner action coverage and full authorized gym export. | 27 |
