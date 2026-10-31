'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supportEntrySchema, supportEntryResultSchema, platformOperationSchema } from '@gymos/contracts/platform';
import { credentialReissueResultSchema, credentialAcknowledgementResultSchema } from '@gymos/contracts/credentials';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { currentSupportCookie, SUPPORT_COOKIE } from '@/lib/support-context';
import { sessionCookieOptions } from '@/lib/session-transport';
async function bearer() { return (await cookies()).get(SESSION_COOKIE)?.value; }
export async function enterSupport(data: FormData): Promise<{destination?:string;error?:string}> {
 const token=await bearer();if(!token)return {error:'Sign in again before entering support.'};
 const input=supportEntrySchema.safeParse({gymId:data.get('gymId'),scope:'GYM_SUMMARY_READ',reasonCode:data.get('reasonCode'),explanation:data.get('explanation')});
 if(!input.success)return {error:'Select a gym and provide a reason of 10–500 characters.'};
 try{
  const response=await fetch(apiUrl('/admin/support-sessions'),{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(input.data),cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return {error:response.status===401?'Sign in again.':'Support entry could not complete. Your prior context may have ended; refresh before retrying.'};
  const context=supportEntryResultSchema.parse(await response.json());
  const options=sessionCookieOptions(token,900);options.expires=new Date(Math.min(options.expires.getTime(),Date.parse(context.expiresAt)-2000));
  (await cookies()).set(SUPPORT_COOKIE,JSON.stringify(context),options);
  revalidatePath('/admin');
  return {destination:`/gyms/${encodeURIComponent(context.slug)}/owner`};
 }catch{return {error:'Support entry has an unknown outcome. Refresh the registry before trying again.'};}
}
export async function exitSupport() {
 const jar=await cookies();const token=await bearer();const context=await currentSupportCookie();let uncertain=false;
 try{
  if(token&&context){const response=await fetch(apiUrl(`/admin/support-sessions/${encodeURIComponent(context.id)}`),{method:'DELETE',headers:{authorization:`Bearer ${token}`,'x-gymos-support-context':context.context},cache:'no-store',signal:AbortSignal.timeout(5000)});uncertain=!response.ok;}
 }catch{uncertain=true;}finally{jar.delete(SUPPORT_COOKIE);revalidatePath('/','layout');}
 redirect(uncertain?'/admin?error=support-exit-uncertain':'/admin');
}
export async function retryProvisioning(id:string,expectedVersion:number){
 const token=await bearer();if(!token)return {error:'Sign in again.'};
 try{const response=await fetch(apiUrl(`/admin/operations/${encodeURIComponent(id)}/retry`),{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({expectedVersion}),cache:'no-store'});
 if(!response.ok)return {error:'The operation changed or cannot be retried. Refresh its status.'};
 const operation=platformOperationSchema.parse(await response.json());revalidatePath('/admin');return {operation};
 }catch{return {error:'Retry outcome is unknown. Refresh the original operation.'};}
}
export async function ownerCredential(id:string,mode:'issue'|'reissue'|'acknowledge',data:unknown){
 const token=await bearer();if(!token)return {error:'Sign in again.'};
 if(!['issue','reissue','acknowledge'].includes(mode))return {error:'Invalid handoff action.'};
 try{
 const response=await fetch(apiUrl(`/admin/operations/${encodeURIComponent(id)}/credentials/${mode}`),{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(data),cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!response.ok)return {error:response.status===403?'Credential handoff is unavailable for this identity.':'The handoff changed or is unavailable. Refresh before retrying.'};
 if(mode==='acknowledge')return {acknowledged:credentialAcknowledgementResultSchema.parse(await response.json())};
 return {delivery:credentialReissueResultSchema.parse(await response.json())};
 }catch{return {error:'Handoff outcome is unknown. An issued credential cannot be retrieved; use an explicit lost-handoff reissue.'};}
}
