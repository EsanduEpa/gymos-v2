import { rehearsePtRestore } from '../support/pt-restore-rehearsal.js';
import { FinanceService } from '../../src/finance/finance.service.js';
import { createHmac, randomUUID } from 'node:crypto';
import { SessionExceptionsService } from '../../src/sessions/session-exceptions.service.js';
import { SessionLifecycleService } from '../../src/sessions/session-lifecycle.service.js';
import { SessionReadsService } from '../../src/sessions/session-reads.service.js';
import { PayrollService } from '../../src/finance/payroll.service.js';
import { creditUnits, creditTotals } from '../../src/sessions/credit-unit-projection.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient as TenantClient } from '../../src/generated/tenant/client.js';
import { SessionBookingService } from '../../src/sessions/booking.service.js';
import { TenantSchemaGateService } from '../../src/tenancy/tenant-schema-gate.service.js';
import { requestDigest } from '../../src/operations/primitives.js';
import { createDisposableEnvironment } from '../support/disposable-environment.js';
import { seedTwoGymFixture } from '../fixtures/two-gym-fixture.js';

const previousSecret = process.env.JWT_SECRET;
let run: Awaited<ReturnType<typeof createDisposableEnvironment>>;
let fixture: Awaited<ReturnType<typeof seedTwoGymFixture>>;

beforeAll(async () => {
  process.env.JWT_SECRET = 'pt05-owned-disposable-quote-secret-over-32-bytes';
  run = await createDisposableEnvironment();
  fixture = await seedTwoGymFixture(run);
  const tenant = fixture.tenants[0]!;
  const receipt = await tenant.commandReceipt.create({ data: { actorIdentityId: fixture.users.ownerA.id, commandKind: 'TEST_AVAILABILITY', idempotencyKey: `booking-avail-${run.runId}`,
    requestDigest: requestDigest({ runId: run.runId, availability: true }), state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  const trainer = await tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  await tenant.pTAvailabilityRule.createMany({ data: Array.from({ length: 7 }, (_, weekday) => ({ id: `book_avail_${weekday}_${run.runId}`, trainerId: trainer.id, kind: 'WEEKLY_WINDOW' as const, weekday,
    startMinute: 0, endMinute: 1440, effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveToExclusive: new Date('2027-01-01T00:00:00Z'), createdByIdentityId: fixture.users.ownerA.id, commandReceiptId: receipt.id, updatedAt: new Date() })) });
}, 120_000);

afterAll(async () => {
  await fixture?.close();
  if (run) console.info('[pt-exceptions-owned-cleanup]', JSON.stringify(await run.cleanup()));
  if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
}, 120_000);

function localDate(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function addDays(date: string, days: number) { const result = new Date(`${date}T00:00:00.000Z`); result.setUTCDate(result.getUTCDate() + days); return result.toISOString().slice(0, 10); }

async function serviceFor(gymIndex = 0) {
  const fixtureGym = fixture.gyms[gymIndex]!;
  const gym = await fixture.master.gym.findUniqueOrThrow({ where: { id: fixtureGym.id }, include: { expectedTenantOperation: true } });
  const tenant = fixture.tenants[gymIndex]!;
  const access = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: gymIndex === 0 ? fixture.users.ownerA.id : fixture.users.ownerB.id, gymId: gym.id } } });
  const owner = gymIndex === 0 ? fixture.users.ownerA : fixture.users.ownerB;
  const schemaGate = new TenantSchemaGateService({ withDatabase: async (_databaseName: string, work: (client: TenantClient) => Promise<unknown>) => work(tenant) } as never);
  const service = new SessionBookingService({ master: fixture.master } as never, schemaGate);
  return { service, tenant, gym, access: { identityId: owner.id, identityVersion: owner.authVersion, gymId: gym.id, slug: gym.slug,
    role: 'OWNER', databaseName: gym.databaseName, expectedTenantSchemaVersion: gym.expectedTenantSchemaVersion,
    expectedTenantManifestDigest: gym.expectedTenantManifestDigest, expectedTenantOperationId: gym.expectedTenantOperationId,
    expectedTenantOperationState: gym.expectedTenantOperation?.state ?? null, observedTenantSchemaVersion: gym.expectedTenantOperation?.appliedTenantTemplateVersion ?? null,
    observedTenantManifestDigest: gym.expectedTenantOperation?.appliedTenantManifestDigest ?? null, accessVersion: access.version, actor: null } };
}

