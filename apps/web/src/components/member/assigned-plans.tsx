import { CalendarDays, ChevronDown, Dumbbell, Utensils } from 'lucide-react';
import type { MemberMealPlanPage, MemberWorkoutPlanPage } from '@gymos/contracts';

function dateLabel(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, dateStyle: 'medium' }).format(new Date(value));
}
export function AssignedWorkout({ plan, timeZone }: { plan: MemberWorkoutPlanPage['items'][number]; timeZone: string }) {
  return <article className="member-plan member-workout-plan" id={`workout-${plan.id}`}>
    <header className="member-plan-heading"><span className="member-plan-icon"><Dumbbell size={23}/></span><div><span className="platform-eyebrow">TRAINER ASSIGNED</span><h2>{plan.name}</h2><time dateTime={plan.createdAt}>Assigned {dateLabel(plan.createdAt, timeZone)}</time></div><span className="member-tag">{plan.exercises.length} exercises</span></header>
    {plan.description ? <p className="member-plan-description">{plan.description}</p> : null}
    <ol className="member-workout-exercises">{plan.exercises.map((exercise, index) => <li key={exercise.id}><span className="member-exercise-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div className="member-exercise-body"><h3>{exercise.name}</h3><dl><div><dt>Sets</dt><dd>{exercise.sets}</dd></div>{exercise.reps !== null ? <div><dt>Repetitions</dt><dd>{exercise.reps}</dd></div> : null}{exercise.weightKg !== null ? <div><dt>Weight</dt><dd>{exercise.weightKg} kg</dd></div> : null}{exercise.durationMinutes !== null ? <div><dt>Duration</dt><dd>{exercise.durationMinutes} min</dd></div> : null}</dl>{exercise.notes ? <p className="member-exercise-notes">{exercise.notes}</p> : null}</div></li>)}</ol>
  </article>;
}
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function AssignedMealPlan({ plan, timeZone }: { plan: MemberMealPlanPage['items'][number]; timeZone: string }) {
  return <article className="member-plan member-meal-plan" id={`meal-${plan.id}`}>
    <header className="member-plan-heading"><span className="member-plan-icon"><Utensils size={23}/></span><div><span className="platform-eyebrow">YOUR WEEKLY MEAL PLAN</span><h2>{plan.name}</h2><time dateTime={plan.createdAt}>Assigned {dateLabel(plan.createdAt, timeZone)}</time></div><span className="member-tag"><CalendarDays size={14}/> Weekly plan</span></header>
    <section className="member-nutrition-totals" aria-label={`Recorded nutrition totals for ${plan.name}`}><h3>Recorded plan totals</h3><dl>{[['Calories', plan.entries.some(entry => entry.calories !== null) ? plan.totals.calories : null, 'kcal'], ['Protein', plan.totals.proteinGrams, 'g'], ['Carbs', plan.totals.carbsGrams, 'g'], ['Fat', plan.totals.fatsGrams, 'g']].map(([label, value, unit]) => <div key={label}><dt>{label}</dt><dd>{value === null ? '—' : `${value} ${unit}`}</dd></div>)}</dl><p>Totals cover the recorded entries across this plan. A dash means the value was not supplied.</p></section>
    <div className="member-meal-days">{days.map((day, index) => { const entries = plan.entries.filter(entry => entry.dayOfWeek === index + 1); return entries.length ? <details key={day} open><summary><span>{day}</span><span>{entries.length} {entries.length === 1 ? 'meal' : 'meals'} <ChevronDown size={16}/></span></summary><ul>{entries.map(entry => <li key={entry.id}><span className="member-meal-type">{entry.mealType}</span><strong>{entry.foodItem}</strong><span className="member-meal-calories">{entry.calories === null ? 'Calories not recorded' : `${entry.calories} kcal`}</span></li>)}</ul></details> : null; })}</div>
  </article>;
}
