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
export const TENANT_TEMPLATE_MANIFEST: TenantTemplateManifest = Object.freeze({
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
export const TENANT_MANIFESTS: readonly TenantTemplateManifest[] = [TENANT_TEMPLATE_V1, TENANT_TEMPLATE_MANIFEST];
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
