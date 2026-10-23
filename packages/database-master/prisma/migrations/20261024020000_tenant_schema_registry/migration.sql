BEGIN;

ALTER TABLE "Gym"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "expectedTenantSchemaVersion" TEXT,
  ADD COLUMN "expectedTenantManifestDigest" TEXT,
  ADD COLUMN "expectedTenantOperationId" TEXT;

CREATE UNIQUE INDEX "Gym_expectedTenantOperationId_key" ON "Gym"("expectedTenantOperationId");

ALTER TABLE "Gym"
  ADD CONSTRAINT "Gym_expectedTenantOperationId_fkey"
  FOREIGN KEY ("expectedTenantOperationId") REFERENCES "Operation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Gym_tenant_schema_expectation_check" CHECK (
    "version" >= 0
    AND (
      ("expectedTenantSchemaVersion" IS NULL
        AND "expectedTenantManifestDigest" IS NULL
        AND "expectedTenantOperationId" IS NULL)
      OR
      (length("expectedTenantSchemaVersion") BETWEEN 1 AND 128
        AND "expectedTenantManifestDigest" ~ '^[a-f0-9]{64}$'
        AND "expectedTenantOperationId" IS NOT NULL)
    )
  );

COMMIT;
