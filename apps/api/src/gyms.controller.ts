import { creditUnits } from './sessions/credit-unit-projection.js';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { DatabaseService } from './database.service.js';
import { Prisma } from './generated/tenant/client.js';
import type { Prisma as MasterPrisma } from './generated/master/client.js';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { appendMasterVersionAudit } from './operations/transaction-audit.js';
import { memberDetailSchema, memberEnrollmentConsentInputSchema, memberEnrollmentConsentResultSchema, memberHistoryQuerySchema, memberListQuerySchema, memberListSchema,
  memberRegistrationInputSchema, updateGymPublicProfileSchema, updateGymThemeSchema } from '@gymos/contracts';
import { gymLocalDate } from './membership-rules.js';
import { MemberEnrollmentService } from './member-enrollment.service.js';
import { TrainerEnrollmentService } from './trainer-enrollment.service.js';
import { identityFromAuthorization } from './auth-token.js';
import { trainerRegistrationInputSchema } from '@gymos/contracts';

const createMemberInput = z.strictObject({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()).optional(),
});


@Controller('gyms')
export class GymsController {
  constructor(
    private readonly database: DatabaseService,
    private readonly tenantGate: TenantSchemaGateService,
    @Optional() private readonly memberEnrollment?: MemberEnrollmentService,
    @Optional() private readonly trainerEnrollment?: TrainerEnrollmentService,
  ) {}

  private async assertCurrentOwnerAccess(access: NonNullable<GymRequest['gymAccess']>, source: MasterPrisma.TransactionClient = this.database.master): Promise<void> {
    let user;
    let gymAccess;
    let gym;
    let now: Date;
    try {
      [user, gymAccess, gym] = await Promise.all([
        source.user.findUnique({ where: { id: access.identityId },
          select: { authVersion: true, mustChangePassword: true, credentialExpiresAt: true } }),
        source.gymAccess.findUnique({ where: { userId_gymId: { userId: access.identityId, gymId: access.gymId } },
          select: { role: true, linkStatus: true, version: true } }),
        source.gym.findUnique({ where: { id: access.gymId }, select: { status: true } }),
      ]);
      const [clock] = await source.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
      now = clock.now;
    } catch {
      throw new ServiceUnavailableException('Gym authorization is temporarily unavailable');
    }
    if (!user || user.authVersion !== access.identityVersion || user.mustChangePassword
      || (user.credentialExpiresAt !== null && user.credentialExpiresAt <= now)
      || gymAccess?.role !== 'OWNER' || gymAccess.linkStatus !== 'ACTIVE' || gymAccess.version !== access.accessVersion
      || gym?.status !== 'ACTIVE') {
      throw new ForbiddenException('Gym access changed; retry with current access');
    }
  }

  @Get(':slug/theme')
  async theme(@Param('slug') slug: string) {
    const gym = await this.database.master.gym.findUnique({
      where: { slug },
      include: { theme: true },
    });
    if (!gym || gym.status !== 'ACTIVE') {
      throw new NotFoundException('Gym not found');
    }

    const candidateLogo = gym.theme?.logoUrl;
    let safeLogo: string | null = null;
    try {
      const parsedLogo = candidateLogo ? new URL(candidateLogo) : null;
      if (parsedLogo?.protocol === 'https:' && candidateLogo!.length <= 2048) safeLogo = parsedLogo.toString();
    } catch { /* A broken stored logo uses the fixed-size monogram. */ }

    return {
      slug: gym.slug,
      name: gym.name,
      theme: {
        primaryColor: gym.theme?.primaryColor && /^#[0-9a-fA-F]{6}$/.test(gym.theme.primaryColor) ? gym.theme.primaryColor : '#007A35',
        logoUrl: safeLogo,
      },
    };
  }

  @Patch(':slug/theme')
  @UseGuards(GymAccessGuard)
  async updateTheme(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access) {
      throw new InternalServerErrorException('Gym context missing');
    }
    if (access.role !== 'OWNER') {
      throw new ForbiddenException('Only gym owners can update themes');
    }

