import {createHash,randomUUID} from 'node:crypto';
import {mkdir,open,rename,readFile,unlink,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {attemptTask, normalizePolicy} from './reliability.mjs';
import {plan} from './workflow.mjs';
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const limit=4*1024*1024;
const transitions={pending:['running','blocked'],running:['succeeded','failed'],succeeded:[],failed:[],blocked:[]};
export function transition(task,state){
 if(!Object.hasOwn(transitions,task.state)||!transitions[task.state].includes(state))throw Error('Invalid state transition');
 return {...task,state};
}
function jsonOutput(value){
 const s=JSON.stringify(value);
 if(typeof s!=='string'||Buffer.byteLength(s)>limit)throw Error('Invalid output');
 return JSON.parse(s);
}
export async function runDurable(def,registry,{directory,executionId=randomUUID(),resume=false, policies=new Map(), signal, gate, budget}={}){
 if(typeof directory!=='string'||!idPattern.test(executionId))throw Error('Invalid checkpoint location or execution ID');
 const order=plan(def,registry), handlers=new Map(registry);
 const config=order.map(t=>normalizePolicy(policies.get(t.handler)));
 const fingerprint=digest({schemaVersion:def.schemaVersion,id:def.id,tasks:order.map(t=>({...t,dependsOn:[...t.dependsOn].sort()}))});
 const policyFingerprint=digest(config);
 const maxAttempts=budget?.maxAttempts??10000;
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>10000)throw Error('Invalid execution budget');
 const dir=resolve(directory);await mkdir(dir,{recursive:true,mode:0o700});
 if(!(await lstat(dir)).isDirectory())throw Error('Invalid checkpoint directory');
 const path=join(dir,executionId+'.json'),lockPath=path+'.lock';
 const lock=await open(lockPath,'wx',0o600);
 try{
  let snapshot;
  if(resume){
   const stat=await lstat(path);if(!stat.isFile()||stat.size>limit)throw Error('Invalid checkpoint file');
   snapshot=JSON.parse(await readFile(path,'utf8'));
   if(snapshot.schemaVersion!==1||snapshot.executionId!==executionId||snapshot.fingerprint!==fingerprint||(snapshot.maxAttempts??10000)!==maxAttempts||(snapshot.policyFingerprint??digest(order.map(()=>normalizePolicy())))!==policyFingerprint||!Array.isArray(snapshot.tasks)||snapshot.tasks.length!==order.length)throw Error('Checkpoint mismatch');
   for(let i=0;i<order.length;i++){
    const t=snapshot.tasks[i];
    if(!t||t.id!==order[i].id||!Object.hasOwn(transitions,t.state)||(t.state==='succeeded'&&!Object.hasOwn(t,'output')))throw Error('Invalid checkpoint state');
    const deps=order[i].dependsOn.map(d=>snapshot.tasks.find(x=>x.id===d));
    if(['running','succeeded','failed'].includes(t.state)&&deps.some(d=>d?.state!=='succeeded'))throw Error('Invalid checkpoint dependency');
    if(t.state==='blocked'&&!deps.some(d=>['failed','blocked'].includes(d?.state)))throw Error('Invalid blocked state');
   }
  }else{
   try{await lstat(path);throw Error('Execution already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
   snapshot={schemaVersion:1,executionId,workflowId:def.id,fingerprint,policyFingerprint,maxAttempts,tasks:order.map(t=>({id:t.id,state:'pending'}))};
  }
  async function save(){
   const data=JSON.stringify(snapshot);if(Buffer.byteLength(data)>limit)throw Error('Checkpoint too large');
   const tmp=path+'.'+randomUUID()+'.tmp';const f=await open(tmp,'wx',0o600);
   try{await f.writeFile(data);await f.sync();await f.close();await rename(tmp,path);}finally{await f.close().catch(()=>{});await unlink(tmp).catch(()=>{});}
  }
  for(const t of snapshot.tasks)if(t.attempts!==undefined&&(!Number.isInteger(t.attempts)||t.attempts<1||t.attempts>10))throw Error('Invalid attempt count');
  if(snapshot.tasks.some(t=>t.state==='running'))throw Error('Interrupted task requires operator reconciliation');
  await save();
  for(let i=0;i<order.length;i++){
   const t=order[i], current=snapshot.tasks[i];
   if(current.state==='running')throw Error('Interrupted task requires operator reconciliation');
   if(current.state!=='pending')continue;
   if(signal?.aborted)break;
   const remaining=maxAttempts-snapshot.tasks.reduce((n,t)=>n+(t.attempts??0),0);
   if(remaining<=0){snapshot.stopReason='Execution budget exhausted';await save();return snapshot;}
   const deps=t.dependsOn.map(d=>snapshot.tasks.find(x=>x.id===d));
   if(deps.some(d=>d.state!=='succeeded')){snapshot.tasks[i]=transition(current,'blocked');await save();continue;}
   if(gate){const decision=await gate({executionId,workflowId:def.id,fingerprint,task:structuredClone(t),dependencies:Object.fromEntries(deps.map(d=>[d.id,structuredClone(d.output)]))});
    if(!decision||!['allow','deny','review'].includes(decision.status))throw Error('Invalid policy decision');
    current.authorization={status:decision.status,record:decision.record??null};await save();
    if(decision.status!=='allow')return snapshot;
   }
   snapshot.tasks[i]=transition(current,'running');await save();
   const result=await attemptTask(handlers.get(t.handler),{dependencies:Object.fromEntries(deps.map(d=>[d.id,structuredClone(d.output)])),executionId,taskId:t.id,idempotencyKey:executionId+':'+t.id},{...config[i],maxAttempts:Math.min(config[i].maxAttempts,remaining)},{signal,onAttempt:async attempt=>{snapshot.tasks[i].attempts=attempt;await save();}});
   if(result.uncertain){snapshot.tasks[i].interruption=result.error;await save();return snapshot;}
   let output;
   try{if(!result.ok)throw Error('Task failed');output=jsonOutput(result.output);}
   catch{snapshot.tasks[i]={...transition(snapshot.tasks[i],'failed'),error:result.error??'Task failed'};await save();continue;}
   snapshot.tasks[i]={...transition(snapshot.tasks[i],'succeeded'),output};await save();
  }
  return snapshot;
 }finally{await lock.close();await unlink(lockPath);}
}
