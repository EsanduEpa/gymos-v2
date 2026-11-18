ALTER TABLE "MembershipPlan"
    ADD COLUMN "includedPtCredits" INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT "MembershipPlan_includedPtCredits_check" CHECK ("includedPtCredits" BETWEEN 0 AND 1000);

ALTER TABLE "MembershipTerm"
    ADD COLUMN "includedPtCredits" INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT "MembershipTerm_includedPtCredits_check" CHECK ("includedPtCredits" BETWEEN 0 AND 1000);

ALTER TABLE "SessionPack"
    ADD COLUMN "membershipTermId" TEXT,
    ADD CONSTRAINT "SessionPack_membershipTermId_fkey" FOREIGN KEY ("membershipTermId")
        REFERENCES "MembershipTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "SessionPack_membership_allowance_value_check" CHECK ("membershipTermId" IS NULL OR "price" = 0);

CREATE UNIQUE INDEX "SessionPack_membershipTermId_key" ON "SessionPack"("membershipTermId");
