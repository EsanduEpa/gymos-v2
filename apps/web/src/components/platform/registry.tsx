'use client';
import { useRef, useState } from 'react';
import type { RegistryPage } from '@gymos/contracts/platform';
import { LifecycleControl } from './lifecycle-control';
import { enterSupport, exitSupport, retryProvisioning, ownerCredential } from '@/app/platform-actions';
import { Button, Feedback, Field, StatusBadge, Card, CardHeader, EmptyState, ConfirmDialog } from '@/components/ui';

type Page=RegistryPage;
export function Registry({page,selectedSlug,supportExpiresAt,hasCursor}:{page:Page;selectedSlug?:string;supportExpiresAt?:string;hasCursor:boolean}){
 const [selected,setSelected]=useState('');const [error,setError]=useState('');const [pending,setPending]=useState(false);
 async function enter(data:FormData){setPending(true);setError('');try{const result=await enterSupport(data);if(result.destination){const channel=new BroadcastChannel('gymos-session');channel.postMessage('support-changed');channel.close();window.location.assign(result.destination);}else setError(result.error??'Support unavailable.');}finally{setPending(false);}}
 return <Card><CardHeader eyebrow="WORKSPACES" title={`Registered gym tenants (${page.total})`} />
 {selectedSlug?<div className="support-banner" role="status"><div><strong>Viewing {page.items.find(gym=>gym.slug===selectedSlug)?.name??selectedSlug} · read-only support</strong>{supportExpiresAt?<small>Expires <time dateTime={supportExpiresAt}>{new Date(supportExpiresAt).toLocaleString('en-GB',{timeZone:'UTC'})} UTC</time></small>:null}</div><a href={`/gyms/${encodeURIComponent(selectedSlug)}/owner`}>Open summary</a><form action={exitSupport} data-support-exit><Button variant="secondary">Exit support</Button></form></div>:null}
 {error?<Feedback tone="error">{error}</Feedback>:null}
 {page.items.length===0?<EmptyState title="No gyms yet." hint="Create the first one using the form."/>:<><p className="platform-page-count">Showing {page.items.length} gyms on this page · {page.total} registered · counts are sanitized and may be unavailable until verified.</p><div className="ui-table-shell platform-registry"><div className="ui-table-scroll"><table role="table" aria-label="Registered gym tenants"><thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Gym name · public identity</th><th role="columnheader" scope="col">Owner</th><th role="columnheader" scope="col">Members</th><th role="columnheader" scope="col">Lifecycle status</th><th role="columnheader" scope="col">Provisioning</th><th role="columnheader" scope="col">Action</th></tr></thead><tbody role="rowgroup">
 {page.items.map(gym=><tr role="row" key={gym.id} data-selected={gym.slug===selectedSlug||gym.id===selected||undefined}><td role="cell" data-label="Gym name · public identity"><strong>{gym.name}</strong><small>{gym.slug}</small></td><td role="cell" data-label="Owner">{gym.ownerName??'Name unavailable'}</td><td role="cell" data-label="Members">{gym.memberCount??'Unavailable'}{gym.observedAt?<small>Observed {new Date(gym.observedAt).toLocaleString('en-GB')} · {gym.health.replaceAll('_',' ')}</small>:<small>{gym.health.replaceAll('_',' ')}</small>}</td><td role="cell" data-label="Lifecycle status"><StatusBadge status={gym.status}/></td><td role="cell" data-label="Provisioning">{gym.operation?<><span>{gym.operation.state.replaceAll('_',' ')}</span><small>Current step: {gym.operation.step.replaceAll('_',' ')}</small><OperationControls operation={gym.operation}/></>:'No provisioning operation available'}</td><td role="cell" data-label="Action"><Button variant="secondary" type="button" aria-pressed={gym.id===selected||gym.slug===selectedSlug} disabled={pending||gym.slug===selectedSlug} onClick={()=>setSelected(gym.id)}>{gym.slug===selectedSlug?'In support':gym.id===selected?'Selected for support':'View dashboard'}</Button><LifecycleControl gym={gym}/></td></tr>)}
 </tbody></table></div></div></>}
 <nav className="platform-pagination" aria-label="Registry pages">{page.total>25?<span>Up to 25 gyms per page</span>:null}{hasCursor?<a href="/admin" rel="prev">← First page</a>:null}{page.nextCursor?<a href={`/admin?cursor=${encodeURIComponent(page.nextCursor)}`} rel="next">Next 25 gyms →</a>:null}</nav>
 {selected?<form action={enter} className="stack-form support-entry" data-support-change>
 <h3>Enter read-only support for {page.items.find(gym=>gym.id===selected)?.name}</h3><input type="hidden" name="gymId" value={selected}/>
 <label className="ui-field"><span className="ui-field-label">Reason code</span><select name="reasonCode" required defaultValue="DIAGNOSE_ACCESS"><option value="DIAGNOSE_ACCESS">Access diagnosis</option><option value="DIAGNOSE_CONFIGURATION">Configuration diagnosis</option><option value="DIAGNOSE_PROVISIONING">Provisioning diagnosis</option></select></label>
 <Field label="Support reason" name="explanation" minLength={10} maxLength={500} required hint="Explain the support task. Do not enter passwords, health notes or other private member information."/>
 <p>Read-only summary access expires after 15 minutes. Entering replaces your previous support context.</p>
 <div><Button type="submit" pending={pending} pendingLabel="Entering…">Enter support</Button> <Button type="button" variant="secondary" disabled={pending} onClick={()=>setSelected('')}>Cancel</Button></div>
 </form>:null}</Card>;
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
