import { createHash, createHmac } from 'node:crypto';

export class OperationConflictError extends Error {
  readonly code = 'CONFLICT';
  constructor(message = 'Operation conflicts with its recorded intent') { super(message); }
}
export class OperationIntegrityError extends Error {
  readonly code = 'INTEGRITY';
  constructor(message = 'Operation evidence is inconsistent') { super(message); }
}
const forbiddenKey = /password|secret|token|credential|authorization|connectionstring|databaseurl|healthnotes|proof/i;

// Plain JSON only; no coercion, getters, Dates, undefined array entries or unsafe
// integers. Object field order is canonical; array order remains meaningful.
export function canonicalJson(value: unknown, rejectSecrets = false): string {
  const seen = new Set<object>();
  function visit(item: unknown): string {
    if (item === null) return 'null';
    if (typeof item === 'string' || typeof item === 'boolean') return JSON.stringify(item);
    if (typeof item === 'number') {
      if (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item))) throw new TypeError('Invalid JSON number');
      return JSON.stringify(item);
    }
    if (typeof item !== 'object' || seen.has(item)) throw new TypeError('Invalid JSON value');
    seen.add(item);
    try {
      if (Array.isArray(item)) return `[${Array.from(item, visit).join(',')}]`;
      if (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new TypeError('JSON object must be plain');
      const parts: string[] = [];
      for (const key of Object.keys(item).sort()) {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new TypeError('Unsafe JSON key');
        if (rejectSecrets && forbiddenKey.test(key.replaceAll(/[-_]/g, ''))) throw new TypeError('Sensitive request fields are forbidden');
        const descriptor = Object.getOwnPropertyDescriptor(item, key)!;
        if (!('value' in descriptor)) throw new TypeError('JSON accessors are forbidden');
        if (descriptor.value === undefined) continue;
        parts.push(`${JSON.stringify(key)}:${visit(descriptor.value)}`);
      }
      return `{${parts.join(',')}}`;
    } finally { seen.delete(item); }
  }
  return visit(value);
}
const sha = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
export function requestDigest(dto: unknown, protectedFingerprint?: string): string {
  if (protectedFingerprint !== undefined && !/^h1:[a-f0-9]{64}$/.test(protectedFingerprint)) throw new TypeError('Invalid protected intent fingerprint');
  return `d1:${sha(canonicalJson(['intent-v1', JSON.parse(canonicalJson(dto, true)), protectedFingerprint ?? null]))}`;
}
// For compatible credential-bearing legacy input: never store/hash plaintext in
// ordinary request evidence. The caller holds a stable private fingerprint key.
export function protectedIntentFingerprint(secret: string, scope: string, key: Uint8Array): string {
  if (key.byteLength < 32 || typeof secret !== 'string' || !secret.length || !scope.length) throw new TypeError('Protected fingerprint configuration invalid');
  return `h1:${createHmac('sha256', key).update(canonicalJson([scope, secret])).digest('hex')}`;
}
export function idempotencyKey(value: string): string {
  if (typeof value !== 'string' || !/^[\x21-\x7e]{16,128}$/.test(value)) throw new TypeError('Invalid idempotency key');
  return value;
}
export function reference(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_:-]{1,128}$/.test(value)) throw new TypeError('Invalid resource reference');
  return value;
}
export function provisionScope(slug: string): string {
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new TypeError('Invalid normalized slug');
  return `provision-gym:${slug}`;
}
export function gymScope(gymId: string): string { return `gym:${reference(gymId)}`; }
function ordinal(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Invalid event ordinal/version');
  return value;
}
export function tenantAuditKey(input: { masterGymId: string; receiptId: string; eventCode: string; resourceType: string; resourceId: string; eventOrdinal?: number }): string {
  return `ta1:${sha(canonicalJson([reference(input.masterGymId), reference(input.receiptId), reference(input.eventCode), reference(input.resourceType), reference(input.resourceId), ordinal(input.eventOrdinal ?? 0)]))}`;
}
export function masterOperationAuditKey(input: { operationId: string; stepCode: string; eventCode: string; resourceType: string; resourceId: string; eventOrdinal?: number }): string {
  return `ma1:${sha(canonicalJson([reference(input.operationId), reference(input.stepCode), reference(input.eventCode), reference(input.resourceType), reference(input.resourceId), ordinal(input.eventOrdinal ?? 0)]))}`;
}
export function masterVersionAuditKey(input: { resourceType: string; resourceId: string; committedVersion: number; eventCode: string; eventOrdinal?: number }): string {
  return `mv1:${sha(canonicalJson([reference(input.resourceType), reference(input.resourceId), ordinal(input.committedVersion), reference(input.eventCode), ordinal(input.eventOrdinal ?? 0)]))}`;
}

