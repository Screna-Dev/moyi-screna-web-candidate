import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Check,
  CheckCircle2,
  Download,
  Plus,
  X,
  Loader2,
  RotateCcw,
  ChevronDown,
  Gift,
  Info,
} from 'lucide-react';
import { SettingsPage } from './settings';
import { useToast } from '../../components/newDesign/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentService } from '@/services';
import {
  useSubscription,
  type Tier,
  type BillingCycle,
  type SubscriptionData,
} from '@/hooks/useSubscription';

// ─── Types ─────────────────────────────────────────────────────────────────────
type CancelState = 'active' | 'refund_window' | 'post_window' | 'canceled';

// ─── Pricing tables (Starter + Premium across 3 cycles) ────────────────────────
const PRICING: Record<Tier, Record<BillingCycle, { perMonth: string; periodTotal: string; cycleDesc: string; save?: string }>> = {
  starter: {
    monthly:   { perMonth: '$29.9/mo', periodTotal: '$29.9',  cycleDesc: 'billed monthly' },
    quarterly: { perMonth: '$29.9/mo', periodTotal: '$89.7',  cycleDesc: '$89.7 every 3 months' },
    annual:    { perMonth: '$29.9/mo', periodTotal: '$358.8', cycleDesc: '$358.8/year' },
  },
  premium: {
    monthly:   { perMonth: '$219/mo', periodTotal: '$219',   cycleDesc: 'billed monthly' },
    quarterly: { perMonth: '$199/mo', periodTotal: '$597',   cycleDesc: '$597 every 3 months', save: 'Save 9%' },
    annual:    { perMonth: '$179/mo', periodTotal: '$2,148', cycleDesc: '$2,148/year',         save: 'Save 18%' },
  },
};

const REFUND_WINDOW_DAYS = 3;

const CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'annual'];
const TIERS: Tier[] = ['starter', 'premium'];

// Benefit lists per tier (rendered in banner)
const STARTER_BENEFITS_L = [
  'AI Mock Interview (150 credits/mo)',
  'Personal Question Bank',
  'Personalized job recommendations',
  'Mentorship Marketplace',
];
const STARTER_BENEFITS_R = [
  'Mock interview, resume review',
  'Mentor reviews & ratings',
  'Interview Insights — full access',
  'Credits never expire',
];
const PREMIUM_BENEFITS_L = [
  'Everything in Starter',
  'AI Mock Interview (500 credits/mo)',
  'Dedicated 1:1 job search advisor',
  'We apply for you (500/month)',
  'Recruiter outreach & referrals',
];
const PREMIUM_BENEFITS_R = [
  'Daily application progress updates',
  'Application tracking dashboard',
  'Weekly members-only live sessions',
  'Annual networking events (2/yr)',
  '48-hour early event registration',
];
const FREE_BENEFITS_L = [
  'AI Mock Interview (credits required)',
  'Mentor Marketplace',
  'Resume review',
  'Limited Interview Insights',
];
const FREE_BENEFITS_R = [
  'Dedicated job search advisor',
  'Auto-apply to roles',
  'Recruiter outreach',
  'Weekly live sessions',
];

// ─── Formatting helpers ────────────────────────────────────────────────────────
const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatAmountCents = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

const daysBetween = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
};

const cycleLabel = (c: BillingCycle) => c.charAt(0).toUpperCase() + c.slice(1);
const tierLabel = (t: Tier) => t.charAt(0).toUpperCase() + t.slice(1);

// ─── Tiny shared primitives ────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">{children}</p>
  );
}

