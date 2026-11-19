'use client';

import { useActionState, useState } from 'react';
import { deleteProgressPhoto, uploadProgressPhoto } from '@/app/progress-photo-actions';
import { Button, Card, CardHeader, Feedback, Field } from '@/components/ui';

export function UploadProgressPhotoForm({ slug, today }: { slug: string; today: string }) {
  const [state, action, pending] = useActionState(uploadProgressPhoto.bind(null, slug), {});
  const [date, setDate] = useState(today);
  return <Card>
    <CardHeader title="Add a progress photo"/>
    <form action={action} className="stack-form compact-workspace-form">
      <Field label="Date taken" name="takenOn" type="date" min="0001-01-01" max={today}
        required value={date} onChange={event => setDate(event.currentTarget.value)}/>
      <Field label="Progress photo" name="photo" type="file" required accept="image/jpeg,image/png,image/webp"
        hint="JPEG, PNG or WebP up to 768 KB."/>
      <p className="ui-field-hint">Your assigned trainers can view your progress photos. Photos are kept until you delete them.</p>
      {state.error && <Feedback tone="error">{state.error}</Feedback>}
      {state.success && <Feedback tone="success">{state.success}</Feedback>}
      <Button type="submit" pending={pending}>Upload progress photo</Button>
    </form>
  </Card>;
}

export function DeleteProgressPhotoForm({ slug, photoId }: { slug: string; photoId: string }) {
  const [state, action, pending] = useActionState(deleteProgressPhoto.bind(null, slug, photoId), {});
  return <details>
    <summary>Delete photo</summary>
    <form action={action}>
      <p>Delete this photo permanently?</p>
      {state.error && <Feedback tone="error">{state.error}</Feedback>}
      <Button type="submit" variant="danger" pending={pending}>Confirm deletion</Button>
    </form>
  </details>;
}
