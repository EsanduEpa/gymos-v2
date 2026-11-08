# Deploy GymOS: Vercel + Render + Supabase

## What is prepared

The repository remains one pnpm monorepo. Vercel builds `apps/web`; Render builds the persistent Nest API from the repository root. Supabase is used as PostgreSQL only: GymOS retains its own authentication and Master plus separate gym databases. No Supabase API keys or database passwords go to the browser.

Files: `apps/web/vercel.json`, root `render.yaml`, deployment scripts and the placeholder environment example in `infrastructure/deployment/`. No hosting account, database or deployment is created by checking these files into Git.

## Supabase compatibility gate — check before paying for hosting

This is **not** a single default Supabase database deployment. GymOS creates separate physical gym databases and PostgreSQL owner roles. It uses session-level advisory locks, role ownership comments and pinned migrations. The application must retain those ownership and isolation checks.

Supabase's dashboard, Data API, Auth and Storage primarily target the project's default `postgres` database; manually created databases are not shown in Studio. We use raw PostgreSQL direct connections for those databases, not Supabase's Data API. See [Supabase's explanation](https://supabase.com/kb/troubleshooting/manually-created-databases-are-not-visible-in-the-supabase-dashboard).

Use the direct `db.<project-ref>.supabase.co:5432` endpoint. Do not substitute the shared or transaction pooler: custom database routing and the provisioning session-lock workflow must be verified directly. Direct Supabase access is IPv6 by default; if the Render service cannot reach IPv6, enable the Supabase direct IPv4 add-on on an eligible plan. The ordinary free session-pooler workaround is not approved for this architecture. See [connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres).

The supplied `postgres` role is not a true superuser. `deploy:database:check` checks connectivity and CREATEDB/CREATEROLE but cannot prove all managed-provider role/ownership operations are supported. **A synthetic gym must reach COMPLETE on the actual host before this stack is accepted.** If those operations are denied, retain the isolation checks and choose a compatible PostgreSQL service, or separately implement a Supabase-specific provisioning design. Do not turn off checks to make setup appear successful.

## 1. Prepare the Git repository

Commit the current application changes and deployment files to the branch intended for the demo. Review the existing uncommitted fixes as part of that commit. Do not commit `.env`, `.env.manual-test.json`, account credentials, database dumps, backups, screenshots or test results. The existing `.gitignore` covers these private/generated files.

Node is pinned to major 24 and pnpm to 9.15.0. The hosting services must install from the repository root using `pnpm install --frozen-lockfile --prod=false`; do not deploy `apps/web` as an independent repository or generate a second lockfile.

## 2. Prepare a fresh dedicated Supabase target

1. Create a demo-only Supabase project. Save its database password privately. Choose nearby Supabase, Render and Vercel server-function regions where available; the current database pool and transaction budgets are bounded, so cross-continent latency needs explicit rehearsal.
2. In Connect, copy the **direct** database URL. Percent-encode reserved password characters. Confirm the endpoint is reachable from Render; arrange direct IPv4 if required.
3. With a trusted PostgreSQL client, explicitly create an empty `gymos_master` database on that project using `CREATE DATABASE gymos_master;`. If denied, stop: the current design cannot be provisioned with those grants.
4. Keep `/postgres` for provisioning and as the tenant connection template; use `/gymos_master` for Master. Do not apply GymOS Master migrations to Supabase's existing default `postgres` catalog. The verifier intentionally rejects foreign tables and triggers.
5. Use `sslmode=verify-full` in all three URLs. If certificate verification needs the project's CA, download the public certificate from Supabase and upload it as a Render secret file. Set `NODE_EXTRA_CA_CERTS` to that file path. Do not disable certificate verification.
6. Keep the project as an isolated synthetic demonstration until the separate public-release security findings have been closed. Do not expose GymOS tables through Supabase's Data API.

## 3. Create the Render API service

Connect this repository in Render, choose **New Blueprint**, and select root `render.yaml`.

The blueprint selects Free for a synthetic demo and disables automatic redeploys so schema rollout and frontend rollout can be coordinated. Free sleeps when idle: provisioning, request expiry and reminders pause until wake-up. For continuous background work, explicitly upgrade the service to a paid persistent instance. See the [free demo operating limits](DEPLOY-VERCEL-RENDER-NEON.md#free-demo-operating-limits).

Keep Root Directory empty (repository root). The configured commands are:

```sh
corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build:deploy:api
pnpm start:deploy:api
```

Set the prompted private environment values from `infrastructure/deployment/.env.example`. The Blueprint generates JWT_SECRET; retain it across normal redeploys and never copy it to Vercel. Use one stable Vercel HTTPS production URL for GYMOS_WEB_ORIGIN. It must have no trailing slash or path. If this URL is not known yet, reserve the Vercel project first, then return to Render.

Render supplies PORT. Both workers are enabled in the blueprint. The API listens on the assigned port. Its `/` health check is HTTP liveness, not proof of database initialization or worker health.

The first boot may fail until environment values and the dedicated database exist. Complete the database step before directing users to it. **Do not configure migrations as part of every build.**

## 4. Check and initialize Master explicitly

In the Render service shell, from the repository root:

```sh
pnpm deploy:database:check
GYMOS_DEPLOY_MIGRATIONS=approved pnpm deploy:database:migrate
```

The first command is read-only. The second mutates only the explicitly configured dedicated Master target, uses the pinned migration verifier and rejects unknown existing application schema. This command does not create tenant databases or activate gyms.

If using a local operator terminal instead, set only the deployment environment there and run the same commands from a built checkout. Do not source the local development `.env` or load the manual-test fixture. Use a clean dedicated operator session.

Create the first Super Admin with a privately entered password. In the Render bash shell:

```sh
read -rs -p 'New Super Admin password: ' SUPER_ADMIN_PASSWORD
export SUPER_ADMIN_PASSWORD
node apps/api/scripts/create-super-admin.mjs your-admin@example.com
unset SUPER_ADMIN_PASSWORD
```

Run account creation once. The password must meet the application's requirements. Do not put it in a command argument, a Git file, a screenshot or a public log.

## 5. Create the Vercel frontend project

Import the same Git repository and configure:

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Root Directory | `apps/web` |
| Node.js | 24.x |
| Install/build/output | Use the checked-in `apps/web/vercel.json` |
| Include files outside Root Directory | Enable if shown, for workspace packages and API test types |

The frontend build also generates Prisma clients and compiles API modules because the current web TypeScript project includes browser fixtures importing API types. These build artifacts are not database credentials or a backend deployment on Vercel.

Set Vercel Production environment variables:

```dotenv
GYMOS_API_URL=https://your-api-service.onrender.com
GYMOS_WEB_ORIGIN=https://your-web-project.vercel.app
ENABLE_EXPERIMENTAL_COREPACK=1
```

Do not set database URLs, JWT_SECRET, Supabase service-role keys, or the local GYMOS_COOKIE_SUFFIX on Vercel. Do not set GYMOS_NEXT_DIST_DIR. The build output remains `.next`.

Use a plan permitted for the client's commercial use. Vercel Hobby is restricted to personal non-commercial use. Preview deployments need their own exact origin and isolated backend/database configuration before write testing; this setup targets the stable production demo URL and does not wildcard-allow arbitrary previews.

## 6. Rehearse the hosted application

1. Open the stable Vercel URL and sign in as Super Admin.
2. Create a new synthetic gym. Verify Render logs show the provisioning runner advancing that operation to COMPLETE. If role creation, ownership marking or database creation fails, stop and inspect the sanitized durable operation state. Do not manually force ACTIVE.
3. Record the one-time Owner credential privately, acknowledge it and complete first-login password change.
4. Register synthetic Member and Trainer accounts, configure availability, assign membership/credits and complete request → acceptance → session detail checks across roles.
5. Verify Trainer profiles with cancelled/missed history, workout/meal assignment, notification links, logout and session renewal through the actual Vercel origin.
6. In Owner Sessions, verify recent scheduled-work success, enabled runner and no unexplained backlog. A successful HTTP health check alone is insufficient.
7. Confirm a full Render restart preserves data and resumes both workers. Document the backup/restore method for every physical database; do not assume the default Supabase dashboard backup covers custom databases without verification.

The split frontend/backend requires no broad browser CORS allowance: the Next.js server sends authenticated requests to Render, and browser session cookies belong to the Vercel origin. Database connections and tokens stay server-side.

## Updates

Build/test changes locally using the owned test environment. Apply additive database changes through an explicit reviewed rollout, deploy the compatible Render API/worker, then deploy Vercel. Rehearse after each update. The Master migration command does not upgrade existing gym databases; those retain the controlled tenant rollout workflow.

## Current verification boundary

Deployment configuration and local checks do not prove Supabase grants, direct networking, provider certificate configuration, Vercel runtime compatibility, or a hosted worker rehearsal. Those require the actual target accounts. The repository is prepared for that validation; it is not already hosted or certified compatible with a particular Supabase project.

## Repository preparation checks

Local checks completed for this configuration: `pnpm build:deploy:api`, `pnpm build:deploy:web` (using a separate temporary build directory), two deployment validation tests, script syntax checks, Render YAML/Vercel JSON parsing and `git diff --check`. Temporary Next build output and its generated TypeScript include entries were removed afterward. No dependency or lockfile changes were required. The Supabase connectivity/grant check was not run because no deployment credentials were supplied.
