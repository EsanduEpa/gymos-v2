'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Button } from './button';
import { Feedback } from './feedback';

export function ConfirmDialog({ open, title, description, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, pending = false, error, onClose, onConfirm }: { open: boolean; title: string; description?: string; children?: ReactNode; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; pending?: boolean; error?: string; onClose: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      opener.current = document.activeElement as HTMLElement | null;
      element.showModal();
      element.querySelector<HTMLElement>('input, button, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
    } else if (!open && element.open) {
      element.close();
      opener.current?.focus();
    }
  }, [open]);
  useEffect(() => () => opener.current?.focus(), []);
  function backdrop(event: MouseEvent<HTMLDialogElement>) {
    if (!pending && event.target === event.currentTarget) onClose();
  }
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return <dialog ref={dialog} className="ui-dialog" aria-labelledby={headingId} aria-describedby={description ? descriptionId : undefined} onKeyDown={trapFocus} onClick={backdrop} onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }}><div className="ui-dialog-card"><div><h2 id={headingId}>{title}</h2>{description ? <p id={descriptionId}>{description}</p> : null}</div>{children}{error ? <Feedback tone="error">{error}</Feedback> : null}<div className="ui-dialog-actions"><Button variant="secondary" type="button" disabled={pending} onClick={onClose}>{cancelLabel}</Button><Button variant={destructive ? 'danger' : 'primary'} type="button" pending={pending} pendingLabel="Processing…" onClick={onConfirm}>{confirmLabel}</Button></div></div></dialog>;
}
