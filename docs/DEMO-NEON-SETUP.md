# Synthetic Neon demo setup

The dedicated cloud demo uses two gyms, `demo-alpha` and `demo-beta`, currency LKR and timezone Asia/Colombo. Each has one Owner, three Trainers and three Members, with one platform Super Admin (15 distinct accounts). All names and contact details are synthetic. Members start with the Demo Monthly plan (LKR 5,000 / 30 days); no payments or sessions are fabricated.

Generated login details are stored only in the ignored `.env.demo-accounts.json` on the operator's Mac, with owner-only file permissions. Do not commit, upload or include that file in screenshots. The ignored `.env.demo-seed.mjs` is an operator setup/checkpoint script bound to the configured dedicated Neon host. It calls the application provisioning, credential and enrollment services; it does not copy the local development or manual-test data. Completed account passwords have gone through the application's initial credential change flow.

## PostgreSQL catalog compatibility

The Neon tenant migration rehearsal exposed PostgreSQL 18 table NOT NULL entries in `pg_constraint`, absent from the pinned PostgreSQL 17 constraint-name manifest. The verifier now excludes only `contype = 'n'` from that catalog-name comparison. All other constraint kinds, table/column/index/enum/trigger checks, migration checksums and physical tenant bindings retain their checks. This follows the catalog difference documented in [PostgreSQL 18](https://www.postgresql.org/docs/18/catalog-pg-constraint.html) and [PostgreSQL 17](https://www.postgresql.org/docs/17/catalog-pg-constraint.html).

The first Alpha operation stopped in REPAIR_REQUIRED after migrations. Before resuming it, the operator verified its original database owner/marker and complete installed schema against the pinned manifest, recorded a catalog compatibility review in the Master audit, and queued the existing retry flow. The regular worker alone completes activation; no ownership checks or migrations are bypassed.

The corrected API must be deployed on Render for the hosted tenant verifier to accept this catalog. Local focused schema regression passed 3 tests (30 unrelated cases excluded), with six disposable databases and the test container cleaned up. Hosted account verification is performed separately through application authentication and tenant guards; it is not a browser acceptance rehearsal.

## Completed hosted setup verification

Both gyms reached COMPLETE/ACTIVE through the provisioning worker. All 15 accounts passed application login; all 14 gym accounts passed GymAccessGuard with their expected gym and role. Each check session was logged out with CURRENT scope. No account requires a temporary-password change. These checks used the configured Neon demo target, with no development or manual-test database access. Both gyms have three completed trainer enrollments and three completed member enrollments.
