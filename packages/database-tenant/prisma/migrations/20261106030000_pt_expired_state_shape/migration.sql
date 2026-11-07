-- Forward repair: the original state-shape constraint predates request expiry.
-- Keep all historical state requirements and allow only an unconfirmed expired request.
ALTER TABLE "PTSession" DROP CONSTRAINT "PTSession_state_shape_check";
ALTER TABLE "PTSession" ADD CONSTRAINT "PTSession_state_shape_v2_check" CHECK (
  ("state" IN ('PENDING_CONFIRMATION', 'DECLINED', 'EXPIRED') AND "confirmedAt" IS NULL AND "startedAt" IS NULL AND "endedAt" IS NULL)
  OR ("state" = 'SCHEDULED' AND "confirmedAt" IS NOT NULL AND "startedAt" IS NULL AND "endedAt" IS NULL)
  OR ("state" = 'ACTIVE' AND "confirmedAt" IS NOT NULL AND "startedAt" IS NOT NULL AND "endedAt" IS NULL)
  OR ("state" = 'COMPLETED' AND "confirmedAt" IS NOT NULL AND "startedAt" IS NOT NULL AND "endedAt" IS NOT NULL)
  OR ("state" = 'MISSED' AND "confirmedAt" IS NOT NULL AND "startedAt" IS NULL AND "endedAt" IS NOT NULL)
  OR ("state" = 'CANCELLED' AND "endedAt" IS NOT NULL AND "startedAt" IS NULL)
);
