import { randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { SignJWT } from 'jose';
import { AppModule } from '../../src/app.module.js';
import { DatabaseService } from '../../src/database.service.js';
import type { DatabaseService as DatabaseServiceType } from '../../src/database.service.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;
let app: INestApplication;
let base: string;
const secret = randomBytes(32).toString('hex');
async function bearer(identityId: string) {
  return new SignJWT({ authVersion: 0 }).setProtectedHeader({ alg: 'HS256' }).setSubject(identityId)
    .setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('15m').sign(new TextEncoder().encode(secret));
}
async function call(path: string, accessToken: string, body: unknown, key: string) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(body) });
}
async function read(path: string, accessToken: string) {
  return fetch(`${base}${path}`, { headers: { authorization: `Bearer ${accessToken}` } });
}

beforeAll(async () => {
  run = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(run);
  vi.stubEnv('JWT_SECRET', secret);
  vi.stubEnv('TENANT_DATABASE_URL', run.masterUrl);
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService).useValue({ master: fixture.master } as DatabaseServiceType).compile();
  app = module.createNestApplication(); await app.listen(0, '127.0.0.1'); base = await app.getUrl();
}, 120_000);

afterAll(async () => {
  await app?.close(); await fixture?.close();
  if (run) console.info('[packs-owned-cleanup]', JSON.stringify(await run.cleanup()));
  vi.unstubAllEnvs();
}, 120_000);

it('issues an owner-only zero-price entitlement once, projects the ledger, and leaves rejected requests without effects', async () => {
  const gymA = fixture.gyms[0]!; const gymB = fixture.gyms[1]!;
  const owner = await bearer(fixture.users.ownerA.id);
  const ownerB = await bearer(fixture.users.ownerB.id);
  const memberToken = await bearer(fixture.users.memberUser.id);
  const member = await fixture.tenants[0]!.member.findFirstOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const body = { credits: 3, validityDays: 90, price: '0.00', currency: 'LKR', idempotencyKey: `pack-issue-${run.runId}-0001` };
  const path = `/gyms/${gymA.slug}/members/${member.id}/session-packs`;

  const nonOwner = await call(path, memberToken, body, body.idempotencyKey);
  expect(nonOwner.status).toBe(403);
  const invalid = await call(path, owner, { ...body, credits: 1.5 }, `pack-invalid-${run.runId}-0001`);
  expect(invalid.status).toBe(422);
  const foreign = await call(`/gyms/${gymB.slug}/members/${member.id}/session-packs`, ownerB, body, `pack-foreign-${run.runId}-0001`);
  expect(foreign.status).toBe(404);

  const concurrent = await Promise.all([call(path, owner, body, body.idempotencyKey), call(path, owner, body, body.idempotencyKey)]);
  expect(concurrent.map(response => response.status)).toEqual([201, 201]);
  const outcomes = await Promise.all(concurrent.map(response => response.json())) as Array<{ pack: { id: string; balance: { available: number; held: number; consumed: number; expired: number } }; receiptId: string; replayed: boolean }>;
  const issued = outcomes.find(outcome => !outcome.replayed)!;
  expect(outcomes.filter(outcome => outcome.replayed)).toHaveLength(1);
  expect(issued).toMatchObject({ replayed: false, pack: { issuedCredits: 3, price: '0', balance: { available: 3, held: 0, consumed: 0, expired: 0 } } });
  expect(outcomes[1]).toMatchObject({ receiptId: issued.receiptId, pack: { id: issued.pack.id } });
  expect(await fixture.tenants[0]!.sessionPack.count({ where: { memberId: member.id } })).toBe(1);
  expect(await fixture.tenants[0]!.packCreditMovement.count({ where: { packId: issued.pack.id, kind: 'ISSUE' } })).toBe(1);
  expect(await fixture.tenants[0]!.commandReceipt.count({ where: { id: issued.receiptId, state: 'COMMITTED', commandKind: 'ISSUE_SESSION_PACK' } })).toBe(1);
  expect(await fixture.tenants[0]!.auditLog.count({ where: { receiptId: issued.receiptId, eventCode: 'SESSION_PACK_ISSUED' } })).toBe(1);
  expect(await fixture.tenants[0]!.sessionPack.count()).toBe(1);
  expect(await fixture.tenants[1]!.sessionPack.count()).toBe(0);

  const conflicting = await call(path, owner, { ...body, price: '1.00' }, body.idempotencyKey);
  expect(conflicting.status).toBe(409);
  expect(await fixture.tenants[0]!.sessionPack.count({ where: { memberId: member.id } })).toBe(1);
  expect(await fixture.tenants[0]!.packCreditMovement.count({ where: { kind: 'ISSUE' } })).toBe(1);

  const beforeRollback = await Promise.all([fixture.tenants[0]!.sessionPack.count(), fixture.tenants[0]!.packCreditMovement.count(),
    fixture.tenants[0]!.commandReceipt.count(), fixture.tenants[0]!.auditLog.count()]);
  await fixture.tenants[0]!.$executeRawUnsafe(`CREATE FUNCTION fail_pack_issue_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW."eventCode" = 'SESSION_PACK_ISSUED' THEN RAISE EXCEPTION 'injected pack audit failure'; END IF; RETURN NEW; END $$`);
  await fixture.tenants[0]!.$executeRawUnsafe('CREATE TRIGGER fail_pack_issue_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION fail_pack_issue_audit()');
  try {
    const rollbackResponse = await call(path, owner, { ...body, credits: 2, idempotencyKey: `pack-rollback-${run.runId}-0001` }, `pack-rollback-${run.runId}-0001`);
    expect(rollbackResponse.status).toBe(500);
    expect(await Promise.all([fixture.tenants[0]!.sessionPack.count(), fixture.tenants[0]!.packCreditMovement.count(),
      fixture.tenants[0]!.commandReceipt.count(), fixture.tenants[0]!.auditLog.count()])).toEqual(beforeRollback);
  } finally {
    await fixture.tenants[0]!.$executeRawUnsafe('DROP TRIGGER fail_pack_issue_audit ON "AuditLog"');
    await fixture.tenants[0]!.$executeRawUnsafe('DROP FUNCTION fail_pack_issue_audit()');
  }

  await fixture.tenants[0]!.sessionPack.update({ where: { id: issued.pack.id }, data: { startDate: new Date('2019-10-01T00:00:00.000Z'),
    endDateExclusive: new Date('2020-01-01T00:00:00.000Z') } });
  const beforeRead = await Promise.all([fixture.tenants[0]!.packCreditMovement.count(), fixture.tenants[0]!.commandReceipt.count(), fixture.tenants[0]!.auditLog.count()]);
  const detailResponse = await read(`/gyms/${gymA.slug}/members/${member.id}`, owner);
  expect(detailResponse.status).toBe(200);
  const detail = await detailResponse.json() as { sessionPacks: Array<{ availableCredits: number; heldCredits: number; expiredCredits: number }> };
  expect(detail.sessionPacks[0]).toMatchObject({ availableCredits: 0, heldCredits: 0, expiredCredits: 3 });
  expect(await Promise.all([fixture.tenants[0]!.packCreditMovement.count(), fixture.tenants[0]!.commandReceipt.count(), fixture.tenants[0]!.auditLog.count()])).toEqual(beforeRead);
});
