'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// No token, secret or persistent client storage. Full document navigation drops
// pending RSC work; BFCache pages stay concealed until a fresh server render.
export function SessionLifecycle() {
  const pathname = usePathname();
  useEffect(() => {
    const publicPath = pathname === '/login' || pathname === '/gym-account/setup' || pathname === '/test-ui' || pathname === '/apply' || pathname.startsWith('/apply/')
      || pathname === '/recover' || pathname === '/help';
    const privatePage = !publicPath;
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gymos-session') : null;
    let disposed = false;
    let exiting = false;
    let navigating = false;
    let identity: string | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let lastRenewalAt = Date.now();
    let renewal: Promise<boolean> | undefined;
    const hide = () => { document.documentElement.style.visibility = 'hidden'; };
    const leave = (url: string) => { if (navigating || exiting) return; navigating = true; hide(); window.location.replace(url); };
    const controller = new AbortController();
    const performRenewal = async (activity: boolean) => {
      if (!privatePage || disposed || exiting || navigating || document.visibilityState !== 'visible') return false;
      try {
        const response = await fetch('/api/session/renew', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ activity }), cache: 'no-store', signal: controller.signal });
        if (response.status === 401) { leave('/login?error=expired'); return false; }
        if (!response.ok) return false;
        lastRenewalAt = Date.now();
        return true;
      } catch { return false; }
    };
    // Focus, activity and expiry may arrive together; share one cookie rotation.
    const renew = (activity: boolean) => {
      if (!renewal) renewal = performRenewal(activity).finally(() => { renewal = undefined; });
      return renewal;
    };
    const check = async (foreground = false) => {
      if (!privatePage || disposed || exiting || navigating) return;
      try {
        const supportId = document.querySelector<HTMLElement>('[data-support-session]')?.dataset.supportSession;
        const parts = pathname.split('/');
        const response = await fetch(`/api/session${supportId ? `?support=${encodeURIComponent(parts[2] ?? '')}` : ''}`, { cache: 'no-store', signal: controller.signal });
        if (disposed || exiting || navigating) return;
        if (response.status === 401) {
          if (document.visibilityState === 'hidden') return;
          if (foreground && await renew(true)) return void check(false);
          return leave('/login');
        }
        if (response.status === 403 && pathname !== '/change-password') return leave('/change-password');
        if (!response.ok) return;
        const session = await response.json() as { identityId: string; expiresAt: number; refreshExpiresAt: number; gyms: { slug: string; role: string }[]; support?: { id: string; slug: string; expiresAt: number } | null };
        if (disposed || exiting || navigating) return;
        const expectedIdentity = document.querySelector<HTMLElement>('[data-session-identity]')?.dataset.sessionIdentity;
        if ((expectedIdentity && expectedIdentity !== session.identityId) || (identity && identity !== session.identityId)) return leave('/');
        identity = session.identityId;
        if (supportId && (session.support?.id !== supportId || session.support.slug !== parts[2])) return leave('/admin');
        // Only a rendered authorized shell needs live gym invalidation. Leave
        // server not-found/error responses in place; redirecting them races the
        // uniform foreign/unknown-gym denial and changes its visible behavior.
        const sharedBookingPath = parts.length === 5 && parts[3] === 'sessions' && /^[A-Za-z0-9_:-]{1,128}$/.test(parts[4] ?? '');
        if (!supportId && expectedIdentity && parts[1] === 'gyms' && parts[2] !== 'select' && !session.gyms.some(gym => gym.slug === parts[2]
          && (!parts[3] || gym.role.toLowerCase() === parts[3] || sharedBookingPath && ['OWNER', 'TRAINER', 'MEMBER'].includes(gym.role)))) return leave('/');
        clearTimeout(expiryTimer);
        clearTimeout(idleTimer);
        const expiresAt = Math.min(session.expiresAt, supportId ? session.support?.expiresAt ?? 0 : session.expiresAt);
        if (supportId) expiryTimer = setTimeout(() => leave('/admin'), Math.max(0, expiresAt - Date.now()));
        else {
          expiryTimer = setTimeout(async () => {
            if (document.visibilityState === 'visible' && await renew(false)) void check(false);
            else if (document.visibilityState === 'visible') leave('/login?error=expired');
          }, Math.max(0, expiresAt - Date.now() - 120_000));
          idleTimer = setTimeout(() => leave('/login?error=expired'), Math.max(0, session.refreshExpiresAt - Date.now()));
        }
      } catch { /* availability cannot grant access or renew a session */ }
    };
    let activityQueued = false;
    const userActivity = () => {
      if (!privatePage || document.visibilityState !== 'visible' || Date.now() - lastRenewalAt < 5 * 60_000 || activityQueued) return;
      activityQueued = true;
      void renew(true).then(ok => { activityQueued = false; if (ok) void check(false); });
    };
    const submit = (event: SubmitEvent) => {
      const form = event.target;
      if (form instanceof HTMLFormElement && form.hasAttribute('data-support-exit')) {
        exiting = true; controller.abort(); clearTimeout(expiryTimer);
        channel?.postMessage('support-changed'); hide();
      }
      if (form instanceof HTMLFormElement && form.hasAttribute('data-session-exit')) {
        // Let the Server Action response deliver cookie deletion before any
        // concurrent session check can navigate away from this document.
        exiting = true; controller.abort(); clearTimeout(expiryTimer);
        channel?.postMessage('logout'); hide();
      }
    };
    const restored = (event: PageTransitionEvent) => { if (event.persisted && privatePage) { hide(); window.location.reload(); } };
    const visibility = () => { if (document.visibilityState === 'visible') void check(true); };
    channel?.addEventListener('message', event => {
      if (event.data === 'logout' && privatePage) leave('/login');
      if (event.data === 'support-changed' && privatePage && document.querySelector('[data-support-session]')) leave('/admin');
    });
    document.documentElement.style.visibility = '';
    void check(true);
    const interval = setInterval(check, 30_000);
    document.addEventListener('submit', submit, true);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('pointerdown', userActivity, true);
    document.addEventListener('keydown', userActivity, true);
    document.addEventListener('click', userActivity, true);
    window.addEventListener('focus', visibility);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', restored);
    return () => {
      disposed = true; controller.abort(); clearInterval(interval); clearTimeout(expiryTimer); clearTimeout(idleTimer); channel?.close();
      document.removeEventListener('submit', submit, true); document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointerdown', userActivity, true); document.removeEventListener('keydown', userActivity, true); document.removeEventListener('click', userActivity, true);
      window.removeEventListener('focus', visibility); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', restored);
      document.documentElement.style.visibility = '';
    };
  }, [pathname]);
  return null;
}
