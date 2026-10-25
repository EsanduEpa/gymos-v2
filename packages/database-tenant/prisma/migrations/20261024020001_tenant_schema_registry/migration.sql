BEGIN;

CREATE TYPE "SchemaVerificationState" AS ENUM ('APPLYING', 'VERIFIED', 'FAILED', 'REPAIR_REQUIRED');

CREATE TABLE "GymConfiguration" (
  "id" TEXT NOT NULL,
  "masterGymId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "GymConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GymConfiguration_masterGymId_key" ON "GymConfiguration"("masterGymId");

CREATE TABLE "SchemaState" (
  "id" TEXT NOT NULL,
  "state" "SchemaVerificationState" NOT NULL DEFAULT 'APPLYING',
  "appliedTemplateVersion" TEXT,
  "appliedManifestDigest" TEXT,
  "schemaEvidenceDigest" TEXT,
  "verifiedMigrations" JSONB NOT NULL DEFAULT '[]',
  "appliedAt" TIMESTAMPTZ(3),
  "verifiedAt" TIMESTAMPTZ(3),
  "lastOperationId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "SchemaState_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GymConfiguration"
  ADD CONSTRAINT "GymConfiguration_singleton_check" CHECK (
    "id" = 'current'
    AND length("masterGymId") BETWEEN 1 AND 128
    AND "masterGymId" ~ '^[A-Za-z0-9_:-]+$'
    AND "version" >= 0
  );

ALTER TABLE "SchemaState"
  ADD CONSTRAINT "SchemaState_singleton_check" CHECK (
    "id" = 'current'
    AND "version" >= 0
    AND jsonb_typeof("verifiedMigrations") = 'array'
    AND (
      "state" <> 'VERIFIED'
      OR (
        length("appliedTemplateVersion") BETWEEN 1 AND 128
        AND "appliedManifestDigest" ~ '^[a-f0-9]{64}$'
        AND "schemaEvidenceDigest" ~ '^[a-f0-9]{64}$'
        AND "verifiedAt" IS NOT NULL
        AND "appliedAt" IS NOT NULL
        AND "lastOperationId" IS NOT NULL
      )
    )
  );

CREATE FUNCTION gymos_guard_gym_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."masterGymId" IS DISTINCT FROM OLD."masterGymId" THEN
    RAISE EXCEPTION 'Physical tenant binding is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "GymConfiguration_immutable_binding"
BEFORE UPDATE ON "GymConfiguration"
FOR EACH ROW EXECUTE FUNCTION gymos_guard_gym_binding();

COMMIT;
