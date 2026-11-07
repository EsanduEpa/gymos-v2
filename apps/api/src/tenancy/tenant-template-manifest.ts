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
    readonly views?: readonly string[]; readonly tables: readonly string[]; readonly types: readonly string[];
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
export const TENANT_TEMPLATE_V4: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V3,
  version: 'tenant-2026-11-04.1',
  migrations: [...TENANT_TEMPLATE_V3.migrations, {
    name: '20261102010000_member_profiles_and_session_packs', checksum: '146a672ecf9cd025d4cba62aad73b4f0a2e714ce6c9f2efd3aed5b9940209d2c',
  }, { name: '20261102020000_trainer_registration_profile', checksum: '0bdd2cd06b62b27b9302bbf4406b1b097f4bdfade3a0a5150d5ea5cb0d5ab7b6' },
  { name: '20261103010000_pt_session_and_notification_foundation', checksum: '752b61acf2704e1cab46f51a2109db43f7bca896e27f34ca60e626b76e0f3022' },
  { name: '20261103030000_pack_credit_allocation', checksum: '7215cf8082dee70259b7a2696d336cd663e361092677390a65deb70f9dec8fbd' },
  { name: '20261103040000_session_decline_reason', checksum: 'f8c53895a59994720b6fc8f40cc651a930f6bca5ab84aec9e6a27a6d98f41354' },
  { name: '20261103050000_trainer_pay_corrections', checksum: '9a29d2276335f6702635a8f8e5fdb20e9f6fc318a9f62ac5c7fee0d23cb368b1' },
  { name: '20261103060000_workout_plans', checksum: '2ec4b4d5194edc9601892bf5ba8b1a44c51791510bda575f409fe6a3b541e40a' },
  { name: '20261103070000_meal_plans', checksum: 'dea7abefa200cd91665fa7b650a5f1c4694f13738dd21b8b0ae0c1995976fe64' },
  { name: '20261104010000_finance_expenses_budgets', checksum: '6cc8f78e5b4119deea1bca5dee6f64fa6fe9585c948d2d98019fe84953e4cace' }],
  postconditions: {
    ...TENANT_TEMPLATE_V3.postconditions,
    tables: [...TENANT_TEMPLATE_V3.postconditions.tables, 'SessionPack', 'PTSession', 'SessionStateEvent', 'SessionCreditHold',
      'PackCreditMovement', 'SessionSettlement', 'RevenueRecord', 'TrainerPayPeriod', 'PayRecord', 'TrainerPayCorrection', 'Notification', 'WorkoutPlan', 'WorkoutExercise', 'MealPlan', 'MealPlanEntry', 'ExpenseRecord', 'CategoryBudget'],
    types: [...TENANT_TEMPLATE_V3.postconditions.types, 'SessionPackStatus', 'TrainerLevel', 'PTSessionState', 'SessionType',
      'SessionCreditHoldState', 'PackCreditMovementKind', 'SessionSettlementKind', 'OperationalEarningCategory', 'PayPeriodState', 'NotificationLinkKind', 'ExpenseCategory'],
    indexes: [...TENANT_TEMPLATE_V3.postconditions.indexes, 'SessionPack_pkey', 'SessionPack_commandReceiptId_key',
      'SessionPack_actorIdentityId_idempotencyKey_key', 'SessionPack_memberId_endDateExclusive_createdAt_id_idx',
      'Trainer_email_key', 'Trainer_registrationState_createdAt_id_idx', 'PTSession_pkey', 'PTSession_memberId_scheduledStartAt_id_idx',
      'PTSession_trainerId_scheduledStartAt_id_idx', 'PTSession_state_scheduledStartAt_id_idx', 'SessionStateEvent_pkey',
      'PTSession_member_interval_excl', 'PTSession_trainer_interval_excl',
      'SessionStateEvent_sessionId_committedVersion_key', 'SessionStateEvent_eventKey_key', 'SessionStateEvent_sessionId_createdAt_id_idx',
      'SessionCreditHold_pkey', 'SessionCreditHold_sessionId_key', 'SessionCreditHold_packId_state_heldAt_id_idx',
      'SessionCreditHold_active_ordinal_key', 'PackCreditMovement_pkey', 'PackCreditMovement_sourceKey_key', 'PackCreditMovement_packId_createdAt_id_idx',
      'PackCreditMovement_terminal_ordinal_key',
      'SessionSettlement_pkey', 'SessionSettlement_sessionId_key', 'RevenueRecord_pkey', 'RevenueRecord_sourceKey_key',
      'RevenueRecord_category_createdAt_id_idx', 'TrainerPayPeriod_pkey', 'TrainerPayPeriod_cadence_localStartDate_key',
      'TrainerPayPeriod_state_utcStartAt_id_idx', 'PayRecord_pkey', 'PayRecord_sessionId_key', 'PayRecord_sourceKey_key',
      'PayRecord_periodId_createdAt_id_idx', 'TrainerPayCorrection_pkey', 'TrainerPayCorrection_sessionId_key',
      'TrainerPayCorrection_sourceKey_key', 'TrainerPayCorrection_correctionPeriodId_createdAt_id_idx',
      'Notification_pkey', 'Notification_recipientIdentityId_sourceEventKey_key',
      'Notification_recipientIdentityId_readAt_createdAt_id_idx', 'WorkoutPlan_pkey', 'WorkoutPlan_memberId_createdAt_id_idx',
      'WorkoutPlan_trainerId_createdAt_id_idx', 'WorkoutExercise_pkey', 'WorkoutExercise_planId_sortOrder_key', 'WorkoutExercise_planId_sortOrder_idx',
      'MealPlan_pkey', 'MealPlan_memberId_createdAt_id_idx', 'MealPlan_trainerId_createdAt_id_idx', 'MealPlanEntry_pkey',
      'MealPlanEntry_planId_sortOrder_key', 'MealPlanEntry_planId_sortOrder_idx', 'ExpenseRecord_pkey', 'ExpenseRecord_commandReceiptId_key',
      'ExpenseRecord_accountingDate_category_id_idx', 'ExpenseRecord_category_accountingDate_id_idx', 'CategoryBudget_pkey',
      'CategoryBudget_category_month_key', 'CategoryBudget_commandReceiptId_key', 'CategoryBudget_month_category_idx'],
    constraints: [...TENANT_TEMPLATE_V3.postconditions.constraints, 'SessionPack_pkey', 'SessionPack_memberId_fkey',
      'SessionPack_credits_check', 'SessionPack_price_check', 'SessionPack_currency_check', 'SessionPack_validity_check',
      'SessionPack_version_check', 'SessionPack_key_check', 'SessionPack_receipt_format_check', 'Trainer_profile_check',
      'SessionPack_allocation_check',
      'PTSession_pkey', 'PTSession_memberId_fkey', 'PTSession_trainerId_fkey', 'PTSession_bounds_check', 'PTSession_value_check',
      'PTSession_shift_snapshot_check', 'PTSession_confirmation_snapshot_check', 'PTSession_state_shape_check', 'PTSession_notes_length_check', 'PTSession_member_interval_excl',
      'PTSession_trainer_interval_excl', 'PTSession_decline_reason_check', 'SessionStateEvent_pkey',
      'SessionStateEvent_sessionId_fkey', 'SessionStateEvent_receiptId_fkey', 'SessionStateEvent_version_check', 'SessionCreditHold_pkey',
      'SessionCreditHold_sessionId_fkey', 'SessionCreditHold_packId_fkey', 'SessionCreditHold_state_shape_check', 'SessionCreditHold_version_check',
      'SessionCreditHold_allocation_check', 'PackCreditMovement_pkey', 'PackCreditMovement_packId_fkey', 'PackCreditMovement_holdId_fkey', 'PackCreditMovement_receiptId_fkey',
      'PackCreditMovement_shape_check', 'PackCreditMovement_ordinal_shape_check', 'SessionSettlement_pkey', 'SessionSettlement_sessionId_fkey', 'SessionSettlement_sourceReceiptId_fkey',
      'SessionSettlement_value_check', 'RevenueRecord_pkey', 'RevenueRecord_sessionId_fkey', 'RevenueRecord_amount_check',
      'TrainerPayPeriod_pkey', 'TrainerPayPeriod_bounds_check', 'TrainerPayPeriod_version_check', 'PayRecord_pkey', 'PayRecord_sessionId_fkey',
      'PayRecord_periodId_fkey', 'PayRecord_value_check', 'TrainerPayPeriod_approval_provenance_check',
      'TrainerPayCorrection_pkey', 'TrainerPayCorrection_sessionId_fkey',
      'TrainerPayCorrection_originalPeriodId_fkey', 'TrainerPayCorrection_originalEarningId_fkey', 'TrainerPayCorrection_correctionPeriodId_fkey',
      'TrainerPayCorrection_provenance_check', 'Notification_pkey', 'Notification_content_check', 'WorkoutPlan_pkey',
      'WorkoutPlan_memberId_fkey', 'WorkoutPlan_trainerId_fkey', 'WorkoutPlan_name_length_check', 'WorkoutPlan_description_length_check',
      'WorkoutExercise_pkey', 'WorkoutExercise_planId_fkey', 'WorkoutExercise_planId_sortOrder_key', 'WorkoutExercise_sortOrder_check',
      'WorkoutExercise_name_length_check', 'WorkoutExercise_sets_check', 'WorkoutExercise_reps_check', 'WorkoutExercise_weight_check',
      'WorkoutExercise_duration_check', 'WorkoutExercise_notes_length_check', 'MealPlan_pkey', 'MealPlan_memberId_fkey',
      'MealPlan_trainerId_fkey', 'MealPlan_name_length_check', 'MealPlanEntry_pkey', 'MealPlanEntry_planId_fkey',
      'MealPlanEntry_planId_sortOrder_key', 'MealPlanEntry_sortOrder_check', 'MealPlanEntry_dayOfWeek_check',
      'MealPlanEntry_mealType_check', 'MealPlanEntry_foodItem_length_check', 'MealPlanEntry_calories_check',
      'MealPlanEntry_protein_check', 'MealPlanEntry_carbs_check', 'MealPlanEntry_fats_check', 'ExpenseRecord_pkey',
      'ExpenseRecord_amount_check', 'ExpenseRecord_currency_check', 'ExpenseRecord_description_check', 'ExpenseRecord_version_check',
      'ExpenseRecord_identity_check', 'ExpenseRecord_commandReceiptId_fkey', 'CategoryBudget_pkey', 'CategoryBudget_month_check',
      'CategoryBudget_amount_check', 'CategoryBudget_currency_check', 'CategoryBudget_version_check', 'CategoryBudget_identity_check',
      'CategoryBudget_commandReceiptId_fkey'],
    triggers: [...TENANT_TEMPLATE_V3.postconditions.triggers, 'SessionStateEvent_append_only', 'PackCreditMovement_append_only', 'SessionPack_allocation_immutable',
      'SessionSettlement_append_only', 'RevenueRecord_append_only', 'PayRecord_append_only', 'TrainerPayCorrection_append_only'],
    columns: { ...TENANT_TEMPLATE_V3.postconditions.columns,
      Member: [...TENANT_TEMPLATE_V3.postconditions.columns.Member, 'phone', 'dateOfBirth', 'emergencyContact', 'healthNotes'],
      Trainer: [...TENANT_TEMPLATE_V3.postconditions.columns.Trainer, 'bio', 'email', 'level', 'phone', 'shiftEnd', 'shiftStart',
        'specialisations', 'yearsExperience'],
      SessionPack: ['actorIdentityId', 'commandReceiptId', 'createdAt', 'currency', 'endDateExclusive', 'id', 'idempotencyKey',
        'issuedCredits', 'memberId', 'price', 'requestDigest', 'startDate', 'status', 'validityDays', 'version', 'totalMinorUnits',
        'creditBaseMinorUnits', 'creditRemainder', 'creditAllocationPolicyVersion'],
      PTSession: ['configurationVersion', 'confirmationLevel', 'confirmationRate', 'confirmationShiftEnd', 'confirmationShiftStart', 'confirmedAt',
        'createdAt', 'createdByIdentityId', 'currency', 'endedAt', 'fee', 'gymTimezone', 'id', 'memberId', 'notes', 'scheduledEndAt',
        'scheduledStartAt', 'startedAt', 'state', 'trainerId', 'type', 'updatedAt', 'version', 'declineReason'],
      SessionStateEvent: ['actorIdentityId', 'committedVersion', 'createdAt', 'eventKey', 'fromState', 'id', 'receiptId', 'sessionId', 'toState'],
      SessionCreditHold: ['heldAt', 'id', 'packId', 'resolvedAt', 'sessionId', 'state', 'version', 'creditOrdinal', 'creditValueMinorUnits'],
      PackCreditMovement: ['actorIdentityId', 'availableDelta', 'consumedDelta', 'createdAt', 'expiredDelta', 'heldDelta', 'holdId', 'id', 'kind', 'packId', 'receiptId', 'sourceKey', 'creditOrdinal'],
      SessionSettlement: ['createdAt', 'creditConsumed', 'creditValue', 'currency', 'id', 'kind', 'sessionId', 'sourceReceiptId'],
      RevenueRecord: ['amount', 'category', 'createdAt', 'currency', 'id', 'sessionId', 'sourceKey'],
      TrainerPayPeriod: ['approvedAt', 'approvedByIdentityId', 'calculatedTotal', 'cadence', 'createdAt', 'id', 'localEndDateExclusive', 'localStartDate', 'state', 'timezone', 'updatedAt', 'utcEndAt', 'utcStartAt', 'version'],
      PayRecord: ['amount', 'confirmationLevel', 'confirmationRate', 'createdAt', 'currency', 'id', 'periodId', 'sessionId', 'sourceKey'],
      TrainerPayCorrection: ['actorIdentityId', 'amount', 'correctionPeriodId', 'createdAt', 'currency', 'id', 'originalEarningId', 'originalPeriodId', 'reason', 'sessionId', 'sourceKey', 'sourcePeriodApprovedAt', 'sourcePeriodApprovedByIdentityId', 'sourcePeriodState', 'sourcePeriodVersion'],
      Notification: ['createdAt', 'eventCode', 'id', 'linkKind', 'message', 'readAt', 'recipientIdentityId', 'resourceId', 'sourceEventKey', 'title'],
      WorkoutPlan: ['createdAt', 'description', 'id', 'memberId', 'name', 'trainerId'],
      WorkoutExercise: ['durationMinutes', 'id', 'name', 'notes', 'planId', 'reps', 'sets', 'sortOrder', 'weightKg'],
      MealPlan: ['createdAt', 'id', 'memberId', 'name', 'trainerId'],
      MealPlanEntry: ['calories', 'carbsGrams', 'dayOfWeek', 'fatsGrams', 'foodItem', 'id', 'mealType', 'planId', 'proteinGrams', 'sortOrder'],
      ExpenseRecord: ['accountingDate', 'amount', 'category', 'commandReceiptId', 'createdAt', 'createdByIdentityId', 'currency', 'description', 'id', 'recurring', 'updatedAt', 'version'],
      CategoryBudget: ['actorIdentityId', 'amount', 'category', 'commandReceiptId', 'createdAt', 'currency', 'id', 'month', 'updatedAt', 'version'],
    },
  },
});
export const TENANT_TEMPLATE_V5: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V4,
  version: 'tenant-2026-11-06.1',
  migrations: [...TENANT_TEMPLATE_V4.migrations, {
    name: '20261106010000_pt_availability', checksum: 'eb74a2f3b4534cb25fef4854250cab8315822bc8b4c46c13cbab04f83d328171',
  }],
  postconditions: {
    ...TENANT_TEMPLATE_V4.postconditions,
    tables: [...TENANT_TEMPLATE_V4.postconditions.tables, 'PTAvailabilityRule'],
    types: [...TENANT_TEMPLATE_V4.postconditions.types, 'PTAvailabilityKind'],
    indexes: [...TENANT_TEMPLATE_V4.postconditions.indexes, 'PTAvailabilityRule_pkey', 'PTAvailabilityRule_commandReceiptId_idx',
      'PTAvailabilityRule_trainerId_kind_weekday_effectiveFrom_idx', 'PTAvailabilityRule_trainerId_localDate_kind_idx', 'PTAvailabilityRule_localDate_kind_idx'],
    constraints: [...TENANT_TEMPLATE_V4.postconditions.constraints, 'PTAvailabilityRule_pkey', 'PTAvailabilityRule_trainerId_fkey',
      'PTAvailabilityRule_commandReceiptId_fkey', 'PTAvailabilityRule_shape_check', 'PTAvailabilityRule_reason_length_check', 'PTAvailabilityRule_date_order_check'],
    columns: { ...TENANT_TEMPLATE_V4.postconditions.columns,
      PTAvailabilityRule: ['commandReceiptId', 'createdAt', 'createdByIdentityId', 'effectiveFrom', 'effectiveToExclusive', 'endMinute', 'id', 'kind', 'localDate', 'reason', 'startMinute', 'trainerId', 'updatedAt', 'version', 'weekday'] },
  },
});
export const TENANT_TEMPLATE_V6: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V5,
  version: 'tenant-2026-11-06.2',
  migrations: [...TENANT_TEMPLATE_V5.migrations, { name: '20261106020000_pt_request_expiry', checksum: 'a1ae2e3a23f0e189e479a48ce037102ff9c1d697f0bbc9a2490776af08caa688' }],
  postconditions: {
    ...TENANT_TEMPLATE_V5.postconditions,
    indexes: [...TENANT_TEMPLATE_V5.postconditions.indexes, 'PTSession_state_requestExpiresAt_id_idx'],
    constraints: [...TENANT_TEMPLATE_V5.postconditions.constraints, 'PTSession_request_expiry_check'],
    columns: { ...TENANT_TEMPLATE_V5.postconditions.columns,
      PTSession: [...TENANT_TEMPLATE_V5.postconditions.columns.PTSession, 'requestExpiresAt', 'availabilityVersion'] },
  },
});
export const TENANT_TEMPLATE_V7: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V6,
  version: 'tenant-2026-11-06.3',
  migrations: [...TENANT_TEMPLATE_V6.migrations, { name: '20261106030000_pt_expired_state_shape', checksum: '9fa2b90879b8115ed45c47dc303bc99c6ea97fd6c50c217878907a16d9dad691' }],
  postconditions: {
    ...TENANT_TEMPLATE_V6.postconditions,
    constraints: [...TENANT_TEMPLATE_V6.postconditions.constraints.filter(name => name !== 'PTSession_state_shape_check'), 'PTSession_state_shape_v2_check'],
  },
});
export const TENANT_TEMPLATE_V8: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V7,
  version: 'tenant-2026-11-06.4',
  migrations: [...TENANT_TEMPLATE_V7.migrations, { name: '20261106040000_pt_owner_exceptions', checksum: 'd23789d50058968bca527e95ca21563e81f2eb4f177cd4aba219410f0c34ed0d' }],
  postconditions: {
    ...TENANT_TEMPLATE_V7.postconditions,
    views: ['PTCreditUnitBalance'],
    tables: [...TENANT_TEMPLATE_V7.postconditions.tables, 'PTSessionAdjustment', 'PTCreditRemedy'],
    indexes: [...TENANT_TEMPLATE_V7.postconditions.indexes.filter(name => !['TrainerPayCorrection_sessionId_key', 'PackCreditMovement_terminal_ordinal_key'].includes(name)), "PackCreditMovement_terminal_history_idx", "PackCreditMovement_packId_creditOrdinal_idx", "TrainerPayCorrection_sessionId_idx", "RevenueRecord_reversesId_key", "PTSessionAdjustment_pkey", "PTSessionAdjustment_receiptId_key", "PTSessionAdjustment_replacementSessionId_key", "PTSessionAdjustment_sessionId_committedVersion_key", "PTSessionAdjustment_sessionId_createdAt_id_idx", "PTCreditRemedy_pkey", "PTCreditRemedy_adjustmentId_key", "PTCreditRemedy_sourceHoldId_key", "PTCreditRemedy_packId_creditOrdinal_newEndDateExclusive_idx"],
    constraints: [...TENANT_TEMPLATE_V7.postconditions.constraints.filter(name => !["RevenueRecord_amount_check", "TrainerPayPeriod_version_check", "TrainerPayCorrection_provenance_check", "PackCreditMovement_shape_check"].includes(name)), "RevenueRecord_reversesId_fkey", "RevenueRecord_signed_amount_check", "TrainerPayPeriod_signed_total_check", "TrainerPayCorrection_provenance_v2_check", "PackCreditMovement_unit_conservation", "PackCreditMovement_conserved_shape_check", "PackCreditMovement_adjustmentId_fkey", "PTSessionAdjustment_pkey", "PTSessionAdjustment_sessionId_fkey", "PTSessionAdjustment_replacementSessionId_fkey", "PTSessionAdjustment_receiptId_fkey", "PTSessionAdjustment_sourceEventId_fkey", "PTSessionAdjustment_shape_check", "PTCreditRemedy_pkey", "PTCreditRemedy_adjustmentId_fkey", "PTCreditRemedy_sourceHoldId_fkey", "PTCreditRemedy_packId_fkey", "PTCreditRemedy_shape_check"],
    triggers: [...TENANT_TEMPLATE_V7.postconditions.triggers, 'RevenueRecord_reversal_source_check', 'PTSessionAdjustment_append_only', 'PTCreditRemedy_append_only', 'PTCreditRemedy_source_check', 'PackCreditMovement_correction_source_check', 'PackCreditMovement_pack_serialization', 'PackCreditMovement_unit_conservation'],
    columns: { ...TENANT_TEMPLATE_V7.postconditions.columns,
      RevenueRecord: [...TENANT_TEMPLATE_V7.postconditions.columns.RevenueRecord, 'reversesId'],
      PackCreditMovement: [...TENANT_TEMPLATE_V7.postconditions.columns.PackCreditMovement, 'adjustmentId'],
      PTSessionAdjustment: ["id", "sessionId", "replacementSessionId", "receiptId", "sourceEventId", "kind", "initiatedBy", "reason", "actorIdentityId", "committedVersion", "fromState", "toState", "effectiveSettlementKind", "creditConsumed", "previousStartedAt", "previousEndedAt", "actualStartedAt", "actualEndedAt", "createdAt"],PTCreditRemedy: ["id", "adjustmentId", "sourceHoldId", "packId", "creditOrdinal", "originalEndDateExclusive", "newEndDateExclusive", "valueMinorUnits", "createdAt"],PTCreditUnitBalance: ["packId", "memberId", "currency", "creditOrdinal", "startDate", "endDateExclusive", "packCreatedAt", "valueMinorUnits", "effectiveEndDateExclusive", "available", "held", "consumed", "expired", "consistent"],
    },
  },
});
export const TENANT_TEMPLATE_V9: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V8,
  version: 'tenant-2026-11-06.5',
  migrations: [...TENANT_TEMPLATE_V8.migrations, { name: '20261106050000_pt_reminders', checksum: '3ef3a8cdd086da49e25592ca4d783e8897b441da7d66dc1d5bb080b0d1903bab' }],
  postconditions: {
    ...TENANT_TEMPLATE_V8.postconditions,
    tables: [...TENANT_TEMPLATE_V8.postconditions.tables, 'PTSessionReminder', 'PTScheduledWorkStatus'],
    indexes: [...TENANT_TEMPLATE_V8.postconditions.indexes, 'PTSessionReminder_pkey', 'PTSessionReminder_notificationId_key', 'PTSessionReminder_revision_key', 'PTSessionReminder_due_idx', 'PTScheduledWorkStatus_pkey'],
    constraints: [...TENANT_TEMPLATE_V8.postconditions.constraints, 'PTSessionReminder_pkey', 'PTSessionReminder_sessionId_fkey', 'PTSessionReminder_notificationId_fkey', 'PTSessionReminder_notificationId_key', 'PTSessionReminder_shape_check', 'PTScheduledWorkStatus_pkey', 'PTScheduledWorkStatus_id_check'],
    triggers: [...TENANT_TEMPLATE_V8.postconditions.triggers, 'PTSession_reminder_sync'],
    columns: { ...TENANT_TEMPLATE_V8.postconditions.columns,
      Notification: [...TENANT_TEMPLATE_V8.postconditions.columns.Notification, 'supersededAt'],
      PTSessionReminder: ['id', 'sessionId', 'scheduledStartAt', 'scheduledEndAt', 'kind', 'recipientIdentityId', 'recipientRole', 'dueAt', 'status', 'attempts', 'nextAttemptAt', 'finishedAt', 'notificationId', 'lastError', 'createdAt'],
      PTScheduledWorkStatus: ['id', 'lastAttemptAt', 'lastSuccessAt', 'totalFailures', 'lastError'],
    },
  },
});
export const TENANT_TEMPLATE_V10: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V9,
  version: 'tenant-2026-11-06.6',
  migrations: [...TENANT_TEMPLATE_V9.migrations, { name: '20261106120000_member_profile_notifications', checksum: 'afc031dfbdc3068a060e9757c97b105ba5fd4d7741427012024d4c2ef51ad144' }],
  postconditions: TENANT_TEMPLATE_V9.postconditions,
});
export const TENANT_TEMPLATE_MANIFEST: TenantTemplateManifest = Object.freeze({
  ...TENANT_TEMPLATE_V10,
  version: 'tenant-2026-11-07.1',
  migrations: [...TENANT_TEMPLATE_V10.migrations, { name: '20261107010000_plan_notifications', checksum: '1da5d1f127f63dca18386277998e3f59e5a52181228ce99ef566aed802b2b3bc' }],
});
export const TENANT_MANIFESTS: readonly TenantTemplateManifest[] = [TENANT_TEMPLATE_V1, TENANT_TEMPLATE_V2, TENANT_TEMPLATE_V3, TENANT_TEMPLATE_V4, TENANT_TEMPLATE_V5, TENANT_TEMPLATE_V6, TENANT_TEMPLATE_V7, TENANT_TEMPLATE_V8, TENANT_TEMPLATE_V9, TENANT_TEMPLATE_V10, TENANT_TEMPLATE_MANIFEST];
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
