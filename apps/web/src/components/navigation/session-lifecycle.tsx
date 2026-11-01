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
        const response = await fetch('/api/session', { cache: 'no-store', signal: controller.signal });
        if (disposed || exiting || navigating) return;
        if (response.status === 401) return leave('/login');
        if (response.status === 403 && pathname !== '/change-password') return leave('/change-password');
        if (!response.ok) return;
        const session = await response.json() as { identityId: string; expiresAt: number; gyms: { slug: string; role: string }[] };
        if (disposed || exiting || navigating) return;
        const expectedIdentity = document.querySelector<HTMLElement>('[data-session-identity]')?.dataset.sessionIdentity;
        if ((expectedIdentity && expectedIdentity !== session.identityId) || (identity && identity !== session.identityId)) return leave('/');
        identity = session.identityId;
        const parts = pathname.split('/');
        // Only a rendered authorized shell needs live gym invalidation. Leave
        // server not-found/error responses in place; redirecting them races the
        // uniform foreign/unknown-gym denial and changes its visible behavior.
        if (expectedIdentity && parts[1] === 'gyms' && parts[2] !== 'select' && !session.gyms.some(gym => gym.slug === parts[2] && (!parts[3] || gym.role.toLowerCase() === parts[3]))) return leave('/');
        clearTimeout(expiryTimer);
        expiryTimer = setTimeout(() => leave('/login?error=expired'), Math.max(0, session.expiresAt - Date.now()));
      } catch { /* availability cannot grant access or renew a session */ }
    };
    const submit = (event: SubmitEvent) => {
      const form = event.target;
      if (form instanceof HTMLFormElement && form.hasAttribute('data-session-exit')) {
        // Let the Server Action response deliver cookie deletion before any
        // concurrent session check can navigate away from this document.
        exiting = true; controller.abort(); clearTimeout(expiryTimer);
        channel?.postMessage('logout'); hide();
      }
    };
    const restored = (event: PageTransitionEvent) => { if (event.persisted && privatePage) { hide(); window.location.reload(); } };
    const visibility = () => { if (document.visibilityState === 'visible') void check(); };
    channel?.addEventListener('message', event => { if (event.data === 'logout' && privatePage) leave('/login'); });
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
