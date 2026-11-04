'use client';

import { useEffect, useRef } from 'react';
import styles from './session-read-view.module.css';

/** Revalidates active session views every 30 seconds and immediately on return to the tab. */
export function SessionReadRefresh({ href }: { href: string }) {
  const navigating = useRef(false);
  useEffect(() => {
    let wasVisible = document.visibilityState === 'visible';
    let wasFocused = document.hasFocus();
    const refresh = () => {
      if (document.visibilityState !== 'visible' || navigating.current) return;
      navigating.current = true;
      window.location.reload();
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
  }, []);
  return <a className={`ui-button ui-button-secondary ${styles.refresh}`} href={href}>Refresh sessions</a>;
}
