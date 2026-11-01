'use client';
import { useRef, useState } from 'react';
import type { RegistryPage } from '@gymos/contracts/platform';
import { changeGymLifecycle } from '@/app/platform-actions';
import { Button, ConfirmDialog, Feedback, Field } from '@/components/ui';
export function LifecycleControl({gym}:{gym:RegistryPage['items'][number]}){
 const [open,setOpen]=useState(false);const [pending,setPending]=useState(false);const [error,setError]=useState('');const [reason,setReason]=useState('');
 const [resumeId,setResumeId]=useState(gym.lifecycleOperation?.operationId);
 const claim=useRef<{key:string;input:{target:'ACTIVE'|'SUSPENDED';expectedVersion:number;reason:string}}|null>(null);
 const target=gym.status==='ACTIVE'?'SUSPENDED':'ACTIVE';
 if(!['ACTIVE','SUSPENDED'].includes(gym.status))return null;
 async function submit(){
  if(!resumeId&&reason.trim().length<10){setError('Give a reason of 10–500 characters.');return;}
  claim.current??={key:crypto.randomUUID(),input:{target,expectedVersion:gym.version,reason:reason.trim()}};
  setPending(true);setError('');
  try{
   const result=await changeGymLifecycle(gym.id,claim.current.key,claim.current.input,resumeId);
   if(result.operation){window.location.reload();return;}
   if(result.operationId)setResumeId(result.operationId);
   setError(result.error??'Transition unavailable.');
  }finally{setPending(false);}
 }
 return <div className="operation-controls"><Button type="button" variant={target==='SUSPENDED'?'danger':'secondary'} disabled={pending} onClick={()=>setOpen(true)}>{resumeId?'Resume transition':target==='SUSPENDED'?'Suspend gym':'Reactivate gym'}</Button>
 <ConfirmDialog open={open} title={resumeId?'Resume gym transition?':target==='SUSPENDED'?'Suspend this gym?':'Reactivate this gym?'} description={resumeId?'Resume the original immutable request. Its reason and expected version will be retained.':target==='SUSPENDED'?'Operational access will stop and active tenant requests will drain. Gym records and history are retained.':'Reactivation requires verified health, schema, binding and active owner access.'} destructive={target==='SUSPENDED'} pending={pending} error={error} onClose={()=>setOpen(false)} onConfirm={()=>void submit()}>
 {!resumeId?<Field label="Lifecycle reason" name={`lifecycle-reason-${gym.id}`} minLength={10} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)} required hint="Explain this status change. Do not include private member or credential information."/>:<p>Operation <code>{resumeId}</code></p>}
 </ConfirmDialog>{error&&!open?<Feedback tone="error">{error}</Feedback>:null}</div>;
}
