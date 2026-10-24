import type { ReactNode } from 'react';
import { EmptyState } from './states';

export function ChartFrame({ title, description, children, empty = false }: { title: string; description?: string; children?: ReactNode; empty?: boolean }) {
  return <section className="ui-chart" aria-label={title}><header><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div></header><div className="ui-chart-body">{empty ? <EmptyState title="No chart data" hint="Data will appear here when it is available." /> : children}</div></section>;
}
