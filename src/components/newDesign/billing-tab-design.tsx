import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Info, X, Loader2 } from 'lucide-react';
import { useSubscription, hasEntitlement } from '@/hooks/useSubscription';
import { useUserPlanIfAny } from '@/hooks/useUserPlan';
import {
  ADD_ON_INTERVIEWS, ADD_ON_PRICE, ADD_ON_VALID_DAYS, PLAN_INTERVIEWS,
  fetchInterviewQuota, grantKeys, startQuotaCheckout, useInterviewQuota, waitForQuotaGrant,
  type InterviewQuota, type QuotaSource,
} from '@/hooks/useInterviewQuota';
import {
  markPendingCheckout, readPendingCheckout, clearPendingCheckout,
  type PendingCheckoutKind,
} from '@/utils/pendingCheckout';
import { PaymentService } from '@/services';
import { BuyCreditsModal } from './BuyCreditsModal';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';

// ─── Formatting helpers (mirror billing.tsx) ─────────────────────────────────────
const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
// Usage tiles use the short form, as in the design ("Resets Nov 3").
const formatShortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
const formatAmountCents = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

interface Invoice {
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  invoiceUrl: string;
  createdAt: string;
}
interface UsageTxn {
  amount: number;
  recurringAmount: number;
  permanentAmount: number;
  transactionType: 'CREDIT' | 'DEBIT' | string;
  sourceType: string;
  description: string;
  createdAt: string;
}
// GET /payments/payment-method (backend change C6). `status` is the backend's
// verdict against the NEXT renewal date, not "today" — never recompute it from
// expMonth/expYear here. `NONE` means no saved card, not an error.
interface PaymentMethodData {
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  status: 'VALID' | 'EXPIRES_BEFORE_RENEWAL' | 'EXPIRED' | 'NONE';
}
// ─── Types ─────────────────────────────────────────────────────────────────────
type PlanState  = 'free' | 'basic' | 'advanced' | 'flagship' | 'pro';
type CancelState = 'active' | 'refund_window' | 'post_window' | 'canceled';

