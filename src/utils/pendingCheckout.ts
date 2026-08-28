// Stripe Checkout uses the SAME url for success_url and cancel_url
// (`/settings?tab=billing`), so when the user lands back there we cannot tell
// from the URL whether they paid or hit "back". On top of that, a successful
// payment only reaches our database via webhook, so the subscription is still
// absent for a few seconds after a genuine success.
//
// We therefore leave a marker in sessionStorage before sending the user to
// Stripe, and the billing page uses it to decide whether to show a "processing"
// state and poll. sessionStorage (not localStorage) so it dies with the tab, and
// entries carry a timestamp so a marker left by an abandoned checkout can't keep
// the page in "processing" forever.
//
// TODO: delete this once the backend appends a marker of its own to success_url
// (e.g. `?checkout=success`) — then the URL alone is enough.

const KEY = 'pendingCheckout';
const MAX_AGE_MS = 15 * 60 * 1000;

// 'card' = payment-method setup-session return (backend change C6). Its Stripe
// page doesn't charge anything — success is detected by `last4` changing, not
// by a webhook-driven subscription field, so it carries the pre-redirect last4
// to diff against.
export type PendingCheckoutKind = 'subscription' | 'credits' | 'card';

export interface PendingCheckout {
  kind: PendingCheckoutKind;
  /** Tier for a subscription, credit count for a top-up. Only used for copy. */
  target?: string;
  /** 'card' only: last4 before redirecting, so the return can detect a change. */
  last4Before?: string | null;
  ts: number;
}

export function markPendingCheckout(
  kind: PendingCheckoutKind,
  target?: string,
  last4Before?: string | null,
): void {
  try {
    const payload: PendingCheckout = { kind, target, last4Before, ts: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Private mode / storage disabled — the page just won't show the
    // processing state, which is a degraded but correct experience.
  }
}

export function readPendingCheckout(): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckout;
    if (typeof parsed?.ts !== 'number' || Date.now() - parsed.ts > MAX_AGE_MS) {
      clearPendingCheckout();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingCheckout(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
