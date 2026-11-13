import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentService } from '@/services';
import { ADD_ON_INTERVIEWS, ADD_ON_PRICE, ADD_ON_VALID_DAYS, PLAN_INTERVIEWS } from './useInterviewQuota';

// Candidate prices from GET /payments/prices (#323) instead of hard-coded
// copy. The endpoint needs a session, so signed-out pages (home, the public
// pricing page) and the first render show the published defaults below, which
// match Stripe today. Once loaded, every caller in the tab shares one answer.

export type PriceOffer = { amountCents: number; currency: string; sessionCount: number | null; validDays: number | null };
export type CandidatePrices = {
  pro?: PriceOffer;
  pro90Day?: PriceOffer;
  interviewAddOn?: PriceOffer;
  credit?: PriceOffer;
  freeMonthlySessionCount?: number;
};

export function formatPrice(offer: Pick<PriceOffer, 'amountCents' | 'currency'> | undefined, fallback: string) {
  if (!offer || typeof offer.amountCents !== 'number') return fallback;
  const amount = offer.amountCents / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (offer.currency || 'USD').toUpperCase(),
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return fallback;
  }
}

let cache: CandidatePrices | null = null;
let inflight: Promise<CandidatePrices | null> | null = null;

function loadPrices(): Promise<CandidatePrices | null> {
  if (cache) return Promise.resolve(cache);
  inflight ??= Promise.resolve()
    .then(() => PaymentService.getPrices())
    .then((res: { data: unknown }) => {
      const d = ((res.data as { data?: CandidatePrices })?.data ?? res.data) as CandidatePrices;
      cache = d && typeof d === 'object' ? d : null;
      return cache;
    })
    .catch(() => null) // 500 when Stripe is unreadable: keep the defaults
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Test hook. */
export function resetCandidatePricesCache() {
  cache = null;
  inflight = null;
}

export function useCandidatePrices() {
  const { isAuthenticated } = useAuth();
  const [prices, setPrices] = useState<CandidatePrices | null>(cache);
  useEffect(() => {
    if (!isAuthenticated || cache) return;
    let cancelled = false;
    void loadPrices().then((p) => !cancelled && p && setPrices(p));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return {
    loaded: !!prices,
    pro: formatPrice(prices?.pro, '$29'),
    pro90Day: formatPrice(prices?.pro90Day, '$79'),
    addOn: formatPrice(prices?.interviewAddOn, ADD_ON_PRICE),
    addOnInterviews: prices?.interviewAddOn?.sessionCount ?? ADD_ON_INTERVIEWS,
    addOnValidDays: prices?.interviewAddOn?.validDays ?? ADD_ON_VALID_DAYS,
    proInterviews: prices?.pro?.sessionCount ?? PLAN_INTERVIEWS.PRO,
    pro90DayInterviews: prices?.pro90Day?.sessionCount ?? PLAN_INTERVIEWS.PRO_90_DAY,
    pro90DayDays: prices?.pro90Day?.validDays ?? 90,
    freeInterviews: prices?.freeMonthlySessionCount ?? PLAN_INTERVIEWS.FREE,
  };
}
