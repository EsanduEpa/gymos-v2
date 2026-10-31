import test from 'node:test';
import assert from 'node:assert/strict';
import { provisioningInputSchema, platformOperationSchema } from '../dist/platform.js';
const input={name:' Synthetic Gym ',slug:' EXAMPLE-GYM ',ownerEmail:' Owner@Example.TEST ',currency:'LKR',timezone:'Asia/Colombo'};
test('provisioning normalizes safe intent and requires explicit approved currency/timezone',()=>{
 assert.equal(provisioningInputSchema.parse(input).ownerEmail,'owner@example.test');
 assert.equal(provisioningInputSchema.parse(input).slug,'example-gym');
 for(const extra of [{currency:'EUR'},{timezone:'unknown'},{databaseName:'target'},{ownerPassword:'legacy-input'}]) assert.equal(provisioningInputSchema.safeParse({...input,...extra}).success,false);
});
test('operation projection rejects private provisioning fields',()=>{
 const status={operationId:'operation-1',state:'PENDING',step:'PENDING',version:1,retryable:false,ownerVerificationRequired:false,gym:{id:'gym-1',slug:'example-gym',name:'Example Gym',status:'PROVISIONING'}};
 assert.deepEqual(platformOperationSchema.parse(status),status);
 for(const field of ['databaseName','ownerEmail','passwordHash','accessToken','intent']) assert.equal(platformOperationSchema.safeParse({...status,[field]:'fixture-only'}).success,false);
});
test('support entry requires the exact scope, bounded reason and no target injection',async()=>{
 const {supportEntrySchema}=await import('../dist/platform.js');
 const input={gymId:'gym-1',scope:'GYM_SUMMARY_READ',reasonCode:'DIAGNOSE_ACCESS',explanation:'Synthetic support investigation'};
 assert.deepEqual(supportEntrySchema.parse(input),input);
 for(const extra of [{scope:'OWNER'},{explanation:'short'},{databaseName:'target'},{identityId:'other'}])assert.equal(supportEntrySchema.safeParse({...input,...extra}).success,false);
});
test('registry counts distinguish unavailable from zero and support summaries reject private nested fields',async()=>{
 const {registryPageSchema,supportSummarySchema}=await import('../dist/platform.js');
 const row={id:'gym-1',slug:'example',name:'Synthetic gym',status:'ACTIVE',version:1,ownerName:null,memberCount:null,trainerCount:null,observedAt:null,health:'UNAVAILABLE',operation:null};
 assert.equal(registryPageSchema.parse({items:[row],total:1,nextCursor:null}).items[0].memberCount,null);
 const summary={id:'support-1',scope:'GYM_SUMMARY_READ',expiresAt:'2026-10-31T00:15:00.000Z',gym:{id:row.id,slug:row.slug,name:row.name,status:row.status,primaryColor:null,createdAt:'2026-10-31T00:00:00.000Z',updatedAt:'2026-10-31T00:00:00.000Z'},operationState:'COMPLETE',health:'VERIFIED',tenant:{currency:'USD',timezone:'UTC',memberCount:0,trainerCount:0}};
 assert.deepEqual(supportSummarySchema.parse(summary),summary);
 for(const key of ['healthNotes','passwordHash','databaseName','members','audit'])assert.equal(supportSummarySchema.safeParse({...summary,tenant:{...summary.tenant,[key]:'excluded'}}).success,false);
});
test('controlled rollout input pins the reviewed manifest and bounded unique gym selection without caller database targets',async()=>{
 const {schemaRolloutInputSchema}=await import('../dist/platform.js');
 const input={idempotencyKey:'rollout-fixture-key',targetVersion:'tenant-fixture',targetDigest:'a'.repeat(64),gymIds:['gym-a','gym-b'],batchSize:1};
 assert.deepEqual(schemaRolloutInputSchema.parse(input),input);
 for(const extra of [{gymIds:['gym-a','gym-a']},{batchSize:26},{databaseName:'caller-target'},{targetDigest:'invalid'}])assert.equal(schemaRolloutInputSchema.safeParse({...input,...extra}).success,false);
});
