// Real Chromium via Chrome DevTools Protocol; no extra npm dependencies.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {dashboard} from '../src/dashboard.mjs';
import {cli} from '../src/cli.mjs';
const dir=await mkdtemp(join(tmpdir(),'workflow-browser-'));
let chrome,server,ws;
try{
 const run=await cli(['run','supplier',dir]);server=await dashboard(dir);
 const url='http://127.0.0.1:'+server.address().port;
 const profile=join(dir,'chrome');
 chrome=spawn(process.env.CHROME_BIN||'google-chrome',['--headless=new','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let port;for(let i=0;i<100;i++){try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break;}catch{}await sleep(100);}
 assert.ok(port,'Chromium debugging port');
 const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true});});
 let seq=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const cb=pending.get(m.id);pending.delete(m.id);cb(m);}});
 async function send(method,params={}){const id=++seq;const m=await new Promise((ok,fail)=>{const timer=setTimeout(()=>{pending.delete(id);fail(Error('CDP timeout: '+method));},10000);pending.set(id,m=>{clearTimeout(timer);ok(m);});ws.send(JSON.stringify({id,method,params}));});if(m.error)throw Error(JSON.stringify(m.error));return m.result;}
 async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Browser evaluation failed');return r.result.value;}
 async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(100);}throw Error('Browser condition failed: '+expression);}
 await send('Page.enable');await send('Page.navigate',{url});await wait("document.readyState==='complete' && !!document.querySelector('#load')");
 await evaluate("document.querySelector('#execution').value="+JSON.stringify(run.executionId)+";document.querySelector('#load').requestSubmit();");
 await wait("document.querySelector('#status').textContent==='Loaded supplier'");
 assert.equal(await evaluate("document.querySelectorAll('#graph button').length"),3);
 await evaluate("document.querySelector('#graph button:last-of-type').focus()");
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await wait("document.querySelector('#details').textContent.includes('approval-required')");
 assert.ok(await evaluate("document.querySelector('#timeline').textContent.includes('authorization')"));
 await cli(['approve','supplier',dir,run.executionId,'operator']);
 await evaluate("document.querySelector('#load').requestSubmit()");await wait("document.querySelector('#graph button:last-of-type')?.textContent.includes('succeeded')");
 await evaluate("document.querySelector('#graph button:last-of-type').click()");assert.ok(await evaluate("document.querySelector('#details').textContent.includes('operator')"));
 await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
 assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
 await evaluate("document.querySelector('#execution').value='bad';document.querySelector('#load').requestSubmit()");await wait("document.querySelector('#status').textContent==='Unable to load checkpoint'");
 console.log('Chromium acceptance passed: load, DAG, keyboard task inspection, approval refresh, timeline, mobile layout, invalid input');
}finally{ws?.close();if(chrome){chrome.kill();await Promise.race([new Promise(ok=>chrome.once('exit',ok)),sleep(2000)]);}if(server)await new Promise(ok=>server.close(ok));await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
