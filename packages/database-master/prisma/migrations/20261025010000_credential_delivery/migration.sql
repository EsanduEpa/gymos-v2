BEGIN;

CREATE TABLE "CredentialDelivery" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "issuedByIdentityId" TEXT NOT NULL,
  "gymId" TEXT NOT NULL,
  "authVersion" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "lastReissueKey" TEXT,
  "lastReissueDigest" TEXT,
  "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "acknowledgedAt" TIMESTAMPTZ(3),
  CONSTRAINT "CredentialDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CredentialDelivery_versions_expiry_check" CHECK (
    "authVersion" > 0 AND "version" >= 0 AND "expiresAt" > "issuedAt"
    AND (("lastReissueKey" IS NULL AND "lastReissueDigest" IS NULL)
      OR ("lastReissueKey" ~ '^[!-~]{16,128}$' AND "lastReissueDigest" ~ '^d1:[a-f0-9]{64}$'))
  )
);

CREATE UNIQUE INDEX "CredentialDelivery_operationId_key" ON "CredentialDelivery"("operationId");
CREATE INDEX "CredentialDelivery_identityId_issuedAt_idx" ON "CredentialDelivery"("identityId", "issuedAt");
CREATE INDEX "CredentialDelivery_gymId_issuedAt_idx" ON "CredentialDelivery"("gymId", "issuedAt");

ALTER TABLE "CredentialDelivery"
  ADD CONSTRAINT "CredentialDelivery_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CredentialDelivery_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CredentialDelivery_issuedByIdentityId_fkey"
    FOREIGN KEY ("issuedByIdentityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CredentialDelivery_gymId_fkey"
    FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION gymos_guard_credential_delivery() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Credential delivery history cannot be deleted' USING ERRCODE = '23514';
  END IF;

  IF NEW."operationId" IS DISTINCT FROM OLD."operationId"
    OR NEW."identityId" IS DISTINCT FROM OLD."identityId"
    OR NEW."issuedByIdentityId" IS DISTINCT FROM OLD."issuedByIdentityId"
    OR NEW."gymId" IS DISTINCT FROM OLD."gymId" THEN
    RAISE EXCEPTION 'Credential delivery binding is immutable' USING ERRCODE = '23514';
  END IF;

  IF NEW."version" = OLD."version" THEN
    IF NEW."authVersion" IS DISTINCT FROM OLD."authVersion"
      OR NEW."issuedAt" IS DISTINCT FROM OLD."issuedAt"
      OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
      OR NEW."lastReissueKey" IS DISTINCT FROM OLD."lastReissueKey"
      OR NEW."lastReissueDigest" IS DISTINCT FROM OLD."lastReissueDigest"
      OR (OLD."acknowledgedAt" IS NOT NULL AND NEW."acknowledgedAt" IS DISTINCT FROM OLD."acknowledgedAt") THEN
      RAISE EXCEPTION 'Credential changes require a new delivery version' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW."version" = OLD."version" + 1 THEN
    IF NEW."authVersion" <> OLD."authVersion" + 1
      OR NEW."issuedAt" <= OLD."issuedAt"
      OR NEW."expiresAt" <= NEW."issuedAt"
      OR NEW."acknowledgedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Credential rotation must advance auth and delivery versions' USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'Credential delivery version must advance once' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "CredentialDelivery_immutable_history"
  BEFORE UPDATE OR DELETE ON "CredentialDelivery"
  FOR EACH ROW EXECUTE FUNCTION gymos_guard_credential_delivery();

COMMIT;