async function issueTestEntitlement(tenant: typeof fixture.tenants[number], gymIndex: number, memberId: string, suffix: string, credits: number, priceMinor = 10000n) {
  const ownerId = gymIndex === 0 ? fixture.users.ownerA.id : fixture.users.ownerB.id;
  const today = localDate(); const startDate = new Date(`${addDays(today,-30)}T00:00:00.000Z`); const endDateExclusive = new Date(`${addDays(today, 90)}T00:00:00.000Z`);
  const plan = await tenant.membershipPlan.create({ data: { name: `Booking ${suffix}`, price: '0', currency: 'LKR', durationDays: 90 } });
  await tenant.membershipTerm.create({ data: { memberId, planId: plan.id, startDate, endDateExclusive, agreedPrice: '0', currency: 'LKR',
    planNameSnapshot: plan.name, configurationVersion: 0, actorIdentityId: ownerId, idempotencyKey: `booking-term-${suffix}`, requestDigest: requestDigest({ suffix, term: true }) } });
  const receipt = await tenant.commandReceipt.create({ data: { actorIdentityId: ownerId, commandKind: 'TEST_BOOKING_PACK', idempotencyKey: `booking-pack-receipt-${suffix}`,
    requestDigest: requestDigest({ suffix, issued: true }), state: 'COMMITTED', committedAt: new Date(), safeResult: { state: 'COMPLETE' } } });
  const totalMinorUnits = priceMinor;
  const pack = await tenant.sessionPack.create({ data: { memberId, issuedCredits: credits, price: `${priceMinor / 100n}.${String(priceMinor % 100n).padStart(2,'0')}`, currency: 'LKR', totalMinorUnits,
    creditBaseMinorUnits: totalMinorUnits / BigInt(credits), creditRemainder: Number(totalMinorUnits % BigInt(credits)), creditAllocationPolicyVersion: 'DEC-06-v1',
    validityDays: 90, startDate, endDateExclusive,
    commandReceiptId: receipt.id, actorIdentityId: ownerId, idempotencyKey: `booking-pack-${suffix}`, requestDigest: requestDigest({ suffix, pack: true }) } });
  await tenant.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: credits, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: `booking-pack-issue-${suffix}`, receiptId: receipt.id, actorIdentityId: ownerId } });
  return pack;
}

function input(memberId: string, trainerId: string, date: string, key: string, time = '15:00') {
  return { memberId, trainerId, localDate: date, localTime: time, timeZone: 'Asia/Colombo', type: 'IN_PERSON' as const,
    durationMinutes: 60, notes: 'Owner booking', idempotencyKey: `booking-${key}-0123456789` };
}


const key = () => `pt05-${randomUUID()}`;
async function prepare(day: number, credits = 1, priceMinor = 10000n) {
  const ctx = await serviceFor();
  await ctx.tenant.sessionPack.updateMany({ data: { endDateExclusive: new Date(`${addDays(localDate(), -1)}T00:00:00Z`) } });
  const member = await ctx.tenant.member.findUniqueOrThrow({ where: { identityId: fixture.users.memberUser.id } });
  const trainer = await ctx.tenant.trainer.findUniqueOrThrow({ where: { identityId: fixture.users.trainerUser.id } });
  const pack = await issueTestEntitlement(ctx.tenant,0,member.id,`${run.runId}-${day}`,credits,priceMinor);
  const booking = await ctx.service.book(ctx.access,input(member.id,trainer.id,addDays(localDate(),day),key()));
  const gate = new TenantSchemaGateService({ withDatabase: async (_name: string, fn: (client: TenantClient) => Promise<unknown>) => fn(ctx.tenant) } as never);
  const db = { master: fixture.master } as never;
  const exceptions = new SessionExceptionsService(db,gate,ctx.service);
  const reads = new SessionReadsService(db,gate);
  const lifecycle = new SessionLifecycleService(db,gate);
  const payroll = new PayrollService(db,gate);
  const finance = new FinanceService(db,gate);
  const trainerLink = await fixture.master.gymAccess.findUniqueOrThrow({ where: { userId_gymId: { userId: fixture.users.trainerUser.id, gymId: ctx.gym.id } } });
  const trainerAccess = { ...ctx.access, role: 'TRAINER', identityId: fixture.users.trainerUser.id, identityVersion: fixture.users.trainerUser.authVersion, accessVersion: trainerLink.version,
    actor: { kind: 'TRAINER' as const, id: trainer.id, registrationOperationId: trainer.enrollmentOperationId! } };
  return { ...ctx, member, trainer, pack, booking, exceptions, reads, lifecycle, payroll, finance, trainerAccess };
}
async function source(ctx: Awaited<ReturnType<typeof prepare>>) {
  const session = await ctx.tenant.pTSession.findUniqueOrThrow({ where: { id: ctx.booking.session.id } });
  const event = await ctx.tenant.sessionStateEvent.findFirstOrThrow({ where: { sessionId: session.id }, orderBy: { committedVersion: 'desc' } });
  return { expectedVersion: session.version, sourceEventId: event.id, reason: 'Synthetic owner resolution with evidence' };
}
async function confirm(ctx: Awaited<ReturnType<typeof prepare>>, intent: object) {
  const quote = await ctx.exceptions.quote(ctx.access,ctx.booking.session.id,intent);
  const payload = { intent, quoteToken: quote.quoteToken, idempotencyKey: key() };
  return { quote, payload, result: await ctx.exceptions.commit(ctx.access,ctx.booking.session.id,payload) };
}

