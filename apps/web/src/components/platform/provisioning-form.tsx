'use client';
import { useState } from 'react';
import { Check, Clock3, RefreshCw } from 'lucide-react';
import { createGym, readProvisioningStatus } from '@/app/actions';
import type { PlatformOperation } from '@gymos/contracts/platform';
import { Button, Feedback, Field } from '@/components/ui';

export function ProvisioningForm({ requestKey }: { requestKey: string }) {
  const [key] = useState(requestKey);
  const [draft, setDraft] = useState({ name: '', slug: '', ownerEmail: '', currency: 'LKR', timezone: 'Asia/Colombo' });
  const [operation, setOperation] = useState<PlatformOperation | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const update = (field: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [field]: value }));
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
  return <div className="platform-provisioning">
    <form action={submit} className="platform-create-form">
      <input type="hidden" name="requestKey" value={key}/>
      <Field label="Gym name" name="name" minLength={2} maxLength={100} required readOnly={Boolean(operation)} placeholder="e.g. Summit Fitness" value={draft.name} onChange={event => update('name', event.currentTarget.value)}/>
      <Field label="Gym slug" name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} required readOnly={Boolean(operation)} hint="A unique web address using lowercase letters, numbers and hyphens." placeholder="summit-fitness" value={draft.slug} onChange={event => update('slug', event.currentTarget.value)}/>
      <Field className="platform-field-wide" label="Owner email" type="email" name="ownerEmail" required readOnly={Boolean(operation)} hint="Existing account holders privately approve access. New owners receive one-time sign-in details." placeholder="owner@example.com" value={draft.ownerEmail} onChange={event => update('ownerEmail', event.currentTarget.value)}/>
      <label className="ui-field"><span className="ui-field-label">Currency</span>{operation ? <input aria-label="Currency" name="currency" value={draft.currency} readOnly/> : <select aria-label="Currency" name="currency" required value={draft.currency} onChange={event => update('currency', event.currentTarget.value)}><option value="LKR">LKR · Sri Lankan rupee</option><option value="USD">USD · US dollar</option></select>}</label>
      <Field label="Timezone" name="timezone" maxLength={100} required readOnly={Boolean(operation)} hint="Use an IANA time zone, such as Asia/Colombo." value={draft.timezone} onChange={event => update('timezone', event.currentTarget.value)}/>
      {!operation ? <div className="platform-create-actions"><p>A workspace becomes available after setup and owner verification complete.</p><Button type="submit" pending={pending} pendingLabel="Creating workspace…">Create gym</Button></div> : null}
    </form>
    {error ? <Feedback tone="error">{error}</Feedback> : null}
    {operation ? <section className="platform-operation platform-setup-result" aria-label="Provisioning status" aria-live="polite">
      <div className="platform-setup-heading"><span className="platform-section-icon">{operation.state === 'COMPLETE' ? <Check size={21}/> : <Clock3 size={21}/>}</span><div><h3>{operation.state === 'COMPLETE' ? 'Your gym workspace is ready' : 'Workspace setup is in progress'}</h3><p>{operation.gym.name}</p></div></div>
      <Feedback tone={operation.state === 'COMPLETE' ? 'success' : operation.state.includes('FAILED') || operation.state === 'REPAIR_REQUIRED' ? 'error' : 'info'}>{operation.state === 'COMPLETE' ? `${operation.gym.name} is active.` : `${operation.gym.name}: ${operation.state.replaceAll('_', ' ')}. The gym remains unavailable until provisioning completes.`}</Feedback>
      {operation.ownerVerificationRequired ? <p>The existing owner must approve this gym in their own signed-in session. Their password will not be changed.</p> : null}
      <details className="platform-operation-details"><summary>Request details</summary><p>Operation <code>{operation.operationId}</code></p><p>{operation.step.replaceAll('_', ' ')}</p></details>
      <div className="platform-setup-actions"><Button variant="secondary" type="button" onClick={refresh} pending={pending} pendingLabel="Checking…"><RefreshCw size={16}/> Refresh status</Button><a className="platform-text-link" href="/admin#gym-registry">Return to registry</a></div>
    </section> : null}
  </div>;
}
