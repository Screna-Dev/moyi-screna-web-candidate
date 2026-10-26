import type { EmployerPlan } from './types';

// What the next report unlock costs under the current plan.
export type UnlockQuote =
  | { kind: 'included'; remaining: number }
  | { kind: 'overage'; price: number; capLeft: number }
  | { kind: 'blocked'; reason: 'free_exhausted' | 'cap_reached' };

export function quoteUnlock(plan: EmployerPlan): UnlockQuote {
  const remaining = plan.unlockAllowance - plan.unlocksUsed;
  if (remaining > 0) return { kind: 'included', remaining };
  if (plan.tier === 'free') return { kind: 'blocked', reason: 'free_exhausted' };
  const capLeft = plan.overageCap - plan.overageThisMonth;
  if (capLeft < plan.overageUnitPrice) return { kind: 'blocked', reason: 'cap_reached' };
  return { kind: 'overage', price: plan.overageUnitPrice, capLeft };
}
