# Local development and testing environments

Read [docs/manual-testing.md](docs/manual-testing.md) before running the app or testing it.

- Development web: `http://localhost:3000`; development API: `http://127.0.0.1:3001`. The API uses the private root `.env`, fresh `gymos_development_master` database and its own future gym databases. The development admin login is in ignored `.env.development-account.json`.
- Testing web: `http://localhost:3002`; testing API: `http://127.0.0.1:3003`. Start it with `pnpm manual:start`. It uses the separate, owned PostgreSQL container and synthetic accounts recorded in the ignored `.env.manual-test.json`.
- Both instances run this repository's application code. Rebuild and restart the test instance after code or schema changes so 3002 reflects the current implementation. Their data and login sessions must stay separate.
- Do all browser/manual acceptance testing on **3002**, never on 3000. Automated tests that create disposable databases may use their own isolated ports and fixtures.
- Never point the testing API at the development `.env` databases, reuse the testing database for development, or copy real data into the synthetic testing fixture.
- The old development databases and earlier manual testing container were removed after verified backups were saved under `.local-backups/gymos-db-cleanup-20261107/` (Git ignored). The new development database starts with an admin only. Do not reconnect old data or bypass its missing ownership proof without a separate recovery review.
