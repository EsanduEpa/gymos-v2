'use client';
import { useRef, useState } from 'react';
import type { RegistryPage } from '@gymos/contracts/platform';
import { LifecycleControl } from './lifecycle-control';
import { enterSupport, exitSupport, retryProvisioning, ownerCredential } from '@/app/platform-actions';
import { Button, Feedback, Field, StatusBadge, Card, EmptyState, ConfirmDialog } from '@/components/ui';
import { ArrowRight, ArrowUpRight, Building2, ChevronDown, Plus, ShieldCheck } from 'lucide-react';

type Page=RegistryPage;
export function Registry({ page, selectedSlug, supportExpiresAt, hasCursor }: { page: Page; selectedSlug?: string; supportExpiresAt?: string; hasCursor: boolean }) {
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [reasonCode, setReasonCode] = useState('DIAGNOSE_ACCESS');
  const supportForm = useRef<HTMLFormElement>(null);
  const selectedGym = page.items.find(gym => gym.id === selected);
  const attention = page.items.filter(gym => gym.status !== 'ACTIVE' || gym.health !== 'VERIFIED' || gym.operation?.ownerVerificationRequired).length;
  async function enter(data: FormData) {
    setPending(true); setError('');
    try {
      const result = await enterSupport(data);
      if (result.destination) {
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('gymos-session'); channel.postMessage('support-changed'); channel.close();
        }
        window.location.assign(result.destination);
      } else setError(result.error ?? 'Support unavailable.');
    } finally { setPending(false); }
  }
  return <Card id="gym-registry" className="platform-registry-card">
    <div className="platform-registry-heading"><div><span className="platform-eyebrow">WORKSPACE DIRECTORY</span><h2>Gym registry <span className="platform-count">{page.total}</span></h2><p>Manage your gym workspaces and enter secure, read-only support.</p></div><a className="ui-button ui-button-secondary" href="#create-gym"><Plus size={16}/> Add a gym</a></div>
    {selectedSlug ? <div className="support-banner" role="status"><span className="platform-section-icon"><ShieldCheck size={20}/></span><div><strong>Viewing {page.items.find(gym => gym.slug === selectedSlug)?.name ?? selectedSlug} · read-only support</strong>{supportExpiresAt ? <small>Expires <time dateTime={supportExpiresAt}>{new Date(supportExpiresAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</time></small> : null}</div><a className="platform-text-link" href={`/gyms/${encodeURIComponent(selectedSlug)}/owner`}>Open summary <ArrowUpRight size={15}/></a><form action={exitSupport} data-support-exit><Button variant="secondary">Exit support</Button></form></div> : null}
    <div className="platform-registry-caption"><span>Showing {page.items.length} of {page.total} gyms</span><span><i className={`health-dot ${attention ? 'is-warning' : 'is-success'}`}/>{attention ? `${attention} need attention on this page` : 'No workspace alerts on this page'}</span></div>
    {page.items.length === 0 ? <EmptyState title="Your first gym starts here" hint="Create a dedicated workspace to welcome a gym and its owner." icon={<Building2 size={24}/>}/> : <div className="ui-table-shell platform-registry"><div className="ui-table-scroll"><table role="table" aria-label="Registered gym tenants"><thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Gym workspace</th><th role="columnheader" scope="col">Owner</th><th role="columnheader" scope="col">Members</th><th role="columnheader" scope="col">Status</th><th role="columnheader" scope="col">Workspace health</th><th role="columnheader" scope="col">Actions</th></tr></thead><tbody role="rowgroup">
      {page.items.map(gym => <tr role="row" key={gym.id} data-selected={gym.slug === selectedSlug || undefined}>
        <td role="cell" data-label="Gym workspace"><div className="platform-gym-cell"><span className="platform-gym-avatar" aria-hidden="true">{gym.name.slice(0, 2).toUpperCase()}</span><div><strong>{gym.name}</strong><small>{gym.slug}</small></div></div></td>
        <td role="cell" data-label="Owner"><span className="platform-owner-name">{gym.ownerName ?? 'Name unavailable'}</span></td>
        <td role="cell" data-label="Members">{gym.memberCount ?? '—'}<small>{gym.memberCount === null ? 'Summary unavailable' : 'Profiles'}</small></td>
        <td role="cell" data-label="Status"><StatusBadge status={gym.status}/></td>
        <td role="cell" data-label="Workspace health"><span className="platform-health-label"><i className={`health-dot ${gym.health === 'VERIFIED' ? 'is-success' : gym.health === 'REPAIR_REQUIRED' ? 'is-warning' : 'is-muted'}`}/>{gym.health === 'VERIFIED' ? 'Verified' : gym.health === 'REPAIR_REQUIRED' ? 'Review required' : 'Unavailable'}</span>{gym.observedAt ? <small>Observed <time dateTime={gym.observedAt}>{new Date(gym.observedAt).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC</time></small> : <small>No verified observation</small>}
          {gym.operation ? <details className="platform-operation-details"><summary>Setup details <ChevronDown size={13}/></summary><span>{gym.operation.state.replaceAll('_', ' ')}</span><small>Current step: {gym.operation.step.replaceAll('_', ' ')}</small><OperationControls operation={gym.operation}/></details> : <small>No provisioning operation available</small>}
        </td>
        <td role="cell" data-label="Actions"><div className="platform-row-actions"><Button variant="secondary" type="button" disabled={pending || gym.slug === selectedSlug} onClick={() => { setError(''); setExplanation(''); setReasonCode('DIAGNOSE_ACCESS'); setSelected(gym.id); }}>{gym.slug === selectedSlug ? 'In support' : <><ArrowUpRight size={15}/> Open support</>}</Button><LifecycleControl gym={gym}/></div></td>
      </tr>)}
    </tbody></table></div></div>}
    <nav className="platform-pagination" aria-label="Registry pages"><span>Up to 25 gyms per page · counts reflect the last observation</span><div>{hasCursor ? <a className="ui-button ui-button-secondary" href="/admin#gym-registry" rel="prev">First page</a> : null}{page.nextCursor ? <a className="ui-button ui-button-secondary" href={`/admin?cursor=${encodeURIComponent(page.nextCursor)}#gym-registry`} rel="next">Next page <ArrowRight size={15}/></a> : null}</div></nav>
    <ConfirmDialog open={Boolean(selectedGym)} title="Enter read-only support" description={`View a scoped summary for ${selectedGym?.name ?? 'this gym'}. Access expires after 15 minutes and replaces any previous support context.`} confirmLabel="Enter support" pending={pending} error={error} onClose={() => { setSelected(''); setError(''); }} onConfirm={() => supportForm.current?.requestSubmit()}>
      <form ref={supportForm} action={enter} className="platform-support-form" data-support-change>
        <input type="hidden" name="gymId" value={selected}/>
        <label className="ui-field"><span className="ui-field-label">Reason code</span><select name="reasonCode" required value={reasonCode} onChange={event => setReasonCode(event.currentTarget.value)}><option value="DIAGNOSE_ACCESS">Access diagnosis</option><option value="DIAGNOSE_CONFIGURATION">Configuration diagnosis</option><option value="DIAGNOSE_PROVISIONING">Provisioning diagnosis</option></select></label>
        <Field label="Support reason" name="explanation" value={explanation} onChange={event => setExplanation(event.currentTarget.value)} minLength={10} maxLength={500} required hint="Explain the task in 10–500 characters. Leave out passwords and private member information."/>
        <p className="platform-privacy-note"><ShieldCheck size={17}/> Summary access only. Gym records and settings cannot be changed.</p>
      </form>
    </ConfirmDialog>
  </Card>;
}
function OperationControls({operation}:{operation:Page['items'][number]['operation']}){
 const [pending,setPending]=useState(false);const [error,setError]=useState('');
 const [delivery,setDelivery]=useState<{deliveryVersion:number;temporaryPassword?:string}|null>(null);
 const [acknowledged,setAcknowledged]=useState(false);
 const [reissueReason,setReissueReason]=useState<'LOST_HANDOFF'|'EXPIRED_CREDENTIAL'|null>(null);
 const reissueKey=useRef<string|null>(null);
 if(!operation)return null;
 async function handoff(mode:'issue'|'reissue'|'acknowledge'){
  reissueKey.current??=crypto.randomUUID();
  setPending(true);setError('');
  try{const result=await ownerCredential(operation!.operationId,mode,mode==='issue'?{}:mode==='acknowledge'?{deliveryVersion:delivery?.deliveryVersion}:{expectedVersion:delivery?.deliveryVersion??0,reason:reissueReason??'LOST_HANDOFF',idempotencyKey:reissueKey.current});
   if(result.error)setError(result.error);else if(result.delivery){setDelivery(result.delivery);setReissueReason(null);reissueKey.current=null;}else if(result.acknowledged){setDelivery(null);setAcknowledged(true);}
  }finally{setPending(false);}
 }
 async function retry(){setPending(true);setError('');try{const result=await retryProvisioning(operation!.operationId,operation!.version);if(result.error)setError(result.error);else window.location.reload();}finally{setPending(false);}}
 return <div className="operation-controls"><code>{operation.operationId}</code>
 {operation.retryable?<Button type="button" variant="secondary" disabled={pending} onClick={retry}>{pending?'Requesting…':'Retry operation'}</Button>:null}
 {operation.state==='REPAIR_REQUIRED'?<p>Controlled repair review is required.</p>:null}
 {operation.ownerVerificationRequired?<p>Awaiting the existing owner’s private consent.</p>:null}
 {operation.credentialHandoffAvailable&&!acknowledged?<Button variant="secondary" type="button" disabled={pending} onClick={()=>handoff('issue')}>Owner credential handoff</Button>:null}
 {delivery?<div className="credential-handoff" aria-live="polite">{delivery.temporaryPassword?<><p>Copy this once and deliver it privately. The owner must change it within 24 hours.</p><output aria-label="One-time owner password">{delivery.temporaryPassword}</output><Button type="button" disabled={pending} onClick={()=>handoff('acknowledge')}>I delivered this credential</Button></>:<><p>The credential was already issued and cannot be retrieved.</p><Button type="button" variant="danger" disabled={pending} onClick={()=>setReissueReason('LOST_HANDOFF')}>Reissue lost handoff</Button><Button type="button" variant="secondary" disabled={pending} onClick={()=>setReissueReason('EXPIRED_CREDENTIAL')}>Replace expired credential</Button></>}</div>:null}
 <ConfirmDialog open={reissueReason!==null} title={reissueReason==='EXPIRED_CREDENTIAL'?'Replace expired credential?':'Reissue lost handoff?'} description="The previous unacknowledged credential will be revoked. Copy and privately deliver the replacement once." destructive pending={pending} error={error} onClose={()=>setReissueReason(null)} onConfirm={()=>void handoff('reissue')}/>{acknowledged?<p>Handoff acknowledged.</p>:null}{error?<Feedback tone="error">{error}</Feedback>:null}</div>;
}
