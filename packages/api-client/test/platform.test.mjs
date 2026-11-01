import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../dist/index.js';
import { platformOperationSchema } from '@gymos/contracts/platform';
test('durable provisioning accepts a validated 202 result and forwards the stable request key',async()=>{
 let attempts=0;
 const status={operationId:'op-1',state:'PENDING',step:'PENDING',version:1,retryable:false,ownerVerificationRequired:false,gym:{id:'gym-1',slug:'example-gym',name:'Synthetic Gym',status:'PROVISIONING'}};
 const client=createApiClient('https://api.example.test',async(_url,init)=>{attempts++;assert.equal(init.headers.get('idempotency-key'),'request-key-123456');assert.equal(init.cache,'no-store');return Response.json(status,{status:202});});
 assert.deepEqual(await client.request('/admin/gyms',{method:'POST',response:platformOperationSchema,idempotencyKey:'request-key-123456',body:{name:'Synthetic Gym'}}),status);
 assert.equal(attempts,1);
});
test('explicit support context stays on the approved read/exit transport and cannot enter commands',async()=>{
 const {supportSummarySchema}=await import('@gymos/contracts/platform');let attempts=0;
 const body={id:'support-1',scope:'GYM_SUMMARY_READ',expiresAt:'2026-10-31T00:15:00.000Z',gym:{id:'gym-1',slug:'example',name:'Synthetic gym',status:'ACTIVE',primaryColor:null,createdAt:'2026-10-31T00:00:00.000Z',updatedAt:'2026-10-31T00:00:00.000Z'},operationState:'COMPLETE',health:'VERIFIED',tenant:null};
 const client=createApiClient('https://api.example.test',async(_url,init)=>{attempts++;assert.equal(init.headers.get('x-gymos-support-context'),'s'.repeat(43));assert.equal(init.cache,'no-store');return Response.json(body);});
 await client.request('/admin/support-sessions/support-1/gyms/example/summary',{response:supportSummarySchema,supportContext:'s'.repeat(43)});
 await assert.rejects(client.request('/gyms/example/members',{method:'POST',response:supportSummarySchema,supportContext:'s'.repeat(43),body:{}}),/limited/);
 assert.equal(attempts,1);
});