it('releases gym cancellations, exposes expired value honestly, and remedies only its original conserved unit with safe replay', async () => {
  const ctx = await prepare(1);
  const lateStart = new Date(Date.now()+3*3600000);
  await ctx.tenant.pTSession.update({where:{id:ctx.booking.session.id},data:{scheduledStartAt:lateStart,scheduledEndAt:new Date(lateStart.getTime()+3600000)}});
  await ctx.tenant.sessionPack.update({ where: { id: ctx.pack.id }, data: { endDateExclusive: new Date(`${addDays(localDate(),-1)}T00:00:00Z`) } });
  const trainerQuote = await ctx.lifecycle.quote(ctx.trainerAccess,ctx.booking.session.id,'CANCEL');
  expect(trainerQuote).toMatchObject({consequence:'FREE_CANCELLATION',requiresAcknowledgment:false});
  expect(new Date(trainerQuote.cancellationCutoff!).getTime()).toBeLessThan(new Date(trainerQuote.asOf).getTime());
  await expect(ctx.lifecycle.cancel(ctx.trainerAccess,ctx.booking.session.id,{expectedVersion:0,policyVersion:trainerQuote.policyVersion,idempotencyKey:key()})).rejects.toMatchObject({status:422});
  const cancellation = await confirm(ctx,{ ...await source(ctx),kind:'CANCEL',initiatedBy:'TRAINER' });
  expect(cancellation.quote.sourceCreditConsumed).toBe(false);
  expect(await ctx.tenant.sessionSettlement.findUniqueOrThrow({ where:{sessionId:ctx.booking.session.id} })).toMatchObject({kind:'FREE_CANCELLED',creditConsumed:false});
  expect(await ctx.reads.detail(ctx.access,ctx.booking.session.id)).toMatchObject({creditRemedyStatus:'AWAITING_OWNER',ownerAttention:'CREDIT_REMEDY_REQUIRED'});
  expect((await ctx.reads.attention(ctx.access,{page:1,pageSize:100})).items.some(row=>row.session.id===ctx.booking.session.id&&row.reason==='CREDIT_REMEDY_REQUIRED')).toBe(true);
  const remedy = await confirm(ctx,{...await source(ctx),kind:'REMEDY',newEndDateExclusive:addDays(localDate(),7)});
  expect((await ctx.exceptions.commit(ctx.access,ctx.booking.session.id,remedy.payload)).replayed).toBe(true);
  expect(await ctx.tenant.pTCreditRemedy.count({where:{sourceHoldId:ctx.booking.creditReservation.holdId}})).toBe(1);
  const unit=(await creditUnits(ctx.tenant,ctx.member.id)).find(row=>row.packId===ctx.pack.id)!;
  expect(unit).toMatchObject({creditOrdinal:1,available:1,held:0,consumed:0,expired:0,valueMinorUnits:10000n});
  expect(await ctx.tenant.sessionPack.findUniqueOrThrow({where:{id:ctx.pack.id}})).toMatchObject({issuedCredits:1,endDateExclusive:new Date(`${addDays(localDate(),-1)}T00:00:00Z`)});
  expect((await creditTotals(ctx.tenant,[ctx.member.id],localDate())).get(ctx.member.id)?.available).toBe(1);
  await ctx.tenant.membershipTerm.updateMany({where:{memberId:ctx.member.id},data:{endDateExclusive:new Date(`${addDays(localDate(),1)}T00:00:00Z`)}});
  await expect(ctx.service.book(ctx.access,input(ctx.member.id,ctx.trainer.id,addDays(localDate(),2),key(),'10:00'))).rejects.toThrow(/membership/);
  expect((await creditUnits(ctx.tenant,ctx.member.id)).find(row=>row.packId===ctx.pack.id)).toMatchObject({available:1,held:0});
  await ctx.tenant.membershipTerm.updateMany({where:{memberId:ctx.member.id},data:{endDateExclusive:new Date(`${addDays(localDate(),90)}T00:00:00Z`)}});
  const next=await ctx.service.book(ctx.access,input(ctx.member.id,ctx.trainer.id,addDays(localDate(),2),key(),'10:00'));
  expect(next.creditReservation).toMatchObject({packId:ctx.pack.id,creditOrdinal:1,creditValue:'100.00'});
  expect((await creditUnits(ctx.tenant,ctx.member.id)).find(row=>row.packId===ctx.pack.id)).toMatchObject({available:0,held:1,consumed:0,expired:0});
  const deliveryStart=new Date(Date.now()-5*60000);
  await ctx.tenant.pTSession.update({where:{id:next.session.id},data:{scheduledStartAt:deliveryStart,scheduledEndAt:new Date(deliveryStart.getTime()+3600000)}});
  await ctx.lifecycle.start(ctx.trainerAccess,next.session.id,{expectedVersion:0,idempotencyKey:key()});
  await ctx.tenant.pTSession.update({where:{id:next.session.id},data:{startedAt:new Date(Date.now()-21*60000)}});
  await ctx.lifecycle.complete(ctx.trainerAccess,next.session.id,{expectedVersion:1,idempotencyKey:key()});
  expect((await creditUnits(ctx.tenant,ctx.member.id)).find(row=>row.packId===ctx.pack.id)).toMatchObject({available:0,held:0,consumed:1,expired:0});
  await expect(ctx.tenant.packCreditMovement.create({data:{packId:ctx.pack.id,holdId:next.creditReservation.holdId,creditOrdinal:1,kind:'CONSUME',availableDelta:0,heldDelta:-1,consumedDelta:1,expiredDelta:0,sourceKey:key(),receiptId:next.receiptId,actorIdentityId:ctx.access.identityId}})).rejects.toThrow(/conserve/);
  expect((await creditUnits(ctx.tenant,ctx.member.id)).find(row=>row.packId===ctx.pack.id)).toMatchObject({available:0,held:0,consumed:1,expired:0});
});

