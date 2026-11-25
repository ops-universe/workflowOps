// Trusted host configuration only; workflow JSON cannot declare retry safety.
export function normalizePolicy(p={}){
 const {maxAttempts=1,timeoutMs=0,idempotent=false}=p;
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>10||!Number.isInteger(timeoutMs)||timeoutMs<0||timeoutMs>300000||typeof idempotent!=='boolean'||(maxAttempts>1&&!idempotent))throw Error('Invalid retry policy');
 return {maxAttempts,timeoutMs,idempotent};
}
export async function attemptTask(handler,context,policy,{signal,onAttempt=async()=>{},schedule=setTimeout,unschedule=clearTimeout}={}){
 const p=normalizePolicy(policy);
 for(let attempt=1;attempt<=p.maxAttempts;attempt++){
  if(signal?.aborted)return {ok:false,uncertain:true,error:'Cancelled'};
  await onAttempt(attempt);
  if(signal?.aborted)return {ok:false,uncertain:true,error:'Cancelled'};
  const controller=new AbortController();
  let timer,abort;
  const interruption=new Promise(resolve=>{
   const stop=error=>{resolve({ok:false,uncertain:true,error});controller.abort();};
   abort=()=>stop('Cancelled');
   signal?.addEventListener('abort',abort,{once:true});
   if(signal?.aborted)abort();
   if(p.timeoutMs)timer=schedule(()=>stop('Timed out'),p.timeoutMs);
  });
  try{
   const work=Promise.resolve().then(()=>{if(controller.signal.aborted)return {ok:false,uncertain:true,error:'Cancelled'};return Promise.resolve(handler({...structuredClone(context),attempt,signal:controller.signal})).then(output=>({ok:true,output}));}).catch(()=>({ok:false,error:'Task failed'}));
   const result=await Promise.race([interruption,work]);
   if(result.ok||result.uncertain||attempt===p.maxAttempts)return result;
  }finally{if(timer!==undefined)unschedule(timer);signal?.removeEventListener('abort',abort);}
 }
}
