'use client';
import { useState } from 'react';
import { createGym, readProvisioningStatus } from '@/app/actions';
import type { PlatformOperation } from '@gymos/contracts/platform';
import { Button, Feedback, Field } from '@/components/ui';

export function ProvisioningForm({ requestKey }: { requestKey: string }) {
  const [key] = useState(requestKey);
  const [operation, setOperation] = useState<PlatformOperation | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(data: FormData) {
    setPending(true); setError('');
    try {
      const result = await createGym(data);
      if (result.operation) setOperation(result.operation); else setError(result.error);
    } finally { setPending(false); }
  }
  async function refresh() {
    if (!operation) return;
    setPending(true); setError('');
    try {
      const result = await readProvisioningStatus(operation.operationId);
      if (result.operation) setOperation(result.operation); else setError(result.error);
    } finally { setPending(false); }
  }
  return <div>
    <form action={submit} className="stack-form">
      <input type="hidden" name="requestKey" value={key} />
      <Field label="Gym name" name="name" minLength={2} maxLength={100} required readOnly={Boolean(operation)} />
      <Field label="Gym slug" name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} required readOnly={Boolean(operation)} hint="Used in the gym’s web address." />
      <Field label="Owner email" type="email" name="ownerEmail" required readOnly={Boolean(operation)} hint="New owners receive a generated one-time credential. Existing identities must privately approve access." />
      <Field label="Currency" name="currency" pattern="LKR|USD" required placeholder="LKR or USD" readOnly={Boolean(operation)} />
      <Field label="Timezone" name="timezone" required placeholder="Asia/Colombo" readOnly={Boolean(operation)} hint="An IANA timezone, for example Asia/Colombo." />
      {!operation ? <Button fullWidth type="submit" disabled={pending}>{pending ? 'Reserving…' : 'Create gym'}</Button> : null}
    </form>
    {error ? <Feedback tone="error">{error}</Feedback> : null}
    {operation ? <section className="stack-form platform-operation" aria-label="Provisioning status" aria-live="polite">
      <Feedback tone={operation.state === 'COMPLETE' ? 'success' : operation.state.includes('FAILED') || operation.state === 'REPAIR_REQUIRED' ? 'error' : 'info'}>
        {operation.state === 'COMPLETE' ? `${operation.gym.name} is active.` : `${operation.gym.name}: ${operation.state.replaceAll('_', ' ')}. The gym remains unavailable until provisioning completes.`}
      </Feedback>
      <p>Operation <code>{operation.operationId}</code> · {operation.step.replaceAll('_', ' ')}</p>
      {operation.ownerVerificationRequired ? <p>The existing owner must approve this gym in their own signed-in session. Their password will not be changed.</p> : null}
      <Button variant="secondary" type="button" onClick={refresh} disabled={pending}>{pending ? 'Checking…' : 'Refresh status'}</Button>
    </section> : null}
  </div>;
}
