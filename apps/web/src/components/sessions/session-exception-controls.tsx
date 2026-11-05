'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionDetail, SessionExceptionIntent, SessionExceptionQuote } from '@gymos/contracts';
import styles from './session-detail.module.css';
import { ConfirmDialog, Feedback } from '@/components/ui';
import { loadSessionSlots } from '@/app/availability-actions';
import { commitSessionException, quoteSessionException, type ExceptionState } from '@/app/session-exception-actions';

const labels = { CANCEL: 'Cancel booking', RESCHEDULE: 'Reschedule booking', CORRECTION: 'Correct a recorded outcome', REMEDY: 'Approve source credit expiry remedy' };
export function SessionExceptionControls({ slug, data }: { slug: string; data: SessionDetail }) {
  const recovery = data.ownerRecovery;
  const [kind, setKind] = useState('');
  const [localDate, setLocalDate] = useState('');
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof loadSessionSlots>>>({ error: 'Choose a replacement date.' });
  const [slot, setSlot] = useState('');
  const [target, setTarget] = useState('FREE_CANCELLED');
  const [state, setState] = useState<ExceptionState>({});
  const [review, setReview] = useState<{ intent: SessionExceptionIntent; quote: SessionExceptionQuote; key: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [loading, startSlotLoad] = useTransition();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    if (!localDate || kind !== 'RESCHEDULE') return;
    startSlotLoad(async () => { const result = await loadSessionSlots(slug, data.session.trainerId, localDate, data.session.memberId, data.session.id); if (active) { setSlots(result); setSlot(''); } });
    return () => { active = false; };
  }, [slug, localDate, kind, data.session.id, data.session.memberId, data.session.trainerId]);
  if (!recovery?.latestEventId || !recovery.allowedKinds.length) return null;
  const time = (instant: string, timeZone = data.session.gymTimeZone) => new Intl.DateTimeFormat('en-GB', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant));
  function preview(form: FormData) {
    const common = { kind, expectedVersion: data.session.version, sourceEventId: recovery!.latestEventId!, reason: String(form.get('reason') ?? '') };
    const selected = slots.data?.slots.find(item => item.startAt === slot);
    const expiry = String(form.get('expiry') ?? '');
    const actualOffset = String(form.get('actualOffset') ?? '+00:00');
    const actualInstant = (name: string) => { const value = String(form.get(name) ?? ''); return `${value}${value.length === 16 ? ':00' : ''}${actualOffset}`; };
    const intent = { ...common,
      ...(kind === 'CANCEL' || kind === 'RESCHEDULE' ? { initiatedBy: String(form.get('initiatedBy')) } : {}),
      ...(kind === 'RESCHEDULE' ? { localDate, localTime: selected?.localTime ?? '', offset: selected?.offset, ...(expiry ? { newEndDateExclusive: expiry } : {}) } : {}),
      ...(kind === 'REMEDY' ? { newEndDateExclusive: expiry } : {}),
      ...(kind === 'CORRECTION' ? { target, ...(target === 'COMPLETED' ? { actualStartedAt: actualInstant('actualStart'), actualEndedAt: actualInstant('actualEnd') } : {}) } : {}),
    };
    startTransition(async () => { const result = await quoteSessionException(slug,data.session.id,intent); setState(result); if (result.quote) setReview({ intent: intent as SessionExceptionIntent, quote: result.quote, key: crypto.randomUUID() }); });
  }
  function commit() {
    if (!review) return;
    startTransition(async () => { const result = await commitSessionException(slug,data.session.id,{ intent: review.intent, quoteToken: review.quote.quoteToken, idempotencyKey: review.key }); setState(result); if (result.success) { setReview(null); setKind(''); router.refresh(); } });
  }
  return <div id="owner-recovery" className={`ui-form-stack ${styles.controls}`}><h2>Owner resolution</h2>
    {recovery.latestReason ? <p>Latest owner reason: {recovery.latestReason}</p> : null}
    <form action={preview} className="ui-form-stack">
      <label className="ui-field">Action<select value={kind} onChange={event => { setKind(event.target.value); setState({}); }} required disabled={pending || Boolean(review)}><option value="">Choose an action</option>{recovery.allowedKinds.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
      {kind ? <>
        {kind === 'CANCEL' || kind === 'RESCHEDULE' ? <label className="ui-field">Who requested the change?<select name="initiatedBy" required disabled={pending || Boolean(review)}><option value="MEMBER">Member</option><option value="TRAINER">Trainer</option><option value="GYM">Gym</option></select></label> : null}
        {kind === 'RESCHEDULE' ? <><label className="ui-field">Replacement date ({slots.data?.timeZone ?? data.session.gymTimeZone})<input type="date" value={localDate} onChange={event => setLocalDate(event.target.value)} required disabled={pending || Boolean(review)}/></label>
          <label className="ui-field">Available replacement time<select value={slot} onChange={event => setSlot(event.target.value)} required disabled={pending || loading || Boolean(review)}><option value="">{loading ? 'Loading…' : 'Choose a time'}</option>{slots.data?.slots.map(item => <option key={item.startAt} value={item.startAt}>{item.localTime} UTC{item.offset}</option>)}</select></label>{slots.error ? <Feedback tone="error">{slots.error}</Feedback> : null}</> : null}
        {kind === 'REMEDY' || kind === 'RESCHEDULE' ? <label className="ui-field">{kind === 'REMEDY' ? 'New source-credit expiry (exclusive)' : 'Optional gym-side source-credit remedy expiry (exclusive)'}<input type="date" name="expiry" required={kind === 'REMEDY'} disabled={pending || Boolean(review)}/><small>The credit can be used before this gym-local date. This changes only the affected unit. Member-requested rescheduling cannot use this remedy.</small></label> : null}
        {kind === 'CORRECTION' ? <><label className="ui-field">Correct outcome<select value={target} onChange={event => setTarget(event.target.value)} disabled={pending || Boolean(review)}><option value="FREE_CANCELLED">Cancelled without a charge / reverse mistaken charge</option><option value="COMPLETED">Training was delivered</option><option value="MISSED">Member did not attend</option><option value="LATE_CANCELLED">Member cancelled late</option></select></label>
          {target === 'COMPLETED' ? <><p>Enter the actual training times in {data.session.gymTimeZone}. Check the offset if daylight-saving time changed.</p><label className="ui-field">Actual start<input name="actualStart" type="datetime-local" required disabled={pending || Boolean(review)}/></label><label className="ui-field">Actual end<input name="actualEnd" type="datetime-local" required disabled={pending || Boolean(review)}/></label><label className="ui-field">UTC offset for these actual times<input name="actualOffset" pattern="[+-][0-9]{2}:[0-9]{2}" defaultValue={new Intl.DateTimeFormat('en-GB',{timeZone:data.session.gymTimeZone,timeZoneName:'longOffset'}).formatToParts(new Date(data.session.scheduledStartAt)).find(part=>part.type==='timeZoneName')?.value.replace('GMT','') || '+00:00'} required disabled={pending || Boolean(review)}/></label></> : null}</> : null}
        <label className="ui-field">Owner reason<textarea name="reason" required maxLength={500} rows={3} disabled={pending || Boolean(review)}/><small>Recorded in the owner adjustment history. The member and trainer receive the outcome.</small></label>
        {!review ? <button className="ui-button ui-button-secondary" type="submit" disabled={pending || loading}>{pending ? 'Checking…' : 'Review exact effects'}</button> : null}
      </> : null}
    </form>
    <ConfirmDialog pending={pending} open={Boolean(review)} title="Confirm owner resolution" description={review?.quote.consequence} confirmLabel={state.outcomeUnknown ? 'Retry same change' : 'Confirm reviewed effects'} onClose={() => { if (!pending && !state.outcomeUnknown) { setReview(null); setState({}); } }} onConfirm={() => { if (!pending) commit(); }}>
      {review ? <div className={`ui-form-stack ${styles.review}`}>
        <p><strong>Owner reason:</strong> {review.intent.reason}</p>
        <dl>
          <dt>Original appointment</dt><dd>{time(review.quote.oldStartAt)}–{time(review.quote.oldEndAt)} · {review.quote.timeZone}</dd>
          <dt>Cancellation cutoff</dt><dd>{time(review.quote.cancellationCutoff)}</dd>
          <dt>Outcome</dt><dd>{review.quote.targetOutcome.replaceAll('_',' ').toLowerCase()} · {review.quote.sourceCreditConsumed ? 'Original credit consumed' : 'No original credit charge'}</dd>
          <dt>Source credit</dt><dd>Pack {review.quote.sourcePackId} · unit {review.quote.sourceCreditOrdinal} · {review.quote.currency} {review.quote.sourceValue}</dd>
          <dt>Source expiry (exclusive)</dt><dd>{review.quote.sourceExpiry}{review.quote.proposedExpiry ? ` → ${review.quote.proposedExpiry}` : ''}</dd>
          {review.quote.actualStartedAt ? <><dt>Actual delivery evidence</dt><dd>{time(review.quote.actualStartedAt)}–{time(review.quote.actualEndedAt!)}</dd></> : null}
          {review.quote.replacementStartAt ? <><dt>Replacement appointment</dt><dd>{time(review.quote.replacementStartAt,review.quote.replacementTimeZone!)}–{time(review.quote.replacementEndAt!,review.quote.replacementTimeZone!)} · {review.quote.replacementTimeZone}</dd><dt>Replacement credit</dt><dd>Pack {review.quote.destinationPackId} · unit {review.quote.destinationCreditOrdinal} · value {review.quote.replacementCurrency} {review.quote.destinationValue}</dd><dt>Replacement terms</dt><dd>Fee {review.quote.replacementCurrency} {review.quote.replacementFee} · stored trainer rate {review.quote.replacementPayRate}</dd></> : null}
          <dt>Operational earning change</dt><dd>{review.quote.currency} {review.quote.operationalDelta}</dd>
          <dt>Trainer pay adjustment</dt><dd>{review.quote.currency} {review.quote.trainerPayDelta}</dd>{review.quote.payAdjustmentPeriodStart ? <><dt>Adjustment pay period</dt><dd>{review.quote.payAdjustmentPeriodStart} to before {review.quote.payAdjustmentPeriodEndExclusive}</dd></> : null}
        </dl>
        <p>{review.quote.payResolution}</p><p>Member and trainer receive in-app confirmation. Quote valid through {time(review.quote.expiresAt)}.</p>
      </div> : null}
      {state.error ? <p role="alert">{state.error}</p> : null}{state.reauthenticate ? <a href="/login" target="_blank" rel="noreferrer">Sign in in a new tab, then return</a> : null}
    </ConfirmDialog>
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}{state.reauthenticate ? <a href="/login" target="_blank" rel="noreferrer">Sign in in a new tab, then return</a> : null}
    {state.success ? <Feedback tone="success">{state.success}{state.replacementSessionId ? <a href={`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(state.replacementSessionId)}`}> Open replacement booking</a> : null}</Feedback> : null}
  </div>;
}