it('charges a late member reschedule and rolls every effect back if the replacement hold fails',async()=>{
  const ctx=await prepare(3,2);
  const start=new Date(Date.now()+3*3600000);
  await ctx.tenant.pTSession.update({where:{id:ctx.booking.session.id},data:{scheduledStartAt:start,scheduledEndAt:new Date(start.getTime()+3600000)}});
  const intent={...await source(ctx),kind:'RESCHEDULE',initiatedBy:'MEMBER',localDate:addDays(localDate(),4),localTime:'10:00'};
  const quote=await ctx.exceptions.quote(ctx.access,ctx.booking.session.id,intent);
  expect(quote).toMatchObject({sourceCreditConsumed:true,replacementCreditRequired:true,sourceCreditOrdinal:1,destinationCreditOrdinal:2});
  await ctx.tenant.$executeRawUnsafe(`CREATE FUNCTION pt05_reject_replacement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind::text='HOLD' THEN RAISE EXCEPTION 'synthetic replacement hold failure'; END IF; RETURN NEW; END $$`);
  await ctx.tenant.$executeRawUnsafe(`CREATE TRIGGER pt05_reject_replacement BEFORE INSERT ON "PackCreditMovement" FOR EACH ROW EXECUTE FUNCTION pt05_reject_replacement()`);
  const payload={intent,quoteToken:quote.quoteToken,idempotencyKey:key()};
  try {await expect(ctx.exceptions.commit(ctx.access,ctx.booking.session.id,payload)).rejects.toThrow();}
  finally {await ctx.tenant.$executeRawUnsafe('DROP TRIGGER pt05_reject_replacement ON "PackCreditMovement"');await ctx.tenant.$executeRawUnsafe('DROP FUNCTION pt05_reject_replacement()');}
  expect(await ctx.tenant.pTSession.findUniqueOrThrow({where:{id:ctx.booking.session.id}})).toMatchObject({state:'SCHEDULED',version:0});
  expect(await ctx.tenant.sessionCreditHold.findUniqueOrThrow({where:{sessionId:ctx.booking.session.id}})).toMatchObject({state:'HELD'});
  expect(await ctx.tenant.pTSessionAdjustment.count({where:{sessionId:ctx.booking.session.id}})).toBe(0);
  expect(await ctx.tenant.sessionSettlement.count({where:{sessionId:ctx.booking.session.id}})).toBe(0);
  expect(await ctx.tenant.revenueRecord.count({where:{sessionId:ctx.booking.session.id}})).toBe(0);
  expect(await ctx.tenant.packCreditMovement.count({where:{packId:ctx.pack.id,kind:'CONSUME'}})).toBe(0);
  const result=await ctx.exceptions.commit(ctx.access,ctx.booking.session.id,payload);
  expect(result.replacementSessionId).toBeTruthy();
  expect((await ctx.exceptions.commit(ctx.access,ctx.booking.session.id,payload)).replayed).toBe(true);
  expect(await ctx.tenant.sessionSettlement.findUniqueOrThrow({where:{sessionId:ctx.booking.session.id}})).toMatchObject({kind:'LATE_CANCELLED',creditConsumed:true});
  expect((await creditUnits(ctx.tenant,ctx.member.id)).filter(row=>row.packId===ctx.pack.id).map(row=>[row.consumed,row.held])).toEqual([[1,0],[0,1]]);
  expect(await ctx.reads.detail(ctx.access,ctx.booking.session.id)).toMatchObject({replacementSessionId:result.replacementSessionId});
  expect(await ctx.reads.detail(ctx.access,result.replacementSessionId!)).toMatchObject({originalSessionId:ctx.booking.session.id,reservation:'HELD'});
});

