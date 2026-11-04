'use client';

/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation deliberately discards identity/gym router state. */

import { useEffect, useRef, useState, type ReactNode, type CSSProperties, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions';
import { exitSupport } from '@/app/platform-actions';
import { gymRoleUrl, type GymAccessSummary } from '@/lib/gymos';
import { Button, LoadingState } from '@/components/ui';
import { NotificationsBell } from './notifications-bell';

// Only implemented destinations belong here. Support uses its explicit read-only
// context; notification/subscription navigation waits for its owning slices.
export function DashboardChrome({ gym, gyms, displayName, identityId, style, children, support }: {
  identityId: string; gym?: GymAccessSummary; gyms: GymAccessSummary[]; displayName: string;
  style?: CSSProperties; children: ReactNode;
  support?: { id: string; expiresAt: string };
}) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const role = support ? 'READ-ONLY SUPPORT' : gym?.role ?? 'SUPER_ADMIN';
  const destination = gym ? gymRoleUrl(gym) : '/admin';
  const label = support ? 'Owner summary' : gym ? role === 'OWNER' ? 'Dashboard' : role === 'TRAINER' ? 'Trainer workspace' : 'Member workspace' : 'All Gyms';
  function close() { drawer.current?.close(); setOpen(false); opener.current?.focus(); }
  function show() { drawer.current?.showModal(); setOpen(true); }
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = window.matchMedia('(min-width: 768px)');
    const resize = () => { if (media.matches) { drawer.current?.close(); setOpen(false); } };
    media.addEventListener('change', resize);
    return () => { document.body.style.overflow = previous; media.removeEventListener('change', resize); };
  }, [open]);
  function trap(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')];
    const first = items[0]; const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  function navigation(mobile = false) {
    return <>
      <div className="shell-brand"><span className="shell-mark" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 4 14 14M4 6l2-2m12 16 2-2M2 8l6-6m8 20 6-6M6 12l6-6m0 12 6-6" /></svg></span><div><strong>GymOS</strong><small>Management System</small></div>
        {mobile ? <button type="button" onClick={close} aria-label="Close navigation menu">×</button> : null}</div>
      <nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
        <a href={destination} aria-current={pathname === destination || pathname === `/gyms/${gym?.slug}` ? 'page' : undefined} onClick={close}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>{label}</a>
        {!support && gym?.role === 'OWNER' ? <>
          <a href={`${destination}/members`} aria-current={pathname.startsWith(`${destination}/members`) ? 'page' : undefined} onClick={close}>Members</a>
          <a href={`${destination}/sessions`} aria-current={pathname.startsWith(`${destination}/sessions`) ? 'page' : undefined} onClick={close}>PT Sessions</a>
          <a href={`${destination}/financials`} aria-current={pathname.startsWith(`${destination}/financials`) ? 'page' : undefined} onClick={close}>Financials</a>
          <a href={`${destination}/audit`} aria-current={pathname.startsWith(`${destination}/audit`) ? 'page' : undefined} onClick={close}>Audit history</a>
          <a href={`${destination}/analytics`} aria-current={pathname.startsWith(`${destination}/analytics`) ? 'page' : undefined} onClick={close}>Analytics</a>
          <a href={`${destination}/trainers`} aria-current={pathname.startsWith(`${destination}/trainers`) ? 'page' : undefined} onClick={close}>Trainers</a>
        </> : null}
        {!support && gym?.role === 'TRAINER' ? <>
          <a href={`${destination}/schedule`} aria-current={pathname.startsWith(`${destination}/schedule`) ? 'page' : undefined} onClick={close}>PT Schedule</a>
          <a href={`${destination}/requests`} aria-current={pathname.startsWith(`${destination}/requests`) ? 'page' : undefined} onClick={close}>Session requests</a>
          <a href={`${destination}/clients`} aria-current={pathname.startsWith(`${destination}/clients`) ? 'page' : undefined} onClick={close}>Clients</a>
        </> : null}
        {!support && gym?.role === 'MEMBER' ? <>
          <a href={`${destination}/trainers`} aria-current={pathname.startsWith(`${destination}/trainers`) ? 'page' : undefined} onClick={close}>Trainers</a>
          <a href={`${destination}/sessions`} aria-current={pathname.startsWith(`${destination}/sessions`) ? 'page' : undefined} onClick={close}>PT Sessions</a>
          <a href={`${destination}/workout-plans`} aria-current={pathname.startsWith(`${destination}/workout-plans`) ? 'page' : undefined} onClick={close}>Workout plans</a>
          <a href={`${destination}/meal-plans`} aria-current={pathname.startsWith(`${destination}/meal-plans`) ? 'page' : undefined} onClick={close}>Meal plans</a>
        </> : null}
        {!support && gym?.role === 'OWNER' ? <a href={`${destination}/gym-config`} aria-current={pathname.endsWith('/gym-config') ? 'page' : undefined} onClick={close}>Gym Configuration</a> : null}
        {gym && gyms.length > 1 ? <a href="/gyms/select" onClick={() => { close(); setSwitching(true); }}>Switch gym</a> : null}
        {support ? <a href="/admin" onClick={close}>All Gyms</a> : null}
      </nav>
      <div className="shell-sidebar-footer"><span>{displayName}</span><small>{role.replaceAll('_', ' ')}</small>
        <form action={signOut} data-session-exit><Button type="submit" variant="secondary">Sign out</Button></form></div>
    </>;
  }
  return <div data-session-identity={identityId} data-support-session={support?.id} data-support-expiry={support?.expiresAt} className={`application-shell ${gym ? 'gym-dashboard' : ''}`} style={style}>
    <a className="skip-link" href="#workspace-content">Skip to content</a>
    <aside className="shell-sidebar">{navigation()}</aside>
    <dialog ref={drawer} id="primary-navigation" className="shell-drawer" aria-label="Navigation menu" onKeyDown={trap}
      onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="shell-drawer-panel">{navigation(true)}</div>
    </dialog>
    <div className="shell-workspace">
      {support ? <div className="support-banner" role="status"><div><strong>Viewing {gym?.name} · read-only support</strong><small>Expires {new Date(support.expiresAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</small></div><form action={exitSupport} data-support-exit><Button variant="secondary">Exit support</Button></form></div> : null}
      {/* Support and lapsed-subscription banners require server-authorized
          projections from their owning segments. Never infer them from a URL. */}
      <header className="shell-header">
        <button ref={opener} className="shell-menu" type="button" aria-label="Open navigation menu" aria-controls="primary-navigation" aria-expanded={open} onClick={show}>☰</button>
        <span className="shell-gym-name">{gym?.name ?? 'Platform administration'}</span>
        {gym && !support ? <NotificationsBell key={`${identityId}:${gym.slug}:${gym.role}`} slug={gym.slug} identityId={identityId} role={gym.role} /> : null}
        <div className="shell-profile"><span className="shell-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>{role.replaceAll('_', ' ')}</small></div></div>
      </header>
      <main id="workspace-content" className="shell-content" tabIndex={-1}>{switching ? <LoadingState label="Loading your gyms…" /> : children}</main>
    </div>
  </div>;
}
