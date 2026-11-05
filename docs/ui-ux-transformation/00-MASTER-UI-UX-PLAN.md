# GymOS UI/UX transformation

## Current increment: Super Admin

Implement the approved Atlas Light and Midnight Blue direction on the existing `/admin` workspace and its read-only support summary. Retain the current Next.js App Router/server-action architecture, backend contracts, authentication, role checks, tenant isolation and operational state machines. Recheck the current source against the completed discovery before each feature increment.

This increment establishes shared appearance semantics and upgrades the Super Admin experience. Owner, Trainer and Member workspaces remain on Classic pending their own transformations. Shared primitives consume the semantic appearance through scoped compatibility aliases; there is one component tree for both appearances.

## Shared visual foundation

| Semantic role | Atlas Light | Midnight Blue |
| --- | --- | --- |
| Background | `#F3F6FA` | `#0A1528` |
| Card/popover | `#FFFFFF` | `#17243B` |
| Sidebar | `#FFFFFF` | `#0D1B30` |
| Primary | `#2563EB` | `#43D9E8` |
| Primary foreground | `#FFFFFF` | `#092532` |
| Foreground | `#172033` | `#EFF7FF` |
| Secondary text | `#667085` | `#A2B3C9` |
| Border | `#E3E9F1` | `#2D3C55` |
| Accent surface | `#EAF1FF` | `#153C4D` |
| Secondary surface | `#F4F7FC` | `#1C2D47` |

Additional semantic tokens define focus, inputs, hover, success, warning, error and their surfaces. Status colors remain distinct from selection colors. The implementation lives in `apps/web/src/app/platform.css`; migrated components must consume semantics rather than page-specific palette literals.

Typography uses the locally served Geist Sans package through Next font support. Platform spacing follows a 4px scale, controls use 8px radii and cards 12px. Lucide supplies one consistent outline icon family. Icon-only controls have accessible names. Reduced motion disables nonessential transitions.

A display-only localStorage preference initializes in the document head before workspace paint. Atlas Light is the initial default; the header offers explicit Light/Dark choices. Preference survives full navigation, logout and later browser sessions. No identity, token, tenant data or credentials are stored with it. Sidebar collapse has a separate display-only preference. The existing root session observer remains responsible for security expiry and context invalidation.

## Delivery order

1. **Super Admin foundation and dashboard:** themes, navigation, verified overview, registry, onboarding, support and lifecycle interaction polish. This increment.
2. **Member experience:** redesign actual trainer directory, requests, own sessions/calendar and assigned plan reading. A new home may summarize only authorized existing data. Completion/progress/profile/membership additions need explicit capability mapping first.
3. **Owner experience:** people, enrollment, PT, operational finance and settings, with audit correctness issues handled as explicit functional tasks.
4. **Trainer experience:** requests, daily execution, relationship-scoped clients, coaching and own earnings.
5. **Platform follow-ups:** any remaining operations/history features backed by approved APIs. SaaS billing, cash payments, physical attendance, payouts and arbitrary role management remain separate product work.

For each increment: inspect actual code → define layout/state behavior → map existing actions → implement with current contracts → run role/tenant/responsive/theme/keyboard checks → document evidence and gaps. Do not create native apps, mock operational data, duplicate light/dark pages or remove actions to accommodate appearance.

## Navigation and responsive rules for this increment

Desktop: white/navy left sidebar, collapsible to icon navigation, top header with breadcrumb, appearance controls and identity. Existing destinations become same-page Overview, Gyms and Create a gym anchors; no unsupported platform sections are added. Support mode retains the approved owner summary, All Gyms and explicit expiry/exit.

1440px: four summary cards, full registry table, creation form and explanatory sidebar. Below 1280px: registry becomes accessible labeled cards with the same six logical columns/actions. Tablet: two-column metrics and a single creation panel. Below 768px: focus-managed navigation drawer. At 390/320px: two-column compact metrics, single-column forms and labeled registry cards with accessible actions. Dialogs scroll within the viewport. Both appearances retain identical geometry.

## Constraints and risks

- Profile totals can be unavailable or withheld. Never replace them with zero or infer billing/revenue metrics.
- Summary freshness and unavailable counts are backend projections; stale summaries are included in unavailable, so these categories are not a mutually exclusive chart distribution.
- Registry is cursor-paged at 25 gyms. No frontend-only platform-wide search, sorting or filtering is introduced.
- Support requires an audited reason and expires after 15 minutes; it exposes sanitized summary data, not owner impersonation.
- Setup is asynchronous; existing-owner consent and provisioning worker deployment are backend/product dependencies. The interface reports actual status, not simulated progress.
- Credential plaintext stays in transient handoff state and is not replayable. Explicit replacement/reason/version and acknowledgment are preserved.
- No backend or database change belongs to this appearance increment.

See [Super Admin mapping and QA](features/super-admin-dashboard.md) for implemented behavior and validation results.
