import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cli} from '../src/cli.mjs';
test('supplier CLI approval, inspection and resume',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'workflow-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 assert.deepEqual((await cli(['validate','supplier'])).order,['collect','validate','publish']);
 assert.equal((await cli(['dry-run','supplier',dir])).dryRun,true);
 const initial=await cli(['run','supplier',dir]);assert.equal(initial.tasks[2].authorization.status,'review');
 const done=await cli(['approve','supplier',dir,initial.executionId,'operator']);assert.equal(done.tasks[2].state,'succeeded');
 assert.deepEqual(await cli(['inspect','supplier',dir,initial.executionId]),done);
 assert.deepEqual(await cli(['resume','supplier',dir,initial.executionId]),done);
 await assert.rejects(cli(['inspect','supplier',dir,'../secret']));
});
test('enterprise scenarios and retry recovery',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'workflow-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const doc=await cli(['run','documents',dir]);assert.equal(doc.tasks[1].output.type,'invoice');
 const support=await cli(['run','support',dir]);assert.equal(support.tasks[1].authorization.status,'review');
 const recovered=await cli(['run','recovery',dir]);assert.equal(recovered.tasks.find(t=>t.id==='retry').attempts,2);assert.ok(recovered.tasks.every(t=>t.state==='succeeded'));
});
