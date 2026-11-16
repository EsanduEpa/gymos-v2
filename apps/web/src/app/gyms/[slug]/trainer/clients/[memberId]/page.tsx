import { formatDisplayDate } from '@/lib/display-date';
import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { dietaryProfileSchema, trainerClientProfileSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, Feedback } from '@/components/ui';
import { DietaryProfileForm } from '@/components/coaching/coaching-record-forms';
import { apiUrl } from '@/lib/gymos';
import { requireGymContext } from '@/lib/gym-context';
import styles from '@/components/coaching/trainer-client-profile.module.css';

export default async function TrainerClientProfilePage({ params }: { params: Promise<{ slug: string; memberId: string }> }) {
  const { slug, memberId } = await params;
  const { token, session, gym, theme } = await requireGymContext(slug, 'TRAINER');
  const base = `/gyms/${encodeURIComponent(slug)}`;
  const client = encodeURIComponent(memberId);
  const read = (path: string) => fetch(apiUrl(path), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  }).catch(() => new Response(null, { status: 503 }));
  const [response, dietaryResponse] = await Promise.all([
    read(`${base}/me/clients/${client}`),
    read(`${base}/me/clients/${client}/dietary-profile`),
  ]);
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  const profile = response.ok ? trainerClientProfileSchema.safeParse(await response.json().catch(() => null)) : null;
  const dietary = dietaryResponse.ok ? dietaryProfileSchema.safeParse(await dietaryResponse.json().catch(() => null)) : null;
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">TRAINER PROFILE</span><h1>{profile?.success ? profile.data.client.fullName : 'Client profile'}</h1>
      <p>Your client’s details, assigned plans and session history.</p></div><a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/clients`}>Back to clients</a></div>
    {!profile?.success ? <Card><Feedback tone="error">This client profile could not be loaded. Refresh to retry.</Feedback></Card> : <>
      <nav className={styles.tabs} aria-label="Client profile sections">
        <a id="overview-tab" href="#overview" aria-controls="overview">Overview</a><a id="workouts-tab" href="#workouts" aria-controls="workouts">Workouts</a><a id="meals-tab" href="#meals" aria-controls="meals">Meal plans</a><a id="history-tab" href="#history" aria-controls="history">Session history</a><a href={`${base}/trainer/clients/${client}/progress`}>Progress report</a>
      </nav>
      <section id="overview" aria-labelledby="overview-tab"><Card><CardHeader eyebrow="CLIENT OVERVIEW" title={profile.data.client.fullName}/>
        <dl className={styles.details}>
          <div><dt>Email</dt><dd>{profile.data.client.email ?? 'Not provided'}</dd></div>
          <div><dt>Phone</dt><dd>{profile.data.client.phone ?? 'Not provided'}</dd></div>
          <div><dt>Date of birth</dt><dd>{profile.data.client.dateOfBirth ? <time dateTime={profile.data.client.dateOfBirth}>{formatDisplayDate(profile.data.client.dateOfBirth)}</time> : 'Not provided'}</dd></div>
          <div><dt>Emergency contact</dt><dd>{profile.data.client.emergencyContact ?? 'Not provided'}</dd></div>
          <div><dt>Member status</dt><dd>{profile.data.client.status.toLowerCase()}</dd></div>
          <div><dt>Pack balance</dt><dd>{profile.data.packSummary.available} available · {profile.data.packSummary.held} held · {profile.data.packSummary.consumed} used · {profile.data.packSummary.expired} expired</dd></div>
        </dl>
        <div className={styles.health}><h2>Health notes</h2><p>{profile.data.client.healthNotes || 'No health notes recorded.'}</p></div>
      </Card></section>
      <section id="workouts" aria-labelledby="workouts-tab"><Card><CardHeader eyebrow="LATEST TWO" title="Workout plans"/>
        <p className={styles.hint}>Showing the two latest assigned workout plans. {profile.data.workouts.hasMore ? `There are ${profile.data.workouts.totalCount - profile.data.workouts.items.length} older plans.` : 'No older workout plans.'}</p>
        {profile.data.workouts.items.length === 0 ? <div className="ui-empty-state"><h2>No workout plans</h2><p>Create and explicitly assign a workout plan to this client.</p></div> :
          <div className={styles.planList}>{profile.data.workouts.items.map(plan => <article className={styles.plan} key={plan.id}>
            <h3>{plan.name}</h3>{plan.description ? <p>{plan.description}</p> : null}<small>{new Date(plan.createdAt).toLocaleString(undefined, { timeZone: profile.data.timeZone })}</small>
            <ol>{plan.exercises.map(exercise => <li key={exercise.id}>{exercise.name} · {exercise.sets} sets{exercise.reps !== null ? ` × ${exercise.reps} reps` : ''}{exercise.weightKg !== null ? ` · ${exercise.weightKg} kg` : ''}{exercise.notes ? ` · ${exercise.notes}` : ''}</li>)}</ol>
            <a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/trainer/plans/workout/${encodeURIComponent(plan.id)}/edit?memberId=${encodeURIComponent(profile.data.client.id)}`}>Edit workout plan</a>
          </article>)}</div>}
        <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/plans/workout/new?memberId=${encodeURIComponent(profile.data.client.id)}`}>Create workout plan</a>
        {profile.data.workouts.items.length > 0 ? <a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(profile.data.client.id)}/plans/workout`}>View all workout plans</a> : null}
      </Card></section>
      <section aria-label="Dietary notes"><Card><CardHeader title="Dietary notes"/>
        {dietary?.success ? <DietaryProfileForm slug={slug} memberId={memberId} initial={dietary.data}/> :
          <Feedback tone="error">Dietary notes could not be loaded. Refresh to try again.</Feedback>}
      </Card></section>
      <section id="meals" aria-labelledby="meals-tab"><Card><CardHeader eyebrow="LATEST TWO" title="Meal plans"/>
        <p className={styles.hint}>Showing the two latest assigned meal plans. {profile.data.meals.hasMore ? `There are ${profile.data.meals.totalCount - profile.data.meals.items.length} older plans.` : 'No older meal plans.'}</p>
        {profile.data.meals.items.length === 0 ? <div className="ui-empty-state"><h2>No meal plans</h2><p>Create and explicitly assign a meal plan to this client.</p></div> :
          <div className={styles.planList}>{profile.data.meals.items.map(plan => <article className={styles.plan} key={plan.id}><h3>{plan.name}</h3>
            <p>{plan.totals.calories} kcal · Protein {plan.totals.proteinGrams ?? '0'} g · Carbs {plan.totals.carbsGrams ?? '0'} g · Fat {plan.totals.fatsGrams ?? '0'} g</p>
            <ul>{plan.entries.map(entry => <li key={entry.id}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][entry.dayOfWeek - 1]} · {entry.mealType} · {entry.foodItem}{entry.calories !== null ? ` · ${entry.calories} kcal` : ''}</li>)}</ul>
            <a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/trainer/plans/meal/${encodeURIComponent(plan.id)}/edit?memberId=${encodeURIComponent(profile.data.client.id)}`}>Edit meal plan</a></article>)}</div>}
        <a className="ui-button ui-button-secondary" href={`/gyms/${encodeURIComponent(slug)}/trainer/plans/meal/new?memberId=${encodeURIComponent(profile.data.client.id)}`}>Create meal plan</a>
        {profile.data.meals.hasMore ? <a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/trainer/clients/${encodeURIComponent(profile.data.client.id)}/plans/meal`}>View all meal plans</a> : null}
      </Card></section>
      <section id="history" aria-labelledby="history-tab"><Card><CardHeader eyebrow="LATEST TEN" title="Session history"/>
        <p className={styles.hint}>Showing {profile.data.recentSessions.items.length} of {profile.data.recentSessions.totalCount} related sessions{profile.data.recentSessions.hasMore ? '; older sessions are available.' : '.'}</p>
        {profile.data.recentSessions.items.length === 0 ? <div className="ui-empty-state"><h2>No sessions yet</h2><p>Related session history will appear here.</p></div> :
          <ol className={styles.history}>{profile.data.recentSessions.items.map(item => <li key={item.id}><a className="platform-text-link" href={`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(item.id)}`}>{item.state.replaceAll('_', ' ').toLowerCase()}</a>
            <time dateTime={item.scheduledStartAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: profile.data.timeZone }).format(new Date(item.scheduledStartAt))}</time>
            {item.notes ? <p>{item.notes}</p> : null}</li>)}</ol>}
      </Card></section>
    </>}
  </DashboardChrome>;
}
