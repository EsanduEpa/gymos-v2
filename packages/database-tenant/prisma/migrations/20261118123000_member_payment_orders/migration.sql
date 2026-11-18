CREATE TYPE "MemberPaymentKind" AS ENUM ('MEMBERSHIP', 'PT_PACK');
CREATE TYPE "MemberPaymentOrderStatus" AS ENUM ('PENDING', 'FAILED', 'CANCELLED', 'CONFIRMED', 'REVIEW_REQUIRED', 'CHARGEBACK');
CREATE TYPE "PtPackOfferStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "PtPackOffer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" DECIMAL(19,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "status" "PtPackOfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PtPackOffer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PtPackOffer_terms_check" CHECK (length(btrim("name")) BETWEEN 1 AND 80 AND "credits" BETWEEN 1 AND 1000 AND "price" > 0
        AND "currency" IN ('LKR', 'USD') AND "validityDays" BETWEEN 1 AND 3650 AND "version" >= 0)
);

CREATE TABLE "MemberPaymentOrder" (
    "id" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "enrollmentOperationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "kind" "MemberPaymentKind" NOT NULL,
    "planId" TEXT,
    "offerId" TEXT,
    "itemName" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "amount" DECIMAL(19,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "configurationVersion" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "status" "MemberPaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "termId" TEXT,
    "packId" TEXT,
    CONSTRAINT "MemberPaymentOrder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MemberPaymentOrder_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemberPaymentOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemberPaymentOrder_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PtPackOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemberPaymentOrder_termId_fkey" FOREIGN KEY ("termId") REFERENCES "MembershipTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemberPaymentOrder_packId_fkey" FOREIGN KEY ("packId") REFERENCES "SessionPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemberPaymentOrder_terms_check" CHECK ("durationDays" BETWEEN 1 AND 3650 AND "credits" BETWEEN 0 AND 1000
        AND "amount" > 0 AND "currency" IN ('LKR', 'USD') AND "expiresAt" > "createdAt"),
    CONSTRAINT "MemberPaymentOrder_kind_check" CHECK (
        ("kind" = 'MEMBERSHIP' AND "planId" IS NOT NULL AND "offerId" IS NULL AND "packId" IS NULL)
        OR ("kind" = 'PT_PACK' AND "offerId" IS NOT NULL AND "planId" IS NULL AND "termId" IS NULL AND "credits" > 0)
    ),
    CONSTRAINT "MemberPaymentOrder_confirmation_check" CHECK (
        (COALESCE("termId", "packId") IS NULL) = ("confirmedAt" IS NULL)
        AND ("status" <> 'CONFIRMED' OR "confirmedAt" IS NOT NULL)
        AND ("confirmedAt" IS NULL OR "status" IN ('CONFIRMED', 'CHARGEBACK'))
    )
);

CREATE UNIQUE INDEX "MemberPaymentOrder_identityId_idempotencyKey_key" ON "MemberPaymentOrder"("identityId", "idempotencyKey");
CREATE INDEX "MemberPaymentOrder_planId_idx" ON "MemberPaymentOrder"("planId");
CREATE INDEX "MemberPaymentOrder_offerId_idx" ON "MemberPaymentOrder"("offerId");
CREATE INDEX "MemberPaymentOrder_memberId_createdAt_id_idx" ON "MemberPaymentOrder"("memberId", "createdAt", "id");
CREATE UNIQUE INDEX "MemberPaymentOrder_termId_key" ON "MemberPaymentOrder"("termId");
CREATE UNIQUE INDEX "MemberPaymentOrder_packId_key" ON "MemberPaymentOrder"("packId");

CREATE FUNCTION gymos_guard_member_payment_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (to_jsonb(NEW) - ARRAY['status','termId','packId','confirmedAt']) <> (to_jsonb(OLD) - ARRAY['status','termId','packId','confirmedAt'])
        OR (OLD."confirmedAt" IS NOT NULL AND (NEW."termId" IS DISTINCT FROM OLD."termId" OR NEW."packId" IS DISTINCT FROM OLD."packId"
            OR NEW."confirmedAt" IS DISTINCT FROM OLD."confirmedAt")) THEN
        RAISE EXCEPTION 'Member payment order intent and fulfillment are immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER "MemberPaymentOrder_immutable_intent" BEFORE UPDATE ON "MemberPaymentOrder"
    FOR EACH ROW EXECUTE FUNCTION gymos_guard_member_payment_order();
