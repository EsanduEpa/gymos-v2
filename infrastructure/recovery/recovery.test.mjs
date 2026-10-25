import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,chmod,stat,realpath,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {createEncryptedBackup,withVerifiedArchive,canonicalJson} from './crypto-artifact.mjs';
import {planRetention,pruneVerifiedGenerations} from './retention.mjs';
import {restoreIntoNewOwnedTarget,switchTenantRegistry,reconcileMasterReferences} from './recovery.mjs';

async function fixture(){
  const root=await mkdtemp(join(await realpath(tmpdir()),'gymos-backup-prototype-'));
  const directory=join(root,'artifacts'),tempRoot=join(root,'private'),keyFile=join(root,'key');
  await mkdir(directory,{mode:0o700});await mkdir(tempRoot,{mode:0o700});
  await writeFile(keyFile,randomBytes(32),{mode:0o600});
  const metadata={scope:'DISPOSABLE_DEVELOPMENT',sourceRunId:'a2bc895def4c9956',kind:'TENANT',gymId:'gym-a',
    manifestDigest:'a'.repeat(64),snapshotAt:'2026-10-24T00:00:00.000Z',observedOperationsAt:'2026-10-24T00:00:00.000Z',
    toolVersion:'PostgreSQL 17.6',format:'postgres-custom',counts:{Member:3,Trainer:1},dataDigest:'b'.repeat(64)};
  const expected={sourceRunId:metadata.sourceRunId,kind:'TENANT',gymId:'gym-a',manifestDigest:metadata.manifestDigest};
  const content=Buffer.from(`Synthetic archive sentinel ${randomBytes(16).toString('hex')}\n`);
  const options={directory,tempRoot,keyFile,metadata,verifySource:async()=>{},producer:async()=>({readable:Readable.from([content]),completion:Promise.resolve()})};
  return {root,options,content,expected,cleanup:()=>rm(root,{recursive:true,force:true})};
}
async function editManifest(path,fn){const manifest=JSON.parse(await readFile(path,'utf8'));await writeFile(path,canonicalJson(fn(manifest))+'\n',{mode:0o600});}

 test('streamed encrypted roundtrip authenticates metadata; private plaintext exists only inside callback',async()=>{
  const f=await fixture();try{
    const backup=await createEncryptedBackup(f.options);
    const raw=await readFile(join(f.options.directory,`${backup.artifactId}.gbackup`));
    assert.equal(raw.includes(f.content),false);
    let temporary;
    await withVerifiedArchive({...f.options,manifestPath:backup.manifestPath,expected:f.expected},async(path,metadata)=>{
      temporary=path;assert.deepEqual(await readFile(path),f.content);assert.equal((await stat(path)).mode&0o777,0o600);assert.equal(metadata.gymId,'gym-a');
    });
    await assert.rejects(stat(temporary));assert.deepEqual(await readdir(f.options.tempRoot),[]);
    assert.equal(JSON.stringify(backup).includes((await readFile(f.options.keyFile)).toString('hex')),false);
  }finally{await f.cleanup();}
});

test('missing/mispermissioned key fails before database or producer work',async()=>{
  const f=await fixture();try{
    let calls=0;const options={...f.options,verifySource:async()=>{calls++;},producer:async()=>{calls++;}};
    await assert.rejects(createEncryptedBackup({...options,keyFile:join(f.root,'missing')}));assert.equal(calls,0);
    await chmod(f.options.keyFile,0o644);await assert.rejects(createEncryptedBackup(options));assert.equal(calls,0);
  }finally{await f.cleanup();}
});

test('key stored under artifact root is rejected',async()=>{
  const f=await fixture();try{
    const keyFile=join(f.options.directory,'bad-key');await writeFile(keyFile,randomBytes(32),{mode:0o600});
    await assert.rejects(createEncryptedBackup({...f.options,keyFile}),/separate/);
  }finally{await f.cleanup();}
});

test('symbolic-link artifact directories are rejected',async()=>{
  const f=await fixture();try{
    const alias=join(f.root,'artifact-alias');await symlink(f.options.directory,alias);
    await assert.rejects(createEncryptedBackup({...f.options,directory:alias}));
  }finally{await f.cleanup();}
});

