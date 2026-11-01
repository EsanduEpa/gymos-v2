import { createHash, randomUUID } from 'node:crypto';
import {
  Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param,
  Post, Req, UnprocessableEntityException, UseGuards,
} from '@nestjs/common';
import { appendTenantAudit } from './operations/transaction-audit.js';
import { requestDigest } from './operations/primitives.js';
import { configurationReadSchema, createMembershipPlanSchema, membershipEligibilitySchema, renewalResultSchema, renewMembershipSchema, updateConfigurationSchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { DatabaseService } from './database.service.js';
import { addLocalDays, asDate, dateString, deriveMembershipEligibility, gymLocalDate } from './membership-rules.js';

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
          select: { id: true, name: true, description: true, price: true, currency: true, durationDays: true, status: true, version: true, createdAt: true } }),
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
    if (!parsed.success) throw new UnprocessableEntityException('Enter a plan name, exact price and duration from 1 to 3650 days');
    return this.tenantGate.withVerifiedTenant(access, tenant => tenant.$transaction(async tx => {
      await this.assertCurrentOwner(access);
      await tx.$queryRaw`SELECT "id" FROM "GymConfiguration" WHERE "id" = 'current' FOR UPDATE`;
      const current = await tx.gymConfiguration.findUnique({ where: { id: 'current' } });
      if (!current?.currency) throw new ConflictException('Gym currency is not configured');
      if (current.version !== parsed.data.expectedVersion) throw new ConflictException('Configuration changed; reload before adding a plan');
      if (!validMoney(parsed.data.price, current.currency)) throw new UnprocessableEntityException('Price precision must match the gym currency');
      const version = current.version + 1;
      const plan = await tx.membershipPlan.create({ data: { name: parsed.data.name, description: parsed.data.description || null,
        price: parsed.data.price, currency: current.currency, durationDays: parsed.data.durationDays },
        select: { id: true, name: true, description: true, price: true, currency: true, durationDays: true, status: true, version: true, createdAt: true } });
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

  @Post('members/:memberId/memberships')
  async renew(@Req() request: GymRequest, @Param('memberId') memberId: string, @Body() body: unknown) {
    const access = this.owner(request); const parsed = renewMembershipSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid plan, member version, start policy and idempotency key');
    try {
      return await this.tenantGate.withVerifiedTenant(access, tenant => tenant.$transaction(async tx => {
        await this.assertCurrentOwner(access);
        await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${memberId} FOR UPDATE`;
        const member = await tx.member.findUnique({ where: { id: memberId }, select: { id: true, status: true, version: true } });
        if (!member) throw new NotFoundException('Member not found');
        const digest = createHash('sha256').update(JSON.stringify([parsed.data.planId, parsed.data.expectedMemberVersion, parsed.data.startPolicy])).digest('hex');
        const replay = await tx.membershipTerm.findUnique({ where: { actorIdentityId_idempotencyKey: { actorIdentityId: access.identityId, idempotencyKey: parsed.data.idempotencyKey } } });
        if (replay) {
          if (replay.memberId !== memberId || replay.requestDigest !== digest) throw new ConflictException('Idempotency key was already used for a different renewal');
          return renewalResultSchema.parse({ termId: replay.id, memberId, startDate: dateOnly(replay.startDate), endDateExclusive: dateOnly(replay.endDateExclusive),
            agreedPrice: replay.agreedPrice.toString(), currency: replay.currency, planName: replay.planNameSnapshot, memberVersion: member.version, replayed: true });
        }
        if (member.version !== parsed.data.expectedMemberVersion) throw new ConflictException('Member changed; reload before renewing');
        if (member.status !== 'ACTIVE') throw new ConflictException('Only active members can renew a membership');
        const [plan, config, terms] = await Promise.all([
          tx.membershipPlan.findUnique({ where: { id: parsed.data.planId } }),
          tx.gymConfiguration.findUnique({ where: { id: 'current' } }),
          tx.membershipTerm.findMany({ where: { memberId }, orderBy: { endDateExclusive: 'desc' } }),
        ]);
        if (!plan || plan.status !== 'ACTIVE') throw new NotFoundException('Membership plan not found');
        if (!config?.currency || !config.timezone || plan.currency !== config.currency) throw new ConflictException('Plan configuration is unavailable');
        const today = gymLocalDate(config.timezone);
        const latestEnd = terms.reduce<string | null>((latest, term) => {
          const date = dateOnly(term.endDateExclusive); return !latest || date > latest ? date : latest;
        }, null);
        if (parsed.data.startPolicy === 'IMMEDIATE' && latestEnd && latestEnd > today) throw new ConflictException('An active or future term prevents immediate renewal');
        const start = parsed.data.startPolicy === 'NEXT_AVAILABLE' && latestEnd && latestEnd > today ? latestEnd : today;
        const end = addLocalDays(start, plan.durationDays);
        const term = await tx.membershipTerm.create({ data: { memberId, planId: plan.id, startDate: asDate(start), endDateExclusive: asDate(end),
          agreedPrice: plan.price, currency: plan.currency, planNameSnapshot: plan.name, configurationVersion: config.version,
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
