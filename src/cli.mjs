import {readFile,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {plan} from './workflow.mjs';
import {runGoverned,approve} from './governance.mjs';
import {scenario} from './scenarios.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
async function checkpoint(directory,id){
 if(!uuid.test(id))throw Error('Invalid execution ID');
 const dir=resolve(directory);if(!(await lstat(dir)).isDirectory())throw Error('Invalid directory');
 const path=join(dir,id+'.json'),stat=await lstat(path);
 if(!stat.isFile()||stat.size>4194304)throw Error('Invalid checkpoint');
 const data=JSON.parse(await readFile(path,'utf8'));
 if(data.executionId!==id||data.schemaVersion!==1||!Array.isArray(data.tasks))throw Error('Invalid checkpoint');
 return data;
}
export async function cli(args){
 const [command,name,directory,id,actor]=args;
 if(!['validate','dag','dry-run','run','resume','inspect','approve'].includes(command))throw Error('Usage: validate|dag|dry-run|run|resume|inspect|approve SCENARIO DIRECTORY [EXECUTION_ID] [ACTOR]');
 const s=scenario(name),registry=new Map([...s.actions].map(([k,v])=>[k,v.run]));
 const order=plan(s.def,registry);
 if(command==='validate'||command==='dag')return {workflow:s.def.id,order:order.map(t=>t.id),edges:order.flatMap(t=>t.dependsOn.map(d=>({from:d,to:t.id})))};
 if(!directory)throw Error('Checkpoint directory required');
 if(command==='inspect'){const c=await checkpoint(directory,id);if(c.workflowId!==name)throw Error('Workflow mismatch');return c;}
 const opts={directory,permissions:s.permissions,policies:s.policies,budget:{maxAttempts:20}};
 if(command==='dry-run')return runGoverned(s.def,s.actions,{...opts,dryRun:true});
 if(command==='run')return runGoverned(s.def,s.actions,opts);
 const c=await checkpoint(directory,id);if(c.workflowId!==name)throw Error('Workflow mismatch');
 if(command==='resume')return runGoverned(s.def,s.actions,{...opts,executionId:id,resume:true});
 const waiting=c.tasks.find(t=>t.state==='pending'&&t.authorization?.status==='review');
 if(!waiting||!actor)throw Error('No pending approval or missing actor');
 return runGoverned(s.def,s.actions,{...opts,executionId:id,resume:true,approvals:[approve(waiting.authorization.record.scope,actor)]});
}
