'use client';

import type { KeyboardEvent } from 'react';

export type TabItem = { id: string; label: string; disabled?: boolean };

export function Tabs({ label, items, value, onChange }: { label: string; items: TabItem[]; value: string; onChange: (id: string) => void }) {
  function move(event: KeyboardEvent<HTMLButtonElement>, direction: 1 | -1 | 'first' | 'last') {
    const enabled = items.filter((item) => !item.disabled);
    const current = enabled.findIndex((item) => item.id === value);
    const next = direction === 'first' ? enabled[0] : direction === 'last' ? enabled.at(-1) : enabled[(current + direction + enabled.length) % enabled.length];
    if (!next) return;
    event.preventDefault();
    onChange(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }
  return <div className="ui-tabs" role="tablist" aria-label={label}>{items.map((item) => <button key={item.id} id={`tab-${item.id}`} role="tab" type="button" aria-selected={value === item.id} aria-controls={`panel-${item.id}`} tabIndex={value === item.id ? 0 : -1} disabled={item.disabled} onClick={() => onChange(item.id)} onKeyDown={(event) => {
    if (event.key === 'ArrowRight') move(event, 1);
    if (event.key === 'ArrowLeft') move(event, -1);
    if (event.key === 'Home') move(event, 'first');
    if (event.key === 'End') move(event, 'last');
  }}>{item.label}</button>)}</div>;
}
