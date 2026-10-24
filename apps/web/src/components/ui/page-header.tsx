import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="ui-page-header"><div>{eyebrow ? <span className="eyebrow dark">{eyebrow}</span> : null}<h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{action ? <div className="ui-page-header-action">{action}</div> : null}</div>;
}

export function StatCard({ label, value, trend, trendTone = 'neutral', icon }: { label: string; value: string | number; trend?: string; trendTone?: 'success' | 'danger' | 'neutral'; icon?: ReactNode }) {
  return <div className="ui-stat"><div><span>{label}</span><strong>{value}</strong>{trend ? <small className={`ui-stat-${trendTone}`}>{trend}</small> : null}</div>{icon ? <div className="ui-stat-icon">{icon}</div> : null}</div>;
}
