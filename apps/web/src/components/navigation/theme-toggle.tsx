'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { currentAppearance, setAppearance, subscribeAppearance } from '@/lib/appearance';

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribeAppearance, currentAppearance, () => 'light' as const);
  return <div className="appearance-toggle" role="group" aria-label="Color appearance">
    <button type="button" aria-label="Atlas Light" aria-pressed={mode === 'light'} title="Atlas Light" onClick={() => setAppearance('light')}><Sun size={16}/><span>Light</span></button>
    <button type="button" aria-label="Midnight Blue" aria-pressed={mode === 'dark'} title="Midnight Blue" onClick={() => setAppearance('dark')}><Moon size={16}/><span>Dark</span></button>
  </div>;
}
