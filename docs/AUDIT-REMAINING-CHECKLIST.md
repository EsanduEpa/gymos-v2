# Remaining audit work

Reviewed on 16 November 2026 against the audit PDF, current source and recorded local test results. This is the recommended implementation order. Related tasks can proceed together when their dependencies are ready. Tick a task after its feature and acceptance checks pass.

The development starting point is commit `cced34c` on branch `codex/finalize-gymos-20261107`. The 36 unchecked tasks below form the remaining-work baseline for the next development cycle. Record the implementation commit and test result as each task is completed. GitHub Actions results for the forthcoming pull request are pending.

The original audit predates the recent fixes. Registration, recovery, plan editing, PT history, trainer pay and the reported interface defects have recorded local fixes. Dated workouts and meals, workout completion, dietary notes, body measurements, membership expiry warnings, trainer performance and some PDF/Excel downloads have also been added. Final hosted verification remains open.

The full original requirements and traceability file are still awaited. This checklist covers the gaps identifiable from the audit. Those files may add acceptance details or change task boundaries. Earlier exclusions in project documents record historical decisions. The current request is to finish all PDF requirements.

## 1. Confirm the missing details

- [ ] **1. Read the original requirements files when supplied.** Match every requirement to the current application and update this checklist. Confirm staff permissions, subscription rules and the expanded platform features.

## 2. Finish member and trainer features

- [ ] **2. Add reusable workout templates across members.** A trainer should be able to use a saved plan for several clients and edit each assignment independently.
- [ ] **3. Add member fitness goals and independent workout logs.** Members should record goals and exercise they do outside a trainer session.
- [ ] **4. Add private progress photos.** Include upload, authorized access, deletion and agreed storage/retention rules.
- [ ] **5. Finish progress comparisons and reports.** Add side-by-side photos and photos in the existing measurement/session report.
- [ ] **6. Finish trainer self-service controls.** Allow the required profile edits, marketplace visibility and AI preferences. Compare the existing shift approval flow with the original acceptance rules.

References include WRK-03–04, PRG-01–06, RPT-06, D1-1.1, D1-1.4 and D1-2.1.

## 3. Add staff access and payments

- [ ] **7. Add Manager and Front Desk accounts.** Implement invitations and the agreed permissions for each role, with tests that prevent access to another gym's data.
- [ ] **8. Complete the owner's subscription page.** Implement the agreed GymOS service plans, billing status, invoices and plan changes. Confirm exact subscription rules from the original documents.
- [ ] **9. Add online membership and PT-pack purchases.** Connect the selected payment provider in its free test environment and handle payment confirmation, failed payments and duplicate callbacks safely.
- [ ] **10. Add cash payment records, receipts and payment history.** Match paid amounts to memberships and packs. Confirm refund and reconciliation rules with the source requirements.

References include D3-1.3, D1-3.9, MEM-02–08, D1-1.8 and WF-M4.

## 4. Add messages and reminders

- [ ] **11. Add email account verification/recovery and welcome messages.** Complete the email OTP flow required by the original proposal.
- [ ] **12. Add external alerts and notification choices.** Cover payment failures, renewals, bookings, new-member prompts and the required email, SMS, WhatsApp or push channels. Members and trainers need the relevant preferences and duplicate prevention.
- [ ] **13. Add private member–trainer messaging.** Include access restrictions and the agreed reporting/moderation behavior.
- [ ] **14. Add trainer ratings and reviews.** Limit reviews to eligible members and qualifying completed sessions.
- [ ] **15. Complete virtual-session booking and attendance.** Define how remote sessions start, end and affect credits and trainer pay.

References include AUTH-03, MEM-02–07, D1-1.6, D1-1.9, D1-2.4, D1-2.6 and D1-2.7.

## 5. Add gym entry and attendance

- [ ] **16. Connect fingerprint enrollment and gym entry.** Integrate the required ZKTeco device or a suitable simulator and verify the audit's under-two-second check-in target.
- [ ] **17. Add QR fallback and staff-recorded attendance.** Record entry, exit, time spent and denied access, including alerts and owner access logs.
- [ ] **18. Connect attendance to the existing screens.** Show today's gym visits, monthly physical attendance and the day's workout after check-in.
- [ ] **19. Complete QR-based PT timing.** Verify starting and ending sessions, timing rules, credits and trainer pay against the existing session controls.

