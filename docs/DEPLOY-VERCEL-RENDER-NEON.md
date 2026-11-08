# First deployment: Vercel + Render + Neon

Follow these steps in order. This guide prepares a new synthetic demo; it does not move local development/testing databases to the cloud. Keep the existing `.env` and `.env.manual-test.json` unchanged.

## Accounts and costs

Create/sign in to GitHub, Neon (https://console.neon.tech), Render (https://dashboard.render.com), and Vercel (https://vercel.com). GitHub sign-in is convenient for all three hosts. Neon Free can be used within its quotas; the continuous workers may keep its compute active, so monitor usage. The checked-in Render Blueprint selects Free. Choose free plans in each dashboard and review the final resource summary. Vercel Hobby is restricted to personal, non-commercial use; a commercial client demo may require a paid plan even with synthetic data. No custom domain is necessary for the demo.

## Free demo operating limits

The API start command runs Node directly with a 256 MB old-generation heap cap and 16 MB semi-space cap (verified total V8 heap limit: 304 MB), leaving headroom within the 512 MB Free instance for native allocations and avoiding an extra pnpm runtime process. This cap mitigates memory pressure; it is not a total process-memory limit or a guarantee against out-of-memory restarts. Apply this command manually under Render Settings → Build & Deploy for a manually created service. Builds retain their separate build-time memory budget.

Render Free sleeps after 15 minutes without inbound traffic and usually needs about a minute to wake. Provisioning, session expiry and reminders run only while the API is awake. Both workers remain enabled and sweep on startup; overdue work may require multiple batches. Do not promise timely reminders while asleep. No separate paid worker, Redis service or Render database is required.

Before each demonstration, open the Render API root URL directly and wait for the application's response. You can also run `GYMOS_API_URL=https://your-api.onrender.com pnpm deploy:demo:wake` from the repository root. This sends one bounded request; it does not schedule keep-alive traffic. Then sign in through Vercel and check Owner Sessions for recent successful scheduled work. A root response only confirms the process is listening. Avoid making the first login request wait for a sleeping API through Vercel.

The workers query Neon frequently while Render is awake, preventing database idle sleep during that period. Monitor Neon compute/storage quotas and Render usage in their dashboards. Stop the demo service when finished if appropriate. Free services have limited capacity; keep the demo small and verify actual memory/latency in the hosted rehearsal.

After deployment, leave the API idle for at least 15 minutes, wake it directly, then repeat login and a booking read. Confirm workers resume, gym data persists, and recent scheduled-work health succeeds. This sleep/restart rehearsal is part of acceptance.

Provider details: [Render Free](https://render.com/docs/free), [Neon plans](https://neon.com/docs/introduction/plans), [Vercel Hobby](https://vercel.com/docs/plans/hobby). Limits and eligibility can change.

## 1. Create the Neon database project

1. Choose New Project and name it `gymos-demo`.
2. Select PostgreSQL 17 if available, matching the tested database version.
3. Choose a region close to the Render region you intend to use. Use one project and its default branch for the initial demo.
4. Open Databases for that branch and create a database named `gymos_master`, owned by the administrative role created by Neon (often `neondb_owner`). The unused initial `neondb` can remain.
5. Click Connect. Select the correct branch, `gymos_master` database and administrative role. Turn Connection pooling OFF.
6. Copy the connection URL privately. Use the URL itself, not a `psql '...'` command wrapper. Its hostname must not contain `-pooler`.
7. Keep username, URL-encoded password and hostname as copied. Use port 5432 and make the query suffix exactly `?sslmode=verify-full`. Remove optional `channel_binding=require` or other query parameters from the URL used by this app; the current node-postgres URL validator only accepts the reviewed TLS options.

The same direct endpoint must be used for Master, tenant routing and provisioning. New gym databases are created within this same branch, not as separate Neon branches/projects. Our exact role ownership/comment operations still require a successful hosted gym rehearsal.

## 2. Prepare private deployment settings on the Mac

Open a NEW terminal dedicated to deployment:

```sh
cd /Users/esanduepa/Desktop/Projects/gymos-v2
cp infrastructure/deployment/neon/.env.example .env.deploy.neon
```

Edit `.env.deploy.neon` in your editor. It is ignored by Git. Set:

- MASTER_DATABASE_URL, TENANT_DATABASE_URL, PROVISION_DATABASE_URL: initially the same direct Neon URL pointing to `/gymos_master?sslmode=verify-full`. Tenant routing replaces the database name for each gym; the template does not combine gym tables with Master.
- GYMOS_DEPLOY_DATABASE_HOST: only the exact direct hostname, without `https://`, username, port or path.
- JWT_SECRET: a new random secret. Generate it with `openssl rand -hex 32`; copy the output privately. Keep this value stable across redeploys.
- NODE_ENV=production.
- PROVISIONING_RUNNER_ENABLED=true and PT_EXPIRY_RUNNER_ENABLED=true.
- GYMOS_WEB_ORIGIN=https://example.invalid temporarily. This is an intentional setup placeholder until Vercel assigns the actual URL; replace it on Render before user testing.
- GYMOS_API_URL=https://example.invalid temporarily; this local field is unused by database setup and will be replaced for the frontend later.

Do not paste credentials into this chat, source control, screenshots or public issue reports. Do not load the development `.env` into this terminal.

```sh
set -a
source .env.deploy.neon
set +a
pnpm build:deploy:api
pnpm deploy:database:check
```

Stop if the check fails. Common reasons: pooled URL, incorrect host/password, an extra URL query parameter, wrong role, TLS or networking. The read-only check verifies connectivity/basic admin capability; actual CREATE DATABASE/owner markers are tested by provisioning a gym later. It does not promise arbitrary managed-provider operations will work.

## 3. Initialize Master and the first administrator

After confirming the URL points to the new empty Neon `gymos_master`:

```sh
GYMOS_DEPLOY_MIGRATIONS=approved pnpm deploy:database:migrate
```

This applies the pinned Master schema and verifies its history/catalog. Do not run tenant migrations against Master. Do not repeatedly reset an existing database on error.

In the same Mac zsh terminal, enter a new administrator password privately:

```sh
read -rs 'SUPER_ADMIN_PASSWORD?New administrator password: '
export SUPER_ADMIN_PASSWORD
node apps/api/scripts/create-super-admin.mjs your-email@example.com
unset SUPER_ADMIN_PASSWORD
```

Replace the example email with yours. Run account creation once and save the login in a password manager. The command creates the admin in Neon, not the local development/test account.

## 4. Publish the current repository changes to GitHub

The configured remote is `https://github.com/EsanduEpa/gymos-v2.git`. The local fixes and deployment files must be committed/pushed before the hosts can use them.

For a beginner, GitHub Desktop is convenient: add the existing repository, review Changed Files, select the intended application/deployment changes, enter a commit summary, commit, then Push origin. Do not select private env files, local backup archives or generated output. Confirm the chosen branch on GitHub contains root `render.yaml` and `apps/web/vercel.json`. Remember this branch name; select it on both hosts. Do not silently deploy an older `main` branch if your changes are on another branch.

## 5. Create the free Render API

1. Open Render, New → Blueprint, connect GitHub, and authorize access to this repository.
2. Select `EsanduEpa/gymos-v2` and the pushed branch. Blueprint file: `render.yaml` at repository root.
3. Review the `gymos-api` service and confirm the Free instance plan. Use a region near Neon if offered. Keep the repository root as the service root.
4. Enter the required environment values:

| Render variable | Value |
| --- | --- |
| MASTER_DATABASE_URL | Private direct Neon URL for gymos_master |
| TENANT_DATABASE_URL | Same direct Neon URL used as tenant template |
| PROVISION_DATABASE_URL | Same direct Neon URL using the administrative role |
| GYMOS_DEPLOY_DATABASE_HOST | Exact direct Neon hostname |
| GYMOS_WEB_ORIGIN | `https://example.invalid` for the initial boot only |

5. Blueprint supplies NODE_VERSION, NODE_ENV, both worker flags and generates JWT_SECRET. In Environment, replace the generated JWT_SECRET with the private stable value from `.env.deploy.neon`, then save/redeploy. Never put JWT_SECRET on Vercel.
6. Apply/create the Blueprint after confirming no paid resources are selected. If Render asks for build/start settings, they are `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build:deploy:api` and `node --max-old-space-size=256 --max-semi-space-size=16 infrastructure/deployment/start-api.mjs`.
7. Watch Events/Logs until deployment succeeds. Copy the actual public `https://...onrender.com` address. Open it: the root response confirms the API process is listening, not complete database/worker readiness.
8. Confirm logs include provisioning runner enabled and PT scheduled-work runner enabled. Zero gyms is expected before creating the first gym.

Build installation explicitly includes development dependencies (`--prod=false`) because Prisma, TypeScript and the Nest CLI are build tools. Keep NODE_ENV=production for runtime. When creating a Web Service manually, copy this same build command into Render Settings → Build & Deploy; changes to render.yaml do not update a manually configured service.

PORT is provided by Render; do not copy local ports 3001/3003. Automatic redeploys are disabled in the Blueprint to allow coordinated API/schema/frontend updates.

## 6. Create the Vercel frontend

1. Open Vercel, Add New → Project, connect GitHub, and import the same repository.
2. Select the branch pushed in step 4 as the Production branch (under Git settings if necessary).
3. Framework: Next.js. Root Directory: `apps/web`. Node: 24.x. Include files outside the root directory in the build if this setting is shown; workspace packages and current API test types are needed.
4. Use the checked-in `apps/web/vercel.json`. It runs install/build from the monorepo root and outputs `.next`; do not set Output Directory to `dist` or `out`.
5. Set Production environment variables:

| Vercel variable | Value |
| --- | --- |
| GYMOS_API_URL | Actual Render HTTPS address, no trailing slash |
| GYMOS_WEB_ORIGIN | `https://example.invalid` temporarily |
| ENABLE_EXPERIMENTAL_COREPACK | `1` |

6. Deploy. Wait for the build to succeed, then copy the stable Production domain from Domains. Use its normal `project.vercel.app` alias, not a one-off commit-preview URL.
7. Set Vercel GYMOS_WEB_ORIGIN to exactly that URL, including `https://`, with no trailing slash or path. Redeploy so the new value applies.
8. Set Render GYMOS_WEB_ORIGIN to exactly the same URL and save/restart/redeploy.
9. Update those two placeholders in `.env.deploy.neon` for future operator checks, without committing it.

The public URL is now the Vercel Production URL. Browser cookies belong there; Next.js calls Render from its server. Do not add database passwords, JWT_SECRET, Supabase keys or GYMOS_COOKIE_SUFFIX to Vercel. No wildcard browser CORS change is needed.

## 7. First hosted sign-in and provisioning rehearsal

1. Open the stable Vercel URL in a fresh browser window and sign in with the administrator created in step 3.
2. Create `Demo Gym`, slug `demo-gym`, using a separate owner email you control, currency LKR and timezone Asia/Colombo.
3. Refresh its operation status while watching Render logs. It must reach COMPLETE and ACTIVE. If it remains pending/failed, record the operation reference and sanitized status; do not force ACTIVE in SQL.
4. Record/acknowledge the one-time Owner credentials privately. Sign out, sign in as that Owner and complete first-login password change.
5. Configure a membership plan, PT/trainer rates and availability. Register synthetic Trainer and Member accounts; record their issued gym usernames, acknowledge their credentials and complete first-login password changes.
6. Assign Member membership and a PT credit pack. As Member request an available future slot; as Trainer accept; as Member/Owner verify the confirmed session and held credit. Use normal notice rules and elapsed duration; a newly booked future session cannot be immediately completed.
7. Assign a workout/meal plan and verify Member can read them. Confirm Trainer client profiles load after cancelled/missed history exists.
8. Test logout, sign-in, notification links, role denial and wrong-gym denial when a second synthetic gym is available.
9. Owner Sessions must show recent successful scheduled-work health. Restart Render once, confirm data persists and the workers resume.

Compatibility is established only after these provider-specific checks succeed. If role creation, ownership markers or database creation are denied by Neon, retain the checks and investigate rather than weakening isolation.

## 8. Before the client meeting

Keep this a synthetic demo until separate public-release security findings are closed. Rehearse on the actual stable hosted URL, prepare appointments that meet the current time rules, verify exports and backup/restore coverage for Master and every gym database, check Neon usage/quotas, and retain the known working Git revision. Avoid changes during the meeting.

## Updating later

Edit/test locally, commit and push. For this manually controlled setup, deploy the compatible API revision on Render first, then deploy Vercel (which may auto-deploy on push unless you change its Git settings). For changes requiring a coordinated rollout, pause frontend automatic deployment before pushing. Master migrations are explicit; the deployment command does not upgrade existing gym schemas. Use the controlled tenant rollout for those changes. Never reset cloud databases just to publish a UI update.

## Troubleshooting

- Missing variables/startup validation: fix Environment values and redeploy; do not skip the validator.
- Host rejected: use the direct Neon host, remove `-pooler`, and match all three URLs to GYMOS_DEPLOY_DATABASE_HOST.
- URL rejected: use only `sslmode=verify-full`, port 5432, and a URL-encoded password; remove `channel_binding` from the application URL.
- Request origin denied / 403 on forms: compare both hosts' GYMOS_WEB_ORIGIN with the address in the browser, including scheme and trailing slash. Use the stable Production URL.
- Login unavailable: check Render status/logs and Vercel GYMOS_API_URL. Root API health alone does not prove Master tables exist.
- No admin / invalid password: confirm initialization used this Neon project and the intended administrator email; cloud accounts are separate from local synthetic accounts.
- Gym remains PENDING: verify PROVISIONING_RUNNER_ENABLED=true and inspect durable status/logs for role/database/ownership failures or existing-owner consent.
- Reminders disabled/stale: wake the Render service, verify the worker flag and Neon availability/quota; allow successful sweeps before evaluating overdue work.
- Build cannot resolve workspace modules: Root Directory apps/web on Vercel, repository root on Render, correct build commands, root lockfile and outside-root files included.
- Cold-start/database timeouts: Neon Free can sleep and has usage caps; rehearse wake-up latency against current pool budgets and monitor actual usage.

Official references: [Neon connections](https://neon.com/docs/connect/connect-from-any-app), [Neon roles](https://neon.com/docs/manage/roles), [Neon databases](https://neon.com/docs/manage/databases), [Render Blueprints](https://render.com/docs/infrastructure-as-code), [Vercel monorepos](https://vercel.com/docs/monorepos).

Local repository checks: deployment configuration tests and deployment script syntax validation pass. No cloud project, database or paid service was created by writing this guide, and no actual Neon credentials were supplied for connectivity/provisioning verification.
