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
import { Building2, LayoutDashboard, Plus, ShieldCheck, PanelLeftClose, PanelLeftOpen, LogOut, Menu, X, Dumbbell, UsersRound, CalendarDays, Wallet, ChartNoAxesCombined, Settings2, ScrollText, CreditCard, ArrowLeftRight, ClipboardList, Utensils, House, ClipboardCheck } from 'lucide-react';

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
  const trainer = gym?.role === 'TRAINER' && !support;
  const member = gym?.role === 'MEMBER' && !support;
  const themed = platform || owner || trainer || member;
  const drawerOpener = useRef<HTMLElement | null>(null);
  const ownerSections = [
    { label: 'WORKSPACE', items: [{ label: 'Dashboard', path: '', icon: LayoutDashboard }, { label: 'Members', path: '/members', icon: UsersRound }, { label: 'Applications', path: '/applications', icon: ClipboardCheck }, { label: 'Trainers', path: '/trainers', icon: Dumbbell }, { label: 'Sessions', path: '/sessions', icon: CalendarDays }] },
    { label: 'BUSINESS', items: [{ label: 'Financials', path: '/financials', icon: Wallet }, { label: 'Analytics', path: '/analytics', icon: ChartNoAxesCombined }] },
    { label: 'MANAGEMENT', items: [{ label: 'Gym Configuration', path: '/gym-config', icon: Settings2 }, { label: 'Account Recovery', path: '/account-recovery', icon: ShieldCheck }, { label: 'Audit Log', path: '/audit', icon: ScrollText }, { label: 'Subscription', path: '/subscription', icon: CreditCard }] },
  ];
  const sections = owner ? ownerSections : member ? [{ label: 'YOUR TRAINING', items: [{ label: 'Home', path: '', icon: House }, { label: 'Workouts', path: '/workout-plans', icon: Dumbbell }, { label: 'Meal Plans', path: '/meal-plans', icon: Utensils }, { label: 'PT Sessions', path: '/sessions', icon: CalendarDays }, { label: 'Calendar', path: '/calendar', icon: CalendarDays }, { label: 'Find a Trainer', path: '/trainers', icon: UsersRound }] }] : [{ label: 'COACHING', items: [{ label: 'My Schedule', path: '/schedule', icon: CalendarDays }, { label: 'Calendar', path: '/calendar', icon: CalendarDays }, { label: 'Requests', path: '/requests', icon: ClipboardList }, { label: 'Clients', path: '/clients', icon: UsersRound }, { label: 'Earnings', path: '/earnings', icon: Wallet }] }];
  const bookingDetail = Boolean(gym && pathname.startsWith(`/gyms/${gym.slug}/sessions/`));
  const workspacePage = pathname.endsWith('/profile') ? 'Profile' : bookingDetail ? 'PT booking details' : trainer && pathname.includes('/plans/') ? 'Plan builder' : sections.flatMap(section => section.items).find(item => item.path && pathname.startsWith(`${gym ? gymRoleUrl(gym) : ''}${item.path}`))?.label ?? (member ? 'Home' : 'Dashboard');
  const role = support ? 'READ-ONLY SUPPORT' : gym?.role ?? 'SUPER_ADMIN';
  const destination = gym ? gymRoleUrl(gym) : '/admin';
  const home = gym?.role === 'TRAINER' ? `${destination}/schedule` : destination;
  function close() { drawer.current?.close(); setOpen(false); (drawerOpener.current ?? opener.current)?.focus(); }
  function show() { drawerOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : opener.current; drawer.current?.showModal(); drawer.current?.querySelector<HTMLButtonElement>('button')?.focus(); setOpen(true); }
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
    if ((owner || trainer || member) && gym) return <>
      {mobile ? <button className="platform-drawer-close" type="button" onClick={close} aria-label="Close navigation menu"><X size={20}/></button> : null}
      <a className="platform-brand workspace-brand" href={home} aria-label={`${gym.name} dashboard`}><span className="platform-brand-mark workspace-brand-mark" aria-hidden="true">{gym.name.slice(0, 2).toUpperCase()}</span><span className="platform-brand-copy"><strong title={gym.name}>{gym.name}</strong><small>{owner ? 'OWNER WORKSPACE' : trainer ? 'TRAINER WORKSPACE' : 'MEMBER WORKSPACE'}</small></span></a>
      <nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
        {sections.map(section => <div className="workspace-nav-group" key={section.label}><span className="platform-nav-label">{section.label}</span>{section.items.map(({ label: itemLabel, path, icon: Icon }) => <a key={path} href={`${destination}${path}`} title={itemLabel} aria-label={itemLabel} aria-current={(path ? (pathname.startsWith(`${destination}${path}`) || bookingDetail && path === (trainer ? '/schedule' : '/sessions') || trainer && path === '/clients' && pathname.includes('/plans/')) : pathname === home || pathname === `/gyms/${gym.slug}`) ? 'page' : undefined} onClick={close}><Icon size={19}/><span>{itemLabel}</span></a>)}</div>)}
        {gyms.length > 1 ? <a href="/gyms/select" title="Switch gym" aria-label="Switch gym" onClick={() => { close(); setSwitching(true); }}><ArrowLeftRight size={19}/><span>Switch gym</span></a> : null}
      </nav>
      <div className="shell-sidebar-footer"><div className="platform-sidebar-identity"><span className="shell-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>{owner ? 'Gym owner' : trainer ? 'Personal trainer' : 'Member'}</small></div></div>
        <a className="ui-button ui-button-secondary" href="/security" aria-label="Security settings"><ShieldCheck size={16}/><span>Security</span></a>
        <form action={signOut} data-session-exit><Button type="submit" variant="secondary" aria-label="Sign out"><LogOut size={16}/><span>Sign out</span></Button></form></div>
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
          <a href="/admin/account-recovery" aria-label="Operator account recovery" aria-current={pathname.startsWith('/admin/account-recovery') ? 'page' : undefined} onClick={close}><ShieldCheck size={19}/><span>Account recovery</span></a>
          <a href="/admin/email-correction-requests" aria-label="Email correction requests" aria-current={pathname.startsWith('/admin/email-correction-requests') ? 'page' : undefined} onClick={close}><ShieldCheck size={19}/><span>Email corrections</span></a>
        </>}
        {support ? <a href="/admin" aria-label="All Gyms" onClick={close}><Building2 size={19}/><span>All Gyms</span></a> : null}
      </nav>
      <div className="platform-sidebar-note"><ShieldCheck size={20}/><strong>Built around trust</strong><p>Every gym has its own secure workspace. Support access is always read-only.</p></div>
      <div className="shell-sidebar-footer"><div className="platform-sidebar-identity"><span className="shell-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><div><strong>{displayName}</strong><small>{support ? 'Read-only support' : 'Super administrator'}</small></div></div>
        <a className="ui-button ui-button-secondary" href="/security" aria-label="Security settings"><ShieldCheck size={16}/><span>Security</span></a>
        <form action={signOut} data-session-exit><Button type="submit" variant="secondary" aria-label="Sign out"><LogOut size={16}/><span>Sign out</span></Button></form>
      </div>
    </>;
    return null;
  }
  return <div data-session-identity={identityId} data-support-session={support?.id} data-support-expiry={support?.expiresAt} className={`application-shell ${themed ? 'themed-workspace' : ''} ${platform ? 'platform-dashboard' : ''} ${owner || trainer || member ? 'gym-workspace' : ''} ${owner ? 'owner-workspace' : ''} ${trainer ? 'trainer-workspace' : ''} ${member ? 'member-workspace' : ''} ${gym ? 'gym-dashboard' : ''} ${gym?.role === 'OWNER' ? 'owner-dashboard' : ''} ${gym?.role === 'TRAINER' ? 'trainer-dashboard' : ''} ${gym?.role === 'MEMBER' ? 'member-dashboard' : ''}`} style={style}>
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
        <span className="shell-gym-name">{platform ? <><span className="platform-header-label">Platform</span><span className="platform-header-divider">/</span>{support ? gym?.name : 'Overview'}</> : owner || trainer || member ? <><span className="workspace-header-gym" title={gym?.name}>{gym?.name}</span><span className="platform-header-divider">/</span><span className="workspace-header-page">{workspacePage}</span></> : gym?.name}</span>
        {themed ? <ThemeToggle/> : null}
        {gym && !support ? <NotificationsBell key={`${identityId}:${gym.slug}:${gym.role}`} slug={gym.slug} identityId={identityId} role={gym.role} /> : null}
        <details className="shell-account-menu"><summary aria-label={`Account menu for ${displayName}`}><span className="shell-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><span className="shell-account-label"><strong>{displayName}</strong><small>{platform ? support ? 'Read-only support' : role === 'SUPER_ADMIN' ? 'Super administrator' : 'GymOS account' : role.replaceAll('_', ' ')}</small></span></summary>
          <nav className="shell-account-panel" aria-label="Account destinations">
            {!support ? <a href={gym ? `/gyms/${encodeURIComponent(gym.slug)}/profile` : '/account/profile'}>Profile</a> : null}
            <a href="/security">Security</a>
            {gym && !support ? <a href="#notification-center" onClick={(event) => { event.preventDefault(); document.querySelector<HTMLButtonElement>('.notification-bell-trigger')?.click(); document.querySelector('.shell-account-menu')?.removeAttribute('open'); }}>Notifications</a> : null}
            <a href="/help">Help</a>
            <form action={signOut} data-session-exit><Button type="submit" variant="secondary"><LogOut size={16}/><span>Sign out this device</span></Button></form>
          </nav>
        </details>
      </header>
      <main id="workspace-content" className="shell-content" tabIndex={-1}>{switching ? <LoadingState label="Loading your gyms…" /> : children}</main>
    </div>
    {member ? <nav className="member-bottom-nav" aria-label="Member shortcuts"><a href={destination} aria-current={pathname === destination ? 'page' : undefined}><House size={20}/><span>Home</span></a><a href={`${destination}/workout-plans`} aria-current={pathname.startsWith(`${destination}/workout-plans`) ? 'page' : undefined}><Dumbbell size={20}/><span>Workouts</span></a><a href={`${destination}/sessions`} aria-current={bookingDetail || pathname.startsWith(`${destination}/sessions`) ? 'page' : undefined}><CalendarDays size={20}/><span>Sessions</span></a><button type="button" aria-label="More navigation options" aria-controls="primary-navigation" aria-expanded={open} onClick={show}><Menu size={20}/><span>More</span></button></nav> : null}
  </div>;
}
