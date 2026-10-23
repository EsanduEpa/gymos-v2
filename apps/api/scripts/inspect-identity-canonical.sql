-- Read-only preflight for a separately selected, authorized database.
-- Do not execute against V1 or load an unknown/shared target. No automatic repair.
-- Returns opaque identity IDs/reasons/counts, never email values or credentials.
WITH identities AS (
  SELECT "id", "email",
    count(*) OVER (PARTITION BY lower(btrim("email") COLLATE "C")) AS normalized_count
  FROM "User"
)
SELECT "id" AS "identityId",
  "email" COLLATE "C" !~ '^[!-~]+$' AS "unsupportedAsciiOrWhitespace",
  "email" COLLATE "C" <> lower(btrim("email") COLLATE "C") AS "noncanonical",
  normalized_count AS "normalizedCollisionCount"
FROM identities
WHERE "email" COLLATE "C" !~ '^[!-~]+$'
   OR "email" COLLATE "C" <> lower(btrim("email") COLLATE "C")
   OR normalized_count > 1
ORDER BY "id";
