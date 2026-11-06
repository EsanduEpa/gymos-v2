import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/tenant/client.js';
import { TENANT_TEMPLATE_V8, TENANT_TEMPLATE_MANIFEST } from '../../src/tenancy/tenant-template-manifest.js';
import { verifyInstalledTenant } from '../../src/tenancy/tenant-schema-verifier.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';

it('upgrades the reviewed PT05 schema, preserves legacy bookings and backfills only eligible reminder thresholds', async () => {
  const run = await createDisposableEnvironment();
  let sql: pg.Client | undefined; let tenant: PrismaClient | undefined;
  try {
    const target = await run.createOwnedDatabase(); await run.verifyOwnership(target.name);
    sql = new pg.Client({ connectionString: target.url }); await sql.connect();
    await sql.query(`CREATE TABLE "_prisma_migrations" (id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)`);
    for (const [index, migration] of TENANT_TEMPLATE_V8.migrations.entries()) {
      const path = fileURLToPath(new URL(`../../../../packages/database-tenant/prisma/migrations/${migration.name}/migration.sql`, import.meta.url));
      await sql.query(await readFile(path, 'utf8'));
      await sql.query('INSERT INTO "_prisma_migrations" (id,checksum,migration_name,started_at,finished_at,applied_steps_count) VALUES ($1,$2,$3,$4,$4,1)',
        [randomUUID(), migration.checksum, migration.name, new Date(Date.UTC(2026, 10, 1) + index * 1000)]);
    }
    tenant = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.url, max: 1 }) });
    expect((await verifyInstalledTenant(tenant, TENANT_TEMPLATE_V8)).templateVersion).toBe(TENANT_TEMPLATE_V8.version);
    await sql.query(`INSERT INTO "Member" (id,"fullName","identityId","registrationState","updatedAt") VALUES ('legacy-member','Synthetic legacy member','legacy-member-identity','PENDING',now())`);
    await sql.query(`INSERT INTO "Trainer" (id,"fullName","identityId","updatedAt") VALUES ('legacy-trainer','Synthetic legacy trainer','legacy-trainer-identity',now())`);
    // Future unsupported service/duration is historical data; upgrading must not rewrite its terms.
    await sql.query(`INSERT INTO "PTSession" (id,"memberId","trainerId",state,type,"scheduledStartAt","scheduledEndAt","gymTimezone",fee,currency,"confirmationRate","confirmationLevel","configurationVersion","confirmedAt","createdByIdentityId","updatedAt")
      VALUES ('legacy-future','legacy-member','legacy-trainer','SCHEDULED','VIRTUAL',now()+interval '3 days',now()+interval '3 days 90 minutes','Asia/Colombo',100,'LKR',0.4,'LEVEL_1',0,now(),'synthetic-owner',now()),
      ('legacy-short','legacy-member','legacy-trainer','SCHEDULED','INTRODUCTORY',now()+interval '6 hours',now()+interval '6 hours 30 minutes','Asia/Colombo',0,'LKR',0.4,'LEVEL_1',0,now(),'synthetic-owner',now())`);
    await sql.query(`INSERT INTO "PTSession" (id,"memberId","trainerId",state,type,"scheduledStartAt","scheduledEndAt","gymTimezone",fee,currency,"configurationVersion","requestExpiresAt","createdByIdentityId","updatedAt") VALUES
      ('legacy-overdue','legacy-member','legacy-trainer','PENDING_CONFIRMATION','IN_PERSON',now()+interval '5 days',now()+interval '5 days 1 hour','Asia/Colombo',100,'LKR',0,now()-interval '1 hour','synthetic-member',now())`);
    const before = (await sql.query('SELECT * FROM "PTSession" ORDER BY id')).rows;
    await run.migrate(target.name, 'tenant');
    expect((await verifyInstalledTenant(tenant)).templateVersion).toBe(TENANT_TEMPLATE_MANIFEST.version);
    expect((await sql.query('SELECT * FROM "PTSession" ORDER BY id')).rows).toEqual(before);
    expect(await tenant.pTSessionReminder.count({ where: { sessionId: 'legacy-future' } })).toBe(4);
    const short = await tenant.pTSessionReminder.findMany({ where: { sessionId: 'legacy-short' } });
    expect(short).toHaveLength(2); expect(short.every(job => job.kind === '1H')).toBe(true);
    expect(await tenant.pTSessionReminder.count({ where: { sessionId: 'legacy-overdue' } })).toBe(0);
    console.info('[pt-upgrade-rehearsal]', JSON.stringify({ from: TENANT_TEMPLATE_V8.version, to: TENANT_TEMPLATE_MANIFEST.version, unchangedBookings: before.length, reminders: 6, overdueRequestPreserved: true }));
  } finally { await sql?.end(); await tenant?.$disconnect(); console.info('[pt-upgrade-cleanup]', JSON.stringify(await run.cleanup())); }
}, 120_000);
