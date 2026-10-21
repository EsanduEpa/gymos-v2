import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AdminController } from './admin.controller.js';
import { AuthController } from './auth.controller.js';
import { DatabaseService } from './database.service.js';
import { GymAccessGuard } from './gym-access.guard.js';
import { GymProvisioningService } from './gym-provisioning.service.js';
import { GymsController } from './gyms.controller.js';
import { SuperAdminGuard } from './super-admin.guard.js';
import { TenantDatabaseService } from './tenant-database.service.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AppController, AdminController, AuthController, GymsController],
  providers: [
    AppService,
    DatabaseService,
    GymAccessGuard,
    GymProvisioningService,
    SuperAdminGuard,
    TenantDatabaseService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
