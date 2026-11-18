CREATE TABLE "MemberProgressPhoto" (
    "id" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "takenOn" DATE NOT NULL,
    "uploadedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encryptedData" TEXT NOT NULL,
    CONSTRAINT "MemberProgressPhoto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MemberProgressPhoto_memberId_fkey" FOREIGN KEY ("memberId")
        REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MemberProgressPhoto_timeline_idx" ON "MemberProgressPhoto"("memberId", "takenOn", "uploadedAt", "id");
