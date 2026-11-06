import Link from 'next/link';

export default function HelpPage() {
  return <main className="platform-page"><header className="platform-page-heading"><div><span className="platform-eyebrow">HELP</span><h1>Account and gym help</h1><p>Use the right support path for the information you need.</p></div></header>
    <section className="ui-card"><h2>Gym membership or profile details</h2><p>Contact your gym using the contact information it has already provided. GymOS does not send an email or message when you open this page.</p></section>
    <section className="ui-card"><h2>Sign-in and account security</h2><p>Use Security to change your password, review signed-in devices, or ask your gym staff about a forgotten password.</p><Link className="ui-button ui-button-secondary" href="/security">Open Security</Link></section>
    <section id="email-correction" className="ui-card"><h2>Request a login email correction</h2>
      <p>Your login email is a global account identity. A gym’s contact email is a separate record. You can submit a password-confirmed follow-up request from your account.</p>
      <Link className="ui-button ui-button-secondary" href="/account/email-correction">Start a correction request</Link>
      <p>Contact your gym staff in person or through contact details the gym has already provided. Staff must follow the documented identity-check process before any separately authorized account change.</p>
      <p>Keep access to your current account while the request is reviewed. Do not share your password, recovery link, or one-time code with staff. A typed new address is not proof that you control its mailbox.</p>
      <p>GymOS does not send a verification email or change your login email from this request. If no independently verified process is available, your current login remains unchanged.</p>
    </section>
    <Link className="ui-button ui-button-secondary" href="/">Back to your workspace</Link>
  </main>;
}
