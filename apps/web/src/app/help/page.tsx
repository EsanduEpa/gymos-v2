import Link from 'next/link';

export default function HelpPage() {
  return <main className="platform-page"><header className="platform-page-heading"><div><span className="platform-eyebrow">HELP</span><h1>Account and gym help</h1><p>Use the right support path for the information you need.</p></div></header>
    <section className="ui-card"><h2>Gym membership or profile details</h2><p>Contact your gym using the contact information it has already provided. GymOS does not send an email or message when you open this page.</p></section>
    <section className="ui-card"><h2>Sign-in and account security</h2><p>Use Security to change your password, review signed-in devices, or ask your gym staff about a forgotten password.</p><Link className="ui-button ui-button-secondary" href="/security">Open Security</Link></section>
    <Link className="ui-button ui-button-secondary" href="/">Back to your workspace</Link>
  </main>;
}
