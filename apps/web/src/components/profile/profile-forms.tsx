'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AccountProfile, SelfMemberProfile, SelfTrainerProfile, MemberDetail } from '@gymos/contracts';
import { Button, Card, CardHeader, Feedback, Field } from '@/components/ui';
import { correctMemberProfile, updateAccountProfile, updateGymSelfProfile } from '@/app/profile-actions';
import { initialProfileActionState } from '@/lib/profile-action-state';

export function AccountProfileForm({ profile, requestKey }: { profile: AccountProfile; requestKey: string }) {
  const [state, action, pending] = useActionState(updateAccountProfile, initialProfileActionState);
  const router = useRouter();
  useEffect(() => { if (state.status === 'success') router.refresh(); }, [state.status, router]);
  return <Card><CardHeader eyebrow="ACCOUNT IDENTITY" title="Your GymOS account"/>
    {state.message ? <div role="status"><Feedback tone={state.status === 'success' ? 'success' : 'error'}>{state.message}</Feedback></div> : null}
    <form action={action} className="profile-form">
      <Field label="Account display name" name="displayName" defaultValue={profile.displayName ?? ''} maxLength={120} required error={state.fieldErrors?.displayName}
        hint="This name appears across your GymOS account. It does not rename your official record in each gym."/>
      <label className="ui-field"><span className="ui-field-label">Login email</span><input value={profile.email} readOnly aria-readonly="true"/><span className="ui-field-hint">Login email changes require separate staff review; this app does not verify a new mailbox.</span></label>
      <p className="profile-email-help">Need to correct your login email? <Link href="/account/email-correction">Request staff help</Link></p>
      <input type="hidden" name="expectedVersion" value={profile.version}/><input type="hidden" name="idempotencyKey" value={requestKey}/>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save account name'}</Button>
    </form>
  </Card>;
}

export function GymSelfProfileForm({ slug, role, profile, requestKey }: { slug: string; role: 'MEMBER' | 'TRAINER'; profile: SelfMemberProfile | SelfTrainerProfile; requestKey: string }) {
  const [state, action, pending] = useActionState(updateGymSelfProfile.bind(null, slug, role), initialProfileActionState);
  const router = useRouter();
  useEffect(() => { if (state.status === 'success') router.refresh(); }, [state.status, router]);
  const trainer = profile as SelfTrainerProfile;
  const member = profile as SelfMemberProfile;
  return <Card><CardHeader eyebrow="GYM PROFILE" title={`${slug} official ${role === 'MEMBER' ? 'member' : 'trainer'} record`}/>
    <p className="muted">This is the name and profile held by this gym. Changing your GymOS account display name does not change it.</p>
    <div className="profile-readonly"><strong>Official gym name</strong><span>{profile.fullName}</span></div>
    {role === 'MEMBER' && member.dateOfBirth ? <div className="profile-readonly"><strong>Date of birth</strong><span>{member.dateOfBirth}</span><small>Ask the gym owner to correct this record.</small></div> : null}
    {state.message ? <div role="status"><Feedback tone={state.status === 'success' ? 'success' : 'error'}>{state.message}</Feedback></div> : null}
    <form action={action} className="profile-form">
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" maxLength={40} defaultValue={profile.phone ?? ''} optional error={state.fieldErrors?.phone}/>
      {role === 'MEMBER' ? <Field label="Emergency contact" name="emergencyContact" maxLength={240} defaultValue={member.emergencyContact ?? ''} optional error={state.fieldErrors?.emergencyContact}
        hint="Only your gym’s authorized staff can see this contact."/> : <>
        <label className="ui-field"><span className="ui-field-label">Professional biography <span>optional</span></span><textarea name="biography" rows={5} maxLength={2000} defaultValue={trainer.biography ?? ''} aria-invalid={state.fieldErrors?.biography ? true : undefined}/>{state.fieldErrors?.biography ? <span className="ui-field-error">{state.fieldErrors.biography}</span> : null}</label>
        <label className="ui-field"><span className="ui-field-label">Specialisations <span>optional</span></span><textarea name="specialisations" rows={4} maxLength={1220} defaultValue={trainer.specialisations.join('\n')} aria-invalid={state.fieldErrors?.specialisations ? true : undefined}/>{state.fieldErrors?.specialisations ? <span className="ui-field-error">{state.fieldErrors.specialisations}</span> : <span className="ui-field-hint">One specialisation per line, up to 20.</span>}</label>
        <Field label="Years of experience" name="yearsExperience" type="number" min={0} max={80} defaultValue={trainer.yearsExperience ?? ''} optional error={state.fieldErrors?.yearsExperience}/>
      </>}
      <input type="hidden" name="expectedVersion" value={profile.version}/><input type="hidden" name="idempotencyKey" value={requestKey}/>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save gym profile'}</Button>
    </form>
  </Card>;
}

export function OwnerMemberCorrectionForm({ slug, member, requestKey }: { slug: string; member: MemberDetail; requestKey: string }) {
  const [state, action, pending] = useActionState(correctMemberProfile.bind(null, slug, member.id), initialProfileActionState);
  const router = useRouter();
  useEffect(() => { if (state.status === 'success') router.refresh(); }, [state.status, router]);
  return <Card><CardHeader eyebrow="OFFICIAL GYM RECORD" title="Correct member details"/><p>These fields update this gym’s operational record only. Past session snapshots remain unchanged.</p>
    {state.message ? <div role="status"><Feedback tone={state.status === 'success' ? 'success' : 'error'}>{state.message}</Feedback></div> : null}
    <form action={action} className="profile-form">
      <Field label="Official full name" name="fullName" maxLength={120} defaultValue={member.fullName} required error={state.fieldErrors?.fullName}/>
      <Field label="Date of birth" name="dateOfBirth" type="date" defaultValue={member.dateOfBirth ?? ''} optional error={state.fieldErrors?.dateOfBirth}/>
      <Field label="Phone" name="phone" type="tel" maxLength={40} defaultValue={member.phone ?? ''} optional error={state.fieldErrors?.phone}/>
      <Field label="Emergency contact" name="emergencyContact" maxLength={240} defaultValue={member.emergencyContact ?? ''} optional error={state.fieldErrors?.emergencyContact}/>
      <label className="ui-field"><span className="ui-field-label">Correction reason</span><select name="reason" defaultValue="MEMBER_REQUEST" required aria-invalid={state.fieldErrors?.reason ? true : undefined}>
        <option value="MEMBER_REQUEST">Member requested correction</option><option value="SOURCE_DOCUMENT">Corrected from a source document</option><option value="ADMINISTRATIVE_CORRECTION">Administrative correction</option>
      </select>{state.fieldErrors?.reason ? <span className="ui-field-error">{state.fieldErrors.reason}</span> : null}</label>
      <input type="hidden" name="expectedVersion" value={member.version}/><input type="hidden" name="idempotencyKey" value={requestKey}/>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save official details'}</Button>
    </form>
  </Card>;
}
