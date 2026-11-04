# Multi-tenant UI requirements

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Tenant identity and backend isolation

GymOS V2 is a database-per-gym design with a shared master registry, not a single shared operational database partitioned by a browser-selected gym ID. Master `Gym.slug` is public routing identity, `Gym.id` is internal registry identity and `databaseName` is a private connection binding. User identities are global; gym role/access is master `GymAccess` keyed by identity and gym. Operational `Member` and `Trainer` are tenant actors with scalar references to global identity/enrollment operation. No cross-database foreign keys establish that relationship automatically. [packages/database-master/prisma/schema.prisma:64](../../packages/database-master/prisma/schema.prisma#L64), [packages/database-master/prisma/schema.prisma:86](../../packages/database-master/prisma/schema.prisma#L86), [packages/database-tenant/prisma/schema.prisma:40](../../packages/database-tenant/prisma/schema.prisma#L40).

A slug in `/gyms/[slug]/...` triggers server lookup and authorization. Backend `GymAccessGuard` verifies signed identity, current auth version/password/credential, active gym and access link; member/trainer also require complete durable registration, reciprocal actor tuple and committed tenant receipt. `TenantSchemaGateService` verifies reviewed expected/applied manifest, complete schema operation, matching schema state/migrations and `GymConfiguration.masterGymId` before operational database work. Domain services add role/actor/relationship fences and transactional version checks. Bounded tenant lease/pool limits map admission/outage to503. [apps/api/src/gym-access.guard.ts:41](../../apps/api/src/gym-access.guard.ts#L41), [apps/api/src/tenancy/tenant-schema-gate.service.ts:29](../../apps/api/src/tenancy/tenant-schema-gate.service.ts#L29), [apps/api/src/identity/gym-access-fence.ts:1](../../apps/api/src/identity/gym-access-fence.ts#L1), [apps/api/src/tenant-database.service.ts:1](../../apps/api/src/tenant-database.service.ts#L1).

**Required constraint:** route checks, hidden links, context providers, client cache keys and gym selectors supplement backend isolation; none may replace it. Never expose database names, connection strings, opaque support context or private durable provisioning intent to a design/analytics payload.

## Tenant-aware navigation and switching

Role links are generated within the current slug. Shell shows gym name, global identity display name and current role; multiple links add Switch gym→chooser. No arbitrary gym switching for anonymous users and no role toggle inside a gym. Same identity can belong to several gyms with distinct roles, but one role per gym is stored. Current helper paths use earnings on trainer login/root/chooser, while `/trainer` redirects to schedule; choose a coherent redesign landing policy without expanding access.

Shell identity/gym/role keys and full-document navigation are deliberate mechanisms for clearing old context. A30s/focus/visibility session check compares current identity/access against rendered shell, reacts to cross-tab logout/support changes and conceals BFCache pages before reload. Retain stale-context prevention while improving draft continuity. Server-rendered auth/tenant data is uncached; there is no persistent browser bearer token or shared global client store. [apps/web/src/components/navigation/dashboard-chrome.tsx:41](../../apps/web/src/components/navigation/dashboard-chrome.tsx#L41), [apps/web/src/components/navigation/session-lifecycle.tsx:1](../../apps/web/src/components/navigation/session-lifecycle.tsx#L1), [apps/web/src/lib/gymos.ts:34](../../apps/web/src/lib/gymos.ts#L34).

Any future client data cache must use identity+gym+role+resource scope, clear on switching/logout/revocation, and independently reauthorize the request. Do not “fix” access mismatch by showing a cached former-gym page. Unknown and foreign gyms use uniform denial UI; failed schema verification is unavailable, not an empty gym.

## Branding and theme storage

| Item | Actual behavior | Design consequence |
|---|---|---|
| Gym name | Master Gym.name/publicProfileVersion, separate owner name-save API | Show current server name; do not infer from URL or tenant contact config |
| Accent | Master Theme.primaryColor/version, public read and owner CAS update | Only validated six-digit hex; Classic fallback; derived white/dark foreground |
| Logo | Master Theme.logoUrl, optional HTTPS, sanitized public projection; GymLogo handles load failure | URL-only setting, no upload/storage service. Current shell does not mount logo; capability is partial |
| Semantic colors | Fixed Classic status/focus palette | Tenant accent must not redefine danger/success/focus meaning |
| Typography/spacing/layout | Hardcoded shared CSS and role overrides | No per-tenant font/layout/token set or theme editor exists |
| Appearance state | Inline CSS vars on authorized shell | No React theme provider or dark preference exists |
| Default inconsistency | Prisma Theme default #2563EB; Classic/resolvers fallback #007A35 | Do not assume all existing themes are green or silently migrate stored values |

Sources: [packages/database-master/prisma/schema.prisma:124](../../packages/database-master/prisma/schema.prisma#L124), [apps/api/src/gyms.controller.ts:79](../../apps/api/src/gyms.controller.ts#L79), [apps/api/src/gyms.controller.ts:107](../../apps/api/src/gyms.controller.ts#L107), [apps/web/src/components/configuration/owner-gym-configuration.tsx:85](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L85), [packages/theme-tokens/src/classic.ts:64](../../packages/theme-tokens/src/classic.ts#L64).

Read public theme metadata only for active gym. A successful theme fetch does not authorize operational data. Missing/invalid theme can fall back safely; a nonexistent gym cannot be converted into a working tenant by fallback. Logo URLs must remain validated and render with reserved sizing/fallback. Domain accent use is currently inconsistent: member selected nav uses tenant color; owner/trainer selected nav, shared buttons and many module rules use Classic. Redesign needs a documented accent scope and token alias strategy, not client-wide CSS injection by tenant.

## Tenant settings and business invariants

Operational settings live in tenant `GymConfiguration` and version snapshots: address/contact, currency/timezone, cadence, session fees, compensation ratios, cancellation window/deduction and minimum duration. Membership plans/terms and pack currency/dates are tenant-specific. Currency/timezone are set at provisioning and read-only in current UI/contracts. Changing them after financial/dated activity is not a supported UI operation; migration review is mentioned in settings copy. [packages/database-tenant/prisma/schema.prisma:455](../../packages/database-tenant/prisma/schema.prisma#L455), [packages/contracts/src/configuration.ts:33](../../packages/contracts/src/configuration.ts#L33).

Fees, pay rates, shift and policy are captured at confirmation and referenced later, while membership terms capture agreed price/name/currency/dates. Changing current settings does not rewrite history. Quote-based cancel/no-show follows the booking policy snapshot and verifies current session/policy version plus short-lived signed acknowledgment. Dates are gym-local and term/pack end dates exclusive; display formatting must not use browser timezone as business authority. LKR/USD are the supported currencies. General multi-currency conversion/consolidation is absent.

## Role/relationship boundaries

- Owner reads whole current-gym operational data, including private member fields; no other tenant access by slug alone.
- Trainer own sessions/earnings; client private fields only under qualifying current confirmed relationship, including completed-within90days. No explicit permanent assignment model.
- Member own actor data and sanitized active-trainer directory; no trainer contact details or other member private profile.
- Global admin registry is sanitized; support is reasoned/expiring `GYM_SUMMARY_READ`, not impersonation. Support shell appears owner-like only to display an approved summary. Normal gym APIs reject support context headers; platform guards limit them to summary/exit.
- BASIC/pending/historical account states are not operational role grants. Access/registration/member status are distinct and should remain distinct in UI.

Sources: [apps/api/src/coaching/coaching.service.ts:34](../../apps/api/src/coaching/coaching.service.ts#L34), [apps/api/src/trainers.controller.ts:110](../../apps/api/src/trainers.controller.ts#L110), [apps/api/src/platform/support-scope.guard.ts:1](../../apps/api/src/platform/support-scope.guard.ts#L1), [apps/api/src/identity/publication-policy.ts:1](../../apps/api/src/identity/publication-policy.ts#L1). The owner trainer-search OR overwrite in UX04 must be repaired at the backend; it is not evidence that browser tenant switching is isolation.

## Lifecycle, support and partial data

Gyms PROVISIONING/FAILED/SUSPENDED are unavailable for normal operation; ACTIVE also needs verified binding/schema. Platform support can show master-only status when tenant summary is unavailable. Counts may be stale/null and aggregate totals intentionally withheld. Never show null as0 or combine partial verified tenant summaries into an apparently complete platform total. Suspension drains requests and preserves records; reactivation verifies prerequisites. Billing is unavailable, so no lapsed-subscription restriction/banner may be inferred from gym status. [apps/api/src/platform/platform-registry.service.ts:1](../../apps/api/src/platform/platform-registry.service.ts#L1), [apps/api/src/platform/support-session.service.ts:64](../../apps/api/src/platform/support-session.service.ts#L64), [apps/api/src/platform/gym-lifecycle.service.ts:1](../../apps/api/src/platform/gym-lifecycle.service.ts#L1), [apps/web/src/app/gyms/[slug]/owner/subscription/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/subscription/page.tsx#L1).

## Customizable design system acceptance criteria

Define per-tenant accent/logo/name surfaces and fixed semantic tokens; validate contrast/fallback for light/dark accents; reserve logo geometry; preserve role navigation and gym identity during loading/error; scope forms/notifications/drafts by identity/gym/role; clear confidential transient state on context exit; never share operational caches across gyms; support stale/unavailable/denied/pending/repair states; preserve server fences/CAS/idempotency/quote acknowledgments and snapshots. Arbitrary themes, dark mode, upload/white-label domains and role builders require additional product/backend scope. Current source does not establish tenant-specific navigation customization, custom domains or subdomain resolution.
