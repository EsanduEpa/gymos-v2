import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { DatabaseService } from './database.service.js';
import { Prisma } from './generated/tenant/client.js';
import type { Prisma as MasterPrisma } from './generated/master/client.js';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { appendMasterVersionAudit } from './operations/transaction-audit.js';
import { updateGymPublicProfileSchema, updateGymThemeSchema } from '@gymos/contracts';

const createMemberInput = z.strictObject({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()).optional(),
});


@Controller('gyms')
export class GymsController {
  constructor(
    private readonly database: DatabaseService,
    private readonly tenantGate: TenantSchemaGateService,
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
  members(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access) {
      throw new InternalServerErrorException('Gym context missing');
    }

    // This surface is the owner's BASIC contact/history projection. Trainers
    // receive only relationship-scoped client endpoints when those exist.
    if (access.role !== 'OWNER') {
      throw new ForbiddenException('Member list access denied');
    }

    return this.tenantGate.withVerifiedTenant(access, (tenant) =>
      tenant.member.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }));
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
}
