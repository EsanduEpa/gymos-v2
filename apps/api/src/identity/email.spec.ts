import { identityEmailSchema, normalizeIdentityEmail } from './email.js';
import { isOperationalActor } from './publication-policy.js';

describe('identity boundary', () => {
  it('canonicalizes ASCII email while retaining provider-specific address syntax', () => {
    expect(normalizeIdentityEmail('  A.B+Gym@Example.TEST ')).toBe('a.b+gym@example.test');
    expect(normalizeIdentityEmail('a.b@example.test')).not.toBe(normalizeIdentityEmail('ab@example.test'));
  });
  it.each(['é@example.test', 'a@exämple.test', 'a b@example.test', 'bad', '', null])('rejects malformed or unsupported email', (value) => {
    expect(identityEmailSchema.safeParse(value).success).toBe(false);
  });
  it('requires explicit binding and operation evidence before publication', () => {
    expect(isOperationalActor({ identityId: 'identity', gymId: 'gym', gymStatus: 'ACTIVE',
      bindingVerified: true, operationComplete: false,
      access: { userId: 'identity', gymId: 'gym', role: 'MEMBER', linkStatus: 'ACTIVE',
        actorKind: 'MEMBER', tenantActorId: 'actor', enrollmentOperationId: 'operation' },
      actor: { kind: 'MEMBER', id: 'actor', identityId: 'identity', registrationState: 'COMPLETE',
        enrollmentOperationId: 'operation', status: 'ACTIVE' },
    })).toBe(false);
  });
});