    const parsed = updateGymThemeSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnprocessableEntityException('Enter a valid theme color, HTTPS logo URL and current version');
    }

    const theme = await this.database.master.$transaction(async tx => {
      // Serialize this Master-local mutation with the lifecycle status change.
      await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${access.gymId} FOR SHARE`;
      await this.assertCurrentOwnerAccess(access, tx);
      const { expectedVersion, ...input } = parsed.data;
      const changes = { ...input, ...(input.logoUrl === '' ? { logoUrl: null } : {}) };
      const updated = await tx.theme.updateMany({
        where: { gymId: access.gymId, version: expectedVersion },
        data: { ...changes, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException('Theme changed; reload and try again');
      await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId,
        eventCode: 'GYM_THEME_UPDATED', resourceType: 'THEME', resourceId: access.gymId,
        committedVersion: expectedVersion + 1, transition: { version: expectedVersion + 1 } });
      return tx.theme.findUniqueOrThrow({ where: { gymId: access.gymId }, select: { primaryColor: true, logoUrl: true, version: true } });
    });

    return { slug: access.slug, theme };
  }

  @Get(':slug/theme/settings')
  @UseGuards(GymAccessGuard)
  async themeSettings(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access) throw new InternalServerErrorException('Gym context missing');
    if (access.role !== 'OWNER') throw new ForbiddenException('Theme settings are owner-only');
    await this.assertCurrentOwnerAccess(access);
    const theme = await this.database.master.theme.findUnique({
      where: { gymId: access.gymId }, select: { primaryColor: true, logoUrl: true, version: true },
    });
    if (!theme) throw new NotFoundException('Gym theme not found');
    return { slug: access.slug, theme: { ...theme,
      primaryColor: /^#[0-9a-fA-F]{6}$/.test(theme.primaryColor) ? theme.primaryColor : '#007A35',
      logoUrl: theme.logoUrl && theme.logoUrl.length <= 2048 && /^https:\/\//i.test(theme.logoUrl) ? theme.logoUrl : null,
    } };
  }

  @Get(':slug/public-profile')
  @UseGuards(GymAccessGuard)
  async publicProfile(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access) throw new InternalServerErrorException('Gym context missing');
    if (access.role !== 'OWNER') throw new ForbiddenException('Gym profile is owner-only');
    const gym = await this.database.master.gym.findUnique({ where: { id: access.gymId }, select: { name: true, publicProfileVersion: true } });
    if (!gym) throw new NotFoundException('Gym not found');
    return { name: gym.name, version: gym.publicProfileVersion };
  }

  @Patch(':slug/public-profile')
  @UseGuards(GymAccessGuard)
  async updatePublicProfile(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access) throw new InternalServerErrorException('Gym context missing');
    if (access.role !== 'OWNER') throw new ForbiddenException('Gym profile is owner-only');
    const parsed = updateGymPublicProfileSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid gym name and current version');
    return this.database.master.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${access.gymId} FOR SHARE`;
      await this.assertCurrentOwnerAccess(access, tx);
      const changed = await tx.gym.updateMany({ where: { id: access.gymId, publicProfileVersion: parsed.data.expectedVersion },
        data: { name: parsed.data.name, publicProfileVersion: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictException('Gym name changed; reload and try again');
      const version = parsed.data.expectedVersion + 1;
      await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId,
        eventCode: 'GYM_PUBLIC_PROFILE_UPDATED', resourceType: 'GYM_PROFILE', resourceId: access.gymId,
        committedVersion: version, transition: { version } });
      return { name: parsed.data.name, version };
    });
  }

  @Get(':slug/access')
  @UseGuards(GymAccessGuard)
  access(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access) {
      throw new InternalServerErrorException('Gym context missing');
    }

    return { gymId: access.gymId, slug: access.slug, role: access.role };
  }

  @Get(':slug/members')
  @UseGuards(GymAccessGuard)
  async members(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access) {
      throw new InternalServerErrorException('Gym context missing');
    }

    // This surface is the owner's BASIC contact/history projection. Trainers
    // receive only relationship-scoped client endpoints when those exist.
    if (access.role !== 'OWNER') {
      throw new ForbiddenException('Member list access denied');
    }

    const parsed = memberListQuerySchema.safeParse(query);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid member search and page');
    await this.assertCurrentOwnerAccess(access);
    const [published, activeLinks, pendingEnrollments] = await Promise.all([
      this.database.master.operation.findMany({ where: { gymId: access.gymId, kind: 'REGISTER_MEMBER', state: 'COMPLETE', tenantCommandReceiptId: { not: null } },
        select: { id: true, tenantActorId: true, subjectIdentityId: true } }),
      this.database.master.gymAccess.findMany({ where: { gymId: access.gymId, role: 'MEMBER', actorKind: 'MEMBER', linkStatus: 'ACTIVE' },
        select: { userId: true, tenantActorId: true, enrollmentOperationId: true } }),
      this.database.master.operation.count({ where: { gymId: access.gymId, kind: 'REGISTER_MEMBER', state: { notIn: ['COMPLETE', 'FAILED_FINAL'] } } }),
    ]);
    const publishedTuples = published.filter(row => row.tenantActorId && row.subjectIdentityId).map(row => ({
      id: row.tenantActorId!, identityId: row.subjectIdentityId!, enrollmentOperationId: row.id, registrationState: 'COMPLETE' as const,
    }));
    const activeActorIds = new Set(activeLinks.filter(link => published.some(operation => operation.id === link.enrollmentOperationId
      && operation.tenantActorId === link.tenantActorId && operation.subjectIdentityId === link.userId)).map(link => link.tenantActorId!));
    return this.tenantGate.withVerifiedTenant(access, tenant => tenant.$transaction(async tx => {
      const configuration = await tx.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true } });
      if (!configuration?.timezone) throw new ServiceUnavailableException('Gym timezone is unavailable');
      const asOf = new Date();
      const localDay = new Date(`${gymLocalDate(configuration.timezone, asOf)}T00:00:00.000Z`);
      const where: Prisma.MemberWhereInput = { AND: [
        { OR: [{ registrationState: 'BASIC' }, ...publishedTuples] },
        ...(parsed.data.status ? [{ status: parsed.data.status }] : []),
        ...(parsed.data.q ? [{ OR: ['fullName', 'email', 'phone'].map(field => ({ [field]: { contains: parsed.data.q, mode: 'insensitive' } })) }] : []),
      ] };
      const totalCount = await tx.member.count({ where });
      const totalPages = Math.ceil(totalCount / parsed.data.pageSize);
      const page = Math.min(parsed.data.page, Math.max(totalPages, 1));
      const [items, basic, operational, statuses] = await Promise.all([
        tx.member.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * parsed.data.pageSize, take: parsed.data.pageSize,
          select: { id: true, fullName: true, email: true, status: true, registrationState: true, createdAt: true,
            memberships: { where: { startDate: { lte: localDay }, endDateExclusive: { gt: localDay } }, orderBy: [{ startDate: 'desc' }, { id: 'desc' }], take: 1,
              select: { id: true, startDate: true, endDateExclusive: true, agreedPrice: true, currency: true, planNameSnapshot: true } } } }),
        tx.member.count({ where: { AND: [where, { registrationState: 'BASIC' }] } }),
        tx.member.count({ where: { AND: [where, { registrationState: 'COMPLETE', status: 'ACTIVE', id: { in: [...activeActorIds] } }] } }),
        tx.member.groupBy({ by: ['status'], where, _count: { _all: true } }),
      ]);
      return memberListSchema.parse({ items: items.map(member => ({
        id: member.id, fullName: member.fullName, email: member.email, status: member.status, registrationState: member.registrationState,
        accountState: member.registrationState === 'BASIC' ? 'BASIC' : member.status === 'ACTIVE' && activeActorIds.has(member.id) ? 'OPERATIONAL' : 'HISTORICAL',
        createdAt: member.createdAt.toISOString(), currentTerm: member.memberships[0] ? {
          id: member.memberships[0].id, planName: member.memberships[0].planNameSnapshot,
          startDate: member.memberships[0].startDate.toISOString().slice(0, 10), endDateExclusive: member.memberships[0].endDateExclusive.toISOString().slice(0, 10),
          agreedPrice: member.memberships[0].agreedPrice.toString(), currency: member.memberships[0].currency,
        } : null,
      })), page, pageSize: parsed.data.pageSize, totalCount, totalPages, asOf: asOf.toISOString(),
        summary: { basic, operational, historical: totalCount - basic - operational, pendingEnrollments,
          statuses: Object.fromEntries(['ACTIVE', 'INACTIVE', 'SUSPENDED'].map(status => [status, statuses.find(row => row.status === status)?._count._all ?? 0])) },
      });
    }, { isolationLevel: 'RepeatableRead' }));
  }

  @Get(':slug/members/:memberId')
  @UseGuards(GymAccessGuard)
  async memberDetail(@Req() request: GymRequest, @Param('memberId') memberId: string, @Query() query: unknown = {}) {
    const access = request.gymAccess;
    if (!access) throw new InternalServerErrorException('Gym context missing');
    if (access.role !== 'OWNER') throw new ForbiddenException('Member profile access denied');
    await this.assertCurrentOwnerAccess(access);
    const parsedPage = memberHistoryQuerySchema.safeParse(query ?? {});
    if (!parsedPage.success) throw new UnprocessableEntityException('Enter a valid membership history page');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const member = await tenant.member.findFirst({ where: { id: memberId, registrationState: { in: ['BASIC', 'COMPLETE'] } },
        select: { id: true, identityId: true, createdAt: true, enrollmentOperationId: true, fullName: true, email: true, phone: true, dateOfBirth: true, emergencyContact: true,
          healthNotes: true, status: true, registrationState: true, version: true,
          sessionPacks: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100,
            include: { creditMovements: { select: { availableDelta: true, heldDelta: true, consumedDelta: true, expiredDelta: true } } } } },
      });
      if (!member) throw new NotFoundException('Member not found');
      if (member.registrationState === 'COMPLETE') {
        const published = await this.database.master.operation.findFirst({ where: { id: member.enrollmentOperationId ?? '',
          gymId: access.gymId, kind: 'REGISTER_MEMBER', state: 'COMPLETE', tenantActorId: member.id, subjectIdentityId: member.identityId, tenantCommandReceiptId: { not: null } }, select: { id: true } });
        if (!published) throw new NotFoundException('Member not found');
      }
      const activeLink = member.identityId ? await this.database.master.gymAccess.findFirst({ where: { gymId: access.gymId, userId: member.identityId, role: 'MEMBER', actorKind: 'MEMBER', linkStatus: 'ACTIVE', tenantActorId: member.id, enrollmentOperationId: member.enrollmentOperationId }, select: { userId: true } }) : null;
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, currency: true } });
      if (!config?.timezone) throw new ServiceUnavailableException('Gym timezone is unavailable');
      const asOf = new Date();
      const membershipTotalCount = await tenant.membershipTerm.count({ where: { memberId } });
      const membershipTotalPages = Math.ceil(membershipTotalCount / parsedPage.data.pageSize);
      const membershipPage = Math.min(parsedPage.data.page, Math.max(1, membershipTotalPages));
      const memberships = await tenant.membershipTerm.findMany({ where: { memberId },
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }], skip: (membershipPage - 1) * parsedPage.data.pageSize,
        take: parsedPage.data.pageSize,
        select: { id: true, planNameSnapshot: true, startDate: true, endDateExclusive: true, agreedPrice: true, currency: true } });
      const units = await creditUnits(tenant, member.id);
      return memberDetailSchema.parse({
        accountState: member.registrationState === 'BASIC' ? 'BASIC' : activeLink && member.status === 'ACTIVE' ? 'OPERATIONAL' : 'HISTORICAL',
        gymCurrency: config.currency,
        joinedAt: member.createdAt.toISOString(),
        id: member.id, fullName: member.fullName, email: member.email, phone: member.phone,
        dateOfBirth: member.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        emergencyContact: member.emergencyContact, healthNotes: member.healthNotes,
        status: member.status, registrationState: member.registrationState, version: member.version,
        memberships: memberships.map(term => ({ id: term.id, planName: term.planNameSnapshot,
          startDate: term.startDate.toISOString().slice(0, 10), endDateExclusive: term.endDateExclusive.toISOString().slice(0, 10),
          agreedPrice: term.agreedPrice.toString(), currency: term.currency })),
        membershipPage, membershipPageSize: parsedPage.data.pageSize, membershipTotalCount, membershipTotalPages,
        sessionPacks: member.sessionPacks.map(pack => {
          const unitRows = units.filter(unit => unit.packId === pack.id);
          const today = gymLocalDate(config.timezone!, asOf);
          const balance = unitRows.reduce((total, unit) => ({ available: total.available + (unit.effectiveEndDateExclusive.toISOString().slice(0,10) > today ? unit.available : 0),
            held: total.held + unit.held, consumed: total.consumed + unit.consumed,
            expired: total.expired + unit.expired + (unit.effectiveEndDateExclusive.toISOString().slice(0,10) <= today ? unit.available : 0) }), { available: 0, held: 0, consumed: 0, expired: 0 });
          const status = balance.available + balance.held > 0 ? 'ACTIVE' : balance.expired > 0 ? 'EXPIRED' : 'DEPLETED';
          return { id: pack.id, issuedCredits: pack.issuedCredits, availableCredits: balance.available,
            expiryAdjustments: unitRows.filter(unit => unit.effectiveEndDateExclusive > unit.endDateExclusive).map(unit => ({ creditOrdinal: unit.creditOrdinal, endDateExclusive: unit.effectiveEndDateExclusive.toISOString().slice(0,10), state: unit.held ? 'HELD' : unit.consumed ? 'CONSUMED' : unit.expired || unit.effectiveEndDateExclusive.toISOString().slice(0,10) <= today ? 'EXPIRED' : 'UNHELD' })),
            heldCredits: balance.held, consumedCredits: balance.consumed, expiredCredits: balance.expired,
            validityDays: pack.validityDays, price: pack.price.toString(), currency: pack.currency,
            startDate: pack.startDate.toISOString().slice(0, 10), endDateExclusive: pack.endDateExclusive.toISOString().slice(0, 10), status };
        }), recentSessions: [], asOf: asOf.toISOString(),
      });
    });
  }

  @Post(':slug/members')
  @UseGuards(GymAccessGuard)
  async createMember(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access) {
      throw new InternalServerErrorException('Gym context missing');
    }
    if (access.role !== 'OWNER') {
      throw new ForbiddenException('Only gym owners can create members');
    }

    const parsed = createMemberInput.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Enter a valid member name and email');
    }

    try {
      return await this.tenantGate.withVerifiedTenant(access, (tenant) =>
        tenant.$transaction(async (tx) => {
          await this.assertCurrentOwnerAccess(access);
          return tx.member.create({
            data: parsed.data,
            select: {
              id: true,
              fullName: true,
              email: true,
              status: true,
              createdAt: true,
            },
          });
        }));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Member email already exists in this gym');
      }
      throw error;
    }
  }

  @Post(':slug/member-registrations')
  @UseGuards(GymAccessGuard)
  async registerMember(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access) throw new InternalServerErrorException('Gym context missing');
    if (access.role !== 'OWNER') throw new ForbiddenException('Only gym owners can register members');
    const parsed = memberRegistrationInputSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid member details and a membership plan');
    if (!this.memberEnrollment) throw new InternalServerErrorException('Member enrollment is unavailable');
    return this.memberEnrollment.enroll(access, parsed.data);
  }

  @Post(':slug/trainer-registrations')
  @UseGuards(GymAccessGuard)
  async registerTrainer(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access) throw new InternalServerErrorException('Gym context missing');
    if (access.role !== 'OWNER') throw new ForbiddenException('Only gym owners can register trainers');
    const parsed = trainerRegistrationInputSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter valid trainer details');
    if (!this.trainerEnrollment) throw new InternalServerErrorException('Trainer enrollment is unavailable');
    return this.trainerEnrollment.enroll(access, parsed.data);
  }

  @Post(':slug/member-enrollments/:operationId/consent')
  async memberEnrollmentConsent(@Req() request: Request, @Param('slug') slug: string,
    @Param('operationId') operationId: string, @Body() body: unknown) {
    if (!this.memberEnrollment) throw new InternalServerErrorException('Member enrollment is unavailable');
    const identity = await identityFromAuthorization(request.headers.authorization);
    const parsed = memberEnrollmentConsentInputSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid consent decision and current password');
    const result = await this.memberEnrollment.consent(slug, operationId, {
      identityId: identity.userId, authVersion: identity.authVersion, ...parsed.data,
    });
    return memberEnrollmentConsentResultSchema.parse(result);
  }

  @Post(':slug/trainer-enrollments/:operationId/consent')
  async trainerEnrollmentConsent(@Req() request: Request, @Param('slug') slug: string,
    @Param('operationId') operationId: string, @Body() body: unknown) {
    if (!this.trainerEnrollment) throw new InternalServerErrorException('Trainer enrollment is unavailable');
    const identity = await identityFromAuthorization(request.headers.authorization);
    const parsed = memberEnrollmentConsentInputSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid consent decision and current password');
    const result = await this.trainerEnrollment.consent(slug, operationId, {
      identityId: identity.userId, authVersion: identity.authVersion, ...parsed.data,
    });
    return memberEnrollmentConsentResultSchema.parse(result);
  }
}