it('cannot evade a late member charge with the last credit; a gym-side replacement can reuse its source without charging',async()=>{
  const ctx=await prepare(5,1);
  const start=new Date(Date.now()+5*3600000);
  await ctx.tenant.pTSession.update({where:{id:ctx.booking.session.id},data:{scheduledStartAt:start,scheduledEndAt:new Date(start.getTime()+3600000)}});
  const common={...await source(ctx),kind:'RESCHEDULE',localDate:addDays(localDate(),6),localTime:'10:00'};
  await expect(ctx.exceptions.quote(ctx.access,ctx.booking.session.id,{...common,initiatedBy:'MEMBER'})).rejects.toThrow(/separate eligible credit/);
  expect(await ctx.tenant.pTSession.findUniqueOrThrow({where:{id:ctx.booking.session.id}})).toMatchObject({state:'SCHEDULED',version:0});
  const {result,quote}=await confirm(ctx,{...common,initiatedBy:'GYM'});
  expect(quote.sourceCreditConsumed).toBe(false);
  expect(await ctx.tenant.sessionCreditHold.findUniqueOrThrow({where:{sessionId:result.replacementSessionId!}})).toMatchObject({packId:ctx.pack.id,creditOrdinal:1,state:'HELD'});
  expect(await ctx.tenant.sessionSettlement.findUniqueOrThrow({where:{sessionId:ctx.booking.session.id}})).toMatchObject({creditConsumed:false});
});

