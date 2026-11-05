'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import styles from './session-read-view.module.css';

/** Revalidates active session views every 30 seconds and immediately on return to the tab. */
export function SessionReadRefresh({ href }: { href: string }) {
  const navigating = useRef(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => { navigating.current = pending; }, [pending]);
  useEffect(() => {
    let wasVisible = document.visibilityState === 'visible';
    let wasFocused = document.hasFocus();
    const refresh = () => {
      if (document.visibilityState !== 'visible' || navigating.current) return;
      // Keep open forms and unsaved notes stable while the user is editing.
      if (document.activeElement?.closest('form') || document.querySelector('dialog[open]')) return;
      navigating.current = true;
      startTransition(() => router.refresh());
    };
    const interval = window.setInterval(refresh, 30_000);
    const visibilityChanged = () => {
      const visible = document.visibilityState === 'visible';
      if (visible && !wasVisible) refresh();
      wasVisible = visible;
    };
    const focus = () => { if (!wasFocused) refresh(); wasFocused = true; };
    const blur = () => { wasFocused = false; };
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener('focus', focus);
    window.addEventListener('blur', blur);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener('focus', focus);
      window.removeEventListener('blur', blur);
    };
  }, [router]);
  return <a className={`ui-button ui-button-secondary ${styles.refresh}`} href={href}>Refresh sessions</a>;
}
