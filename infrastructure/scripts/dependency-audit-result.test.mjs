import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedAuditCounts, blocksProposedAudit } from './dependency-audit-result.mjs';
const clean = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
const result = (counts = clean, status = 0) => ({status, stdout: JSON.stringify({metadata:{vulnerabilities:counts}})});
test('clean complete audit is accepted',()=>assert.deepEqual(verifiedAuditCounts(result(),'test'),clean));
test('pnpm JSON moderate-only exit 1 is verified without blocking high threshold',()=>{
 const counts=verifiedAuditCounts(result({...clean,moderate:2},1),'test');
 assert.equal(blocksProposedAudit(counts),false);
});
test('high and critical findings block proposed revisions',()=>{
 for(const level of ['high','critical']) assert.equal(blocksProposedAudit(verifiedAuditCounts(result({...clean,[level]:1},1),'test')),true);
});
test('invalid/missing/error reports fail closed',()=>{
 for(const stdout of ['', 'invalid', '{}', JSON.stringify({error:{code:'UNAVAILABLE'}})]) assert.throws(()=>verifiedAuditCounts({status:0,stdout},'test'),/fails closed/);
});
test('process errors, signals and unexpected exits fail closed',()=>{
 for(const extra of [{error:{code:'TIMEOUT'}},{signal:'SIGTERM'},{status:2},{status:null}]) assert.throws(()=>verifiedAuditCounts({...result(),...extra},'test'),/fails closed/);
});
test('all five severity counts must be nonnegative safe integers',()=>{
 for(const level of Object.keys(clean)) for(const value of [undefined,-1,0.5,'0',null,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>verifiedAuditCounts(result({...clean,[level]:value}),'test'),/fails closed/);
});
test('exit 1 without findings fails closed',()=>assert.throws(()=>verifiedAuditCounts(result(clean,1),'test'),/fails closed/));
test('exit 0 with findings fails closed',()=>assert.throws(()=>verifiedAuditCounts(result({...clean,high:1},0),'test'),/fails closed/));
