'use client';
import { useState } from 'react';

export function PasswordInput({ label = 'Password', name = 'password', autoComplete = 'current-password', minLength, maxLength }: {
  label?: string; name?: string; autoComplete?: string; minLength?: number; maxLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return <label className="ui-field"><span>{label}</span><span className="password-input-row">
    <input name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} required/>
    <button type="button" className="password-visibility" aria-pressed={visible} onClick={() => setVisible(current => !current)}>
      {visible ? 'Hide' : 'Show'} password
    </button>
  </span></label>;
}
