# GYMOS-MIG-001 — Reproducible baseline evidence

Recorded 23 October 2026 for the authorized task001–010 execution. This report records task001 only. Task status remains for the coordinating agent to review and update; this evidence does not independently promote any migration task.

## Scope and snapshot boundary

Read the Master Plan, exact task001 specification, migration protocol, applicable source/map evidence and both repositories' instructions. Used the existing installed toolchain. No application fixes, installation, generation, build, environment-file loading, V1 execution, database connection or database-changing command was performed. Only this report and its evidence directory were written by task001.

The final hash comparison was taken **before** the coordinating agent was told the baseline was finished and application work could begin. Later authorized edits for other tasks must not be mistaken for baseline mutations. The command logs are historical snapshots, not assertions about a later worktree.

| Repository | Branch | HEAD at both snapshots | Initial status | Post-check status |
|---|---|---|---|---|
| V1 `/Users/esanduepa/Desktop/Projects/gymos` | `dev` | `058aa8532741c4cb84289589fd2cf89282882988` | Clean | Clean |
| V2 `/Users/esanduepa/Desktop/Projects/gymos-v2` | `main` | `25546dec684382438416ecf22a65c0262bb0f558` | `?? docs/` | `?? docs/` |

The pre-existing untracked planning directory and four source maps were retained. Task001 made no branch, commit or pull request. Documentation-only evidence remains untracked until the coordinating workflow reviews it.

[Initial state](GYMOS-MIG-001/initial-state.json) contains SHA-256 for every tracked non-`docs/` regular file: **144 V1 files and65 V2 files**, including source, configuration, schemas, migrations and lockfiles. [Post-check state](GYMOS-MIG-001/post-check-state.json) reports **zero changed and zero missing files** in each repository and unchanged revisions. Ignored/untracked dependencies, generated clients, caches and `.env` are outside this tracked-file denominator. No `.env` contents or credential values were read into these artifacts.

## Runtime and installed versions

Observed `node --version` → `v24.22.0`, `pnpm --version` → `9.15.0`; the metadata inspection exited0. Host platform was `darwin`/`arm64`. These are observed installed versions, rather than only manifest ranges or recommendations to upgrade. [Resolved package metadata](GYMOS-MIG-001/runtime-packages.json) records versions resolved from each workspace's installed dependency tree.

| Workspace | Installed package versions |
|---|---|
| Root | Prisma7.10.1; dotenv18.0.8 |
| API | Nest common/core12.2.0; Prisma client/pg adapter7.10.1; TypeScript6.0.3; Vitest4.1.12; Vite8.3.5; Zod4.6.7; pg8.23.1; Argon2 0.45.1; jose6.2.13; oxlint1.89.0; oxlint-tsgolint7.0.2004 |
| Web | Next16.4.2; React/React DOM19.3.0; TypeScript5.9.3; Tailwind4.3.3; ESLint9.39.5; eslint-config-next16.4.2 |

Version lookup used package resolution/read-only metadata and did not install packages or access external documentation/network services. Existing installed/generated artifacts were used as found; they were not regenerated to make checks pass.

## Executed command matrix

Working directory for all commands below: `/Users/esanduepa/Desktop/Projects/gymos-v2`. The five independent checks ran concurrently, captured stdout/stderr, and all finished normally. No command used fixing flags. Type checks explicitly disabled incremental output and emitted no code.

| Check | Exact command | Exit | Observed result | Evidence |
|---|---|---|---|---|
| Existing API unit | `pnpm --dir apps/api test` | 0 | One test file/one test passed | [Log](GYMOS-MIG-001/api-unit.log) |
| API non-fixing lint | `pnpm --dir apps/api lint` | 0 | No diagnostics reported | [Log](GYMOS-MIG-001/api-lint.log) |
| Web non-fixing lint | `pnpm --dir apps/web lint` | 0 | No diagnostics reported | [Log](GYMOS-MIG-001/web-lint.log) |
| API no-emit type check | `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` | 0 | No diagnostics reported | [Log](GYMOS-MIG-001/api-typecheck.log) |
| Web no-emit type check | `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` | 0 | No diagnostics reported | [Log](GYMOS-MIG-001/web-typecheck.log) |

