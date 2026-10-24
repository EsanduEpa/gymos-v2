import type { ReactNode } from 'react';

export function EmptyState({ title, hint, icon = '○' }: { title: string; hint?: string; icon?: ReactNode }) {
  return <div className="ui-empty"><span className="ui-empty-icon" aria-hidden="true">{icon}</span><strong>{title}</strong>{hint ? <span>{hint}</span> : null}</div>;
}

export function LoadingState({ label = 'Loading…', page = false }: { label?: string; page?: boolean }) {
  return <div className={`ui-loading${page ? ' ui-loading-page' : ''}`} role="status"><span className="ui-spinner" aria-hidden="true" />{label}</div>;
}
