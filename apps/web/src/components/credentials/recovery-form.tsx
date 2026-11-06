'use client';

import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';
import { completeRecoveryAction } from '@/app/actions';
import { PasswordInput } from '@/components/auth/password-input';
import { Button, Feedback } from '@/components/ui';

type RecoveryCredential = { id: string; secret: string };
let capturedCredential: RecoveryCredential | null = null;
function readRecoveryCredential(): RecoveryCredential | null {
  if (capturedCredential) return capturedCredential;
  if (typeof window === 'undefined') return null;
  const match = /^#([A-Za-z0-9_:-]{1,128})\.([A-Za-z0-9_-]{43})$/.exec(window.location.hash);
  if (match) capturedCredential = { id: match[1]!, secret: match[2]! };
  return capturedCredential;
}
function subscribeRecoveryCredential(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function RecoveryForm() {
  const credential = useSyncExternalStore(subscribeRecoveryCredential, readRecoveryCredential, () => null);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (credential && window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, [credential]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true);
    const data = new FormData(event.currentTarget);
    data.set('credentialId', credential?.id ?? ''); data.set('secret', credential?.secret ?? '');
    const result = await completeRecoveryAction(data);
    if ('error' in result && result.error) { setError(result.error); setPending(false); return; }
    capturedCredential = null;
    window.dispatchEvent(new Event('hashchange'));
    setComplete(true);
  }

  if (complete) return <div role="status" className="stack-form"><Feedback tone="success">Your password was updated and your signed-in devices were revoked. Sign in again to continue.</Feedback><Link className="ui-button ui-button-primary" href="/login">Go to sign in</Link></div>;
  return <form onSubmit={submit} className="stack-form">
    {error ? <Feedback tone="error">{error}</Feedback> : null}
    {!credential ? <Feedback tone="info">Open the one-use recovery link provided by your gym owner on this device to choose a new password.</Feedback> : <>
      <PasswordInput label="New password" name="newPassword" autoComplete="new-password" minLength={10} maxLength={200}/>
      <PasswordInput label="Confirm new password" name="confirmPassword" autoComplete="new-password" maxLength={200}/>
      <p className="form-note">Use 10–200 characters, including a number or symbol, with no leading or trailing spaces.</p>
      <Button fullWidth type="submit" disabled={pending}>{pending ? 'Updating…' : 'Set new password'}</Button>
    </>}
  </form>;
}
