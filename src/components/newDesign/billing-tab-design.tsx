import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, CheckCircle2, Download, Info,
  Plus, X, Loader2, RotateCcw, Gift,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, hasEntitlement } from '@/hooks/useSubscription';
import {
  markPendingCheckout, readPendingCheckout, clearPendingCheckout,
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
// ─── Types ─────────────────────────────────────────────────────────────────────
type PlanState  = 'free' | 'basic' | 'advanced' | 'flagship';
type CancelState = 'active' | 'refund_window' | 'post_window' | 'canceled';

// ─── Benefit Data ──────────────────────────────────────────────────────────────
const FREE_L = [
  'AI Interview Mocks',
  'Mentor Marketplace access',
  'Resume review',
  'Application tracking',
  'Interview Insights Community',
];
const FREE_R = [
  'Dedicated job search advisor',
  'Auto-apply to matched roles',
  'Resume submission & outreach',
  'Salary negotiation coaching',
  'Weekly live sessions',
];

// ─── BenefitItem ────────────────────────────────────────────────────────────────
function BenefitItem({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center mt-px"
        style={{ background: dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.28)' }}
      >
        <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
      </div>
      <span className="text-xs leading-snug" style={{ color: dark ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.90)' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Membership Banner ──────────────────────────────────────────────────────────
function MembershipBanner({
  plan,
  cancelAtPeriodEnd = false,
  accessEndsDate    = 'Jul 24, 2026',
  nextBillingDate   = 'Jul 24, 2026',
  nextBillingAmount = '$29.99',
  userName          = 'Alex',
  onUpgrade,
}: {
  plan: PlanState;
  cancelAtPeriodEnd?: boolean;
  accessEndsDate?:    string;
  nextBillingDate?:   string;
  nextBillingAmount?: string;
  userName?:          string;
  onUpgrade?:         () => void;
}) {
  /* ── Free / Non-member ── */
  if (plan === 'free') {
    return (
      <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: '#172554' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 80% 15%, color-mix(in srgb, #3b82f6 16%, transparent) 0%, transparent 55%), radial-gradient(ellipse at 15% 80%, color-mix(in srgb, #3b82f6 9%, transparent) 0%, transparent 55%)',
        }} />
        <div className="relative">
          <p style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 6, lineHeight: 1.3 }}>
            Unlock everything Screna has to offer
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)', marginBottom: 20, lineHeight: 1.55 }}>
            Join as a member to access mentorship, auto-apply, personalized coaching, and more.
          </p>
          <div className="grid grid-cols-2 mb-5" style={{ gap: '8px 32px' }}>
            <div className="flex flex-col gap-2.5">{FREE_L.map(f => <BenefitItem key={f} label={f} dark />)}</div>
            <div className="flex flex-col gap-2.5">{FREE_R.map(f => <BenefitItem key={f} label={f} dark />)}</div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onUpgrade}
              className="px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity"
              style={{ background: '#fff', color: '#0f1f3d', fontSize: 14 }}
            >
              Upgrade to Member
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>From $7.99 / mo · Cancel anytime</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Paid member — banner intentionally removed for members ── */
  return null;
}

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

// ─── Cancel Confirm Modal ───────────────────────────────────────────────────────
function CancelConfirmModal({
  onClose,
  onConfirm,
  isActing = false,
  accessEndsDate = 'Jul 24, 2026',
}: {
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isActing?: boolean;
  accessEndsDate?: string;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.16 }}
        className="bg-card w-[400px] rounded-xl shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-foreground mb-2" style={{ fontSize: 16 }}>Cancel subscription?</h3>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          Your access continues until {accessEndsDate}. You can reactivate any time before then.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isActing}
            className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            Keep subscription
          </button>
          <button
            onClick={onConfirm}
            disabled={isActing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/50 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-60"
          >
            {isActing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Cancel subscription
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

// ─── Section Label ──────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
      {children}
    </p>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'Active' | 'Past Due' | 'Canceled' }) {
  const map = {
    Active:    'bg-green-100 text-green-700',
    'Past Due':'bg-amber-100 text-amber-700',
    Canceled:  'bg-secondary text-muted-foreground',
  } as const;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

// ─── Billing Tab (main export) ──────────────────────────────────────────────────
// Tier options for the switch-plan panel. The "Current"/"Scheduled" badges are
// derived per render from the live subscription — never hardcoded here.
const PLAN_OPTIONS = [
  { id: 'basic',    name: 'Basic',    price: '$7.99/mo',  desc: 'billed monthly' },
  { id: 'advanced', name: 'Advanced', price: '$29.99/mo', desc: 'billed monthly' },
  { id: 'flagship', name: 'Flagship', price: '$79.99/mo', desc: 'billed monthly' },
] as const;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// plan_switch_confirmed 用：按 tier 排序判断 upgrade / downgrade。
const TIER_ORDER: Record<string, number> = { free: 0, basic: 1, advanced: 2, flagship: 3 };
const getChangeType = (fromTier: string, toTier: string): 'upgrade' | 'downgrade' =>
  (TIER_ORDER[toTier] ?? 0) > (TIER_ORDER[fromTier] ?? 0) ? 'upgrade' : 'downgrade';

export function BillingTab() {
  // ── Real data sources ──
  const { user } = useAuth();
  const {
    subscription, isActing, changeTier, cancel, resume, refresh, cancelPendingDowngrade,
    waitForSubscription,
  } = useSubscription();
  const navigate = useNavigate();
  const posthog = usePostHog();

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

  // Refund window anchors on `firstSubAt` — the *first ever* subscription — and
  // the backend allows it only once, so renewals do NOT reopen it.
  //
  // ⚠️ `firstSubRefundUsed` is not exposed by the API, so a user who already
  // refunded once and re-subscribed still looks eligible here. Copy therefore
  // stays conditional ("if eligible") and the real outcome comes from polling
  // after the call — see handleSubmitCancellation.
  const REFUND_WINDOW_DAYS = 3;
  const firstSubMs = subscription?.firstSubAt
    ? new Date(subscription.firstSubAt).getTime()
    : null;
  const maybeInRefundWindow =
    firstSubMs !== null &&
    !Number.isNaN(firstSubMs) &&
    Date.now() - firstSubMs <= REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const cancelState: CancelState =
    !subscription || subscription.status === 'canceled' || subscription.status === 'unpaid'
      ? 'canceled'
      : subscription.cancelAtPeriodEnd
        ? 'post_window'
        : maybeInRefundWindow
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
  const TIER_PRICE: Record<string, string> = { basic: '$7.99', advanced: '$29.99', flagship: '$79.99' };
  const nextBillingAmount = subscription?.nextBillingAmount != null
    ? formatAmountCents(subscription.nextBillingAmount, subscription.currency)
    : TIER_PRICE[planState] ?? '—';

  // days_since_subscribed：用 firstSubAt（首次订阅，续订不刷新）计算。
  // 老数据可能为 null，此时仍然上报 null。
  const daysSinceSubscribed =
    firstSubMs !== null && !Number.isNaN(firstSubMs)
      ? Math.floor((Date.now() - firstSubMs) / (24 * 60 * 60 * 1000))
      : null;

  // ── Subscription UI ──
  const [switchPlanOpen,  setSwitchPlanOpen]  = useState(false);
  const [selectedPlan,    setSelectedPlan]    = useState<'basic' | 'advanced' | 'flagship'>('advanced');
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  // Preselect the tier the user is actually on once the subscription loads (and
  // after any change), so the panel never opens on a stale selection.
  useEffect(() => {
    if (planState !== 'free') setSelectedPlan(planState);
  }, [planState]);

  // Belt and braces: a downgrade could get scheduled (another tab, or the row
  // above) while the panel is already open on that tier.
  const isSelectionScheduled = selectedPlan === subscription?.downgradePendingTier;

  // Badges come from live data: the tier in use, plus a scheduled downgrade
  // target if one is pending. The scheduled tier is not selectable — requesting
  // the same downgrade again is a no-op at best, so it's disabled and undone via
  // "Cancel change" on the plan row instead.
  const planOptions = PLAN_OPTIONS.map(plan => {
    const isScheduled = plan.id === subscription?.downgradePendingTier;
    return {
      ...plan,
      disabled: isScheduled,
      badge:
        plan.id === planState
          ? { text: 'Current', color: 'blue' as const }
          : isScheduled
            ? { text: 'Scheduled', color: 'green' as const }
            : null,
    };
  });
  const [cancelOpen,      setCancelOpen]      = useState(false);
  const [cancelSubmitted, setCancelSubmitted] = useState(false);
  // Which cancel path the backend actually took, learned by polling afterwards.
  const [cancelOutcome, setCancelOutcome] =
    useState<'refunded' | 'scheduled' | 'processing' | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

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
  const refreshBilling = useCallback(async () => {
    await Promise.allSettled([refresh(), fetchCredits(), fetchUsage(), fetchInvoices()]);
  }, [refresh, fetchCredits, fetchUsage, fetchInvoices]);

  // An upgrade's invoice is created by Stripe and reaches our DB via webhook, so
  // it may not exist yet when the tier call returns. Poll a few times, stopping
  // as soon as a new row shows up. Fire-and-forget: the immediate refresh has
  // already run, this only fills in a late invoice.
  // ── Stripe Checkout return ──────────────────────────────────────────────
  // Stripe sends the user back to this page for BOTH success and cancel, and a
  // real payment only reaches our DB via webhook — so without this the user pays
  // and lands on "Free". The marker is written before we hand them to Stripe.
  const [checkoutPending, setCheckoutPending] = useState(false);

  useEffect(() => {
    const pending = readPendingCheckout();
    if (!pending) return;

    let cancelled = false;
    setCheckoutPending(true);
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
          }
        }
      } catch {
        /* fall through — the finally block still clears the pending state */
      } finally {
        if (!cancelled && mountedRef.current) {
          clearPendingCheckout();
          setCheckoutPending(false);
          await Promise.allSettled([fetchCredits(), fetchInvoices()]);
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

  // Step 1 — never call the API straight from the panel. An upgrade charges the
  // saved card immediately (no Checkout page to act as a confirmation), so ask
  // first.
  const handleRequestSwitch = () => {
    if (selectedPlan === planState) {
      setSwitchPlanOpen(false);
      return;
    }
    // Already queued for the end of the period — nothing to request.
    if (isSelectionScheduled) return;
    setShowSwitchConfirm(true);
  };

  // Step 2 — POST /payments/subscriptions/tier. The 200 only means Stripe
  // accepted it: the row is updated later by webhook, and an upgrade can still
  // fail at the card while returning 200. `changeTier` therefore polls; `settled`
  // false means it hadn't landed before the timeout, which is "processing", NOT
  // "failed".
  const handleConfirmSwitch = async () => {
    if (selectedPlan === planState) {
      setShowSwitchConfirm(false);
      setSwitchPlanOpen(false);
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
    setSwitchPlanOpen(false);

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
    setShowCancelModal(false);
    setCancelOpen(false);

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

  // Refund-window variant of the same call. We can't know in advance whether the
  // refund path will run — `firstSubRefundUsed` isn't exposed — so the outcome
  // comes from what the polling actually observed.
  //
  // On the refund path access ends at once, which flips planState to Free and
  // unmounts this whole module along with the inline confirmation, so the result
  // also goes out as a toast (rendered above the isMember gate).
  const handleSubmitCancellation = async () => {
    const { ok, settled, refunded } = await cancel();
    if (!ok) return;
    safeCapture(posthog, EVENTS.SUBSCRIPTION_CANCELLED, {
      plan_tier: planState,
      days_since_subscribed: daysSinceSubscribed,
      refunded,
      settled,
    });
    setCancelSubmitted(true);
    setCancelOutcome(!settled ? 'processing' : refunded ? 'refunded' : 'scheduled');
    fireToast(
      !settled
        ? 'Cancellation submitted · still processing, refresh in a moment'
        : refunded
          ? `Subscription canceled · ${nextBillingAmount} refund on its way (5–10 business days)`
          : `Subscription canceled · access continues until ${nextBillingDate}`,
    );
    if (settled) await refreshBilling();
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

  // subscription_cancel_clicked —— 点击「Cancel subscription」入口
  const trackCancelClicked = () => {
    safeCapture(posthog, EVENTS.SUBSCRIPTION_CANCEL_CLICKED, {
      current_tier: planState,
      days_since_subscribed: daysSinceSubscribed,
    });
  };

  // Legacy subscribers have planState 'free' (no current tier) but still own a
  // live subscription — the module has to render so they can cancel it.
  const isMember       = planState !== 'free' || isLegacySubscription;
  const isCanceled     = cancelState === 'canceled';
  const bannerCancelAtPeriod = isCanceled || cancelState === 'post_window';

  // Reasons the backend rejects /tier outright — surface them instead of letting
  // the user submit a request that always 400s.
  const switchBlockedReason = isLegacySubscription
    ? 'Your current plan is a legacy plan and can no longer be changed. Cancel it to move to a current plan.'
    : subscription?.cancelAtPeriodEnd
      ? 'Your subscription is scheduled to cancel. Reactivate it before changing plan.'
      : pendingChangeLabel
        ? 'A plan change is already scheduled. Cancel it before choosing a different plan.'
        : isPastDue
          ? 'Your last payment failed. Plan changes are unavailable until billing is up to date.'
          : null;
  const canSwitchPlan = !isCanceled && switchBlockedReason === null;

  // If the subscription moves into a state the backend rejects changes in (another
  // tab schedules a downgrade, a renewal fails), collapse an open panel instead of
  // leaving a Confirm button that can only 400.
  useEffect(() => {
    if (!canSwitchPlan) setSwitchPlanOpen(false);
  }, [canSwitchPlan]);

  // Credit balance = recurring credits + permanent credits.
  const creditBalance = credits.recurringCreditBalance + credits.permanentCreditBalance;

  return (
    <div className="space-y-6">
      {/* ── Modals ── */}
      <AnimatePresence>
        {showSwitchConfirm && (
          <SwitchPlanConfirmModal
            onClose={() => setShowSwitchConfirm(false)}
            onConfirm={handleConfirmSwitch}
            isActing={isActing}
            fromPlanName={planName}
            toPlanName={titleCase(selectedPlan)}
            toPlanPrice={PLAN_OPTIONS.find(p => p.id === selectedPlan)?.price ?? '—'}
            changeType={getChangeType(planState, selectedPlan)}
            nextBillingDate={nextBillingDate}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{showCancelModal  && <CancelConfirmModal  onClose={() => setShowCancelModal(false)} onConfirm={handleCancelSubscription} isActing={isActing} accessEndsDate={nextBillingDate} />}</AnimatePresence>
      <AnimatePresence>{showBuyCredits   && <BuyCreditsModal  onClose={() => setShowBuyCredits(false)} onPurchase={handleBuyCredits} />}</AnimatePresence>
      <AnimatePresence>{showRedeemCode   && <RedeemCodeModal  onClose={() => setShowRedeemCode(false)} onRedeem={handleRedeem} />}</AnimatePresence>
      {toastMsg && <PaymentToast message={toastMsg} onDone={() => setToastMsg(null)} />}

      {/* Returned from Stripe Checkout — the webhook hasn't landed yet. Never
          say "failed" here: the event is most likely still in the queue. */}
      {checkoutPending && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary px-4 py-3">
          <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Confirming your payment…</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This usually takes a few seconds. If you closed the payment page without paying, nothing
              was charged.
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODULE 1 — Membership Benefits Banner
          ════════════════════════════════════════════════════ */}
      <MembershipBanner
        plan={planState}
        cancelAtPeriodEnd={bannerCancelAtPeriod}
        accessEndsDate={nextBillingDate}
        nextBillingDate={nextBillingDate}
        nextBillingAmount={nextBillingAmount}
        userName={user?.name?.split(' ')[0] || 'Alex'}
        onUpgrade={() => {
          // upgrade_clicked —— Settings 页「Upgrade to Member」CTA
          safeCapture(posthog, EVENTS.UPGRADE_CLICKED, {
            current_tier: planState,
            target_tier: null,
            source: 'settings',
          });
          navigate('/#pricing');
        }}
      />

      {/* ════════════════════════════════════════════════════
          MODULE 2 — Subscription Plan & History
          (only visible for paid members)
          ════════════════════════════════════════════════════ */}
      {isMember && (
        <div>
          <SectionLabel>Subscription</SectionLabel>
          <div className="bg-card border border-border rounded-xl overflow-hidden">

            {/* ── Current Plan Row ── */}
            <div className="px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {planName} plan · {nextBillingAmount}/mo · {cycleName}
                    </span>
                    <StatusBadge status={isCanceled ? 'Canceled' : isPastDue ? 'Past Due' : 'Active'} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isCanceled
                      ? 'Your subscription has been canceled.'
                      : isPastDue
                        ? "We couldn't process your last payment. Update your payment method to keep your access."
                        : cancelState === 'post_window'
                          ? `Cancellation scheduled · Access continues until ${nextBillingDate}`
                          : `Next billing: ${nextBillingDate} · ${nextBillingAmount}`}
                  </p>
                  {/* A retired plan can only be canceled — every tier and
                      billing-cycle change is rejected by the backend. */}
                  {isLegacySubscription && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This is a legacy plan. It can't be changed — cancel it to move to a current plan.
                    </p>
                  )}
                  {/* A scheduled downgrade (tier and/or cycle) only takes effect
                      at the end of the current period, and can be undone until
                      then.
                      Suppressed once a cancellation is scheduled: the downgrade
                      lands at the next renewal, and after a cancellation there
                      is no next renewal — so it can never apply. Showing both
                      "access ends on X" and "changing to Y on X" is a
                      contradiction, and the backend rejects
                      cancel-pending-downgrade while a cancel is pending anyway
                      (resume first). */}
                  {pendingChangeLabel && !isCanceled && !pendingCancelSupersedes && (
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        Changing to {pendingChangeLabel} on {nextBillingDate}
                      </p>
                      <button
                        onClick={handleCancelPendingDowngrade}
                        disabled={isActing}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2 transition-colors disabled:opacity-60"
                      >
                        {isActing && <Loader2 className="w-3 h-3 animate-spin" />}
                        Cancel change
                      </button>
                    </div>
                  )}
                </div>
                {!isCanceled && (
                  <button
                    onClick={() => setSwitchPlanOpen(v => !v)}
                    disabled={!canSwitchPlan}
                    title={switchBlockedReason ?? undefined}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors shrink-0 ml-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    Switch plan
                  </button>
                )}
              </div>

              {/* Switch Plan Panel */}
              <AnimatePresence>
                {switchPlanOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 bg-secondary rounded-lg overflow-hidden border border-border/60">
                      {planOptions.map(plan => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlan(plan.id)}
                          disabled={plan.disabled}
                          aria-pressed={selectedPlan === plan.id}
                          className={`w-full text-left flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${
                            plan.disabled
                              ? 'cursor-not-allowed opacity-60'
                              : selectedPlan === plan.id
                                ? 'cursor-pointer bg-primary/5'
                                : 'cursor-pointer hover:bg-muted'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground">{plan.name}</span>
                              {plan.badge && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${plan.badge.color === 'blue' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700'}`}>
                                  {plan.badge.text}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {plan.price} · {plan.desc}
                              {plan.disabled && ' · already scheduled'}
                            </p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPlan === plan.id ? 'border-primary bg-primary' : 'border-border bg-card'}`}>
                            {selectedPlan === plan.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </button>
                      ))}
                      <div className="bg-card border-t border-border">
                        {selectedPlan !== planState && (
                          <p className="px-4 pt-3 text-[11px] text-muted-foreground leading-relaxed">
                            {isSelectionScheduled
                              ? `${titleCase(selectedPlan)} is already scheduled for ${nextBillingDate} — use "Cancel change" above to undo it.`
                              : getChangeType(planState, selectedPlan) === 'upgrade'
                              ? 'Upgrades are charged to your card today, prorated for the rest of the period, and apply immediately.'
                              : `Downgrades take effect ${nextBillingDate ? `on ${nextBillingDate}` : 'at the end of your billing period'} — you keep your current access until then.`}
                          </p>
                        )}
                        <div className="flex gap-2 px-4 py-3">
                          <button
                            onClick={handleRequestSwitch}
                            disabled={isActing || selectedPlan === planState || isSelectionScheduled}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isActing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Confirm change
                          </button>
                          <button
                            onClick={() => setSwitchPlanOpen(false)}
                            className="px-4 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Cancellation Area ── */}
            <div className="px-5 py-4 border-t border-border">

              {/* State: active — tiny text link */}
              {cancelState === 'active' && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Need to make a change to your plan?</p>
                  <button
                    onClick={() => { trackCancelClicked(); setShowCancelModal(true); }}
                    className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors hover:underline underline-offset-2 ml-4"
                  >
                    Cancel subscription
                  </button>
                </div>
              )}

              {/* State: refund_window — red button + inline form */}
              {cancelState === 'refund_window' && (
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-destructive">Cancel subscription</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        You're within 3 days of your first subscription — you may be eligible for a
                        full refund.
                      </p>
                    </div>
                    <button
                      onClick={() => setCancelOpen(v => !v)}
                      className="px-3 py-1.5 rounded-lg border border-destructive/50 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors shrink-0 ml-4"
                    >
                      Cancel and refund
                    </button>
                  </div>
                  <AnimatePresence>
                    {cancelOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {cancelSubmitted ? (
                          <div className="mt-3 bg-secondary border border-border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-foreground shrink-0" />
                              <p className="text-xs font-medium text-foreground">
                                {cancelOutcome === 'processing'
                                  ? 'Cancellation submitted'
                                  : 'Subscription canceled'}
                              </p>
                            </div>
                            {/* Which path ran is only knowable after polling. */}
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {cancelOutcome === 'processing'
                                ? "We're still confirming this with our payment provider. Refresh in a moment to see the final status."
                                : cancelOutcome === 'refunded'
                                  ? `A full refund of ${nextBillingAmount} is on its way to your original payment method. Allow 5–10 business days for it to appear on your statement.`
                                  : `This subscription wasn't eligible for a refund, so your access continues until ${nextBillingDate} and won't renew.`}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-4">
                            <p className="text-xs font-medium text-red-600 mb-1">Cancel subscription</p>
                            <p className="text-xs text-red-500/80 mb-3">
                              This can't be undone.
                            </p>
                            <div className="flex items-start gap-2.5 bg-white/70 rounded-lg px-3 py-2.5 mb-3 border border-red-100">
                              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                If this subscription qualifies for the 3-day refund, you'll get{' '}
                                <span className="text-foreground font-medium">{nextBillingAmount}</span> back to your
                                original payment method (5–10 business days) and access ends right away. Otherwise
                                access continues until {nextBillingDate} and simply won't renew. We'll confirm which
                                applies once the cancellation goes through.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSubmitCancellation}
                                disabled={isActing}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-destructive text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                              >
                                {isActing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Confirm cancellation
                              </button>
                              <button
                                onClick={() => setCancelOpen(false)}
                                className="px-4 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50/80 transition-colors"
                              >
                                Keep subscription
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* State: post_window — cancellation is scheduled; resume undoes it.
                  This is the only state where /subscriptions/resume applies: once
                  the status is actually `canceled` the plan reads as Free and this
                  whole module is hidden. */}
              {cancelState === 'post_window' && (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Your access ends {nextBillingDate}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You can reactivate any time before then.
                      {/* Be explicit that resuming restores the queued downgrade —
                          it isn't discarded, just unreachable while canceled. */}
                      {pendingChangeLabel && ` Reactivating restores the scheduled change to ${pendingChangeLabel}.`}
                    </p>
                  </div>
                  <button
                    onClick={handleReactivate}
                    disabled={isActing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-xs font-medium text-primary hover:bg-primary/5 transition-colors shrink-0 ml-4 disabled:opacity-60"
                  >
                    {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Reactivate
                  </button>
                </div>
              )}

              {/* State: canceled — access end date + reactivate */}
              {cancelState === 'canceled' && (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Your access ends {nextBillingDate}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You can reactivate anytime before then.
                    </p>
                  </div>
                  <button
                    onClick={handleReactivate}
                    disabled={isActing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-xs font-medium text-primary hover:bg-primary/5 transition-colors shrink-0 ml-4 disabled:opacity-60"
                  >
                    {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Reactivate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODULE 3 — Credit Balance & Usage
          ════════════════════════════════════════════════════ */}
      <div>
        <SectionLabel>Credit balance</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Left — dark time balance card */}
          <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#172554' }}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-sans)' }}>Credit balance</span>
            </div>
            <div>
              <p className="leading-none font-semibold text-white" style={{ fontSize: 38, fontFamily: 'var(--font-sans)' }}>{creditBalance}</p>
              <p className="text-[11px] mt-2" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>Use credits for AI mock interviews, personalized practice, and coaching support.</p>
            </div>

            {/* Breakdown — how the balance is calculated: recurring + permanent = total */}
            <div className="flex flex-col gap-1.5 rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-sans)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Recurring credits</span>
                <span className="text-[11px] font-medium text-white">{credits.recurringCreditBalance}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Permanent credits</span>
                <span className="text-[11px] font-medium text-white">{credits.permanentCreditBalance}</span>
              </div>
              <div className="h-px my-0.5" style={{ background: 'rgba(255,255,255,0.12)' }} />
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Total balance</span>
                <span className="text-[11px] font-semibold text-white">{creditBalance}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-auto">
              <button
                onClick={() => {
                  // buy_credits_clicked —— 打开购买 credits 弹窗
                  safeCapture(posthog, EVENTS.BUY_CREDITS_CLICKED, {
                    current_tier: planState,
                    source: 'settings',
                  });
                  setShowBuyCredits(true);
                }}
                className="w-full py-2 rounded-lg bg-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                style={{ color: '#172554', fontFamily: 'var(--font-sans)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Buy extra credits
              </button>
              <button
                onClick={() => setShowRedeemCode(true)}
                className="w-full py-2 rounded-lg text-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                style={{ background: '#2563eb', fontFamily: 'var(--font-sans)' }}
              >
                <Gift className="w-3.5 h-3.5" />
                Redeem code
              </button>
            </div>
          </div>

          {/* Right — usage card (real data from GET /payments/credit-usage) */}
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-xs font-medium text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>This month's usage</p>
            {(() => {
              const used  = usedThisMonth;
              const total = used + creditBalance;
              const pct   = total > 0 ? Math.min(100, Math.max(0, Math.round((used / total) * 100))) : 0;
              return (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>AI interviews</span>
                      <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>{used} / {total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#3b82f6' }} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>You don't need to pay extra credits.</p>
                </div>
              );
            })()}
            <div className="text-[11px] text-muted-foreground mt-4 flex items-start gap-1 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              {(() => {
                const reset = subscription?.currentPeriodEnd ?? credits.resetDate;
                if (reset) {
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span>{credits.recurringCreditBalance} recurring credit{credits.recurringCreditBalance === 1 ? '' : 's'} reset {formatDate(reset)}.</span>
                      {credits.permanentCreditBalance > 0 && (
                        <span>{credits.permanentCreditBalance} permanent credit{credits.permanentCreditBalance === 1 ? '' : 's'} never expire.</span>
                      )}
                    </div>
                  );
                }
                return <span>No monthly reset — all {creditBalance} credit{creditBalance === 1 ? '' : 's'} are permanent.</span>;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MODULE 5 — Invoices
          ════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Invoices</SectionLabel>
          {user?.email && <p className="text-xs text-muted-foreground">Sent to {user.email}</p>}
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
                <Download className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No invoices yet</p>
              <p className="text-xs text-muted-foreground">Your invoices will appear here after your first billing cycle.</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-4 bg-secondary px-5 py-2.5 border-b border-border">
                {['Date', 'Amount', 'Status', 'Invoice'].map(h => (
                  <span key={h} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{h}</span>
                ))}
              </div>
              {/* Rows */}
              <div className="divide-y divide-border">
                {invoices.map((inv, i) => (
                  <div key={inv.stripeInvoiceId ?? i} className="grid grid-cols-4 items-center px-5 py-3.5 hover:bg-secondary/40 transition-colors">
                    <span className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</span>
                    <button
                      onClick={() => inv.invoiceUrl && window.open(inv.invoiceUrl, '_blank')}
                      className="text-xs font-medium text-primary hover:underline underline-offset-2 text-left"
                    >
                      {formatAmountCents(inv.amount, inv.currency)}
                    </button>
                    <span>
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
                        Paid
                      </span>
                    </span>
                    <button
                      onClick={() => inv.invoiceUrl && window.open(inv.invoiceUrl, '_blank')}
                      disabled={!inv.invoiceUrl}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:opacity-75 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
