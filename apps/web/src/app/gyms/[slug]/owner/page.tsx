import { Suspense } from 'react';
import { OwnerGymPage } from '@/components/navigation/owner-gym-page';
import { SupportOwnerPage } from '@/components/platform/support-owner-page';
import { currentSupportCookie } from '@/lib/support-context';
import { LoadingState } from '@/components/ui';
type Props={params:Promise<{slug:string}>;searchParams:Promise<{error?:string;created?:string}>};
async function OwnerContent(props:Props){
 const context=await currentSupportCookie();
 if(context){const {slug}=await props.params;return <SupportOwnerPage slug={slug}/>;}
 return <OwnerGymPage {...props}/>;
}
export default function OwnerWorkspace(props:Props){return <Suspense fallback={<LoadingState label="Loading workspace…" page/>}><OwnerContent {...props}/></Suspense>;}
