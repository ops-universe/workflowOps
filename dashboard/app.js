const el=id=>document.getElementById(id);
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
el('load').addEventListener('submit',async e=>{
 e.preventDefault();el('status').textContent='Loading';el('graph').replaceChildren();el('details').textContent='';el('timeline').replaceChildren();
 try{
  const q=new URLSearchParams({scenario:el('scenario').value,id:el('execution').value});
  const response=await fetch('/api/execution?'+q);if(!response.ok)throw Error('Load failed');
  const {graph,execution}=await response.json();
  for(const id of graph.order){
   const t=execution.tasks.find(t=>t.id===id);
   const b=node('button',id+' — '+(t?.state??'unknown'));b.type='button';
   b.addEventListener('click',()=>{el('details').textContent=JSON.stringify(t,null,2);});
   el('graph').append(b);
   const deps=graph.edges.filter(edge=>edge.to===id).map(edge=>edge.from);
   if(deps.length)el('graph').append(node('p','Depends on: '+deps.join(', ')));
  }
  for(const event of execution.timeline??[])el('timeline').append(node('li',event.sequence+' · '+event.at+' · '+(event.taskId??'execution')+' · '+event.type+(event.attempt?' '+event.attempt:'')));
  el('status').textContent='Loaded '+execution.workflowId;
 }catch{el('status').textContent='Unable to load checkpoint';}
});
