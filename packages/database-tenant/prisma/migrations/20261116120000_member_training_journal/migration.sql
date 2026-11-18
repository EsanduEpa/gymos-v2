CREATE TABLE "MemberJournalEntry" (
  "memberId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "entryKey" TEXT NOT NULL,
  "recordedOn" DATE NOT NULL,
  "encryptedData" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "MemberJournalEntry_pkey" PRIMARY KEY ("memberId", "kind", "entryKey"),
  CONSTRAINT "MemberJournalEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberJournalEntry_kind_check" CHECK ("kind" IN ('GOAL', 'SOLO', 'FOOD')),
  CONSTRAINT "MemberJournalEntry_version_check" CHECK ("version" >= 0)
);

CREATE INDEX "MemberJournalEntry_memberId_kind_recordedOn_entryKey_idx"
  ON "MemberJournalEntry"("memberId", "kind", "recordedOn" DESC, "entryKey" DESC);
