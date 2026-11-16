import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Button, Field } from '@/components/ui';
import { normalizeGymCode } from '@/lib/application-form';

type ApplyIndexProps = { searchParams: Promise<{ gym?: string | string[] }> };

async function ApplyIndexSearch({ searchParams }: ApplyIndexProps) {
  const { gym } = await searchParams;
  const code = normalizeGymCode(gym);
  if (code) redirect(`/apply/${encodeURIComponent(code)}`);

  return (
    <main className="auth-shell themed-workspace">
      <section className="auth-form-wrap">
        <div className="form-card auth-card">
          <div className="eyebrow dark">APPLY TO JOIN</div>
          <h1>Find your gym</h1>
          <p className="muted">Enter the gym code shared by the gym owner.</p>
          <form action="/apply" method="get" className="stack-form">
            <Field label="Gym code" name="gym" autoCapitalize="none" autoComplete="off" spellCheck={false} required
              defaultValue={typeof gym === 'string' ? gym.slice(0, 100) : ''}
              error={gym === undefined ? undefined : 'Enter a gym code using letters, numbers, and single hyphens between words.'}/>
            <Button type="submit">Continue</Button>
          </form>
          <p className="form-note">Already have a GymOS account? <Link href="/login">Sign in before applying.</Link></p>
        </div>
      </section>
    </main>
  );
}

export default function ApplyIndex(props: ApplyIndexProps) {
  return <Suspense fallback={<main className="page-loading">Loading application…</main>}><ApplyIndexSearch {...props}/></Suspense>;
}
