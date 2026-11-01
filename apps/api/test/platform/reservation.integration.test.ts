import { randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { SignJWT } from 'jose';
import { PrismaClient } from '../../src/generated/master/client.js';
import { AppModule } from '../../src/app.module.js';
import { DatabaseService } from '../../src/database.service.js';
import { createDisposablePostgresRun } from '../support/disposable-postgres.js';
import { provisioningInputSchema } from '@gymos/contracts/platform';

let run: Awaited<ReturnType<typeof createDisposablePostgresRun>>;
let master: PrismaClient; let app: INestApplication; let base: string; let admin: string; let other: string;
const secret = randomBytes(32).toString('hex');
async function token(userId: string, authVersion = 0) {
  return new SignJWT({authVersion}).setProtectedHeader({alg:'HS256'}).setSubject(userId).setIssuer('gymos-v2').setAudience('gymos-api').setExpirationTime('15m').sign(new TextEncoder().encode(secret));
}
async function call(path: string, bearer: string, body?: unknown, key = randomUUID()) {
  return fetch(`${base}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${bearer}`, 'content-type':'application/json', 'idempotency-key':key }, ...(body === undefined ? {} : {body:JSON.stringify(body)}) });
}
beforeAll(async () => {
  run = await createDisposablePostgresRun(); await run.migrate(run.masterName,'master');
  master = new PrismaClient({adapter:new PrismaPg({connectionString:run.masterUrl,max:4})});
  const first = await master.user.create({data:{email:'platform@example.test',passwordHash:'not-a-login-hash',globalRole:'SUPER_ADMIN'}});
  const second = await master.user.create({data:{email:'other-platform@example.test',passwordHash:'not-a-login-hash',globalRole:'SUPER_ADMIN'}});
  admin=await token(first.id); other=await token(second.id); vi.stubEnv('JWT_SECRET',secret);
  const module = await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DatabaseService).useValue({master}).compile();
  app=module.createNestApplication(); await app.listen(0,'127.0.0.1'); base=await app.getUrl();
});
afterAll(async()=>{ await app?.close(); await master?.$disconnect(); if(run)console.info('[platform-owned-cleanup]',JSON.stringify(await run.cleanup()));vi.unstubAllEnvs(); });
const input = (slug: string) => ({name:'Synthetic provisioned gym',slug,ownerEmail:'new-owner@example.test',currency:'LKR',timezone:'Asia/Colombo'});
it('reserves one operation and target atomically under concurrency and resolves lost responses',async()=>{
  const key=randomUUID(); const before=await master.user.count();
  const results=await Promise.all(Array.from({length:5},()=>call('/admin/gyms',admin,input('reserved'),key)));
  expect(results.map(r=>r.status)).toEqual([202,202,202,202,202]);
  const values=await Promise.all(results.map(r=>r.json()));
  expect(new Set(values.map(v=>v.operationId)).size).toBe(1);
  expect(await master.operation.count()).toBe(1); expect(await master.gym.count()).toBe(1); expect(await master.user.count()).toBe(before);
  expect(await master.provisioningIntent.count()).toBe(1);
  const stored=await master.operation.findFirstOrThrow();
  const client=await run.connect(run.masterName);
  try { expect((await client.query('SELECT count(*)::int AS count FROM pg_database WHERE datname=$1',[stored.databaseName])).rows[0].count).toBe(0); } finally {await client.end();}
  const replay=await call('/admin/gyms',admin,input('reserved'),key);
  expect((await replay.json()).operationId).toBe(stored.id);
  expect((await call('/admin/gyms',admin,input('changed'),key)).status).toBe(409);
  expect((await call('/admin/gyms',admin,{...input('reserved'),name:'Changed intent'},key)).status).toBe(409);
  expect((await call('/admin/gyms',admin,input('reserved'))).status).toBe(409);
  expect((await call(`/admin/operations/${stored.id}`,other)).status).toBe(404);
  const safe=await (await call(`/admin/operations/${stored.id}`,admin)).text();
  expect(/databaseName|ownerEmail|password|token|intent|manifestDigest/i.test(safe)).toBe(false);
});
it('normalizes identity/slug and reserves existing owners for private verification without changing them',async()=>{
  const existing=await master.user.create({data:{email:'existing@example.test',passwordHash:'unchanged-fixture-hash'}});
  const normalized=provisioningInputSchema.parse({...input(' REUSED-GYM '),ownerEmail:' Existing@Example.TEST '});
  const response=await call('/admin/gyms',admin,normalized);expect(response.status).toBe(202);
  expect((await response.json()).ownerVerificationRequired).toBe(true);
  const after=await master.user.findUniqueOrThrow({where:{id:existing.id}});
  expect(after.passwordHash===existing.passwordHash && after.authVersion===existing.authVersion).toBe(true);
});
it('rejects invalid input, target injection, missing key and non-platform callers without reservations',async()=>{
  const before=await master.gym.count();
  for(const body of [{...input('bad'),currency:'EUR'},{...input('bad'),timezone:'not-a-zone'},{...input('bad'),databaseName:'caller-target'},{...input('bad'),ownerPassword:'should-not-be-accepted'}]) expect((await call('/admin/gyms',admin,body)).status).toBe(422);
  expect((await fetch(`${base}/admin/gyms`,{method:'POST',headers:{authorization:`Bearer ${admin}`,'content-type':'application/json'},body:JSON.stringify(input('bad'))})).status).toBe(422);
  const user=await master.user.create({data:{email:'ordinary@example.test',passwordHash:'not-a-login-hash'}});
  expect((await call('/admin/gyms',await token(user.id),input('bad'))).status).toBe(403);
  expect((await call('/admin/gyms',await token(user.id,9),input('bad'))).status).toBe(401);
  expect(await master.gym.count()).toBe(before);
});
