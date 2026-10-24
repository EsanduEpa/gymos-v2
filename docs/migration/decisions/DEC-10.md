# DEC-10 — Routes, Classic baseline and branding projection

Status: **Approved as written by the project owner/Product approver.** The approved outcome is recorded below for GYMOS-MIG-086. Visual acceptance and browser evidence remain part of Task 065.

Date prepared: 25 October 2026  
Author: Codex  
Accountable reviewers: Product owner and Design/Frontend lead; project owner/Product approval recorded below. No separate named Design/Frontend reviewer was supplied.
Sources: UI migration map §§9, 11, 18; Functionality migration map D09/D20; Database migration map DB13; Task GYMOS-MIG-086.

## Settled scope this proposal preserves

- V1 remains hosted on Vercel for function testing while V2 is developed separately. This decision does not authorize V1 teardown or changes to its current test setup.
- V2 must use its own newly created database and credentials. V1 and V2 must not share a database or application secret; the actual local/hosted V2 settings still require separate verification.
- V1 is the visual and navigation reference for V2. The current V2 landing page is scaffolding, not the final authenticated root behavior.
- MVP gym branding is limited to a primary color and an HTTPS logo. Expanded presets, fonts and display modes stay out of MVP.
- V1 geometry and system-font typography form the Classic baseline. Primary brand color never replaces semantic success, warning, error, text or focus colors.

## Proposed route decision

Use `/login` for sign-in and `/admin` for the platform administrator. Use canonical gym routes `/gyms/{slug}/owner`, `/gyms/{slug}/trainer` and `/gyms/{slug}/member`; each route is checked against the current identity, active gym access and that gym's role on the server/API. A path slug is only a requested context, never proof of access.

After sign-in or a visit to `/`:

| Current session | Proposed destination |
|---|---|
| No valid session | `/login` |
| Platform administrator | `/admin` |
| Ordinary identity with no active gym access | `/no-access` with sign-out and a plain contact-your-gym message |
| One active gym access | Its canonical route for that gym's role |
| More than one active gym access | `/gyms/select`, listing only gyms the current identity may enter |

Selecting a gym navigates to the route matching that gym's role. Do not silently choose the first gym when more than one is available. Keep selected gym and role in the route; switching context clears prior-gym client state before loading the destination.

For an authorized slug, bare `/gyms/{slug}` redirects to the matching role route. `/trainer` and `/member` remain compatibility aliases: they redirect only when the session has exactly one matching gym; otherwise they open the chooser with the requested role preserved only as a hint, and the server verifies the role again after selection. Unknown, inactive and unauthorized gym slugs return the same not-found response so the route does not reveal another gym's existence.

Support starts in the platform's read-only support context and exits back to `/admin`; it does not turn support into an owner session. An explicit “Open owner workspace” action may navigate to an owner route only when the identity independently has active OWNER access. Any `returnTo`/callback parameter must be a validated local route from the route builder; reject external URLs, protocol-relative paths, malformed slugs and routes inconsistent with the current identity. If validation fails, use the normal role destination.

## Proposed public branding decision

Keep `GET /gyms/:slug/theme` as the minimal public branding projection needed to render a gym-branded sign-in or public shell. Its response may contain only the canonical slug, public display name, validated primary color and nullable HTTPS logo URL. Exclude internal gym/user IDs, access roles, tenant database names, registry versions, subscriptions and operational configuration. Return the same not-found result for unknown and inactive gyms. This endpoint grants no gym access; all private reads and actions still require a current authenticated role check.

Accept a primary color only as six-digit hex and a logo only as HTTPS. Do not fetch the logo from the API server. On a missing, invalid, blocked or failed logo, show a fixed-size monogram derived from the public gym name; on missing/invalid theme data, use the V1 Classic platform fallback. Validate color values again before putting them in CSS variables. Use text/focus/status tokens with tested contrast rather than deriving them from the gym color. Keep the public login generic when gym context is not yet known.

## Proposed support and visual acceptance

Support current and immediately previous stable releases of Chrome, Edge, Firefox and Safari, plus current and immediately previous major iOS Safari and Android Chrome versions available on supported devices. Task 065 records actual browser/OS versions tested; no browser version is claimed tested by this proposal.

Use the migration map's matched capture sizes: desktop 1440×1000, tablet 768×1024, mobile 390×844, with 320px as a stress width. Compare the same browser, font, scale, timezone and deterministic fixture state. Require no clipped controls, overlap, hidden focus, unreadable contrast or lost content. Keep route/layout geometry and V1 hierarchy; allow pixel differences caused by platform text rasterization only. Mask time-dependent values and animation consistently, never real content differences. Review intentional differences per screen; do not use a broad pixel-difference percentage to hide them.

## Options and tradeoffs

| Topic | Recommended default | Alternative | Tradeoff |
|---|---|---|---|
| Multiple gym access | Explicit chooser; never select first gym silently | Pick most recently used gym | Chooser is clear and auditable; a preference is faster but requires persisted selection and careful stale-access handling |
| Legacy role links | Keep `/trainer` and `/member` as safe aliases to one-gym destination or chooser | Remove aliases and return not-found | Aliases reduce broken bookmarks; strict removal is simpler but breaks old links |
| Missing/inaccessible gym | Uniform not-found response; `/no-access` only for a signed-in identity with no accessible gyms | Distinguish forbidden from missing | Uniform response avoids revealing gym existence; separate errors can be more explicit but leak membership information |
| Branding fallback | V1 Classic colors/system font and gym-name monogram | Always show generic platform mark | Monogram identifies the selected public gym; generic mark is simpler and reveals less gym branding |
| Visual baseline | Same geometry, deterministic captures, explicit per-screen review | Global pixel-diff threshold | Per-screen review avoids hiding meaningful layout regressions behind a percentage |

## Concrete acceptance examples

1. A signed-out visit to `/` goes to `/login`; no gym role or private data is inferred from a URL.
2. A signed-in OWNER with one active gym reaches that gym's owner route. An identity with two gym roles sees both authorized gyms and can choose the corresponding role route.
3. An identity without active gym access sees `/no-access`. Requests for an unknown gym and another user's gym produce indistinguishable not-found behavior.
4. A stale callback URL to an external host, a malformed slug or a MEMBER return into an OWNER route is rejected and falls back to the current role destination.
5. Platform support exits to `/admin`; it cannot gain OWNER authority through a remembered URL. An independently authorized OWNER can explicitly open their owner route.
6. The public theme response contains only the allowlisted fields. A broken logo displays the monogram without breaking layout; a malicious color value falls back safely and never changes semantic status or focus colors.
7. Two gym themes change only approved brand accents; geometry remains the same at all three target widths and usable at the 320px stress width.

## Impacts and follow-up

No schema change is proposed. The theme endpoint already returns the minimal name/slug/primary/logo shape and validates HTTPS on owner updates; actual public-data behavior should be covered by API tests when the consuming page work begins. Current V2's root is a marketing scaffold, sign-in chooses the first gym, the gym page mixes role handling, and logo failure has no fallback. These are source observations, not runtime verification.

Task 011 implements Classic tokens; Task 019 implements the role-aware shell and chooser; Task 015 implements the scoped primary/logo editor. Task 065 records visual and accessibility evidence. No implementation task may broaden the MVP theme editor or weaken server-side access checks based on this decision.

## Approval record

- Product owner: **Esandu (project owner); approved as written in the Codex task conversation**
- Design/Frontend reviewer: **No separate named reviewer recorded; visual review remains in Task 065**
- Decision date: **25 October 2026**
- Selected changes or exceptions: **None; approved as written**