[Machine-readable command results](GYMOS-MIG-001/command-results.json) include exact argument arrays, exits, elapsed durations and log names. Timing lines in tool output are host-reported; they are not user timezone scheduling claims.

The unit suite imports only `AppController` and `AppService` through a test module and asserts `Hello World!`. It does **not** import `AppModule`, instantiate database services or exercise HTTP authentication, tenant routing, provisioning, member creation or any domain behavior. A passing scaffold assertion is not migration, isolation, financial or deployment verification.

No observed check failed, so there is no baseline toolchain failure or product failure to classify. This does not establish that a fresh install/build will pass: no installation, client generation or application build was run. Web no-emit used the existing Next generated type environment as found; clean-build verification belongs to subsequent tasks.

## Milestone script inspection — not executed

Inspected `/Users/esanduepa/Desktop/Projects/gymos-v2/apps/api/scripts/verify-milestone.mjs` and the root `verify:milestone` command. The script is a meaningful integration check with **mutating and destructive behavior**:

- Requires `MASTER_DATABASE_URL`, `TENANT_DATABASE_URL`, `PROVISION_DATABASE_URL` and `JWT_SECRET` (lines16–18). Presence checks do not prove disposable ownership, safe host, dedicated Master database or nonproduction environment.
- Constructs Master client and starts existing built API/web servers on temporary local ports (lines21–23,154–163). It relies on previously built output/generated clients; it is not a standalone non-mutating source test.
- Inserts a temporary Super Admin (lines165–167), submits the real web gym form, and drives API provisioning, which creates physical tenant databases and applies migrations. Creates owners/basic members and updates themes (lines174–204).
- Checks two-gym API denial and reads the physical tenant databases (lines207–223). HTML form parsing uses regular expressions, rather than a real browser; no JavaScript, accessibility or screenshot coverage follows from it.
- Cleanup queries fixture slugs, deletes corresponding Master Gym rows and selected Users (lines126–137), then issues `DROP DATABASE IF EXISTS ... WITH (FORCE)` after a database-name regex check (lines138–148). It forcibly disconnects connections to those targets. A valid generated-looking database name does not by itself establish current run ownership.
- Uses the supplied Master/provisioner targets and registry data; cleanup can fail after prior side effects. It does not currently establish a separate per-run Master or durable ownership marker before mutation.

It must **not** be run as task001. GYMOS-MIG-007 must provide explicit disposable-environment/host/name/run-ownership guards and fault-safe cleanup before reusing it. Task001 does not validate that real provisioning, physical isolation, schema application or cleanup succeeds.

[Database-operation inventory](GYMOS-MIG-001/database-operation-log.json) records zero executed database commands/connections and the explicitly skipped workflows. This is an agent command inventory, not a separately instrumented database server audit; no server was contacted to establish it.

## Evidence classification, exclusions and next boundary

Observed now: Git states/hashes, installed versions, existing source/script branches and the five actual command results. Prior planning evidence remains source inspection. Proposed work in GYMOS-MIG-002–010 is not claimed implemented by this report.

Not executed: API HTTP e2e, milestone, real database tests, V1 runtime/captures, screenshot/visual/accessibility checks, concurrency/security tests, backup/restore, provisioning/migrations, generation/build, Docker or deployment. No DTO, endpoint, Prisma model, migration, application behavior or V1 defect was changed by task001.

Relevant constraints: preserve source maps and V1, keep current endpoint compatibility, avoid interpreting the existing basic Member as full enrollment, and never promote proposed schemas or a scaffold test into domain verification. DEF-01/DEF-09 and the tenant/provisioning/security risks remain for their owning tasks; task001 does not correct them.

Evidence deliverables: this report; initial/post state JSON; runtime package JSON; five redacted per-command logs; command result JSON; database-operation inventory. Logs were checked for database URLs/secret assignments and contain no credential values. All relative links in this report resolve to task-owned artifacts. No screenshots are fabricated.

The coordinating agent can review this evidence against task001 acceptance and update the authoritative tracker/spec consistently. Its dependent contract task002 and independent credential follow-up010/review tasks can then proceed according to their own scopes; database-changing work remains subject to its explicit isolated-environment and decision prerequisites.
