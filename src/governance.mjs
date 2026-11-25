import {createHash,randomUUID} from 'node:crypto';
import {plan} from './workflow.mjs';
import {runDurable} from './checkpoint.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const identifier=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
export function createActionRegistry(entries){
 const actions=new Map();
 for(const [name,a] of entries){
  if(!identifier(name)||actions.has(name)||!a||typeof a.run!=='function'||!['none','local-write','external'].includes(a.effect)||!identifier(a.permission)||!identifier(a.version))throw Error('Invalid action');
  if(a.maxCalls!==undefined&&(!Number.isInteger(a.maxCalls)||a.maxCalls<1||a.maxCalls>100||a.effect!=='none'||a.permission!=='ai'))throw Error('Invalid AI quota');
  if(a.permission==='ai'&&a.maxCalls===undefined)throw Error('AI quota required');
  actions.set(name,Object.freeze({run:a.run,effect:a.effect,permission:a.permission,version:a.version,maxCalls:a.maxCalls}));
 }
 return actions;
}
export function approvalScope({executionId,fingerprint,task,dependencies},action){
 return hash([executionId,fingerprint,task.id,task.handler,action.version,action.effect,action.permission,dependencies]);
}
// Host-only operation. Records are trusted local operator data, not authenticated identities.
export function approve(scope,actor){
 if(typeof scope!=='string'||!/^[a-f0-9]{64}$/.test(scope)||!identifier(actor))throw Error('Invalid approval');
 return Object.freeze({id:randomUUID(),scope,actor,decision:'allow'});
}
export async function runGoverned(def,actions,{permissions=[],approvals=[],policy=()=> 'allow',dryRun=false,...options}={}){
 const trusted=createActionRegistry(actions), grants=new Set(permissions);
 const records=structuredClone(approvals);
 const registry=new Map([...trusted].map(([name,a])=>[name,a.run]));
 const order=plan(def,registry);
 if(dryRun)return {dryRun:true,tasks:order.map(t=>({id:t.id,handler:t.handler,effect:trusted.get(t.handler).effect,permission:trusted.get(t.handler).permission,authorized:grants.has(trusted.get(t.handler).permission),requiresApproval:trusted.get(t.handler).effect!=='none'}))};
 const policies=new Map(options.policies??[]);
 // Side effects are never automatically retried by this governed entrypoint.
 for(const [name,a] of trusted)if(a.effect!=='none'&&(policies.get(name)?.maxAttempts??1)>1)throw Error('Side effect retries denied');
 const aiLimits=new Map([...trusted].filter(([,a])=>a.maxCalls!==undefined).map(([k,a])=>[k,a.maxCalls]));
 const governanceFingerprint=hash(order.map(t=>{const a=trusted.get(t.handler);return [t.handler,a.version,a.effect,a.permission,a.maxCalls??null];}));
 return runDurable(def,registry,{...options,policies,aiLimits,governanceFingerprint,gate:async ctx=>{
  const a=trusted.get(ctx.task.handler),scope=approvalScope(ctx,a);
  if(!grants.has(a.permission))return {status:'deny',record:{scope,reason:'permission'}};
  const decision=await policy({taskId:ctx.task.id,handler:ctx.task.handler,effect:a.effect,permission:a.permission,scope});
  if(!['allow','review'].includes(decision))return {status:'deny',record:{scope,reason:'policy'}};
  if(a.effect!=='none'||decision==='review'){
   const record=records.find(x=>x&&x.scope===scope&&x.decision==='allow'&&identifier(x.actor)&&typeof x.id==='string');
   if(!record)return {status:'review',record:{scope,reason:'approval-required'}};
   return {status:'allow',record:{scope,approvalId:record.id,actor:record.actor}};
  }
  return {status:'allow',record:{scope,reason:'permission-and-policy'}};
 }});
}