test('producer failure publishes no artifact/manifest or plaintext',async()=>{
  const f=await fixture();try{
    async function* broken(){yield f.content;throw new Error('synthetic pipe failure');}
    await assert.rejects(createEncryptedBackup({...f.options,producer:async()=>({readable:Readable.from(broken()),completion:Promise.resolve()})}),/no complete artifact/);
    assert.deepEqual(await readdir(f.options.directory),[]);assert.deepEqual(await readdir(f.options.tempRoot),[]);
  }finally{await f.cleanup();}
});

test('wrong gym/run/schema and missing manifest reject before create/restore executors',async()=>{
  const f=await fixture();try{
    const backup=await createEncryptedBackup(f.options);let mutations=0;
    const adapters={guardCurrentRun:async()=>{},createNewOwnedTarget:async()=>{mutations++;},restoreArchive:async()=>{mutations++;}};
    for(const expected of [{...f.expected,gymId:'gym-b'},{...f.expected,sourceRunId:'0'.repeat(16)},{...f.expected,manifestDigest:'c'.repeat(64)}]){
      await assert.rejects(restoreIntoNewOwnedTarget({...f.options,manifestPath:backup.manifestPath,expected},adapters));
    }
    await assert.rejects(restoreIntoNewOwnedTarget({...f.options,manifestPath:join(f.options.directory,'missing.json'),expected:f.expected},adapters));
    assert.equal(mutations,0);
  }finally{await f.cleanup();}
});

test('wrong key and truncated ciphertext fail before any restore callback',async()=>{
  const f=await fixture();try{
    const backup=await createEncryptedBackup(f.options);let calls=0;
    const wrongKey=join(f.root,'wrong-key');await writeFile(wrongKey,randomBytes(32),{mode:0o600});
    await assert.rejects(withVerifiedArchive({...f.options,keyFile:wrongKey,manifestPath:backup.manifestPath,expected:f.expected},()=>{calls++;}));
    const path=join(f.options.directory,`${backup.artifactId}.gbackup`);const raw=await readFile(path);await writeFile(path,raw.subarray(0,raw.length-5));
    await assert.rejects(withVerifiedArchive({...f.options,manifestPath:backup.manifestPath,expected:f.expected},()=>{calls++;}));assert.equal(calls,0);
  }finally{await f.cleanup();}
});

test('tampered GCM tag still fails after attacker recomputes manifest checksum; plaintext removed',async()=>{
  const f=await fixture();try{
    const backup=await createEncryptedBackup(f.options);const path=join(f.options.directory,`${backup.artifactId}.gbackup`);const raw=await readFile(path);raw[raw.length-1]^=1;await writeFile(path,raw);
    await editManifest(backup.manifestPath,(m)=>({...m,encryptedSha256:createHash('sha256').update(raw).digest('hex')}));let calls=0;
    await assert.rejects(withVerifiedArchive({...f.options,manifestPath:backup.manifestPath,expected:f.expected},()=>{calls++;}));assert.equal(calls,0);assert.deepEqual(await readdir(f.options.tempRoot),[]);
  }finally{await f.cleanup();}
});

test('tampered AAD and matching edited manifest/checksum cannot change gym binding',async()=>{
  const f=await fixture();try{
    const backup=await createEncryptedBackup(f.options);const path=join(f.options.directory,`${backup.artifactId}.gbackup`);const raw=await readFile(path);
    const location=raw.indexOf(Buffer.from('gym-a'));assert.ok(location>0);raw[location+4]='b'.charCodeAt(0);await writeFile(path,raw);
    await editManifest(backup.manifestPath,(m)=>({...m,metadata:{...m.metadata,gymId:'gym-b'},encryptedSha256:createHash('sha256').update(raw).digest('hex')}));
    let calls=0;await assert.rejects(withVerifiedArchive({...f.options,manifestPath:backup.manifestPath,expected:{...f.expected,gymId:'gym-b'}},()=>{calls++;}));assert.equal(calls,0);
  }finally{await f.cleanup();}
});

