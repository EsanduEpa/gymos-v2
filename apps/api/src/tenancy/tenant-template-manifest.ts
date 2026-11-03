import { createHash } from 'node:crypto';
import { canonicalJson } from '../operations/primitives.js';

export const RUNNING_TENANT_API_COMPATIBILITY = 1;

export const TENANT_TEMPLATE_V1 = Object.freeze({
  version: 'tenant-2026-10-24.1',
  apiCompatibility: { min: 1, max: 1 },
  migrations: [
    { name: '20261021100258_init_tenant', checksum: '7ccdcd9d66e9079b885af6c9b61ef8b7992ad14656d2792b5418df682d854579' },
    { name: '20261023090001_actor_foundation', checksum: '83aa8d8365e616ff60e169f876dd7e90135404a26bce7574118c64f601babb50' },
    { name: '20261024010001_operations_foundation', checksum: '24b6e07530e956531999c7481c2a7db5c92eade4281ce0bfcd4da3f103c29692' },
    { name: '20261024020001_tenant_schema_registry', checksum: '17aff169a09479b9657a7387a49fcff73263ea8f21abcc3301d07ae153687a39' },
  ],
  postconditions: {
    tables: ['AuditLog', 'CommandReceipt', 'GymConfiguration', 'Member', 'SchemaState', 'Trainer'],
    types: ['CommandReceiptState', 'MemberRegistrationState', 'MemberStatus', 'SchemaVerificationState', 'TrainerRegistrationState', 'TrainerStatus'],
    indexes: [
      'AuditLog_actorIdentityId_createdAt_idx', 'AuditLog_createdAt_id_idx', 'AuditLog_eventKey_key', 'AuditLog_pkey',
      'CommandReceipt_actorIdentityId_commandKind_idempotencyKey_key', 'CommandReceipt_pkey',
      'CommandReceipt_sourceMasterOperationId_key', 'CommandReceipt_state_createdAt_idx',
      'GymConfiguration_masterGymId_key', 'GymConfiguration_pkey',
      'Member_email_key', 'Member_enrollmentOperationId_key', 'Member_identityId_key', 'Member_pkey',
      'SchemaState_pkey', 'Trainer_enrollmentOperationId_key', 'Trainer_identityId_key', 'Trainer_pkey',
    ],
    constraints: [
      'AuditLog_event_format', 'AuditLog_pkey', 'AuditLog_receiptId_fkey',
      'CommandReceipt_commit_result', 'CommandReceipt_digest_format', 'CommandReceipt_key_format', 'CommandReceipt_pkey',
      'GymConfiguration_pkey', 'GymConfiguration_singleton_check',
      'Member_pkey', 'Member_registration_check',
      'SchemaState_pkey', 'SchemaState_singleton_check',
      'Trainer_pkey', 'Trainer_registration_check',
    ],
    triggers: ['AuditLog_append_only', 'CommandReceipt_immutable_intent', 'CommandReceipt_retained', 'GymConfiguration_immutable_binding'],
    columns: {
      AuditLog: ['actorIdentityId', 'contentDigest', 'createdAt', 'eventCode', 'eventKey', 'id', 'originalActorIdentityId', 'receiptId', 'resourceId', 'resourceType', 'transition'],
      CommandReceipt: ['actorIdentityId', 'commandKind', 'committedAt', 'createdAt', 'id', 'idempotencyKey', 'requestDigest', 'resourceId', 'resourceType', 'safeResult', 'sourceMasterOperationId', 'state', 'updatedAt'],
      GymConfiguration: ['createdAt', 'id', 'masterGymId', 'updatedAt', 'version'],
      Member: ['createdAt', 'email', 'enrollmentOperationId', 'fullName', 'id', 'identityId', 'registrationState', 'status', 'updatedAt', 'version'],
      SchemaState: ['appliedAt', 'appliedManifestDigest', 'appliedTemplateVersion', 'id', 'lastOperationId', 'schemaEvidenceDigest', 'state', 'updatedAt', 'verifiedAt', 'verifiedMigrations', 'version'],
      Trainer: ['createdAt', 'enrollmentOperationId', 'fullName', 'id', 'identityId', 'registrationState', 'status', 'updatedAt', 'version'],
    },
  },
} as const);

