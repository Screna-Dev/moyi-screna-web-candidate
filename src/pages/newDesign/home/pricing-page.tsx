import { useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import {
  Check,
  X,
  ChevronDown,
  Mic,
  Video,
  Info,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../../../components/newDesign/home/navbar';
import { Footer } from '../../../components/newDesign/home/footer';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentService } from '@/services';
import { useSubscription, type Tier } from '@/hooks/useSubscription';

// ─── Types & data ────────────────────────────────────────────
type BillingCycle = 'monthly' | 'quarterly';

const ACCENT = 'hsl(221,91%,60%)'; // brand blue #2E5BFF — slider, refund dot, FAQ link
const PRICING_ACCENT = '#3B6FE8';  // pricing-card accent — badge, CTA, check, save chip

// Membership tier prices (from Claude design / Screna Landing Page.html)
const PREMIUM_PRICES: Record<BillingCycle, { price: string; note: string }> = {
  monthly:   { price: '$219', note: 'Billed $219 / month · cancel anytime' },
  quarterly: { price: '$199', note: 'Billed $597 / quarter · cancel anytime' },
};

const SAVE_BADGES: Partial<Record<BillingCycle, string>> = {
  quarterly: 'Save 9%',
};

// Limited Access — plain list of what's included
const LIMITED_INCLUDED = [
  'AI mock interview (credits required)',
  'Limited Interview Insights',
];

type FeatureRow = { text: string; ok: boolean };
type FeatureGroup = { title: string; items: FeatureRow[] };

// Disabled feature groups shown on Limited Access (all crosses)
const LIMITED_GROUPS: FeatureGroup[] = [
  {
    title: 'Job search support',
    items: [
      { text: 'Dedicated 1:1 job search human assistants', ok: false },
      { text: 'We find jobs and apply for you (200 applications/month)', ok: false },
      { text: 'Daily application progress updates', ok: false },
      { text: 'Updated & Personalized job recommendation list', ok: false },
      { text: 'Interview Insights — full access', ok: false },
      { text: 'Weekly members-only live sessions', ok: false },
      { text: '2 annual networking events', ok: false },
      { text: 'Pre-interview warm-up reminders', ok: false },
    ],
  },
  {
    title: 'Outreach & visibility',
    items: [
      { text: 'We reach out to recruiters and request referrals for you', ok: false },
    ],
  },
  {
    title: 'Mentor access',
    items: [
      { text: 'Mentor Marketplace', ok: false },
      { text: 'Mock interview, resume review, salary negotiation', ok: false },
      { text: 'Mentor reviews & ratings', ok: false },
    ],
  },
];

// Premium — all checks
const PREMIUM_GROUPS: FeatureGroup[] = [
  {
    title: 'Job search support',
    items: [
      { text: 'Dedicated 1:1 job search human assistants', ok: true },
      { text: 'We find jobs and apply for you (200 applications/month)', ok: true },
      { text: 'Daily application progress updates', ok: true },
      { text: 'Updated & Personalized job recommendation list', ok: true },
      { text: 'Interview Insights — full access', ok: true },
      { text: 'Weekly members-only live sessions', ok: true },
      { text: '2 annual networking events', ok: true },
      { text: 'Pre-interview warm-up reminders', ok: true },
    ],
  },
  {
    title: 'Outreach & visibility',
    items: [
      { text: 'We reach out to recruiters and request referrals for you', ok: true },
    ],
  },
  {
    title: 'Mentor access',
    items: [
      { text: 'Full Mentor Marketplace', ok: true },
      { text: 'Mock interview, resume review, salary negotiation', ok: true },
      { text: 'Mentor reviews & ratings', ok: true },
    ],
  },
];

// Pricing FAQ (from Pricing.html)
const FAQS = [
  {
    q: "What's the difference between the Free Plan and Premium?",
    a: 'The Free Plan lets you try Screna with pay-as-you-go credits for AI mock interviews and limited Interview Insights — you handle your job search entirely on your own. Premium is the complete job search platform: a dedicated human team finds roles and submits applications on your behalf (up to 200/month), reaches out to recruiters for referrals, gives you a personalized job list, full mentor access, and members-only community benefits. If you want to move fast without doing everything yourself, Premium is the right fit.',
  },
  {
    q: "What's your refund policy?",
    a: "All plans come with a 7-day money-back guarantee. If you're not satisfied, contact our support team within 7 days of purchase and we'll issue a full refund — no questions asked.",
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: "Yes. You can cancel anytime from Settings → Billing. Your access continues until the end of your current billing period — we don't cut you off early. After cancellation, your account reverts to the Free Plan.",
  },
  {
    q: 'Can I upgrade or downgrade my plan anytime?',
    a: 'Yes. Upgrades take effect immediately and your new benefits are available right away. Downgrades take effect at the end of your current billing period — you keep full access until then.',
  },
  {
    q: 'Do credits expire?',
    a: 'Never. Once purchased, credits stay in your account until you use them — no rush, no pressure. This applies even if you cancel your subscription.',
  },
  {
    q: 'What happens to my credits if I cancel my subscription?',
    a: 'Credits you purchased separately (pay-as-you-go packs) never expire and remain in your account after cancellation. Credits included in your subscription plan will be refunded together with your subscription if you cancel within the 7-day refund window.',
  },
  {
    q: 'Why does Video cost 1.5 credits/min?',
    a: 'Video sessions require real-time video processing and facial expression analysis on top of voice recognition, which increases the compute cost. Voice sessions use 1 credit/min.',
  },
  {
    q: 'What happens if I end a session early?',
    a: 'You only pay for the minutes you actually used. If a 20-minute session ends after 12 minutes, the remaining 8 minutes of credits are automatically refunded to your balance — no action needed.',
  },
  {
    q: 'Does the Mentorship Marketplace come with Premium?',
    a: 'Yes. Premium includes full access to the Mentorship Marketplace — mock interviews, resume reviews, salary negotiation coaching, and full mentor reviews & ratings. Mentor session costs are separate and paid per session.',
  },
];

// ─── Animate wrapper ────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Icons ──────────────────────────────────────────────
function CheckDot() {
  return (
    <span
      className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-px text-white"
      style={{ background: PRICING_ACCENT }}
    >
      <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
    </span>
  );
}

function XDot() {
  return (
    <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-0.5 border-[1.4px] border-[#D0D0D0] text-[#A0A0A0]">
      <X className="w-2.5 h-2.5" strokeWidth={3} />
    </span>
  );
}

// ─── FAQ Item ───────────────────────────────────────────
function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`bg-white border rounded-xl px-6 py-5 transition-all ${
        open ? 'border-slate-300 shadow-sm' : 'border-slate-200'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <span className="text-[15px] font-semibold text-slate-900 leading-snug">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[14px] text-slate-500 leading-[1.7]">{a}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Feature Group (used in tier cards) ─────────────────
function FeatureGroupBlock({ group }: { group: FeatureGroup }) {
  return (
    <section className="border-t border-[#E5E5E5] pt-4">
      <h4 className="text-[10px] font-bold tracking-[0.09em] uppercase text-[#A0A0A0] mb-3">
        {group.title}
      </h4>
      <ul className="flex flex-col gap-[9px]">
        {group.items.map((item) => (
          <li
            key={item.text}
            className={`flex items-start gap-2.5 text-[13px] leading-[1.5] ${
              item.ok ? 'text-[#0A0A0A]' : 'text-[#A0A0A0]'
            }`}
          >
            {item.ok ? <CheckDot /> : <XDot />}
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Credit pack price model ────────────────────────────
// Flat pricing: $0.10 per credit (total = numberOfCredits × 0.10).
const CREDIT_UNIT_PRICE = 0.1;
const CREDIT_MIN = 50;
const CREDIT_MAX = 1000;
const CREDIT_STEP = 10;
function creditPrice(q: number): number {
  return q * CREDIT_UNIT_PRICE;
}

// ════════════════════════════════════════════════════════════
// PRICING PAGE
// ════════════════════════════════════════════════════════════
export function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, subscribe, changeTier, isActing: isSubscribing } = useSubscription();

  const [cycle, setCycle] = useState<BillingCycle>('quarterly');
  const premium = PREMIUM_PRICES[cycle];

  // Credit pack slider state
  const [credits, setCredits] = useState(100);
  const customTotal = creditPrice(credits);
  const customUnit = CREDIT_UNIT_PRICE;
  const fillPct = ((credits - CREDIT_MIN) / (CREDIT_MAX - CREDIT_MIN)) * 100;

  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);
  const [openFaq, setOpenFaq] = useState<number>(0);

  // Subscription lifecycle:
  //   FREE (no row)         → POST /subscriptions          (Stripe Checkout)
  //   CANCELED (period end) → POST /subscriptions/tier     (creates new row)
  //   ACTIVE                → manage in /billing
  const isActiveMember = subscription !== null && subscription.status !== 'canceled';

  const handleSubscribe = async (plan: Tier) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isActiveMember) {
      navigate('/settings?tab=billing');
      return;
    }
    setLoadingTier(plan);
    try {
      if (subscription && subscription.status === 'canceled') {
        // Re-subscribe path — no Stripe redirect.
        const ok = await changeTier(plan);
        if (!ok) return;
        navigate('/premium-onboarding');
      } else {
        // First-time subscription — Stripe redirect. Premium activates the
        // onboarding wizard on return via /payment-success → /premium-onboarding.
        const url = await subscribe(plan, cycle);
        if (url) {
          window.location.href = url;
        } else {
          // No URL (e.g. card on file) — go straight to onboarding wizard.
          navigate('/premium-onboarding');
        }
      }
    } finally {
      setLoadingTier(null);
    }
  };

  const premiumLabel = isActiveMember
    ? (subscription!.plan === 'advanced' ? 'Current plan' : 'Manage plan')
    : 'Start Premium';
  const premiumDisabled = (isActiveMember && subscription!.plan === 'advanced') || isSubscribing;

  // ─── Handlers (credit packs only — subscriptions not wired) ───
  const buyPack = async (
    kind: 'custom',
    fn: () => Promise<{ data?: { data?: { url?: string } } }>,
  ) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoadingPack(kind);
    try {
      const response = await fn();
      const url = response?.data?.data?.url;
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setLoadingPack(null);
    }
  };

  const handleBuyCustom   = () => buyPack('custom',   () => PaymentService.purchaseCustomPack(credits));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ═══ PRICING ═══════════════════════════════════════ */}
        <section id="pricing" className="pt-32 pb-24" style={{ paddingLeft: 32, paddingRight: 32 }}>
          <div className="mx-auto" style={{ maxWidth: 1160 }}>
            {/* Section head */}
            <FadeIn>
              <div className="text-center mb-12">
                <p
                  className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase mb-5"
                  style={{ color: ACCENT }}
                >
                  <span className="w-6 h-px" style={{ background: ACCENT }} />
                  Pricing
                </p>
                <h1
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-[clamp(36px,4.6vw,56px)] font-[400] leading-[1.02] tracking-[-0.02em] text-[#0A0A0A] max-w-[22ch] mx-auto mb-4"
                >
                  Plans for every stage of your{' '}
                  <em className="italic font-[400] text-[#4a4d57]">job search.</em>
                </h1>
                <p className="text-[17px] text-[#4a4d57] leading-[1.55] max-w-[54ch] mx-auto">
                  Start with self-serve AI practice, or upgrade to guided career support with mentorship and managed job search help.
                </p>
              </div>
            </FadeIn>

            {/* Billing toggle */}
            <FadeIn delay={0.05}>
              <div className="flex justify-center mb-9">
                <div
                  role="tablist"
                  aria-label="Billing cycle"
                  className="inline-flex items-stretch bg-[#F3F4F6] rounded-full p-1 gap-0.5"
                >
                  {(['monthly', 'quarterly'] as BillingCycle[]).map((c) => {
                    const active = cycle === c;
                    const label = c.charAt(0).toUpperCase() + c.slice(1);
                    const save = SAVE_BADGES[c];
                    return (
                      <button
                        key={c}
                        role="tab"
                        aria-selected={active}
                        onClick={() => setCycle(c)}
                        className={`flex items-center gap-2 px-[18px] py-2 rounded-full text-[13px] font-[500] transition-all whitespace-nowrap ${
                          active
                            ? 'bg-white text-[#0A0A0A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                            : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
                        }`}
                      >
                        {label}
                        {save && (
                          <span
                            className="text-[10px] font-[700] tracking-[0.04em] px-[7px] py-[2px] rounded-full text-white leading-[1.2]"
                            style={{ background: PRICING_ACCENT }}
                          >
                            {save}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </FadeIn>

            {/* 2-tier grid (Free + Premium) */}
            <div className="grid grid-cols-1 min-[820px]:grid-cols-2 gap-6 items-stretch max-w-[820px] mx-auto">
              {/* ── Limited Access (Free) ─────────────────── */}
              <FadeIn>
                <article className="h-full bg-white border border-[#E5E5E5] rounded-2xl p-7 flex flex-col hover:border-[#D0D7E5] hover:shadow-[0_12px_40px_-22px_rgba(10,10,10,0.10)] transition-all">
                  <div className="mb-5">
                    <div
                      className="text-[11px] font-[700] tracking-[0.08em] uppercase mb-3"
                      style={{ color: PRICING_ACCENT }}
                    >
                      Free Plan
                    </div>
                    <h3
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-[36px] font-[700] leading-[1.1] tracking-[-0.02em] text-[#0A0A0A] mb-2.5"
                    >
                      Limited Access
                    </h3>
                    <p className="text-[13px] text-[#6B6B6B] leading-[1.55] max-w-[32ch]">
                      Practice on your own schedule. No subscription required — buy credits when you need them.
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-[42px] font-[700] leading-none tracking-[-0.02em] text-[#0A0A0A]"
                    >
                      $0
                    </span>
                    <span className="text-[15px] text-[#6B6B6B] font-[500]">no recurring charge</span>
                  </div>
                  <p className="text-[12px] text-[#6B6B6B] mt-2 mb-5">Pay only for the credits you use</p>

                  <Link
                    to="/auth"
                    className="flex items-center justify-center w-full rounded-full py-3 px-[18px] text-[14px] font-[600] border-[1.5px] border-[#D0D0D0] text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors mb-6"
                  >
                    Get started free
                  </Link>

                  <p className="text-[10px] font-[700] tracking-[0.09em] uppercase text-[#A0A0A0] pt-4 border-t border-[#E5E5E5]">
                    What's included
                  </p>
                  <ul className="flex flex-col gap-[9px] mt-3 mb-1">
                    {LIMITED_INCLUDED.map((text) => (
                      <li key={text} className="flex items-start gap-2.5 text-[13px] leading-[1.5] text-[#0A0A0A]">
                        <CheckDot />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-col gap-0 mt-5 flex-1">
                    {LIMITED_GROUPS.map((g) => (
                      <FeatureGroupBlock key={g.title} group={g} />
                    ))}
                  </div>

                  <div className="mt-5 bg-[#F7F7F7] rounded-[10px] px-4 py-3.5 flex flex-col gap-1">
                    <span className="text-[10px] font-[700] tracking-[0.09em] uppercase text-[#A0A0A0]">
                      Credits
                    </span>
                    <span className="text-[18px] font-[700] tracking-[-0.01em] leading-tight text-[#0A0A0A]">
                      Pay-as-you-go
                    </span>
                    <span className="text-[11px] text-[#6B6B6B] leading-[1.45]">
                      Buy a pack when you need it
                    </span>
                  </div>
                </article>
              </FadeIn>

              {/* ── Full Access (Premium) ──────────────── */}
              <FadeIn delay={0.16}>
                <article
                  className="relative h-full bg-white rounded-2xl p-7 flex flex-col transition-all"
                  style={{
                    border: `2px solid ${PRICING_ACCENT}`,
                    boxShadow: '0 18px 50px -28px rgba(59,111,232,0.35)',
                  }}
                >
                  <span
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[11px] font-[700] tracking-[0.08em] uppercase px-4 py-1 rounded-full whitespace-nowrap"
                    style={{ background: PRICING_ACCENT, boxShadow: '0 6px 18px -6px rgba(59,111,232,0.45)' }}
                  >
                    Recommended
                  </span>

                  <div className="mb-5">
                    <div
                      className="text-[11px] font-[700] tracking-[0.08em] uppercase mb-3"
                      style={{ color: PRICING_ACCENT }}
                    >
                      Premium Membership
                    </div>
                    <h3
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-[36px] font-[700] leading-[1.1] tracking-[-0.02em] text-[#0A0A0A] mb-2.5"
                    >
                      Full Access
                    </h3>
                    <p className="text-[13px] text-[#6B6B6B] leading-[1.55] max-w-[32ch]">
                      The complete job search platform. Every feature, every service, one subscription.
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-[42px] font-[700] leading-none tracking-[-0.02em] text-[#0A0A0A]"
                    >
                      {premium.price}
                    </span>
                    <span className="text-[15px] text-[#6B6B6B] font-[500]">/ month</span>
                  </div>
                  <p className="text-[12px] text-[#6B6B6B] mt-2 mb-5">{premium.note}</p>

                  <div className="relative mb-6">
                    <button
                      onClick={() => handleSubscribe('advanced')}
                      disabled={premiumDisabled}
                      className="flex items-center justify-center w-full rounded-full py-3 px-[18px] text-[14px] font-[600] text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: PRICING_ACCENT, border: `1.5px solid ${PRICING_ACCENT}` }}
                    >
                      {loadingTier === 'advanced' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        premiumLabel
                      )}
                    </button>
                  </div>

                  <p className="text-[13px] font-[500] mb-1.5" style={{ color: PRICING_ACCENT }}>
                    Everything in Limited Access, plus:
                  </p>

                  <div className="flex flex-col gap-0 mt-2 flex-1">
                    {PREMIUM_GROUPS.map((g) => (
                      <FeatureGroupBlock key={g.title} group={g} />
                    ))}
                  </div>

                  <div className="mt-5 bg-[#F7F7F7] rounded-[10px] px-4 py-3.5 flex flex-col gap-1">
                    <span className="text-[10px] font-[700] tracking-[0.09em] uppercase text-[#A0A0A0]">
                      Included each month
                    </span>
                    <span className="text-[18px] font-[700] tracking-[-0.01em] leading-tight text-[#0A0A0A]">
                      500 credits / mo
                    </span>
                    <span className="text-[11px] text-[#6B6B6B] leading-[1.45]">
                      1 credit = $0.28 = 1 min of AI mock interview (Audio mode)
                    </span>
                  </div>
                </article>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ═══ 02 CREDIT PACKS ═══════════════════════════════ */}
        <section id="credits" className="py-20 px-6" style={{ background: '#F7F7F7' }}>
          <div className="max-w-5xl mx-auto">
            {/* Centered section head — eyebrow + Playfair title + sub */}
            <FadeIn>
              <div className="text-center mb-12">
                <p
                  className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase mb-5"
                  style={{ color: ACCENT }}
                >
                  <span className="w-6 h-px" style={{ background: ACCENT }} />
                  Credit packs
                </p>
                <h2
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-[clamp(36px,4.6vw,56px)] font-[400] leading-[1.02] tracking-[-0.02em] text-[#0A0A0A] max-w-[22ch] mx-auto mb-4"
                >
                  Pay only for what you use.{' '}
                  <em className="italic font-[400] text-[#4a4d57]">Refund after the mock.</em>
                </h2>
                <p className="text-[17px] text-[#4a4d57] leading-[1.55] max-w-[54ch] mx-auto">
                  Flexible, controllable, low-commitment — perfect for "just a few sessions." Or build a custom pack for bigger volume.
                </p>
              </div>
            </FadeIn>

            {/* Pricing-block head — 2-column step / kicker / title / subhead */}
            <FadeIn delay={0.05}>
              <div className="grid grid-cols-1 min-[820px]:grid-cols-[1fr_1.2fr] gap-12 items-start mb-7">
                <div className="flex items-start gap-4">
                  <span
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className="inline-flex items-center text-[13px] font-[500] tracking-[0.08em] text-[#4a4d57] bg-[#F7F7F7] border border-[#E8E8EA] rounded-full px-3 py-1.5 shrink-0"
                  >
                    02
                  </span>
                  <div>
                    <div className="text-[11px] font-[600] tracking-[0.14em] uppercase text-[#4a4d57] mb-1">
                      Credit packs
                    </div>
                    <div
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-[clamp(22px,2.5vw,28px)] font-[500] leading-[1.15] tracking-[-0.02em] text-[#0A0A0A]"
                    >
                      Pay-as-you-go
                    </div>
                  </div>
                </div>
                <p className="text-[14.5px] text-[#4a4d57] leading-[1.55] max-w-[44ch]">
                  For occasional practice or one-off mocks. Don't love the session? We'll refund the credits.
                </p>
              </div>
            </FadeIn>

            {/* Customize slider card */}
            <FadeIn delay={0.1}>
              <div
                className="rounded-[22px] p-8 md:px-9"
                style={{
                  background: 'linear-gradient(172deg, #fbfcff 0%, #F7F9FF 100%)',
                  border: '1px solid #D9E1FF',
                  boxShadow: '0 24px 60px -32px rgba(46,91,255,0.30)',
                }}
              >
                <div className="flex flex-wrap items-end justify-between gap-6 mb-5">
                  <div>
                    <span
                      className="inline-block text-[10.5px] font-mono tracking-[0.12em] uppercase px-2 py-1 rounded-full"
                      style={{ color: ACCENT, background: 'rgba(255,255,255,0.7)' }}
                    >
                      Customize
                    </span>
                    <div
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-[clamp(22px,2.4vw,28px)] font-[600] text-[#0A0A0A] leading-tight mt-2"
                    >
                      Build your own credit pack.
                    </div>
                    <p className="text-[14px] text-[#6B6B6B] max-w-[38ch] mt-1.5">
                      Slide to choose any amount from 50 to 1,000 credits, in steps of 10. Flat $0.10 per credit.
                    </p>
                  </div>
                  <div className="text-right min-w-[180px]">
                    <div>
                      <span
                        style={{ fontFamily: "'Playfair Display', serif" }}
                        className="text-[56px] font-[600] leading-none tracking-[-0.02em] text-[#0A0A0A]"
                      >
                        {credits.toLocaleString()}
                      </span>
                      <span className="text-[14px] text-[#6B6B6B] ml-1.5 font-[500]">credits</span>
                    </div>
                    <div
                      style={{ fontFamily: "'Playfair Display', serif", color: ACCENT }}
                      className="text-[22px] font-[600] mt-1.5"
                    >
                      ${customTotal.toFixed(2)}
                    </div>
                    <div
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className="text-[11.5px] text-[#A0A0A0] tracking-[0.04em] mt-0.5"
                    >
                      ${customUnit.toFixed(2)} / credit
                    </div>
                  </div>
                </div>

                {/* Slider */}
                <div className="relative pt-2 pb-8">
                  <input
                    type="range"
                    min={CREDIT_MIN}
                    max={CREDIT_MAX}
                    step={CREDIT_STEP}
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    aria-label="Credits amount"
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[hsl(221,91%,60%)] [&::-webkit-slider-thumb]:shadow-[0_4px_10px_rgba(46,91,255,0.3)] [&::-webkit-slider-thumb]:cursor-grab"
                    style={{
                      background: `linear-gradient(to right, ${ACCENT} 0%, ${ACCENT} ${fillPct}%, rgba(0,0,0,0.08) ${fillPct}%, rgba(0,0,0,0.08) 100%)`,
                    }}
                  />
                  <div
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className="absolute inset-x-0 bottom-0 flex justify-between text-[10.5px] text-[#A0A0A0] tracking-[0.04em] pointer-events-none"
                  >
                    <span>50</span>
                    <span>250</span>
                    <span>500</span>
                    <span>750</span>
                    <span>1,000</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex gap-5 flex-wrap text-[12.5px] text-[#6B6B6B]">
                    {['Credits never expire', 'Refund after the mock', 'Use across AI & mentor sessions'].map((n) => (
                      <span key={n} className="inline-flex items-center gap-1.5">
                        <span className="w-[5px] h-[5px] rounded-full" style={{ background: ACCENT }} />
                        {n}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={handleBuyCustom}
                    disabled={loadingPack === 'custom'}
                    className="rounded-full px-6 py-3 text-[14px] font-[600] text-white transition-colors disabled:opacity-60 inline-flex items-center gap-2"
                    style={{ background: ACCENT }}
                  >
                    {loadingPack === 'custom' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Buy {credits.toLocaleString()} credits · ${customTotal.toFixed(2)}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </FadeIn>

            {/* Credits per minute card */}
            <FadeIn delay={0.15}>
              <div className="bg-white border border-[#E5E5E5] rounded-2xl px-8 py-7 mt-6">
                <div>
                  <h3 className="text-[18px] font-[600] text-[#0A0A0A] tracking-[-0.005em] m-0">
                    Credits per minute
                  </h3>
                  <p className="text-[14px] text-[#6B6B6B] leading-[1.5] mt-1">
                    Different modes use credits at different rates.
                  </p>
                </div>
                <hr className="border-0 border-t border-[#E5E5E5] mt-5" />

                {[
                  { mode: 'Voice mode', icon: Mic,   rate: '1 credit/min',    badge: '1×' },
                  { mode: 'Video mode', icon: Video, rate: '1.5 credits/min', badge: '1.5×' },
                ].map(({ mode, icon: Icon, rate, badge }) => (
                  <div key={mode} className="flex items-center py-5 border-b border-[#E5E5E5]">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EEF0FF', color: '#5B6AD0' }}>
                      <Icon className="w-5 h-5" strokeWidth={1.6} />
                    </span>
                    <span className="text-[15px] font-[500] text-[#0A0A0A] ml-3.5">{mode}</span>
                    <span className="ml-auto flex items-center gap-2.5">
                      <span className="text-[14px] text-[#6B6B6B]">{rate}</span>
                      <span
                        className="text-[12px] font-[600] px-2.5 py-0.5 rounded-full leading-[1.4]"
                        style={{ background: '#EEF0FF', color: '#5B6AD0' }}
                      >
                        {badge}
                      </span>
                    </span>
                  </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 pt-4">
                  {[
                    'A 20-min Voice session uses 20 credits.',
                    'A 30-min Video session uses 45 credits.',
                  ].map((ex) => (
                    <div key={ex} className="flex items-start gap-2 text-[13px] text-[#6B6B6B] leading-[1.5]">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#5B6AD0' }} />
                      <span>
                        <b className="font-[600] text-[#6B6B6B]">Example:</b> {ex}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-[10px] px-4 py-3 mt-4 flex items-start gap-2.5" style={{ background: '#F0FBF4' }}>
                  <RefreshCw className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#1A9E5C' }} />
                  <span className="text-[13px] leading-[1.5]" style={{ color: '#1A9E5C' }}>
                    Only pay what you use. If you end a session early, unused credits are automatically refunded.
                  </span>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══ 03 FAQ ════════════════════════════════════════ */}
        <section id="pricing-faq" className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <FadeIn>
              <h2 className="text-center text-[24px] font-[600] tracking-[-0.01em] text-[#0A0A0A] mb-8">
                Frequently asked questions
              </h2>
              <div className="flex flex-col gap-3">
                {FAQS.map((faq, i) => (
                  <FaqItem
                    key={faq.q}
                    q={faq.q}
                    a={faq.a}
                    open={openFaq === i}
                    onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
                  />
                ))}
              </div>
              <p className="text-center text-[14px] text-[#6B6B6B] mt-8">
                Still have questions?{' '}
                <a href="mailto:support@screna.ai" className="font-[500]" style={{ color: ACCENT }}>
                  Contact support →
                </a>
              </p>
            </FadeIn>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
