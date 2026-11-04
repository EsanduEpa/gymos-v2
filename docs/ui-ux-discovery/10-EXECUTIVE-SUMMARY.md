# Executive summary

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Current product

GymOS V2 is a multi-tenant gym operations platform built with Next.js/React, a NestJS API and PostgreSQL/Prisma. Global identity and gym registry live in a master database; each gym has a separate operational database. Backend guards verify gym, role, enrollment publication and schema binding. A UI redesign must retain those server boundaries.

The source contains **39 page routes**, **46 feature groups** (45 with implemented source, including partial/backend-only functionality, and one billing placeholder), **four working roles**, **21 master and 26 tenant models**. Dialogs, tabs and significant states are documented separately from route count. It has substantial connected workflows beyond dashboards; it is not a finished billing/attendance/progress suite.

## Roles and functionality

- **Super admin:** registry and aggregate health/counts, gym provisioning/status/retry/owner credentials, lifecycle changes and reasoned15-minute read-only support summary.
- **Owner:** members/trainers/enrollment/credentials/status, membership plans and PT packs, direct PT booking/oversight, operational finance/expenses/budgets/payroll/P&L/CSV/audit, analytics and gym configuration/appearance.
- **Trainer:** own schedule and hire-request decisions, start/complete sessions and completed-session notes, relationship-scoped client profiles, workout/meal creation and own earnings.
- **Member:** sanitized trainer directory and session requests, own session history/cancellation/credits/calendar, assigned workout/meal reading and notifications.

`USER` is the ordinary global account class, not another gym role. BASIC contacts have no login account; trainer levels are not permissions; read-only support is a scoped context, not impersonation.

## Existing UI

A custom Classic light theme uses green accents, dark 224px sidebar, white cards, system typography and a 52px header. Below 768px navigation becomes a modal drawer. Domain tables, cards, forms, CSS charts and two custom calendars sit beside reusable Button/Field/Card/Tabs/Dialog/Feedback primitives. Styling is layered and duplicated; saved tenant accent is applied selectively and saved logo is not mounted in the current shell.

Only two existing V2 platform-registry screenshots (desktop/mobile) were visually inspected. The larger369-image collection is an explicit synthetic **V1** baseline, not proof of current V2 features or visual quality. No fresh browser/database test suite or assistive-technology audit was run.

## Highest-priority findings

1. Owner list navigation loses list mode; profile Attendance History receives an empty array; finance lists omit page navigation; booking selectors expose only the first 100 records.
2. Fractional compensation percent conversion and read/write precision disagree; trainer earnings fetches owner-only configuration then falls back to UTC.
3. Trainer search overwrites a backend publication filter; fix at the API, not with hidden UI rows. No cross-tenant exposure was demonstrated by this audit.
4. Consent loses its destination after login; existing-owner provisioning has consent API but no web flow; worker deployment remains unverified.
5. Session full reloads can discard editing state. Dashboard labels imply attendance/presence and broader revenue than their actual PT projections.

There are **26 documented audit issues** with evidence, severity, impact, improvement and confidence. No Critical production issue is claimed. Address correctness and task continuity before premium styling, then consolidate shared interaction patterns and validate role-specific mobile journeys.

## Product gaps and redesign constraints

Membership renewal exists as an API without UI. General physical attendance, payment collection/receipts/invoices, SaaS billing, payouts, workout completion/body-metric progress, ratings and class scheduling are not implemented. Subscription & Billing is an explicit placeholder. Preserve honest availability rather than inventing connected tools.

Keep temporary credentials one-time and private; consent subject-controlled; role/tenant checks server-side; transactions/version/idempotency and unknown-outcome recovery intact; quotes signed/current/acknowledged; financial snapshots immutable; gym-local exclusive dates explicit. Operational earnings, agreed entitlement value and payroll approval do **not** prove payment or payout. Additional capabilities require separate product/backend design.

## Handoff

All 12 requested Markdown files are in this directory. Start with [screens](02-COMPLETE-SCREEN-INVENTORY.md), [features](03-FEATURE-INVENTORY.md), [journeys](05-USER-JOURNEYS.md), [prioritized problems](06-UI-UX-PROBLEMS.md) and [requirements](09-UI-REDESIGN-REQUIREMENTS.md). [Evidence/gaps](11-EVIDENCE-AND-GAPS.md) records route/endpoint/model reconciliation, source locations, visual scope and unresolved verification. Application code, configuration and databases were not changed by this audit.
