BEGIN;

ALTER TABLE "GymConfiguration"
  ADD COLUMN "level1SessionPay" DECIMAL(19,2) NOT NULL DEFAULT 20,
  ADD COLUMN "level2SessionPay" DECIMAL(19,2) NOT NULL DEFAULT 25,
  ADD CONSTRAINT "GymConfiguration_trainer_session_pay_check"
    CHECK ("level1SessionPay" BETWEEN 0 AND 999999999999999.99 AND "level2SessionPay" BETWEEN 0 AND 999999999999999.99);

-- Seed future defaults from each gym's nominal fees and existing level rates.
UPDATE "GymConfiguration" SET
  "level1SessionPay" = round("defaultSessionFee" * "level1BaseRate", 2),
  "level2SessionPay" = round(COALESCE("level2SessionFee", "defaultSessionFee") * "level2BaseRate", 2);

ALTER TABLE "Trainer" ADD COLUMN "sessionPayOverride" DECIMAL(19,2),
  ADD CONSTRAINT "Trainer_session_pay_override_check"
    CHECK ("sessionPayOverride" BETWEEN 0 AND 999999999999999.99);

ALTER TABLE "PTSession" ADD COLUMN "confirmedTrainerPay" DECIMAL(19,2),
  ADD CONSTRAINT "PTSession_confirmed_trainer_pay_check"
    CHECK ("confirmedTrainerPay" IS NULL OR ("confirmedAt" IS NOT NULL AND "confirmedTrainerPay" BETWEEN 0 AND 999999999999999.99));

COMMIT;
