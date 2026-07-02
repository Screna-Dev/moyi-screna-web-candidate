import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, CheckCircle2, Download, Info,
  Plus, X, Loader2, RotateCcw, ChevronDown, Gift,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentService } from '@/services';

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
// ─── Types ─────────────────────────────────────────────────────────────────────
type PlanState  = 'free' | 'starter' | 'premium';
type CancelState = 'active' | 'refund_window' | 'post_window' | 'canceled';

// ─── Benefit Data ──────────────────────────────────────────────────────────────
const STARTER_L = [
  'AI Interview Mocks (credits included)',
  '1:1 Mentorship sessions',
  'Resume review & feedback',
  'Application tracking dashboard',
];
const STARTER_R = [
  'Interview Insights Community',
  'Mock interview debrief',
  'Career goal planning',
  'Session booking portal',
];
const PREMIUM_L = [
  'Everything in Starter',
  'Dedicated 1:1 job search advisor',
  'Resume submission & recruiter outreach',
  'Auto-apply to matched roles',
  'Priority resume exposure',
];
const PREMIUM_R = [
  'Salary negotiation coaching',
  'Daily application updates',
  'Weekly members-only sessions',
  'Annual networking events (2/yr)',
  '48-hr early event registration',
];
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
}: {
  plan: PlanState;
  cancelAtPeriodEnd?: boolean;
  accessEndsDate?:    string;
  nextBillingDate?:   string;
  nextBillingAmount?: string;
  userName?:          string;
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
              className="px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity"
              style={{ background: '#fff', color: '#0f1f3d', fontSize: 14 }}
            >
              Upgrade to Member
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>From $99 / mo · Cancel anytime</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Starter / Premium paid member ── */
  const isStarter  = plan === 'starter';
  const col1       = isStarter ? STARTER_L : PREMIUM_L;
  const col2       = isStarter ? STARTER_R : PREMIUM_R;
  const planLabel  = isStarter ? 'Starter' : 'Premium';
  const gradient   = isStarter
    ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 55%, #60a5fa 100%)'
    : 'linear-gradient(135deg, #172554 0%, #1e3a8a 55%, #1d4ed8 100%)';
  const amount     = nextBillingAmount;

  return (
    null
  );
}

