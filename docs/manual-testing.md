# Local development and manual testing

## Permanent environment split

| Purpose | Web | API | Database | Accounts |
| --- | --- | --- | --- | --- |
| Development | `http://localhost:3000` | `http://127.0.0.1:3001` | Root `.env`: fresh `gymos_development_master` and future gym databases; PostgreSQL on local port 5434 | Separate development admin |
| Manual testing | `http://localhost:3002` | `http://127.0.0.1:3003` | Separate owned PostgreSQL container, master and gym databases | Synthetic test accounts below |

Both run the same repository code. The test web server uses a build of that code, so rebuild and restart it after source or schema changes. Data is intentionally different. Browser session cookies have separate names for the two instances; use `localhost` (not `127.0.0.1`) for both web URLs. Run all manual browser testing and acceptance checks on **3002**. Port 3000 is the development workspace. Disposable automated tests may create their own isolated databases and ports.

To run development, keep the existing private `.env` and start these in separate terminals from the project root:

```sh
set -a; source .env; set +a; PORT=3001 pnpm dev:api
```

```sh
GYMOS_NEXT_DIST_DIR=.next-development GYMOS_API_URL=http://127.0.0.1:3001 GYMOS_WEB_ORIGIN=http://localhost:3000 pnpm dev:web
```

The separate Next.js build directories let development and testing run together. Development uses its own `.env` databases; do not load `.env.manual-test.json` into the development process.

The fresh development master has the same current schema as the testing master. Its admin email and generated password are in the ignored `.env.development-account.json`. It has no gyms yet; new gyms created from port 3000 receive the current tenant schema. The old development databases, including `gym-a` and `gym-b`, were removed from Docker on 2026-11-07 after verified backups were saved in the Git-ignored `.local-backups/gymos-db-cleanup-20261107/`. The old manual testing container and its anonymous volume were also removed; the active port 3002 fixture was untouched. The app's controlled rollout had rejected those old gyms because their original ownership proof was missing. Restore old data only after a separate recovery review.

This sandbox uses a separate PostgreSQL 17 container, bound to a random loopback port, with its own master database and three gym databases. It never loads the project's `.env` or copies live member data. PostgreSQL data survives app shutdown and container restart; removing its container/volume deletes the test data.

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

If Docker Desktop restarts, its random loopback database port can change. Stop the old test servers, run `pnpm manual:rebind` to verify the owned container and update only its saved port, then run `pnpm manual:start` and `pnpm manual:check` again.

To check the untouched baseline while the test app runs:

```sh
pnpm manual:check
```

This checks the admin and three `test-alpha` logins, their role scoped API reads, the presence of test data and PT credit balances in all three gym databases. It allows intentional changes to the persistent testing data. Repeated runs may hit the login rate limit; wait a minute before retrying.

For a fresh installation, build the clients, packages and API, then run `pnpm manual:setup` once. Setup refuses to overwrite an existing sandbox.

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
