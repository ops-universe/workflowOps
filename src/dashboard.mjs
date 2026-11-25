import {createServer} from 'node:http';
import {readFile,open,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,join} from 'node:path';
import {cli} from './cli.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const names=new Set(['supplier','documents','support','recovery']);
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
export async function dashboard(directory,{port=0}={}){
 const root=resolve(directory);
 if(!(await lstat(root)).isDirectory())throw Error('Invalid trusted directory');
 const assets=new Map(await Promise.all(['index.html','app.js','style.css'].map(async name=>[name,await readFile(new URL('../dashboard/'+name,import.meta.url))])));
 let server;
 server=createServer(async(req,res)=>{
  function send(status,body,type='application/json; charset=utf-8'){res.writeHead(status,{...headers,'Content-Type':type});res.end(body);}
  try{
   const host='127.0.0.1:'+server.address().port;
   if(req.headers.host!==host||req.headers.origin&&req.headers.origin!=='http://'+host||req.headers['sec-fetch-site']==='cross-site')return send(403,'{}');
   if(req.method!=='GET')return send(405,'{}');
   const url=new URL(req.url,'http://'+host);
   if(url.origin!=='http://'+host)return send(403,'{}');
   if(url.pathname==='/')return send(200,assets.get('index.html'),'text/html; charset=utf-8');
   if(url.pathname==='/app.js')return send(200,assets.get('app.js'),'text/javascript; charset=utf-8');
   if(url.pathname==='/style.css')return send(200,assets.get('style.css'),'text/css; charset=utf-8');
   if(url.pathname!=='/api/execution')return send(404,'{}');
   const name=url.searchParams.get('scenario'),id=url.searchParams.get('id');
   if(!names.has(name)||typeof id!=='string'||!uuid.test(id))return send(400,'{}');
   const f=await open(join(root,id+'.json'),constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
   let data;
   try{const stat=await f.stat();if(!stat.isFile()||stat.size>4194304)throw Error('Invalid checkpoint');const buf=Buffer.alloc(stat.size+1);const {bytesRead}=await f.read(buf,0,buf.length,0);if(bytesRead!==stat.size)throw Error('Changed checkpoint');data=JSON.parse(buf.subarray(0,bytesRead).toString('utf8'));}finally{await f.close();}
   if(data.executionId!==id||data.workflowId!==name||data.schemaVersion!==1||!Array.isArray(data.tasks)||data.tasks.length>1000)throw Error('Invalid checkpoint');
   const graph=await cli(['dag',name]);
   return send(200,JSON.stringify({graph,execution:data}));
  }catch{return send(400,'{}');}
 });
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
 return server;
}
