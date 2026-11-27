# GymOS V2

GymOS V2 is a multi-tenant web app for gym operations.

## System architecture

| Layer | Responsibility |
| --- | --- |
| `apps/web` | Next.js role workspaces and browser sessions. Server-side requests use the configured GymOS API. The production web build needs the shared contracts and theme tokens. |
| `apps/api` | NestJS authentication, authorization, commands, scheduling and reporting. The API verifies gym access and tenant schema before using a gym's operational database. |
| Master PostgreSQL | Identities, gym accounts and access, public branding, provisioning, support sessions and platform subscription state. |
| One PostgreSQL database per gym | Gym configuration, members and trainers, memberships, PT credits and sessions, coaching records, and operating finance. |
| `packages` and `infrastructure` | Shared contracts and theme tokens, separate Master and tenant Prisma schemas and migrations, and deployment and recovery tools. |

Master and gym databases have separate transactions. Cross-database operations use durable operation records and reconcile pending outcomes. The migration notes also explain why the legacy V1 project is retained as a UI and workflow reference. [V1 migration notes](docs/migration/NOTES.md#goal-and-source-of-truth)

## Run locally

For the permanent split between development on port 3000 and isolated manual testing on port 3002, follow [docs/manual-testing.md](docs/manual-testing.md). Future agents should use port 3002 for browser testing.

Use Node.js 24 and pnpm. Copy `.env.example` to `.env` only for a fresh setup, replace the sample credentials, and keep `.env` private. If your local databases already work, keep your existing `.env`.

```sh
pnpm install --frozen-lockfile
docker compose up -d --wait
set -a
source .env
set +a
pnpm prepare:checks
pnpm --dir apps/api build
```

For a newly created local Compose database, confirm that `MASTER_DATABASE_URL` targets `gymos_development_master` on `127.0.0.1:5434`, then initialize the schema.

```sh
pnpm exec prisma migrate deploy --config prisma.master.config.ts
```

Create the first Super Admin account only if the local database has no admin. The password is read without echoing it to the terminal. This workspace already has a separate development admin saved in ignored `.env.development-account.json`.

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
PORT=3001 GYMOS_API_HOST=127.0.0.1 PROVISIONING_RUNNER_ENABLED=true pnpm dev:api
```

In another terminal, start the web app:

```sh
GYMOS_NEXT_DIST_DIR=.next-development GYMOS_API_URL=http://127.0.0.1:3001 GYMOS_WEB_ORIGIN=http://localhost:3000 pnpm dev:web
```

Open `http://localhost:3000/login`. Sign in as Super Admin, create a gym and its owner, then sign in as that owner. The owner can add members and see the gym's branding. A new gym starts with the default theme; its owner can update branding through `PATCH /gyms/:slug/theme`.

The web app uses `http://127.0.0.1:3001` for its server-side API calls by default. Set `GYMOS_API_URL` for a different API address. The web app uses HttpOnly cookies for the 15-minute access token and the rotating refresh token. The API enforces the device session's idle and absolute expiry.

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

## Initial web release scope

The approved V2 scope is a responsive web app with four roles: Super Admin, Gym Owner, Trainer, and Member. Gym accounts are scoped to one gym. The Super Admin manages provisioning and can enter audited, read-only support for a selected gym.

- Owners review member applications, register members and trainers, manage membership plans, issue PT credit packs, and provide staff-assisted account recovery. Credential handoff goes through the person or staff member authorized for that account.
- Membership plans and packs grant entitlements. Plan changes apply to future terms. Owners can collect payment outside GymOS and issue the corresponding entitlement. Financial views show agreed values, operating earnings, expenses, trainer pay and payroll approvals. PayHere checkout and recurring GymOS billing are available for Sandbox testing. For the initial web release, leave `GYMOS_PAYHERE_CHECKOUT_ENABLED` and `GYMOS_PAYHERE_MEMBERSHIP_SANDBOX_ENABLED` unset in both the web and API environments.
- One-to-one personal training includes availability, bookings and requests, credit reservations, cancellations and no-shows, workout and meal plans, and session history. Session history records PT activity. Physical gym entry and biometric attendance are outside V2.
- Account recovery uses one-time links issued by authorized staff. Notifications are delivered in the app. Email delivery, Manager and Front Desk roles, AI coaching, and gamification are outside V2.

See the [current development and release checklist](docs/AUDIT-REMAINING-CHECKLIST.md) for broader scope and remaining verification.

## Project guides

| Topic | Guide |
| --- | --- |
| Scope and delivery | [Requirements and SRS mapping](docs/GYMOS-REQUIREMENTS-REVIEW.md), [development checklist](docs/AUDIT-REMAINING-CHECKLIST.md), [release gates and QA evidence](docs/RELEASE-REVIEW.md) |
| Local verification | [Local environments and file inventory](docs/manual-testing.md), [browser acceptance scenarios](docs/END-TO-END-MANUAL-SCENARIOS.md) |
| Deployment and runtime | [Hosted deployment with Neon or Supabase](docs/HOSTED-DEPLOYMENT.md), [gym provisioning](docs/PROVISIONING-RUNTIME.md), [PT operations and scheduled work](docs/PT-OPERATIONS.md) |
| Roles and privacy | [Account operations](docs/ACCOUNT-OPERATIONS.md), [security and privacy review](docs/SECURITY-REVIEW.md), [workspace design](docs/WORKSPACE-DESIGN.md) |
