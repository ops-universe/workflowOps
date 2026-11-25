import {open,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,join} from 'node:path';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const types=new Set(['execution-created','cancelled','budget-exhausted','blocked','authorization','running','attempt','interrupted','failed','succeeded']);
export async function readCheckpoint(directory,id){
 if(typeof id!=='string'||!uuid.test(id))throw Error('Invalid execution ID');
 const root=resolve(directory);if(!(await lstat(root)).isDirectory())throw Error('Invalid directory');
 const f=await open(join(root,id+'.json'),constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 let data;
 try{
  const stat=await f.stat();if(!stat.isFile()||stat.size>4194304)throw Error('Invalid checkpoint file');
  const buf=Buffer.alloc(stat.size+1);let n=0;
  while(n<buf.length){const {bytesRead}=await f.read(buf,n,buf.length-n,n);if(!bytesRead)break;n+=bytesRead;}
  if(n!==stat.size)throw Error('Changed checkpoint');
  data=JSON.parse(buf.subarray(0,n).toString('utf8'));
 }finally{await f.close();}
 if(!data||data.schemaVersion!==1||data.executionId!==id||!Array.isArray(data.tasks)||data.tasks.length<1||data.tasks.length>1000)throw Error('Invalid checkpoint');
 const ids=new Set();
 for(const t of data.tasks){if(!t||typeof t.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(t.id)||ids.has(t.id)||!['pending','running','succeeded','failed','blocked'].includes(t.state))throw Error('Invalid checkpoint task');ids.add(t.id);}
 if(data.timeline!==undefined){
  if(!Array.isArray(data.timeline)||data.timeline.length>20000)throw Error('Invalid timeline');
  for(const [i,e] of data.timeline.entries())if(!e||e.sequence!==i+1||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at))||!types.has(e.type)||(e.taskId!==null&&!ids.has(e.taskId))||(e.type==='attempt'&&(!Number.isInteger(e.attempt)||e.attempt<1||e.attempt>10))||(e.type==='authorization'&&!['allow','deny','review'].includes(e.status)))throw Error('Invalid timeline event');
 }
 return data;
}
