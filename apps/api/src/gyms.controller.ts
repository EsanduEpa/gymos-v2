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
import { memberEnrollmentConsentInputSchema, memberEnrollmentConsentResultSchema, memberListQuerySchema, memberListSchema,
  memberRegistrationInputSchema, updateGymPublicProfileSchema, updateGymThemeSchema } from '@gymos/contracts';
import { gymLocalDate } from './membership-rules.js';
import { MemberEnrollmentService } from './member-enrollment.service.js';
import { identityFromAuthorization } from './auth-token.js';

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
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true } });
      if (!configuration?.timezone) throw new ServiceUnavailableException('Gym timezone is unavailable');
      const asOf = new Date();
      const asOfLocalDate = gymLocalDate(configuration.timezone, asOf);
      const publishedOperations = await this.database.master.operation.findMany({ where: { gymId: access.gymId, kind: 'REGISTER_MEMBER', state: 'COMPLETE' }, select: { id: true } });
      const where: Prisma.MemberWhereInput = {
        AND: [
          { OR: [{ registrationState: 'BASIC' }, { registrationState: 'COMPLETE', enrollmentOperationId: { in: publishedOperations.map(row => row.id) } }] },
          ...(parsed.data.status ? [{ status: parsed.data.status }] : []),
          ...(parsed.data.q ? [{ OR: [
          { fullName: { contains: parsed.data.q, mode: 'insensitive' as const } },
          { email: { contains: parsed.data.q, mode: 'insensitive' as const } },
          ] }] : []),
        ],
      };
      const [totalCount, rows] = await Promise.all([
        tenant.member.count({ where }),
        tenant.member.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (parsed.data.page - 1) * parsed.data.pageSize, take: parsed.data.pageSize,
          select: { id: true, fullName: true, email: true, status: true, registrationState: true, createdAt: true,
            memberships: { where: { startDate: { lte: new Date(`${asOfLocalDate}T00:00:00.000Z`) }, endDateExclusive: { gt: new Date(`${asOfLocalDate}T00:00:00.000Z`) } },
              orderBy: [{ startDate: 'desc' }, { id: 'desc' }], take: 1,
              select: { id: true, startDate: true, endDateExclusive: true, agreedPrice: true, currency: true, planNameSnapshot: true } } },
        }),
      ]);
      const totalPages = Math.ceil(totalCount / parsed.data.pageSize);
      const page = Math.min(parsed.data.page, Math.max(totalPages, 1));
      const items = page === parsed.data.page ? rows : await tenant.member.findMany({ where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * parsed.data.pageSize, take: parsed.data.pageSize,
        select: { id: true, fullName: true, email: true, status: true, registrationState: true, createdAt: true,
          memberships: { where: { startDate: { lte: new Date(`${asOfLocalDate}T00:00:00.000Z`) }, endDateExclusive: { gt: new Date(`${asOfLocalDate}T00:00:00.000Z`) } },
            orderBy: [{ startDate: 'desc' }, { id: 'desc' }], take: 1,
            select: { id: true, startDate: true, endDateExclusive: true, agreedPrice: true, currency: true, planNameSnapshot: true } } },
      });
      return memberListSchema.parse({ items: items.map(member => ({
        id: member.id, fullName: member.fullName, email: member.email, status: member.status,
        registrationState: member.registrationState, createdAt: member.createdAt.toISOString(),
        currentTerm: member.memberships[0] ? { id: member.memberships[0].id,
          planName: member.memberships[0].planNameSnapshot, startDate: member.memberships[0].startDate.toISOString().slice(0, 10),
          endDateExclusive: member.memberships[0].endDateExclusive.toISOString().slice(0, 10),
          agreedPrice: member.memberships[0].agreedPrice.toString(), currency: member.memberships[0].currency as 'LKR' | 'USD' } : null,
      })), page, pageSize: parsed.data.pageSize, totalCount, totalPages, asOf: asOf.toISOString() });
    });
  }

  @Get(':slug/members/:memberId')
  @UseGuards(GymAccessGuard)
  async memberDetail(@Req() request: GymRequest, @Param('memberId') memberId: string) {
    const access = request.gymAccess;
    if (!access) throw new InternalServerErrorException('Gym context missing');
    if (access.role !== 'OWNER') throw new ForbiddenException('Member profile access denied');
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const member = await tenant.member.findFirst({ where: { id: memberId, registrationState: { in: ['BASIC', 'COMPLETE'] } },
        select: { id: true, enrollmentOperationId: true, fullName: true, email: true, phone: true, dateOfBirth: true, emergencyContact: true,
          healthNotes: true, status: true, registrationState: true, version: true,
          memberships: { orderBy: [{ startDate: 'desc' }, { id: 'desc' }], take: 100,
            select: { id: true, planNameSnapshot: true, startDate: true, endDateExclusive: true, agreedPrice: true, currency: true } },
          sessionPacks: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 0,
            select: { id: true } } },
      });
      if (!member) throw new NotFoundException('Member not found');
      if (member.registrationState === 'COMPLETE') {
        const published = await this.database.master.operation.findFirst({ where: { id: member.enrollmentOperationId ?? '',
          gymId: access.gymId, kind: 'REGISTER_MEMBER', state: 'COMPLETE', tenantActorId: member.id }, select: { id: true } });
        if (!published) throw new NotFoundException('Member not found');
      }
      const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true } });
      if (!config?.timezone) throw new ServiceUnavailableException('Gym timezone is unavailable');
      const asOf = new Date();
      return {
        id: member.id, fullName: member.fullName, email: member.email, phone: member.phone,
        dateOfBirth: member.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        emergencyContact: member.emergencyContact, healthNotes: member.healthNotes,
        status: member.status, registrationState: member.registrationState, version: member.version,
        memberships: member.memberships.map(term => ({ id: term.id, planName: term.planNameSnapshot,
          startDate: term.startDate.toISOString().slice(0, 10), endDateExclusive: term.endDateExclusive.toISOString().slice(0, 10),
          agreedPrice: term.agreedPrice.toString(), currency: term.currency })),
        sessionPacks: [], recentSessions: [], asOf: asOf.toISOString(),
      };
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
}
