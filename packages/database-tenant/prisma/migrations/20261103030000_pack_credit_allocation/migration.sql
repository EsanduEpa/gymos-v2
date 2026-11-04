DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "SessionCreditHold") THEN
    RAISE EXCEPTION 'Pack credit allocation migration requires review when session holds already exist';
  END IF;
  IF EXISTS (SELECT 1 FROM "SessionPack" WHERE "price" * 100 <> ROUND("price" * 100)) THEN
    RAISE EXCEPTION 'Existing session pack prices exceed the approved minor unit precision';
  END IF;
END
$$;

ALTER TABLE "SessionPack"
  ADD COLUMN "totalMinorUnits" BIGINT,
  ADD COLUMN "creditBaseMinorUnits" BIGINT,
  ADD COLUMN "creditRemainder" INTEGER,
  ADD COLUMN "creditAllocationPolicyVersion" TEXT;

UPDATE "SessionPack"
SET "totalMinorUnits" = ROUND("price" * 100)::BIGINT,
    "creditBaseMinorUnits" = FLOOR(ROUND("price" * 100) / "issuedCredits")::BIGINT,
    "creditRemainder" = MOD(ROUND("price" * 100)::BIGINT, "issuedCredits"),
    "creditAllocationPolicyVersion" = 'DEC-06-v1';

ALTER TABLE "SessionPack"
  ALTER COLUMN "totalMinorUnits" SET NOT NULL,
  ALTER COLUMN "creditBaseMinorUnits" SET NOT NULL,
  ALTER COLUMN "creditRemainder" SET NOT NULL,
  ALTER COLUMN "creditAllocationPolicyVersion" SET NOT NULL,
  ADD CONSTRAINT "SessionPack_allocation_check" CHECK (
    "totalMinorUnits" >= 0 AND "creditBaseMinorUnits" >= 0
    AND "creditRemainder" >= 0 AND "creditRemainder" < "issuedCredits"
    AND "creditBaseMinorUnits" * "issuedCredits" + "creditRemainder" = "totalMinorUnits"
    AND "creditAllocationPolicyVersion" = 'DEC-06-v1'
  );

ALTER TABLE "SessionCreditHold"
  ADD COLUMN "creditOrdinal" INTEGER,
  ADD COLUMN "creditValueMinorUnits" BIGINT;

ALTER TABLE "SessionCreditHold"
  ALTER COLUMN "creditOrdinal" SET NOT NULL,
  ALTER COLUMN "creditValueMinorUnits" SET NOT NULL,
  ADD CONSTRAINT "SessionCreditHold_allocation_check" CHECK ("creditOrdinal" > 0 AND "creditValueMinorUnits" >= 0);

ALTER TABLE "PackCreditMovement" ADD COLUMN "creditOrdinal" INTEGER;
ALTER TABLE "PackCreditMovement" ADD CONSTRAINT "PackCreditMovement_ordinal_shape_check" CHECK (
  ("kind" = 'ISSUE' AND "creditOrdinal" IS NULL)
  OR ("kind" <> 'ISSUE' AND "creditOrdinal" IS NOT NULL AND "creditOrdinal" > 0)
);
CREATE UNIQUE INDEX "SessionCreditHold_active_ordinal_key" ON "SessionCreditHold"("packId", "creditOrdinal") WHERE "state" = 'HELD';
CREATE UNIQUE INDEX "PackCreditMovement_terminal_ordinal_key" ON "PackCreditMovement"("packId", "creditOrdinal") WHERE "kind" IN ('CONSUME', 'EXPIRE');

CREATE FUNCTION prevent_pack_allocation_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."issuedCredits" <> OLD."issuedCredits" OR NEW."price" <> OLD."price" OR NEW."currency" <> OLD."currency"
    OR NEW."totalMinorUnits" <> OLD."totalMinorUnits" OR NEW."creditBaseMinorUnits" <> OLD."creditBaseMinorUnits"
    OR NEW."creditRemainder" <> OLD."creditRemainder" OR NEW."creditAllocationPolicyVersion" <> OLD."creditAllocationPolicyVersion" THEN
    RAISE EXCEPTION 'Session pack allocation inputs are immutable';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER "SessionPack_allocation_immutable" BEFORE UPDATE ON "SessionPack"
  FOR EACH ROW EXECUTE FUNCTION prevent_pack_allocation_mutation();
