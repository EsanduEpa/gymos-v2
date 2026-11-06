# Local manual testing

This sandbox uses a separate PostgreSQL 17 container, bound to a random loopback port, with its own master database and three gym databases. It never loads the project's `.env` or copies live member data. PostgreSQL data survives app shutdown and container restart; removing its container/volume deletes the test data.

The setup contains three gyms (`test-alpha`, `test-beta`, `test-gamma`), 20 members per gym, a trainer in each gym, active memberships and 12-credit PT packs. Each gym has 40 PT sessions: 12 completed, 4 missed, 4 cancelled, 16 scheduled and 4 pending requests. Dates are relative to the setup date in Asia/Colombo. Historical sessions include settlements, credit movements, revenue and trainer pay. The main member also has workout and meal plans.

Four main logins share the generated password printed by `manual:start`:

| Email | Role | Access |
| --- | --- | --- |
| admin@gymos.test | Super admin | Platform |
| owner@gymos.test | Owner | All 3 gyms |
| trainer@gymos.test | Trainer | All 3 gyms |
| member@gymos.test | Member | All 3 gyms |

The other 57 members have supporting identities with unshared random passwords, so their enrollments and bookings satisfy the real app's access rules. There are 60 gym member records in total; the main member identity is shared across gyms.

## Start or resume

The initial setup has already been run. From the project root:

```sh
pnpm manual:start
```

Open the URL printed by the command. The test API uses port 3001. The web app uses port 3000 if free; when it is occupied, a separate test web instance runs on port 3002 using the existing production build. Currently the test URL is http://localhost:3002/login. If port 3001 or the chosen web port is occupied, the command stops before starting anything. Stop with Ctrl+C; this preserves the test databases and leaves any pre-existing web process running. For the port 3002 fallback, build the web app first with `pnpm --dir apps/web build` if no production build is available.

The private, Git-ignored `.env.manual-test.json` records the container, connections, generated password and gym references. Do not share it. Keep the main `.env` unchanged. Start the API using `manual:start` while testing; the ordinary `dev:api` command uses its usual environment instead.

To check the untouched baseline while the test app runs:

```sh
pnpm manual:check
```

This checks four logins, access to each gym, booking eligibility, session reads, seed counts and PT credit balances. Repeated runs may hit the login rate limit; wait a minute before retrying. Once manual tests alter the seed, exact baseline counts may differ.

For a fresh installation, build the clients, packages and API, then run `pnpm manual:setup` once. Setup refuses to overwrite an existing sandbox.

## Suggested manual tests

1. Sign in as each main account and check the correct screens and gym switcher.
2. As owner, check the 20 members in each gym, search members, and inspect membership and credit details.
3. Browse past and future sessions. The previous month may contain historical sessions when setup runs early in a month.
4. Book a free future time, then verify one PT credit is held. Try an overlapping booking and confirm it is rejected.
5. As trainer, accept or decline a pending request. As member, submit another request.
6. Cancel a future session and inspect the cancellation quote and resulting credit balance.
7. Create a session for today, then start and complete it using the app's timing rules. Check earnings and trainer pay.
8. Switch gyms and confirm that member records and changes stay in their own gym.


## Disposable PT walkthrough in Chrome

For PT checks independent of the persistent manual sandbox, prepare/build the current clients, API and web, then run from the root:

```sh
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.pt-visible.ts --disableConsoleIntercept
```

This opt-in holding fixture creates its own owned two-gym databases, synthetic logins, membership and eight-credit pack, plus a separately prepared active appointment eligible for ordinary completion. It prints the loopback URL, temporary logins and a unique stop-file path. Open the printed URL in Chrome. Never save/share those credentials or commit captured logs. The fixture does not use `.env` or the persistent manual sandbox. New bookings still obey notice/availability rules; the active appointment is a separate historical delivery fixture. Notes follow the existing completed-only rule.

To stop normally, create **only the exact stop file printed by this run** in another terminal (`touch /tmp/<printed-name>`); the fixture stops its servers and verifies owned database/container cleanup. Its one-hour timeout is for interactive review, not a relaxed business/test timeout. A passing fixture confirms setup/teardown; document the actual browser observations separately. No full automated journey or real pilot follows from that pass.
