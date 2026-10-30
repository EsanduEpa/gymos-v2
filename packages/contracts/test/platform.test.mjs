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
