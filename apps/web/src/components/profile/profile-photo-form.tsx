'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { changeProfilePhoto } from '@/app/profile-actions';
import { Button, Card, CardHeader, Feedback, Field } from '@/components/ui';
import { initialProfileActionState } from '@/lib/profile-action-state';

export function ProfilePhotoForm({ slug, version, hasPhoto, requestKey }: { slug: string; version: number; hasPhoto: boolean; requestKey: string }) {
  const [state, action, pending] = useActionState(changeProfilePhoto.bind(null, slug, version, requestKey), initialProfileActionState);
  return <Card><CardHeader title="Profile photo"/>
    {hasPhoto ? <Image alt="Your profile photo" unoptimized width={96} height={96}
      src={`/api/gyms/${slug}/profile-photo?v=${version}`} style={{ borderRadius: '50%', objectFit: 'cover' }}/> : null}
    <form action={action} className="stack-form">
      <Field label="Choose a photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" hint="JPEG, PNG or WebP up to 768 KB."/>
      <div className="platform-card-actions">
        <Button type="submit" name="operation" value="upload" pending={pending}>{hasPhoto ? 'Replace photo' : 'Upload photo'}</Button>
        {hasPhoto ? <Button type="submit" name="operation" value="remove" variant="secondary" disabled={pending}>Remove photo</Button> : null}
      </div>
    </form>
    {state.message ? <div role="status"><Feedback tone={state.status === 'error' ? 'error' : 'success'}>{state.message}</Feedback></div> : null}
  </Card>;
}
