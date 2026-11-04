import { contentDigest } from '../operations/primitives.js';
// Immutable reviewed chain; schema deployment is an explicit owned runner command.
export const MASTER_TEMPLATE_MANIFEST = Object.freeze({
  version: 'master-2026-11-03.1',
  migrations: [
    {
      name: '20261021100256_init_master',
      checksum:
        '940ad033a98c3b09b34e7026c5bc04921e29482fe458de400ad8ad3c17208470',
    },
    {
      name: '20261023090000_identity_foundation',
      checksum:
        '20fddb8f42bdfd8d6710b9510c854937b1eb176681ec8d7921a7ddd1d5929750',
    },
    {
      name: '20261024010000_operations_foundation',
      checksum:
        '675217ec4d695a93dc71004604907d2f9b75651be47506e2824f9eb04f30cf5e',
    },
    {
      name: '20261024020000_tenant_schema_registry',
      checksum:
        '0ff42b72716b38b8f478c7bfd0eb281d89ed4650ce5d3a304f059feeee5ebde7',
    },
    {
      name: '20261025010000_credential_delivery',
      checksum:
        'b260033be49b606f1bdcb95e388deb7fd655f158f47cbc338bff1fc014e87428',
    },
    {
      name: '20261030010000_provisioning_intent',
      checksum:
        '1ab6a6780072568a76cd101be71c3e1da95f0902aaeb24e763fde3b90fb69d38',
    },
    {
      name: '20261030030000_support_registry',
      checksum:
        'b9309776662036d9532ce59fb7b65fd943a4e3c4da640a259bfd276e79b586f4',
    },
    {
      name: '20261031010000_gym_lifecycle',
      checksum:
        '9e3a712f566dcb1f07056688484151e7b0bf2b230492d63c7c5785cde4a99664',
    },
    {
      name: '20261031020000_schema_rollout',
      checksum:
        'c11c8f7bc508cecf109f17a89f2b9d1d13985c258b91acd3363e1c2dcc9ff293',
    },
    {
      name: '20261031030000_theme_version',
      checksum: 'be233f1bf8d30b7d691074a4abe54648220cc773df109e8717b8019c7a04a265',
    },
    {
      name: '20261103020000_trainer_lifecycle_intent',
      checksum: '7cd5f7986fca900cb132a1461b43626f3f8403d5716d9f929768061192b63939',
    },
    {
      name: '20261103040000_member_lifecycle_intent',
      checksum: '304c97681a03e5bff34226bafeda0d0385aed6d22e40ed412cc64437f1a7eebc',
    },
  ],
  postconditions: {
    tables: [
      'CredentialDelivery',
      'EnrollmentProof',
      'Gym',
      'GymAccess',
      'GymLifecycleIntent',
      'GymRegistrySummary',
      'MasterSchemaDeployment',
      'MasterSchemaState',
      'MemberLifecycleIntent',
      'Operation',
      'PlatformAuditLog',
      'ProvisioningIntent',
      'SchemaRepairReview',
      'SchemaRollout',
      'SchemaRolloutApproval',
      'SchemaRolloutTarget',
      'SupportEvent',
      'SupportSession',
      'Theme',
      'TrainerLifecycleIntent',
      'User',
    ],
    triggers: [
      'CredentialDelivery_immutable_history',
      'GymLifecycleIntent_immutable',
      'MasterSchemaDeployment_immutable',
      'Operation_immutable_intent',
      'Operation_retained',
      'PlatformAuditLog_append_only',
      'ProvisioningIntent_immutable',
      'SchemaRepairReview_immutable',
      'SchemaRolloutApproval_immutable',
      'SchemaRolloutTarget_immutable',
      'SchemaRollout_guard',
      'SupportEvent_append_only',
      'SupportSession_immutable',
    ],
    requiredColumns: {
      Theme: ['id', 'gymId', 'primaryColor', 'logoUrl', 'version'],
      Gym: [
        'id',
        'databaseName',
        'status',
        'version',
        'expectedTenantSchemaVersion',
        'expectedTenantManifestDigest',
        'expectedTenantOperationId',
        'publicProfileVersion',
      ],
      Operation: [
        'id',
        'kind',
        'state',
        'version',
        'completedSteps',
        'leaseToken',
        'leaseExpiresAt',
        'safeResult',
      ],
      SchemaRolloutTarget: [
        'operationId',
        'databaseName',
        'ownershipOperationId',
        'sourceOperationId',
        'sourceVersion',
        'sourceDigest',
        'expectedGymVersion',
      ],
      MasterSchemaState: [
        'id',
        'templateVersion',
        'manifestDigest',
        'schemaEvidenceDigest',
        'verifiedAt',
        'version',
      ],
      TrainerLifecycleIntent: [
        'operationId',
        'trainerId',
        'expectedAccessVersion',
        'expectedTrainerVersion',
        'targetStatus',
        'reason',
      ],
      MemberLifecycleIntent: [
        'operationId',
        'memberId',
        'expectedAccessVersion',
        'expectedMemberVersion',
        'targetStatus',
        'reason',
      ],
    },
  },
} as const);
export const masterManifestDigest = () =>
  contentDigest(MASTER_TEMPLATE_MANIFEST);
