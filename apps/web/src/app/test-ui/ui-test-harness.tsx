'use client';

import { useState } from 'react';
import { Button, ConfirmDialog, DataTable, Field, Tabs } from '@/components/ui';

const tabItems = [
  { id: 'members', label: 'Members' },
  { id: 'billing', label: 'Billing', disabled: true },
  { id: 'activity', label: 'Activity' },
];

const rows = [
  { id: '1', name: 'Alex Morgan', status: 'Active membership with a long description' },
  { id: '2', name: 'Sam Lee', status: 'Pending membership with a long description' },
  { id: '3', name: 'Jordan Silva', status: 'Active membership with a long description' },
];

export function UiTestHarness() {
  const [tab, setTab] = useState('members');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [attempts, setAttempts] = useState(0);

  function confirm() {
    if (pending) return;
    setPending(true);
    setAttempts((value) => value + 1);
    window.setTimeout(() => {
      setPending(false);
      setError('The change could not be saved. Check the name and try again.');
    }, 150);
  }

  return (
    <main className="ui-test-page">
      <h1>Shared interface checks</h1>
      <Tabs label="Workspace sections" items={tabItems} value={tab} onChange={setTab} />
      <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <DataTable label="Members" columns={[{ header: 'Name', cell: 'name' }, { header: 'Status', cell: 'status' }]} rows={rows} rowKey={(row) => row.id} pageSize={2} />
      </section>
      <Button type="button" onClick={() => { setError(undefined); setDialogOpen(true); }}>Open confirmation</Button>
      <span aria-live="polite">Confirm attempts: {attempts}</span>
      <a href="#outside">Outside dialog</a>
      <ConfirmDialog open={dialogOpen} title="Rename member" description="Enter the member’s new name." confirmLabel="Save change" pending={pending} error={error} onClose={() => setDialogOpen(false)} onConfirm={confirm}>
        <Field label="Member name" name="memberName" defaultValue="Draft name" />
      </ConfirmDialog>
    </main>
  );
}
