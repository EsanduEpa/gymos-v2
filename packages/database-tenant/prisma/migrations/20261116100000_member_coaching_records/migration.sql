BEGIN;

CREATE TABLE "MemberDietaryProfile" (
  "memberId" TEXT NOT NULL,
  "encryptedData" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MemberDietaryProfile_pkey" PRIMARY KEY ("memberId"),
  CONSTRAINT "MemberDietaryProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberDietaryProfile_version_check" CHECK ("version" >= 0)
);

CREATE TABLE "MemberBodyMeasurement" (
  "memberId" TEXT NOT NULL,
  "measuredOn" DATE NOT NULL,
  "encryptedData" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MemberBodyMeasurement_pkey" PRIMARY KEY ("memberId", "measuredOn"),
  CONSTRAINT "MemberBodyMeasurement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

COMMIT;
