export type AccessLink = {
  userId: string;
  gymId: string;
  role: 'OWNER' | 'MEMBER' | 'TRAINER';
  linkStatus: string;
  actorKind: string | null;
  tenantActorId: string | null;
  enrollmentOperationId: string | null;
};
export type TenantActor = {
  kind: 'MEMBER' | 'TRAINER';
  id: string;
  identityId: string | null;
  registrationState: string;
  enrollmentOperationId: string | null;
  status: string;
};

// Callers supply current verified database evidence, never a browser assertion.
// An absent task004 operation or task005 binding is explicitly false, not implied
// by a COMPLETE tenant row. Full request/resource policies belong to task018.
export function isOperationalActor(input: {
  identityId: string;
  gymId: string;
  gymStatus: string;
  bindingVerified: boolean;
  operationComplete: boolean;
  access: AccessLink | null;
  actor: TenantActor | null;
}): boolean {
  const { access, actor } = input;
  if (!input.bindingVerified || input.gymStatus !== 'ACTIVE' || !access
    || access.linkStatus !== 'ACTIVE' || access.userId !== input.identityId
    || access.gymId !== input.gymId) return false;
  if (access.role === 'OWNER') {
    return access.actorKind === null && access.tenantActorId === null && actor === null;
  }
  return input.operationComplete === true && actor !== null
    && access.actorKind === access.role && actor.kind === access.role
    && access.tenantActorId === actor.id
    && actor.identityId === input.identityId && actor.registrationState === 'COMPLETE'
    && access.enrollmentOperationId !== null
    && access.enrollmentOperationId === actor.enrollmentOperationId
    && actor.status === 'ACTIVE';
}
