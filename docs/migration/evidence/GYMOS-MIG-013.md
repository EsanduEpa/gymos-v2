# GYMOS-MIG-013 — Dashboard shell evidence

Date/operator: 30 October 2026, Codex; project-owner review remains with Esandu.
Status: **Completed.** Code/CI revision `367bdf8` passed all 11 hosted checks in [run 41042328353](https://github.com/EsanduEpa/gymos-v2/actions/runs/41042328353); [PR #2](https://github.com/EsanduEpa/gymos-v2/pull/2) remains draft and unmerged.
Branch: `codex/segment-02-identity-shell`, based on `87c1766`. The working tree was initially clean and only one worktree was attached. The existing local owner-safeguard documentation commit was preserved. PR #1 was inspected in signed-in Google Chrome: draft, unmerged, remote head `e45a334`. This change uses a separate branch/PR stacked on that foundation, without merging it.

## Implemented and inspected

- Shared Classic chrome for owner/trainer/member and platform administrator: 224px desktop sidebar, 256px mobile drawer, 52px header, current identity/role/gym and active links. Existing basic member list/create and administrator gym creation remain available.
- Current identity and gym access are read server-side and parsed with strict shared contracts; protected gym entry still calls the unchanged Nest actor/binding guard. The safe session projection adds only identity ID and bounded display name. Theme is presentation only; missing/invalid branding falls back to Classic, failed HTTPS images to a monogram.
- Only implemented destinations are linked. V1 schedule/directory/analytics/configuration and other unfinished features are not advertised. Trainer/member entries retain an honest unavailable-tools state. No owner roster request is used to render those roles.
- Drawer uses a modal dialog, focus wrap, Escape/backdrop/close controls, opener restoration and body scroll lock; navigation creates a new document. Gym switching uses the current chooser, discards the old view, and reloads authorization/theme at the destination. Shell keys include identity, gym and role.
- Uniform foreign/unknown/revoked not-found, safe retry/return/sign-out error state and shared loading states. Return goes through current role/gym resolution, rather than a fixed owner path. Bare gym entry redirects to the canonical role URL while preserving safe form feedback.
- Support/lapsed banners and the notification bell are documented integration boundaries. No impersonation, synthetic badge/count, unsupported payment link, subscription link or unauthorized owner workspace is added. Task 024 owns authorized read-only support; notification feature tasks own scoped reads/read-status commands.

## Verification

Node `v24.22.0`, pnpm `9.15.0`, macOS, installed Chromium, production Next.js 16.4.2 output, owned loopback PostgreSQL 17 fixtures. No V1 code or database was modified or executed. Existing captured V1 fixtures/source were read only.

| Command | Result |
|---|---|
| `pnpm build:workspace` | Exit 0 |
| `pnpm lint:workspace` | Exit 0 |
| `pnpm typecheck:workspace` | Exit 0 |
| `pnpm check:workspace` | Exit 0; five packages |
| `pnpm test:unit` | Exit 0; contracts 19, API client 12, tokens 5, API source 19, pool lifecycle 23 |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` | Exit 0; 20/20, eight owned databases/container cleaned |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/two-gym.e2e.spec.ts` | Exit 0; 6/6, six owned databases/container/manifest cleaned |
| Final web build plus focused session/logout browser run | Exit 0; see task 020 for the final logout race and error-state coverage |
| `git diff --check` | Exit 0 |

Browser assertions cover all three gym roles, active links, header/sidebar dimensions, 320px no horizontal overflow, focus wrap, Escape, backdrop, focus restoration, navigation dismissal, scroll restoration, two-gym switching and a stale chooser grant revoked between render and click. Identity/access/operation row counts were unchanged by shell reads. Existing two-gym member mutation still adds exactly one Alpha member and zero Beta members. Real successful trainer/member entry required completing disposable fixtures with committed operations and reciprocal receipts; the authorization guard was not relaxed.

Visual review compared the existing V1 shell source/captures with actual V2 captures. V1 chrome geometry is retained; the existing V2 basic feature contents remain until their owning migration tasks. Screenshots: [owner desktop](GYMOS-MIG-013/owner-1440.png), [trainer desktop](GYMOS-MIG-013/trainer-1440.png), [member drawer at 320px](GYMOS-MIG-013/member-320-drawer.png), [member at 320px](GYMOS-MIG-013/member-320.png). [Branding captures](GYMOS-MIG-013/branding/) cover 1440/768/390/320px and identical two-gym banner geometry. Historical task 011 screenshots were restored instead of overwritten.

Task 065 retains full supported-browser and final feature visual acceptance. No Safari/Firefox/Edge or selected-provider deployment verification is claimed. Hosted verification and immutable revisions are recorded in the [Segment 02 handoff](../SEGMENT_02_HANDOFF.md).

## Hosted closure — 30 October 2026

Authenticated Google Chrome verified [run 41042328353](https://github.com/EsanduEpa/gymos-v2/actions/runs/41042328353) at `367bdf8`: all 11 required jobs passed. The existing owned database job now executes the environment harness (3), identity suite (10), and tenant suite (20). Browser regression passed 6/6, including the server not-found race fix and stronger canonical-denial URL assertion. Scanning, both dependency checks and encrypted recovery remained enabled and passed. Final local follow-ups passed role/session/logout 3/3, followed by the role-shell capture check 1/1 after matching V1's static desktop scrolling. Build, lint and type checks passed. The failed historical run and correction are retained in the shared issue log; no assertion was weakened.
