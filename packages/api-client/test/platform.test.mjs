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
