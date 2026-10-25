import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({
  children,
  variant = 'primary',
  pending = false,
  pendingLabel = 'Working…',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  pending?: boolean;
  pendingLabel?: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      {...props}
      className={`ui-button ui-button-${variant}${fullWidth ? ' ui-button-full' : ''} ${className}`.trim()}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending ? <><span className="ui-spinner" aria-hidden="true" />{pendingLabel}</> : children}
    </button>
  );
}
