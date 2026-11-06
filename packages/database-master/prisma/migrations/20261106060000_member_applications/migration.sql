BEGIN;
CREATE TYPE "MemberApplicationState" AS ENUM ('PENDING','PROCESSING','APPROVED','REJECTED','WITHDRAWN','RECOVERY_REQUIRED');
CREATE TABLE "MemberApplication" (
  "id" TEXT NOT NULL,
  "gymId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "consentedAt" TIMESTAMPTZ(3) NOT NULL,
  "state" "MemberApplicationState" NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 0,
  "decidedByIdentityId" TEXT,
  "applicantReason" TEXT,
  "privateNote" TEXT,
  "enrollmentOperationId" TEXT,
  "membershipPlanId" TEXT,
  "dateOfBirth" TEXT,
  "membershipPlanName" TEXT,
  "membershipPrice" TEXT,
  "membershipCurrency" TEXT,
  "membershipDurationDays" INTEGER,
  "membershipPlanVersion" INTEGER,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberApplication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemberApplication_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberApplication_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberApplication_bounds_check" CHECK (
    char_length("fullName") BETWEEN 2 AND 120 AND char_length("phone") BETWEEN 1 AND 40
    AND "version" >= 0 AND ("dateOfBirth" IS NULL OR "dateOfBirth" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
    AND ("applicantReason" IS NULL OR char_length("applicantReason") <= 240)
    AND ("privateNote" IS NULL OR char_length("privateNote") <= 2000)
    AND ("membershipPrice" IS NULL OR "membershipPrice" ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$')
    AND ("membershipDurationDays" IS NULL OR "membershipDurationDays" BETWEEN 1 AND 3650)
    AND ("membershipPlanVersion" IS NULL OR "membershipPlanVersion" >= 0)
    AND ("membershipCurrency" IS NULL OR "membershipCurrency" IN ('LKR','USD'))
  )
);
CREATE UNIQUE INDEX "MemberApplication_enrollmentOperationId_key" ON "MemberApplication"("enrollmentOperationId");
CREATE INDEX "MemberApplication_gymId_state_createdAt_id_idx" ON "MemberApplication"("gymId","state","createdAt","id");
CREATE INDEX "MemberApplication_identityId_createdAt_idx" ON "MemberApplication"("identityId","createdAt");
CREATE UNIQUE INDEX "MemberApplication_one_open_per_identity_gym" ON "MemberApplication"("gymId","identityId") WHERE "state" IN ('PENDING','PROCESSING','RECOVERY_REQUIRED');
CREATE TYPE "MemberApplicationNoticeEvent" AS ENUM ('APPLICANT_SUBMITTED','APPLICANT_APPROVED','APPLICANT_REJECTED','APPLICANT_WITHDREW','OWNER_NEW_APPLICATION','OWNER_APPLICATION_WITHDREW');
CREATE TABLE "MemberApplicationNotice" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "gymId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "event" "MemberApplicationNoticeEvent" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMPTZ(3),
  CONSTRAINT "MemberApplicationNotice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemberApplicationNotice_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MemberApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberApplicationNotice_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberApplicationNotice_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberApplicationNotice_read_check" CHECK ("readAt" IS NULL OR "readAt" >= "createdAt")
);
CREATE UNIQUE INDEX "MemberApplicationNotice_applicationId_recipientId_event_key" ON "MemberApplicationNotice"("applicationId","recipientId","event");
CREATE INDEX "MemberApplicationNotice_recipientId_readAt_createdAt_idx" ON "MemberApplicationNotice"("recipientId","readAt","createdAt");
CREATE INDEX "MemberApplicationNotice_gymId_recipientId_createdAt_idx" ON "MemberApplicationNotice"("gymId","recipientId","createdAt");
CREATE FUNCTION "MemberApplicationNotice_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."id" <> OLD."id" OR NEW."applicationId" <> OLD."applicationId" OR NEW."gymId" <> OLD."gymId"
    OR NEW."recipientId" <> OLD."recipientId" OR NEW."event" <> OLD."event" OR NEW."createdAt" <> OLD."createdAt" THEN
    RAISE EXCEPTION 'member application notice is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "MemberApplicationNotice_immutable" BEFORE UPDATE ON "MemberApplicationNotice"
FOR EACH ROW EXECUTE FUNCTION "MemberApplicationNotice_immutable"();
CREATE FUNCTION "MemberApplication_immutable_subject"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."gymId" <> OLD."gymId" OR NEW."identityId" <> OLD."identityId" OR NEW."consentedAt" <> OLD."consentedAt"
    OR NEW."createdAt" <> OLD."createdAt" THEN
    RAISE EXCEPTION 'member application subject and consent are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "MemberApplication_immutable_subject" BEFORE UPDATE ON "MemberApplication"
FOR EACH ROW EXECUTE FUNCTION "MemberApplication_immutable_subject"();
COMMIT;
