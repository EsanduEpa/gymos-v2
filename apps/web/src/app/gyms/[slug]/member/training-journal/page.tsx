import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { trainingJournalQuerySchema, trainingJournalSchema } from '@gymos/contracts';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { JournalForm } from '@/components/coaching/journal-form';
import { JournalExerciseRows } from '@/components/coaching/journal-exercise-rows';
import { Card, Field } from '@/components/ui';
import { formatDisplayDate } from '@/lib/display-date';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

const goals = [
  { type: 'WEIGHT', label: 'Body weight', unit: 'kg', step: '0.01', minimum: 0.01, maximum: 700, basis: 'Your weight measurements.' },
  { type: 'STRENGTH', label: 'Strength', unit: 'kg', step: '0.01', minimum: 0.01, maximum: 1000, basis: 'The highest weight logged for this exercise each week.' },
  { type: 'SESSIONS', label: 'Weekly sessions', unit: 'sessions', step: '1', minimum: 1, maximum: 100, basis: 'Solo workouts and completed PT sessions, Monday through Sunday.' },
] as const;

export default async function TrainingJournalPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = trainingJournalQuerySchema.safeParse(await searchParams);
  if (!query.success) notFound();
  const { session, gym, token } = await requireGymContext(slug, 'MEMBER');
  const filters = new URLSearchParams();
  for (const [key, value] of Object.entries(query.data)) if (value !== undefined) filters.set(key, String(value));
  const response = await fetch(apiUrl(`/gyms/${slug}/me/training-journal?${filters}`), {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  }).catch(() => new Response(null, { status: 503 }));
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 422) notFound();
  const journal = response.ok ? trainingJournalSchema.safeParse(await response.json().catch(() => null)) : null;
  const data = journal?.success ? journal.data : null;
  const workout = data?.selectedWorkout;
  const workoutId = workout?.id ?? randomUUID();
  const nutrition = data?.selectedFood;
  const queryLink = (changes: Record<string, string>, anchor: string) => {
    const updated = new URLSearchParams(filters);
    for (const [key, value] of Object.entries(changes)) updated.set(key, value);
    return `?${updated}#${anchor}`;
  };
  return <DashboardChrome identityId={session.identityId} gym={gym} gyms={session.gyms} displayName={session.displayName ?? 'GymOS user'}>
    <main className="platform-page">
      <header className="platform-page-heading"><div><h1>Training journal</h1><p>Set fitness goals and track your own workouts and daily nutrition.</p></div></header>
      {!data ? <Card><p role="alert">Your journal is temporarily unavailable. Refresh to try again.</p></Card> : <>
        <section id="goals" className="stack-form">
          <h2>Fitness goals</h2>
          <div className="trainer-plan-list">{goals.map(goal => {
            const saved = data.goals.find(item => item.data.type === goal.type);
            return <Card key={goal.type}><h3>{goal.label}</h3><p>{goal.basis}</p>
              {saved ? <>
                <p><strong>{saved.current ?? 'No recorded value'}</strong>{saved.current === null ? '' : ` ${goal.unit}`} · Target {saved.data.target} {goal.unit}</p>
                <details><summary>Last eight weeks</summary><ul>{saved.weeks.map(week => <li key={week.startingOn}>
                  {formatDisplayDate(week.startingOn)} · {week.value === null ? 'No recorded value' : `${week.value} ${goal.unit}`}
                </li>)}</ul></details>
              </> : null}
              <JournalForm key={saved?.version ?? 'new'} slug={slug} kind={goal.type} version={saved?.version} label={`Save ${goal.label.toLowerCase()} goal`}>
                {goal.type === 'STRENGTH' ? <Field label="Exercise" name="exercise" required maxLength={120}
                  defaultValue={saved?.data.type === 'STRENGTH' ? saved.data.exercise : ''}/> : null}
                <Field id={`target-${goal.type.toLowerCase()}`} label={`Target (${goal.unit})`} name="target" type="number" min={goal.minimum} max={goal.maximum} step={goal.step}
                  required defaultValue={saved?.data.target ?? ''}/>
              </JournalForm>
            </Card>;
          })}</div>
        </section>
        <Card id="solo-workouts"><h2>Solo workouts</h2>
          {workout ? <p>Editing {formatDisplayDate(workout.data.date)}</p> : null}
          {query.data.workout && !workout ? <p role="status">That workout is unavailable.</p> : null}
          <JournalForm key={`${workoutId}:${workout?.version ?? 'new'}`} slug={slug} kind="SOLO"
            id={workoutId} version={workout?.version} label={workout ? 'Save workout changes' : 'Log workout'}>
            <Field label="Workout date" name="date" type="date" max={data.today} required defaultValue={workout?.data.date ?? data.today}/>
            <Field label="Duration (minutes)" name="duration" type="number" min={1} max={1440} required defaultValue={workout?.data.durationMinutes ?? ''}/>
            <JournalExerciseRows exercises={workout?.data.exercises}/>
            <label className="ui-field"><span className="ui-field-label">Workout notes</span>
              <textarea name="notes" rows={3} maxLength={4000} defaultValue={workout?.data.notes}/>
            </label>
          </JournalForm>
          {workout ? <p><a className="platform-text-link" href="?workoutPage=1#solo-workouts">Log a new workout</a></p> : null}
          {data.solo.length ? <ul>{data.solo.map(({ id, data: item }) => <li key={id}>
            <a className="platform-text-link" href={queryLink({ workout: id }, 'solo-workouts')}>{formatDisplayDate(item.date)} · {item.durationMinutes} min · {item.exercises.map(exercise => exercise.name).join(', ')}</a>
          </li>)}</ul> : <p>No workouts on this page.</p>}
          <nav className="trainer-plan-pagination" aria-label="Workout history">
            {query.data.workoutPage > 1 ? <a href={queryLink({ workoutPage: String(query.data.workoutPage - 1) }, 'solo-workouts')}>Newer workouts</a> : null}
            {data.moreWorkouts ? <a href={queryLink({ workoutPage: String(query.data.workoutPage + 1) }, 'solo-workouts')}>Earlier workouts</a> : null}
          </nav>
        </Card>
        <Card id="daily-nutrition"><h2>Daily nutrition</h2>
          <form method="get" action="#daily-nutrition" className="stack-form">
            <Field label="Choose nutrition date" name="date" type="date" required max={data.today} defaultValue={data.date}/>
            <button className="ui-button ui-button-secondary" type="submit">Open date</button>
          </form>
          <JournalForm key={`${data.date}:${nutrition?.version ?? 'new'}`} slug={slug} kind="FOOD" version={nutrition?.version} label="Save daily nutrition">
            <input type="hidden" name="date" value={data.date}/>
            <h3>{formatDisplayDate(data.date)}</h3>
            <Field label="Calories" name="calories" type="number" min={0} max={100000} required defaultValue={nutrition?.data.calories ?? ''}/>
            <Field label="Protein (g)" name="protein" type="number" min={0} max={10000} step="0.01" required defaultValue={nutrition?.data.protein ?? ''}/>
            <Field label="Carbohydrates (g)" name="carbs" type="number" min={0} max={10000} step="0.01" required defaultValue={nutrition?.data.carbs ?? ''}/>
            <Field label="Fat (g)" name="fat" type="number" min={0} max={10000} step="0.01" required defaultValue={nutrition?.data.fat ?? ''}/>
          </JournalForm>
          {data.food.length ? <ul>{data.food.map(({ data: item }) => <li key={item.date}>
            <a className="platform-text-link" href={queryLink({ date: item.date }, 'daily-nutrition')}>
              {formatDisplayDate(item.date)} · {item.calories} kcal · {item.protein} g protein · {item.carbs} g carbs · {item.fat} g fat
            </a>
          </li>)}</ul> : <p>No nutrition entries on this page.</p>}
          <nav className="trainer-plan-pagination" aria-label="Nutrition history">
            {query.data.foodPage > 1 ? <a href={queryLink({ foodPage: String(query.data.foodPage - 1) }, 'daily-nutrition')}>Newer entries</a> : null}
            {data.moreFood ? <a href={queryLink({ foodPage: String(query.data.foodPage + 1) }, 'daily-nutrition')}>Earlier entries</a> : null}
          </nav>
        </Card>
      </>}
    </main>
  </DashboardChrome>;
}
