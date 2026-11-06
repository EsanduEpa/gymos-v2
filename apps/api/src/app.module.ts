import { SessionExceptionsController } from './sessions/session-exceptions.controller.js';
import { SessionExceptionsService } from './sessions/session-exceptions.service.js';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AdminController } from './admin.controller.js';
import { AuthController } from './auth.controller.js';
import { AccountProfileController, GymProfileController } from './profiles.controller.js';
import { AdminEmailCorrectionController, EmailCorrectionController } from './email-correction.controller.js';
import { AccountRecoveryController, CredentialReissueController, CredentialsController, OperatorRecoveryController } from './credentials.controller.js';
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
import { TrainersController } from './trainers.controller.js';
import { PacksController } from './packs.controller.js';
import { NotificationsController } from './notifications.controller.js';
import { AccountNotificationsController } from './account-notifications.controller.js';
import { TrainerLifecycleService } from './trainer-lifecycle.service.js';
import { SessionBookingController } from './sessions/booking.controller.js';
import { SessionBookingService } from './sessions/booking.service.js';
import { SessionReadsController } from './sessions/session-reads.controller.js';
import { SessionReadsService } from './sessions/session-reads.service.js';
import { SessionRequestsController } from './sessions/session-requests.controller.js';
import { SessionRequestsService } from './sessions/session-requests.service.js';
import { MemberSessionOverviewController } from './sessions/member-session-overview.controller.js';
import { MemberSessionOverviewService } from './sessions/member-session-overview.service.js';
import { CoachingController } from './coaching/coaching.controller.js';
import { CoachingService } from './coaching/coaching.service.js';
import { MemberLifecycleController } from './member-lifecycle.controller.js';
import { MemberLifecycleService } from './member-lifecycle.service.js';
import { SessionLifecycleController } from './sessions/session-lifecycle.controller.js';
import { SessionLifecycleService } from './sessions/session-lifecycle.service.js';
import { FinanceController } from './finance/finance.controller.js';
import { FinanceService } from './finance/finance.service.js';
import { PayrollService } from './finance/payroll.service.js';
import { DashboardController } from './dashboard/dashboard.controller.js';
import { DashboardService } from './dashboard/dashboard.service.js';
import { AnalyticsController } from './analytics/analytics.controller.js';
import { AnalyticsService } from './analytics/analytics.service.js';
import { SessionAvailabilityController } from './sessions/availability.controller.js';
import { SessionAvailabilityService } from './sessions/availability.service.js';
import { SessionExpiryRunner } from './sessions/session-expiry-runner.js';
import { MemberApplicationsController } from './member-applications.controller.js';
import { MemberApplicationsService } from './member-applications.service.js';
import { AuthSessionService } from './identity/auth-session.service.js';
import { AuthSessionGuard } from './identity/auth-session.guard.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [SessionExceptionsController, AppController, AdminController, AuthController, AccountProfileController, GymProfileController, EmailCorrectionController, AdminEmailCorrectionController, AccountNotificationsController, CredentialsController, CredentialReissueController, AccountRecoveryController, OperatorRecoveryController, GymsController, MemberApplicationsController, TrainersController, PacksController, NotificationsController, ConfigurationController, ProvisioningOwnerController, SupportSessionController, GymLifecycleController, SessionBookingController, SessionReadsController, SessionRequestsController, MemberSessionOverviewController, CoachingController, MemberLifecycleController, SessionLifecycleController, FinanceController, DashboardController, AnalyticsController, SessionAvailabilityController],
  providers: [SessionExceptionsService,
    AppService,
    DatabaseService,
    MemberEnrollmentService,
    MemberApplicationsService,
    AuthSessionService,
    AuthSessionGuard,
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
    TrainerLifecycleService,
    SessionBookingService,
    SessionReadsService,
    SessionRequestsService,
    MemberSessionOverviewService,
    CoachingService,
    MemberLifecycleService,
    SessionLifecycleService,
    FinanceService,
    PayrollService,
    DashboardService,
    AnalyticsService,
    SessionAvailabilityService,
    SessionExpiryRunner,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthSessionGuard },
    { provide: APP_GUARD, useClass: SupportScopeGuard },
  ],
})
export class AppModule {}
