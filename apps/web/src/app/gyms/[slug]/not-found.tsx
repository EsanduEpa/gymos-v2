import Link from 'next/link';
export default function GymNotFound() {
  return <main className="shell-state"><div><h1>This page could not be found</h1><p>This workspace is unavailable or your account cannot access it.</p><Link prefetch={false} className="ui-button ui-button-primary" href="/">Return to Dashboard</Link></div></main>;
}
