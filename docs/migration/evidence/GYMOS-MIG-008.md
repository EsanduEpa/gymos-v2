# GYMOS-MIG-008 evidence

Historical assessment date: 25 October 2026
Latest local revision tested: `6f3358c` (working tree unchanged during verification)
Historical checkpoint: CI implementation and local checks passed, but remote, hosted verification and online audit access were then unavailable. This checkpoint is superseded by the authenticated hosted results recorded below.

## Implemented

- Added `.github/workflows/ci.yml` with separate workspace install, build, lint, type-check, unit, owned database, browser, secret scan, pull-request dependency review and lockfile audit jobs.
- Pinned Node.js to `24.22.0`, pnpm to `9.15.0`, and configured the pnpm cache against `pnpm-lock.yaml`.
- Build and code-check jobs have no database URLs or JWT secret. Only disposable database/browser jobs set `GYMOS_TEST_ALLOW_DOCKER=1`; the Task 7 runner creates its own random service credentials.
- Added workspace package graph validation. Contracts, API client and theme-token packages have manifests, exports and build targets; schema directories remain Prisma inputs.
- Added names-only environment guidance at `docs/migration/runbooks/ci.md`.
- Pinned Playwright to its bundled Chromium for consistent local and CI browser execution.
- Registry audit initially identified vulnerable transitive versions of `undici`, `tmp`, `body-parser` and `multer`. Exact pnpm overrides now resolve to patched releases, and the updated lockfile audit reports no known vulnerabilities at the configured high threshold.
- CI retains only a safe status/revision summary for seven days. It does not upload browser traces, screenshots, raw output or credentials.

## Local verification

Commands below ran from the repository root with Node `v24.22.0` and pnpm `9.15.0` at revision `6f3358c`. Exit code 0 means passed; exit code 1 means unavailable/failed as described.

