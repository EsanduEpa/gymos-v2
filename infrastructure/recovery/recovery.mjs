import {withVerifiedArchive} from './crypto-artifact.mjs';

export async function restoreIntoNewOwnedTarget(options,adapters){
  return withVerifiedArchive(options,async(archive,metadata)=>{
    // No mutation executor is reached before hash/tag/metadata authentication.
    await adapters.guardCurrentRun(metadata);
    const target=await adapters.createNewOwnedTarget(); // Reject existing targets.
    try{
      await adapters.restoreArchive({target,archive,exitOnError:true,singleTransaction:true,clean:false});
      const verification=await adapters.verifyActualRestore({target,metadata});
      if(!verification.schemaVerified||!verification.bindingVerified||!verification.dataVerified)throw new Error('Restored target verification failed');
      return {state:'RESTORED_UNSELECTED',target,verification};
    }catch{
      await adapters.markOwnedTargetFailed(target);
      throw new Error('Restore failed; original registry and database unchanged');
    }
  });
}
export async function switchTenantRegistry(request,adapters){
  if(request.scope!=='DISPOSABLE_DEVELOPMENT'||!request.operationId)throw new Error('Reviewed disposable recovery operation required');
  await adapters.guardTargets(request);
  await adapters.verifyTarget(request.newTarget,request.gymId);
  // CAS must atomically write its operation checkpoint + audit alongside registry.
  const suspended=await adapters.compareAndSet({gymId:request.gymId,expectedVersion:request.expectedVersion,
    expectedTarget:request.oldTarget,expectedStatus:'ACTIVE',nextTarget:request.oldTarget,nextStatus:'SUSPENDED',operationId:request.operationId,event:'RECOVERY_SUSPENDED'});
  await adapters.drainTarget(request.oldTarget);
  await adapters.verifyTarget(request.newTarget,request.gymId);
  const switched=await adapters.compareAndSet({gymId:request.gymId,expectedVersion:suspended.version,
    expectedTarget:request.oldTarget,expectedStatus:'SUSPENDED',nextTarget:request.newTarget,nextStatus:'SUSPENDED',operationId:request.operationId,event:'RECOVERY_SWITCHED'});
  await adapters.invalidateTarget(request.oldTarget);
  return adapters.compareAndSet({gymId:request.gymId,expectedVersion:switched.version,
    expectedTarget:request.newTarget,expectedStatus:'SUSPENDED',nextTarget:request.newTarget,nextStatus:'ACTIVE',operationId:request.operationId,event:'RECOVERY_ACTIVATED'});
}
export function reconcileMasterReferences(restored,current){
  const issues=[],proposals=[];
  const users=new Set(restored.identities.map((x)=>x.id));
  for(const user of current.identities){
    const prior=restored.identities.find((x)=>x.id===user.id);
    if(!prior)issues.push({kind:'IDENTITY_MISSING',identityId:user.id});
    else if(prior.authVersion!==user.authVersion)issues.push({kind:'SECURITY_VERSION_CHANGED',identityId:user.id});
  }
  for(const live of current.tenants){
    if(!restored.gyms.some((x)=>x.id===live.gymId))issues.push({kind:'GYM_MISSING',gymId:live.gymId});
  }
  for(const access of current.accesses??[]){
    const prior=restored.accesses.find((x)=>x.userId===access.userId&&x.gymId===access.gymId);
    if(!prior||['role','tenantActorId','linkStatus','enrollmentOperationId'].some((key)=>prior[key]!==access[key]))issues.push({kind:'ACCESS_CHANGED_OR_MISSING',gymId:access.gymId,identityId:access.userId});
  }
  for(const observation of current.operations){
    if(!restored.operations.some((x)=>x.id===observation.id))issues.push({kind:'OPERATION_MISSING',operationId:observation.id});
  }
  for(const gym of restored.gyms){
    const live=current.tenants.find((x)=>x.gymId===gym.id);
    if(!live||!live.schemaVerified||live.bindingGymId!==gym.id||live.manifestDigest!==gym.expectedManifestDigest){issues.push({kind:'TENANT_BINDING_UNVERIFIED',gymId:gym.id});continue;}
    if(gym.databaseName!==live.databaseName)proposals.push({gymId:gym.id,fromTarget:gym.databaseName,toTarget:live.databaseName});
  }
  for(const access of restored.accesses){
    if(!users.has(access.userId))issues.push({kind:'ORPHAN_ACCESS',gymId:access.gymId});
    if(access.role!=='OWNER'&&!current.actorEvidence.some((x)=>x.identityId===access.userId&&x.gymId===access.gymId&&x.actorId===access.tenantActorId&&x.operationComplete))issues.push({kind:'ACTOR_OPERATION_UNRECONCILED',gymId:access.gymId});
  }
  for(const operation of restored.operations){
    const observation=current.operations.find((x)=>x.id===operation.id);
    if(!observation||observation.state!==operation.state||observation.receiptId!==operation.receiptId)issues.push({kind:'OPERATION_UNRECONCILED',operationId:operation.id});
  }
  return {state:issues.length?'REPAIR_REQUIRED':'REVIEW_REQUIRED',issues,proposals,automaticActivationAllowed:false};
}