test('manifest path traversal and unsafe metadata are rejected',async()=>{
  const f=await fixture();try{
    const backup=await createEncryptedBackup(f.options);
    await editManifest(backup.manifestPath,(m)=>({...m,artifactId:'../../escape'}));
    await assert.rejects(withVerifiedArchive({...f.options,manifestPath:backup.manifestPath,expected:f.expected},()=>{}));
    await assert.rejects(createEncryptedBackup({...f.options,metadata:{...f.options.metadata,kind:'LIVE_PRODUCTION'}}));
  }finally{await f.cleanup();}
});

test('restore is staged unselected; schema/binding/data verifier must all pass and failure marks only new target',async()=>{
  const f=await fixture();try{
    const backup=await createEncryptedBackup(f.options);const events=[];
    const adapters={guardCurrentRun:async()=>events.push('guard'),createNewOwnedTarget:async()=>{events.push('create');return 'owned-restored-a';},
      restoreArchive:async(input)=>{assert.equal(input.clean,false);assert.equal(input.singleTransaction,true);assert.deepEqual(await readFile(input.archive),f.content);events.push('restore');},
      verifyActualRestore:async()=>({schemaVerified:true,bindingVerified:true,dataVerified:true}),markOwnedTargetFailed:async()=>events.push('failed')};
    const result=await restoreIntoNewOwnedTarget({...f.options,manifestPath:backup.manifestPath,expected:f.expected},adapters);
    assert.equal(result.state,'RESTORED_UNSELECTED');assert.deepEqual(events,['guard','create','restore']);
    await assert.rejects(restoreIntoNewOwnedTarget({...f.options,manifestPath:backup.manifestPath,expected:f.expected},{...adapters,verifyActualRestore:async()=>({schemaVerified:true,bindingVerified:false,dataVerified:true})}),/registry and database unchanged/);
    assert.equal(events.at(-1),'failed');
  }finally{await f.cleanup();}
});

test('retention keeps seven distinct UTC days plus last-known-good, and refuses fewer-than-seven deletion',()=>{
  const days=Array.from({length:10},(_,i)=>({artifactId:`artifact-${i}`,snapshotAt:new Date(Date.UTC(2026,9,24-i)).toISOString()}));
  const plan=planRetention(days,{lastKnownGoodId:'artifact-9'});assert.equal(plan.keep.length,8);assert.ok(plan.keep.includes('artifact-9'));assert.deepEqual(plan.remove,['artifact-7','artifact-8']);
  assert.equal(planRetention(days.slice(0,3),{lastKnownGoodId:'artifact-2'}).remove.length,0);
  assert.throws(()=>planRetention(days,{minimumDays:6,lastKnownGoodId:'artifact-9'}));assert.throws(()=>planRetention(days,{lastKnownGoodId:'unknown'}));
});

test('pruning reauthenticates artifacts and deletes only verified generations outside policy',async()=>{
  const f=await fixture();try{
    const artifacts=[];
    for(let i=0;i<10;i++){
      const metadata={...f.options.metadata,snapshotAt:new Date(Date.UTC(2026,9,24-i)).toISOString()};
      const backup=await createEncryptedBackup({...f.options,metadata});
      artifacts.push({backup,expected:{...f.expected,manifestDigest:metadata.manifestDigest}});
    }
    const result=await pruneVerifiedGenerations({manifests:artifacts.map(x=>x.backup.manifestPath),keyFile:f.options.keyFile,tempRoot:f.options.tempRoot,
      expectedFor:async(path)=>artifacts.find(x=>x.backup.manifestPath===path).expected,lastKnownGoodId:artifacts[9].backup.artifactId});
    assert.equal(result.deleted.length,2);
    assert.equal(result.keep.length,8);
    for(const i of [7,8]){
      await assert.rejects(readFile(join(f.options.directory,`${artifacts[i].backup.artifactId}.gbackup`)));
      await assert.rejects(readFile(artifacts[i].backup.manifestPath));
    }
    await readFile(join(f.options.directory,`${artifacts[9].backup.artifactId}.gbackup`));
    await readFile(join(f.options.directory,`${artifacts[0].backup.artifactId}.gbackup`));
  }finally{await f.cleanup();}
});