| Command | Result |
| --- | --- |
| `CI=1 pnpm install --frozen-lockfile` | Passed; lockfile current, clean install completed |
| `pnpm check:workspace` | Passed; 5 workspace packages validated |
| `pnpm build:workspace` | Passed; API, web, contracts, API client and theme tokens built |
| `pnpm lint:workspace` | Passed |
| `pnpm typecheck:workspace` | Passed |
| `pnpm test:unit` | Passed after repairing the pool-test configuration; contracts 17, API client 12, theme tokens 5, API source 17 and pool lifecycle 23 tests |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:database:owned` | Passed; 3/3 ownership/cleanup tests |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:isolated` | Passed; 3/3 real-browser tests covering isolation plus Classic responsive/contrast/fallback behavior; owned databases and container cleaned |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:recovery:owned` | Passed; 1/1 recovery drill; 8 owned databases and container cleaned |
| `pnpm audit --audit-level high` | Not verified (exit 1): sandbox could not resolve `registry.npmjs.org`. An escalated retry was rejected by automatic approval review because pnpm would transmit dependency metadata to the npm audit endpoint. |

The first Webpack-free build attempt hit the local sandbox's blocked helper port. The normal build script now uses Webpack; the workspace production build then passed. The owned database, browser and recovery suites initially failed to access the local Docker socket inside the sandbox. Each passed when rerun with the explicitly owned disposable test setup and approved Docker access. These were environment corrections, not passing test results.

## Hosted checks not run

`git remote` returns no configured remote. No pull request or hosted workflow run exists, so GitHub secret scanning and its dependency-review action have not executed on this revision. The workflow is committed for the first pull request. Do not treat its hosted jobs as passed until that run succeeds. V1 credential revocation, reuse investigation and external access review remain Task 10 evidence and are not inferred from this local dependency audit. Task 008 remains open until hosted PR checks and the high-severity lockfile audit can be verified.

## Remote verification update — 30 October 2026

Origin is now configured for EsanduEpa/gymos-v2. Public GitHub workflow-run and pull-request API reads returned HTTP 404; this does not prove that no runs exist. Authenticated hosted evidence is still required. No workflow was triggered and no local test result was substituted for hosted checks.

## Owner-reported hosted failure — 30 October 2026

Owner reports Run workflow failed. Exact run URL, failed job and first error are requested because public API access returned 404 and no authenticated GitHub client is available locally. No cause or passing hosted result is inferred.

Owner supplied run https://github.com/EsanduEpa/gymos-v2/actions/runs/41009603800. Opening it in the available browser displayed GitHub Page not found, consistent with unavailable repository access; no job logs were visible. Failed-job error text or authenticated access is needed to diagnose the run.

## Authenticated Chrome diagnosis and local repair — 30 October 2026

Authenticated Google Chrome exposed run https://github.com/EsanduEpa/gymos-v2/actions/runs/41009603800 at revision e72ccea32ad6f61ffa95c01b52e38a666f391b33. This supersedes the earlier inaccessible-run observation. Workspace install, lint and online lockfile audit passed; dependency review was skipped on manual dispatch. Build/type/unit/recovery lacked generated Prisma clients or built shared exports; disposable tests lacked the postgres:17 image; browser lacked built application artifacts.

Repairs: `pnpm prepare:checks` generates both clients directly from schema without environment/database inputs and builds shared packages. Each consuming CI job runs it. Owned database/browser/recovery jobs pull postgres:17 explicitly; the harness still refuses automatic pulls and unowned targets. Browser CI builds applications before launching production servers.

Gitleaks 8.30.1 reproduced all 31 historical findings locally with redaction. Review against each referenced commit classified 26 preservation-file SHA digests, four documentation-prose matches and one upstream Nest README badge demonstration token. Exact historical fingerprints are recorded in .gitleaksignore; no rule or file/path exclusion was added. The demo token query was removed from the current README. Reviewed-history scan reports zero remaining findings; new findings remain blocking.

Local verification after repair (all exit 0): prepare:checks; build:workspace; typecheck:workspace; test:unit (18 contracts, 12 client, 5 theme, 19 API, 23 pool tests); lint:workspace; owned database tests (3); recovery drill (1, eight owned databases cleaned); browser isolation/accessibility/branding (3, six owned databases cleaned); redacted Gitleaks history scan; git diff --check. Docker suites ran only under explicit owned-fixture opt-in. These results do not substitute for a hosted PR run on the repaired revision. No real provider database, credential or V1 source was changed.

### First repaired hosted PR run

Draft PR https://github.com/EsanduEpa/gymos-v2/pull/1 triggered run https://github.com/EsanduEpa/gymos-v2/actions/runs/41010491330. The secret action needs pull-requests:read to list PR commits; the follow-up workflow grants only that read permission within the scanner job. Dependency review explicitly fails because the private repository lacks supported dependency-graph/Advanced Security configuration. This is a provider capability/configuration blocker, not a passing dependency review; no paid feature was enabled or check disabled. The hosted lockfile audit already passed in the original manual run.

Owner explicitly approved the supported base/proposed lockfile audit alternative after GitHub reported dependency review unsupported for the private repository. The replacement reads only committed manifests, installs no revision dependencies, audits both snapshots online, and fails closed on proposed high/critical findings or unavailable audit data. Repository privacy remains unchanged.

The first repaired PR run passed hosted workspace/build/lint/unit/owned-database/recovery/lockfile-audit jobs. Browser was cancelled by the superseding run. Clean hosted web type-check also requires Next route type generation (`LayoutProps` was absent); the workflow now runs `next typegen` before type checking. Local `next typegen` passed. The replacement base/head dependency audit is prepared but has not been run or published pending explicit npm metadata-transmission approval after automatic approval review rejection.

Owner explicitly approved npm metadata transmission locally and on GitHub. The replacement audit passed against base e72ccea and proposed 1bc21bd with zero high/critical findings on both. Controlled local negative checks verified rejection of high vulnerabilities, unavailable audit data and malformed responses without external calls. Earlier pending-approval wording is superseded.

## Completed hosted verification — 30 October 2026

Run https://github.com/EsanduEpa/gymos-v2/actions/runs/41010929511 at revision 9f1849a succeeded. All 11 jobs passed: workspace (32s), build (1m12s), lint (45s), type-check (53s), unit (45s), disposable databases (1m2s), browser (2m18s), encrypted recovery (56s), secret scan (8s), dependency review (21s), and lockfile audit (34s). Observed directly in authenticated Google Chrome. This supersedes prior failed/inaccessible checkpoints. Task 008 is Completed; PR https://github.com/EsanduEpa/gymos-v2/pull/1 remains unmerged. No required hosted check was skipped. Later closure edits contain documentation only; the successful run's exact code revision is retained here.

## Final closure revision verification — 30 October 2026

Authenticated Google Chrome showed [run 41011340034](https://github.com/EsanduEpa/gymos-v2/actions/runs/41011340034) succeeded for closure checkpoint commit `49217ddb8ff93256120317b6b1a3ad50e5046e93`. All 11 required jobs passed: workspace, build, lint, type check, unit tests, owned disposable database tests, browser isolation, encrypted backup/restore, secret scan, dependency review and lockfile vulnerability audit. The PR check view reports 11 successful checks and the PR remains draft/unmerged. This is documentation-only closure after the code-bearing `9f1849a` run; the latter's 11-job result remains recorded above.

### Navigation-race follow-up — 30 October 2026

Run [41013007595](https://github.com/EsanduEpa/gymos-v2/actions/runs/41013007595) failed only the browser isolation test when a streamed unauthenticated home redirect to `/login` overlapped the following login navigation. The test now waits for the redirected URL before continuing. The focused two-gym test passed locally using the explicit owned-fixture flag; cleanup reported six disposable databases, the container and manifest removed. Authenticated Chrome then verified [run 41013407287](https://github.com/EsanduEpa/gymos-v2/actions/runs/41013407287) passed all 11 jobs at `bdf3b41097ad32504bc15275c42c2dffe2a97099`, including browser isolation and secret scan. No product behavior changed.
