ALTER TABLE "PTSession"
  ADD COLUMN "declineReason" TEXT;

ALTER TABLE "PTSession"
  ADD CONSTRAINT "PTSession_decline_reason_check"
  CHECK ("declineReason" IS NULL OR ("state" = 'DECLINED' AND char_length("declineReason") BETWEEN 1 AND 500));