it('records missing delivery from actual evidence and reverses a mistaken completion without rewriting approved payroll',async()=>{
  const ctx=await prepare(7,1);
  const start=new Date(Date.now()-2*3600000);const end=new Date(start.getTime()+3600000);
  await ctx.tenant.pTSession.update({where:{id:ctx.booking.session.id},data:{scheduledStartAt:start,scheduledEndAt:end}});
  const common=await source(ctx);
  await expect(ctx.exceptions.quote(ctx.access,ctx.booking.session.id,{...common,kind:'CORRECTION',target:'COMPLETED'})).rejects.toThrow(/actual training/);
  const delivered=await confirm(ctx,{...common,kind:'CORRECTION',target:'COMPLETED',actualStartedAt:start.toISOString(),actualEndedAt:end.toISOString()});
  expect(delivered.quote).toMatchObject({operationalDelta:'100.0000',trainerPayDelta:'40.0000'});
  const originalSettlement=await ctx.tenant.sessionSettlement.findUniqueOrThrow({where:{sessionId:ctx.booking.session.id}});
  const pay=await ctx.tenant.trainerPayCorrection.findFirstOrThrow({where:{sessionId:ctx.booking.session.id}});
  let period=await ctx.tenant.trainerPayPeriod.findUniqueOrThrow({where:{id:pay.correctionPeriodId}});
  await ctx.payroll.close(ctx.access,period.id,{expectedVersion:period.version,idempotencyKey:key()});
  period=await ctx.tenant.trainerPayPeriod.findUniqueOrThrow({where:{id:period.id}});
  await ctx.payroll.approve(ctx.access,period.id,{expectedVersion:period.version,expectedTotal:period.calculatedTotal.toString(),idempotencyKey:key()});
  const approved=await ctx.tenant.trainerPayPeriod.findUniqueOrThrow({where:{id:period.id}});
  const reversed=await confirm(ctx,{...await source(ctx),kind:'CORRECTION',target:'FREE_CANCELLED'});
  expect(reversed.quote).toMatchObject({trainerPayDelta:'-40.0000',operationalDelta:'-100.0000',payPeriodState:'APPROVED'});
  expect(await ctx.tenant.trainerPayPeriod.findUniqueOrThrow({where:{id:period.id}})).toEqual(approved);
  expect(await ctx.tenant.sessionSettlement.findUniqueOrThrow({where:{sessionId:ctx.booking.session.id}})).toEqual(originalSettlement);
  expect((await ctx.tenant.revenueRecord.aggregate({where:{sessionId:ctx.booking.session.id},_sum:{amount:true}}))._sum.amount?.toString()).toBe('0');
  expect((await ctx.tenant.trainerPayCorrection.aggregate({where:{sessionId:ctx.booking.session.id},_sum:{amount:true}}))._sum.amount?.toString()).toBe('0');
  expect(await ctx.reads.detail(ctx.access,ctx.booking.session.id)).toMatchObject({settlement:'FREE_CANCELLED',creditConsumed:false,reservation:'RELEASED',session:{state:'CANCELLED'}});
  const negative=await ctx.tenant.trainerPayCorrection.findFirstOrThrow({where:{sessionId:ctx.booking.session.id,amount:{lt:0}}});
  expect(negative.correctionPeriodId).not.toBe(approved.id);
  expect((await ctx.tenant.trainerPayPeriod.findUniqueOrThrow({where:{id:negative.correctionPeriodId}})).calculatedTotal.toString()).toBe('-40');
  await expect(ctx.tenant.sessionSettlement.update({where:{id:originalSettlement.id},data:{creditConsumed:false}})).rejects.toThrow();
});

