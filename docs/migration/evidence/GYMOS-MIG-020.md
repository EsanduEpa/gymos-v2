# GYMOS-MIG-020 — Web sessions and logout evidence

Date/operator: 30 October 2026, Codex; project-owner decision reviewer: Esandu.
Status: **Implemented and locally verified; hosted checks pending.** Branch `codex/segment-02-identity-shell`, base `87c1766`; final immutable revision/hosted run will be recorded in the handoff.

## Policy reconciliation

DEC-11 was absent. The owner explicitly approved the limited web-session proposal in this conversation; [DEC-11](../decisions/DEC-11.md) records the approval and exact defaults. That satisfies task 020's relevant policy portion of dependency 087. Provider/capacity/release decisions remain open in task 087; task 087 is not marked complete and no deployment is authorized. DEC-02's working login, credential change, token verification and authorization were preserved.

## Implemented

- Host-only HttpOnly/SameSite=Lax/path `/` cookie, Secure in production. Expiry is bounded by the signed JWT and capped at 15 minutes, with two seconds of early expiry to prevent observed Chromium HTTP-Date rounding from extending it. Tokens remain in server adapters/HttpOnly transport; no bearer is passed to client components, HTML, URLs or browser storage.
- Exact configured `GYMOS_WEB_ORIGIN` validates all web mutations before actions. Absent/null/foreign/malformed origins, wrong scheme/port and cross-site Fetch Metadata fail closed. No forwarded-host trust or wildcard origins. Next.js's own Server Action validation remains enabled. Production public origins require HTTPS; owned loopback HTTP tests are explicit. Backend clients authenticate with bearer transport, independently of web cookie CSRF handling.
- Nest `POST /auth/logout` derives identity from the verified token and rotates its current security version in a Master transaction. Version comparison makes concurrent calls rotate once and prevents stale logout from revoking a replacement session. Restricted credentials may log out. No arbitrary target identity is accepted.
- Web logout validates the response, has a five-second API timeout, and always deletes the cookie/invalidate router state in `finally`. Any failed or unconfirmed revocation, including an invalid token, reports uncertainty about other devices. No command is retried automatically.
- Private API/web responses and server reads use no-store. Login/password-change completion/logout invalidate router state. Identity/gym/role keys and document navigation prevent state reuse; restored history documents remain concealed until a fresh render. In-memory cross-tab logout signaling, focus/visibility/current-session checks, 30-second checks and token-expiry navigation do not store secrets. Session checks are suspended during local logout so they cannot interrupt cookie deletion delivery.
- No refresh token/renewal endpoint exists under approved DEC-02. Refresh race is inapplicable; expiry requires login. Concurrent logout and stale-response races are tested instead.

## Verification

Environment and baseline: see [task 013](GYMOS-MIG-013.md). All following final commands exited 0:

| Command | Result |
|---|---|
| `pnpm build:workspace` | API/web/shared builds passed; subsequent final web builds also passed |
| `pnpm lint:workspace` | Passed |
| `pnpm typecheck:workspace` | Passed |
| `pnpm test:unit` | Contracts 19, API client 12, tokens 5, API source 19, pools 23 passed |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` | 10/10 passed; four owned databases/container cleaned |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/two-gym.e2e.spec.ts` | 6/6 passed; owned cleanup reported |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/two-gym.e2e.spec.ts --grep 'web sessions\|logout clears'` | Final focused run 2/2 passed, including logout/focus race and generic API-unavailable workspace error |
| `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test` | Final session/logout runtime contracts 19/19 passed |
| `git diff --check` | Passed |

Actual assertions include real login cookie flags/expiry, no token in DOM/localStorage/sessionStorage, private no-store headers, five rejected Origin/Fetch-Metadata cases with unchanged security version, two tabs on logout, Back/private bookmark after logout, saved token rejected by session and protected member API, already-expired and subsequently-expiring tokens, revoked version, and fresh different-identity/gym navigation without old rows. API integration proves exactly one version increment for concurrent logout, rejection of both old sessions, preservation of a later login against stale logout, and logout of forced-change credentials. Identity/access/operation counts remain unchanged.

Stopping only the owned API proves browser cookie deletion with unchanged Master version and visible revocation uncertainty; a later protected URL returns to login. A separate unavailable workspace shows generic retry/return/sign-out without raw backend errors. [Unavailable logout capture](GYMOS-MIG-020/backend-unavailable.png); [fresh identity](GYMOS-MIG-020/fresh-identity.png). Authentication traces are disabled to avoid retaining credential traffic. Tests use runtime-generated disposable credentials; no secret values are evidence.

## Limits and handoff

[Web session runbook](../runbooks/web-sessions.md) records configuration and manual checks. Selected-provider HTTPS/proxy verification and release decisions remain task 087/067. Full browser/OS matrix remains task 065. No provider, V1, production/shared database, mobile auth, password reset or self-registration was used/added. Hosted checks are a separate pending gate at this checkpoint; no merge is authorized.