test('pruning deletes nothing when any candidate fails verification',async()=>{
  const f=await fixture();try{
    const artifacts=[];
    for(let i=0;i<8;i++){
      const metadata={...f.options.metadata,snapshotAt:new Date(Date.UTC(2026,9,24-i)).toISOString()};
      artifacts.push(await createEncryptedBackup({...f.options,metadata}));
    }
    const damaged=join(f.options.directory,`${artifacts[0].artifactId}.gbackup`);
    const bytes=await readFile(damaged);bytes[bytes.length-1]^=1;await writeFile(damaged,bytes);
    await assert.rejects(pruneVerifiedGenerations({manifests:artifacts.map(x=>x.manifestPath),keyFile:f.options.keyFile,tempRoot:f.options.tempRoot,
      expectedFor:async()=>f.expected,lastKnownGoodId:artifacts[7].artifactId}));
    assert.equal((await readdir(f.options.directory)).length,16);
  }finally{await f.cleanup();}
});

test('registry CAS sequence suspends/drains/switches/reactivates and rollback uses same reviewed sequence',async()=>{
  let state={gymId:'gym-a',target:'old-a',status:'ACTIVE',version:4};const events=[];
  const adapters={guardTargets:async()=>{},verifyTarget:async()=>{},drainTarget:async()=>events.push('drain'),invalidateTarget:async()=>events.push('invalidate'),
    compareAndSet:async(q)=>{if(q.expectedVersion!==state.version||q.expectedTarget!==state.target||q.expectedStatus!==state.status)throw new Error('stale');state={...state,target:q.nextTarget,status:q.nextStatus,version:state.version+1};events.push(q.event);return state;}};
  const request={scope:'DISPOSABLE_DEVELOPMENT',operationId:'recovery-a',gymId:'gym-a',oldTarget:'old-a',newTarget:'restored-a',expectedVersion:4};
  await switchTenantRegistry(request,adapters);assert.equal(state.target,'restored-a');assert.equal(state.status,'ACTIVE');
  assert.deepEqual(events,['RECOVERY_SUSPENDED','drain','RECOVERY_SWITCHED','invalidate','RECOVERY_ACTIVATED']);
  await assert.rejects(switchTenantRegistry(request,adapters),/stale/);assert.equal(state.target,'restored-a');
  await switchTenantRegistry({...request,operationId:'rollback-a',oldTarget:'restored-a',newTarget:'old-a',expectedVersion:state.version},adapters);assert.equal(state.target,'old-a');
});

test('Master restore never autoactivates and detects missing identity, security-version and operation/tenant mismatch',()=>{
  const restored={identities:[{id:'user-a',authVersion:1}],gyms:[{id:'gym-a',databaseName:'old-a',expectedManifestDigest:'a'.repeat(64)}],accesses:[{userId:'user-a',gymId:'gym-a',role:'MEMBER',tenantActorId:'actor-a'}],operations:[{id:'op-a',state:'COMPLETE',receiptId:'receipt-a'}]};
  const current={identities:[{id:'user-a',authVersion:2},{id:'new-user',authVersion:0}],tenants:[{gymId:'gym-a',databaseName:'restored-a',bindingGymId:'gym-a',schemaVerified:true,manifestDigest:'a'.repeat(64)}],actorEvidence:[],operations:[]};
  const result=reconcileMasterReferences(restored,current);assert.equal(result.automaticActivationAllowed,false);assert.equal(result.state,'REPAIR_REQUIRED');assert.equal(result.proposals.length,1);
  for(const kind of ['IDENTITY_MISSING','SECURITY_VERSION_CHANGED','ACTOR_OPERATION_UNRECONCILED','OPERATION_UNRECONCILED'])assert.ok(result.issues.some((x)=>x.kind===kind));
});


test('Master archives use the same authenticated format with explicit null gym binding',async()=>{
 const f=await fixture();try{
  const metadata={...f.options.metadata,kind:'MASTER',gymId:null,counts:{User:3,Gym:2,GymAccess:4}};
  const backup=await createEncryptedBackup({...f.options,metadata});
  await withVerifiedArchive({...f.options,manifestPath:backup.manifestPath,expected:{...f.expected,kind:'MASTER',gymId:null}},async(path,m)=>{assert.equal(m.kind,'MASTER');assert.deepEqual(await readFile(path),f.content);});
 }finally{await f.cleanup();}
});
