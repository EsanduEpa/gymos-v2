BEGIN;

CREATE TYPE "SessionDeviceClass" AS ENUM ('PERSONAL', 'SHARED');

CREATE TABLE "IdentitySession" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "authVersion" INTEGER NOT NULL,
  "deviceClass" "SessionDeviceClass" NOT NULL,
  "deviceLabel" TEXT NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "previousRefreshTokenHash" TEXT,
  "previousRefreshValidUntil" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idleExpiresAt" TIMESTAMPTZ(3) NOT NULL,
  "absoluteExpiresAt" TIMESTAMPTZ(3) NOT NULL,
  "revokedAt" TIMESTAMPTZ(3),
  "revocationReason" TEXT,
  CONSTRAINT "IdentitySession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IdentitySession_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "IdentitySession_bounds_check" CHECK (
    "authVersion" >= 0 AND "version" >= 0
    AND char_length("deviceLabel") BETWEEN 1 AND 80
    AND "refreshTokenHash" ~ '^[a-f0-9]{64}$'
    AND ("previousRefreshTokenHash" IS NULL OR "previousRefreshTokenHash" ~ '^[a-f0-9]{64}$')
    AND (("previousRefreshTokenHash" IS NULL) = ("previousRefreshValidUntil" IS NULL))
    AND "createdAt" <= "lastActivityAt" AND "lastActivityAt" < "idleExpiresAt"
    AND "idleExpiresAt" <= "absoluteExpiresAt" AND "createdAt" < "absoluteExpiresAt"
    AND ("revocationReason" IS NULL OR "revocationReason" IN ('CURRENT_DEVICE_LOGOUT','ALL_DEVICE_LOGOUT','REFRESH_REPLAY','EXPIRED','PASSWORD_CHANGED','ADMIN_REVOKED'))
    AND (("revokedAt" IS NULL) = ("revocationReason" IS NULL))
  )
);

CREATE UNIQUE INDEX "IdentitySession_refreshTokenHash_key" ON "IdentitySession"("refreshTokenHash");
CREATE UNIQUE INDEX "IdentitySession_previousRefreshTokenHash_key" ON "IdentitySession"("previousRefreshTokenHash");
CREATE INDEX "IdentitySession_identityId_revokedAt_lastActivityAt_idx" ON "IdentitySession"("identityId","revokedAt","lastActivityAt");
CREATE INDEX "IdentitySession_idleExpiresAt_idx" ON "IdentitySession"("idleExpiresAt");
CREATE INDEX "IdentitySession_absoluteExpiresAt_idx" ON "IdentitySession"("absoluteExpiresAt");

CREATE FUNCTION gymos_guard_identity_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Identity session history cannot be deleted' USING ERRCODE = '23514';
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."identityId" IS DISTINCT FROM OLD."identityId"
    OR NEW."authVersion" IS DISTINCT FROM OLD."authVersion" OR NEW."deviceClass" IS DISTINCT FROM OLD."deviceClass"
    OR NEW."deviceLabel" IS DISTINCT FROM OLD."deviceLabel" OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
    OR NEW."absoluteExpiresAt" IS DISTINCT FROM OLD."absoluteExpiresAt" THEN
    RAISE EXCEPTION 'Identity session binding is immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW."version" < OLD."version" OR NEW."version" > OLD."version" + 1 THEN
    RAISE EXCEPTION 'Identity session version must stay or advance once' USING ERRCODE = '23514';
  END IF;
  IF OLD."revokedAt" IS NOT NULL AND (NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt"
    OR NEW."revocationReason" IS DISTINCT FROM OLD."revocationReason") THEN
    RAISE EXCEPTION 'Identity session revocation is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "IdentitySession_immutable_history"
  BEFORE UPDATE OR DELETE ON "IdentitySession"
  FOR EACH ROW EXECUTE FUNCTION gymos_guard_identity_session();

COMMIT;
