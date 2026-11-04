import type { CSSProperties } from 'react';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { auditEventCodeSchema, budgetListSchema, configurationReadSchema, expenseCategorySchema, expenseListSchema, financePnlSchema, financeReadQuerySchema, financeRevenueSchema, payrollPeriodListSchema } from '@gymos/contracts';
import { resolveGymBrandColors } from '@gymos/theme-tokens';
import { BudgetEditors, ExpenseForm, PayrollCommands } from '@/components/finance/finance-forms';
import { DashboardChrome } from '@/components/navigation/dashboard-chrome';
import { Card, CardHeader, EmptyState, Feedback } from '@/components/ui';
import { requireGymContext } from '@/lib/gym-context';
import { apiUrl } from '@/lib/gymos';

const tabs = [['revenue', 'Revenue'], ['expenses', 'Expenses'], ['deferred', 'Deferred'], ['payroll', 'Payroll'], ['pnl', 'P&L'], ['export', 'Export']] as const;
const categories = expenseCategorySchema.options;
function localToday(zone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function firstDay(month: string) { return `${month}-01`; }
function validDate(value?: string) { return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)); }
async function read<T>(slug: string, path: string, token: string, schema: { safeParse(value: unknown): { success: boolean; data?: T } }): Promise<{ data: T | null; unavailable: boolean }> {
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/${path}`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (response.status === 401) redirect('/login');
    if (response.status === 403 || response.status === 404) notFound();
    if (!response.ok) return { data: null, unavailable: true };
    const parsed = schema.safeParse(await response.json().catch(() => null));
    return parsed.success && parsed.data ? { data: parsed.data, unavailable: false } : { data: null, unavailable: true };
  } catch (error) { if (error && typeof error === 'object' && 'digest' in error) throw error; return { data: null, unavailable: true }; }
}

export default async function OwnerFinancialsPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; from?: string; to?: string; month?: string; page?: string; category?: string; exportError?: string }>;
}) {
  const { slug } = await params;
  const search = await searchParams;
  const { token, session, gym, theme } = await requireGymContext(slug, 'OWNER');
  const settings = await read(slug, 'configuration', token, configurationReadSchema);
  if (!settings.data) return <main><Feedback tone="error">Finance configuration is unavailable. Reload to try again.</Feedback></main>;
  const today = localToday(settings.data.configuration.timezone);
  const defaultMonth = today.slice(0, 7);
  const from = validDate(search.from) ? search.from! : firstDay(defaultMonth);
  const to = validDate(search.to) && search.to! >= from ? search.to! : today;
  const parsedQuery = financeReadQuerySchema.safeParse({ from, to, page: search.page ?? '1', pageSize: 25 });
  const page = parsedQuery.success ? parsedQuery.data.page : 1;
  const tab = tabs.some(([id]) => id === search.tab) ? search.tab! : 'revenue';
  const paramsQuery = new URLSearchParams({ from, to, page: String(page), pageSize: '25' });
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(search.month ?? '') ? search.month! : from.slice(0, 7);
  const [revenue, expenses, budgets, payroll, pnl] = await Promise.all([
    ['revenue', 'deferred', 'pnl', 'export'].includes(tab) ? read(slug, `financials/revenue?${paramsQuery}`, token, financeRevenueSchema) : Promise.resolve({ data: null, unavailable: false }),
    ['expenses', 'pnl'].includes(tab) ? read(slug, `financials/expenses?${new URLSearchParams({ ...Object.fromEntries(paramsQuery), ...(search.category ? { category: search.category } : {}) })}`, token, expenseListSchema) : Promise.resolve({ data: null, unavailable: false }),
    ['expenses', 'pnl'].includes(tab) ? read(slug, `financials/budgets?month=${month}`, token, budgetListSchema) : Promise.resolve({ data: null, unavailable: false }),
    ['payroll', 'pnl'].includes(tab) ? read(slug, 'payroll/periods', token, payrollPeriodListSchema) : Promise.resolve({ data: null, unavailable: false }),
    tab === 'pnl' ? read(slug, `financials/pnl?${paramsQuery}`, token, financePnlSchema) : Promise.resolve({ data: null, unavailable: false }),
  ]);
  const brand = resolveGymBrandColors(theme.primaryColor);
  const style = { '--gym-color': brand.primary, '--gym-on-color': brand.onPrimary } as CSSProperties;
  const base = `/gyms/${encodeURIComponent(slug)}/owner/financials`;
  const sharedParams = new URLSearchParams({ from, to, month, page: String(page) });
  return <DashboardChrome identityId={session.identityId} key={`${session.identityId}:${gym.id}:${gym.role}`} gym={gym} gyms={session.gyms}
    displayName={session.displayName ?? 'GymOS user'} style={style}>
    <div className="gym-banner"><div><span className="eyebrow">OWNER FINANCE</span><h1>Financials</h1><p>Operational earning and expense reports · {settings.data.configuration.currency} · {settings.data.configuration.timezone}</p></div></div>
    <nav className="finance-tabs" aria-label="Finance sections">{tabs.map(([id, label]) => <a key={id} aria-current={tab === id ? 'page' : undefined}
      className={`finance-tab ${tab === id ? 'finance-tab-active' : ''}`} href={`${base}?${new URLSearchParams({ ...Object.fromEntries(sharedParams), tab: id })}`}>{label}</a>)}</nav>
    <section id={`panel-${tab}`} role="region" aria-label={tabs.find(([id]) => id === tab)?.[1]}>
      {['revenue', 'deferred', 'pnl', 'export'].includes(tab) ? <Card><CardHeader eyebrow="OPERATIONAL EARNINGS" title={tab === 'revenue' ? 'Revenue' : tab === 'deferred' ? 'Deferred value' : tab === 'pnl' ? 'Operational P&L' : 'Export'}/>
        {revenue.data ? <><form method="get" className="member-directory-filters"><input type="hidden" name="tab" value={tab}/><label className="ui-field"><span className="ui-field-label">From</span><input type="date" name="from" defaultValue={from} required/></label><label className="ui-field"><span className="ui-field-label">To</span><input type="date" name="to" defaultValue={to} required/></label><button className="ui-button ui-button-secondary">Apply window</button></form>
          <p>Operational earning; not money received. Window {revenue.data.from}–{revenue.data.to} · as of {revenue.data.asOf}. Cash received is unavailable.</p>
          {tab === 'revenue' || tab === 'pnl' ? <div className="finance-metrics">{[
            ['Membership', revenue.data.totals.membership], ['Completed sessions', revenue.data.totals.completedSession], ['Missed late', revenue.data.totals.missedLate],
            ['Late cancellation', revenue.data.totals.lateCancel], ['Operational total', revenue.data.totals.totalOperational],
          ].map(([label, value]) => <div className="finance-metric" key={label}><small>{label}</small><strong>{value} {revenue.data!.currency}</strong></div>)}</div> : null}
          {tab === 'deferred' ? <div className="finance-metrics">{[
            ['Membership not yet recognized', revenue.data.deferred.membershipUnrecognized], ['Available pack value', revenue.data.deferred.packAvailable],
            ['Held pack value', revenue.data.deferred.packHeld], ['Expired unused pack value · separate', revenue.data.deferred.expiredPackUnused],
          ].map(([label, value]) => <div className="finance-metric" key={label}><small>{label}</small><strong>{value} {revenue.data!.currency}</strong></div>)}</div> : null}
          {tab === 'revenue' ? <div className="ui-table-shell"><div className="ui-table-scroll"><table aria-label="Operational earning lines"><thead><tr><th>Date</th><th>Category</th><th>Source</th><th>Value</th></tr></thead><tbody>{revenue.data.lines.map(line => <tr key={line.id}><td>{line.occurredAt.slice(0, 10)}</td><td>{line.category.replaceAll('_', ' ')}</td><td>{line.sourceType} · {line.sourceId}</td><td>{line.amount} {line.currency}</td></tr>)}</tbody></table></div>{revenue.data.totalCount === 0 ? <EmptyState title="No operational earning in this window." hint="Completed and charged lifecycle facts appear here when they occur."/> : <p>Page {revenue.data.page} · {revenue.data.totalCount} earning lines in the full window.</p>}</div> : null}
          {tab === 'pnl' ? pnl.data ? <><p>{pnl.data.method}</p><div className="finance-metrics">{[
            ['Operational earning', pnl.data.operationalEarning], ['Expenses excluding SALARIES category', pnl.data.expenses], ['Trainer payroll cost', pnl.data.payrollCost],
            ['SALARIES expense shown separately', pnl.data.salaryExpenseExcluded], ['Operating surplus', pnl.data.operatingSurplus],
          ].map(([label, value]) => <div className="finance-metric" key={label}><small>{label}</small><strong>{value} {pnl.data!.currency}</strong></div>)}</div>
            <h3>Expense mix · {pnl.data.from}–{pnl.data.to}</h3><div className="ui-table-shell"><table aria-label="Full-window expense totals by category"><thead><tr><th>Category</th><th>Amount</th><th>Records</th></tr></thead><tbody>{pnl.data.expenseByCategory.map(row => <tr key={row.category}><td>{row.category}</td><td>{row.amount} {pnl.data!.currency}</td><td>{row.sourceCount}</td></tr>)}</tbody></table></div>
            <p>Full window; recognition date for earnings, accounting date for expenses, scheduled source-session date for trainer payroll · as of {pnl.data.asOf} · {pnl.data.timeZone}.</p></> : <Feedback tone="error">P&L reconciliation unavailable. No financial result is inferred from partial pages.</Feedback> : null}
          {tab === 'export' ? <><Feedback tone="info">Authenticated CSV snapshot · 5,000-row cap · spreadsheet formulas are escaped. Audit exports contain only the selected filtered page.</Feedback>
            {search.exportError ? <Feedback tone="error">The export failed or could not be verified. No file was delivered; adjust the scope and try again.</Feedback> : null}
            <form method="post" action={`/api/gyms/${encodeURIComponent(slug)}/financials/export`} className="member-directory-filters">
              <label className="ui-field"><span className="ui-field-label">Export type</span><select name="kind"><option value="revenue">Operational earnings</option><option value="expenses">Expenses</option><option value="payroll">Trainer payroll</option><option value="audit">Audit · current page</option></select></label>
              <label className="ui-field"><span className="ui-field-label">From</span><input type="date" name="from" defaultValue={from}/></label><label className="ui-field"><span className="ui-field-label">To</span><input type="date" name="to" defaultValue={to}/></label>
              <label className="ui-field"><span className="ui-field-label">Audit page</span><input name="page" type="number" min="1" defaultValue="1"/></label><input type="hidden" name="pageSize" value="20"/>
              <label className="ui-field"><span className="ui-field-label">Audit action filter</span><select name="actionType"><option value="">All events</option>{auditEventCodeSchema.options.map(code => <option key={code} value={code}>{code.replaceAll('_', ' ')}</option>)}</select></label>
              <button className="ui-button ui-button-primary" type="submit">Download CSV</button>
            </form>
          </> : null}
        </> : <Feedback tone="error">Revenue data is unavailable. No finance state was changed. Reload to retry.</Feedback>}
      </Card> : null}
      {tab === 'expenses' ? <div className="dashboard-grid"><Card><CardHeader eyebrow="EXPENSES" title="Expense list"/>
          <form method="get" className="member-directory-filters"><input type="hidden" name="tab" value="expenses"/><input type="hidden" name="month" value={month}/><label className="ui-field"><span className="ui-field-label">From</span><input type="date" name="from" defaultValue={from}/></label><label className="ui-field"><span className="ui-field-label">To</span><input type="date" name="to" defaultValue={to}/></label><label className="ui-field"><span className="ui-field-label">Category</span><select name="category" defaultValue={search.category ?? ''}><option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label><button className="ui-button ui-button-secondary">Filter</button></form>
          {expenses.data ? <><p>{expenses.data.totalCount} matching expenses · {expenses.data.totalAmount} {expenses.data.currency} full-window total · as of {expenses.data.asOf}</p>{expenses.data.items.length ? <div className="member-list">{expenses.data.items.map(row => <div className="member-row" key={row.id}><div><strong>{row.category} · {row.accountingDate}</strong><small>{row.description ?? 'No description'}{row.recurring ? ' · recurring note' : ''}</small></div><span>{row.amount} {row.currency}</span></div>)}</div> : <EmptyState title="No expenses in this window." hint="Log an expense to add an operational record."/>}</> : <Feedback tone="error">Expense list unavailable. No changes were made.</Feedback>}
        </Card><Card><CardHeader eyebrow="NEW EXPENSE" title="Log an expense"/><ExpenseForm slug={slug} currency={settings.data.configuration.currency} today={today} initialKey={randomUUID()}/></Card>
        <Card><CardHeader eyebrow="CATEGORY BUDGETS" title={`Budget variance · ${month}`}/>{budgets.data ? <><p>{budgets.data.totalBudget} budget · {budgets.data.totalActual} actual · {budgets.data.totalVariance} variance {budgets.data.currency}</p><BudgetEditors slug={slug} currency={budgets.data.currency} month={month} budgets={budgets.data} initialKey={randomUUID()}/></> : <Feedback tone="error">Budget variance unavailable. No changes were made.</Feedback>}</Card></div> : null}
      {tab === 'payroll' ? <Card><CardHeader eyebrow="TRAINER PAY" title="Payroll periods"/><p>Closing freezes ordinary entries for review. Approval freezes the approved result and does not record a payout.</p>{payroll.data?.items.length ? <PayrollCommands slug={slug} payroll={payroll.data} initialKey={randomUUID()}/> : payroll.data ? <EmptyState title="No pay period yet." hint="The first eligible completed session creates a period."/> : <Feedback tone="error">Payroll is unavailable. No state changed.</Feedback>}</Card> : null}
    </section>
  </DashboardChrome>;
}
