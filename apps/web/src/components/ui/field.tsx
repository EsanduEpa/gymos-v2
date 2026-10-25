import type { InputHTMLAttributes } from 'react';

export function Field({
  label,
  hint,
  error,
  optional = false,
  id,
  className = '',
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
}) {
  const inputId = id ?? (typeof input.name === 'string' ? input.name : undefined);
  const descriptionId = inputId && (hint || error) ? `${inputId}-description` : undefined;
  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={inputId}>
      <span className="ui-field-label">{label}{optional ? <span>optional</span> : null}</span>
      <input {...input} id={inputId} aria-invalid={error ? true : undefined} aria-describedby={descriptionId} />
      {error ? <span id={descriptionId} className="ui-field-error">{error}</span> : hint ? <span id={descriptionId} className="ui-field-hint">{hint}</span> : null}
    </label>
  );
}
