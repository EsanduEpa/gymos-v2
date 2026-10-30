BEGIN;
CREATE TABLE "ProvisioningIntent" (
 "operationId" TEXT PRIMARY KEY REFERENCES "Operation"("id") ON DELETE RESTRICT,
 "name" TEXT NOT NULL, "ownerEmail" TEXT NOT NULL, "plannedOwnerIdentityId" TEXT NOT NULL,
 "reuseIdentity" BOOLEAN NOT NULL, "actorAuthVersion" INTEGER NOT NULL,
 "currency" TEXT NOT NULL, "timezone" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ProvisioningIntent_input_check" CHECK (
  length("name") BETWEEN 2 AND 100 AND "ownerEmail" = lower(btrim("ownerEmail"))
  AND "ownerEmail" !~ '[^!-~]' AND "ownerEmail" !~ '\s'
  AND "currency" IN ('LKR','USD') AND length("timezone") BETWEEN 1 AND 100 AND "actorAuthVersion" >= 0
 )
);
CREATE FUNCTION gymos_keep_provisioning_intent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Provisioning intent is immutable and retained' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER "ProvisioningIntent_immutable" BEFORE UPDATE OR DELETE ON "ProvisioningIntent"
FOR EACH ROW EXECUTE FUNCTION gymos_keep_provisioning_intent();
COMMIT;
