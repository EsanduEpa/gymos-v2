BEGIN;
-- Nullable only for existing tenants awaiting an explicit controlled upgrade.
-- New provisioning requires both values before publication.
ALTER TABLE "GymConfiguration"
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "timezone" TEXT,
  ADD CONSTRAINT "GymConfiguration_currency_check" CHECK ("currency" IS NULL OR "currency" IN ('LKR', 'USD')),
  ADD CONSTRAINT "GymConfiguration_timezone_check" CHECK ("timezone" IS NULL OR length("timezone") BETWEEN 1 AND 100);
COMMIT;
