'use client';

import { useState, type FormEvent } from 'react';
import type { PtPackOffer } from '@gymos/contracts';
import { createPtPackOffer, changePtPackOffer } from '@/app/pt-pack-offer-actions';
import { Button, Card, CardHeader, ConfirmDialog, Feedback, Field } from '@/components/ui';

type Draft = { offer: PtPackOffer | null; key: string };
type Notice = { tone: 'success' | 'error'; message: string };

export function OwnerPtPackOffers({ slug, currency, initial }: {
  slug: string; currency: string; initial: PtPackOffer[] | null;
}) {
  const [offers, setOffers] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [archiving, setArchiving] = useState<PtPackOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  function start(offer: PtPackOffer | null) {
    setNotice(null);
    setDraft({ offer, key: crypto.randomUUID() });
  }

  function remember(offer: PtPackOffer) {
    setOffers(current => [offer, ...(current ?? []).filter(previous => previous.id !== offer.id)]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busy) return;
    const form = new FormData(event.currentTarget);
    const details = {
      name: String(form.get('name') ?? ''),
      credits: Number(form.get('credits')),
      price: String(form.get('price') ?? ''),
      validityDays: Number(form.get('validityDays')),
    };
    setBusy(true);
    setNotice(null);
    const result = draft.offer
      ? await changePtPackOffer(slug, draft.offer.id, { action: 'EDIT', expectedVersion: draft.offer.version, ...details })
      : await createPtPackOffer(slug, { ...details, idempotencyKey: draft.key });
    setBusy(false);
    if (result.ok) {
      remember(result.offer);
      setDraft(null);
      setNotice({ tone: 'success', message: draft.offer ? 'PT pack offer updated.' : 'PT pack offer created.' });
    } else {
      setNotice({ tone: 'error', message: result.error });
    }
  }

  async function archive() {
    if (!archiving || busy) return;
    setBusy(true);
    setNotice(null);
    const result = await changePtPackOffer(slug, archiving.id, { action: 'ARCHIVE', expectedVersion: archiving.version });
    setBusy(false);
    if (result.ok) {
      remember(result.offer);
      setArchiving(null);
      setNotice({ tone: 'success', message: 'PT pack offer archived.' });
    } else {
      setNotice({ tone: 'error', message: result.error });
    }
  }

  return <Card className="config-card">
    <CardHeader title="PT pack offers"/>
    {notice && !archiving ? <Feedback tone={notice.tone}>{notice.message}</Feedback> : null}
    {offers === null ? <Feedback tone="error">PT pack offers could not be loaded. Refresh to try again.</Feedback> : <>
      {offers.length ? <div className="config-plan-list" role="list">
        {offers.map(offer => <article key={offer.id} role="listitem">
          <div className="config-plan-row">
            <div><strong>{offer.name}</strong><small>{offer.credits} PT {offer.credits === 1 ? 'credit' : 'credits'}</small></div>
            <span>{offer.validityDays} {offer.validityDays === 1 ? 'day' : 'days'}</span>
            <strong>{offer.currency} {offer.price}</strong>
            <span className={`config-plan-status ${offer.status.toLowerCase()}`}>{offer.status === 'ACTIVE' ? 'Active' : 'Archived'}</span>
          </div>
          {offer.status === 'ACTIVE' ? <div className="config-actions">
            <Button type="button" variant="secondary" disabled={busy || Boolean(draft)} onClick={() => start(offer)}>Edit offer</Button>
            <Button type="button" variant="secondary" disabled={busy || Boolean(draft)} onClick={() => { setNotice(null); setArchiving(offer); }}>Archive offer</Button>
          </div> : null}
        </article>)}
      </div> : <p>No PT pack offers have been added.</p>}
      {draft ? <form key={draft.key} className="config-form config-add-plan" onSubmit={submit}>
        <h3>{draft.offer ? `Edit ${draft.offer.name}` : 'Create a PT pack offer'}</h3>
        <Field label="Offer name" name="name" maxLength={80} defaultValue={draft.offer?.name} required/>
        <div className="config-two-cols">
          <Field label={`Price (${currency})`} name="price" inputMode="decimal" defaultValue={draft.offer?.price} required/>
          <Field label="PT credits" name="credits" type="number" min={1} max={1000} step={1} defaultValue={draft.offer?.credits} required/>
        </div>
        <Field label="Validity in days" name="validityDays" type="number" min={1} max={3650} step={1} defaultValue={draft.offer?.validityDays} required/>
        <div className="config-actions">
          <Button type="submit" pending={busy}>{draft.offer ? 'Save offer' : 'Create offer'}</Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setDraft(null)}>Cancel</Button>
        </div>
      </form> : <Button type="button" disabled={busy} onClick={() => start(null)}>Add PT pack offer</Button>}
      <ConfirmDialog open={Boolean(archiving)} title="Archive PT pack offer?"
        description="Members will no longer see this offer. Previously issued packs keep their credits and expiry."
        confirmLabel="Archive offer" destructive pending={busy}
        error={archiving && notice?.tone === 'error' ? notice.message : undefined}
        onClose={() => setArchiving(null)} onConfirm={() => void archive()}/>
    </>}
  </Card>;
}
