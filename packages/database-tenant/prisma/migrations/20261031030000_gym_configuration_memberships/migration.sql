BEGIN;

CREATE TYPE "PayPeriod" AS ENUM ('WEEKLY', 'MONTHLY');
CREATE TYPE "MembershipPlanStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "GymConfiguration"
  ADD COLUMN "address" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "payPeriod" "PayPeriod" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "defaultSessionFee" DECIMAL(19,4) NOT NULL DEFAULT 50,
  ADD COLUMN "level2SessionFee" DECIMAL(19,4),
  ADD COLUMN "introSessionFee" DECIMAL(19,4),
  ADD COLUMN "level1BaseRate" DECIMAL(9,6) NOT NULL DEFAULT 0.4,
  ADD COLUMN "level2BaseRate" DECIMAL(9,6) NOT NULL DEFAULT 0.5,
  ADD COLUMN "offShiftPremium" DECIMAL(9,6) NOT NULL DEFAULT 0.1,
  ADD COLUMN "cancellationWindowMinutes" INTEGER NOT NULL DEFAULT 1440,
  ADD COLUMN "lateCancelDeduction" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "minimumSessionDurationMinutes" INTEGER NOT NULL DEFAULT 20,
  ADD CONSTRAINT "GymConfiguration_rate_bounds" CHECK (
    "defaultSessionFee" >= 0 AND ("level2SessionFee" IS NULL OR "level2SessionFee" >= 0)
    AND ("introSessionFee" IS NULL OR "introSessionFee" >= 0)
    AND "level1BaseRate" BETWEEN 0 AND 1 AND "level2BaseRate" BETWEEN 0 AND 1
    AND "offShiftPremium" BETWEEN 0 AND 1
    AND "cancellationWindowMinutes" BETWEEN 0 AND 10080
    AND "minimumSessionDurationMinutes" BETWEEN 15 AND 480
  );

CREATE TABLE "MembershipPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "status" "MembershipPlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MembershipPlan_price_check" CHECK ("price" >= 0),
  CONSTRAINT "MembershipPlan_currency_check" CHECK ("currency" IN ('LKR', 'USD')),
  CONSTRAINT "MembershipPlan_duration_check" CHECK ("durationDays" BETWEEN 1 AND 3650)
);
CREATE INDEX "MembershipPlan_status_createdAt_idx" ON "MembershipPlan"("status", "createdAt");

CREATE TABLE "MembershipTerm" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDateExclusive" DATE NOT NULL,
  "agreedPrice" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "planNameSnapshot" TEXT NOT NULL,
  "configurationVersion" INTEGER NOT NULL,
  "actorIdentityId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestDigest" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipTerm_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MembershipTerm_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MembershipTerm_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MembershipTerm_dates_check" CHECK ("endDateExclusive" > "startDate"),
  CONSTRAINT "MembershipTerm_price_check" CHECK ("agreedPrice" >= 0),
  CONSTRAINT "MembershipTerm_currency_check" CHECK ("currency" IN ('LKR', 'USD')),
  CONSTRAINT "MembershipTerm_idempotency_check" CHECK (length("idempotencyKey") BETWEEN 16 AND 128)
);
CREATE UNIQUE INDEX "MembershipTerm_actorIdentityId_idempotencyKey_key" ON "MembershipTerm"("actorIdentityId", "idempotencyKey");
CREATE INDEX "MembershipTerm_memberId_startDate_endDateExclusive_idx" ON "MembershipTerm"("memberId", "startDate", "endDateExclusive");

CREATE TABLE "GymConfigurationVersion" (
  "id" TEXT NOT NULL,
  "gymConfigurationId" TEXT NOT NULL,
  "configurationVersion" INTEGER NOT NULL,
  "currency" TEXT,
  "timezone" TEXT,
  "address" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "payPeriod" "PayPeriod" NOT NULL,
  "defaultSessionFee" DECIMAL(19,4) NOT NULL,
  "level2SessionFee" DECIMAL(19,4),
  "introSessionFee" DECIMAL(19,4),
  "level1BaseRate" DECIMAL(9,6) NOT NULL,
  "level2BaseRate" DECIMAL(9,6) NOT NULL,
  "offShiftPremium" DECIMAL(9,6) NOT NULL,
  "cancellationWindowMinutes" INTEGER NOT NULL,
  "lateCancelDeduction" BOOLEAN NOT NULL,
  "minimumSessionDurationMinutes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GymConfigurationVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GymConfigurationVersion_gymConfigurationId_fkey" FOREIGN KEY ("gymConfigurationId") REFERENCES "GymConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GymConfigurationVersion_version_check" CHECK ("configurationVersion" >= 0),
  CONSTRAINT "GymConfigurationVersion_gymConfigurationId_configurationVersion_key" UNIQUE ("gymConfigurationId", "configurationVersion")
);
CREATE INDEX "GymConfigurationVersion_configurationVersion_idx" ON "GymConfigurationVersion"("configurationVersion");

CREATE FUNCTION gymos_capture_configuration_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."version" = OLD."version" THEN RETURN NEW; END IF;
  INSERT INTO "GymConfigurationVersion" (
    "id", "gymConfigurationId", "configurationVersion", "currency", "timezone", "address", "phone", "email", "payPeriod",
    "defaultSessionFee", "level2SessionFee", "introSessionFee", "level1BaseRate", "level2BaseRate", "offShiftPremium",
    "cancellationWindowMinutes", "lateCancelDeduction", "minimumSessionDurationMinutes"
  ) VALUES (
    'gcv_' || md5(NEW."id" || ':' || NEW."version"::text), NEW."id", NEW."version", NEW."currency", NEW."timezone", NEW."address", NEW."phone", NEW."email", NEW."payPeriod",
    NEW."defaultSessionFee", NEW."level2SessionFee", NEW."introSessionFee", NEW."level1BaseRate", NEW."level2BaseRate", NEW."offShiftPremium",
    NEW."cancellationWindowMinutes", NEW."lateCancelDeduction", NEW."minimumSessionDurationMinutes"
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER "GymConfigurationVersion_capture"
AFTER INSERT OR UPDATE OF "version" ON "GymConfiguration"
FOR EACH ROW
EXECUTE FUNCTION gymos_capture_configuration_version();

CREATE FUNCTION gymos_reject_configuration_version_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Gym configuration versions are immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "GymConfigurationVersion_immutable"
BEFORE UPDATE OR DELETE ON "GymConfigurationVersion"
FOR EACH ROW EXECUTE FUNCTION gymos_reject_configuration_version_change();

INSERT INTO "GymConfigurationVersion" (
  "id", "gymConfigurationId", "configurationVersion", "currency", "timezone", "address", "phone", "email", "payPeriod",
  "defaultSessionFee", "level2SessionFee", "introSessionFee", "level1BaseRate", "level2BaseRate", "offShiftPremium",
  "cancellationWindowMinutes", "lateCancelDeduction", "minimumSessionDurationMinutes"
)
SELECT 'gcv_' || md5("id" || ':' || "version"::text), "id", "version", "currency", "timezone", "address", "phone", "email", "payPeriod",
  "defaultSessionFee", "level2SessionFee", "introSessionFee", "level1BaseRate", "level2BaseRate", "offShiftPremium",
  "cancellationWindowMinutes", "lateCancelDeduction", "minimumSessionDurationMinutes"
FROM "GymConfiguration";

COMMIT;