it('reverses an incorrect no-show with original history retained and protects unknown outcomes under concurrent corrections',async()=>{
  const ctx=await prepare(8,1);
  const start=new Date(Date.now()-4*3600000);
  await ctx.tenant.pTSession.update({where:{id:ctx.booking.session.id},data:{scheduledStartAt:start,scheduledEndAt:new Date(start.getTime()+3600000)}});
  const quote=await ctx.lifecycle.quote(ctx.trainerAccess,ctx.booking.session.id,'NO_SHOW');
  const body={expectedVersion:0,policyVersion:quote.policyVersion,idempotencyKey:key(),acknowledgmentToken:quote.acknowledgmentToken!};
  await ctx.lifecycle.noShow(ctx.trainerAccess,ctx.booking.session.id,body);
  const intent={...await source(ctx),kind:'CORRECTION',target:'FREE_CANCELLED'};
  const correctionQuote=await ctx.exceptions.quote(ctx.access,ctx.booking.session.id,intent);
  const outcomes=await Promise.allSettled([ctx.exceptions.commit(ctx.access,ctx.booking.session.id,{intent,quoteToken:correctionQuote.quoteToken,idempotencyKey:key()}),ctx.exceptions.commit(ctx.access,ctx.booking.session.id,{intent,quoteToken:correctionQuote.quoteToken,idempotencyKey:key()})]);
  expect(outcomes.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  expect(outcomes.filter(result=>result.status==='rejected')).toHaveLength(1);
  expect(await ctx.tenant.sessionSettlement.findUniqueOrThrow({where:{sessionId:ctx.booking.session.id}})).toMatchObject({kind:'MISSED',creditConsumed:true});
  expect((await ctx.tenant.revenueRecord.aggregate({where:{sessionId:ctx.booking.session.id},_sum:{amount:true}}))._sum.amount?.toString()).toBe('0');
  expect((await creditUnits(ctx.tenant,ctx.member.id)).find(row=>row.packId===ctx.pack.id)).toMatchObject({available:1,consumed:0,held:0,expired:0});
  expect((await ctx.lifecycle.noShow(ctx.trainerAccess,ctx.booking.session.id,body)).replayed).toBe(true);
});

it('rejects foreign gyms, non-owners, stale versions and changed quotes without changing source facts',async()=>{
  const ctx=await prepare(9,1);
  const intent={...await source(ctx),kind:'CANCEL',initiatedBy:'GYM'};
  await expect(ctx.exceptions.quote(ctx.trainerAccess,ctx.booking.session.id,intent)).rejects.toBeInstanceOf(ForbiddenException);
  const foreign=await serviceFor(1);
  const gate=new TenantSchemaGateService({withDatabase:async(_name:string,fn:(client:TenantClient)=>Promise<unknown>)=>fn(foreign.tenant)} as never);
  const service=new SessionExceptionsService({master:fixture.master} as never,gate,foreign.service);
  await expect(service.quote(foreign.access,ctx.booking.session.id,intent)).rejects.toBeInstanceOf(NotFoundException);
  const quote=await ctx.exceptions.quote(ctx.access,ctx.booking.session.id,intent);
  await expect(ctx.exceptions.commit(ctx.access,ctx.booking.session.id,{intent:{...intent,reason:'Changed reason after quote'},quoteToken:quote.quoteToken,idempotencyKey:key()})).rejects.toThrow(/quote/);
  const claims=JSON.parse(Buffer.from(quote.quoteToken.split('.')[0]!, 'base64url').toString('utf8')); claims.expires=Date.now()-1000;
  const payload=Buffer.from(JSON.stringify(claims)).toString('base64url'); const signingKey=createHmac('sha256',process.env.JWT_SECRET!).update('gymos-pt-exception-v1').digest();
  const expiredToken=`${payload}.${createHmac('sha256',signingKey).update(payload).digest('base64url')}`;
  await expect(ctx.exceptions.commit(ctx.access,ctx.booking.session.id,{intent,quoteToken:expiredToken,idempotencyKey:key()})).rejects.toThrow(/quote/);
  expect(await ctx.tenant.pTSession.findUniqueOrThrow({where:{id:ctx.booking.session.id}})).toMatchObject({state:'SCHEDULED',version:0});
});

it('restores an expired named unit and compensates a recorded expiry earning without duplicating value',async()=>{
  const ctx=await prepare(10,1);
  await confirm(ctx,{...await source(ctx),kind:'CANCEL',initiatedBy:'GYM'});
  await ctx.tenant.sessionPack.update({where:{id:ctx.pack.id},data:{endDateExclusive:new Date(`${addDays(localDate(),-1)}T00:00:00Z`)}});
  const receipt=await ctx.tenant.commandReceipt.create({data:{actorIdentityId:ctx.access.identityId,commandKind:'TEST_LEGACY_EXPIRY',idempotencyKey:key(),requestDigest:requestDigest({legacy:ctx.pack.id}),state:'COMMITTED',committedAt:new Date(),safeResult:{resourceIds:[]}}});
  await ctx.tenant.packCreditMovement.create({data:{packId:ctx.pack.id,kind:'EXPIRE',creditOrdinal:1,availableDelta:-1,heldDelta:0,consumedDelta:0,expiredDelta:1,sourceKey:key(),receiptId:receipt.id,actorIdentityId:ctx.access.identityId}});
  expect((await creditUnits(ctx.tenant,ctx.member.id)).find(unit=>unit.packId===ctx.pack.id)).toMatchObject({available:0,expired:1});
  const window={from:addDays(localDate(),10),to:addDays(localDate(),10),page:1,pageSize:25};
  const beforeRecordedExpiry=await ctx.finance.revenue(ctx.access,window);
  const expiredEarning=await ctx.tenant.revenueRecord.create({data:{sessionId:ctx.booking.session.id,category:'EXPIRED_UNUSED',amount:'100',currency:'LKR',sourceKey:key()}});
  expect((await ctx.finance.revenue(ctx.access,window)).totals.expiredUnusedSeparate).toBe(beforeRecordedExpiry.totals.expiredUnusedSeparate);
  const remedy=await confirm(ctx,{...await source(ctx),kind:'REMEDY',newEndDateExclusive:addDays(localDate(),12)});
  expect((await ctx.exceptions.commit(ctx.access,ctx.booking.session.id,remedy.payload)).replayed).toBe(true);
  expect((await creditUnits(ctx.tenant,ctx.member.id)).find(unit=>unit.packId===ctx.pack.id)).toMatchObject({available:1,held:0,consumed:0,expired:0,valueMinorUnits:10000n,consistent:true});
  expect((await ctx.tenant.revenueRecord.aggregate({where:{sessionId:ctx.booking.session.id},_sum:{amount:true}}))._sum.amount?.toString()).toBe('0');
  expect(await ctx.tenant.revenueRecord.findUniqueOrThrow({where:{id:expiredEarning.id}})).toMatchObject({category:'EXPIRED_UNUSED'});
  expect((await ctx.tenant.packCreditMovement.aggregate({where:{packId:ctx.pack.id},_sum:{availableDelta:true,heldDelta:true,consumedDelta:true,expiredDelta:true}}))._sum).toEqual({availableDelta:1,heldDelta:0,consumedDelta:0,expiredDelta:0});
});


it('records an exact zero-value delivered correction as a real pay fact without minting value under replay',async()=>{
  const ctx=await prepare(13,1,0n);
  expect(ctx.booking.creditReservation.packId).toBe(ctx.pack.id);
  expect(ctx.booking.creditReservation.creditValue).toBe('0.00');
  const start=new Date(Date.now()-6*3600000);const end=new Date(start.getTime()+3600000);
  await ctx.tenant.pTSession.update({where:{id:ctx.booking.session.id},data:{scheduledStartAt:start,scheduledEndAt:end}});
  const saved=await confirm(ctx,{...await source(ctx),kind:'CORRECTION',target:'COMPLETED',actualStartedAt:start.toISOString(),actualEndedAt:end.toISOString()});
  expect(saved.quote).toMatchObject({sourceValue:'0.0000',trainerPayDelta:'0.0000',operationalDelta:'0.0000'});
  expect((await ctx.exceptions.commit(ctx.access,ctx.booking.session.id,saved.payload)).replayed).toBe(true);
  const facts=await ctx.tenant.trainerPayCorrection.findMany({where:{sessionId:ctx.booking.session.id}});
  expect(facts).toHaveLength(1);expect(facts[0]!.amount.toString()).toBe('0');
  expect((await creditUnits(ctx.tenant,ctx.member.id)).find(row=>row.packId===ctx.pack.id)).toMatchObject({available:0,held:0,consumed:1,expired:0,valueMinorUnits:0n});
});

it('restores a synthetic PT backup and reconciles every table/view without activating the target', async () => {
  const evidence = await rehearsePtRestore(run, fixture.tenantDatabases[0]!);
  expect(evidence.counts.PTSessionAdjustment).toBeGreaterThan(0);
  expect(evidence.counts.PTCreditRemedy).toBeGreaterThan(0);
  expect(evidence.counts.TrainerPayCorrection).toBeGreaterThan(0);
  expect(evidence.counts.PackCreditMovement).toBeGreaterThan(0);
  expect(evidence.counts.PTSessionReminder).toBeGreaterThan(0);
  console.info('[pt-restore-rehearsal]', JSON.stringify(evidence));
}, 120_000);
