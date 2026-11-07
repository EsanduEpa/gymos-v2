ALTER TABLE "RecoveryCredential" DROP CONSTRAINT "RecoveryCredential_bounds_check";
ALTER TABLE "RecoveryCredential" ADD CONSTRAINT "RecoveryCredential_bounds_check" CHECK (
  "secretHash" ~ '^[a-f0-9]{64}$' AND "authVersion" >= 0 AND "issuerAuthVersion" >= 0
  AND (("scope" = 'GYM' AND "gymId" IS NOT NULL) OR "scope" = 'OPERATOR')
  AND "attempts" BETWEEN 0 AND "maxAttempts" AND "maxAttempts" = 5
  AND char_length("reason") BETWEEN 1 AND 500
  AND "issuedAt" < "expiresAt" AND "expiresAt" <= "issuedAt" + INTERVAL '15 minutes'
  AND ("redeemedAt" IS NULL OR ("redeemedAt" >= "issuedAt" AND "redeemedAt" <= "expiresAt"))
  AND ("revokedAt" IS NULL OR "revokedAt" >= "issuedAt")
  AND NOT ("redeemedAt" IS NOT NULL AND "revokedAt" IS NOT NULL)
);
