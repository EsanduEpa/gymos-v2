# Remaining GymOS work

Updated 16 November 2026 after reviewing the audit, the GymOS SRS v1.0 working draft, the GymOS Role Function List v2.0 and the FitCore proposal. The application baseline for this review is commit `cced34c`. Tick a development task after its acceptance checks pass and record the commit and test result.

The local build already covers the original registration and recovery fixes, membership plan editing, PT history, dated workouts and meals, exercise completion, dietary notes, basic measurements, membership expiry warnings, basic trainer performance and four PDF/Excel exports. The checklist covers the unfinished parts. [Developer review and local evidence](CLIENT-REVIEW.md)

## 1. Confirm the requirements

- [x] **1. Review the supplied requirements and update the checklist.** The confirmed scope and remaining decisions are recorded below. The SRS functional requirements are mapped to the work in the [requirements review](GYMOS-REQUIREMENTS-REVIEW.md).

### Confirmed decisions

| Topic | Current decision |
| --- | --- |
| Product scope | Use the narrower GymOS SRS scope. Defer POS, equipment maintenance, multiple branches, Sinhala/Tamil localization and other FitCore-only premium extensions such as white-label apps. The standard member and trainer mobile workflows and GymOS Phase 3 wearables and AI are in scope. |
| Staff roles | Keep SuperAdmin, Gym Owner, Trainer and Member. L1/L2 are trainer pay levels. The Owner handles daily operations, member registration and manual access overrides for their own gym. Defer Manager and Front Desk accounts and route gym-entry alerts to the Owner. |
| Trainer pay | Keep the current agreed fixed pay amount per completed session and the existing off-shift adjustment and per-trainer override. Preserve saved booking terms and historical payroll. Any percentage-of-fee change is future work. |
| GymOS subscription | The Owner manages their gym's software subscription separately from member payments. Show the current tier and billing status, allow upgrades/downgrades and billing-method updates, notify the Owner of a failed payment and allow seven days to resolve it. |
| Hosting and providers | Keep the hosted rehearsal paused. Use free test environments and synthetic data for development. |

