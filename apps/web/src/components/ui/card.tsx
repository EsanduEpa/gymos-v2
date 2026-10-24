import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section {...props} className={`ui-card ${className}`.trim()}>{children}</section>;
}

export function CardHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="ui-card-header"><div>{eyebrow ? <span className="eyebrow dark">{eyebrow}</span> : null}<h2>{title}</h2></div>{action}</div>;
}
