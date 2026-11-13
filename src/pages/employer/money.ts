import type { Money } from './employerApi';

// "$399" / "$12.50" in the price's own currency.
export function formatMoney(m: Money): string {
  const whole = m.amountCents % 100 === 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (m.currency || 'usd').toUpperCase(),
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(m.amountCents / 100);
  } catch {
    const n = m.amountCents / 100;
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 })}`;
  }
}