Open decisions apply to their respective tasks. The November 18 follow-up records progress privacy, membership renewal and PT allowances, PayHere Sandbox, provisional subscription tiers and the deferral of gym entry and attendance. [Decision details](GYMOS-REQUIREMENTS-REVIEW.md#local-build-decisions-from-18-november-2026)

## 2. Finish member and trainer features

- [x] **2. Add reusable workout templates across members.** Chromium verified two independent assignments from one template. Editing one assignment preserved the other and the template. The coaching integration tests checked access and duplicate saves. (WRK-03)
- [x] **3. Add goals, solo workouts and daily food logs.** Members can compare weight, strength and weekly sessions against targets, log solo exercise and save daily calories and macros. Chromium verified progress and persistence. The coaching integration tests checked privacy, encryption and stale updates. (FR-005, FR-023–024)
- [x] **4. Complete member and trainer profiles.** Members can edit health notes and profile photos. Trainers can edit photos, biography, specialties and experience. Chromium verified profile changes and Owner shift approval. The trainer integration tests covered declining, replacing and retrying shift requests and checked that another gym cannot approve them. (FR-003, FR-034, FR-055, FR-060)
- [x] **5. Finish body measurements and progress reports.** Chromium verified member and assigned-trainer entry. The coaching suite verified older encrypted records, same-date edits and access boundaries. The product owner approved access for the member and assigned trainers. (FR-008, PRG-01–02, PRG-05, RPT-06)
- [x] **6. Add private progress photos and comparison.** Chromium verified member upload, dated history, first/latest comparison, assigned-trainer viewing, Owner denial and deletion. The coaching suite verified encrypted storage, viewer scope and one-hour expiry under the agreed synthetic retention policy. (FR-007, PRG-03–06, RPT-06)

## 3. Build payments and the GymOS subscription

- [x] **7. Complete membership plans and renewals.** Integration tests verified overlapping plans, same-plan renewal dates, historical terms and exactly one PT allowance per term. Chromium verified the membership view and pack balances. (FR-004, FR-050)
- [ ] **8. Add online membership and PT-pack purchases.** Local integration verified prices, one entitlement per confirmed synthetic order, failure and concurrent callback replay. PayHere Sandbox confirmed a membership purchase and queued the renewal. The product owner confirmed the Sandbox decline. A paid PT pack purchase remains to be verified. (FR-018–019)
- [ ] **9. Add payment history, methods and receipts.** Member and authorized Owner history and printable PayHere receipts are implemented and locally verified. Paid staff-assisted activation, its onboarding trigger and external payment confirmations remain. Cash, bank transfers and refunds are deferred. (FR-001, FR-020, MEM-06–08)
- [ ] **10. Build the Owner's GymOS subscription page.** The synthetic tests verified checkout, stop and replacement, seven-day grace, recovery and Owner notices. Real Sandbox recurring callbacks and approval of the provisional pricing and post-grace restrictions remain. (FR-079, BR-087, UC-15)

## 4. Complete gym entry and PT operations

The product owner deferred items 11–12 until the entry and attendance workflow has been discussed. The PT tasks below can be scheduled independently.

- [ ] **11. Build biometric enrollment and gym entry.** Confirm fingerprint/face support and device choice. Log granted and denied scans, check for a match plus active membership and suspension, prompt renewal for expired members, and alert the Owner. Verify three failed scans trigger the five-minute lockout. (FR-010, FR-012, FR-077–078)
- [ ] **12. Add Owner access overrides and attendance.** Record manual grants/denials with actor, member, time and reason. Settle the QR/offline fallback design and checkout rules. Show personal check-in history, live occupancy, today's visits, monthly attendance and today's workout after check-in. (FR-011, FR-013, FR-058, FR-071, FR-077, BIO-05–07, WRK-04, RPT-02)
- [ ] **13. Complete QR-based PT timing.** Signed booking QR codes now support in-person start and completion with manual fallback. A focused owned test exercised booking binding, trainer notification, minimum duration and one-time settlement. Verify the full scan and elapsed-time workflow with a phone. (FR-015–016, FR-036–037, FR-063–064)
- [ ] **14. Finish booking, notes and no-show rules.** Live notes and automatic no-show handling at 15 minutes after scheduled start are implemented. Automatic no-show shares the existing one-credit settlement rule. The 24-hour missing-notes reminder passed its owned integration check. Owned tests passed for booking, availability, trainer deactivation, corrections, no-show settlement, and live notes. Reconcile the audit's configurable deduction request with the existing one-credit policy. (FR-014, FR-017, FR-038–039, FR-052, FR-055, FR-064, BR-084)
- [x] **15. Finish trainer earnings and payroll reports.** Trainer earnings now show weekly and monthly views, itemized shift labels, and in-shift/off-shift totals. Owned finance and PT tests verified saved pay, off-shift amounts, zero pay for missed and late-cancelled sessions, and protection of closed periods. (FR-044–046, FR-051, BUG-007)

## 5. Add communications and marketplace features

- [ ] **16. Finish sign-in and account delivery.** Confirm the email recovery/OTP decision and how welcome and activation messages should be sent. Exercise owner-assisted registration and the existing account recovery paths. Cover member device-biometric sign-in in the mobile app. (FR-001–002, AUTH-03)
- [ ] **17. Add external notifications and preferences.** Cover PT reminders at 24 hours and one hour, pack alerts, payment failures, renewals, no-shows and applicable member/trainer preferences. Confirm providers and the role of WhatsApp. (FR-012, FR-014, FR-017–019, SRS §§16–17, D1-1.9, D1-2.7)
- [ ] **18. Build the 30-day onboarding journey.** Send the day 1, 3, 7, 14, 21 and 30 prompts and track completion and skips. Verify the day 3 prompt is conditional and skipped steps do not stop later prompts. (FR-009, FR-059)
- [ ] **19. Add private member–trainer messaging.** Permit messages between the member and assigned trainer, deliver alerts and test isolation. (FR-028)
- [ ] **20. Complete marketplace discovery and trainer reviews.** Require both gym and trainer visibility settings. Add the 48-hour interest-request window and introductory session proposal. Allow a 1–5 star review after a completed session and require Owner moderation before publication. (FR-029–030, FR-034, FR-043, FR-047, FR-062)
- [ ] **21. Complete virtual PT sessions.** Trainers can opt in to virtual PT. Owners and members can select the format for an opted-in trainer. Virtual sessions use the existing start, completion, credit, revenue and pay rules. Owned tests verified opt-in enforcement, credit holds, saved pay, and virtual completion. Browser acceptance of the full booking and completion flow remains. (FR-048)

## 6. Finish reports and member engagement

- [ ] **22. Add the missing financial and PT reporting.** Cover revenue by plan tier and new/renewal status, trainer level, off-shift amounts, pack use, budget-overrun alerts and period comparison. Finish trainer performance metrics such as revenue, no-show rates and ratings. Confirm how cash received and earned revenue should appear before changing ledger recognition. (FR-061, FR-065–069, RPT-03–04)
- [ ] **23. Extend exports and accounting connections.** Cover the required session log and PDF/Excel reports, reconcile them with on-screen totals, and implement the agreed Xero/QuickBooks export and cash forecasts. (FR-065, FR-070, FR-076, RPT-05)
- [ ] **24. Finish the Owner dashboard and analytics.** Verify the gym profile/config fields, live activity, occupancy, growth sources, onboarding funnel, attendance patterns and engagement/adoption reports. Add a retention heatmap, weekly churn scores and intervention suggestions. (FR-049, FR-059, FR-063, FR-071–073)
- [ ] **25. Add streaks, challenges, rewards and leaderboards.** Use a configurable weekly target with a default of three check-ins. Award the defined milestones and keep the leaderboard off until the member opts in. (FR-031–033, FR-053)
- [ ] **26. Add re-engagement campaigns.** Support Owner-configured messages and manual outreach. Verify scheduled outreach for at-risk and lapsed members and stop the sequence when the member checks in. (FR-054, FR-057, FR-059, FR-072, BR-019–024)
- [ ] **27. Finish the audit log and gym data export.** Cover the required Owner actions and provide an authorized, gym-scoped export for compliance or migration. Verify the export scope for sensitive data. (FR-081)

## 7. Complete mobile and GymOS Phase 3

- [ ] **28. Build the standard member and trainer mobile workflows.** Verify supported devices, secure sign-in, plans, gym check-in, PT scans, payments and the relevant notifications. Confirm whether FitCore's offline plan access and device-version targets apply. (FR-002, FR-013–016, FR-019, FR-021–022, FR-036, SRS §§5, 22.1)
- [ ] **29. Add wearable connections and recovery indicators.** Confirm the first providers and data permissions, support connect/disconnect and sync, and surface wellness, recovery and client insights. Verify the alert for three consecutive days of high fatigue. (FR-006, FR-025, FR-040–042)
- [ ] **30. Add the member AI coach.** Require trainer opt-in per client, use assigned plans as context, support non-PT-day prompts and route flagged injury or medical topics to the assigned trainer. (FR-026–027, FR-035)
- [ ] **31. Add Owner AI insights.** Use gym-scoped, read-only data for financial answers, weekly accounts and anomaly alerts. Add the agreed demand, pricing, renewal and cash forecasts. Verify answers against source data. (FR-074–076)

## 8. Verify and hand off the release

- [ ] **32. Confirm and verify the data protection rules.** Cover personal information, coaching records, photos, wearable data, payments and biometrics. Agree access and retention and verify encryption, key recovery and deletion. (SRS §§19–20, NFR-02)
- [ ] **33. Retest the exact review build.** Replay the original defects and new features, including role and gym isolation. Confirm whether the friendly unknown-gym page needs an HTTP 404. Reconcile SuperAdmin operational permissions with the current scoped, read-only support workflow. (BUG-012, SA-01, SRS §7)
- [ ] **34. Prepare the client review package.** Include the exact source version, setup, migration steps, synthetic accounts supplied privately and requirement-by-requirement results.
- [ ] **35. Verify the intended hosted environment when work resumes.** Verify security headers, health, gym creation, migrations, scheduled work and payroll. Confirm release targets before measuring response time, capacity, uptime, backup and recovery. The FitCore audit targets are recorded in the requirements review. (BUG-006–007, NFR-01–03)
- [ ] **36. Deliver the finished review package to the client's developer.** Record their results, address confirmed issues and capture acceptance.

## Evidence

- [Original audit](../gymos_v2_qa_audit_report.pdf), particularly pages 3–7 and 17–18.
- [Requirements review and source mapping](GYMOS-REQUIREMENTS-REVIEW.md).
- [Developer review and recorded checks](CLIENT-REVIEW.md).
- [Defect remediation and verification record](QA-AUDIT-PRIORITIZED-REMEDIATION-PLAN.md#12-evidence-and-completion-record).
