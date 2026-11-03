ALTER TYPE "OperationKind" ADD VALUE IF NOT EXISTS 'CHANGE_MEMBER_STATUS';

CREATE TABLE "MemberLifecycleIntent" (
  "operationId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "expectedAccessVersion" INTEGER NOT NULL,
  "expectedMemberVersion" INTEGER NOT NULL,
  "targetStatus" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberLifecycleIntent_pkey" PRIMARY KEY ("operationId"),
  CONSTRAINT "MemberLifecycleIntent_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberLifecycleIntent_expectedVersion_check" CHECK ("expectedMemberVersion" >= 0),
  CONSTRAINT "MemberLifecycleIntent_accessVersion_check" CHECK ("expectedAccessVersion" >= 0),
  CONSTRAINT "MemberLifecycleIntent_targetStatus_check" CHECK ("targetStatus" IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  CONSTRAINT "MemberLifecycleIntent_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 1 AND 500)
);
CREATE INDEX "MemberLifecycleIntent_memberId_createdAt_idx" ON "MemberLifecycleIntent"("memberId", "createdAt");