function StatusBadge({ status }: { status: 'Active' | 'Past Due' | 'Canceled' | 'Incomplete' | 'Unpaid' }) {
  const map = {
    Active:     'bg-green-100 text-green-700',
    'Past Due': 'bg-amber-100 text-amber-700',
    Incomplete: 'bg-amber-100 text-amber-700',
    Unpaid:     'bg-red-100 text-red-700',
    Canceled:   'bg-secondary text-muted-foreground',
  } as const;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${map[status]}`}>{status}</span>
  );
}

const STATUS_LABEL: Record<string, 'Active' | 'Past Due' | 'Canceled' | 'Incomplete' | 'Unpaid'> = {
  active:     'Active',
  past_due:   'Past Due',
  incomplete: 'Incomplete',
  unpaid:     'Unpaid',
  canceled:   'Canceled',
};

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

// ─── Membership Banner ─────────────────────────────────────────────────────────
function MembershipBanner({
  tier,
  cancelAtPeriodEnd,
  accessEndsDate,
  nextBillingDate,
  nextBillingAmount,
  userName,
  onUpgrade,
}: {
  tier: Tier | 'free';
  cancelAtPeriodEnd: boolean;
  accessEndsDate: string;
  nextBillingDate: string;
  nextBillingAmount: string;
  userName: string;
  onUpgrade: () => void;
}) {
  if (tier === 'free') {
    return (
      <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: '#0F172A' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 80% 15%, rgba(59,130,246,0.16) 0%, transparent 55%), radial-gradient(ellipse at 15% 80%, rgba(59,130,246,0.09) 0%, transparent 55%)',
          }}
        />
        <div className="relative">
          <p className="text-white" style={{ fontSize: 20, fontWeight: 500, marginBottom: 6, lineHeight: 1.3 }}>
            Unlock everything Screna has to offer
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)', marginBottom: 20, lineHeight: 1.55 }}>
            Join as a member to access mentorship, auto-apply, personalized coaching, and more.
          </p>
          <div className="grid grid-cols-2 mb-5" style={{ gap: '8px 32px' }}>
            <div className="flex flex-col gap-2.5">{FREE_BENEFITS_L.map(f => <BenefitItem key={f} label={f} dark />)}</div>
            <div className="flex flex-col gap-2.5">{FREE_BENEFITS_R.map(f => <BenefitItem key={f} label={f} dark />)}</div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onUpgrade}
              className="px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity"
              style={{ background: '#fff', color: '#0F172A', fontSize: 14 }}
            >
              Upgrade to Member
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>From $29.9 / mo · Cancel anytime</span>
          </div>
        </div>
      </div>
    );
  }

  const isStarter = tier === 'starter';
  const col1 = isStarter ? STARTER_BENEFITS_L : PREMIUM_BENEFITS_L;
  const col2 = isStarter ? STARTER_BENEFITS_R : PREMIUM_BENEFITS_R;
  const planLabelText = isStarter ? 'Starter' : 'Premium';
  const gradient = isStarter
    ? 'linear-gradient(135deg, #2563EB 0%, #3B82F6 55%, #60A5FA 100%)'
    : 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #1D4ED8 100%)';

  return (
    <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: gradient }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 85% 10%, rgba(255,255,255,0.10) 0%, transparent 50%)' }}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <p style={{ fontSize: 20, fontWeight: 500, color: '#fff', lineHeight: 1.3 }}>
            Thanks for being a {planLabelText} member, {userName}
          </p>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ml-4"
            style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}
          >
            {planLabelText}
          </span>
        </div>
        <div className="grid grid-cols-2 mb-5" style={{ gap: '8px 32px' }}>
          <div className="flex flex-col gap-2.5">{col1.map(f => <BenefitItem key={f} label={f} />)}</div>
          <div className="flex flex-col gap-2.5">{col2.map(f => <BenefitItem key={f} label={f} />)}</div>
        </div>
        <div className="flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 12 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)' }}>
            {cancelAtPeriodEnd
              ? `Access ends ${accessEndsDate}`
              : `Next billing: ${nextBillingDate} · ${nextBillingAmount}`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Cancel Modal (post-window: simple confirm) ────────────────────────
function CancelConfirmModal({
  accessEndsDate,
  onClose,
  onConfirm,
  loading,
}: {
  accessEndsDate: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (!loading && e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.16 }}
        className="bg-card w-[400px] rounded-xl shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-foreground mb-2" style={{ fontSize: 16 }}>Cancel subscription?</h3>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          Your access continues until {accessEndsDate}. No refund applies. This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Keep subscription
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? 'Cancelling…' : 'Cancel subscription'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Buy Credits Modal ─────────────────────────────────────────────────────────
const CREDIT_PICKS = [150, 300, 500, 1000] as const;

function BuyCreditsModal({
  onClose,
  onPurchase,
  isPurchasing,
}: {
  onClose: () => void;
  onPurchase: (credits: number) => Promise<void>;
  isPurchasing: boolean;
}) {
  const [credits, setCredits] = useState(300);
  const pricePerCredit = credits >= 500 ? 0.12 : credits >= 300 ? 0.135 : 0.1499;
  const total = (credits * pricePerCredit).toFixed(2);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (!isPurchasing && e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.16 }}
        className="bg-card w-[420px] rounded-2xl p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-medium text-foreground" style={{ fontSize: 17 }}>Buy extra credits</p>
            <p className="text-xs text-muted-foreground mt-0.5">Credits never expire</p>
          </div>
          <button onClick={onClose} disabled={isPurchasing} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors disabled:opacity-50">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="bg-secondary rounded-xl p-5 text-center mb-4">
          <p className="font-semibold text-foreground leading-none" style={{ fontSize: 44 }}>{credits}</p>
          <p className="text-xs text-muted-foreground mt-1.5">credits</p>
        </div>

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

        <div className="bg-secondary rounded-lg px-4 py-3 mb-5 mt-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-foreground">{credits} credits</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              ${pricePerCredit.toFixed(4)} per credit{credits >= 300 ? ' · volume discount applied' : ''}
            </p>
          </div>
          <p className="font-semibold text-foreground" style={{ fontSize: 20 }}>${total}</p>
        </div>

        <button
          onClick={() => onPurchase(credits)}
          disabled={isPurchasing}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isPurchasing ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : 'Continue to checkout'}
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2.5">
          Secure checkout · No subscription required
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Redeem Code Modal ─────────────────────────────────────────────────────────
function RedeemCodeModal({
  onClose,
  onRedeem,
}: {
  onClose: () => void;
  onRedeem: (code: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    const res = await onRedeem(code.trim());
    if (res.ok) {
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMsg(res.message || 'Invalid code. Please check and try again.');
    }
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
        className="bg-card w-[380px] rounded-2xl p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {status === 'success' ? (
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <p className="font-medium text-foreground mb-1.5" style={{ fontSize: 17 }}>Code applied!</p>
            <p className="text-sm text-muted-foreground mb-6">Credits have been added to your balance.</p>
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
                onChange={e => { setCode(e.target.value.toUpperCase()); setStatus('idle'); setErrorMsg(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleRedeem(); }}
                placeholder="e.g. SCRENA50"
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-background border focus:outline-none focus:ring-2 focus:ring-primary/30 tracking-widest font-mono"
                style={{ borderColor: errorMsg ? 'var(--destructive)' : 'var(--border)' }}
              />
              {errorMsg && <p className="text-xs mt-1.5 text-destructive">{errorMsg}</p>}
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

// ─── Add / Change Card Modal (mock — local only) ───────────────────────────────
function AddCardModal({
  title,
  onClose,
  onSave,
}: {
  title: string;
  onClose: () => void;
  onSave: (last4: string, expiry: string, brand: string) => void;
}) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const brand = cardNumber.startsWith('4')
    ? 'Visa'
    : (cardNumber.startsWith('5') || cardNumber.startsWith('2'))
      ? 'Mastercard'
      : '';
  const fmt4 = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const fmtEx = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 3) return d.slice(0, 2) + ' / ' + d.slice(2);
    if (d.length === 2) return d + ' / ';
    return d;
  };

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (cardNumber.replace(/\s/g, '').length < 16) e.cardNumber = 'Invalid card number';
    const rawExp = expiry.replace(/[\s/]/g, '');
    if (rawExp.length < 4) e.expiry = 'Invalid expiry date';
    if (cvc.length < 3) e.cvc = 'Required';
    if (!name.trim()) e.name = 'Required';
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    setTimeout(() => {
      const last4 = cardNumber.replace(/\s/g, '').slice(-4);
      onSave(last4, rawExp.slice(0, 2) + '/' + rawExp.slice(2), brand || 'Card');
    }, 700);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (!saving && e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.16 }}
        className="bg-card w-[440px] rounded-2xl p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <p className="font-medium text-foreground" style={{ fontSize: 18 }}>{title}</p>
          <button onClick={onClose} disabled={saving} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors disabled:opacity-40">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block mb-1.5 font-medium text-foreground" style={{ fontSize: 13 }}>Card number</label>
          <div className="relative">
            <input
              type="text" inputMode="numeric" placeholder="•••• •••• •••• ____"
              value={cardNumber} disabled={saving}
              onChange={e => { setCardNumber(fmt4(e.target.value)); setErrors(er => ({ ...er, cardNumber: '' })); }}
              className="w-full rounded-lg px-3.5 py-3 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ border: `1px solid ${errors.cardNumber ? 'var(--destructive)' : 'var(--border)'}` }}
            />
            {brand && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-1.5 py-0.5 rounded"
                style={{ background: brand === 'Visa' ? '#1A1F71' : '#EB001B', color: '#fff' }}
              >
                {brand}
              </span>
            )}
          </div>
          {errors.cardNumber && <p className="text-xs text-destructive mt-1">{errors.cardNumber}</p>}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block mb-1.5 font-medium text-foreground" style={{ fontSize: 13 }}>Expiry date</label>
            <input
              type="text" inputMode="numeric" placeholder="MM / YY"
              value={expiry} disabled={saving}
              onChange={e => { setExpiry(fmtEx(e.target.value)); setErrors(er => ({ ...er, expiry: '' })); }}
              className="w-full rounded-lg px-3.5 py-3 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ border: `1px solid ${errors.expiry ? 'var(--destructive)' : 'var(--border)'}` }}
            />
            {errors.expiry && <p className="text-xs text-destructive mt-1">{errors.expiry}</p>}
          </div>
          <div className="flex-1">
            <label className="block mb-1.5 font-medium text-foreground" style={{ fontSize: 13 }}>CVC</label>
            <input
              type="text" inputMode="numeric" placeholder="•••"
              value={cvc} disabled={saving}
              onChange={e => { setCvc(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors(er => ({ ...er, cvc: '' })); }}
              className="w-full rounded-lg px-3.5 py-3 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ border: `1px solid ${errors.cvc ? 'var(--destructive)' : 'var(--border)'}` }}
            />
            {errors.cvc && <p className="text-xs text-destructive mt-1">{errors.cvc}</p>}
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-1.5 font-medium text-foreground" style={{ fontSize: 13 }}>Name on card</label>
          <input
            type="text" placeholder="Full name"
            value={name} disabled={saving}
            onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: '' })); }}
            className="w-full rounded-lg px-3.5 py-3 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{ border: `1px solid ${errors.name ? 'var(--destructive)' : 'var(--border)'}` }}
          />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose} disabled={saving}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-80"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save card'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Plan switch helpers ───────────────────────────────────────────────────────
function comparePlanChange(
  currentTier: Tier,
  currentCycle: BillingCycle,
  targetTier: Tier,
  targetCycle: BillingCycle,
): { tierChanged: boolean; cycleChanged: boolean } {
  return {
    tierChanged: currentTier !== targetTier,
    cycleChanged: currentCycle !== targetCycle,
  };
}

// Compute cancel state — refund window measured from currentPeriodStart.
function computeCancelState(sub: SubscriptionData | null): CancelState {
  if (!sub) return 'active';
  if (sub.status === 'canceled') return 'canceled';
  if (sub.cancelAtPeriodEnd) return 'post_window';
  if (sub.currentPeriodStart && daysBetween(sub.currentPeriodStart) < REFUND_WINDOW_DAYS) {
    return 'refund_window';
  }
  return 'active';
}

// ─── Page ──────────────────────────────────────────────────────────────────────
interface Invoice {
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  description: string;
  reason: string;
  invoiceNumber: string;
  invoiceUrl: string;
  createdAt: string;
}

// BillingPage — the standalone route /billing. Renders Settings with the
// billing tab pre-selected so users see the full sidebar layout.
export function BillingPage() {
  return <SettingsPage defaultTab="billing" />;
}

// BillingTab — the content-only component, embedded inside SettingsPage.
export function BillingTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    subscription,
    credits,
    isLoading: isSubLoading,
    isActing,
    refresh,
    changeTier,
    changeBillingCycle,
    cancelPendingDowngrade,
    cancel,
    resume,
  } = useSubscription();

  // ── Derived plan state ──
  const tier: Tier | 'free' = subscription?.plan ?? 'free';
  const currentCycle: BillingCycle = subscription?.billingCycle ?? 'monthly';
  const isMember = subscription !== null && subscription.status !== 'canceled';
  const cancelState: CancelState = useMemo(() => computeCancelState(subscription), [subscription]);
  const userName = user?.name?.split(' ')[0] || 'there';

  // Pending downgrade details
  const pendingTier = subscription?.downgradePendingTier && subscription.downgradePendingTier !== subscription.plan
    ? subscription.downgradePendingTier
    : null;
  const pendingCycle = subscription?.downgradePendingCycle && subscription.downgradePendingCycle !== subscription.billingCycle
    ? subscription.downgradePendingCycle
    : null;
  const hasPendingChange = pendingTier !== null || pendingCycle !== null;
  const navigate = useNavigate();

  // ── UI state ──
  const [switchPlanOpen, setSwitchPlanOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier>(tier === 'free' ? 'starter' : tier);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(currentCycle);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Cancel form (refund_window)
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelComment, setCancelComment] = useState('');
  const [cancelSubmitted, setCancelSubmitted] = useState(false);

  // Post-window cancel confirm modal
  const [postCancelModalOpen, setPostCancelModalOpen] = useState(false);

  // Modals
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showRedeemCode, setShowRedeemCode] = useState(false);

  // Payment method (mock — local only)
  const [cardData, setCardData] = useState<{ last4: string; expiry: string; brand: string } | null>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [addCardTitle, setAddCardTitle] = useState('Add payment method');

  // Buy-credits loading
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Keep selected tier/cycle in sync when subscription loads
  useEffect(() => {
    if (subscription) {
      setSelectedTier(subscription.plan);
      setSelectedCycle(subscription.billingCycle);
    }
  }, [subscription]);

  // Reset the refund-window cancellation form whenever the subscription is
  // not in a "cancel pending" state. Without this, after Submit → Reactivate
  // the stale "Cancellation request submitted" notice would linger.
  // Also close the switch-plan panel when entering a cancel-pending state
  // (the backend rejects tier/cycle changes until the user reactivates).
  useEffect(() => {
    if (!subscription?.cancelAtPeriodEnd) {
      setCancelSubmitted(false);
      setCancelOpen(false);
      setCancelReason('');
      setCancelComment('');
    } else {
      setSwitchPlanOpen(false);
    }
  }, [subscription?.cancelAtPeriodEnd]);

  // ── Invoices ──
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePage, setInvoicePage] = useState(0);
  const [invoicePageMeta, setInvoicePageMeta] = useState<{ totalPages: number; first: boolean; last: boolean; totalElements: number; pageNumber: number } | null>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoadingInvoices(true);
      try {
        const res = await PaymentService.getInvoices(invoicePage);
        if (res.data?.data) {
          setInvoices(res.data.data.content || []);
          setInvoicePageMeta(res.data.data.pageMeta || null);
        }
      } catch {
        setInvoices([]);
      } finally {
        setIsLoadingInvoices(false);
      }
    };
    fetchInvoices();
  }, [invoicePage]);

  // ── Handlers ──
  const handleConfirmSwitch = async () => {
    if (!subscription) return;
    const { tierChanged, cycleChanged } = comparePlanChange(
      subscription.plan,
      subscription.billingCycle,
      selectedTier,
      selectedCycle,
    );
    if (!tierChanged && !cycleChanged) {
      setSwitchPlanOpen(false);
      return;
    }
    if (tierChanged && cycleChanged) {
      toast({
        title: 'One change at a time',
        description: 'Please change either the plan tier or the billing cycle — not both at once.',
        variant: 'destructive',
      });
      return;
    }
    const ok = tierChanged
      ? await changeTier(selectedTier)
      : await changeBillingCycle(selectedCycle);
    if (ok) {
      const isUpgrade = tierChanged
        ? selectedTier === 'premium'
        : (CYCLES.indexOf(selectedCycle) > CYCLES.indexOf(subscription.billingCycle));
      toast({
        title: isUpgrade ? 'Plan updated' : 'Change scheduled',
        description: isUpgrade
          ? 'Your new plan is active. New benefits unlocked.'
          : `Your change takes effect on ${formatDate(subscription.currentPeriodEnd)}.`,
      });
      setSwitchPlanOpen(false);
    }
  };

  const handleCancelPending = async () => {
    const ok = await cancelPendingDowngrade();
    if (ok) {
      toast({ title: 'Pending change cancelled', description: 'Your subscription will continue as before.' });
    }
  };

  const handleSubmitCancellation = async () => {
    // refund_window path — backend may need cancelReason/cancelComment passed to support
    const ok = await cancel();
    if (ok) {
      setCancelSubmitted(true);
    }
  };

  const handlePostCancel = async () => {
    const ok = await cancel();
    if (ok) {
      toast({
        title: 'Cancellation scheduled',
        description: `Access continues until ${formatDate(subscription?.currentPeriodEnd)}.`,
      });
      setPostCancelModalOpen(false);
    }
  };

  const handleResume = async () => {
    const ok = await resume();
    if (ok) {
      toast({ title: 'Subscription resumed' });
    }
  };

  const handleBuyCredits = async (n: number) => {
    setIsPurchasing(true);
    try {
      const res = await PaymentService.purchaseCustomPack(n);
      const url = res.data?.data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        title: 'Purchase failed',
        description: msg || 'Unable to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPurchasing(false);
      setShowBuyCredits(false);
    }
  };

  const handleRedeem = async (code: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res = await PaymentService.redeemCode(code);
      if (res.data?.status === 'success' || res.status === 200) {
        await refresh();
        return { ok: true };
      }
      return { ok: false, message: res.data?.message };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        || (err as { message?: string })?.message;
      return { ok: false, message: msg || 'Failed to redeem code.' };
    }
  };

  const handleSaveCard = (last4: string, expiry: string, brand: string) => {
    setCardData({ last4, expiry, brand });
    setShowAddCardModal(false);
    toast({ title: addCardTitle === 'Change payment method' ? 'Payment method updated' : 'Payment method added' });
  };

  // Reactivate from a truly-CANCELED row — backend creates a new subscription
  // via POST /subscriptions/tier. Send the user to /pricing so they can pick
  // tier + cycle fresh (cleaner UX than reusing stale values).
  const handleResubscribe = () => {
    navigate('/pricing');
  };

  // ── Render ──
  if (isSubLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const bannerCancelAtPeriod = cancelState === 'post_window' || cancelState === 'canceled';
  const planPricing = subscription ? PRICING[subscription.plan][subscription.billingCycle] : null;
  const nextBillingAmount = planPricing ? planPricing.periodTotal : '—';

  return (
    <div className="space-y-6">
        {/* ── Modals ── */}
        <AnimatePresence>
          {postCancelModalOpen && (
            <CancelConfirmModal
              accessEndsDate={formatDate(subscription?.currentPeriodEnd)}
              onClose={() => setPostCancelModalOpen(false)}
              onConfirm={handlePostCancel}
              loading={isActing}
            />
          )}
          {showAddCardModal && (
            <AddCardModal
              title={addCardTitle}
              onClose={() => setShowAddCardModal(false)}
              onSave={handleSaveCard}
            />
          )}
          {showBuyCredits && (
            <BuyCreditsModal
              onClose={() => setShowBuyCredits(false)}
              onPurchase={handleBuyCredits}
              isPurchasing={isPurchasing}
            />
          )}
          {showRedeemCode && (
            <RedeemCodeModal
              onClose={() => setShowRedeemCode(false)}
              onRedeem={handleRedeem}
            />
          )}
        </AnimatePresence>

        {/* MODULE 1 — Banner */}
        <MembershipBanner
          tier={tier}
          cancelAtPeriodEnd={bannerCancelAtPeriod}
          accessEndsDate={formatDate(subscription?.currentPeriodEnd)}
          nextBillingDate={formatDate(subscription?.currentPeriodEnd)}
          nextBillingAmount={nextBillingAmount}
          userName={userName}
          onUpgrade={() => { window.location.href = '/pricing'; }}
        />

        {/* MODULE 2 — Subscription Plan & History */}
        {isMember && subscription && (
          <div>
            <SectionLabel>Subscription</SectionLabel>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Current plan row */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {tierLabel(subscription.plan)} plan · {PRICING[subscription.plan][subscription.billingCycle].perMonth} · {cycleLabel(subscription.billingCycle)}
                      </span>
                      <StatusBadge status={STATUS_LABEL[subscription.status] ?? 'Active'} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cancelState === 'canceled'
                        ? 'Your subscription has been canceled.'
                        : cancelState === 'post_window'
                          ? `Cancellation scheduled · Access continues until ${formatDate(subscription.currentPeriodEnd)}`
                          : `Next billing: ${formatDate(subscription.currentPeriodEnd)} · ${nextBillingAmount}`}
                    </p>
                    {hasPendingChange && (
                      <p className="text-xs text-primary mt-1">
                        Scheduled change to{' '}
                        {pendingTier && <strong>{tierLabel(pendingTier)}</strong>}
                        {pendingTier && pendingCycle && ' · '}
                        {pendingCycle && <strong>{cycleLabel(pendingCycle)}</strong>}
                        {' '}on {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    )}
                  </div>
                  {cancelState !== 'canceled' && (
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {hasPendingChange && (
                        <button
                          onClick={handleCancelPending}
                          disabled={isActing}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                          {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cancel scheduled change'}
                        </button>
                      )}
                      {/* Switch plan is rejected by the backend while the
                          subscription is scheduled to cancel — disable it
                          here so the user reactivates first. */}
                      <button
                        onClick={() => {
                          if (subscription.cancelAtPeriodEnd) return;
                          setSwitchPlanOpen(v => !v);
                        }}
                        disabled={subscription.cancelAtPeriodEnd}
                        title={
                          subscription.cancelAtPeriodEnd
                            ? 'Reactivate your subscription before switching plans.'
                            : undefined
                        }
                        className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        Switch plan
                      </button>
                    </div>
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
                        {/* Tier picker */}
                        <div className="px-4 py-3 border-b border-border/50">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Plan tier</p>
                          <div className="flex gap-2">
                            {TIERS.map(t => (
                              <button
                                key={t}
                                onClick={() => setSelectedTier(t)}
                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                  selectedTier === t
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {tierLabel(t)}
                                {t === subscription.plan && (
                                  <span className="ml-1.5 text-[10px] opacity-70">(current)</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Billing cycle picker */}
                        <div className="px-4 py-3">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Billing cycle</p>
                          {CYCLES.map(c => {
                            const p = PRICING[selectedTier][c];
                            const isCurrent = c === subscription.billingCycle && selectedTier === subscription.plan;
                            const selected = selectedCycle === c;
                            return (
                              <div
                                key={c}
                                onClick={() => setSelectedCycle(c)}
                                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-md transition-colors ${
                                  selected ? 'bg-primary/5' : 'hover:bg-muted'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground">{cycleLabel(c)}</span>
                                    {isCurrent && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                                        Current
                                      </span>
                                    )}
                                    {p.save && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                                        {p.save}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.perMonth} · {p.cycleDesc}</p>
                                </div>
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    selected ? 'border-primary bg-primary' : 'border-border bg-card'
                                  }`}
                                >
                                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {(() => {
                          const tierChanged = selectedTier !== subscription.plan;
                          const cycleChanged = selectedCycle !== subscription.billingCycle;
                          const bothChanged = tierChanged && cycleChanged;
                          const hasChange = tierChanged || cycleChanged;
                          return (
                            <>
                              {bothChanged && (
                                <div className="mx-4 mb-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                                  <Info className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                  <p className="text-[11px] leading-relaxed text-destructive">
                                    Please change either the plan tier or the billing cycle —
                                    not both at once. Reset one to its current value to continue.
                                  </p>
                                </div>
                              )}
                              <div className="flex gap-2 px-4 py-3 bg-card border-t border-border">
                                <button
                                  onClick={handleConfirmSwitch}
                                  disabled={isActing || !hasChange || bothChanged}
                                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {isActing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  Confirm change
                                </button>
                                <button
                                  onClick={() => {
                                    setSwitchPlanOpen(false);
                                    setSelectedTier(subscription.plan);
                                    setSelectedCycle(subscription.billingCycle);
                                  }}
                                  disabled={isActing}
                                  className="px-4 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                                <span className="ml-auto self-center text-[11px] text-muted-foreground">
                                  One change at a time
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Subscription history (mock placeholder) */}
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
                        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
                        {[
                          { label: `${tierLabel(subscription.plan)} plan · ${cycleLabel(subscription.billingCycle)}`, date: formatDate(subscription.currentPeriodStart) },
                        ].map((item, i) => (
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

              {/* Cancellation area */}
              <div className="px-5 py-4 border-t border-border">
                {cancelState === 'active' && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Need to make a change to your plan?</p>
                    <button
                      onClick={() => setPostCancelModalOpen(true)}
                      className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors hover:underline underline-offset-2 ml-4"
                    >
                      Cancel subscription
                    </button>
                  </div>
                )}

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
                                Our team will review within 24 hours. You'll receive an email with refund details.
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
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Refund of <span className="text-foreground font-medium">{nextBillingAmount}</span> will be returned to your original payment method within 5–10 business days upon approval.
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
                                  disabled={isActing}
                                  className="px-4 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50/80 transition-colors disabled:opacity-60"
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

                {cancelState === 'post_window' && (
                  <div className="flex items-start justify-between">
                    {subscription.currentPeriodStart &&
                    daysBetween(subscription.currentPeriodStart) < REFUND_WINDOW_DAYS ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            Cancellation request submitted
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            Our team will review within 24 hours. You'll receive an email with refund
                            details. Reactivate to undo this request before it's processed.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          Your access ends {formatDate(subscription.currentPeriodEnd)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          You can reactivate anytime before then.
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleResume}
                      disabled={isActing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-xs font-medium text-primary hover:bg-primary/5 transition-colors shrink-0 ml-4 disabled:opacity-60"
                    >
                      {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      Reactivate
                    </button>
                  </div>
                )}

                {cancelState === 'canceled' && (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">Your subscription has been canceled</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Re-subscribe from the pricing page to regain member benefits.
                      </p>
                    </div>
                    <button
                      onClick={handleResubscribe}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-xs font-medium text-primary hover:bg-primary/5 transition-colors shrink-0 ml-4"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Re-subscribe
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 3 — Credit balance & usage */}
        <div>
          <SectionLabel>Credit balance</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Dark balance card */}
            <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#0F172A' }}>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>Credit balance</span>
              </div>
              <div>
                <p className="leading-none font-semibold text-white" style={{ fontSize: 38 }}>
                  {credits.totalBalance}
                </p>
                {credits.permanentCreditBalance > 0 && (
                  <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {credits.permanentCreditBalance} permanent · {credits.recurringCreditBalance} recurring
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                <button
                  onClick={() => setShowBuyCredits(true)}
                  className="w-full py-2 rounded-lg bg-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  style={{ color: '#0F172A' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Buy extra credits
                </button>
                <button
                  onClick={() => setShowRedeemCode(true)}
                  className="w-full py-2 rounded-lg text-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  style={{ background: '#2563EB' }}
                >
                  <Gift className="w-3.5 h-3.5" />
                  Redeem code
                </button>
              </div>
            </div>

            {/* Usage card */}
            <div className="rounded-xl bg-card border border-border p-5">
              <p className="text-xs font-medium text-foreground mb-4">This month's usage</p>
              {isMember && subscription && credits.monthlyAllowance > 0 ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">AI interview credits</span>
                      <span className="text-xs text-muted-foreground">
                        {Math.max(0, credits.monthlyAllowance - credits.recurringCreditBalance)} / {credits.monthlyAllowance}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((credits.monthlyAllowance - credits.recurringCreditBalance) / credits.monthlyAllowance) * 100))}%`,
                          background: '#3B82F6',
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3 shrink-0" />
                    Monthly limits reset {formatDate(credits.resetDate)}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    You're on pay-as-you-go credits. Buy extra credits anytime — they never expire.
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3 shrink-0" />
                    Permanent credits never expire.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODULE 4 — Payment method (mock — UI only, no backend wired) */}
        {/* <div>
          <SectionLabel>Payment method</SectionLabel>
          <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {cardData ? (
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded-lg flex items-center justify-center shrink-0 bg-secondary border border-border">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground" style={{ fontSize: 15 }}>{cardData.brand} ending in {cardData.last4}</p>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">Default</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5" style={{ fontSize: 13 }}>Expires {cardData.expiry}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setAddCardTitle('Change payment method'); setShowAddCardModal(true); }}
                    className="text-sm font-medium text-primary hover:opacity-75 transition-opacity"
                  >
                    Change
                  </button>
                </div>
                <div className="border-t border-border my-3" />
                <button
                  onClick={() => setCardData(null)}
                  className="hover:underline underline-offset-2 transition-colors"
                  style={{ fontSize: 14, color: 'var(--destructive)' }}
                >
                  Remove payment method
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center px-6 py-8">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground mb-1" style={{ fontSize: 15 }}>No payment method saved</p>
                <p className="text-muted-foreground mb-5" style={{ fontSize: 13 }}>Add a card to enable future purchases.</p>
                <button
                  onClick={() => { setAddCardTitle('Add payment method'); setShowAddCardModal(true); }}
                  className="font-medium text-foreground rounded-lg border border-border hover:bg-secondary transition-colors"
                  style={{ padding: '8px 20px', fontSize: 14 }}
                >
                  + Add payment method
                </button>
              </div>
            )}
          </div>
        </div> */}

        {/* MODULE 5 — Invoices */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Invoices</SectionLabel>
            {user?.email && <p className="text-xs text-muted-foreground">Sent to {user.email}</p>}
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {isLoadingInvoices ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <Download className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No invoices yet</p>
                <p className="text-xs text-muted-foreground">Your invoices will appear here after your first billing cycle.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 bg-secondary px-5 py-2.5 border-b border-border">
                  {['Date', 'Amount', 'Status', 'Invoice'].map(h => (
                    <span key={h} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-border">
                  {invoices.map(inv => (
                    <div key={inv.stripeInvoiceId} className="grid grid-cols-4 items-center px-5 py-3.5 hover:bg-secondary/40 transition-colors">
                      <span className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</span>
                      <span className="text-xs font-medium text-foreground">{formatAmountCents(inv.amount, inv.currency)}</span>
                      <span>
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
                          Paid
                        </span>
                      </span>
                      <button
                        onClick={() => inv.invoiceUrl && window.open(inv.invoiceUrl, '_blank')}
                        disabled={!inv.invoiceUrl}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:opacity-75 transition-opacity w-fit disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {invoicePageMeta && invoicePageMeta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Page {invoicePageMeta.pageNumber + 1} of {invoicePageMeta.totalPages} ({invoicePageMeta.totalElements} invoices)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInvoicePage(p => Math.max(0, p - 1))}
                    disabled={invoicePageMeta.first}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setInvoicePage(p => p + 1)}
                    disabled={invoicePageMeta.last}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
