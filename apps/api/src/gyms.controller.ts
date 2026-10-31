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
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { DatabaseService } from './database.service.js';
import { Prisma } from './generated/tenant/client.js';
import type { Prisma as MasterPrisma } from './generated/master/client.js';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';

const createMemberInput = z.strictObject({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()).optional(),
});

const updateThemeInput = z
  .strictObject({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    logoUrl: z
      .string()
      .trim()
      .max(2048)
      .url()
      .refine((url) => url.startsWith('https://'))
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

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

    return {
      slug: gym.slug,
      name: gym.name,
      theme: {
        primaryColor: gym.theme?.primaryColor ?? '#007A35',
        logoUrl: gym.theme?.logoUrl ?? null,
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

    const parsed = updateThemeInput.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Enter a valid theme color or logo URL');
    }

    const theme = await this.database.master.$transaction(async tx => {
      // Serialize this Master-local mutation with the lifecycle status change.
      await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${access.gymId} FOR SHARE`;
      await this.assertCurrentOwnerAccess(access, tx);
      return tx.theme.upsert({
      where: { gymId: access.gymId },
      create: { gymId: access.gymId, ...parsed.data },
      update: parsed.data,
      select: { primaryColor: true, logoUrl: true },
      });
    });

    return { slug: access.slug, theme };
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