// ─── Cancel Confirm Modal ───────────────────────────────────────────────────────
function CancelConfirmModal({ onClose, accessEndsDate = 'Jul 24, 2026' }: { onClose: () => void; accessEndsDate?: string }) {
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
          Your access continues until {accessEndsDate}. This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Keep subscription
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Buy Credits Modal ──────────────────────────────────────────────────────────
const CREDIT_PICKS = [150, 300, 500, 1000] as const;

function BuyCreditsModal({ onClose, onPurchase }: { onClose: () => void; onPurchase?: (credits: number) => void | Promise<void> }) {
  const [credits, setCredits] = useState(300);
  const [purchasing, setPurchasing] = useState(false);
  const pricePerCredit = 0.10;
  const total = (credits * pricePerCredit).toFixed(2);

  const handleCheckout = async () => {
    if (!onPurchase) return;
    setPurchasing(true);
    try { await onPurchase(credits); } finally { setPurchasing(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.16 }}
        className="bg-card w-[420px] rounded-2xl p-6" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.14)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-medium text-foreground" style={{ fontSize: 17 }}>Buy extra credits</p>
            <p className="text-xs text-muted-foreground mt-0.5">Credits never expire</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Credit amount display */}
        <div className="bg-secondary rounded-xl p-5 text-center mb-4">
          <p className="font-semibold text-foreground leading-none" style={{ fontSize: 44 }}>{credits}</p>
          <p className="text-xs text-muted-foreground mt-1.5">credits</p>
        </div>

        {/* Quick picks */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {CREDIT_PICKS.map(v => (
            <button
              key={v}
              onClick={() => setCredits(v)}
              className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                credits === v
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-secondary'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="mb-1">
          <input
            type="range" min={150} max={1000} step={50} value={credits}
            onChange={e => setCredits(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">150</span>
            <span className="text-[10px] text-muted-foreground">1,000</span>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="bg-secondary rounded-lg px-4 py-3 mb-5 mt-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-foreground">{credits} credits</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              $0.10 per credit
            </p>
          </div>
          <p className="font-semibold text-foreground" style={{ fontSize: 20 }}>${total}</p>
        </div>

        <button
          onClick={handleCheckout}
          disabled={purchasing}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {purchasing && <Loader2 className="w-4 h-4 animate-spin" />}
          Continue to checkout
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2.5">
          Secure checkout · No subscription required
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Redeem Code Modal ──────────────────────────────────────────────────────────
type RedeemStatus = 'idle' | 'loading' | 'success' | 'error_expired' | 'error_used' | 'error_invalid';

function RedeemCodeModal({ onClose, onRedeem }: { onClose: () => void; onRedeem?: (code: string) => Promise<{ ok: boolean; message?: string }> }) {
  const [code,   setCode]   = useState('');
  const [status, setStatus] = useState<RedeemStatus>('idle');
  const [apiError, setApiError] = useState('');

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setStatus('loading');
    setApiError('');
    if (onRedeem) {
      const res = await onRedeem(code.trim());
      if (res.ok) { setStatus('success'); }
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
            <p className="font-medium text-foreground mb-1.5" style={{ fontSize: 17 }}>Code redeemed successfully!</p>
            <p className="text-sm text-muted-foreground mb-6">
              Your credits have been added to your balance.
            </p>
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
const PLANS = [
  { id: 'basic',    name: 'Basic',    price: '$7.99/mo',  desc: 'billed monthly', badge: null },
  { id: 'advanced', name: 'Advanced', price: '$29.99/mo', desc: 'billed monthly', badge: { text: 'Current', color: 'blue' as const } },
  { id: 'flagship', name: 'Flagship', price: '$79.99/mo', desc: 'billed monthly', badge: null },
] as const;

const SUBSCRIPTION_HISTORY = [
  { label: 'Advanced plan started',      date: 'Jan 24, 2026' },
  { label: 'Upgraded from Basic to Advanced', date: 'Jan 24, 2026' },
  { label: 'Basic plan started',         date: 'Dec 10, 2025' },
];

export function BillingTab() {
  // ── Real data sources ──
  const { user } = useAuth();

  // Subscription is mock — real logic coming.
  const isActing = false;
  const mockPlanName = 'Advanced';
  const mockCycleLabel = 'Monthly';
  const mockNextBillingDate = 'Jul 24, 2026';
  const mockNextBillingAmount = '$29.99';

  // ── Plan state (mock — driven only by the Demo State Toolbar) ──
  const [planState,   setPlanState]   = useState<PlanState>('premium');
  const [cancelState, setCancelState] = useState<CancelState>('active');

  // ── Subscription UI ──
  const [switchPlanOpen,  setSwitchPlanOpen]  = useState(false);
  const [selectedPlan,    setSelectedPlan]    = useState<'basic' | 'advanced' | 'flagship'>('advanced');
  const [historyOpen,     setHistoryOpen]     = useState(false);
  const [cancelOpen,      setCancelOpen]      = useState(false);
  const [cancelReason,    setCancelReason]    = useState('');
  const [cancelComment,   setCancelComment]   = useState('');
  const [cancelSubmitted, setCancelSubmitted] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ── Credits (real API) ──
  const [showBuyCredits,  setShowBuyCredits]  = useState(false);
  const [showRedeemCode,  setShowRedeemCode]  = useState(false);
  const [credits, setCredits] = useState<{
    recurringCreditBalance: number;
    permanentCreditBalance: number;
    totalBalance: number;
    monthlyAllowance: number;
    resetDate: string | null;
  }>({
    recurringCreditBalance: 0,
    permanentCreditBalance: 0,
    totalBalance: 0,
    monthlyAllowance: 0,
    resetDate: null,
  });

  const fetchCredits = async () => {
    try {
      const res = await PaymentService.getCredits();
      const data = res.data?.data ?? res.data ?? {};
      const recurring = data.recurringCreditBalance ?? 0;
      const permanent = data.permanentCreditBalance ?? 0;
      setCredits({
        recurringCreditBalance: recurring,
        permanentCreditBalance: permanent,
        totalBalance: data.totalBalance ?? (recurring + permanent),
        monthlyAllowance: data.monthlyAllowance ?? 0,
        resetDate: data.resetDate ?? null,
      });
    } catch {
      /* keep defaults on failure */
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // ── Invoices (real API) ──
  const [invoices, setInvoices]               = useState<Invoice[]>([]);
  const [invoicePage]                         = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await PaymentService.getInvoices(invoicePage);
        const content = res.data?.data?.content ?? res.data?.content ?? [];
        if (!cancelled) setInvoices(content);
      } catch {
        if (!cancelled) setInvoices([]);
      }
    })();
    return () => { cancelled = true; };
  }, [invoicePage]);

  const fireToast   = (msg: string) => { setToastMsg(null); requestAnimationFrame(() => setToastMsg(msg)); };

  // ── Real action handlers ──
  const handleBuyCredits = async (n: number) => {
    try {
      const res = await PaymentService.purchaseCustomPack(n);
      const url = res.data?.data?.url ?? res.data?.url;
      if (url) { window.location.href = url; return; }
      await fetchCredits();
    } catch {
      fireToast('Unable to start checkout. Please try again.');
    }
    setShowBuyCredits(false);
  };

  const handleRedeem = async (code: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res = await PaymentService.redeemCode(code);
      if (res.data?.status === 'success' || res.status === 200) {
        await fetchCredits();
        return { ok: true };
      }
      return { ok: false, message: res.data?.message };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        || (err as { message?: string })?.message;
      return { ok: false, message: msg || 'Failed to redeem code.' };
    }
  };

  // Switch-plan: mock — real logic coming.
  const handleConfirmSwitch = async () => {
    fireToast('Plan change saved');
    setSwitchPlanOpen(false);
  };

  // Cancellation: mock — real logic coming.
  const handleSubmitCancellation = async () => {
    setCancelSubmitted(true);
  };
  const handleReactivate = async () => {
    fireToast('Subscription reactivated');
  };

  const isMember       = planState !== 'free';
  const isCanceled     = cancelState === 'canceled';
  const bannerCancelAtPeriod = isCanceled || cancelState === 'post_window';

  return (
    <div className="space-y-6">
      {/* ── Modals ── */}
      <AnimatePresence>{showCancelModal  && <CancelConfirmModal  onClose={() => setShowCancelModal(false)} accessEndsDate={mockNextBillingDate} />}</AnimatePresence>
      <AnimatePresence>{showBuyCredits   && <BuyCreditsModal  onClose={() => setShowBuyCredits(false)} onPurchase={handleBuyCredits} />}</AnimatePresence>
      <AnimatePresence>{showRedeemCode   && <RedeemCodeModal  onClose={() => setShowRedeemCode(false)} onRedeem={handleRedeem} />}</AnimatePresence>
      {toastMsg && <PaymentToast message={toastMsg} onDone={() => setToastMsg(null)} />}

      {/* ════════════════════════════════════════════════════
          MODULE 1 — Membership Benefits Banner
          ════════════════════════════════════════════════════ */}
      <MembershipBanner
        plan={planState}
        cancelAtPeriodEnd={bannerCancelAtPeriod}
        accessEndsDate={mockNextBillingDate}
        nextBillingDate={mockNextBillingDate}
        nextBillingAmount={mockNextBillingAmount}
        userName={user?.name?.split(' ')[0] || 'Alex'}
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
                      {mockPlanName} plan · {mockNextBillingAmount}/mo · {mockCycleLabel}
                    </span>
                    <StatusBadge status={isCanceled ? 'Canceled' : 'Active'} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isCanceled
                      ? 'Your subscription has been canceled.'
                      : cancelState === 'post_window'
                        ? `Cancellation scheduled · Access continues until ${mockNextBillingDate}`
                        : `Next billing: ${mockNextBillingDate} · ${mockNextBillingAmount}`}
                  </p>
                </div>
                {!isCanceled && (
                  <button
                    onClick={() => setSwitchPlanOpen(v => !v)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors shrink-0 ml-4"
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
                      {PLANS.map(plan => (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b border-border/50 last:border-0 transition-colors ${selectedPlan === plan.id ? 'bg-primary/5' : 'hover:bg-muted'}`}
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
                            <p className="text-[11px] text-muted-foreground mt-0.5">{plan.price} · {plan.desc}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPlan === plan.id ? 'border-primary bg-primary' : 'border-border bg-card'}`}>
                            {selectedPlan === plan.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 px-4 py-3 bg-card border-t border-border">
                        <button
                          onClick={handleConfirmSwitch}
                          disabled={isActing}
                          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Subscription History ── */}
            <div className="px-5 py-3.5 border-t border-border">
              <button
                onClick={() => setHistoryOpen(v => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors"
              >
                Subscription history
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {historyOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-0 relative">
                      {/* Timeline line */}
                      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
                      {SUBSCRIPTION_HISTORY.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 pb-3 last:pb-0 relative pl-5">
                          <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-100 border-2 border-primary shrink-0" />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-xs text-foreground">{item.label}</span>
                            <span className="text-xs text-muted-foreground shrink-0 ml-4">{item.date}</span>
                          </div>
                        </div>
                      ))}
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
                    onClick={() => setCancelState('refund_window')}
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
                        You're within the 3-day refund window — you're eligible for a full refund.
                      </p>
                    </div>
                    <button
                      onClick={() => setCancelOpen(v => !v)}
                      className="px-3 py-1.5 rounded-lg border border-destructive/50 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors shrink-0 ml-4"
                    >
                      Request cancellation
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
                              <p className="text-xs font-medium text-foreground">Cancellation request submitted</p>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Our team will review within 24 hours. You'll receive email confirmation with refund details to your payment method.
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-4">
                            <p className="text-xs font-medium text-red-600 mb-1">Tell us why you're leaving</p>
                            <p className="text-xs text-red-500/80 mb-3">
                              Our team will review and process your request within 24 hours.
                            </p>
                            <select
                              value={cancelReason}
                              onChange={e => setCancelReason(e.target.value)}
                              className="w-full h-8 rounded-lg border border-red-200 bg-white px-2.5 text-xs text-foreground mb-2.5 focus:outline-none focus:ring-1 focus:ring-red-300"
                            >
                              <option value="">Select a reason…</option>
                              <option>Found a job</option>
                              <option>Too expensive</option>
                              <option>Not using it enough</option>
                              <option>Missing features I need</option>
                              <option>Other</option>
                            </select>
                            <textarea
                              value={cancelComment}
                              onChange={e => setCancelComment(e.target.value)}
                              placeholder="Any additional comments (optional)"
                              rows={3}
                              className="w-full rounded-lg border border-red-200 bg-white px-2.5 py-2 text-xs text-foreground mb-3 resize-none focus:outline-none focus:ring-1 focus:ring-red-300 placeholder:text-muted-foreground"
                            />
                            <div className="flex items-start gap-2.5 bg-white/70 rounded-lg px-3 py-2.5 mb-3 border border-red-100">
                              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Refund of <span className="text-foreground font-medium">{mockNextBillingAmount}</span> will be returned to your payment method within 5–10 business days upon approval.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSubmitCancellation}
                                disabled={isActing}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-destructive text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                              >
                                {isActing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Submit request
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

              {/* State: post_window — text link only */}
              {cancelState === 'post_window' && (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      The 3-day refund window has passed. Access continues until {mockNextBillingDate}.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="text-xs text-destructive/60 hover:text-destructive transition-colors hover:underline underline-offset-2 shrink-0 ml-4"
                  >
                    Cancel subscription
                  </button>
                </div>
              )}

              {/* State: canceled — access end date + reactivate */}
              {cancelState === 'canceled' && (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Your access ends {mockNextBillingDate}</p>
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
        <div className="grid grid-cols-2 gap-3">

          {/* Left — dark time balance card */}
          <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#172554' }}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-sans)' }}>Credit balance</span>
            </div>
            <div>
              <p className="leading-none font-semibold text-white" style={{ fontSize: 38, fontFamily: 'var(--font-sans)' }}>{credits.totalBalance}</p>
              <p className="text-[11px] mt-2" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>Use credits for AI mock interviews, personalized practice, and coaching support.</p>
            </div>
            <div className="flex flex-col gap-2 mt-auto">
              <button
                onClick={() => setShowBuyCredits(true)}
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

          {/* Right — usage card */}
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-xs font-medium text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>This month's usage</p>
            {planState === 'premium' || planState === 'starter' ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>AI interviews</span>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>{Math.max(0, (credits.monthlyAllowance || (planState === 'premium' ? 500 : 150)) - credits.recurringCreditBalance)} / {credits.monthlyAllowance || (planState === 'premium' ? 500 : 150)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(() => { const allow = credits.monthlyAllowance || (planState === 'premium' ? 500 : 150); return Math.min(100, Math.max(0, Math.round(((allow - credits.recurringCreditBalance) / allow) * 100))); })()}%`, background: '#3b82f6' }} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>You don't need to pay extra credits.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'AI interviews', used: 12, total: credits.totalBalance || 120, color: '#3b82f6' },
                ].map(row => {
                  const pct = Math.round((row.used / row.total) * 100);
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>{row.label}</span>
                        <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>{row.used} / {row.total} min</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: row.color }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>You don't need to pay extra credits.</p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1" style={{ fontFamily: 'var(--font-sans)' }}>
              <Info className="w-3 h-3 shrink-0" />
              Monthly limits reset {formatDate(credits.resetDate)}
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MODULE 5 — Invoices
          ════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Invoices</SectionLabel>
          <p className="text-xs text-muted-foreground">Sent to {user?.email || 'alex@example.com'}</p>
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
