ALTER TYPE "PTSessionState" ADD VALUE 'EXPIRED';
ALTER TABLE "PTSession"
  ADD COLUMN "requestExpiresAt" TIMESTAMPTZ(3),
  ADD COLUMN "availabilityVersion" INTEGER;
UPDATE "PTSession"
SET "requestExpiresAt" = LEAST("createdAt" + INTERVAL '12 hours', "scheduledStartAt" - INTERVAL '1 hour'),
    "availabilityVersion" = 0
WHERE "state" = 'PENDING_CONFIRMATION';
ALTER TABLE "PTSession" ADD CONSTRAINT "PTSession_request_expiry_check"
  CHECK ("state" <> 'PENDING_CONFIRMATION' OR "requestExpiresAt" IS NOT NULL);
CREATE INDEX "PTSession_state_requestExpiresAt_id_idx" ON "PTSession"("state", "requestExpiresAt", "id");
