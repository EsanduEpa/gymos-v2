import { createHash, randomUUID } from 'node:crypto';
import {
  Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param,
  Post, Req, UnprocessableEntityException, UseGuards,
} from '@nestjs/common';
import { appendTenantAudit } from './operations/transaction-audit.js';
import { issueMembershipPtAllowance } from './membership-pt-allowance.js';
import { requestDigest } from './operations/primitives.js';
import { configurationReadSchema, createMembershipPlanSchema, managedMembershipPlanSchema, manageMembershipPlanSchema, memberMembershipOverviewSchema, membershipEligibilitySchema, renewalResultSchema, renewMembershipSchema, updateConfigurationSchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { DatabaseService } from './database.service.js';
import { addLocalDays, asDate, dateString, deriveMembershipEligibility, gymLocalDate } from './membership-rules.js';
import { creditTotals } from './sessions/credit-unit-projection.js';

function validMoney(value: string, currency: string): boolean {
  const [whole, fraction = ''] = value.split('.');
  return !value.startsWith('-') && ['LKR', 'USD'].includes(currency) && whole!.length <= 15 && fraction.length <= 2;
}
function validRate(value: string): boolean {
  if (!/^(?:0|1)(?:\.[0-9]{1,6})?$/.test(value)) return false;
  return Number(value) <= 1;
}
function dateOnly(value: Date): string { return dateString(value); }
function configurationDto(row: {
  id: string; currency: string | null; timezone: string | null; address: string; phone: string | null; email: string | null;
  payPeriod: string; defaultSessionFee: { toString(): string }; level2SessionFee: { toString(): string } | null;
  introSessionFee: { toString(): string } | null; level1BaseRate: { toString(): string }; level2BaseRate: { toString(): string };
  offShiftPremium: { toString(): string }; cancellationWindowMinutes: number; lateCancelDeduction: boolean;
  level1SessionPay: { toString(): string }; level2SessionPay: { toString(): string };
  minimumSessionDurationMinutes: number; version: number;
}) {
  if (!row.currency || !row.timezone) throw new ConflictException('Gym configuration requires currency and timezone setup');
  return {
    version: row.version, currency: row.currency, timezone: row.timezone, address: row.address,
    phone: row.phone, email: row.email, payPeriod: row.payPeriod,
    defaultSessionFee: row.defaultSessionFee.toString(), level2SessionFee: row.level2SessionFee?.toString() ?? null,
    introSessionFee: row.introSessionFee?.toString() ?? null,
    level1BaseRate: row.level1BaseRate.toString(), level2BaseRate: row.level2BaseRate.toString(),
    offShiftPremium: row.offShiftPremium.toString(), cancellationWindowMinutes: row.cancellationWindowMinutes,
    level1SessionPay: row.level1SessionPay.toString(), level2SessionPay: row.level2SessionPay.toString(),
    lateCancelDeduction: row.lateCancelDeduction, minimumSessionDurationMinutes: row.minimumSessionDurationMinutes,
  };
}

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class ConfigurationController {
  constructor(private readonly tenantGate: TenantSchemaGateService, private readonly database: DatabaseService) {}

  private access(request: GymRequest) {
    if (!request.gymAccess) throw new ForbiddenException('Gym access denied');
    return request.gymAccess;
  }
  private owner(request: GymRequest) {
    const access = this.access(request);
    if (access.role !== 'OWNER') throw new ForbiddenException('Only gym owners can manage configuration');
    return access;
  }
  private async assertCurrentOwner(access: NonNullable<GymRequest['gymAccess']>) {
    const [user, link, gym, clock] = await Promise.all([
      this.database.master.user.findUnique({ where: { id: access.identityId }, select: { authVersion: true, mustChangePassword: true, credentialExpiresAt: true } }),
      this.database.master.gymAccess.findUnique({ where: { userId_gymId: { userId: access.identityId, gymId: access.gymId } }, select: { role: true, linkStatus: true, version: true } }),
      this.database.master.gym.findUnique({ where: { id: access.gymId }, select: { status: true } }),
      this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`,
    ]);
    if (!user || user.authVersion !== access.identityVersion || user.mustChangePassword
      || (user.credentialExpiresAt && user.credentialExpiresAt <= clock[0]!.now)
      || link?.role !== 'OWNER' || link.linkStatus !== 'ACTIVE' || link.version !== access.accessVersion || gym?.status !== 'ACTIVE') {
      throw new ForbiddenException('Gym access changed; reload and try again');
    }
  }

  @Get('configuration')
  async read(@Req() request: GymRequest) {
    const access = this.owner(request);
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const [row, plans] = await Promise.all([
        tenant.gymConfiguration.findUnique({ where: { id: 'current' } }),
        tenant.membershipPlan.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 500,
          select: { id: true, name: true, description: true, price: true, currency: true, durationDays: true, includedPtCredits: true,
            status: true, version: true, createdAt: true } }),
      ]);
      if (!row) throw new NotFoundException('Gym configuration not found');
      const configuration = configurationDto(row);
      return configurationReadSchema.parse({ slug: access.slug, configuration,
        plans: plans.map(plan => ({ ...plan, price: plan.price.toString(), createdAt: plan.createdAt.toISOString() })), asOf: new Date().toISOString() });
    });
  }

  @Post('configuration')
  async update(@Req() request: GymRequest, @Body() body: unknown) {
    const access = this.owner(request);
    const parsed = updateConfigurationSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Check the configuration fields');
    return this.tenantGate.withVerifiedTenant(access, tenant => tenant.$transaction(async tx => {
      await this.assertCurrentOwner(access);
      await tx.$queryRaw`SELECT "id" FROM "GymConfiguration" WHERE "id" = 'current' FOR UPDATE`;
      const current = await tx.gymConfiguration.findUnique({ where: { id: 'current' } });
      if (!current) throw new NotFoundException('Gym configuration not found');
      if (current.version !== parsed.data.expectedVersion) throw new ConflictException('Configuration changed; reload before saving');
      const { expectedVersion: _expected, ...input } = parsed.data;
      const changes: Record<string, unknown> = { ...input };
      for (const key of ['defaultSessionFee', 'level2SessionFee', 'introSessionFee'] as const) {
        const value = input[key];
        if (value !== undefined) {
          if (value === '' || value === null) changes[key] = null;
          else if (!validMoney(value, current.currency ?? '')) throw new UnprocessableEntityException('Money precision must match the gym currency');
        }
      }
      for (const key of ['level1BaseRate', 'level2BaseRate', 'offShiftPremium'] as const) {
        const value = input[key]; if (value !== undefined && !validRate(value)) throw new UnprocessableEntityException('Pay rates must be between 0 and 100 percent');
      }
      if (changes.email === '') changes.email = null;
      if (changes.phone === '') changes.phone = null;
      const updated = await tx.gymConfiguration.update({ where: { id: 'current' }, data: { ...changes, version: { increment: 1 } } });
      const receiptId = randomUUID(); const version = current.version + 1;
      await tx.commandReceipt.create({ data: { id: receiptId, actorIdentityId: access.identityId,
        commandKind: 'UPDATE_GYM_CONFIGURATION', idempotencyKey: randomUUID(), requestDigest: requestDigest(parsed.data),
        state: 'COMMITTED', resourceType: 'GYM_CONFIGURATION', resourceId: 'current', safeResult: { version }, committedAt: new Date() } });
      await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId, actorIdentityId: access.identityId,
        eventCode: 'GYM_CONFIGURATION_UPDATED', resourceType: 'GYM_CONFIGURATION', resourceId: 'current', transition: { version } });
      return configurationDto(updated);
    }));
  }

  @Post('membership-plans')
  async createPlan(@Req() request: GymRequest, @Body() body: unknown) {
    const access = this.owner(request);
    const parsed = createMembershipPlanSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a plan name, price, duration from 1 to 3650 days and up to 1000 PT credits');
    return this.tenantGate.withVerifiedTenant(access, tenant => tenant.$transaction(async tx => {
      await this.assertCurrentOwner(access);
      await tx.$queryRaw`SELECT "id" FROM "GymConfiguration" WHERE "id" = 'current' FOR UPDATE`;
      const current = await tx.gymConfiguration.findUnique({ where: { id: 'current' } });
      if (!current?.currency) throw new ConflictException('Gym currency is not configured');
      if (current.version !== parsed.data.expectedVersion) throw new ConflictException('Configuration changed; reload before adding a plan');
      if (!validMoney(parsed.data.price, current.currency)) throw new UnprocessableEntityException('Price precision must match the gym currency');
      const version = current.version + 1;
      const plan = await tx.membershipPlan.create({ data: { name: parsed.data.name, description: parsed.data.description || null,
        price: parsed.data.price, currency: current.currency, durationDays: parsed.data.durationDays,
        includedPtCredits: parsed.data.includedPtCredits ?? 0 },
        select: { id: true, name: true, description: true, price: true, currency: true, durationDays: true, includedPtCredits: true,
          status: true, version: true, createdAt: true } });
      await tx.gymConfiguration.update({ where: { id: 'current' }, data: { version } });
      const receiptId = randomUUID();
      await tx.commandReceipt.create({ data: { id: receiptId, actorIdentityId: access.identityId,
        commandKind: 'CREATE_MEMBERSHIP_PLAN', idempotencyKey: randomUUID(), requestDigest: requestDigest(parsed.data),
        state: 'COMMITTED', resourceType: 'MEMBERSHIP_PLAN', resourceId: plan.id, safeResult: { id: plan.id, version }, committedAt: new Date() } });
      await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId, actorIdentityId: access.identityId,
        eventCode: 'MEMBERSHIP_PLAN_CREATED', resourceType: 'MEMBERSHIP_PLAN', resourceId: plan.id, transition: { version } });
      return { ...plan, price: plan.price.toString(), createdAt: plan.createdAt.toISOString(), configurationVersion: version };
    }));
  }

  @Post('membership-plans/:planId')
  async managePlan(@Req() request: GymRequest, @Param('planId') planId: string, @Body() body: unknown) {
    const access = this.owner(request);
    const parsed = manageMembershipPlanSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Check the plan fields');
    const input = parsed.data;
    return this.tenantGate.withVerifiedTenant(access, tenant => tenant.$transaction(async tx => {
      await this.assertCurrentOwner(access);
      await tx.$queryRaw`SELECT "id" FROM "GymConfiguration" WHERE "id" = 'current' FOR UPDATE`;
      const configuration = await tx.gymConfiguration.findUnique({ where: { id: 'current' } });
      if (!configuration?.currency || configuration.version !== input.expectedVersion) throw new ConflictException('Configuration changed; reload before saving');
      await tx.$queryRaw`SELECT "id" FROM "MembershipPlan" WHERE "id" = ${planId} FOR UPDATE`;
      const current = await tx.membershipPlan.findUnique({ where: { id: planId } });
      if (!current) throw new NotFoundException('Membership plan not found');
      if (current.version !== input.expectedPlanVersion) throw new ConflictException('Plan changed; reload before saving');
      const application = await this.database.master.memberApplication.findFirst({
        where: { gymId: access.gymId, membershipPlanId: planId, ...(input.action === 'DELETE' ? {} : { state: 'PROCESSING' }) },
        select: { id: true },
      });

      let plan = null;
      if (input.action === 'DELETE') {
        const [term, checkout] = await Promise.all([
          tx.membershipTerm.findFirst({ where: { planId }, select: { id: true } }),
          tx.memberPaymentOrder.findFirst({ where: { planId }, select: { id: true } }),
        ]);
        if (current.status !== 'INACTIVE' || term || application || checkout) {
          throw new ConflictException('Only archived plans without membership, application or checkout history can be deleted');
        }
        await tx.membershipPlan.delete({ where: { id: planId } });
      } else {
        if (application) throw new ConflictException('Finish processing applications that use this plan before changing it');
        if (current.status !== 'ACTIVE') throw new ConflictException('This plan is already archived');
        if (input.action === 'EDIT' && !validMoney(input.price, current.currency)) throw new UnprocessableEntityException('Price must have at most two decimal places');
        plan = await tx.membershipPlan.update({ where: { id: planId }, data: {
          ...(input.action === 'EDIT' ? { name: input.name, description: input.description || null, price: input.price,
            durationDays: input.durationDays, includedPtCredits: input.includedPtCredits ?? current.includedPtCredits } : { status: 'INACTIVE' }),
          version: { increment: 1 },
        } });
      }
      const version = configuration.version + 1;
      await tx.gymConfiguration.update({ where: { id: 'current' }, data: { version } });
      const event = { EDIT: 'EDITED', ARCHIVE: 'ARCHIVED', DELETE: 'DELETED' }[input.action];
      const receiptId = randomUUID();
      await tx.commandReceipt.create({ data: { id: receiptId, actorIdentityId: access.identityId,
        commandKind: `${input.action}_MEMBERSHIP_PLAN`, idempotencyKey: randomUUID(), requestDigest: requestDigest({ planId, ...input }),
        state: 'COMMITTED', resourceType: 'MEMBERSHIP_PLAN', resourceId: planId, safeResult: { id: planId, version }, committedAt: new Date() } });
      await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId, actorIdentityId: access.identityId,
        eventCode: `MEMBERSHIP_PLAN_${event}`, resourceType: 'MEMBERSHIP_PLAN', resourceId: planId,
        transition: { from: current.status, to: plan?.status ?? 'DELETED', version: current.version + 1 } });
      return managedMembershipPlanSchema.parse({ id: planId, configurationVersion: version, plan: plan ? {
        id: plan.id, name: plan.name, description: plan.description, price: plan.price.toString(), currency: plan.currency,
        durationDays: plan.durationDays, includedPtCredits: plan.includedPtCredits, status: plan.status, version: plan.version, createdAt: plan.createdAt.toISOString(),
      } : null });
    }));
  }

  @Get('members/:memberId/membership-eligibility')
  async eligibility(@Req() request: GymRequest, @Param('memberId') memberId: string) {
    const access = this.access(request);
    if (access.role !== 'OWNER' && !(access.role === 'MEMBER' && access.actor?.id === memberId)) throw new ForbiddenException('Membership access denied');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const [member, config] = await Promise.all([
        tenant.member.findUnique({ where: { id: memberId }, select: { id: true, status: true, version: true } }),
        tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true } }),
      ]);
      if (!member || !config?.timezone) throw new NotFoundException('Membership not found');
      const today = gymLocalDate(config.timezone);
      const terms = await tenant.membershipTerm.findMany({ where: { memberId }, orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }], take: 100,
        select: { id: true, startDate: true, endDateExclusive: true, agreedPrice: true, currency: true, planNameSnapshot: true } });
      const derived = deriveMembershipEligibility({ memberId, memberStatus: member.status, version: member.version, asOfLocalDate: today,
        terms: terms.map(term => ({ id: term.id, startDate: dateOnly(term.startDate), endDateExclusive: dateOnly(term.endDateExclusive),
          agreedPrice: term.agreedPrice.toString(), currency: term.currency, planNameSnapshot: term.planNameSnapshot })) });
      return membershipEligibilitySchema.parse(derived);
    });
  }

  @Get('me/memberships')
  async memberMembershipOverview(@Req() request: GymRequest) {
    const access = this.access(request);
    if (access.role !== 'MEMBER' || access.actor?.kind !== 'MEMBER') {
      throw new ForbiddenException('Member access is required');
    }
    const memberId = access.actor.id;
    return this.tenantGate.withVerifiedTenant(access, tenant => tenant.$transaction(async tx => {
      const config = await tx.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, currency: true } });
      if (!config?.timezone) throw new NotFoundException('Membership overview is unavailable');
      const today = gymLocalDate(config.timezone);
      const date = asDate(today);
      const select = { id: true, planId: true, planNameSnapshot: true, startDate: true, endDateExclusive: true, agreedPrice: true,
        currency: true, includedPtCredits: true } as const;
      const [terms, latestExpired, balances, availablePlans] = await Promise.all([
        tx.membershipTerm.findMany({
          where: { memberId, endDateExclusive: { gt: date } },
          orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
          select,
        }),
        tx.membershipTerm.findFirst({
          where: { memberId, endDateExclusive: { lte: date } },
          orderBy: [{ endDateExclusive: 'desc' }, { id: 'asc' }],
          select,
        }),
        creditTotals(tx, [memberId], today, true),
        config.currency ? tx.membershipPlan.findMany({
          where: { status: 'ACTIVE', currency: config.currency },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          select: { id: true, name: true, price: true, currency: true, durationDays: true, includedPtCredits: true },
        }) : [],
      ]);
      const describeTerm = (term: (typeof terms)[number]) => ({
        id: term.id,
        planName: term.planNameSnapshot,
        startDate: dateOnly(term.startDate),
        endDateExclusive: dateOnly(term.endDateExclusive),
        agreedPrice: term.agreedPrice.toString(),
        currency: term.currency,
        includedPtCredits: term.includedPtCredits,
      });
      const upcoming = terms.filter(term => term.startDate > date);
      const firstUpcomingByPlan = new Map<string, string>();
      for (const term of upcoming) {
        if (!firstUpcomingByPlan.has(term.planId)) firstUpcomingByPlan.set(term.planId, dateOnly(term.startDate));
      }
      const balance = balances.get(memberId);
      return memberMembershipOverviewSchema.parse({
        asOfLocalDate: today,
        active: terms.filter(term => term.startDate <= date).map(term => ({
          ...describeTerm(term),
          renewalStartsOn: firstUpcomingByPlan.get(term.planId) ?? null,
        })),
        upcoming: upcoming.map(describeTerm),
        latestExpired: latestExpired ? describeTerm(latestExpired) : null,
        credits: { available: balance?.available ?? 0, held: balance?.held ?? 0 },
        availablePlans: availablePlans.map(plan => ({ ...plan, price: plan.price.toString() })),
      });
    }, { isolationLevel: 'RepeatableRead' }));
  }

  @Post('members/:memberId/memberships')
  async renew(@Req() request: GymRequest, @Param('memberId') memberId: string, @Body() body: unknown) {
    const access = this.owner(request); const parsed = renewMembershipSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid plan, member version, start policy and idempotency key');
    try {
      return await this.tenantGate.withVerifiedTenant(access, tenant => tenant.$transaction(async tx => {
        await this.assertCurrentOwner(access);
        await tx.$queryRaw`SELECT "id" FROM "GymConfiguration" WHERE "id" = 'current' FOR SHARE`;
        await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${memberId} FOR UPDATE`;
        const member = await tx.member.findUnique({ where: { id: memberId }, select: { id: true, status: true, version: true } });
        if (!member) throw new NotFoundException('Member not found');
        const { planId, expectedMemberVersion, expectedPlanVersion, startPolicy } = parsed.data;
        const intent = [planId, expectedMemberVersion, startPolicy];
        if (expectedPlanVersion !== undefined) intent.push(expectedPlanVersion);
        const digest = createHash('sha256').update(JSON.stringify(intent)).digest('hex');
        const replay = await tx.membershipTerm.findUnique({ where: { actorIdentityId_idempotencyKey: { actorIdentityId: access.identityId, idempotencyKey: parsed.data.idempotencyKey } } });
        if (replay) {
          if (replay.memberId !== memberId || replay.requestDigest !== digest) throw new ConflictException('Idempotency key was already used for a different renewal');
          return renewalResultSchema.parse({ termId: replay.id, memberId, startDate: dateOnly(replay.startDate), endDateExclusive: dateOnly(replay.endDateExclusive),
            agreedPrice: replay.agreedPrice.toString(), currency: replay.currency, planName: replay.planNameSnapshot, memberVersion: member.version, replayed: true });
        }
        if (member.version !== parsed.data.expectedMemberVersion) throw new ConflictException('Member changed; reload before renewing');
        if (member.status !== 'ACTIVE') throw new ConflictException('Only active members can renew a membership');
        await tx.$queryRaw`SELECT "id" FROM "MembershipPlan" WHERE "id" = ${parsed.data.planId} FOR SHARE`;
        const [plan, config, latestTerm] = await Promise.all([
          tx.membershipPlan.findUnique({ where: { id: parsed.data.planId } }),
          tx.gymConfiguration.findUnique({ where: { id: 'current' } }),
          tx.membershipTerm.findFirst({
            where: { memberId, planId: parsed.data.planId },
            orderBy: { endDateExclusive: 'desc' },
            select: { endDateExclusive: true },
          }),
        ]);
        if (!plan || plan.status !== 'ACTIVE') throw new NotFoundException('Membership plan not found');
        if (expectedPlanVersion !== undefined && plan.version !== expectedPlanVersion) throw new ConflictException('Plan terms changed; reload before renewing');
        if (!config?.currency || !config.timezone || plan.currency !== config.currency) throw new ConflictException('Plan configuration is unavailable');
        const today = gymLocalDate(config.timezone);
        const latestEnd = latestTerm ? dateOnly(latestTerm.endDateExclusive) : null;
        if (parsed.data.startPolicy === 'IMMEDIATE' && latestEnd && latestEnd > today) {
          throw new ConflictException('This plan already has an active or future term');
        }
        const start = parsed.data.startPolicy === 'NEXT_AVAILABLE' && latestEnd && latestEnd > today ? latestEnd : today;
        const end = addLocalDays(start, plan.durationDays);
        const term = await tx.membershipTerm.create({ data: { memberId, planId: plan.id, startDate: asDate(start), endDateExclusive: asDate(end),
          agreedPrice: plan.price, currency: plan.currency, planNameSnapshot: plan.name, configurationVersion: config.version,
          includedPtCredits: plan.includedPtCredits,
          actorIdentityId: access.identityId, idempotencyKey: parsed.data.idempotencyKey, requestDigest: digest } });
        const changed = await tx.member.updateMany({ where: { id: memberId, version: parsed.data.expectedMemberVersion }, data: { version: { increment: 1 } } });
        if (changed.count !== 1) throw new ConflictException('Member changed during renewal');
        const receiptId = randomUUID(); const nextVersion = parsed.data.expectedMemberVersion + 1;
        await tx.commandReceipt.create({ data: { id: receiptId, actorIdentityId: access.identityId,
          commandKind: 'RENEW_MEMBERSHIP', idempotencyKey: parsed.data.idempotencyKey, requestDigest: `d1:${digest}`,
          state: 'COMMITTED', resourceType: 'MEMBERSHIP_TERM', resourceId: term.id, safeResult: { termId: term.id, start, end }, committedAt: new Date() } });
        await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId, actorIdentityId: access.identityId,
          eventCode: 'MEMBERSHIP_RENEWED', resourceType: 'MEMBERSHIP_TERM', resourceId: term.id,
          transition: { version: nextVersion } });
        const allowanceAudit = await issueMembershipPtAllowance(tx, term, receiptId);
        if (allowanceAudit) await appendTenantAudit(tx, { ...allowanceAudit, masterGymId: access.gymId, receiptId });
        return renewalResultSchema.parse({ termId: term.id, memberId, startDate: start, endDateExclusive: end,
          agreedPrice: plan.price.toString(), currency: plan.currency, planName: plan.name, memberVersion: nextVersion, replayed: false });
      }));
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && (error.code === 'P2002' || error.code === 'P2034'
        || (error.code === 'P2010' && 'meta' in error && error.meta && typeof error.meta === 'object'
          && 'code' in error.meta && error.meta.code === '40001'))) {
        throw new ConflictException('A concurrent membership renewal changed this member; reload and retry');
      }
      throw error;
    }
  }
}
