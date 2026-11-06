'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationHref, type NotificationList } from '@gymos/contracts';
import { markNotificationRead, markNotificationsReadThrough, readNotifications } from '@/app/notifications-actions';

export function NotificationsBell({ slug, identityId, role }: { slug: string; identityId: string; role: string }) {
  const [list, setList] = useState<NotificationList | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const contextKey = `${identityId}:${slug}:${role}`;

  const refresh = useCallback(async () => {
    const requestSequence = ++sequence.current;
    const result = await readNotifications(slug, 5);
    if (requestSequence !== sequence.current) return;
    setLoading(false);
    if (result.ok) { setList(result.data); setError(''); }
    else setError(result.message);
  }, [slug]);

  useEffect(() => {
    let timer: number | undefined;
    const start = () => {
      if (document.visibilityState !== 'visible' || timer !== undefined) return;
      void refresh();
      timer = window.setInterval(() => { void refresh(); }, 20_000);
    };
    const stop = () => { if (timer !== undefined) { window.clearInterval(timer); timer = undefined; } };
    const visibility = () => { if (document.visibilityState === 'visible') start(); else stop(); };
    start();
    const focus = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visibility);
    return () => { stop(); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', visibility); sequence.current += 1; };
  }, [refresh]);

  async function markOne(id: string) {
    sequence.current += 1;
    setPending(id); setError('');
    const result = await markNotificationRead(slug, id);
    if (result.ok) {
      setList(current => current ? { ...current, unreadCount: result.data.unreadCount } : current);
      await refresh();
    } else setError(result.message);
    setPending(null);
  }

  async function markAll() {
    if (!list) return;
    sequence.current += 1;
    setPending('all'); setError('');
    const result = await markNotificationsReadThrough(slug, list.asOf);
    if (result.ok) {
      setList(current => current ? { ...current, unreadCount: result.data.unreadCount } : current);
      await refresh();
    } else setError(result.message);
    setPending(null);
  }

  return <div id="notification-center" className="notification-bell" data-notification-context={contextKey}>
    <button className="notification-bell-trigger" type="button" aria-label={list?.unreadCount ? `Notifications, ${list.unreadCount} unread` : 'Notifications'}
      aria-expanded={open} aria-controls="notification-popover" onClick={() => { setOpen(value => !value); if (!open) void refresh(); }}>
      <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>
      </svg>
      {list?.unreadCount ? <span className="notification-unread-count">{list.unreadCount > 99 ? '99+' : list.unreadCount}</span> : null}
    </button>
    {open ? <section id="notification-popover" className="notification-popover" aria-label="Notifications">
      <div className="notification-popover-heading"><div><strong>Notifications</strong><small>{list ? `${list.unreadCount} unread` : 'Unread count unavailable'}</small></div>
        <button type="button" className="notification-close" aria-label="Close notifications" onClick={() => setOpen(false)}>×</button></div>
      {error ? <p className="notification-error" role="status">{list ? 'Showing the last saved notification state. ' : ''}{error}</p> : null}
      {loading && !list ? <p className="notification-empty" role="status">Loading notifications…</p> : null}
      {!loading && list && !list.items.length ? <p className="notification-empty">No notifications yet.</p> : null}
      {list?.items.length ? <ul className="notification-list">
        {list.items.map(item => <li key={item.id} className={item.readAt ? 'notification-item' : 'notification-item is-unread'}>
          <a href={notificationHref(slug, item)} onClick={() => setOpen(false)}>
            <span className="notification-item-title">{item.title}</span><span>{item.message}</span>
            <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
          </a>
          {!item.readAt ? <button type="button" className="notification-mark-read" disabled={pending !== null}
            onClick={() => void markOne(item.id)}>{pending === item.id ? 'Marking…' : 'Mark read'}</button> : null}
        </li>)}
      </ul> : null}
      <p className="notification-empty">PT reminders appear in the app when you open or use it.</p><div className="notification-popover-footer"><button type="button" disabled={!list?.unreadCount || pending !== null} onClick={() => void markAll()}>
        {pending === 'all' ? 'Marking all…' : 'Mark all read'}
      </button><button type="button" disabled={loading} onClick={() => void refresh()}>Refresh</button></div>
    </section> : null}
  </div>;
}
