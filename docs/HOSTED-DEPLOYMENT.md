# Hosted deployment

GymOS uses Vercel for Next.js and a persistent Render process for the NestJS API. PostgreSQL holds a dedicated Master plus a separate physical database for each gym. The checked-in Free Render Blueprint is for synthetic demonstrations. Sleeping pauses provisioning, request expiry, no-show processing and reminders. Plan an always-on API for release workflows that depend on timely background work.

## Prepare PostgreSQL

| Provider | Configuration and acceptance |
| --- | --- |
| Neon | Use one dedicated project/branch and its direct hostname. Create `gymos_master` with the authorized administrative role. In the tested demo setup, the initial Master, tenant template and provisioning URLs all named `gymos_master`. The API replaces only the database name for gym-specific connections. |
| Supabase | Use the direct `db.<project-ref>.supabase.co` endpoint and dedicated `gymos_master`. The tenant template and provisioning URL may use `/postgres`. Verify the Render network can reach the direct endpoint, or arrange supported direct IPv4. Exclude GymOS data from the provider's Data API. Provider-specific connectivity and privileges require rehearsal. |

Use PostgreSQL port 5432, URL-encoded credentials and `sslmode=verify-full`. Match all three connection hostnames to `GYMOS_DEPLOY_DATABASE_HOST`. Select a direct rather than pooled endpoint because provisioning and tenant routing need physical database selection and session locks. Follow provider guidance for trusted CA configuration when necessary. Verify database and role creation, leases, ownership markers and pinned migration checks via a real synthetic provisioning operation. Use reviewed credentials and runtime grants. If provider grants are incompatible, choose a compatible target or review a new provisioning design.

## Prepare private settings and initialize Master

Use the shared [hosted example](../infrastructure/deployment/.env.example). For the existing Neon demo, the local operator copy is `.env.deploy.neon`. Edit it privately and load it in a dedicated terminal with no development or manual-fixture settings. Keep the JWT secret and coaching encryption key stable and recoverable. Put database, JWT and coaching secrets only on the API and in the approved private operator environment.

```sh
set -a
source .env.deploy.neon
set +a
pnpm build:deploy:api
pnpm deploy:database:check
```

The check is read-only. It confirms basic connectivity and privileges. After confirming the dedicated Master target and reviewing the rollout, apply the pinned Master schema.

```sh
GYMOS_DEPLOY_MIGRATIONS=approved pnpm deploy:database:migrate
```

In a Mac zsh terminal, run first-admin creation once with a privately entered password.

```sh
read -rs 'SUPER_ADMIN_PASSWORD?New administrator password: '
printf '\n'
export SUPER_ADMIN_PASSWORD
node apps/api/scripts/create-super-admin.mjs your-admin@example.com
unset SUPER_ADMIN_PASSWORD
```

Existing gym databases require a separate controlled tenant rollout with ownership verification, backups and recorded schema evidence.

## Configure Render

Use the repository root and [Blueprint](../render.yaml) at the chosen revision. Keep automatic deployment off when the web, API and migrations must be coordinated. For a manually configured service, copy the Blueprint build, direct Node start and `/readyz` health settings. The memory-bounded start retains headroom for native allocation, and Render supplies `PORT`.

Set the approved database URLs and host, stable `JWT_SECRET`, `GYMOS_WEB_ORIGIN`, and `GYMOS_COACHING_DATA_KEY` when private coaching records are in use. Enable `PROVISIONING_RUNNER_ENABLED=true` and `PT_EXPIRY_RUNNER_ENABLED=true`. See [provisioning runtime](PROVISIONING-RUNTIME.md) and [PT operations](PT-OPERATIONS.md#scheduled-work-and-recovery).

## Configure Vercel

Choose the same source revision and set Root Directory to `apps/web`, framework Next.js, and Node 24. Include workspace files outside the root and use the checked-in [Vercel config](../apps/web/vercel.json). Set `ENABLE_EXPERIMENTAL_COREPACK=1` for the pnpm install workflow. Set `GYMOS_API_URL` to the public HTTPS Render origin and `GYMOS_WEB_ORIGIN` to the stable HTTPS Vercel origin without a trailing slash or path. Use that same web origin in Render. Keep the release payment flags unset on both services for [manual sales](../README.md#initial-web-release-scope).

## Rehearsal and health

| Probe | Meaning |
| --- | --- |
| Vercel `/api/health` | Web process liveness |
| Render `/healthz` | API process liveness |
| Render `/readyz` | Master connectivity, with a generic 503 when Master is unavailable |

1. Create a synthetic gym and observe COMPLETE/ACTIVE with the correct schema and owner credential handoff. If provisioning stalls, inspect worker logs and durable status before using the retry or repair workflow.
2. Create synthetic trainer/member accounts. Verify membership and PT pack issue, booking/request and settlement, coaching, exports, payroll, logout, and wrong-gym reads. Confirm the selected gym's next scheduled-work success and that workers resume after an API restart.
3. Inspect deployed HTTPS, response headers, origin policy, forms and downloads. Record warm and first-after-idle response times, actual worker latency and recovery. Verify a restore of Master and each intended gym to isolated databases.
4. For updates, pin the compatible revision, use controlled schema rollout where required, deploy the API first and then the frontend. Repeat the release checks before client review. [Release gates](RELEASE-REVIEW.md#initial-web-release-gates)

For the synthetic demo, use `GYMOS_API_URL=https://your-api.onrender.com pnpm deploy:demo:wake` to wait for readiness. The [keepalive workflow](../.github/workflows/render-free-keepalive.yml) makes periodic root liveness requests. Use its manual run to verify the configured host and disable the workflow in GitHub Actions to stop the schedule. Free hosting, workflow timing and usage quotas need current provider review before a client event.

Typical issues include a pooled or mismatched database host, extra URL parameters, provider grants, a blocked direct network path, origin mismatch, missing Master initialization and sleeping workers. Compare logs and actual settings with the configured source revision.

## Historical demo evidence

In November 2026 the dedicated Neon demo provisioned `demo-alpha` and `demo-beta`, each with one owner, three trainers and three members plus one shared platform administrator. Fifteen synthetic accounts passed API login and role reads, and all fourteen scoped accounts were denied access to the wrong gym. Browser checks sampled all four roles. A fresh hosted rehearsal is still required for a new release. The historical demo endpoints are recorded in the keepalive workflow and [hosted Sandbox instructions](manual-testing.md#hosted-membership-sandbox-checkout).

The original Neon/Supabase guides, demo setup/recovery notes and keepalive instructions are available at Git revision `8b004bb`. The private, one-off demo seed script is archived with other old operator tools. See [environment file inventory](manual-testing.md#environment-file-inventory).
