import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AdminController } from './admin.controller.js';
import { AuthController } from './auth.controller.js';
import { CredentialReissueController, CredentialsController } from './credentials.controller.js';
import { CredentialService } from './identity/credential.service.js';
import { DatabaseService } from './database.service.js';
import { GymAccessGuard } from './gym-access.guard.js';
import { ProvisioningReservationService } from './platform/provisioning-reservation.service.js';
import { ProvisioningOwnerService } from './platform/provisioning-owner.service.js';
import { ProvisioningOwnerController } from './platform/provisioning-owner.controller.js';
import { SupportSessionController } from './platform/support-session.controller.js';
import { SupportSessionService } from './platform/support-session.service.js';
import { PlatformRegistryService } from './platform/platform-registry.service.js';
import { SupportScopeGuard } from './platform/support-scope.guard.js';
import { GymLifecycleController } from './platform/gym-lifecycle.controller.js';
import { GymLifecycleService } from './platform/gym-lifecycle.service.js';
import { GymProvisioningService } from './gym-provisioning.service.js';
import { GymsController } from './gyms.controller.js';
import { SuperAdminGuard } from './super-admin.guard.js';
import { TenantDatabaseService } from './tenant-database.service.js';
import { TenantRegistryService } from './tenancy/tenant-registry.service.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { ConfigurationController } from './configuration.controller.js';
import { MemberEnrollmentService } from './member-enrollment.service.js';
import { TrainerEnrollmentService } from './trainer-enrollment.service.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AppController, AdminController, AuthController, CredentialsController, CredentialReissueController, GymsController, ConfigurationController, ProvisioningOwnerController, SupportSessionController, GymLifecycleController],
  providers: [
    AppService,
    DatabaseService,
    MemberEnrollmentService,
    TrainerEnrollmentService,
    CredentialService,
    GymAccessGuard,
    GymProvisioningService,
    ProvisioningReservationService,
    ProvisioningOwnerService,
    SupportSessionService,
    PlatformRegistryService,
    GymLifecycleService,
    SuperAdminGuard,
    TenantDatabaseService,
    TenantRegistryService,
    TenantSchemaGateService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SupportScopeGuard },
  ],
})
export class AppModule {}
