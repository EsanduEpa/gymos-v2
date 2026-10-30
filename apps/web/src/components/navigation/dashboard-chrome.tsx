'use client';

/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation deliberately discards identity/gym router state. */

import { useEffect, useRef, useState, type ReactNode, type CSSProperties, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions';
import { gymRoleUrl, type GymAccessSummary } from '@/lib/gymos';
import { Button, LoadingState } from '@/components/ui';

// Only implemented destinations belong here. Feature navigation is added with
// its owning slice; notification/support/subscription APIs are not available yet.
export function DashboardChrome({ gym, gyms, displayName, identityId, style, children }: {
  identityId: string; gym?: GymAccessSummary; gyms: GymAccessSummary[]; displayName: string;
  style?: CSSProperties; children: ReactNode;
}) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const role = gym?.role ?? 'SUPER_ADMIN';
  const destination = gym ? gymRoleUrl(gym) : '/admin';
  const label = gym ? role === 'OWNER' ? 'Members' : role === 'TRAINER' ? 'Trainer workspace' : 'Member workspace' : 'All Gyms';
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
        {gym && gyms.length > 1 ? <a href="/gyms/select" onClick={() => { close(); setSwitching(true); }}>Switch gym</a> : null}
      </nav>
      <div className="shell-sidebar-footer"><span>{displayName}</span><small>{role.replaceAll('_', ' ')}</small>
        <form action={signOut} data-session-exit><Button type="submit" variant="secondary">Sign out</Button></form></div>
    </>;
  }
  return <div data-session-identity={identityId} className={`application-shell ${gym ? 'gym-dashboard' : ''}`} style={style}>
    <a className="skip-link" href="#workspace-content">Skip to content</a>
    <aside className="shell-sidebar">{navigation()}</aside>
    <dialog ref={drawer} id="primary-navigation" className="shell-drawer" aria-label="Navigation menu" onKeyDown={trap}
      onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="shell-drawer-panel">{navigation(true)}</div>
    </dialog>
    <div className="shell-workspace">
      {/* Support and lapsed-subscription banners require server-authorized
          projections from their owning segments. Never infer them from a URL. */}
      <header className="shell-header">
        <button ref={opener} className="shell-menu" type="button" aria-label="Open navigation menu" aria-controls="primary-navigation" aria-expanded={open} onClick={show}>☰</button>
        <span className="shell-gym-name">{gym?.name ?? 'Platform administration'}</span>
        {/* Notification bell integration waits for scoped read/read-status APIs. */}
        <div className="shell-profile"><span className="shell-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>{role.replaceAll('_', ' ')}</small></div></div>
      </header>
      <main id="workspace-content" className="shell-content" tabIndex={-1}>{switching ? <LoadingState label="Loading your gyms…" /> : children}</main>
    </div>
  </div>;
}
