'use client';

/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation deliberately discards identity/gym router state. */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type CSSProperties, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions';
import { exitSupport } from '@/app/platform-actions';
import { gymRoleUrl, type GymAccessSummary } from '@/lib/gymos';
import { Button, LoadingState } from '@/components/ui';
import { NotificationsBell } from './notifications-bell';
import { ThemeToggle } from './theme-toggle';
import { sidebarIsCollapsed, subscribeAppearance, togglePlatformSidebar } from '@/lib/appearance';
import { Building2, LayoutDashboard, Plus, ShieldCheck, PanelLeftClose, PanelLeftOpen, LogOut, Menu, X, Dumbbell, UsersRound, CalendarDays, Wallet, ChartNoAxesCombined, Settings2, ScrollText, CreditCard, ArrowLeftRight } from 'lucide-react';

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
  const collapsed = useSyncExternalStore(subscribeAppearance, sidebarIsCollapsed, () => false);
  const platform = !gym || Boolean(support);
  const owner = gym?.role === 'OWNER' && !support;
  const themed = platform || owner;
  const ownerSections = [
    { label: 'WORKSPACE', items: [{ label: 'Dashboard', path: '', icon: LayoutDashboard }, { label: 'Members', path: '/members', icon: UsersRound }, { label: 'Trainers', path: '/trainers', icon: Dumbbell }, { label: 'Sessions', path: '/sessions', icon: CalendarDays }] },
    { label: 'BUSINESS', items: [{ label: 'Financials', path: '/financials', icon: Wallet }, { label: 'Analytics', path: '/analytics', icon: ChartNoAxesCombined }] },
    { label: 'MANAGEMENT', items: [{ label: 'Gym Configuration', path: '/gym-config', icon: Settings2 }, { label: 'Audit Log', path: '/audit', icon: ScrollText }, { label: 'Subscription', path: '/subscription', icon: CreditCard }] },
  ];
  const role = support ? 'READ-ONLY SUPPORT' : gym?.role ?? 'SUPER_ADMIN';
  const destination = gym ? gymRoleUrl(gym) : '/admin';
  const label = support ? 'Owner summary' : gym ? role === 'OWNER' ? 'Dashboard' : role === 'TRAINER' ? 'Schedule' : role === 'MEMBER' ? 'Member home' : 'All Gyms' : 'All Gyms';
  const home = gym?.role === 'TRAINER' ? `${destination}/schedule` : destination;
  function close() { drawer.current?.close(); setOpen(false); opener.current?.focus(); }
  function show() { drawer.current?.showModal(); drawer.current?.querySelector<HTMLButtonElement>('button')?.focus(); setOpen(true); }
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
    if (owner && gym) return <>
      {mobile ? <button className="platform-drawer-close" type="button" onClick={close} aria-label="Close navigation menu"><X size={20}/></button> : null}
      <a className="platform-brand owner-brand" href={home} aria-label={`${gym.name} dashboard`}><span className="platform-brand-mark owner-brand-mark" aria-hidden="true">{gym.name.slice(0, 2).toUpperCase()}</span><span className="platform-brand-copy"><strong title={gym.name}>{gym.name}</strong><small>OWNER WORKSPACE</small></span></a>
      <nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
        {ownerSections.map(section => <div className="owner-nav-group" key={section.label}><span className="platform-nav-label">{section.label}</span>{section.items.map(({ label: itemLabel, path, icon: Icon }) => <a key={path} href={`${destination}${path}`} title={itemLabel} aria-label={itemLabel} aria-current={(path ? pathname.startsWith(`${destination}${path}`) : pathname === home || pathname === `/gyms/${gym.slug}`) ? 'page' : undefined} onClick={close}><Icon size={19}/><span>{itemLabel}</span></a>)}</div>)}
        {gyms.length > 1 ? <a href="/gyms/select" title="Switch gym" aria-label="Switch gym" onClick={() => { close(); setSwitching(true); }}><ArrowLeftRight size={19}/><span>Switch gym</span></a> : null}
      </nav>
      <div className="shell-sidebar-footer"><div className="platform-sidebar-identity"><span className="shell-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>Gym owner</small></div></div><form action={signOut} data-session-exit><Button type="submit" variant="secondary" aria-label="Sign out"><LogOut size={16}/><span>Sign out</span></Button></form></div>
    </>;
    if (platform) return <>
      <a className="platform-brand" href="/admin" aria-label="GymOS platform home"><span className="platform-brand-mark"><Dumbbell size={23}/></span><span className="platform-brand-copy"><strong>GymOS</strong><small>PLATFORM CONSOLE</small></span></a>
      {mobile ? <button className="platform-drawer-close" type="button" onClick={close} aria-label="Close navigation menu"><X size={20}/></button> : null}
      <nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
        <span className="platform-nav-label">WORKSPACE</span>
        {support ? <a href={home} aria-label="Owner summary" aria-current="page" onClick={close}><ShieldCheck size={19}/><span>Owner summary</span></a> : <>
          <a href="/admin#platform-overview" aria-label="Overview" aria-current="page" onClick={close}><LayoutDashboard size={19}/><span>Overview</span></a>
          <a href="/admin#gym-registry" aria-label="Gyms" onClick={close}><Building2 size={19}/><span>Gyms</span></a>
          <a href="/admin#create-gym" aria-label="Create a gym" onClick={close}><Plus size={19}/><span>Create a gym</span></a>
        </>}
        {support ? <a href="/admin" aria-label="All Gyms" onClick={close}><Building2 size={19}/><span>All Gyms</span></a> : null}
      </nav>
      <div className="platform-sidebar-note"><ShieldCheck size={20}/><strong>Built around trust</strong><p>Every gym has its own secure workspace. Support access is always read-only.</p></div>
      <div className="shell-sidebar-footer"><div className="platform-sidebar-identity"><span className="shell-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>{support ? 'Read-only support' : 'Super administrator'}</small></div></div>
        <form action={signOut} data-session-exit><Button type="submit" variant="secondary" aria-label="Sign out"><LogOut size={16}/><span>Sign out</span></Button></form>
      </div>
    </>;
    return <>
      <div className="shell-brand"><span className="shell-mark" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 4 14 14M4 6l2-2m12 16 2-2M2 8l6-6m8 20 6-6M6 12l6-6m0 12 6-6" /></svg></span><div><strong>GymOS</strong><small>Management System</small></div>
        {mobile ? <button type="button" onClick={close} aria-label="Close navigation menu">×</button> : null}</div>
      <nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
        {gym?.role !== 'MEMBER' ? <a href={home} aria-current={pathname === home || pathname === `/gyms/${gym?.slug}` ? 'page' : undefined} onClick={close}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{gym?.role === 'TRAINER' ? <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></> : <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>}</svg>{label}</a> : null}
        {!support && gym?.role === 'OWNER' ? <>
          <a href={`${destination}/members`} aria-current={pathname.startsWith(`${destination}/members`) ? 'page' : undefined} onClick={close}><span className="shell-nav-icon" aria-hidden="true">♙</span>Members</a>
          <a href={`${destination}/trainers`} aria-current={pathname.startsWith(`${destination}/trainers`) ? 'page' : undefined} onClick={close}><span className="shell-nav-icon" aria-hidden="true">♧</span>Trainers</a>
          <a href={`${destination}/sessions`} aria-current={pathname.startsWith(`${destination}/sessions`) ? 'page' : undefined} onClick={close}><span className="shell-nav-icon" aria-hidden="true">▦</span>Sessions</a>
          <a href={`${destination}/financials`} aria-current={pathname.startsWith(`${destination}/financials`) ? 'page' : undefined} onClick={close}><span className="shell-nav-icon" aria-hidden="true">＄</span>Financials</a>
          <a href={`${destination}/analytics`} aria-current={pathname.startsWith(`${destination}/analytics`) ? 'page' : undefined} onClick={close}><span className="shell-nav-icon" aria-hidden="true">▥</span>Analytics</a>
          <a href={`${destination}/gym-config`} aria-current={pathname.endsWith('/gym-config') ? 'page' : undefined} onClick={close}><span className="shell-nav-icon" aria-hidden="true">⚙</span>Gym Configuration</a>
          <a href={`${destination}/audit`} aria-current={pathname.startsWith(`${destination}/audit`) ? 'page' : undefined} onClick={close}><span className="shell-nav-icon" aria-hidden="true">⛨</span>Audit Log</a>
          <a href={`${destination}/subscription`} aria-current={pathname.startsWith(`${destination}/subscription`) ? 'page' : undefined} onClick={close}><span className="shell-nav-icon" aria-hidden="true">▱</span>Subscription</a>
        </> : null}
        {!support && gym?.role === 'TRAINER' ? <>
          <a href={`${destination}/requests`} aria-current={pathname.startsWith(`${destination}/requests`) ? 'page' : undefined} onClick={close}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 8v6m3-3h-6"/></svg>Hire Requests</a>
          <a href={`${destination}/clients`} aria-current={pathname.startsWith(`${destination}/clients`) ? 'page' : undefined} onClick={close}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>Clients</a>
          <a href={`${destination}/earnings`} aria-current={pathname.startsWith(`${destination}/earnings`) ? 'page' : undefined} onClick={close}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="15" rx="2"/><path d="M2 9h20M16 15h2"/></svg>Earnings</a>
        </> : null}
        {!support && gym?.role === 'MEMBER' ? <>
          <a href={`${destination}/trainers`} aria-current={pathname.startsWith(`${destination}/trainers`) ? 'page' : undefined} onClick={close}>Trainers</a>
          <a href={`${destination}/sessions`} aria-current={pathname.startsWith(`${destination}/sessions`) && !pathname.startsWith(`${destination}/calendar`) ? 'page' : undefined} onClick={close}>My PT Sessions</a>
          <a href={`${destination}/calendar`} aria-current={pathname.startsWith(`${destination}/calendar`) ? 'page' : undefined} onClick={close}>Calendar</a>
          <a href={`${destination}/workout-plans`} aria-current={pathname.startsWith(`${destination}/workout-plans`) ? 'page' : undefined} onClick={close}>Workout plans</a>
          <a href={`${destination}/meal-plans`} aria-current={pathname.startsWith(`${destination}/meal-plans`) ? 'page' : undefined} onClick={close}>Meal plans</a>
        </> : null}
        {gym && gyms.length > 1 ? <a href="/gyms/select" onClick={() => { close(); setSwitching(true); }}>Switch gym</a> : null}
        {support ? <a href="/admin" onClick={close}>All Gyms</a> : null}
      </nav>
      <div className="shell-sidebar-footer"><span>{displayName}</span><small>{role.replaceAll('_', ' ')}</small>
        <form action={signOut} data-session-exit><Button type="submit" variant="secondary">Sign out</Button></form></div>
    </>;
  }
  return <div data-session-identity={identityId} data-support-session={support?.id} data-support-expiry={support?.expiresAt} className={`application-shell ${themed ? 'themed-workspace' : ''} ${platform ? 'platform-dashboard' : ''} ${owner ? 'owner-workspace' : ''} ${gym ? 'gym-dashboard' : ''} ${gym?.role === 'OWNER' ? 'owner-dashboard' : ''} ${gym?.role === 'TRAINER' ? 'trainer-dashboard' : ''} ${gym?.role === 'MEMBER' ? 'member-dashboard' : ''}`} style={style}>
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
        <button ref={opener} className="shell-menu" type="button" aria-label="Open navigation menu" aria-controls="primary-navigation" aria-expanded={open} onClick={show}>{themed ? <Menu size={21}/> : '☰'}</button>
        {themed ? <button type="button" className="platform-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} title="Toggle sidebar" onClick={togglePlatformSidebar}><PanelLeftClose size={19} className="collapse-icon"/><PanelLeftOpen size={19} className="expand-icon"/></button> : null}
        <span className="shell-gym-name">{platform ? <><span className="platform-header-label">Platform</span><span className="platform-header-divider">/</span>{support ? gym?.name : 'Overview'}</> : owner ? <><span className="owner-header-gym" title={gym?.name}>{gym?.name}</span><span className="platform-header-divider">/</span><span className="owner-header-page">{ownerSections.flatMap(section => section.items).find(item => item.path && pathname.startsWith(`${destination}${item.path}`))?.label ?? 'Dashboard'}</span></> : gym?.name}</span>
        {themed ? <ThemeToggle/> : null}
        {gym && !support ? <NotificationsBell key={`${identityId}:${gym.slug}:${gym.role}`} slug={gym.slug} identityId={identityId} role={gym.role} /> : null}
        <div className="shell-profile"><span className="shell-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>{platform ? support ? 'Read-only support' : 'Super administrator' : role.replaceAll('_', ' ')}</small></div></div>
      </header>
      <main id="workspace-content" className="shell-content" tabIndex={-1}>{switching ? <LoadingState label="Loading your gyms…" /> : children}</main>
    </div>
  </div>;
}
