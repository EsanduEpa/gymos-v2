import type { ReactNode } from 'react';

export function Feedback({ children, tone = 'info' }: { children: ReactNode; tone?: 'success' | 'error' | 'warning' | 'info' }) {
  return <div className={`ui-feedback ui-feedback-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}
