# Provisioning runtime

Set `PROVISIONING_RUNNER_ENABLED=true` on a persistent API process to enable automatic gym setup. The default is disabled, so deploying an API without this setting does not provision reservations. The manual test launcher enables it only against its owned synthetic environment.

Every five seconds the runner discovers at most five PENDING, MASTER_PREPARED or TENANT_COMMITTED provisioning operations with absent/expired leases. It waits at least thirty seconds between attempts on an operation, including those awaiting owner consent. Existing worker leases, pinned migration checksums and target ownership checks remain authoritative across replicas. FAILED_RETRYABLE requires the existing explicit retry action; REPAIR_REQUIRED and FAILED_FINAL are never automatically retried. Shutdown stops discovery and drains the active operation before database teardown.

The API needs MASTER_DATABASE_URL, TENANT_DATABASE_URL and PROVISION_DATABASE_URL configured for the intended PostgreSQL server. Provisioning credentials must permit database creation and migration; serving credentials require only their reviewed runtime grants. A serverless or sleeping process cannot provide this dispatcher reliably.

Check startup for `Provisioning runner enabled`, create a synthetic gym, observe its operation move to COMPLETE and verify owner credential handoff/first login. A reused owner must consent before activation. Logs contain operation references and status only; inspect the durable operation for retry/repair guidance. Never edit registry evidence or mark a database active by hand.

Before schema upgrades or backup/restore work, stop provisioning discovery and drain active operations. After a compatible forward rollout, restart and verify a pending synthetic reservation plus normal PT scheduled-work health.