export type TenantTemplateManifest = {
  readonly version: string;
  readonly apiCompatibility: { readonly min: number; readonly max: number };
  readonly migrations: readonly { readonly name: string; readonly checksum: string }[];
  readonly postconditions: {
    readonly tables: readonly string[]; readonly types: readonly string[];
    readonly indexes: readonly string[]; readonly constraints: readonly string[];
    readonly triggers: readonly string[]; readonly columns: Readonly<Record<string, readonly string[]>>;
  };
};
export const TENANT_TEMPLATE_V2: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V1,
  version: 'tenant-2026-10-30.1',
  migrations: [...TENANT_TEMPLATE_V1.migrations, {
    name: '20261030020000_initial_configuration', checksum: 'a1c3eb5e99ae8d921ea3802ca80d6fe90f6b33ba22f7da56ea27c681cdc600d7',
  }],
  postconditions: {
    ...TENANT_TEMPLATE_V1.postconditions,
    constraints: [...TENANT_TEMPLATE_V1.postconditions.constraints, 'GymConfiguration_currency_check', 'GymConfiguration_timezone_check'],
    columns: { ...TENANT_TEMPLATE_V1.postconditions.columns,
      GymConfiguration: [...TENANT_TEMPLATE_V1.postconditions.columns.GymConfiguration, 'currency', 'timezone'] },
  },
});
export const TENANT_TEMPLATE_V3: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V2,
  version: 'tenant-2026-10-31.1',
  migrations: [...TENANT_TEMPLATE_V2.migrations, {
    name: '20261031030000_gym_configuration_memberships', checksum: 'f223a7b8a0d17732b29b0b925dd44e09683552008ccee29618be78486e12fbcb',
  }],
  postconditions: {
    ...TENANT_TEMPLATE_V2.postconditions,
    tables: [...TENANT_TEMPLATE_V2.postconditions.tables, 'GymConfigurationVersion', 'MembershipPlan', 'MembershipTerm'],
    types: [...TENANT_TEMPLATE_V2.postconditions.types, 'PayPeriod', 'MembershipPlanStatus'],
    indexes: [...TENANT_TEMPLATE_V2.postconditions.indexes, 'MembershipPlan_pkey', 'MembershipPlan_status_createdAt_idx',
      'MembershipTerm_pkey', 'MembershipTerm_actorIdentityId_idempotencyKey_key', 'MembershipTerm_memberId_startDate_endDateExclusive_idx',
      'GymConfigurationVersion_pkey', 'GymConfigurationVersion_gymConfigurationId_configurationVersion', 'GymConfigurationVersion_configurationVersion_idx'],
    constraints: [...TENANT_TEMPLATE_V2.postconditions.constraints, 'GymConfiguration_rate_bounds', 'MembershipPlan_price_check',
      'MembershipPlan_pkey', 'MembershipPlan_currency_check', 'MembershipPlan_duration_check', 'MembershipTerm_pkey', 'MembershipTerm_dates_check', 'MembershipTerm_price_check',
      'MembershipTerm_currency_check', 'MembershipTerm_idempotency_check', 'MembershipTerm_memberId_fkey', 'MembershipTerm_planId_fkey',
      'GymConfigurationVersion_pkey', 'GymConfigurationVersion_gymConfigurationId_configurationVersion',
      'GymConfigurationVersion_gymConfigurationId_fkey', 'GymConfigurationVersion_version_check'],
    triggers: [...TENANT_TEMPLATE_V2.postconditions.triggers, 'GymConfigurationVersion_capture', 'GymConfigurationVersion_immutable'],
    columns: { ...TENANT_TEMPLATE_V2.postconditions.columns,
      GymConfiguration: [...TENANT_TEMPLATE_V2.postconditions.columns.GymConfiguration, 'address', 'phone', 'email', 'payPeriod',
        'defaultSessionFee', 'level2SessionFee', 'introSessionFee', 'level1BaseRate', 'level2BaseRate', 'offShiftPremium',
        'cancellationWindowMinutes', 'lateCancelDeduction', 'minimumSessionDurationMinutes'],
      MembershipPlan: ['createdAt', 'currency', 'description', 'durationDays', 'id', 'name', 'price', 'status', 'updatedAt', 'version'],
      MembershipTerm: ['actorIdentityId', 'agreedPrice', 'configurationVersion', 'createdAt', 'currency', 'endDateExclusive',
        'id', 'idempotencyKey', 'memberId', 'planId', 'planNameSnapshot', 'requestDigest', 'startDate'],
      GymConfigurationVersion: ['address', 'configurationVersion', 'createdAt', 'currency', 'defaultSessionFee', 'email', 'gymConfigurationId',
        'id', 'introSessionFee', 'lateCancelDeduction', 'level1BaseRate', 'level2BaseRate', 'level2SessionFee', 'minimumSessionDurationMinutes',
        'offShiftPremium', 'payPeriod', 'phone', 'timezone', 'cancellationWindowMinutes'],
    },
  },
});
export const TENANT_TEMPLATE_MANIFEST: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V3,
  version: 'tenant-2026-11-02.2',
  migrations: [...TENANT_TEMPLATE_V3.migrations, {
    name: '20261102010000_member_profiles_and_session_packs', checksum: '146a672ecf9cd025d4cba62aad73b4f0a2e714ce6c9f2efd3aed5b9940209d2c',
  }, { name: '20261102020000_trainer_registration_profile', checksum: '0bdd2cd06b62b27b9302bbf4406b1b097f4bdfade3a0a5150d5ea5cb0d5ab7b6' }],
  postconditions: {
    ...TENANT_TEMPLATE_V3.postconditions,
    tables: [...TENANT_TEMPLATE_V3.postconditions.tables, 'SessionPack'],
    types: [...TENANT_TEMPLATE_V3.postconditions.types, 'SessionPackStatus', 'TrainerLevel'],
    indexes: [...TENANT_TEMPLATE_V3.postconditions.indexes, 'SessionPack_pkey', 'SessionPack_commandReceiptId_key',
      'SessionPack_actorIdentityId_idempotencyKey_key', 'SessionPack_memberId_endDateExclusive_createdAt_id_idx',
      'Trainer_email_key', 'Trainer_registrationState_createdAt_id_idx'],
    constraints: [...TENANT_TEMPLATE_V3.postconditions.constraints, 'SessionPack_pkey', 'SessionPack_memberId_fkey',
      'SessionPack_credits_check', 'SessionPack_price_check', 'SessionPack_currency_check', 'SessionPack_validity_check',
      'SessionPack_version_check', 'SessionPack_key_check', 'SessionPack_receipt_format_check', 'Trainer_profile_check'],
    columns: { ...TENANT_TEMPLATE_V3.postconditions.columns,
      Member: [...TENANT_TEMPLATE_V3.postconditions.columns.Member, 'phone', 'dateOfBirth', 'emergencyContact', 'healthNotes'],
      Trainer: [...TENANT_TEMPLATE_V3.postconditions.columns.Trainer, 'bio', 'email', 'level', 'phone', 'shiftEnd', 'shiftStart',
        'specialisations', 'yearsExperience'],
      SessionPack: ['actorIdentityId', 'commandReceiptId', 'createdAt', 'currency', 'endDateExclusive', 'id', 'idempotencyKey',
        'issuedCredits', 'memberId', 'price', 'requestDigest', 'startDate', 'status', 'validityDays', 'version'],
    },
  },
});
export const TENANT_MANIFESTS: readonly TenantTemplateManifest[] = [TENANT_TEMPLATE_V1, TENANT_TEMPLATE_V2, TENANT_TEMPLATE_V3, TENANT_TEMPLATE_MANIFEST];
export function reviewedTenantManifest(version: string | null, digest: string | null) {
  return TENANT_MANIFESTS.find(manifest => manifest.version === version && tenantManifestDigest(manifest) === digest);
}

export function tenantManifestDigest(manifest: TenantTemplateManifest = TENANT_TEMPLATE_MANIFEST): string {
  return createHash('sha256').update(canonicalJson(manifest), 'utf8').digest('hex');
}

export function assertRunningApiCompatibility(manifest: TenantTemplateManifest = TENANT_TEMPLATE_MANIFEST): void {
  if (RUNNING_TENANT_API_COMPATIBILITY < manifest.apiCompatibility.min
    || RUNNING_TENANT_API_COMPATIBILITY > manifest.apiCompatibility.max) {
    throw new Error('Tenant template is incompatible with this API');
  }
}
