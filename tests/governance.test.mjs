import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createActionRegistry,runGoverned,approve} from '../src/governance.mjs';
const def={schemaVersion:1,id:'demo',tasks:[{id:'a',handler:'write',dependsOn:[]}]};
test('deny, dry run, scoped approval, no replay after success',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'governed-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 let calls=0;const actions=createActionRegistry([['write',{run:()=>++calls,effect:'local-write',permission:'write',version:'v1'}]]);
 const opts={directory,permissions:['write']};
 assert.equal((await runGoverned(def,actions,{...opts,dryRun:true})).tasks[0].requiresApproval,true);
 assert.equal(calls,0);
 const denied=await runGoverned(def,actions,{directory});assert.equal(denied.tasks[0].authorization.status,'deny');
 const pending=await runGoverned(def,actions,opts);assert.equal(pending.tasks[0].authorization.status,'review');assert.equal(calls,0);
 const approval=approve(pending.tasks[0].authorization.record.scope,'operator');
 const resume={...opts,resume:true,executionId:pending.executionId,approvals:[approval]};
 const result=await runGoverned(def,actions,resume);assert.equal(result.tasks[0].state,'succeeded');assert.equal(result.tasks[0].authorization.record.actor,'operator');
 await runGoverned(def,actions,resume);assert.equal(calls,1);
 const other=await runGoverned(def,actions,{...opts,approvals:[approval]});assert.equal(other.tasks[0].authorization.status,'review');assert.equal(calls,1);
});
test('policy denial and effect retries fail closed',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'governed-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const actions=createActionRegistry([['write',{run:()=>{throw Error('must not run')},effect:'external',permission:'write',version:'v1'}]]);
 const opts={directory,permissions:['write']};
 const denied=await runGoverned(def,actions,{...opts,policy:()=> 'deny'});assert.equal(denied.tasks[0].authorization.status,'deny');
 await assert.rejects(runGoverned(def,actions,{...opts,policies:new Map([['write',{maxAttempts:2,idempotent:true}]])}),/denied/);
});
