BEGIN;

CREATE TYPE "RecoveryVerificationMethod" AS ENUM ('IN_PERSON', 'KNOWN_CONTACT');
CREATE TYPE "RecoveryCredentialScope" AS ENUM ('GYM', 'OPERATOR');
CREATE TYPE "IdentitySecurityEventType" AS ENUM ('PASSWORD_CHANGED', 'PASSWORD_RECOVERED');

CREATE TABLE "RecoveryCredential" (
  "id" TEXT NOT NULL,
  "scope" "RecoveryCredentialScope" NOT NULL,
  "identityId" TEXT NOT NULL,
  "gymId" TEXT,
  "issuedByIdentityId" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "verificationMethod" "RecoveryVerificationMethod" NOT NULL,
  "reason" TEXT NOT NULL,
  "authVersion" INTEGER NOT NULL,
  "issuerAuthVersion" INTEGER NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "redeemedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  CONSTRAINT "RecoveryCredential_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecoveryCredential_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RecoveryCredential_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RecoveryCredential_issuedByIdentityId_fkey" FOREIGN KEY ("issuedByIdentityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RecoveryCredential_bounds_check" CHECK (
    "secretHash" ~ '^[a-f0-9]{64}$' AND "authVersion" >= 0 AND "issuerAuthVersion" >= 0
    AND (("scope" = 'GYM' AND "gymId" IS NOT NULL) OR ("scope" = 'OPERATOR' AND "gymId" IS NULL))
    AND "attempts" BETWEEN 0 AND "maxAttempts" AND "maxAttempts" = 5
    AND char_length("reason") BETWEEN 1 AND 500
    AND "issuedAt" < "expiresAt" AND "expiresAt" <= "issuedAt" + INTERVAL '15 minutes'
    AND ("redeemedAt" IS NULL OR ("redeemedAt" >= "issuedAt" AND "redeemedAt" <= "expiresAt"))
    AND ("revokedAt" IS NULL OR "revokedAt" >= "issuedAt")
    AND NOT ("redeemedAt" IS NOT NULL AND "revokedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "RecoveryCredential_secretHash_key" ON "RecoveryCredential"("secretHash");
CREATE INDEX "RecoveryCredential_identityId_issuedAt_idx" ON "RecoveryCredential"("identityId", "issuedAt");
CREATE INDEX "RecoveryCredential_gymId_issuedAt_idx" ON "RecoveryCredential"("gymId", "issuedAt");
CREATE INDEX "RecoveryCredential_expiresAt_idx" ON "RecoveryCredential"("expiresAt");

CREATE FUNCTION gymos_guard_recovery_credential() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Recovery credential history cannot be deleted' USING ERRCODE = '23514';
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."identityId" IS DISTINCT FROM OLD."identityId"
    OR NEW."gymId" IS DISTINCT FROM OLD."gymId" OR NEW."scope" IS DISTINCT FROM OLD."scope"
    OR NEW."issuedByIdentityId" IS DISTINCT FROM OLD."issuedByIdentityId"
    OR NEW."secretHash" IS DISTINCT FROM OLD."secretHash" OR NEW."verificationMethod" IS DISTINCT FROM OLD."verificationMethod"
    OR NEW."reason" IS DISTINCT FROM OLD."reason" OR NEW."authVersion" IS DISTINCT FROM OLD."authVersion"
    OR NEW."issuerAuthVersion" IS DISTINCT FROM OLD."issuerAuthVersion"
    OR NEW."issuedAt" IS DISTINCT FROM OLD."issuedAt" OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
    OR NEW."maxAttempts" IS DISTINCT FROM OLD."maxAttempts" OR NEW."attempts" < OLD."attempts"
    OR NEW."attempts" > OLD."attempts" + 1 THEN
    RAISE EXCEPTION 'Recovery credential evidence is immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD."redeemedAt" IS NOT NULL AND NEW."redeemedAt" IS DISTINCT FROM OLD."redeemedAt" THEN
    RAISE EXCEPTION 'Recovery redemption is immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD."revokedAt" IS NOT NULL AND NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt" THEN
    RAISE EXCEPTION 'Recovery revocation is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "RecoveryCredential_immutable_history" BEFORE UPDATE OR DELETE ON "RecoveryCredential"
  FOR EACH ROW EXECUTE FUNCTION gymos_guard_recovery_credential();

CREATE TABLE "IdentitySecurityEvent" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "event" "IdentitySecurityEventType" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdentitySecurityEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IdentitySecurityEvent_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "IdentitySecurityEvent_identityId_createdAt_idx" ON "IdentitySecurityEvent"("identityId", "createdAt");
CREATE FUNCTION gymos_guard_identity_security_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Identity security events are append-only' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "IdentitySecurityEvent_append_only" BEFORE UPDATE OR DELETE ON "IdentitySecurityEvent"
  FOR EACH ROW EXECUTE FUNCTION gymos_guard_identity_security_event();

COMMIT;
