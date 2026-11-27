# Local development and manual testing

## Permanent environment split

| Purpose | Web | API | Database | Accounts |
| --- | --- | --- | --- | --- |
| Development | `http://localhost:3000` | `http://127.0.0.1:3001` | Root `.env`: fresh `gymos_development_master` and future gym databases; PostgreSQL on local port 5434 | Separate development admin |
| Manual testing | `http://localhost:3002` | `http://127.0.0.1:3003` | Separate owned PostgreSQL container, master and gym databases | Synthetic test accounts below |

Both run the same repository code. The test web server uses a build of that code, so rebuild and restart it after source or schema changes. Data is intentionally different. Browser session cookies have separate names for the two instances; use `localhost` (not `127.0.0.1`) for both web URLs. Run all manual browser testing and acceptance checks on **3002**. Port 3000 is the development workspace. Disposable automated tests may create their own isolated databases and ports.

To run development, keep the existing private `.env` and start these in separate terminals from the project root:

```sh
set -a; source .env; set +a; PORT=3001 GYMOS_API_HOST=127.0.0.1 pnpm dev:api
```

```sh
GYMOS_NEXT_DIST_DIR=.next-development GYMOS_API_URL=http://127.0.0.1:3001 GYMOS_WEB_ORIGIN=http://localhost:3000 pnpm dev:web
```

The separate Next.js build directories let development and testing run together. Development uses its own `.env` databases; do not load `.env.manual-test.json` into the development process.

The fresh development master has the same current schema as the testing master. Its admin email and generated password are in the ignored `.env.development-account.json`. It has no gyms yet; new gyms created from port 3000 receive the current tenant schema. The old development databases, including `gym-a` and `gym-b`, were removed from Docker on 2026-11-07 after verified backups were saved in the Git-ignored `.local-backups/gymos-db-cleanup-20261107/`. The old manual testing container and its anonymous volume were also removed; the active port 3002 fixture was untouched. The app's controlled rollout had rejected those old gyms because their original ownership proof was missing. Restore old data only after a separate recovery review.

The test web and API listen on loopback. The sandbox uses a separate PostgreSQL 17 container, bound to a random loopback port, with its own master database and three gym databases. It never loads the project's `.env` or copies live member data. PostgreSQL data survives app shutdown and container restart.

The setup contains three gyms (`test-alpha`, `test-beta`, `test-gamma`), 20 members per gym, a trainer in each gym, active memberships and 12-credit PT packs. Each gym has 40 PT sessions: 12 completed, 4 missed, 4 cancelled, 16 scheduled and 4 pending requests. Dates are relative to the setup date in Asia/Colombo. Historical sessions include settlements, credit movements, revenue and trainer pay. The main member also has workout and meal plans.

Synthetic logins share the generated password in the private `.env.manual-test.json`. Gym accounts are scoped to one gym, matching the current app's authentication model:

| Email | Role | Access |
| --- | --- | --- |
| admin@gymos.test | Super admin | Platform |
| owner.test-alpha@gymos.test | Owner | test-alpha |
| trainer.test-alpha@gymos.test | Trainer | test-alpha |
| member.test-alpha@gymos.test | Member | test-alpha |

Replace `test-alpha` with `test-beta` or `test-gamma` for the equivalent account in those gyms. These gym accounts use the same synthetic identity records, but each login is scoped to one gym. The earlier `owner@gymos.test`, `trainer@gymos.test`, and `member@gymos.test` addresses are underlying identities, not current login usernames.

The other 57 members have supporting identities with unshared random passwords, so their enrollments and bookings satisfy the real app's access rules. There are 60 gym member records in total; the main member identity is shared across gyms.

## Start or resume

The initial setup has already been run. From the project root:

```sh
pnpm --dir apps/api build
pnpm --dir apps/web build
pnpm manual:sync
pnpm manual:start
```

Open `http://localhost:3002/login`. The test API always uses port 3003. If either test port is occupied, the command stops before starting anything. Stop with Ctrl+C; this preserves the test databases and leaves development running. Rebuild both applications and restart `manual:start` after each code change being manually tested. Run `pnpm manual:sync` to apply current migrations to the owned testing databases before starting. It preserves existing test data.

The private, Git-ignored `.env.manual-test.json` records the container, connections, generated password and gym references. Do not share or commit it. Keep the main `.env` unchanged. `manual:start` never loads `.env`; the development API uses `.env` instead.

The manual test launcher derives a stable encryption key from the private synthetic fixture state. A separate deployment that uses dietary notes, body measurements, training journals or profile photos needs its own stable `GYMOS_COACHING_DATA_KEY` on the API, encoded as 64 hexadecimal characters from 32 random bytes. Keep the key outside source control and backups of the database. Protect and retain a separate recoverable copy for authorized operators. Existing records require the same key after a restore.

If Docker Desktop restarts, its random loopback database port can change. Stop the old test servers, run `pnpm manual:rebind` to verify the owned container and update only its saved port, then run `pnpm manual:start` and `pnpm manual:check` again.

To check the untouched baseline while the test app runs:

```sh
pnpm manual:check
```

This checks the admin and three `test-alpha` logins, their role scoped API reads, the presence of test data and PT credit balances in all three gym databases. It allows intentional changes to the persistent testing data. Repeated runs may hit the login rate limit; wait a minute before retrying.

For a fresh installation, build the clients, packages and API, then run `pnpm manual:setup` once. Setup refuses to overwrite an existing sandbox.

## PayHere Sandbox callbacks

