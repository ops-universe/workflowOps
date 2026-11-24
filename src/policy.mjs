// Illustrative pure policy: risk is assigned by trusted configuration, not caller input.
export function decide(action, policy) {
  if (!action || typeof action.name !== 'string' || !policy || typeof policy !== 'object' || Array.isArray(policy)) return 'deny';
  if (!Object.hasOwn(policy, action.name)) return 'deny';
  const risk = policy[action.name];
  return risk === 'low' ? 'allow' : risk === 'high' ? 'review' : 'deny';
}