References include BIO-01–07, WRK-04, RPT-01–02, D1-1.2–1.3, D1-2.2, D1-3.8, WF-M2–M3 and WF-T1.

## 6. Finish reporting and member engagement

- [ ] **20. Add the missing revenue breakdowns.** Show income by membership tier and new memberships versus renewals, with trends.
- [ ] **21. Add the missing member analytics.** Show how applicants become active members, members who stop returning and patterns in member retention.
- [ ] **22. Extend PDF and Excel to all required reports.** Verify totals, long reports and the required languages. Existing downloads cover revenue, expenses, payroll and audit. Sinhala/Tamil PDF rendering is still open.
- [ ] **23. Add accounting integration and cash forecasts.** Agree the mappings for Xero/QuickBooks and calculate forecasts using the agreed payment rules.
- [ ] **24. Add streaks, challenges, leaderboards and owner settings.** Implement the community and reward rules from the original requirements.
- [ ] **25. Add campaigns to bring inactive members back.** Include eligibility, contact preferences and tracking of results.

References include RPT-04–05, D1-1.7, D1-3.1–3.2, D1-3.5–3.6 and WF-O3–O4.

## 7. Build the expanded features

- [ ] **26. Add wearable integrations and recovery indicators.** Define data permissions and supported devices, then add the required recovery and overtraining information and alerts.
- [ ] **27. Add member AI coaching and owner AI insights.** Include trainer/owner controls, flagged conversations, approved data access and testing of the generated guidance.
- [ ] **28. Add point-of-sale and equipment maintenance features.** Follow the detailed Phase 3 workflows when supplied.
- [ ] **29. Add multiple-branch management.** Implement the required shared and branch-specific views and permissions.
- [ ] **30. Add the required native mobile and gym-branded apps.** Verify member and trainer workflows on the required devices.
- [ ] **31. Add Sinhala and Tamil.** Cover application screens, validation, notifications and exports required by the source documents.

References include D1-1.4–1.5, D1-2.3–2.4, D1-3.7, NFR-06, WF-M5 and WF-O5.

## 8. Verify the final build and prepare the handoff

- [ ] **32. Verify protection of personal information.** Extend and verify encryption for all required personal-data fields and establish recoverable key handling. Encryption of the new coaching records is already implemented.
- [ ] **33. Finish the final review checklist.** Retest all original defects and added features, permissions, mobile layouts and reports. Resolve whether the unknown-gym page must return a technical HTTP 404, since its friendly error page currently returns HTTP 200.
- [ ] **34. Prepare a reproducible client review package.** Include the exact source version, database changes, setup steps, synthetic test accounts supplied privately and an updated requirement-by-requirement result sheet.
- [ ] **35. Complete hosted checks when hosting work resumes.** Verify security headers, health monitoring, gym creation, database upgrades, scheduled tasks and payroll on the exact review version. Measure the under-300-ms API target, 500+ concurrent-user capacity, 99.5% uptime, daily backups and recovery within four hours.
- [ ] **36. Deliver the finished review package to the client's developer.** Supply testing instructions and the remaining verification status. Record their findings and fix confirmed issues.

References include BUG-006, BUG-007, BUG-012, NFR-01–03 and SA-01. Hosted work is paused at the user's request. Current local evidence does not establish the hosted targets. Free service/test allowances govern integration and hosting choices. Any requirement that exceeds available free capacity needs a decision before spending.

## Evidence

- [Original audit](../gymos_v2_qa_audit_report.pdf), particularly pages 3–7 and 17–18.
- [Current developer review and recorded checks](CLIENT-REVIEW.md).
- [Defect remediation and verification record](QA-AUDIT-PRIORITIZED-REMEDIATION-PLAN.md#12-evidence-and-completion-record).
- [Capability backlog](V2-FUTURE-CAPABILITIES.md).