Ordinary manual testing keeps checkout disabled. To exercise PayHere Sandbox, configure a private, Git-ignored `.env.payhere-sandbox` with these values.

```dotenv
GYMOS_PAYHERE_CHECKOUT_ENABLED=1
GYMOS_PAYHERE_SANDBOX_MERCHANT_ID=
GYMOS_PAYHERE_SANDBOX_MERCHANT_SECRET=
GYMOS_PAYHERE_SANDBOX_API_ORIGIN=
GYMOS_PAYHERE_SANDBOX_APP_ID=
GYMOS_PAYHERE_SANDBOX_APP_SECRET=
```

The API origin is the public HTTPS origin of the separate synthetic callback relay. Use the domain-specific PayHere Sandbox merchant credentials. Subscription reconciliation also requires a Sandbox App ID and App Secret from an API key with Automated Charging API permission. Keep credentials in the private environment file. PayHere redirects the test browser back to `http://localhost:3002`.

After building and syncing the owned fixture, start the configured local instance and relay in separate terminals.

```sh
node --env-file=.env.payhere-sandbox apps/api/scripts/manual-test.mjs start
node apps/api/scripts/payhere-sandbox-relay.mjs
```

Point your HTTPS forwarding service at the relay on `127.0.0.1:3004`. The relay forwards only PayHere form POSTs for `test-alpha`, `test-beta` and `test-gamma` to the testing API. In the test browser, use synthetic sign-ins and PayHere’s simulated cards. Check a successful and declined purchase, the member and Owner receipt views, and a recurring GymOS payment. Stop the public forwarding service when testing ends. [PayHere Sandbox & Testing](https://support.payhere.lk/sandbox-and-testing) · [Checkout API](https://support.payhere.lk/api-%26-mobile-sdk/checkout-api)

For a temporary Cloudflare Quick Tunnel, start `node apps/api/scripts/payhere-sandbox-relay.mjs`, then run `cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3004` in another terminal. Copy the generated HTTPS origin into `GYMOS_PAYHERE_SANDBOX_API_ORIGIN` in `.env.payhere-sandbox`, then start/restart the local test app with the command above. The generated `trycloudflare.com` hostname lasts only while that tunnel process remains running and changes on restart. Never point a tunnel at ports 3000/3001 or the hosted Render demo for this test.

## Hosted membership Sandbox checkout

Use the synthetic demo accounts for this checkout. In the PayHere Sandbox portal, approve the deployed frontend hostname and use the merchant ID and secret for that integration. Enter the secret in Render's private environment settings.

| Service | Variable | Value |
| --- | --- | --- |
| Render API | `GYMOS_PAYHERE_MEMBERSHIP_SANDBOX_ENABLED` | `1` |
| Render API | `GYMOS_PAYHERE_SANDBOX_MERCHANT_ID` | Sandbox merchant ID |
| Render API | `GYMOS_PAYHERE_SANDBOX_MERCHANT_SECRET` | Secret for the hosted frontend integration |
| Render API | `GYMOS_PAYHERE_SANDBOX_API_ORIGIN` | `https://gymos-api-dw7n.onrender.com` |
| Render API | `GYMOS_PAYHERE_SANDBOX_WEB_ORIGIN` | `https://gymos-v2-ten.vercel.app` |
| Vercel web | `GYMOS_PAYHERE_MEMBERSHIP_SANDBOX_ENABLED` | `1` |

Leave `GYMOS_PAYHERE_CHECKOUT_ENABLED` unset on Vercel for this scope. Deploy the membership Sandbox changes to both services. Verify that the synthetic member's Membership page starts PayHere Sandbox checkout and the signed provider callback confirms exactly one renewal. Open the member receipt after returning to the hosted frontend. The hosted flow uses Render directly for delivery and does not need the temporary local tunnel.

## Suggested manual tests

1. Sign in as each account and check the correct screens and gym scope.
2. As owner, check the 20 members in each gym, search members, and inspect membership and credit details.
3. Browse past and future sessions. The previous month may contain historical sessions when setup runs early in a month.
4. Book a free future time, then verify one PT credit is held. Try an overlapping booking and confirm it is rejected.
5. As trainer, accept or decline a pending request. As member, submit another request.
6. Cancel a future session and inspect the cancellation quote and resulting credit balance.
7. Create a session for today, then start and complete it using the app's timing rules. Check earnings and trainer pay.
8. Sign in to another gym's account and confirm that member records and changes stay in their own gym.


## Disposable PT walkthrough in Chrome

For PT checks independent of the persistent manual sandbox, prepare/build the current clients, API and web, then run from the root:

```sh
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.pt-visible.ts --disableConsoleIntercept
```

This opt-in holding fixture creates its own owned two-gym databases, synthetic logins, membership and eight-credit pack, plus a separately prepared active appointment eligible for ordinary completion. It prints the loopback URL, temporary logins and a unique stop-file path. Open the printed URL in Chrome. Never save/share those credentials or commit captured logs. The fixture does not use `.env` or the persistent manual sandbox. New bookings still obey notice/availability rules; the active appointment is a separate historical delivery fixture. Notes follow the existing completed-only rule.

To stop normally, create **only the exact stop file printed by this run** in another terminal (`touch /tmp/<printed-name>`); the fixture stops its servers and verifies owned database/container cleanup. Its one-hour timeout is for interactive review, not a relaxed business/test timeout. A passing fixture confirms setup/teardown; document the actual browser observations separately. No full automated journey or real pilot follows from that pass.
