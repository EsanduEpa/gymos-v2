# GymOS V2

GymOS V2 is a development-stage SaaS foundation. Each gym has its own PostgreSQL database. The master database stores identities, gym access, branding, and the gym registry.

## Run locally

For the permanent split between development on port 3000 and isolated manual testing on port 3002, follow [docs/manual-testing.md](docs/manual-testing.md). Future agents should use port 3002 for browser testing.

Use Node.js 24 and pnpm. Copy `.env.example` to `.env` only for a fresh setup, replace the sample credentials, and keep `.env` private. If your local databases already work, keep your existing `.env`.

```sh
pnpm install
docker compose up -d
set -a
source .env
set +a
pnpm --dir apps/api build
```

For a fresh installation with no development admin yet, create the first Super Admin account with a password you choose. The password is read without echoing it to the terminal. This workspace already has a separate development admin saved in ignored `.env.development-account.json`:

```sh
read -rs 'SUPER_ADMIN_PASSWORD?New Super Admin password: '
printf '\n'
SUPER_ADMIN_PASSWORD="$SUPER_ADMIN_PASSWORD" node apps/api/scripts/create-super-admin.mjs admin@example.test
unset SUPER_ADMIN_PASSWORD
```

In one terminal, start the API:

```sh
set -a
source .env
set +a
PORT=3001 pnpm dev:api
```

In another terminal, start the web app:

```sh
GYMOS_NEXT_DIST_DIR=.next-development GYMOS_API_URL=http://127.0.0.1:3001 GYMOS_WEB_ORIGIN=http://localhost:3000 pnpm dev:web
```

Open `http://localhost:3000/login`. Sign in as Super Admin, create a gym and its owner, then sign in as that owner. The owner can add members and see the gym's branding. A new gym starts with the default theme; its owner can update branding through `PATCH /gyms/:slug/theme`.

The web app uses `http://127.0.0.1:3001` for its server-side API calls by default. Set `GYMOS_API_URL` for a different API address. The access token stays in an HttpOnly cookie and expires after 15 minutes.

## Automatic gym setup

Set `PROVISIONING_RUNNER_ENABLED=true` on the persistent API process to complete gym reservations automatically. The isolated manual-testing launcher enables this setting for its own synthetic databases. Leave it disabled while performing controlled schema maintenance. See [provisioning runtime](docs/PROVISIONING-RUNTIME.md) for discovery, retries, shutdown and required database privileges.

## Verify the first milestone

Prepare the workspace and run the repeatable browser suite:

```sh
pnpm prepare:checks
pnpm --dir apps/api build
pnpm --dir apps/web build
GYMOS_TEST_ALLOW_DOCKER=1 pnpm verify:milestone
```

The browser suite starts its own API, web server, and owned PostgreSQL container with synthetic data. It verifies provisioning, role and tenant boundaries, and member, trainer, and owner workflows before removing its test resources. This command requires Docker and explicit opt-in. The runner supplies its own database connections.

## Current scope

The approved V2 scope is a responsive web app with four roles: Super Admin, Gym Owner, Trainer, and Member. Gym accounts are scoped to one gym. The Super Admin manages provisioning and can enter audited, read-only support for a selected gym.

- Owners review member applications, register members and trainers, manage membership plans, issue PT credit packs, and provide staff-assisted account recovery. Credential handoff goes through the person or staff member authorized for that account.
- Membership plans and packs grant entitlements. Plan changes apply to future terms. Financial views show agreed values, operating earnings, expenses, trainer pay and payroll approvals. Payment collection, cash receipts and trainer payouts are outside V2.
- One-to-one personal training includes availability, bookings and requests, credit reservations, cancellations and no-shows, workout and meal plans, and session history. Session history records PT activity. Physical gym entry and biometric attendance are outside V2.
- Account recovery uses one-time links issued by authorized staff. Notifications are delivered in the app. Email delivery, Manager and Front Desk roles, AI coaching, and gamification are outside V2.

See the [future capabilities backlog](docs/V2-FUTURE-CAPABILITIES.md) and the [QA release decision](docs/QA-AUDIT-PRIORITIZED-REMEDIATION-PLAN.md#13-release-decision-checklist) for remaining requirements and verification.

## Hosted demo deployment

See [Vercel + Render + Supabase setup](docs/DEPLOY-VERCEL-RENDER-SUPABASE.md) for repository settings, private environment variables, direct-database requirements, explicit migrations and hosted acceptance gates.

For the free synthetic demo, follow the [Vercel + Render Free + Neon guide](docs/DEPLOY-VERCEL-RENDER-NEON.md). The Render Blueprint selects Free; scheduled work pauses during idle sleep. Wake the API before demonstrating. Vercel Hobby eligibility depends on personal, non-commercial use.
