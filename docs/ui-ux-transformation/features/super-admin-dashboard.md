# Super Admin dashboard transformation

## Existing implementation

`apps/web/src/app/admin/page.tsx` authenticates the current session, requires SUPER_ADMIN, reads the cursor-paged gym registry and cached analytics summary, then renders platform components inside DashboardChrome. Registry supports operation retry, owner credential issuance/replacement/acknowledgment, lifecycle transitions and scoped support. Create-gym setup uses a stable request key; API authorization and durable operation state remain authoritative.

Existing UX issues addressed here: oversized general headings, limited hierarchy, dark-only Classic navigation, dense diagnostic metadata, ambiguous “View dashboard” selection, support reason form remote from its selected row, uncontrolled setup fields resetting on submit, and summary refresh text implying every cached count was current.

## Target and appearance

One shared layout in Atlas Light/Midnight Blue: compact platform heading, real total/active/member/trainer metrics, a freshness-aware health panel, labeled registry, focused create-gym form and an onboarding explanation. No invented charts, billing totals, revenue or “recent activity” are shown.

Atlas uses a soft gray page, white navigation/cards and restrained blue actions. Midnight uses deep navy page/navigation, lighter navy cards and cyan actions with dark foreground. Success/warning/error retain separate semantic colors in both. Geist Sans, Lucide icons, spacing, radii, dimensions, action order and responsive rules are shared.

## Existing-to-new behavior mapping

| Existing behavior | New UI location | Preserved outcome |
| --- | --- | --- |
| SUPER_ADMIN session gate | Server page before content | Other identities redirect as before; server-held bearer remains private |
| Total gyms and aggregate counts | Four overview cards | Values come from existing registry/summary contracts; withheld data displays unavailable marker |
| Cached health/freshness | Workspace health panel | Verified/stale/unavailable and UTC snapshot remain visible; stale is explicitly included in unavailable |
| Bounded refresh | Health panel footer | Checks at most 25 gyms; returned continuation cursor advances to next batch; errors/partial results remain explicit |
| Registry table and cursor | Gym registry, table/cards | Same six logical columns, 25-row bound, next/first page, observed counts, status and health |
| Gym selection for support | Open support row action → modal | Requires real reason code/explanation, native field validation and explicit entry; reason remains private to support flow |
| Active support context | Registry banner and support shell | Open summary/exit, expiry and read-only scope remain available |
| Provisioning state/step/reference | Setup details disclosure | Diagnostics remain available with retry/repair/owner-verification guidance |
| Owner credential handoff | Setup details controls | One-time issue, explicit lost/expired replacement, acknowledgment and secret clearing preserved |
| Suspend/reactivate/resume | Row lifecycle action and existing confirmation | Reason, current version, stable key, original-operation resume and consequences preserved |
| Create gym | Dedicated onboarding section | Same name/slug/owner/currency/timezone contract; controlled values survive action completion/status checks |
| Sign out | Sidebar footer | Existing identity-wide revocation and browser clearing flow preserved |
| Mobile navigation | Native modal drawer | Focus trap, Escape, focus return and scroll lock retained |
| New appearance choice | Header Light/Dark group | Display-only preference persists before paint; no business/authorization change |
| New sidebar collapse | Desktop header control | Icon navigation remains named; preference persists independently |

## Forms, states and integration

Create fields: name (2–100), lowercase slug pattern, owner email, LKR/USD currency selector and IANA timezone. Fields become read-only when a reservation is known; request key stays stable. Pending, unknown/unavailable error, operation status, owner verification, complete and refresh states reuse existing actions. No automatic database worker or subject consent endpoint is added.

Support modal: diagnosis code plus 10–500 character explanation. Confirmation requests native form submission so invalid/empty fields cannot call the action. Pending disables dismissal through the shared ConfirmDialog; Escape/cancel returns focus. The selected reason and explanation remain controlled so recoverable action failures retain input. Domain expiry, replacement and authorization remain server controlled.

Registry failures render a recoverable message within the authorized shell; unavailable aggregate summary leaves registry usable. No inaccessible or failed response becomes a fabricated empty/zero state. Setup metadata is disclosed on demand, not deleted. All existing backend mutations use the existing server actions and services.

## Reuse and dependencies

Reuse DashboardChrome, SessionLifecycle, Button, Card, Field, Feedback, EmptyState, StatusBadge, ConfirmDialog, lifecycle and credential controls, all contracts and API routes. Add PlatformOverview, ThemeToggle and a display-preference helper. Add Geist (locally served font) and Lucide React (icons); lock versions in the workspace lockfile. No new backend dependency/schema/configuration.

## Accessibility and QA acceptance

- Keyboard navigation, named icon controls, skip link, modal focus/return and native required-field validation.
- Light/Dark pressed state and persisted choice; identical component geometry across themes.
- No root horizontal overflow at 1440, 1024, 768, 390 and 320px; usable registry actions, forms and dialogs.
- Readable semantic foreground/status pairs and visible focus; reduced-motion behavior.
- Provisioning reserve/replay/worker result, credential issue/reissue/ack, read-only support switching/exit and lifecycle suspend/reactivate still work.
- Existing server role/tenant protections and identity/session behavior remain untouched.
- Synthetic browser tests disable authentication traces and capture only deliberate nonsecret visual states in a disposable owned database environment.

## Validation results

Validation completed against the final production build:

| Check | Result |
| --- | --- |
| `pnpm --dir apps/web build` | Passed, including Next prerendering and TypeScript |
| `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` | Passed |
| `pnpm --dir apps/web lint` | Passed |
| `git diff --check` | Passed |
| Focused real-API Playwright scenarios | **4 passed (27.4s)** |

Browser command: `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test tests/two-gym.e2e.spec.ts --grep 'platform (appearance|form|registry|lifecycle)'`.

Verified: initially withheld metrics, refresh to actual tenant profile totals, both palettes at 1440/1024/768/390/320px, identical metric geometry between modes, no root horizontal overflow, theme persistence after reload, sidebar collapse persistence, mobile drawer Escape/focus return, native support validation before any support operation, centered viewport-fitting support dialogs at 1440/320px, metric text contrast, reduced-motion transition suppression, no browser page errors, retained provisioning fields, stable-key reservation replay, actual provisioning worker completion, credential issue/reissue/acknowledgment, support context switching/expiry display/exit, owner eviction after gym suspension and verified reactivation.

Existing test selectors were updated for the intentional Currency select, Open support action and Setup details disclosure. No business assertions were removed. The disposable test run removed its seven owned databases, container and manifest. The regular application databases were not used.

Visual review opened the generated desktop light/dark, mobile dark and support-dialog captures. It caught and corrected mobile heading wrapping, reduced-motion specificity and default dialog positioning before final verification. Captures are under `apps/web/test-results/ui-transformation/super-admin/` (generated/ignored), with existing platform workflow evidence under `apps/web/test-results/migration-evidence/`.

Scope limits: this is not a full application regression run, a screen-reader audit or WCAG certification. Owner/Trainer/Member appearance migrations and unsupported product capabilities remain later work. Native required-field validation, current server guards/contracts and existing operation semantics remain authoritative.
