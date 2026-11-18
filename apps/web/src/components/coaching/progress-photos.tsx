import Image from 'next/image';
import type { ProgressReport } from '@gymos/contracts';
import { formatDisplayDate } from '@/lib/display-date';
import { DeleteProgressPhotoForm } from './progress-photo-forms';
import styles from './progress-report.module.css';

type Photo = ProgressReport['photos'][number];

export function ProgressPhotos({ photos, slug, memberId }: { photos: Photo[]; slug: string; memberId?: string }) {
  const first = photos[0];
  const latest = photos.at(-1);
  const image = (photo: Photo) => {
    const search = new URLSearchParams({ expiresAt: photo.expiresAt, signature: photo.signature });
    if (memberId) search.set('memberId', memberId);
    const src = `/api/gyms/${encodeURIComponent(slug)}/progress-photos/${encodeURIComponent(photo.id)}?${search}`;
    return <Image src={src} alt="Progress photo" width={384} height={384} unoptimized referrerPolicy="no-referrer"/>;
  };
  const date = (photo: Photo) => <time dateTime={photo.takenOn}>{formatDisplayDate(photo.takenOn)}</time>;
  return <section aria-label="Progress photos" className={styles.photos}>
    <h3>Progress photos</h3>
    {first && latest ? <>
      {first.id !== latest.id && <div aria-label="First and latest photo comparison" role="group" className={styles.comparison}>
        <figure>{image(first)}<figcaption>First · {date(first)}</figcaption></figure>
        <figure>{image(latest)}<figcaption>Latest · {date(latest)}</figcaption></figure>
      </div>}
      <h4>Photo timeline</h4>
      <ul className={styles.timeline} aria-label="Photo timeline">
        {[...photos].reverse().map(photo => <li key={photo.id}>
          <figure>{image(photo)}<figcaption>{date(photo)}</figcaption></figure>
          {memberId === undefined && <DeleteProgressPhotoForm slug={slug} photoId={photo.id}/>}
        </li>)}
      </ul>
      <p className="ui-field-hint">Photo links expire after one hour. Refresh the report to view them again.</p>
    </> : <p>No photos recorded during this period.</p>}
  </section>;
}
