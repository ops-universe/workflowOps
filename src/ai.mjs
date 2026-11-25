// Offline mock adapters only. Model output is data, never an execution instruction.
const maxBytes=16384;
function bounded(value){
 const s=JSON.stringify(value);
 if(typeof s!=='string'||Buffer.byteLength(s)>maxBytes)throw Error('AI payload exceeds limit');
 return JSON.parse(s);
}
export function createMockAdapter(fixtures){
 const data=new Map([...fixtures].map(([key,value])=>[key,bounded(value)]));
 return Object.freeze({kind:'mock',async generate({key,signal}){
  if(signal?.aborted)throw Error('Cancelled');
  if(!data.has(key))throw Error('Unknown mock fixture');
  return structuredClone(data.get(key));
 }});
}
export function createAiAction({adapter,key,maxCalls=1,enabled=false}={}){
 if(typeof enabled!=='boolean'||!Number.isInteger(maxCalls)||maxCalls<1||maxCalls>100||typeof key!=='string'||key.length>128)throw Error('Invalid AI configuration');
 if(enabled&&(!adapter||adapter.kind!=='mock'||typeof adapter.generate!=='function'))throw Error('Only trusted offline mock adapters supported');
 let calls=0;
 return Object.freeze({effect:'none',permission:'ai',version:'v1',async run({dependencies,signal}){
  if(!enabled)throw Error('AI disabled');
  if(signal?.aborted)throw Error('Cancelled');
  if(calls>=maxCalls)throw Error('AI call budget exhausted');
  const input=bounded(dependencies);calls++;
  const result=bounded(await adapter.generate({key,input,signal}));
  if(!result||typeof result!=='object'||Array.isArray(result)||Object.keys(result).length!==2||!Object.hasOwn(result,'summary')||!Object.hasOwn(result,'classification')||typeof result.summary!=='string'||result.summary.length>2048||!['accept','review','reject'].includes(result.classification))throw Error('Invalid AI output');
  return {summary:result.summary,classification:result.classification};
 }});
}
