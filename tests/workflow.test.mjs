import test from 'node:test';
import assert from 'node:assert/strict';
import {plan,execute} from '../src/workflow.mjs';
const registry = new Map([['ok',async()=>1],['sum',async({dependencies})=>Object.values(dependencies).reduce((a,b)=>a+b,0)],['fail',async()=>{throw new Error('secret')} ]]);
const task=(id,handler='ok',dependsOn=[])=>({id,handler,dependsOn});
const def=(...tasks)=>({schemaVersion:1,id:'demo',tasks});
test('deterministic ordering and dependency output',async()=>{
 const d=def(task('c','sum',['b','a']),task('b'),task('a'));
 assert.deepEqual(plan(d,registry).map(t=>t.id),['a','b','c']);
 assert.equal((await execute(d,registry)).tasks[2].output,2);
});
test('reject cycles, missing dependencies, duplicates, unknown handlers, invalid versions',()=>{
 for(const d of [def(task('a','ok',['a'])),def(task('a','ok',['b']),task('b','ok',['a'])),def(task('a','ok',['missing'])),def(task('a'),task('a')),def(task('a','shell')),def(task('a','ok',['b','b']),task('b')),{...def(task('a')),schemaVersion:2}]) assert.throws(()=>plan(d,registry));
});
test('failure blocks dependents, independent tasks run, errors redacted',async()=>{
 const r=await execute(def(task('a','fail'),task('b','ok',['a']),task('c')),registry);
 assert.deepEqual(r.tasks.map(t=>t.state),['failed','blocked','succeeded']);
 assert.equal(r.tasks[0].error,'Task failed');
});
test('invalid graph executes nothing',async()=>{
 let called=0;const reg=new Map([['ok',()=>++called]]);
 await assert.rejects(execute(def(task('a'),task('b','ok',['b'])),reg));assert.equal(called,0);
});
