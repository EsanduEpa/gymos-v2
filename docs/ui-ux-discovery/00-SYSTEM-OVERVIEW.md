# GymOS system overview

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## How to use this handoff

Start with [the executive summary](10-EXECUTIVE-SUMMARY.md), then [screens](02-COMPLETE-SCREEN-INVENTORY.md), [features](03-FEATURE-INVENTORY.md), [problems](06-UI-UX-PROBLEMS.md), and [redesign requirements](09-UI-REDESIGN-REQUIREMENTS.md). [Evidence and gaps](11-EVIDENCE-AND-GAPS.md) includes a complete controller endpoint ledger and model dictionary. IDs S01–S39 identify page routes; F01–F46 identify feature groups. Panels, dialogs and states are inventoried separately and are not added to route counts.

**Status vocabulary:** Implemented = UI, action/controller and persistence logic are connected in source. Partial = a meaningful part exists but a named UI or workflow is missing. Backend only = working source surface with no connected page. Placeholder = explanatory page with no operational implementation. Mocked = synthetic UI test harness only. Not implemented = no supporting route/action/model found. “Planned” is used only for an explicit source intention; old migration comments are not a product roadmap.

## Architecture and technologies

| Area | Observed implementation | Evidence |
|---|---|---|
| Workspace | pnpm 9.15 monorepo, `apps/*` and `packages/*`; scripts for generated clients, build, type checks, unit and owned database tests | [package.json:1](../../package.json#L1), [pnpm-workspace.yaml:1](../../pnpm-workspace.yaml#L1) |
| Web | Next.js 16.4.2 App Router, React/React DOM 19.3.0, TypeScript 5; server-rendered route components and client interaction islands | [apps/web/package.json:1](../../apps/web/package.json#L1) |
| API | NestJS 12, Express platform adapter, TypeScript 6, native fetch consumers; global throttling and support scope guards | [apps/api/package.json:1](../../apps/api/package.json#L1), [apps/api/src/app.module.ts:58](../../apps/api/src/app.module.ts#L58) |
| Persistence | PostgreSQL, Prisma 7.10 and `@prisma/adapter-pg`; separately generated master and tenant clients | [packages/database-master/prisma/schema.prisma:1](../../packages/database-master/prisma/schema.prisma#L1), [packages/database-tenant/prisma/schema.prisma:1](../../packages/database-tenant/prisma/schema.prisma#L1) |
| Validation | Shared Zod 4 contracts imported by both application tiers | [packages/contracts/src/index.ts:1](../../packages/contracts/src/index.ts#L1) |
| Identity | Argon2 password verification; signed HS256 JWT with issuer/audience, subject and auth version | [apps/api/src/auth.controller.ts:30](../../apps/api/src/auth.controller.ts#L30), [apps/api/src/auth-token.ts:2](../../apps/api/src/auth-token.ts#L2) |
| UI | Custom React primitives, CSS globals and CSS modules; Tailwind 4 import and utility classes. No installed component, chart or icon framework in web package | [apps/web/src/app/globals.css:1](../../apps/web/src/app/globals.css#L1), [apps/web/src/components/ui/index.ts:1](../../apps/web/src/components/ui/index.ts#L1) |
| Tests present | Vitest units/integration, Playwright role/tenant/session/notification journeys and a synthetic V1 reference capture harness | [apps/web/tests/two-gym.e2e.spec.ts:1](../../apps/web/tests/two-gym.e2e.spec.ts#L1), [apps/web/tests/visual/v1-baseline.spec.ts:17](../../apps/web/tests/visual/v1-baseline.spec.ts#L17) |

## Directory map

```text
apps/web/src/app/           App Router pages, server actions, two HTTP handlers, global CSS
apps/web/src/components/    ui, navigation, platform, configuration, members, trainers,
                           sessions/read-views, finance, coaching, credentials
apps/web/src/lib/           server session, gym authorization, support context, URL helpers
apps/api/src/              controllers, identity, tenancy, platform, operations,
                           sessions, finance, coaching, dashboard, analytics
apps/api/test/             disposable database integration fixtures and domain tests
apps/api/scripts/          provisioning/owner/admin setup, schema rollout, isolated checks
packages/contracts/        Zod request/response contracts and request safety helpers
packages/api-client/       reusable typed fetch transport and domain wrappers
packages/theme-tokens/     Classic palette and validated tenant accent/foreground resolver
packages/database-master/  master Prisma schema and migrations
packages/database-tenant/  per-gym Prisma schema and migrations
infrastructure/            workspace/dependency checks and recovery tooling
docs/                      migration notes and this discovery handoff
```

Generated clients, dependencies, build output, secrets and production records are not evidence of live user behavior. The sibling `../gymos` is the older V1 project, not the application counted here. V1 baseline screenshots were produced from that sibling by a disposable harness; they must not become V2 feature claims.

## Routing and data loading

There are **39 page route files**: 35 content-bearing pages (including one placeholder and one gated test page) and four routing/redirect entry pages. Root layout defines English metadata, global CSS and a client session lifecycle observer. Tenant content repeatedly invokes `requireGymContext(slug, expectedRole)` and wraps itself in `DashboardChrome`; there is no shared nested tenant `layout.tsx`. Gym-level error/not-found/loading boundaries and a member-profile loading boundary exist. Full route and screen details are in file 02.

Typical read: browser requests a page → Next server reads HttpOnly cookie → API `/auth/session` validates account → `/gyms/:slug/access` verifies tenant/role → public theme read → domain JSON read → Zod response parse → server-rendered content. All API fetches examined use `no-store`. Public theme failure can fall back to Classic; authentication or tenant verification cannot be replaced by theme success. The URL slug is a lookup key, never a database selection authority. [apps/web/src/lib/gym-context.ts:8](../../apps/web/src/lib/gym-context.ts#L8), [apps/web/src/lib/navigation.ts:5](../../apps/web/src/lib/navigation.ts#L5).

Typical mutation: React `useActionState`/event handler → Next server action validates FormData → server-held bearer token → Nest endpoint → role checks, verified tenant gate, transaction/idempotency/version rules → sanitized response parse → path revalidation or explicit refresh. Most web code calls `fetch` directly rather than the reusable `packages/api-client` transport. No Redux, Zustand, React Query or SWR dependency is installed; local React state and URL query state are the state management approach. [apps/web/src/app/member-actions.ts:48](../../apps/web/src/app/member-actions.ts#L48), [packages/api-client/src/index.ts:61](../../packages/api-client/src/index.ts#L61).

Two Next HTTP handlers are infrastructure, not pages: `GET /api/session` projects session/context expiry for browser monitoring; `POST /api/gyms/[slug]/financials/export` authenticates and forwards CSV downloads. Server actions are not separate page routes. [apps/web/src/app/api/session/route.ts:8](../../apps/web/src/app/api/session/route.ts#L8), [apps/web/src/app/api/gyms/[slug]/financials/export/route.ts:6](../../apps/web/src/app/api/gyms/[slug]/financials/export/route.ts#L6).

## Authentication and authorization

Login normalizes email and verifies the password in master. The JWT lasts 900 seconds; browser cookie expires slightly earlier and is HttpOnly, SameSite Lax, Secure in production. No refresh-token flow, public signup, forgotten-password flow or MFA screen was found. Temporary credentials require first-login password change and expire after 24 hours. Password change revokes prior identity sessions; logout advances `authVersion`, invalidates support and clears browser state even if API revocation cannot be confirmed. The UI reports uncertain revocation. [apps/web/src/lib/session-transport.ts:13](../../apps/web/src/lib/session-transport.ts#L13), [apps/api/src/auth.controller.ts:90](../../apps/api/src/auth.controller.ts#L90), [apps/api/src/identity/credential.service.ts:290](../../apps/api/src/identity/credential.service.ts#L290).

Global roles: `USER`, `SUPER_ADMIN`. Per-gym roles: `OWNER`, `TRAINER`, `MEMBER`. `USER` alone grants no gym workspace. The master compound key allows one role per identity per gym, while the same identity may have different roles in different gyms. Owner is the actual gym admin; no separate receptionist, accountant, manager or permission-builder role exists. A basic contact has no login account. See file 01 for responsibility and access matrices.

Every operational gym request revalidates token version, password/credential status, active gym, active access link, actor binding and completed enrollment/receipt where needed. Tenant schema and reciprocal `GymConfiguration.masterGymId` must match registry expectations. The UI guard redirects wrong roles and obscures unknown/foreign gyms, while backend checks enforce the boundary. Super admin does not automatically receive owner data; approved reasoned support exposes a sanitized read-only summary. [apps/api/src/gym-access.guard.ts:41](../../apps/api/src/gym-access.guard.ts#L41), [apps/api/src/tenancy/tenant-schema-gate.service.ts:29](../../apps/api/src/tenancy/tenant-schema-gate.service.ts#L29), [apps/api/src/super-admin.guard.ts:19](../../apps/api/src/super-admin.guard.ts#L19).

## Tenancy and operations

Master holds users, gyms, role links, theme, durable operations, credential handoff metadata, support sessions, cached aggregate counts and rollout evidence. Each gym has a physical tenant database for members, trainers, memberships, packs, sessions, coaching, finance, notifications and tenant audits. There are **21 master models and 26 tenant models**. Cross-database identity references are scalar IDs, with operation/receipt publication checks replacing cross-database foreign keys. Tenant connections use bounded leases, admission limits and controlled drain behavior; availability failures become 503. [apps/api/src/tenant-database.service.ts:58](../../apps/api/src/tenant-database.service.ts#L58), [packages/database-master/prisma/schema.prisma:163](../../packages/database-master/prisma/schema.prisma#L163), [packages/database-tenant/prisma/schema.prisma:455](../../packages/database-tenant/prisma/schema.prisma#L455).

Provisioning reserves durable work and exposes safe status/retry/handoff controls. Worker execution is separate from the registered HTTP providers; deployment of a continuously running worker is not demonstrated by the web form or AppModule. `provision-gym.mjs` invokes worker code. Suspension drains tenant access; reactivation verifies health/schema/binding/owner access. Maintenance, recovery and schema rollout have services/scripts, not a complete UI. [apps/api/src/platform/provisioning-worker.ts:1](../../apps/api/src/platform/provisioning-worker.ts#L1), [apps/api/scripts/provision-gym.mjs:1](../../apps/api/scripts/provision-gym.mjs#L1), [apps/api/src/platform/gym-lifecycle.service.ts:1](../../apps/api/src/platform/gym-lifecycle.service.ts#L1), [apps/api/scripts/schema-rollout.mjs:1](../../apps/api/scripts/schema-rollout.mjs#L1).

## Current capabilities and explicit boundaries

Connected capabilities include member/trainer enrollment with existing-identity consent, one-time credential delivery, directories/profiles/status management, plans and session packs, owner booking, member requests and trainer decisions, session execution/cancellation/no-show, coaching plans, in-app notifications, operational finance/budgets/payroll, audits/CSV, owner dashboards/analytics, and profile/theme configuration.

Partial capabilities include renewal (API only), owner attendance history (empty projection), some owner session commands (API affordances without UI), trainer client history (limited previews), platform existing-owner consent (API only), and logo display (component survives in an unused role page). Placeholder: owner Subscription & Billing. Mocked: `/test-ui`. Not implemented in current V2: general entry attendance, physical check-in, cash/payment collection, receipts/invoices/payment gateways, payouts, subscription billing/plan changes, workout completion or body-metric progress, member ratings, general chat, class/group scheduling and arbitrary role management. Do not treat those as redesign preservation requirements. Detailed status is recorded in file 03.

## Refresh, themes and responsive behavior

Session monitor polls every 30 seconds and responds to focus/visibility/BFCache and cross-tab broadcasts. Notifications poll visible tabs every 20 seconds. Owner dashboard polls every 30 seconds, retaining last values on failure. Session list refresh uses **full document reloads** every 30 seconds/focus, which can interrupt drafts. Member monthly state counts issue seven extra reads. These are current behavior, not performance measurements. [apps/web/src/components/navigation/session-lifecycle.tsx:1](../../apps/web/src/components/navigation/session-lifecycle.tsx#L1), [apps/web/src/components/navigation/notifications-bell.tsx:1](../../apps/web/src/components/navigation/notifications-bell.tsx#L1), [apps/web/src/components/sessions/read-views/session-read-refresh.tsx:1](../../apps/web/src/components/sessions/read-views/session-read-refresh.tsx#L1), [apps/web/src/components/sessions/read-views/load-session-read-page.ts:76](../../apps/web/src/components/sessions/read-views/load-session-read-page.ts#L76).

Classic is a light-only custom design system: system font, green accent, dark navigation, white cards, neutral page surface. Tenant theme stores primary hex and optional HTTPS logo URL; foreground is selected by contrast calculation. No runtime theme provider, dark switch, font/layout editor, image upload or full tenant token palette is wired. Shell changes to a dialog drawer below 768px; forms/cards/calendars have several component-specific breakpoints. File 04 records exact tokens and dimensions.

## Verification limits

This is a static source audit with inspection of two existing V2 platform registry screenshots at 1440 and 320px. It does not certify the current source in a live browser, production deployment, screen reader, database, email channel or fresh test run. Existing tests are supporting source evidence, not tests run by this audit. No application/configuration/database changes were made; only the 12 requested Markdown documents were added. File 11 records source fingerprints and reconciliation results.
