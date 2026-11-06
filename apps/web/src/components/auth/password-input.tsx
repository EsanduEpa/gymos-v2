'use client';
import { useState } from 'react';

export function PasswordInput({ label = 'Password', name = 'password', autoComplete = 'current-password' }: {
  label?: string; name?: string; autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return <label className="ui-field"><span>{label}</span><span className="password-input-row">
    <input name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required/>
    <button type="button" className="password-visibility" aria-pressed={visible} onClick={() => setVisible(current => !current)}>
      {visible ? 'Hide' : 'Show'} password
    </button>
  </span></label>;
}
