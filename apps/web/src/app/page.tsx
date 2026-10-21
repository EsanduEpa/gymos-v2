import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing-shell">
      <div className="landing-glow" />
      <nav className="topbar">
        <span className="brand-mark">G</span>
        <span className="brand-name">GymOS</span>
        <span className="topbar-spacer" />
        <Link className="topbar-link" href="/login">Sign in</Link>
      </nav>

      <section className="hero">
        <div className="eyebrow">THE NEW GYMOS</div>
        <h1>One clear place to run your gym.</h1>
        <p>
          Give your gym its own look and space, welcome new members,
          and keep everyone’s records organized.
        </p>
        <Link className="primary-button" href="/login">Open your workspace <span>→</span></Link>
      </section>

      <section className="landing-features" aria-label="Platform foundations">
        <article><span>01</span><h2>Your own space</h2><p>Each gym has its own identity and member records.</p></article>
        <article><span>02</span><h2>Simple to start</h2><p>Owners can sign in and add their first members.</p></article>
        <article><span>03</span><h2>Ready to grow</h2><p>A clear foundation for the tools your team will need next.</p></article>
      </section>
    </main>
  );
}
