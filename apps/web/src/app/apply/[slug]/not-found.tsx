import Link from 'next/link';

export default function GymApplicationNotFound() {
  return (
    <main className="auth-shell themed-workspace">
      <section className="auth-form-wrap">
        <div className="form-card auth-card">
          <h1>Gym not found</h1>
          <p className="muted">Check the code or ask the gym owner for a current application link.</p>
          <Link className="ui-button ui-button-primary" href="/apply">Try another gym code</Link>
        </div>
      </section>
    </main>
  );
}
