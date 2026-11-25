import {createActionRegistry} from './governance.mjs';
const action=(run,effect='none',permission='read')=>({run,effect,permission,version:'v1'});
export function scenario(name){
 const specs={
 supplier:{steps:[['collect','collect',[]],['validate','validate',['collect']],['publish','publish',['validate']]],actions:[['collect',action(()=>({supplier:'Synthetic supplier',sku:'SKU-001'}))],['validate',action(({dependencies})=>({valid:!!dependencies.collect.sku}))],['publish',action(({dependencies})=>({simulated:true,accepted:dependencies.validate.valid}),'external','publish')]]},
 documents:{steps:[['extract','extract',[]],['classify','classify',['extract']]],actions:[['extract',action(()=>({text:'Synthetic invoice'}))],['classify',action(({dependencies})=>({type:dependencies.extract.text.includes('invoice')?'invoice':'other'}))]]},
 support:{steps:[['triage','triage',[]],['reply','reply',['triage']]],actions:[['triage',action(()=>({category:'billing'}))],['reply',action(()=>({simulated:true}),'external','publish')]]},
 recovery:{steps:[['prepare','prepare',[]],['retry','retry',['prepare']],['finish','finish',['retry']]],actions:[['prepare',action(()=>({ready:true}))],['retry',action(({attempt})=>{if(attempt===1)throw Error('synthetic transient failure');return {recovered:true};})],['finish',action(()=>({done:true}))]]}
 };
 if(!Object.hasOwn(specs,name))throw Error('Unknown scenario');
 const s=specs[name];return {def:{schemaVersion:1,id:name,tasks:s.steps.map(([id,handler,dependsOn])=>({id,handler,dependsOn}))},actions:createActionRegistry(s.actions),permissions:['read','publish'],policies:new Map(name==='recovery'?[['retry',{maxAttempts:2,idempotent:true}]]:[])};
}
