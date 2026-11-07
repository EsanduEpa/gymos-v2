BEGIN;
ALTER TABLE "Notification" ADD COLUMN "supersededAt" timestamptz(3);
CREATE TABLE "PTSessionReminder" (
  "id" text PRIMARY KEY,
  "sessionId" text NOT NULL REFERENCES "PTSession"("id") ON DELETE RESTRICT,
  "scheduledStartAt" timestamptz(3) NOT NULL,
  "scheduledEndAt" timestamptz(3) NOT NULL,
  "kind" text NOT NULL,
  "recipientIdentityId" text NOT NULL,
  "recipientRole" text NOT NULL,
  "dueAt" timestamptz(3) NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "attempts" integer NOT NULL DEFAULT 0,
  "nextAttemptAt" timestamptz(3) NOT NULL,
  "finishedAt" timestamptz(3),
  "notificationId" text UNIQUE REFERENCES "Notification"("id") ON DELETE RESTRICT,
  "lastError" text,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PTSessionReminder_shape_check" CHECK (
    "kind" IN ('24H','1H') AND "recipientRole" IN ('MEMBER','TRAINER')
    AND "status" IN ('PENDING','SENT','SKIPPED','CANCELLED') AND "attempts" >= 0
    AND "scheduledEndAt" > "scheduledStartAt"
    AND "dueAt" = "scheduledStartAt" - CASE "kind" WHEN '24H' THEN interval '24 hours' ELSE interval '1 hour' END
    AND (("status" = 'PENDING' AND "finishedAt" IS NULL) OR ("status" <> 'PENDING' AND "finishedAt" IS NOT NULL))
    AND (("status" = 'SENT') = ("notificationId" IS NOT NULL))
  )
);
CREATE UNIQUE INDEX "PTSessionReminder_revision_key" ON "PTSessionReminder"("sessionId","scheduledStartAt","scheduledEndAt","kind","recipientIdentityId");
CREATE INDEX "PTSessionReminder_due_idx" ON "PTSessionReminder"("status","nextAttemptAt","dueAt","id");
CREATE TABLE "PTScheduledWorkStatus" (
  "id" text PRIMARY KEY CHECK ("id" = 'current'),
  "lastAttemptAt" timestamptz(3) NOT NULL,
  "lastSuccessAt" timestamptz(3),
  "totalFailures" integer NOT NULL DEFAULT 0,
  "lastError" text
);
CREATE FUNCTION pt_sync_reminders() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW."state" IS NOT DISTINCT FROM OLD."state"
      AND NEW."scheduledStartAt" = OLD."scheduledStartAt" AND NEW."scheduledEndAt" = OLD."scheduledEndAt"
      AND NEW."memberId" = OLD."memberId" AND NEW."trainerId" = OLD."trainerId" THEN RETURN NEW; END IF;
    -- Retain emitted history, but remove obsolete instructions from the bell/unread count.
    UPDATE "Notification" n SET "supersededAt" = clock_timestamp(), "readAt" = coalesce(n."readAt",clock_timestamp())
      FROM "PTSessionReminder" r WHERE r."sessionId" = NEW."id" AND n."id" = r."notificationId" AND n."supersededAt" IS NULL;
    UPDATE "PTSessionReminder" SET "status" = 'CANCELLED', "finishedAt" = clock_timestamp(), "lastError" = 'Schedule or state changed'
      WHERE "sessionId" = NEW."id" AND "status" = 'PENDING';
  END IF;
  IF NEW."state" = 'SCHEDULED' AND NEW."confirmedAt" IS NOT NULL THEN
    INSERT INTO "PTSessionReminder" ("id","sessionId","scheduledStartAt","scheduledEndAt","kind","recipientIdentityId","recipientRole","dueAt","nextAttemptAt")
      SELECT 'ptr_' || md5(NEW."id" || ':' || extract(epoch FROM NEW."scheduledStartAt")::text || ':' || extract(epoch FROM NEW."scheduledEndAt")::text || ':' || k.kind || ':' || p.identity),
        NEW."id",NEW."scheduledStartAt",NEW."scheduledEndAt",k.kind,p.identity,p.role,NEW."scheduledStartAt" - k.distance,NEW."scheduledStartAt" - k.distance
      FROM (VALUES ('24H',interval '24 hours'),('1H',interval '1 hour')) k(kind,distance)
      CROSS JOIN (SELECT "identityId" AS identity,'MEMBER' AS role FROM "Member" WHERE "id" = NEW."memberId"
        UNION ALL SELECT "identityId",'TRAINER' FROM "Trainer" WHERE "id" = NEW."trainerId") p
      WHERE p.identity IS NOT NULL AND NEW."scheduledStartAt" - k.distance >= NEW."confirmedAt"
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PTSession_reminder_sync" AFTER INSERT OR UPDATE OF "state","scheduledStartAt","scheduledEndAt","memberId","trainerId"
  ON "PTSession" FOR EACH ROW EXECUTE FUNCTION pt_sync_reminders();
-- Backfill under original confirmation time; the worker records outage skips, never changes a booking.
-- Invoke the insert branch without mutating historical PTSession rows.
CREATE TEMP TABLE pt_reminder_backfill (LIKE "PTSession" INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TRIGGER pt_reminder_backfill_insert AFTER INSERT ON pt_reminder_backfill FOR EACH ROW EXECUTE FUNCTION pt_sync_reminders();
INSERT INTO pt_reminder_backfill SELECT * FROM "PTSession" WHERE "state" = 'SCHEDULED' AND "scheduledStartAt" > clock_timestamp();

COMMIT;
