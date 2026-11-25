import test from 'node:test';
import assert from 'node:assert/strict';
import {createMockAdapter,createAiAction} from '../src/ai.mjs';
import {runGoverned} from '../src/governance.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const adapter=createMockAdapter([['sample',{summary:'Synthetic result',classification:'review'}]]);
test('disabled default and bounded mock calls',async()=>{
 await assert.rejects(createAiAction({adapter,key:'sample'}).run({dependencies:{}}),/disabled/);
 const action=createAiAction({adapter,key:'sample',enabled:true});
 assert.deepEqual(await action.run({dependencies:{}}),{summary:'Synthetic result',classification:'review'});
 await assert.rejects(action.run({dependencies:{}}),/budget/);
 assert.throws(()=>createAiAction({adapter:{kind:'external',generate(){}},key:'sample',enabled:true}));
});
test('reject unexpected executable fields',async()=>{
 const bad=createMockAdapter([['sample',{summary:'x',classification:'accept',command:'shell'}]]);
 await assert.rejects(createAiAction({adapter:bad,key:'sample',enabled:true}).run({dependencies:{}}),/Invalid AI output/);
});
test('durable execution attempt budget cannot reset on resume',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'ai-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const action=createAiAction({adapter,key:'sample',enabled:true,maxCalls:3});
 const def={schemaVersion:1,id:'demo',tasks:[{id:'a',handler:'ai',dependsOn:[]},{id:'b',handler:'ai',dependsOn:['a']}]};
 const actions=new Map([['ai',action]]),opts={directory,permissions:['ai'],budget:{maxAttempts:1}};
 const result=await runGoverned(def,actions,opts);assert.equal(result.tasks[0].state,'succeeded');assert.equal(result.tasks[1].state,'pending');assert.match(result.stopReason,/budget/);
 const resumed=await runGoverned(def,actions,{...opts,resume:true,executionId:result.executionId});assert.equal(resumed.tasks[1].state,'pending');
 await assert.rejects(runGoverned(def,actions,{...opts,budget:{maxAttempts:2},resume:true,executionId:result.executionId}),/mismatch/);
});
