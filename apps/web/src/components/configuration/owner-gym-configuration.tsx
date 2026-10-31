'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { GymConfigurationRead, GymThemeSettings, GymPublicProfile } from '@gymos/contracts';
import { Button, Card, CardHeader, Feedback, Field, Tabs, type TabItem } from '@/components/ui';
import { saveGymTheme, saveMembershipPlan, saveOperationalConfiguration, savePublicProfile } from '@/app/gym-config-actions';

type InitialSettings = { configuration: GymConfigurationRead; theme: GymThemeSettings; publicProfile: GymPublicProfile };
type FeedbackState = { tone: 'success' | 'error'; message: string } | null;
const tabs: TabItem[] = [
  { id: 'profile', label: 'Gym Profile' }, { id: 'plans', label: 'Membership Plans' },
  { id: 'fees', label: 'PT Session Rates' }, { id: 'rates', label: 'Trainer Pay Rates' }, { id: 'policy', label: 'Cancellation Policy' },
];

function ratioToPercent(value: string) {
  const [whole, fraction = ''] = value.split('.');
  const digits = `${whole}${fraction}`;
  const position = whole!.length + 2;
  const expanded = position >= digits.length ? `${digits}${'0'.repeat(position - digits.length)}` : `${digits.slice(0, position)}.${digits.slice(position)}`;
  return expanded.replace(/^0+(?=\d)/, '').replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
function percentToRatio(value: string) {
  const [whole, fraction = ''] = value.trim().split('.');
  if (!/^\d{1,3}$/.test(whole!) || !/^\d{0,4}$/.test(fraction) || Number(value) > 100) return '';
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, '');
  const point = whole!.length - 2;
  const raw = point <= 0 ? `0.${'0'.repeat(-point)}${digits}` : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return raw.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
function message(result: { ok: boolean; error?: string }, success: string): FeedbackState {
  return result.ok ? { tone: 'success', message: success } : { tone: 'error', message: result.error ?? 'Could not save these settings.' };
}
function FormCard({ eyebrow, title, feedback, children }: { eyebrow: string; title: string; feedback: FeedbackState; children: ReactNode }) {
  return <Card className="config-card"><CardHeader eyebrow={eyebrow} title={title} />{feedback ? <Feedback tone={feedback.tone}>{feedback.message}</Feedback> : null}{children}</Card>;
}

export function OwnerGymConfiguration({ slug, initial }: { slug: string; initial: InitialSettings }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [configuration, setConfiguration] = useState(initial.configuration);
  const [theme, setTheme] = useState(initial.theme);
  const [publicProfile, setPublicProfile] = useState(initial.publicProfile);
  const [themeColor, setThemeColor] = useState(initial.theme.theme.primaryColor);
  const [logoUrl, setLogoUrl] = useState(initial.theme.theme.logoUrl ?? '');
  const [gymName, setGymName] = useState(initial.publicProfile.name);
  const [feedback, setFeedback] = useState<Record<string, FeedbackState>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planDays, setPlanDays] = useState('30');

  async function submit(form: FormEvent<HTMLFormElement>, key: string, success: string, body: (data: FormData) => unknown,
    save: (payload: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>, apply?: (value: unknown) => void) {
    form.preventDefault(); setBusy(key); setFeedback(current => ({ ...current, [key]: null }));
    const result = await save(body(new FormData(form.currentTarget)));
    setBusy(null); setFeedback(current => ({ ...current, [key]: message(result, success) }));
    if (result.ok && result.data !== undefined) apply?.(result.data);
  }
  function fields(data: FormData, keys: string[]) { return Object.fromEntries(keys.map(key => [key, String(data.get(key) ?? '')])); }
  function setConfig(value: unknown) { setConfiguration(current => ({ ...current, configuration: value as GymConfigurationRead['configuration'] })); }

  return <div className="gym-config-workspace">
    <Tabs label="Gym configuration" items={tabs} value={activeTab} onChange={id => { setActiveTab(id); setFeedback({}); }} />
    {activeTab === 'profile' ? <section role="tabpanel" id="panel-profile" aria-labelledby="tab-profile" className="config-panel">
      <div className="config-grid">
        <FormCard eyebrow="OPERATIONAL SETTINGS" title="Gym Profile" feedback={feedback.operational}>
          <form className="config-form" onSubmit={event => submit(event, 'operational', 'Operational profile saved.', data => ({ expectedVersion: configuration.configuration.version, ...fields(data, ['address', 'phone', 'email', 'payPeriod']), phone: data.get('phone') || null, email: data.get('email') || null }), payload => saveOperationalConfiguration(slug, payload), setConfig)}>
            <Field label="Address" name="address" maxLength={300} defaultValue={configuration.configuration.address} />
            <div className="config-two-cols"><Field label="Phone Number" name="phone" optional maxLength={40} defaultValue={configuration.configuration.phone ?? ''} /><Field label="Contact Email" name="email" type="email" optional maxLength={254} defaultValue={configuration.configuration.email ?? ''} /></div>
            <label className="config-field"><span>Pay Period Calculation</span><select name="payPeriod" defaultValue={configuration.configuration.payPeriod}><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option></select></label>
            <div className="config-readonly-grid"><div><span>Currency</span><strong>{configuration.configuration.currency}</strong><small>Set during gym provisioning. It becomes fixed after financial activity.</small></div><div><span>Time zone</span><strong>{configuration.configuration.timezone}</strong><small>Changes after dated activity require a reviewed migration.</small></div></div>
            <Button type="submit" pending={busy === 'operational'}>Save Profile Settings</Button>
          </form>
        </FormCard>
        <FormCard eyebrow="PUBLIC GYM NAME" title="Display Name" feedback={feedback.publicProfile}>
          <form className="config-form" onSubmit={event => submit(event, 'publicProfile', 'Public display name saved in the platform registry.', () => ({ expectedVersion: publicProfile.version, name: gymName }), payload => savePublicProfile(slug, payload), value => { const result = value as GymPublicProfile; setPublicProfile(result); setGymName(result.name); router.refresh(); })}>
            <Field label="Gym Name" name="gymName" minLength={2} maxLength={120} required value={gymName} onChange={event => setGymName(event.currentTarget.value)} />
            <p className="config-hint">This name is stored separately from tenant contact settings and appears in the public gym shell.</p>
            <Button type="submit" pending={busy === 'publicProfile'}>Save Public Name</Button>
          </form>
        </FormCard>
        <FormCard eyebrow="APPROVED BRAND CONTROLS" title="Gym Appearance" feedback={feedback.theme}>
          <form className="config-form" onSubmit={event => submit(event, 'theme', 'Brand settings saved.', () => ({ expectedVersion: theme.theme.version, primaryColor: themeColor, logoUrl: logoUrl.trim() || null }), payload => saveGymTheme(slug, payload), value => { const result = value as GymThemeSettings; setTheme(result); setThemeColor(result.theme.primaryColor); setLogoUrl(result.theme.logoUrl ?? ''); router.refresh(); })}>
            <label className="config-field"><span>Primary Color</span><div className="config-color-row"><input aria-label="Primary color" type="color" value={themeColor} onChange={event => setThemeColor(event.currentTarget.value.toUpperCase())} /><input aria-label="Primary color hex" value={themeColor} onChange={event => setThemeColor(event.currentTarget.value)} maxLength={7} pattern="#[0-9a-fA-F]{6}" required /></div></label>
            <Field label="HTTPS Logo URL" name="logoUrl" type="url" placeholder="https://example.com/logo.png" optional maxLength={2048} value={logoUrl} onChange={event => setLogoUrl(event.currentTarget.value)} />
            <p className="config-hint">If a logo is unavailable, gym initials appear in the reserved space. Status and focus colors retain their accessible meaning.</p>
            <Button type="submit" pending={busy === 'theme'}>Save Appearance</Button>
          </form>
        </FormCard>
      </div>
    </section> : null}
    {activeTab === 'plans' ? <section role="tabpanel" id="panel-plans" aria-labelledby="tab-plans" className="config-panel">
      <FormCard eyebrow="MEMBERSHIP" title={`Active Membership Plans (${configuration.plans.filter(plan => plan.status === 'ACTIVE').length})`} feedback={feedback.plan}>
        <p className="config-hint">New terms keep the price and plan name agreed when they were created. Existing terms do not change when you add another plan.</p>
        {configuration.plans.length === 0 ? <div className="config-empty"><strong>No membership plans yet.</strong><span>Add a plan to make it available for future member enrollment.</span></div> : <div className="config-plan-list" role="list">{configuration.plans.map(plan => <article className="config-plan-row" role="listitem" key={plan.id}><div><strong>{plan.name}</strong><small>{plan.description || 'No description'}</small></div><span>{plan.durationDays} days</span><strong>{plan.currency} {plan.price}</strong><span className={`config-plan-status ${plan.status.toLowerCase()}`}>{plan.status}</span></article>)}</div>}
        {!showAddPlan ? <Button type="button" onClick={() => setShowAddPlan(true)}>+ Add New Plan</Button> : <form className="config-form config-add-plan" onSubmit={event => submit(event, 'plan', 'Membership plan created.', () => ({ expectedVersion: configuration.configuration.version, name: planName, description: planDescription || null, price: planPrice, durationDays: Number(planDays) }), payload => saveMembershipPlan(slug, payload), value => {
          const plan = value as GymConfigurationRead['plans'][number] & { configurationVersion: number };
          setConfiguration(current => ({ ...current, configuration: { ...current.configuration, version: plan.configurationVersion }, plans: [plan, ...current.plans] }));
          setPlanName(''); setPlanDescription(''); setPlanPrice(''); setPlanDays('30'); setShowAddPlan(false);
        })}>
          <h3>Create Membership Plan</h3>
          <Field label="Plan Name" name="name" value={planName} onChange={event => setPlanName(event.currentTarget.value)} maxLength={80} required />
          <label className="config-field"><span>Description</span><textarea name="description" value={planDescription} onChange={event => setPlanDescription(event.currentTarget.value)} maxLength={500} rows={3} /></label>
          <div className="config-two-cols"><Field label={`Price (${configuration.configuration.currency})`} name="price" inputMode="decimal" value={planPrice} onChange={event => setPlanPrice(event.currentTarget.value)} placeholder="0.00" required /><Field label="Duration (Days)" name="durationDays" type="number" min="1" max="3650" step="1" value={planDays} onChange={event => setPlanDays(event.currentTarget.value)} required /></div>
          <div className="config-actions"><Button type="submit" pending={busy === 'plan'}>Create Plan</Button><Button variant="secondary" type="button" onClick={() => setShowAddPlan(false)}>Cancel</Button></div>
        </form>}
      </FormCard>
    </section> : null}
    {activeTab === 'fees' ? <section role="tabpanel" id="panel-fees" aria-labelledby="tab-fees" className="config-panel"><FormCard eyebrow="PT SESSION RATES" title="Session Fee Card" feedback={feedback.fees}>
      <div className="config-notice">These prices apply to future confirmations. Existing session and payroll snapshots keep their saved amounts and policy versions.</div>
      <form className="config-form" onSubmit={event => submit(event, 'fees', 'Session rates saved for future confirmations.', data => ({ expectedVersion: configuration.configuration.version, defaultSessionFee: data.get('defaultSessionFee'), level2SessionFee: data.get('level2SessionFee') || '', introSessionFee: data.get('introSessionFee') || '' }), payload => saveOperationalConfiguration(slug, payload), setConfig)}>
        <Field label={`Standard Session Rate (${configuration.configuration.currency})`} name="defaultSessionFee" inputMode="decimal" defaultValue={configuration.configuration.defaultSessionFee} required />
        <div className="config-two-cols"><Field label={`Level 2 Trainer Rate (${configuration.configuration.currency})`} name="level2SessionFee" inputMode="decimal" optional defaultValue={configuration.configuration.level2SessionFee ?? ''} hint="Leave blank to use the standard rate. Enter 0 for a free session."/><Field label={`Introductory Session (${configuration.configuration.currency})`} name="introSessionFee" inputMode="decimal" optional defaultValue={configuration.configuration.introSessionFee ?? ''} hint="Leave blank to use the standard rate. Zero is valid."/></div>
        <Button type="submit" pending={busy === 'fees'}>Save Session Rates</Button>
      </form>
    </FormCard></section> : null}
    {activeTab === 'rates' ? <section role="tabpanel" id="panel-rates" aria-labelledby="tab-rates" className="config-panel"><FormCard eyebrow="TRAINER PAY RATES" title="Trainer Compensation" feedback={feedback.rates}>
      <div className="config-notice">These settings apply to future confirmations. Completed session pay snapshots remain unchanged.</div>
      <form className="config-form" onSubmit={event => submit(event, 'rates', 'Trainer pay rates saved.', data => ({ expectedVersion: configuration.configuration.version,
        level1BaseRate: percentToRatio(String(data.get('level1BaseRate') ?? '')), level2BaseRate: percentToRatio(String(data.get('level2BaseRate') ?? '')),
        offShiftPremium: percentToRatio(String(data.get('offShiftPremium') ?? '')) }), payload => saveOperationalConfiguration(slug, payload), setConfig)}>
        <div className="config-two-cols"><Field label="Level 1 Base Rate (%)" name="level1BaseRate" inputMode="decimal" defaultValue={ratioToPercent(configuration.configuration.level1BaseRate)} required/><Field label="Level 2 Base Rate (%)" name="level2BaseRate" inputMode="decimal" defaultValue={ratioToPercent(configuration.configuration.level2BaseRate)} required/></div>
        <Field label="Off-Shift Premium (%)" name="offShiftPremium" inputMode="decimal" defaultValue={ratioToPercent(configuration.configuration.offShiftPremium)} required hint="Added to trainer pay when the session falls outside configured shift hours."/>
        <Button type="submit" pending={busy === 'rates'}>Update Pay Rates</Button>
      </form>
    </FormCard></section> : null}
    {activeTab === 'policy' ? <section role="tabpanel" id="panel-policy" aria-labelledby="tab-policy" className="config-panel"><FormCard eyebrow="CANCELLATION POLICY" title="Session Policy" feedback={feedback.policy}>
      <form className="config-form" onSubmit={event => submit(event, 'policy', 'Cancellation policy saved.', data => ({ expectedVersion: configuration.configuration.version,
        cancellationWindowMinutes: Math.round(Number(data.get('cancellationWindowHours')) * 60), minimumSessionDurationMinutes: Number(data.get('minimumSessionDurationMinutes')),
        lateCancelDeduction: data.get('lateCancelDeduction') === 'on' }), payload => saveOperationalConfiguration(slug, payload), setConfig)}>
        <Field label="Cancellation Window (Hours)" name="cancellationWindowHours" type="number" step="any" min="0" max="168" defaultValue={configuration.configuration.cancellationWindowMinutes / 60} required hint="Cancellation at the cutoff is free. Later cancellation follows the late policy."/>
        <Field label="Minimum Session Duration (Minutes)" name="minimumSessionDurationMinutes" type="number" step="1" min="15" max="480" defaultValue={configuration.configuration.minimumSessionDurationMinutes} required hint="Approved session duration bounds are 15–480 minutes."/>
        <div className="config-fixed-policy"><strong>No-show entitlement rule</strong><span>An eligible no-show always consumes the held session credit. This approved rule is fixed.</span></div>
        <label className="config-checkbox"><input type="checkbox" name="lateCancelDeduction" defaultChecked={configuration.configuration.lateCancelDeduction}/><span>Enable Late Cancellation Pack Deduction</span></label>
        <Button type="submit" pending={busy === 'policy'}>Save Cancellation Policy</Button>
      </form>
    </FormCard></section> : null}
  </div>;
}
