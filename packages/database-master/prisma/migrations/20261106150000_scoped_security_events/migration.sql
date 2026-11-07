ALTER TABLE "IdentitySecurityEvent" ADD COLUMN "gymAccountId" TEXT;
CREATE INDEX "IdentitySecurityEvent_gymAccountId_createdAt_idx" ON "IdentitySecurityEvent"("gymAccountId", "createdAt");
ALTER TABLE "IdentitySecurityEvent" ADD CONSTRAINT "IdentitySecurityEvent_gymAccountId_fkey" FOREIGN KEY ("gymAccountId") REFERENCES "GymAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Historical account events are attributable only when there was exactly one
-- gym account. Ambiguous shared-identity history remains identity-scoped.
UPDATE "IdentitySecurityEvent" e SET "gymAccountId" = a."id"
FROM "GymAccount" a
WHERE a."userId" = e."identityId"
  AND (SELECT COUNT(*) FROM "GymAccount" x WHERE x."userId" = e."identityId") = 1;
