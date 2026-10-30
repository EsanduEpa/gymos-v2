# Web session configuration and verification

Policy: [DEC-02](../decisions/DEC-02.md), [limited DEC-11 approval](../decisions/DEC-11.md).

Set server-only `GYMOS_API_URL` to the independently deployed V2 API and `GYMOS_WEB_ORIGIN` to the exact public web origin (scheme, hostname and optional port, no trailing slash). Production requires a configured origin; public production origins require HTTPS. Loopback HTTP is supported for local development and owned disposable tests. Do not add wildcard `allowedOrigins` or trust arbitrary forwarded hosts. A deployment/proxy must preserve the browser's public Host for Next.js's additional Server Action check. Provider topology/approval remains task 087.

The session cookie is host-only, HttpOnly, SameSite=Lax, path `/`, Secure in production, and expires two seconds before the signed JWT to account for browser HTTP-Date rounding. Private responses and API reads use no-store. No refresh token or automatic command retry exists. Sign in again after 15 minutes. The API remains authoritative if a browser holds an expired/revoked cookie.

Logout revokes all sessions belonging to the identity through a transactional security-version update. Concurrent logout uses a version comparison, so an old request cannot revoke a later replacement session. The web action always deletes its cookie and invalidates router state; a failed/unconfirmed revocation shows uncertainty about other devices. Logout on a browser with an already-invalid token also cannot confirm identity-wide revocation. The action has a five-second API timeout.

Gym changes use full document navigation and current access checks. The shell is keyed by identity, gym and role. A browser lifecycle boundary conceals restored history documents and reloads them, checks current session on focus/visibility and every 30 seconds, and leaves at token expiry. Logout conceals the current view and signals other tabs through an in-memory BroadcastChannel. It suspends local session checks while the action delivers cookie deletion. No bearer is passed to client components or stored in localStorage/sessionStorage.

Manual checks with disposable identities:

1. Sign in as an owner, trainer and member. Confirm the current gym/name/role and only implemented links. At 320px, open the menu with Enter; Tab/Shift+Tab stay inside; Escape/backdrop close it; focus returns and page scrolling resumes.
2. With two gym grants, switch through the chooser. Confirm the destination gym's role/theme and no prior gym rows. Revoke one disposable grant, then follow its stale chooser link: it must show the same not-found page as an unknown gym. Return to Dashboard resolves current access.
3. Inspect cookie metadata in browser developer tools without copying its value. Verify HttpOnly, Secure under production HTTPS, SameSite=Lax, host-only, path and bounded expiry. Verify no bearer in page HTML or browser storage.
4. Sign out with another tab open, then use Back and a bookmarked private URL. Both tabs must show sign-in and no prior private rows. A saved test bearer must fail the next protected API call. Never put a bearer into evidence/logs.
5. Stop only the owned disposable API, then sign out. The cookie must disappear and the page must state that other-device revocation could not be confirmed. An unavailable workspace shows a generic retry/return/sign-out state without raw errors.

Run `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/two-gym.e2e.spec.ts` only after completing the production build. The harness refuses shared/external databases, reports owned cleanup, and keeps authentication traces disabled. Task 065 owns the full supported-browser/visual acceptance matrix; selected-provider HTTPS verification remains a release gate.