export const operationStates = ['PENDING', 'MASTER_PREPARED', 'TENANT_COMMITTED', 'COMPLETE', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'REPAIR_REQUIRED'] as const;
export type OperationState = typeof operationStates[number];
export const stepSequences = {
  PROVISION_GYM: ['GYM_RESERVED', 'DATABASE_CREATED', 'TENANT_TEMPLATE_VERIFIED', 'TENANT_BOUND', 'MASTER_ACTIVATED'],
  REGISTER_MEMBER: ['MASTER_PREPARED', 'TENANT_REGISTRATION_COMMITTED', 'MASTER_ACTIVATED'],
  REGISTER_TRAINER: ['MASTER_PREPARED', 'TENANT_REGISTRATION_COMMITTED', 'MASTER_ACTIVATED'],
} as const;
export type SupportedKind = keyof typeof stepSequences;
export type StepCode = typeof stepSequences[SupportedKind][number];
export type StepEvidence = {
  gymId?: string; databaseName?: string; subjectIdentityId?: string; ownerThemeId?: string;
  tenantActorId?: string; tenantCommandReceiptId?: string; tenantMembershipId?: string;
  intendedTenantTemplateVersion?: string; intendedTenantManifestDigest?: string;
  appliedTenantTemplateVersion?: string; appliedTenantManifestDigest?: string;
};
export type CompletedStep = { completedAt: string; evidence: StepEvidence };
export type CompletedSteps = Partial<Record<StepCode, CompletedStep>>;
const evidenceKeys = new Set(['gymId', 'databaseName', 'subjectIdentityId', 'ownerThemeId', 'tenantActorId', 'tenantCommandReceiptId', 'tenantMembershipId', 'intendedTenantTemplateVersion', 'intendedTenantManifestDigest', 'appliedTenantTemplateVersion', 'appliedTenantManifestDigest']);
export function validateStepEvidence(kind: SupportedKind, step: StepCode, evidence: StepEvidence): StepEvidence {
  canonicalJson(evidence);
  for (const [key, value] of Object.entries(evidence)) {
    if (!evidenceKeys.has(key) || typeof value !== 'string' || !value.length || value.length > 200) throw new TypeError('Invalid checkpoint evidence');
    if (key.endsWith('Digest') && !/^[a-f0-9]{64}$/.test(value)) throw new TypeError('Invalid manifest digest');
    if (key === 'databaseName' && !/^gymos_[a-f0-9]{32}$/.test(value)) throw new TypeError('Invalid operation database target');
  }
  const required: Record<string, string[]> = {
    GYM_RESERVED: ['gymId', 'databaseName'], DATABASE_CREATED: ['databaseName'],
    TENANT_TEMPLATE_VERIFIED: ['appliedTenantTemplateVersion', 'appliedTenantManifestDigest'],
    TENANT_BOUND: ['gymId'], MASTER_PREPARED: ['gymId', 'subjectIdentityId'],
    TENANT_REGISTRATION_COMMITTED: kind === 'REGISTER_MEMBER' ? ['tenantActorId', 'tenantCommandReceiptId', 'tenantMembershipId'] : ['tenantActorId', 'tenantCommandReceiptId'],
    MASTER_ACTIVATED: ['gymId'],
  };
  if (!(stepSequences[kind] as readonly string[]).includes(step) || (required[step] ?? []).some(key => !Object.hasOwn(evidence, key))) throw new OperationIntegrityError('Checkpoint lacks required typed evidence');
  return JSON.parse(canonicalJson(evidence));
}
export function appendStep(kind: SupportedKind, current: CompletedSteps, step: StepCode, evidence: StepEvidence, now: Date): CompletedSteps {
  const sequence = stepSequences[kind] as readonly StepCode[];
  const index = sequence.indexOf(step);
  if (index < 0 || !Number.isFinite(now.getTime())) throw new OperationIntegrityError('Invalid checkpoint');
  const validated = validateStepEvidence(kind, step, evidence);
  if (current[step]) {
    if (canonicalJson(current[step]!.evidence) !== canonicalJson(validated)) throw new OperationIntegrityError('Checkpoint cannot change committed evidence');
    return current;
  }
  if (sequence.slice(0, index).some(previous => !current[previous])) throw new OperationIntegrityError('Checkpoint cannot skip a prerequisite');
  return { ...current, [step]: { completedAt: now.toISOString(), evidence: validated } };
}
export function stateForSteps(kind: SupportedKind, steps: CompletedSteps): OperationState {
  const sequence = stepSequences[kind] as readonly StepCode[];
  if (steps.MASTER_ACTIVATED) return 'COMPLETE';
  if (steps.TENANT_REGISTRATION_COMMITTED || steps.TENANT_BOUND) return 'TENANT_COMMITTED';
  if (sequence.some(step => !!steps[step])) return 'MASTER_PREPARED';
  return 'PENDING';
}
export type SafeResult = {
  operationId?: string; state?: OperationState; step?: StepCode; version?: number;
  resourceIds?: string[]; publicationState?: 'PENDING' | 'ACTIVE' | 'FAILED';
  notificationState?: 'AVAILABLE' | 'QUEUED' | 'FAILED'; retryable?: boolean; refreshScopes?: string[];
};
export function safeResult(value: unknown): SafeResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('Safe result must be an object');
  canonicalJson(value, true);
  const allowed = new Set(['operationId', 'state', 'step', 'version', 'resourceIds', 'publicationState', 'notificationState', 'retryable', 'refreshScopes']);
  for (const [key, item] of Object.entries(value)) {
    if (!allowed.has(key)) throw new TypeError('Unsafe operation result field');
    if (key === 'operationId') reference(item);
    if (key === 'state' && !operationStates.includes(item as OperationState)) throw new TypeError('Invalid state');
    if (key === 'step' && !Object.values(stepSequences).some(sequence => (sequence as readonly string[]).includes(item as string))) throw new TypeError('Invalid step');
    if (key === 'version') ordinal(item as number);
    if (key === 'retryable' && typeof item !== 'boolean') throw new TypeError('Invalid retryability');
    if (key === 'publicationState' && !['PENDING', 'ACTIVE', 'FAILED'].includes(item as string)) throw new TypeError('Invalid publication');
    if (key === 'notificationState' && !['AVAILABLE', 'QUEUED', 'FAILED'].includes(item as string)) throw new TypeError('Invalid delivery state');
    if (key === 'resourceIds' || key === 'refreshScopes') {
      if (!Array.isArray(item) || item.length > 1000) throw new TypeError('Invalid result list');
      for (const entry of item) {
        if (key === 'resourceIds') reference(entry);
        else if (typeof entry !== 'string' || !/^[A-Za-z0-9_:/.-]{1,128}$/.test(entry)) throw new TypeError('Invalid refresh scope');
      }
    }
  }
  return JSON.parse(canonicalJson(value));
}
export function contentDigest(value: unknown): string { return sha(canonicalJson(value, true)); }
