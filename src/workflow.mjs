// Workflow definitions are data; only trusted registered functions execute.
const validId = x => typeof x === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
export function plan(def, registry) {
  if (!def || def.schemaVersion !== 1 || !validId(def.id) || !Array.isArray(def.tasks) || def.tasks.length === 0 || def.tasks.length > 1000 || !(registry instanceof Map)) throw new Error('Invalid workflow');
  const tasks = new Map();
  for (const t of def.tasks) {
    if (!t || !validId(t.id) || tasks.has(t.id) || !validId(t.handler) || typeof registry.get(t.handler) !== 'function' || !Array.isArray(t.dependsOn) || t.dependsOn.length > 1000 || t.dependsOn.some(d => !validId(d)) || new Set(t.dependsOn).size !== t.dependsOn.length) throw new Error('Invalid task');
    tasks.set(t.id, {id:t.id, handler:t.handler, dependsOn:[...t.dependsOn]});
  }
  for (const t of tasks.values()) for (const d of t.dependsOn) if (!tasks.has(d)) throw new Error('Unknown dependency');
  const remaining = new Set(tasks.keys()), done = new Set(), order = [];
  while (remaining.size) {
    const next = [...remaining].sort().find(id => tasks.get(id).dependsOn.every(d => done.has(d)));
    if (!next) throw new Error('Dependency cycle');
    remaining.delete(next); done.add(next); order.push(tasks.get(next));
  }
  return order;
}
export async function execute(def, registry) {
  const order = plan(def, registry);
  const handlers = new Map(registry);
  const results = new Map();
  for (const t of order) {
    if (t.dependsOn.some(d => results.get(d).state !== 'succeeded')) {
      results.set(t.id,{id:t.id,state:'blocked'}); continue;
    }
    try {
      const dependencies = Object.fromEntries(t.dependsOn.map(d => [d,structuredClone(results.get(d).output)]));
      const output = structuredClone(await handlers.get(t.handler)({dependencies}));
      results.set(t.id,{id:t.id,state:'succeeded',output});
    } catch {
      results.set(t.id,{id:t.id,state:'failed',error:'Task failed'});
    }
  }
  return {schemaVersion:1,workflowId:def.id,tasks:[...results.values()]};
}