// ─── Switch Plan Confirm Modal ──────────────────────────────────────────────────
// An upgrade is charged to the saved card immediately and takes effect right
// away, so it needs an explicit confirmation — there is no Stripe Checkout page
// in between to act as one.
function SwitchPlanConfirmModal({
  onClose,
  onConfirm,
  isActing = false,
  fromPlanName,
  toPlanName,
  toPlanPrice,
  changeType,
  nextBillingDate,
}: {
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isActing?: boolean;
  fromPlanName: string;
  toPlanName: string;
  toPlanPrice: string;
  changeType: 'upgrade' | 'downgrade';
  nextBillingDate: string;
}) {
  const isUpgrade = changeType === 'upgrade';
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.16 }}
        className="bg-card w-[420px] rounded-xl shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-foreground mb-2" style={{ fontSize: 16 }}>
          {isUpgrade ? `Upgrade to ${toPlanName}?` : `Switch to ${toPlanName}?`}
        </h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          {fromPlanName} → <span className="text-foreground font-medium">{toPlanName}</span> · {toPlanPrice}
        </p>

        <div className="flex items-start gap-2.5 rounded-lg bg-secondary px-3 py-2.5 mb-6 border border-border/60">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isUpgrade ? (
              <>
                Your card on file will be charged <span className="text-foreground font-medium">today</span>,
                prorated for the rest of the current period. {toPlanName} features unlock
                immediately — this can't be undone from here.
              </>
            ) : (
              <>
                You keep {fromPlanName} until <span className="text-foreground font-medium">{nextBillingDate}</span>,
                then move to {toPlanName}. Nothing is charged today.
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isActing}
            className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
          >
            Go back
          </button>
          <button
            onClick={onConfirm}
            disabled={isActing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isActing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isUpgrade ? 'Confirm and pay' : 'Schedule change'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Buy Credits Modal ──────────────────────────────────────────────────────────
// ─── Redeem Code Modal ──────────────────────────────────────────────────────────
type RedeemStatus = 'idle' | 'loading' | 'success' | 'error_expired' | 'error_used' | 'error_invalid';

function RedeemCodeModal({ onClose, onRedeem }: { onClose: () => void; onRedeem?: (code: string) => Promise<{ ok: boolean; message?: string; creditsAdded?: number; totalCredits?: number }> }) {
  const [code,   setCode]   = useState('');
  const [status, setStatus] = useState<RedeemStatus>('idle');
  const [apiError, setApiError] = useState('');
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null);
  const [totalCredits, setTotalCredits] = useState<number | null>(null);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setStatus('loading');
    setApiError('');
    if (onRedeem) {
      const res = await onRedeem(code.trim());
      if (res.ok) {
        setCreditsAdded(res.creditsAdded ?? null);
        setTotalCredits(res.totalCredits ?? null);
        setStatus('success');
      }
      else { setStatus('error_invalid'); setApiError(res.message || 'Invalid code. Please check and try again.'); }
      return;
    }
    setTimeout(() => {
      const c = code.trim().toUpperCase();
      if      (c === 'SCRENA50') setStatus('success');
      else if (c === 'EXPIRED')  setStatus('error_expired');
      else if (c === 'USED')     setStatus('error_used');
      else                       setStatus('error_invalid');
    }, 800);
  };

  const errorMsg =
    apiError                    ? apiError :
    status === 'error_expired'  ? 'This code has expired.' :
    status === 'error_used'     ? 'This code has already been used.' :
    status === 'error_invalid'  ? 'Invalid code. Please check and try again.' : '';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.16 }}
        className="bg-card w-[380px] rounded-2xl p-6" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.14)' }}
        onClick={e => e.stopPropagation()}
      >
        {status === 'success' ? (
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <p className="font-medium text-foreground mb-1.5" style={{ fontSize: 17 }}>Code applied!</p>
            <p className="text-sm text-muted-foreground mb-1">
              {creditsAdded != null
                ? <><span className="font-semibold text-foreground">+{creditsAdded.toLocaleString()}</span> credits added to your balance</>
                : 'Your credits have been added to your balance.'}
            </p>
            {totalCredits != null && (
              <p className="text-sm text-muted-foreground mb-6">
                New balance: <span className="font-semibold text-foreground">{totalCredits.toLocaleString()} credits</span>
              </p>
            )}
            {totalCredits == null && <div className="mb-6" />}
            <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="font-medium text-foreground" style={{ fontSize: 17 }}>Redeem a code</p>
                <p className="text-xs text-muted-foreground mt-0.5">Enter your promotional or gift code</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-foreground mb-1.5">Promo / gift code</label>
              <input
                type="text" autoFocus value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setStatus('idle'); }}
                onKeyDown={e => { if (e.key === 'Enter') handleRedeem(); }}
                placeholder="e.g. SCRENA50"
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-background border focus:outline-none focus:ring-2 focus:ring-primary/30 tracking-widest font-mono"
                style={{ borderColor: errorMsg ? 'var(--destructive)' : 'var(--color-border)', color: 'var(--color-foreground)' }}
              />
              {errorMsg
                ? <p className="text-xs mt-1.5" style={{ color: 'var(--destructive)' }}>{errorMsg}</p>
                : <p className="text-xs text-muted-foreground mt-1.5">Try demo code: SCRENA50</p>
              }
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={!code.trim() || status === 'loading'}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {status === 'loading' ? 'Checking…' : 'Redeem'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Payment Toast ──────────────────────────────────────────────────────────────
function PaymentToast({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        key={message}
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        onAnimationComplete={() => { setTimeout(onDone, 2800); }}
        className="fixed top-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-lg bg-green-50 border border-green-300 text-green-800"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0 text-green-700" />
        <p className="text-green-800" style={{ fontSize: 14, fontWeight: 500 }}>{message}</p>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Billing Tab (main export) ──────────────────────────────────────────────────
// Tier options for the switch-plan panel. Since change C9 only Pro is on sale:
// BASIC / ADVANCED / FLAGSHIP can't be a target (400), so a subscriber on one
// of them sees it as "Current" (not selectable) next to Pro. The badges are
// derived per render from the live subscription — never hardcoded here.
type SwitchTier = 'basic' | 'advanced' | 'flagship' | 'pro';
// basic / advanced / flagship: legacy tiers, still billed at their old price. Pro: $29 (Stripe).
const TIER_PRICE: Record<SwitchTier, string> = { basic: '$7.99', advanced: '$29.99', flagship: '$79.99', pro: '$29' };

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));


// plan_switch_confirmed 用：按 tier 排序判断 upgrade / downgrade。
// Advanced → Pro is the same level (C9 "PRO: 2") and the same price, so it is
// treated as an immediate change, not a scheduled downgrade.
const TIER_ORDER: Record<string, number> = { free: 0, basic: 1, advanced: 2, pro: 2, flagship: 3 };
const getChangeType = (fromTier: string, toTier: string): 'upgrade' | 'downgrade' =>
  (TIER_ORDER[toTier] ?? 0) >= (TIER_ORDER[fromTier] ?? 0) ? 'upgrade' : 'downgrade';

export function BillingTab() {
  // ── Real data sources ──
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    subscription, isActing, changeTier, cancel, resume, refresh, cancelPendingDowngrade,
    waitForSubscription,
  } = useSubscription();
  const navigate = useNavigate();
  const posthog = usePostHog();
  // Interviews for candidate-paid partner-role AI interviews (change C9).
  const { quota, refresh: refreshQuota } = useInterviewQuota();
  // A Pro 90-day changes the app-wide plan without a subscription row.
  const planContext = useUserPlanIfAny();
  const refreshPlan = async () => planContext?.refreshPlan();

  // Guards the async fetchers below from setting state after unmount, and holds
  // the invoice-poll timer so it can be cancelled rather than outliving us.
  const mountedRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // ── Plan state (real) ──
  // Entitlement follows the backend rule: ACTIVE or PAST_DUE. UNPAID/CANCELED
  // have no benefits left, and INCOMPLETE never got a first payment.
  const isEntitled = hasEntitlement(subscription);
  // A legacy row (STARTER/PREMIUM) has no current tier but is still a live
  // subscription the user must be able to cancel — see `isLegacySubscription`.
  const planState: PlanState = isEntitled ? subscription?.plan ?? 'free' : 'free';
  const isLegacySubscription = Boolean(subscription?.isLegacyPlan) && isEntitled;
  const isPastDue = subscription?.status === 'past_due';
  // Legacy subscribers have planState 'free' (no current tier) but still own a
  // live subscription — the module (and the payment-method fetch below) has to
  // run so they can cancel it / update their card.
  const isMember = planState !== 'free' || isLegacySubscription;

  // Whether cancelling right now refunds is the backend's verdict (`refundOnCancel`),
  // computed with the same rule /cancel applies — including the one-time-refund
  // flag that is deliberately not exposed. We used to approximate this from
  // `firstSubAt` + 3 days, which promised a refund to anyone who had already
  // used theirs and re-subscribed.
  // It is also false once a cancellation is already scheduled or the sub ended,
  // which is exactly when this entry point shouldn't offer a refund anyway.
  const willRefundOnCancel = Boolean(subscription?.refundOnCancel);
  const firstSubMs = subscription?.firstSubAt
    ? new Date(subscription.firstSubAt).getTime()
    : null;

  const cancelState: CancelState =
    !subscription || subscription.status === 'canceled' || subscription.status === 'unpaid'
      ? 'canceled'
      : subscription.cancelAtPeriodEnd
        ? 'post_window'
        : willRefundOnCancel
          ? 'refund_window'
          : 'active';

  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  // Legacy rows show their backend name (e.g. "Premium") so the row isn't blank.
  const legacyPlanName = subscription?.rawPlan
    ? titleCase(subscription.rawPlan.split('_')[0].toLowerCase())
    : 'Legacy';
  const planName = isLegacySubscription
    ? legacyPlanName
    : planState === 'free'
      ? 'Free'
      : titleCase(planState);
  const cycleName = subscription?.billingCycle
    ? titleCase(subscription.billingCycle)
    : 'Monthly';

  // A scheduled downgrade can be a tier change, a billing-cycle change, or both
  // — the backend defers either to the end of the current period. Reading only
  // the tier meant a cycle downgrade was invisible here.
  //
  // `downgradePendingPlan` is a combined "TIER_CYCLE" value, so one half is
  // often just a restatement of the current setting (e.g. pending BASIC_MONTHLY
  // while already monthly). Only mention what actually differs.
  const pendingTierName =
    subscription?.downgradePendingTier && subscription.downgradePendingTier !== subscription.plan
      ? titleCase(subscription.downgradePendingTier)
      : null;
  const pendingCycleName =
    subscription?.downgradePendingCycle &&
    subscription.downgradePendingCycle !== subscription.billingCycle
      ? titleCase(subscription.downgradePendingCycle)
      : null;
  // A pending cancellation overrides a pending downgrade: the downgrade would
  // only apply at the next renewal, and a canceled subscription has none.
  const pendingCancelSupersedes = Boolean(subscription?.cancelAtPeriodEnd);
  const pendingChangeLabel =
    pendingTierName && pendingCycleName
      ? `${pendingTierName} · ${pendingCycleName} billing`
      : pendingTierName
        ? pendingTierName
        : pendingCycleName
          ? `${pendingCycleName} billing`
          : null;
  const nextBillingDate = formatDate(subscription?.currentPeriodEnd);
  const nextBillingAmount = subscription?.nextBillingAmount != null
    ? formatAmountCents(subscription.nextBillingAmount, subscription.currency)
    : planState === 'free' ? '—' : TIER_PRICE[planState];

  // days_since_subscribed：用 firstSubAt（首次订阅，续订不刷新）计算。
  // 老数据可能为 null，此时仍然上报 null。
  const daysSinceSubscribed =
    firstSubMs !== null && !Number.isNaN(firstSubMs)
      ? Math.floor((Date.now() - firstSubMs) / (24 * 60 * 60 * 1000))
      : null;

  // ── Subscription UI ──
  // Only a legacy tier (Basic / Advanced / Flagship) can switch, and only to Pro
  // (C9). The switch charges the saved card, so it asks first.
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const selectedPlan: SwitchTier = 'pro';

  // ── Credits (real API) ──
  const [showBuyCredits,  setShowBuyCredits]  = useState(false);
  const [showRedeemCode,  setShowRedeemCode]  = useState(false);
  const [credits, setCredits] = useState<{
    recurringCreditBalance: number;
    permanentCreditBalance: number;
    totalBalance: number;
    resetDate: string | null;
  }>({
    recurringCreditBalance: 0,
    permanentCreditBalance: 0,
    totalBalance: 0,
    resetDate: null,
  });

  // Returns the permanent balance so the checkout-return poll can tell when a
  // top-up has actually landed. `resetDate` isn't part of GET /payments/credits
  // — it stays null until the API exposes one.
  const fetchCredits = useCallback(async (): Promise<number | null> => {
    try {
      const res = await PaymentService.getCredits();
      const data = res.data?.data ?? res.data ?? {};
      const recurring = data.recurringCreditBalance ?? 0;
      const permanent = data.permanentCreditBalance ?? 0;
      if (!mountedRef.current) return permanent;
      setCredits({
        recurringCreditBalance: recurring,
        permanentCreditBalance: permanent,
        totalBalance: data.totalBalance ?? (recurring + permanent),
        resetDate: data.resetDate ?? null,
      });
      return permanent;
    } catch {
      /* keep defaults on failure */
      return null;
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // ── This-month usage (real API: GET /payments/credit-usage ledger) ──
  // The endpoint returns a paginated ledger of CREDIT/DEBIT transactions, not a
  // monthly aggregate — so we page through the current billing period, sum the
  // DEBITs (credits consumed), and keep the entries for the history list.
  const [usedThisMonth, setUsedThisMonth] = useState(0);

  const fetchUsage = useCallback(async () => {
    const startISO = subscription?.currentPeriodStart;
    const now = new Date();
    const periodStart = startISO
      ? new Date(startISO).getTime()
      : new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const collected: UsageTxn[] = [];
    try {
      // Cap at 12 pages so a huge ledger can't spin forever; stop once we
      // reach the last page or an entry older than the period start.
      for (let page = 0; page < 12; page++) {
        const res = await PaymentService.getCreditUsage(page);
        const data = res.data?.data ?? res.data ?? {};
        const content: UsageTxn[] = data.content ?? [];
        collected.push(...content);
        const isLast = data.pageMeta?.last ?? true;
        const oldest = content.length
          ? new Date(content[content.length - 1].createdAt).getTime()
          : periodStart - 1;
        if (isLast || oldest < periodStart) break;
      }
    } catch {
      if (mountedRef.current) setUsedThisMonth(0);
      return;
    }

    const used = collected
      .filter(t => new Date(t.createdAt).getTime() >= periodStart && t.transactionType === 'DEBIT')
      .reduce((sum, t) => sum + Math.abs(t.amount ?? 0), 0);
    if (mountedRef.current) setUsedThisMonth(used);
  }, [subscription?.currentPeriodStart]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // ── Invoices (real API) ──
  const [invoices, setInvoices]               = useState<Invoice[]>([]);
  const [invoicePage]                         = useState(0);

  // Returns the row count so callers can tell whether a new invoice landed.
  const fetchInvoices = useCallback(async (): Promise<number> => {
    try {
      const res = await PaymentService.getInvoices(invoicePage);
      const content = res.data?.data?.content ?? res.data?.content ?? [];
      if (mountedRef.current) setInvoices(content);
      return content.length;
    } catch {
      if (mountedRef.current) setInvoices([]);
      return 0;
    }
  }, [invoicePage]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Re-read every section of this tab. Any billing mutation (tier change,
  // cancel, resume, credit top-up) can move the subscription, the credit
  // balance, the usage ledger AND the invoice list, so they refresh together —
  // refreshing only the subscription is what left the invoice table stale after
  // an upgrade.
  //
  // Payment method is deliberately NOT included here: per the API doc it's a
  // live Stripe round-trip (slower than everything else) and must not be
  // cached, so it gets its own effect/loading state below rather than being
  // bundled into a Promise.allSettled that every other mutation waits on.
  const refreshBilling = useCallback(async () => {
    await Promise.allSettled([refresh(), fetchCredits(), fetchUsage(), fetchInvoices()]);
  }, [refresh, fetchCredits, fetchUsage, fetchInvoices]);

  // ── Payment method (real API: GET /payments/payment-method) ──────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData | null>(null);
  const [pmLoading, setPmLoading] = useState(true);
  const [pmError, setPmError] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);

  const fetchPaymentMethod = useCallback(async (): Promise<PaymentMethodData | null> => {
    try {
      const res = await PaymentService.getPaymentMethod();
      const data = res.data?.data ?? res.data ?? {};
      const pm: PaymentMethodData = {
        brand: data.brand ?? null,
        last4: data.last4 ?? null,
        expMonth: data.expMonth ?? null,
        expYear: data.expYear ?? null,
        status: data.status ?? 'NONE',
      };
      if (mountedRef.current) {
        setPaymentMethod(pm);
        setPmError(false);
      }
      return pm;
    } catch {
      if (mountedRef.current) setPmError(true);
      return null;
    } finally {
      if (mountedRef.current) setPmLoading(false);
    }
  }, []);

  // Free users and fully-ended subscriptions get no card section — matches
  // where the Subscription module itself is gated (`isMember`), and avoids a
  // Stripe round-trip nobody asked for. Legacy/PAST_DUE users, who most need
  // this, are still members.
  useEffect(() => {
    if (isMember) fetchPaymentMethod();
    else { setPaymentMethod(null); setPmLoading(false); }
  }, [isMember, fetchPaymentMethod]);

  // An upgrade's invoice is created by Stripe and reaches our DB via webhook, so
  // it may not exist yet when the tier call returns. Poll a few times, stopping
  // as soon as a new row shows up. Fire-and-forget: the immediate refresh has
  // already run, this only fills in a late invoice.
  // ── Stripe Checkout return ──────────────────────────────────────────────
  // Stripe sends the user back to this page for BOTH success and cancel, and a
  // real payment only reaches our DB via webhook — so without this the user pays
  // and lands on "Free". The marker is written before we hand them to Stripe.
  const [checkoutPending, setCheckoutPending] = useState(false);
  // Which flow checkoutPending/checkoutCancelled is confirming — only affects copy.
  const [checkoutPendingKind, setCheckoutPendingKind] = useState<PendingCheckoutKind | null>(null);
  // Set when the user came back from Stripe without paying. Not an error — just
  // say nothing was charged.
  const [checkoutCancelled, setCheckoutCancelled] = useState(false);
  const [checkoutCancelledKind, setCheckoutCancelledKind] = useState<PendingCheckoutKind | null>(null);

  useEffect(() => {
    // The backend's `?checkout=` value is authoritative — the sessionStorage
    // marker is only a fallback for a lost/cross-device param. Two shapes:
    //   'success' / 'cancelled'            — generic, kind unknown from the URL
    //   'card_success' / 'card_cancelled'  — the setup-session return, which
    //     shares the billing page URL with subscription/credits Checkout and
    //     so needs its OWN value to avoid being misread as a subscription
    //     result (see the `?? { kind: 'subscription', ... }` fallback below).
    // Extend this map, not the branches beneath it, if more flows need their
    // own outcome value.
    const CHECKOUT_PARAMS: Record<string, { outcome: 'success' | 'cancelled'; kind: PendingCheckoutKind | null }> = {
      success: { outcome: 'success', kind: null },
      cancelled: { outcome: 'cancelled', kind: null },
      card_success: { outcome: 'success', kind: 'card' },
      card_cancelled: { outcome: 'cancelled', kind: 'card' },
    };

    const param = searchParams.get('checkout');
    if (param) {
      const next = new URLSearchParams(searchParams);
      next.delete('checkout');
      setSearchParams(next, { replace: true });
    }
    const urlSignal = param ? CHECKOUT_PARAMS[param] ?? null : null;

    // A sessionStorage marker, if one survived, always wins on WHICH flow this
    // is (it alone carries `last4Before`/`target`) — the URL only supplies the
    // outcome plus a kind to fall back on when the marker didn't survive.
    const marker = readPendingCheckout();

    if (urlSignal?.outcome === 'cancelled') {
      // P4: the one return path where the user definitely did not pay.
      safeCapture(posthog, EVENTS.CHECKOUT_RETURNED, {
        entry: 'billing',
        payment_type: marker?.kind ?? urlSignal.kind ?? 'subscription',
        outcome: 'cancelled',
        signal: 'url',
      });
      clearPendingCheckout();
      setCheckoutCancelled(true);
      setCheckoutCancelledKind(marker?.kind ?? urlSignal.kind);
      return;
    }

    // Success (per the URL), or no URL signal at all — fall back to the marker.
    const pending = marker ?? (urlSignal?.outcome === 'success'
      ? { kind: urlSignal.kind ?? 'subscription' as const, ts: Date.now() }
      : null);
    if (!pending) return; // ordinary visit — nothing to confirm

    // P4: fired once per return, before any polling — a returning user is an
    // observable fact, whether or not the webhook has landed yet. `signal`
    // records which of the two mechanisms told us (the backend's ?checkout=
    // param, or the sessionStorage marker it falls back on).
    safeCapture(posthog, EVENTS.CHECKOUT_RETURNED, {
      entry: 'billing',
      payment_type: pending.kind,
      outcome: 'returned',
      signal: urlSignal ? 'url' : 'marker',
    });

    let cancelled = false;
    setCheckoutPending(true);
    setCheckoutPendingKind(pending.kind);
    (async () => {
      try {
        if (pending.kind === 'credits') {
          // A top-up doesn't touch the subscription — re-read the balance until
          // it moves (or we run out of attempts). Compare against the value the
          // fetch returns, not component state, which is stale in this closure.
          const before = await fetchCredits();
          for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
            await sleep(2000);
            const now = await fetchCredits();
            if (now !== null && before !== null && now !== before) break;
          }
        } else if (pending.kind === 'pro-90-day' || pending.kind === 'interview-add-on') {
          // One-time purchases land as a new interview-quota grant. A Pro
          // subscriber's plan stays PRO after buying Pro 90-day, so watch the
          // grants, not the plan.
          const source: QuotaSource = pending.kind === 'pro-90-day' ? 'PRO_90_DAY' : 'ADD_ON';
          const landed = await waitForQuotaGrant(source, pending.grantsBefore, () => cancelled);
          if (!cancelled && mountedRef.current) {
            setToastMsg(
              landed
                ? pending.kind === 'pro-90-day' ? 'Pro 90-Day is active' : 'Interviews added'
                : 'Payment is still processing · refresh in a moment',
            );
          }
        } else if (pending.kind === 'card') {
          // The setup-session page doesn't charge anything and has no
          // subscription-side field to poll — a changed `last4` is the only
          // signal that the new card actually landed as the default.
          for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
            const pm = await fetchPaymentMethod();
            if (pm?.last4 && pm.last4 !== pending.last4Before) break;
            await sleep(2000);
          }
        } else {
          const settled = await waitForSubscription(s => hasEntitlement(s));
          // payment_completed —— 客户端 best-effort（Stripe webhook 才是扣款事实
          // 来源）。以前挂在 /payment-success 页面上，但 Stripe 从不回跳到那里，
          // 所以这个事件实际从未上报过；现在挂在真正的回跳落地点。
          if (settled) {
            safeCapture(posthog, EVENTS.PAYMENT_COMPLETED, {
              source: 'billing_checkout_return',
              plan: settled.plan,
            });
          } else {
            // Polling gave up. Not the same as "the payment failed" — the
            // webhook may still land after we stopped looking — so it is
            // recorded as what the front end actually observed (P4).
            safeCapture(posthog, EVENTS.PAYMENT_REQUEST_FAILED, {
              entry: 'billing',
              payment_type: pending.kind,
              reason: 'settlement_poll_timeout',
            });
          }
        }
      } catch {
        /* fall through — the finally block still clears the pending state */
      } finally {
        if (!cancelled && mountedRef.current) {
          clearPendingCheckout();
          setCheckoutPending(false);
          // A card update also triggers an automatic retry-payment on the
          // backend, so the subscription/credits/invoices can all have moved.
          await Promise.allSettled(
            pending.kind === 'card'
              ? [refresh(), fetchCredits(), fetchInvoices()]
              : pending.kind === 'pro-90-day' || pending.kind === 'interview-add-on'
                ? [refreshQuota(), refreshPlan(), fetchInvoices()]
                : [fetchCredits(), fetchInvoices(), refreshQuota()],
          );
        }
      }
    })();

    return () => { cancelled = true; };
    // Deliberately mount-only: the sessionStorage marker is the trigger, and
    // re-running on every credits change would restart the poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollForNewInvoice = useCallback(async (countBefore: number) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      // Held in a ref so unmount clears it — a dangling timer kept firing after
      // the component was gone.
      await new Promise<void>(resolve => {
        pollTimerRef.current = setTimeout(() => {
          pollTimerRef.current = null;
          resolve();
        }, 1500);
      });
      if (!mountedRef.current) return;
      const count = await fetchInvoices();
      if (count > countBefore) return;
    }
  }, [fetchInvoices]);

  const fireToast   = (msg: string) => { setToastMsg(null); requestAnimationFrame(() => setToastMsg(msg)); };

  // ── Real action handlers ──
  const handleBuyCredits = async (n: number) => {
    try {
      const res = await PaymentService.purchaseCustomPack(n);
      const url = res.data?.data?.url ?? res.data?.url;
      if (url) {
        // Stripe returns to this page for success AND cancel — leave a marker so
        // we know to wait for the webhook when they come back.
        markPendingCheckout('credits', String(n));
        window.location.href = url;
        return;
      }
      // Charged on the saved card — a credit pack also produces an invoice.
      const invoiceCountBefore = invoices.length;
      await refreshBilling();
      void pollForNewInvoice(invoiceCountBefore);
    } catch {
      fireToast('Unable to start checkout. Please try again.');
    }
    setShowBuyCredits(false);
  };

  const handleRedeem = async (code: string): Promise<{ ok: boolean; message?: string; creditsAdded?: number; totalCredits?: number }> => {
    try {
      const res = await PaymentService.redeemCode(code);
      if (res.data?.status === 'success' || res.status === 200) {
        const payload = res.data?.data ?? {};
        const creditsAdded: number | undefined = payload.creditsAdded;
        const totalCredits: number | undefined = payload.totalCredits;
        if (typeof totalCredits === 'number') {
          // Refresh balance from the redeem response — no extra GET /payments/credits needed.
          setCredits(prev => ({
            ...prev,
            permanentCreditBalance: prev.permanentCreditBalance + (creditsAdded ?? 0),
            totalBalance: totalCredits,
          }));
        } else {
          await fetchCredits();
        }
        return { ok: true, creditsAdded, totalCredits };
      }
      return { ok: false, message: res.data?.message };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        || (err as { message?: string })?.message;
      return { ok: false, message: msg || 'Failed to redeem code.' };
    }
  };

  // Step 2 — POST /payments/subscriptions/tier. The 200 only means Stripe
  // accepted it: the row is updated later by webhook, and an upgrade can still
  // fail at the card while returning 200. `changeTier` therefore polls; `settled`
  // false means it hadn't landed before the timeout, which is "processing", NOT
  // "failed".
  const handleConfirmSwitch = async () => {
    if (selectedPlan === planState) {
      setShowSwitchConfirm(false);
      return;
    }
    const changeType = getChangeType(planState, selectedPlan);
    const invoiceCountBefore = invoices.length;
    const { ok, url, settled } = await changeTier(selectedPlan);
    if (!ok) return;

    // plan_switch_confirmed —— 仅在 API 成功后上报。有 url 时也要在跳转前上报，
    // 否则重定向会把事件丢掉。
    safeCapture(posthog, EVENTS.PLAN_SWITCH_CONFIRMED, {
      from_tier: planState,
      to_tier: selectedPlan,
      billing_cycle: subscription?.billingCycle ?? 'monthly',
      change_type: changeType,
      requires_payment: Boolean(url),
      settled,
    });

    if (url) {
      window.location.href = url;
      return;
    }

    setShowSwitchConfirm(false);

    if (!settled) {
      fireToast('Change submitted · still processing, refresh in a moment');
      return;
    }

    // The change landed, so credits, usage and invoices may have moved too.
    await refreshBilling();
    if (changeType === 'upgrade') {
      void pollForNewInvoice(invoiceCountBefore);
    }
    fireToast(
      changeType === 'upgrade'
        ? `Upgraded to ${titleCase(selectedPlan)} · active now`
        : `Change to ${titleCase(selectedPlan)} scheduled for ${nextBillingDate}`,
    );
  };

  // Cancel → POST /payments/subscriptions/cancel. Two backend paths share this
  // endpoint and return identical responses, so `cancel()` polls and reports
  // which one actually ran via `refunded`.
  const handleCancelSubscription = async () => {
    const { ok, settled, refunded } = await cancel();
    if (!ok) return;

    // subscription_cancelled —— 仅在 API 成功后上报
    safeCapture(posthog, EVENTS.SUBSCRIPTION_CANCELLED, {
      plan_tier: planState,
      days_since_subscribed: daysSinceSubscribed,
      refunded,
      settled,
    });

    if (!settled) {
      fireToast('Cancellation submitted · still processing, refresh in a moment');
      return;
    }
    await refreshBilling();
    fireToast(
      refunded
        ? `Subscription canceled · ${nextBillingAmount} refund on its way (5–10 business days)`
        : `Subscription canceled · access continues until ${nextBillingDate}`,
    );
  };

  // Undo a scheduled downgrade (tier and/or cycle) before it lands →
  // POST /payments/subscriptions/cancel-pending-downgrade. Without this the user
  // is stuck with the pending change until the period ends.
  const handleCancelPendingDowngrade = async () => {
    const ok = await cancelPendingDowngrade();
    if (!ok) return;
    await refreshBilling();
    fireToast(`Scheduled change canceled · staying on ${planName}${
      pendingCycleName ? ` · ${cycleName}` : ''
    }`);
  };

  // Reactivate → POST /payments/subscriptions/resume (undoes a pending cancel).
  const handleReactivate = async () => {
    const { ok, settled } = await resume();
    if (!ok) return;
    if (!settled) {
      fireToast('Reactivation submitted · still processing, refresh in a moment');
      return;
    }
    await refreshBilling();
    fireToast('Subscription reactivated');
  };

  // Update/add card → POST /payments/payment-method/setup-session. Stripe's
  // hosted page does the actual card entry and validation — we never see the
  // card number, and the 200 here only means a checkout session was created,
  // not that the card changed yet (that lands via webhook after the redirect).
  const handleUpdatePaymentMethod = async () => {
    try {
      const res = await PaymentService.createPaymentMethodSetupSession();
      const url = res.data?.data?.url ?? res.data?.url;
      if (!url) {
        fireToast('Unable to start card update. Please try again.');
        return;
      }
      markPendingCheckout('card', undefined, paymentMethod?.last4 ?? null);
      window.location.href = url;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ?? 'Unable to start card update. Please try again.';
      fireToast(message);
    }
  };

  // Immediately re-attempts the subscription's open invoice against the
  // current default card. Stripe's own dunning retries are day-scale, so this
  // exists for "I just fixed my card, don't make me wait" (and for a fresh
  // card that was itself declined).
  const handleRetryPayment = async () => {
    setIsRetryingPayment(true);
    try {
      const res = await PaymentService.retryPayment();
      const data = res.data?.data ?? res.data ?? {};
      const outcome: 'PAID' | 'DECLINED' | 'REQUIRES_ACTION' | 'NO_OPEN_INVOICE' = data.outcome;
      switch (outcome) {
        case 'PAID': {
          const settled = await waitForSubscription(s => s?.status === 'active');
          await refreshBilling();
          fireToast(settled ? 'Payment succeeded · your subscription is active' : 'Payment submitted · still processing, refresh in a moment');
          break;
        }
        case 'REQUIRES_ACTION':
          // 3DS/SCA challenge — cannot be completed off Stripe's page.
          if (data.hostedInvoiceUrl) window.location.href = data.hostedInvoiceUrl;
          break;
        case 'DECLINED':
          fireToast('That card was declined. Please update your payment method.');
          break;
        case 'NO_OPEN_INVOICE':
          fireToast("Nothing to retry — there's no open invoice.");
          break;
        default:
          fireToast('Unable to retry payment. Please try again.');
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ?? 'Unable to retry payment. Please try again.';
      fireToast(message);
    } finally {
      setIsRetryingPayment(false);
    }
  };

  // subscription_cancel_clicked —— 点击「Cancel subscription」入口
  const trackCancelClicked = () => {
    safeCapture(posthog, EVENTS.SUBSCRIPTION_CANCEL_CLICKED, {
      current_tier: planState,
      days_since_subscribed: daysSinceSubscribed,
    });
  };

  // Pro 90-day / interview add-on → one-time Stripe Checkout (C9). The grant
  // keys from before the redirect let the return tell the new grant from an
  // old one. The button stays disabled until the redirect: a second completed
  // checkout is a second real charge, and neither purchase is refundable.
  const [buyingQuota, setBuyingQuota] = useState<'pro-90-day' | 'interview-add-on' | null>(null);
  const handleBuyQuota = async (kind: 'pro-90-day' | 'interview-add-on') => {
    setBuyingQuota(kind);
    try {
      const before: InterviewQuota | null = await fetchInterviewQuota().catch(() => null);
      const url = await startQuotaCheckout(kind);
      markPendingCheckout(kind, undefined, undefined, before ? grantKeys(before, kind === 'pro-90-day' ? 'PRO_90_DAY' : 'ADD_ON') : undefined);
      window.location.href = url;
    } catch (err) {
      const code = (err as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
      fireToast(code === 'INSUFFICIENT_PLAN_TIER' ? 'More interviews are available on Pro' : "Couldn't start checkout · please try again");
      setBuyingQuota(null);
    }
  };

  const isCanceled = cancelState === 'canceled';

  // Reasons the backend rejects /tier outright — a legacy tier's "Switch to
  // Pro" is disabled with the reason instead of letting it 400.
  const switchBlockedReason = subscription?.planSwitchPending
    ? `Your plan switches to Pro on ${nextBillingDate}.`
    : subscription?.cancelAtPeriodEnd
      ? 'Your subscription is scheduled to cancel. Keep it before changing plan.'
      : pendingChangeLabel
        ? 'A plan change is already scheduled. Cancel it before choosing a different plan.'
        : isPastDue
          ? 'Your last payment failed. Plan changes are unavailable until billing is up to date.'
          : null;
  const isLegacyTier = planState === 'basic' || planState === 'advanced' || planState === 'flagship';

  // ── Interviews (quota) ──
  const planGrantSources: QuotaSource[] = ['FREE_MONTHLY', 'PRO_PERIOD', 'PRO_90_DAY'];
  const planGrants = (quota?.grants ?? []).filter(g => planGrantSources.includes(g.source));
  const addOnGrants = (quota?.grants ?? []).filter(g => g.source === 'ADD_ON');
  const planLeft = planGrants.reduce((n, g) => n + g.remaining, 0);
  const addOnLeft = addOnGrants.reduce((n, g) => n + g.remaining, 0);
  // "X of Y" from the plan grants' sessions (used included); never cached or
  // hard-coded. The plan's current grant stays listed when used up (#319), so
  // this reads "15 of 15 used"; before #319 it drops out, hence 'All used'.
  const included = planGrants.reduce((n, g) => n + (g.sessions ?? g.remaining), 0);
  const earliest = (dates: (string | null)[]) =>
    dates.filter((d): d is string => !!d).sort()[0] ?? null;
  const planResets = quota?.plan === 'FREE' ? quota.resetsAt : earliest(planGrants.map(g => g.expiresAt));
  const isPro90 = quota?.plan === 'PRO_90_DAY' && !isMember;
  const card = paymentMethod && paymentMethod.status !== 'NONE' ? paymentMethod : null;

  // ── Practice minutes = credits (1 credit per minute) ──
  const practiceTotal = usedThisMonth + credits.recurringCreditBalance;
  const practiceReset = subscription?.currentPeriodEnd ?? credits.resetDate;

  // Invoices carry no line item, so name the row from what each product costs.
  const invoiceItem = (inv: Invoice) =>
    inv.amount === 1200 ? `${ADD_ON_INTERVIEWS} interviews add-on`
      : inv.amount === 7900 ? 'Pro 90-day'
        : inv.amount === 2900 ? 'Pro, monthly'
          : 'Payment';

  const goPricing = () => navigate('/plans');
  const btn = 'inline-flex items-center justify-center gap-1.5 px-4 py-[10px] rounded-xl text-[13px] leading-[19.5px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const primaryBtn = `${btn} bg-[#3c77f6] text-white hover:bg-[#2d6ae0]`;
  const outlineBtn = `${btn} bg-white border border-[#d9deea] text-[#4d525e] hover:bg-[#f9fafb]`;
  const section = 'bg-white border border-[#e1e4ea] rounded-2xl p-6';
  const eyebrow = 'text-[12px] leading-[18px] font-medium tracking-[0.5px] uppercase text-[#5a6172]';
  const h2 = 'text-[18px] leading-[27px] font-bold tracking-[-0.44px] text-[#1e232f]';
  const body = 'text-[13px] leading-5 text-[#5a6172]';

  const planTitle = isMember
    ? `${planName} · ${planState === 'pro' ? TIER_PRICE.pro : nextBillingAmount} / month`
    : isPro90
      ? 'Pro 90-day · $79 once'
      : 'Free · $0';
  const planLine = isMember
    ? isPastDue
      ? "We couldn't process your last payment. Update your payment method to keep your access."
      : subscription?.cancelAtPeriodEnd
        ? `Ends ${nextBillingDate}${card ? ` · Card ending ${card.last4}` : ''}`
        : subscription?.planSwitchPending
          ? `Your plan switches to Pro on ${nextBillingDate}.`
          : `Renews ${nextBillingDate}${card ? ` · Card ending ${card.last4}` : ''}`
    : isPro90
      ? `Ends ${formatDate(earliest(planGrants.map(g => g.expiresAt)))} · Charged once, never renews`
      : `${PLAN_INTERVIEWS.FREE} partner-role interviews a month`;

  return (
    <div className="flex flex-col">
      {/* ── Modals ── */}
      <AnimatePresence>
        {showSwitchConfirm && (
          <SwitchPlanConfirmModal
            onClose={() => setShowSwitchConfirm(false)}
            onConfirm={handleConfirmSwitch}
            isActing={isActing}
            fromPlanName={planName}
            toPlanName={titleCase(selectedPlan)}
            toPlanPrice={`${TIER_PRICE[selectedPlan]}/mo`}
            changeType={getChangeType(planState, selectedPlan)}
            nextBillingDate={nextBillingDate}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{showBuyCredits && <BuyCreditsModal onClose={() => setShowBuyCredits(false)} onPurchase={handleBuyCredits} />}</AnimatePresence>
      <AnimatePresence>{showRedeemCode && <RedeemCodeModal onClose={() => setShowRedeemCode(false)} onRedeem={handleRedeem} />}</AnimatePresence>
      {toastMsg && <PaymentToast message={toastMsg} onDone={() => setToastMsg(null)} />}

      <h1 className="text-[28px] leading-[35px] font-bold text-[#1e232f]" style={{ fontFamily: "'Playfair Display', serif" }}>
        Billing
      </h1>

      {/* Came back from Stripe without paying. Deliberately neutral — backing
          out of checkout is a normal choice, not a failure. */}
      {checkoutCancelled && !checkoutPending && (
        <div className="mt-6 flex items-start justify-between gap-3 rounded-xl border border-border bg-secondary px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {checkoutCancelledKind === 'card' ? 'Card update canceled' : 'Checkout canceled'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {checkoutCancelledKind === 'card'
                  ? "Nothing was saved and your payment method is unchanged. You can update it again whenever you're ready."
                  : "Nothing was charged and your plan is unchanged. You can pick a plan again whenever you're ready."}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setCheckoutCancelled(false); setCheckoutCancelledKind(null); }}
            aria-label="Dismiss"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Returned from Stripe Checkout — the webhook hasn't landed yet. Never
          say "failed" here: the event is most likely still in the queue. */}
      {checkoutPending && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-border bg-secondary px-4 py-3">
          <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {checkoutPendingKind === 'card' ? 'Confirming your new card…' : 'Confirming your payment…'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {checkoutPendingKind === 'card'
                ? "This usually takes a few seconds. If you closed the page without saving a card, nothing changed."
                : 'This usually takes a few seconds. If you closed the payment page without paying, nothing was charged.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Current plan ── */}
      <section className={`${section} mt-6`}>
        <p className={eyebrow}>Current plan</p>
        <h2 className="pt-2 text-[22px] leading-[33px] font-bold tracking-[-0.26px] text-[#1e232f]">{planTitle}</h2>
        <p className={`pt-2 ${isPastDue ? 'text-[13px] leading-5 text-[#b91c1c]' : body}`}>{planLine}</p>
        {isLegacySubscription && (
          <p className={`pt-1 ${body}`}>This is a legacy plan. It can't be changed — cancel it to move to a current plan.</p>
        )}
        {/* A scheduled downgrade only lands at the period end and can be undone
            until then; a scheduled cancellation supersedes it. */}
        {pendingChangeLabel && !isCanceled && !pendingCancelSupersedes && (
          <p className={`pt-1 ${body}`}>
            Changing to {pendingChangeLabel} on {nextBillingDate} ·{' '}
            <button onClick={handleCancelPendingDowngrade} disabled={isActing} className="font-medium text-[#3c77f6] hover:underline disabled:opacity-60">
              Cancel change
            </button>
          </p>
        )}
        {/* `status` is the backend's verdict against the NEXT renewal date. */}
        {isMember && card?.status === 'EXPIRES_BEFORE_RENEWAL' && (
          <p className="pt-1 text-[13px] leading-5 text-[#b45309]">
            This card expires before your next renewal{nextBillingDate ? ` on ${nextBillingDate}` : ''} — update it to avoid a failed payment.
          </p>
        )}
        {isMember && card?.status === 'EXPIRED' && (
          <p className="pt-1 text-[13px] leading-5 text-[#b91c1c]">
            This card has expired. Update your payment method to keep your subscription active.
          </p>
        )}
        {isMember && pmError && (
          <p className={`pt-1 ${body}`}>
            Couldn't load your payment method.{' '}
            <button onClick={() => { setPmLoading(true); fetchPaymentMethod(); }} className="font-medium text-[#3c77f6] hover:underline">
              Retry
            </button>
          </p>
        )}
        <div className="flex flex-wrap gap-3 pt-5">
          {isMember && isPastDue ? (
            <>
              <button onClick={handleUpdatePaymentMethod} className={primaryBtn}>Update payment method</button>
              <button onClick={handleRetryPayment} disabled={isRetryingPayment} className={outlineBtn}>
                {isRetryingPayment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Retry payment
              </button>
            </>
          ) : isMember ? (
            <>
              {isLegacyTier ? (
                <button
                  onClick={() => setShowSwitchConfirm(true)}
                  disabled={switchBlockedReason !== null || isActing}
                  title={switchBlockedReason ?? undefined}
                  className={primaryBtn}
                >
                  Switch to Pro
                </button>
              ) : planState === 'pro' && !subscription?.cancelAtPeriodEnd ? (
                <button onClick={() => void handleBuyQuota('pro-90-day')} disabled={buyingQuota !== null} className={primaryBtn}>
                  {buyingQuota === 'pro-90-day' ? 'Opening checkout…' : 'Switch to 90-day'}
                </button>
              ) : null}
              <button onClick={handleUpdatePaymentMethod} disabled={pmLoading} className={outlineBtn}>
                {card ? 'Update card' : 'Add payment method'}
              </button>
              <button onClick={goPricing} className={outlineBtn}>View pricing</button>
            </>
          ) : isPro90 ? (
            <button onClick={goPricing} className={outlineBtn}>View pricing</button>
          ) : (
            <>
              <button
                onClick={() => {
                  safeCapture(posthog, EVENTS.UPGRADE_CLICKED, { current_tier: planState, target_tier: 'pro', source: 'settings' });
                  goPricing();
                }}
                className={primaryBtn}
              >
                Get Pro
              </button>
              <button onClick={() => void handleBuyQuota('pro-90-day')} disabled={buyingQuota !== null} className={outlineBtn}>
                {buyingQuota === 'pro-90-day' ? 'Opening checkout…' : 'Get Pro 90-Day'}
              </button>
              <button onClick={goPricing} className={outlineBtn}>View pricing</button>
            </>
          )}
        </div>
      </section>

      {/* ── Usage ── */}
      <section className="pt-6">
        <h2 className={h2}>Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-5">
            <p className={eyebrow}>Interviews</p>
            <p className="pt-3 text-[20px] leading-[30px] font-bold tracking-[-0.45px] text-[#1e232f]">
              {!quota ? '—' : planGrants.length ? `${Math.max(0, included - planLeft)} of ${included} used` : 'All used'}
            </p>
            <p className="pt-1 text-[12px] leading-[18px] text-[#8f99b5]">
              {quota
                ? `${planLeft} interview${planLeft === 1 ? '' : 's'} left${planResets ? ` · ${quota.plan === 'PRO_90_DAY' ? 'Ends' : 'Resets'} ${formatShortDate(planResets)}` : ''}`
                : 'Partner-role interviews you pay for'}
            </p>
          </div>
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-5">
            <p className={eyebrow}>Practice</p>
            <p className="pt-3 text-[20px] leading-[30px] font-bold tracking-[-0.45px] text-[#1e232f]">
              {usedThisMonth} of {practiceTotal} min
            </p>
            <p className="pt-1 text-[12px] leading-[18px] text-[#8f99b5]">
              {practiceReset ? `Resets ${formatShortDate(practiceReset)}` : 'No monthly reset'}
              {credits.permanentCreditBalance > 0 && ` · +${credits.permanentCreditBalance} extra min`}
              {' · '}
              <button onClick={() => setShowBuyCredits(true)} className="text-[12px] leading-[18px] font-medium text-[#3c77f6] hover:underline">Buy minutes</button>
              {' · '}
              <button onClick={() => setShowRedeemCode(true)} className="text-[12px] leading-[18px] font-medium text-[#3c77f6] hover:underline">Redeem code</button>
            </p>
          </div>
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-5">
            <p className={eyebrow}>Add-on interviews</p>
            <p className="pt-3 text-[20px] leading-[30px] font-bold tracking-[-0.45px] text-[#1e232f]">{addOnLeft} left</p>
            <p className="pt-1 text-[12px] leading-[18px] text-[#8f99b5]">
              {addOnLeft > 0 ? `Expires ${formatShortDate(earliest(addOnGrants.map(g => g.expiresAt)))}` : 'No active add-on interviews'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Add-on (Pro / Pro 90-Day only: 403 INSUFFICIENT_PLAN_TIER otherwise) ── */}
      <section className={`${section} mt-5 flex flex-col sm:flex-row sm:items-center gap-5`}>
        <div className="flex-1 min-w-0">
          <h2 className={h2}>Add {ADD_ON_INTERVIEWS} interviews for {ADD_ON_PRICE}</h2>
          <p className={`pt-1 ${body}`}>Valid {ADD_ON_VALID_DAYS} days. Used after your plan's interviews.</p>
        </div>
        {quota?.plan === 'FREE' ? (
          <button disabled className={`${btn} bg-[#eef0f4] text-[#8f99b5] shrink-0`}>Available with Pro</button>
        ) : (
          <button onClick={() => void handleBuyQuota('interview-add-on')} disabled={buyingQuota !== null} className={`${primaryBtn} shrink-0`}>
            {buyingQuota === 'interview-add-on' ? 'Opening checkout…' : `Buy ${ADD_ON_INTERVIEWS} more`}
          </button>
        )}
      </section>

      {/* ── Cancel (subscriptions only). One step, as the design says; a
          scheduled cancellation turns this into "Keep" (resume). ── */}
      {isMember && !isCanceled && (
        <section className={`${section} mt-5`}>
          {cancelState === 'post_window' ? (
            <>
              <h2 className={h2}>{planName} ends {nextBillingDate}</h2>
              <p className={`pt-2 max-w-[760px] ${body}`}>
                You can keep it any time before then, and every full report you've received stays available.
                {pendingChangeLabel && ` Keeping it restores the scheduled change to ${pendingChangeLabel}.`}
              </p>
              <div className="flex gap-3 pt-5">
                <button onClick={handleReactivate} disabled={isActing} className={primaryBtn}>
                  {isActing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Keep {planName}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className={h2}>Cancel {planName}</h2>
              <p className={`pt-2 max-w-[760px] ${body}`}>
                {cancelState === 'refund_window'
                  ? `Cancel here in one step. You're within the refund window, so you'll get ${nextBillingAmount} back and ${planName} ends right away. Every full report you've received stays available.`
                  : `Cancel here in one step. You keep ${planName} until ${nextBillingDate}, and every full report you've received stays available.`}
              </p>
              <div className="flex gap-3 pt-5">
                <button
                  onClick={() => { trackCancelClicked(); void handleCancelSubscription(); }}
                  disabled={isActing}
                  className={primaryBtn}
                >
                  {isActing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {cancelState === 'refund_window' ? 'Cancel and refund' : 'Cancel subscription'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Payment history ── */}
      <section className={`${section} mt-5`}>
        <h2 className={h2}>Payment history</h2>
        {invoices.length === 0 ? (
          <p className={`pt-4 ${body}`}>No payments yet.</p>
        ) : (
          <div className="pt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b border-[#e1e4ea]">
                  {['Date', 'Item', 'Amount', 'Receipt'].map(h => (
                    <th key={h} className="pb-3 text-[12px] leading-[18px] font-medium text-[#5a6172]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.stripeInvoiceId ?? i} className="border-b border-[#edf0f2] last:border-0">
                    <td className="py-4 text-[13px] leading-[19.5px] text-[#4d525e]">{formatDate(inv.createdAt)}</td>
                    <td className="py-4 text-[13px] leading-[19.5px] text-[#4d525e]">{invoiceItem(inv)}</td>
                    <td className="py-4 text-[13px] leading-[19.5px] text-[#4d525e]">{formatAmountCents(inv.amount, inv.currency)}</td>
                    <td className="py-4">
                      <button
                        onClick={() => inv.invoiceUrl && window.open(inv.invoiceUrl, '_blank')}
                        disabled={!inv.invoiceUrl}
                        className="text-[13px] leading-[19.5px] font-medium text-[#3c77f6] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
