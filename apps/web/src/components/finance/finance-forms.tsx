'use client';

import { useActionState, useState } from 'react';
import { expenseCategorySchema, type budgetListSchema, type payrollPeriodListSchema } from '@gymos/contracts';
import { Button, Feedback } from '@/components/ui';
import { approvePayrollAction, closePayrollAction, createExpenseAction, setBudgetAction, type FinanceActionState } from '@/app/finance-actions';

type BudgetList = typeof budgetListSchema._output;
type PayrollList = typeof payrollPeriodListSchema._output;
const categories = expenseCategorySchema.options;

export function ExpenseForm({ slug, currency, today, initialKey }: { slug: string; currency: string; today: string; initialKey: string }) {
  const [state, action, pending] = useActionState(createExpenseAction.bind(null, slug), { nextIdempotencyKey: initialKey } satisfies FinanceActionState);
  const [draft, setDraft] = useState({ category: 'RENT', amount: '', accountingDate: today, description: '', recurring: false });
  return <form action={action} className="stack-form">
    <input type="hidden" name="currency" value={currency}/><input type="hidden" name="idempotencyKey" value={state.nextIdempotencyKey ?? initialKey}/>
    <label className="ui-field"><span className="ui-field-label">Category</span><select name="category" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}>{categories.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
    <label className="ui-field"><span className="ui-field-label">Amount ({currency})</span><input name="amount" inputMode="decimal" required value={draft.amount} onChange={event => setDraft({ ...draft, amount: event.target.value })}/></label>
    <label className="ui-field"><span className="ui-field-label">Accounting date</span><input name="accountingDate" type="date" max={today} required value={draft.accountingDate} onChange={event => setDraft({ ...draft, accountingDate: event.target.value })}/></label>
    <label className="ui-field"><span className="ui-field-label">Description</span><textarea name="description" maxLength={500} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })}/></label>
    <label><input name="recurring" type="checkbox" checked={draft.recurring} onChange={event => setDraft({ ...draft, recurring: event.target.checked })}/> Recurring description (no automatic future expenses)</label>
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}{state.success ? <Feedback tone="success">{state.success}</Feedback> : null}
    <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save expense'}</Button>
  </form>;
}

export function BudgetEditors({ slug, currency, month, budgets, initialKey }: { slug: string; currency: string; month: string; budgets: BudgetList | null; initialKey: string }) {
  return <div className="member-list">{categories.map(category => {
    const row = budgets?.items.find(item => item.category === category);
    return <BudgetRow key={category} slug={slug} currency={currency} month={month} category={category} row={row} initialKey={`${initialKey}-${category.toLowerCase()}`}/>;
  })}</div>;
}

function BudgetRow({ slug, currency, month, category, row, initialKey }: { slug: string; currency: string; month: string; category: typeof categories[number];
  row: BudgetList['items'][number] | undefined; initialKey: string }) {
  const [state, action, pending] = useActionState(setBudgetAction.bind(null, slug), { nextIdempotencyKey: initialKey } satisfies FinanceActionState);
  const [amount, setAmount] = useState(row?.amount === '0.0000' ? '' : row?.amount ?? '');
  return <form action={action} className="finance-budget-row">
    <input type="hidden" name="currency" value={currency}/><input type="hidden" name="category" value={category}/><input type="hidden" name="month" value={month}/>
    <input type="hidden" name="expectedVersion" value={row?.version ?? ''}/><input type="hidden" name="idempotencyKey" value={state.nextIdempotencyKey ?? initialKey}/>
    <div><strong>{category.replaceAll('_', ' ')}</strong><small>{row ? `${row.actual} spent · variance ${row.variance}` : 'No budget set'}{row?.utilizationPercent !== null && row?.utilizationPercent !== undefined ? ` · ${row.utilizationPercent}%` : ''}</small></div>
    <label className="ui-field"><span className="ui-field-label">Monthly budget ({currency})</span><input name="amount" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" required/></label>
    <Button type="submit" variant="secondary" disabled={pending}>{pending ? 'Saving…' : row ? 'Update' : 'Set budget'}</Button>
    {state.error ? <Feedback tone="error">{state.error}</Feedback> : null}{state.success ? <Feedback tone="success">{state.success}</Feedback> : null}
  </form>;
}

export function PayrollCommands({ slug, payroll, initialKey }: { slug: string; payroll: PayrollList | null; initialKey: string }) {
  return <div className="member-list">{payroll?.items.map(period => <PayrollRow key={period.id} slug={slug} period={period} initialKey={`${initialKey}-${period.id}`}/>)}</div>;
}

function PayrollRow({ slug, period, initialKey }: { slug: string; period: PayrollList['items'][number]; initialKey: string }) {
  const [closed, closeAction, closing] = useActionState(closePayrollAction.bind(null, slug), {} satisfies FinanceActionState);
  const [approved, approveAction, approving] = useActionState(approvePayrollAction.bind(null, slug), {} satisfies FinanceActionState);
  const closeKey = closed.nextIdempotencyKey ?? `${initialKey}-close`;
  const approveKey = approved.nextIdempotencyKey ?? `${initialKey}-approve`;
  return <section className="finance-payroll-row"><div><strong>{period.cadence} · {period.start} to {period.endExclusive}</strong><small>{period.state} · {period.total} {period.currency} · {period.recordCount} earning records · {period.timezone}</small></div>
    {period.state === 'OPEN' ? <form action={closeAction}><input type="hidden" name="periodId" value={period.id}/><input type="hidden" name="expectedVersion" value={period.version}/><input type="hidden" name="idempotencyKey" value={closeKey}/><Button variant="secondary" disabled={closing}>Close for review</Button></form> : null}
    {period.state === 'CLOSED' ? <form action={approveAction}><input type="hidden" name="periodId" value={period.id}/><input type="hidden" name="expectedVersion" value={period.version}/><input type="hidden" name="expectedTotal" value={period.total}/><input type="hidden" name="idempotencyKey" value={approveKey}/><Button disabled={approving}>Approve period</Button></form> : null}
    {closed.error ? <Feedback tone="error">{closed.error}</Feedback> : null}{closed.success ? <Feedback tone="success">{closed.success}</Feedback> : null}
    {approved.error ? <Feedback tone="error">{approved.error}</Feedback> : null}{approved.success ? <Feedback tone="success">{approved.success}</Feedback> : null}
  </section>;
}
