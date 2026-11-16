# GymOS future capabilities

The product owner approved the [V2 scope](../README.md#current-scope) on 14 November 2026 and requested development of the audit gaps on 15 November. The original exclusions below record the baseline. The new work expands that baseline in reviewable changes. See the [client review checklist](CLIENT-REVIEW.md) for workflows available in the review build.

## Approved exclusions for V2

| Capability | Audit references | Decision |
| --- | --- | --- |
| Email OTP, password reset and welcome messages | AUTH-03 | Keep staff-assisted recovery and in-app delivery. Revisit external delivery and identity verification under a separate scope. |
| Payment collection, cash receipts and external renewal reminders | MEM-02–07, D1-1.8, WF-M4 | Keep entitlement and operating-value records. Future work needs payment reconciliation, receipt rules and separate delivery requirements. |
| Physical entry and biometrics | BIO-01–07, D1-3.8, WF-M2 | Keep PT session records. Door access or biometric attendance requires its own hardware, data and fallback design. |
| Manager and Front Desk roles | D3-1.3, D1-3.9 | Keep the four current roles. Any additional role requires a permission matrix and tenant-boundary tests. |
| AI coaching and owner intelligence | D1-1.5, D1-3.7, WF-M5, WF-O5 | Define permitted data, review controls, evaluation criteria and tenant isolation before scheduling. |
| Gamification and campaigns | D1-1.7, WF-O4 | Define streaks, challenges, rewards, campaign eligibility and opt-outs before scheduling. |

## Audit capability backlog

The product owner still needs to decide which enhancements to schedule. Existing adjacent functionality is part of V2 where described in the scope. In particular, V2 has basic workout and meal plans, app notifications, trainer availability and shift approvals, PT timing controls, dashboards and CSV exports.

| Capability group | References | Work needed if in scope | Minimum completion evidence |
| --- | --- | --- | --- |
| Workout scheduling, copying, completion and rest periods | WRK-01–05 | Dated and weekly assignments, same-client copying, rest seconds and per-date member completion are implemented on the web. Reusable templates across clients and a physical check-in trigger remain open. | Trainer assigns; member sees the correct day’s plan; completion persists with correct permissions |
| Meal dates and dietary restrictions | MEL-02, MEL-04 | Dated meals now appear on their assigned calendar date. Weekly meals continue to recur. Structured dietary and allergy fields and their permissions remain open. | Restrictions and assigned meals persist and appear only to authorized users |
| Body metrics and progress reports/photos | PRG-01–06, RPT-06 | Define measurements, history, charts, protected uploads, retention, and comparison views | Time-series accuracy and private-media access verified |
| Member goals, solo logs, wearable data | D1-1.1, D1-1.4, D1-2.3 | Agree supported data, consent, integrations, and member/trainer visibility | Representative data updates correctly without unauthorized access |
| Messaging, ratings, virtual sessions | D1-1.6, D1-2.4, D1-2.6 | Define communication, moderation, review eligibility, and remote-session rules | End-to-end authorized interaction and abuse/error handling verified |
| Expanded trainer self-service | D1-2.1, D1-3.3 | Define additional profile and marketplace controls and any changes to shift review | Owner and trainer see consistent approval states and availability |
| QR entry and additional PT controls | D1-1.3, D1-2.2, WF-M3, WF-T1 | Define proposed controls against the current timing and trainer completion workflow | Authorized state transitions, timing limits, and credits/settlements remain correct |
| Notifications and onboarding prompts | D1-1.9, D1-2.7 | Decide channels, category preferences, delivery conditions, and onboarding schedule | Correct recipients, preference enforcement, and duplicate prevention |
| Dashboard and trainer KPIs | RPT-01, RPT-03, RPT-07, D1-3.6 | Active membership count and the under-30-day expiry panel are implemented. Physical visit counts, month-to-date earnings on the owner dashboard, trainer retention and funnel metrics remain open. | Counts reconcile to underlying records across date boundaries |
| Revenue segmentation and richer exports | RPT-04–05 | Define plan-tier/new-versus-renewal reporting and PDF/XLSX requirements | Export and screen totals reconcile; access controls remain enforced |
| Financial integrations and projections | D1-3.5, WF-O3 | Specify accounting export mappings and cash-flow semantics consistent with payment scope | Reconciliation examples and integration failure behavior verified |
| Subscription management | D1-3.9 | Decide whether this means platform SaaS subscriptions or member billing | Approved lifecycle implemented, or explicit scope notice retained |
| Phase 3/expanded platform | NFR-06 | Separately prioritize POS, equipment logs, multiple branches, white-label/native apps, and Sinhala/Tamil | Separate approved specifications and release milestones |

Native apps, additional languages and other proposed platform expansions need separate release approval. The requirement IDs are retained for traceability to the audit. A revised requirements scorecard needs the source requirements and the reviewed V2 baseline before it can be calculated.

### Dependencies for the expanded scope

- Payments, external receipts and reminders require a selected payment gateway and delivery channels, provider test accounts and test credentials, and agreed payment, refund and reconciliation flows.
- Physical access requires the supported ZKTeco device or simulator, its firmware and developer interface, and the approved enrollment, fallback and attendance rules.
- Progress photos require a private object-storage environment and a policy for consent, access and retention. AI and wearables require chosen providers, synthetic evaluation data and approved data use.
- Additional staff roles, subscriptions and the Phase 3 catalogue require the source requirements or an equivalent approved specification so permission boundaries, billing behavior and acceptance cases can be verified.
- Load, uptime, recovery objectives and encryption claims require evidence from the intended deployment environment. Local tests provide functional and isolation evidence for the synthetic build.
