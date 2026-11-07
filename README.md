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

## Verify the first milestone

Build both applications, then run the repeatable end-to-end check:

```sh
pnpm --dir apps/api build
pnpm --dir apps/web build
pnpm verify:milestone
```

The check starts its own API and web servers, creates two temporary gyms through the web form, signs in as both owners, adds one member to each gym, tests distinct theme colors and cross-gym denial, verifies the physical databases, then removes all temporary data. It requires the local PostgreSQL container and `.env`.

## Current scope

This is the first complete working slice, not a production rollout. Sessions need renewal, and gym provisioning currently runs migrations synchronously from the API. Before onboarding real gyms, add connection limits, background provisioning, recovery for failed provisioning, backups, deployment controls, and deeper automated security coverage.
