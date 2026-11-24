import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runDurable,transition} from '../src/checkpoint.mjs';
const def={schemaVersion:1,id:'demo',tasks:[{id:'a',handler:'ok',dependsOn:[]},{id:'b',handler:'ok',dependsOn:['a']}]};
test('durable results, resume skips completed work and rejects definition mismatch',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'workflow-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 let calls=0;const registry=new Map([['ok',()=>++calls]]);
 const result=await runDurable(def,registry,{directory});
 assert.equal(calls,2);assert.deepEqual(result.tasks.map(x=>x.state),['succeeded','succeeded']);
 const opts={directory,executionId:result.executionId,resume:true};
 assert.deepEqual(await runDurable(def,registry,opts),result);assert.equal(calls,2);
 await assert.rejects(runDurable({...def,id:'changed'},registry,opts),/mismatch/);
 await assert.rejects(runDurable(def,registry,{directory,executionId:'../bad'}),/Invalid/);
 const path=join(directory,result.executionId+'.json');const saved=JSON.parse(await readFile(path,'utf8'));
 saved.tasks[1]={id:'b',state:'running'};await writeFile(path,JSON.stringify(saved));
 await assert.rejects(runDurable(def,registry,opts),/reconciliation/);assert.equal(calls,2);
});
test('illegal state transitions rejected',()=>assert.throws(()=>transition({state:'succeeded'},'running')));
test('failed dependency blocked and failure checkpointed',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'workflow-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const result=await runDurable(def,new Map([['ok',()=>{throw Error('secret')}]]),{directory});
 assert.deepEqual(result.tasks.map(x=>x.state),['failed','blocked']);assert.equal(result.tasks[0].error,'Task failed');
});
