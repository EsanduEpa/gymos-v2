'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// No token, secret or persistent client storage. Full document navigation drops
// pending RSC work; BFCache pages stay concealed until a fresh server render.
export function SessionLifecycle() {
  const pathname = usePathname();
  useEffect(() => {
    const privatePage = !['/login', '/test-ui'].includes(pathname);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gymos-session') : null;
    let disposed = false;
    let exiting = false;
    let navigating = false;
    let identity: string | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const hide = () => { document.documentElement.style.visibility = 'hidden'; };
    const leave = (url: string) => { if (navigating || exiting) return; navigating = true; hide(); window.location.replace(url); };
    const controller = new AbortController();
    const check = async () => {
      if (!privatePage || disposed || exiting || navigating) return;
      try {
        const supportId = document.querySelector<HTMLElement>('[data-support-session]')?.dataset.supportSession;
        const parts = pathname.split('/');
        const response = await fetch(`/api/session${supportId ? `?support=${encodeURIComponent(parts[2] ?? '')}` : ''}`, { cache: 'no-store', signal: controller.signal });
        if (disposed || exiting || navigating) return;
        if (response.status === 401) return leave('/login');
        if (response.status === 403 && pathname !== '/change-password') return leave('/change-password');
        if (!response.ok) return;
        const session = await response.json() as { identityId: string; expiresAt: number; gyms: { slug: string; role: string }[]; support?: { id: string; slug: string; expiresAt: number } | null };
        if (disposed || exiting || navigating) return;
        const expectedIdentity = document.querySelector<HTMLElement>('[data-session-identity]')?.dataset.sessionIdentity;
        if ((expectedIdentity && expectedIdentity !== session.identityId) || (identity && identity !== session.identityId)) return leave('/');
        identity = session.identityId;
        if (supportId && (session.support?.id !== supportId || session.support.slug !== parts[2])) return leave('/admin');
        // Only a rendered authorized shell needs live gym invalidation. Leave
        // server not-found/error responses in place; redirecting them races the
        // uniform foreign/unknown-gym denial and changes its visible behavior.
        if (!supportId && expectedIdentity && parts[1] === 'gyms' && parts[2] !== 'select' && !session.gyms.some(gym => gym.slug === parts[2] && (!parts[3] || gym.role.toLowerCase() === parts[3]))) return leave('/');
        clearTimeout(expiryTimer);
        const expiresAt = Math.min(session.expiresAt, supportId ? session.support?.expiresAt ?? 0 : session.expiresAt);
        expiryTimer = setTimeout(() => leave(supportId ? '/admin' : '/login?error=expired'), Math.max(0, expiresAt - Date.now()));
      } catch { /* availability cannot grant access or renew a session */ }
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
    const visibility = () => { if (document.visibilityState === 'visible') void check(); };
    channel?.addEventListener('message', event => {
      if (event.data === 'logout' && privatePage) leave('/login');
      if (event.data === 'support-changed' && privatePage && document.querySelector('[data-support-session]')) leave('/admin');
    });
    if (privatePage) document.documentElement.style.visibility = '';
    void check();
    const interval = setInterval(check, 30_000);
    document.addEventListener('submit', submit, true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', visibility);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', restored);
    return () => {
      disposed = true; controller.abort(); clearInterval(interval); clearTimeout(expiryTimer); channel?.close();
      document.removeEventListener('submit', submit, true); document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('focus', visibility); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', restored);
      document.documentElement.style.visibility = '';
    };
  }, [pathname]);
  return null;
}
