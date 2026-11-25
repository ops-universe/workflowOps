import test from 'node:test';
import assert from 'node:assert/strict';
import {attemptTask,normalizePolicy} from '../src/reliability.mjs';
import {runDurable} from '../src/checkpoint.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
test('bounded retry uses stable key and stops at success',async()=>{
 const calls=[];const r=await attemptTask(({attempt,idempotencyKey})=>{calls.push(idempotencyKey);if(attempt<3)throw Error('transient');return 42;},{idempotencyKey:'same'},{maxAttempts:3,idempotent:true});
 assert.deepEqual(calls,['same','same','same']);assert.equal(r.output,42);
 assert.throws(()=>normalizePolicy({maxAttempts:2}));
 let count=0;const failed=await attemptTask(()=>{count++;throw Error('secret');},{},{maxAttempts:2,idempotent:true});assert.equal(count,2);assert.equal(failed.error,'Task failed');
});
test('timeout is deterministic and never retries uncertain work',async()=>{
 let fire,called=0,seen;const run=attemptTask(({signal})=>{called++;seen=signal;return new Promise(()=>{});},{},{maxAttempts:3,idempotent:true,timeoutMs:5},{schedule:fn=>{fire=fn;return 1;},unschedule:()=>{}});
 await new Promise(setImmediate);fire();const r=await run;assert.equal(r.error,'Timed out');assert.equal(r.uncertain,true);assert.equal(called,1);assert.equal(seen.aborted,true);
});
test('cancelled in-flight task remains uncertain and blocks resume',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'workflow-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const c=new AbortController();let calls=0;
 const def={schemaVersion:1,id:'demo',tasks:[{id:'a',handler:'ok',dependsOn:[]},{id:'b',handler:'stop',dependsOn:['a']}]};
 const reg=new Map([['ok',()=>++calls],['stop',()=>{c.abort();return new Promise(()=>{});}]]);
 const r=await runDurable(def,reg,{directory,signal:c.signal});assert.deepEqual(r.tasks.map(t=>t.state),['succeeded','running']);assert.equal(r.tasks[1].interruption,'Cancelled');
 await assert.rejects(runDurable(def,reg,{directory,executionId:r.executionId,resume:true}),/reconciliation/);assert.equal(calls,1);
});
