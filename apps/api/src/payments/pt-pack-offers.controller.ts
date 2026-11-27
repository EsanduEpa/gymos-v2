import { Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Req,
  UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { createPtPackOfferSchema, idSchema, managePtPackOfferSchema, ptPackOfferSchema, ptPackOffersSchema } from '@gymos/contracts';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database.service.js';
import type { PtPackOffer } from '../generated/tenant/client.js';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { withGymAccessFence } from '../identity/gym-access-fence.js';
import { OperationConflictError, requestDigest } from '../operations/primitives.js';
import { CommandReceiptFoundationService } from '../operations/receipt.service.js';
import { appendTenantAudit } from '../operations/transaction-audit.js';
import { TenantSchemaGateService } from '../tenancy/tenant-schema-gate.service.js';

function accessFor(request: GymRequest, role: 'OWNER' | 'MEMBER') {
  const access = request.gymAccess;
  if (access?.role !== role) throw new ForbiddenException('PT pack catalogue access denied');
  return access;
}

function offerDto(row: PtPackOffer) {
  return ptPackOfferSchema.parse({ id: row.id, name: row.name, credits: row.credits, price: row.price.toString(),
    currency: row.currency, validityDays: row.validityDays, status: row.status, version: row.version });
}

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class PtPackOffersController {
  constructor(private readonly db: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  @Get('pt-pack-offers')
  ownerOffers(@Req() request: GymRequest) {
    return this.list(accessFor(request, 'OWNER'), false);
  }

  @Get('me/pt-pack-offers')
  memberOffers(@Req() request: GymRequest) {
    return this.list(accessFor(request, 'MEMBER'), true);
  }

  private list(access: NonNullable<GymRequest['gymAccess']>, activeOnly: boolean) {
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const offers = await tenant.ptPackOffer.findMany({ where: activeOnly ? { status: 'ACTIVE' } : {},
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 500 });
      return ptPackOffersSchema.parse({ offers: offers.map(offerDto) });
    });
  }

  @Post('pt-pack-offers')
  async create(@Req() request: GymRequest, @Body() body: unknown) {
    const access = accessFor(request, 'OWNER');
    if (process.env.GYMOS_STANDALONE_PT_PACKS_ENABLED !== '1') throw new ForbiddenException('PT credits are included with membership');
    const parsed = createPtPackOfferSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a name, positive price, credit count and validity period');
    const { idempotencyKey, ...details } = parsed.data;
    try {
      return await this.tenantGate.withVerifiedTenant(access, tenant => withGymAccessFence(this.db.master,
        [{ identityId: access.identityId, gymId: access.gymId, role: 'OWNER' }], async () => {
          const receipt = await new CommandReceiptFoundationService(tenant).execute({
            masterGymId: access.gymId, actorIdentityId: access.identityId, commandKind: 'CREATE_PT_PACK_OFFER',
            idempotencyKey, normalizedIntent: details,
          }, async tx => {
            await tx.$queryRaw`SELECT "id" FROM "GymConfiguration" WHERE "id" = 'current' FOR SHARE`;
            const gym = await tx.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true } });
            if (gym?.currency !== 'LKR' && gym?.currency !== 'USD') throw new ConflictException('Set a supported gym currency first');
            const { id } = await tx.ptPackOffer.create({ data: { ...details, currency: gym.currency }, select: { id: true } });
            return { result: { resourceIds: [id] }, resourceType: 'PT_PACK_OFFER', resourceId: id,
              audits: [{ actorIdentityId: access.identityId, eventCode: 'PT_PACK_OFFER_CREATED', resourceType: 'PT_PACK_OFFER',
                resourceId: id, transition: { to: 'ACTIVE', version: 0 } }] };
          });
          const id = receipt.result.resourceIds?.[0];
          if (!id) throw new ConflictException('The PT pack offer receipt has no offer');
          return offerDto(await tenant.ptPackOffer.findUniqueOrThrow({ where: { id } }));
        }));
    } catch (error) {
      if (error instanceof OperationConflictError) throw new ConflictException('This request key already belongs to an earlier PT pack offer');
      throw error;
    }
  }

  @Post('pt-pack-offers/:offerId')
  manage(@Req() request: GymRequest, @Param('offerId') offerId: string, @Body() body: unknown) {
    const access = accessFor(request, 'OWNER');
    if (process.env.GYMOS_STANDALONE_PT_PACKS_ENABLED !== '1') throw new ForbiddenException('PT credits are included with membership');
    if (!idSchema.safeParse(offerId).success) throw new NotFoundException('PT pack offer not found');
    const parsed = managePtPackOfferSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Check the PT pack offer details');
    const { action, expectedVersion } = parsed.data;
    return this.tenantGate.withVerifiedTenant(access, tenant => withGymAccessFence(this.db.master,
      [{ identityId: access.identityId, gymId: access.gymId, role: 'OWNER' }], () => tenant.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "PtPackOffer" WHERE "id" = ${offerId} FOR UPDATE`;
        const current = await tx.ptPackOffer.findUnique({ where: { id: offerId } });
        if (!current) throw new NotFoundException('PT pack offer not found');
        if (current.version !== expectedVersion || current.status !== 'ACTIVE') throw new ConflictException('PT pack offer changed; reload and retry');
        const update = parsed.data.action === 'EDIT'
          ? { name: parsed.data.name, credits: parsed.data.credits, price: parsed.data.price, validityDays: parsed.data.validityDays }
          : { status: 'ARCHIVED' as const };
        const offer = await tx.ptPackOffer.update({ where: { id: offerId }, data: { ...update, version: { increment: 1 } } });
        const receiptId = randomUUID();
        const event = action === 'EDIT' ? 'PT_PACK_OFFER_EDITED' : 'PT_PACK_OFFER_ARCHIVED';
        await tx.commandReceipt.create({ data: {
          id: receiptId, actorIdentityId: access.identityId, commandKind: event, idempotencyKey: receiptId,
          requestDigest: requestDigest({ offerId, ...parsed.data }), state: 'COMMITTED', resourceType: 'PT_PACK_OFFER',
          resourceId: offerId, safeResult: { resourceIds: [offerId] }, committedAt: new Date(),
        } });
        await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId, actorIdentityId: access.identityId,
          eventCode: event, resourceType: 'PT_PACK_OFFER', resourceId: offerId,
          transition: { from: current.status, to: offer.status, version: offer.version } });
        return offerDto(offer);
      })));
  }
}
