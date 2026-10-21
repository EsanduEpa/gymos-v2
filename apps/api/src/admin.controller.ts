import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { GymProvisioningService } from './gym-provisioning.service.js';
import { SuperAdminGuard } from './super-admin.guard.js';

const createGymInput = z.strictObject({
  name: z.string().trim().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ownerEmail: z.string().trim().toLowerCase().pipe(z.email()),
  ownerPassword: z.string().min(12).max(1024),
});

@Controller('admin/gyms')
export class AdminController {
  constructor(private readonly provisioning: GymProvisioningService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  async create(@Body() body: unknown) {
    const parsed = createGymInput.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Enter valid gym and owner details');
    }
    return this.provisioning.create(parsed.data);
  }
}
