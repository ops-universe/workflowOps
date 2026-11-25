import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runDurable} from '../src/checkpoint.mjs';
import {runGoverned} from '../src/governance.mjs';
import {createAiAction,createMockAdapter} from '../src/ai.mjs';
const def={schemaVersion:1,id:'demo',tasks:[{id:'a',handler:'ai',dependsOn:[]},{id:'b',handler:'ai',dependsOn:['a']}]};
test('AI quota persists across recreated adapters and cannot be increased on resume',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'quota-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const fresh=maxCalls=>new Map([['ai',createAiAction({adapter:createMockAdapter([['x',{summary:'ok',classification:'accept'}]]),key:'x',enabled:true,maxCalls})]]);
 const opts={directory,permissions:['ai']};
 const r=await runGoverned(def,fresh(1),opts);assert.equal(r.tasks[0].state,'succeeded');assert.equal(r.tasks[1].state,'pending');assert.equal(r.stopReason,'AI quota exhausted');
 const resume={...opts,executionId:r.executionId,resume:true};
 const again=await runGoverned(def,fresh(1),resume);assert.equal(again.tasks[1].state,'pending');
 await assert.rejects(runGoverned(def,fresh(2),resume),/mismatch/);
});
test('checkpoint corruption and symlink rejected before handlers execute',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'checkpoint-hardening-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 let calls=0;const registry=new Map([['ai',()=>++calls]]);
 const r=await runDurable(def,registry,{directory});const path=join(directory,r.executionId+'.json'),original=await readFile(path,'utf8');
 const opts={directory,executionId:r.executionId,resume:true};
 for(const mutate of [x=>{x.tasks[0].attempts=0},x=>{x.workflowId='other'},x=>{x.timeline[0].sequence=99}]){
  const value=JSON.parse(original);mutate(value);await writeFile(path,JSON.stringify(value));await assert.rejects(runDurable(def,registry,opts));
 }
 await rm(path);await writeFile(path+'.target',original);await symlink(path+'.target',path);await assert.rejects(runDurable(def,registry,opts));assert.equal(calls,2);
});
