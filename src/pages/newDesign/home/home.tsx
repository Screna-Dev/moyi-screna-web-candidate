import { useState, useRef, useEffect, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Menu, X, Loader2, LayoutDashboard, Settings, Coins, LogOut } from 'lucide-react';
import { usePostHog } from 'posthog-js/react';
import { BuyCreditsModal } from '@/components/newDesign/BuyCreditsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan, type PlanType } from '@/hooks/useUserPlan';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';
import { getPersonalInfo } from '@/services/ProfileServices';
import { useToast } from '@/hooks/use-toast';
import { PaymentService } from '@/services';
import { markPendingCheckout } from '@/utils/pendingCheckout';
import { buildAuthPath } from '@/utils/returnTo';
import { useSeo, SITE_URL } from '@/hooks/useSeo';
import { SEO_COPY } from '@/constants/seo';
import { SOCIAL_PROFILE_URLS, SUPPORT_EMAIL } from '@/constants/site';
import imgLogo from '@/imports/Frame1/2ac62cf8d338510e851fc6fd6ab9ce46a7956ad5.png';
// WebP, resized to ~2x display size (see scripts/optimize-images.mjs).
// The .png originals are kept in the repo as the source for that script —
// nothing imports them.
import imgWorkflowDiagram from '@/imports/Group_18.webp';
import imgTeacup from '@/imports/App/landing-teacup.webp';
import imgJobOffer from '@/imports/App/landing-job-offer.webp';
import imgMicrophone from '@/imports/App/landing-microphone.webp';
import imgNotebook from '@/imports/App/landing-notebook.webp';
import iconCheckMuted from '@/assets/landing-candidate/check-muted.svg';
import iconCheckPrimary from '@/assets/landing-candidate/check-primary.svg';
import iconCheckCircle from '@/assets/landing-candidate/check-circle.svg';

// ─── Structured data ────────────────────────────────────────────────────────
// Site-level Organization entity. index.html carries a separate WebApplication
// block (untouched by useSeo, since it has no data-seo marker) — the two are
// complementary: one describes the company, the other the product.
const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Screna AI',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    'AI-driven interview preparation: mock interviews, personalized training plans, a real interview experience library, and expert mentors.',
  sameAs: SOCIAL_PROFILE_URLS,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: SUPPORT_EMAIL,
    url: `${SITE_URL}/contact`,
  },
};


// ─── Types ──────────────────────────────────────────────────────────────────
type SystemTab = 'Partner Roles' | 'Interview Report' | 'Interview Reports Library';

// Landing-page subscription tier. FREE is UI-only; the paid tiers map to the
// backend enum (BASIC | ADVANCED | FLAGSHIP), billed MONTHLY for now.
type PlanTier = 'FREE' | 'BASIC' | 'ADVANCED' | 'FLAGSHIP';

interface Plan {
  name: string;
  // null = no purchasable backend product yet (see PLANS below).
  tier: PlanTier | null;
  price: string;
  priceSuffix?: string;
  tagline: string;
  // A feature string may be { text, strong } to render it in medium weight.
  features: (string | { text: string; strong: true })[];
  footnote?: string;
  cta: string;
  highlighted: boolean;
  badge?: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'Roles', href: '/opportunities' },
  { label: 'Interview Reports', href: '/interview-questions' },
  { label: 'Blog', href: '/blog' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const SYSTEM_TABS: SystemTab[] = ['Partner Roles', 'Interview Report', 'Interview Reports Library'];

const FAQ_ITEMS = [
  {
    q: 'Does paying improve my chances of being recommended?',
    a: 'No. Recommendations come from your interview, not your plan. Every plan, including Free, can interview for partner roles and get recommended. Paid plans show you more about where you stand.',
  },
  {
    q: 'How do you deal with ghost jobs?',
    a: 'Open roles are re-checked every 24 hours and closed postings come down automatically. Partner roles have a hiring team that agreed to review Screna candidates and reply within 7 days. Roles still being confirmed are clearly marked.',
  },
  {
    q: 'Will the hiring team actually see my interview?',
    a: 'On partner roles, yes. Your four-dimension report and your interview recording go to the hiring team, and you can see when they open your report.',
  },
  {
    q: 'Are interview reports really free?',
    a: 'Yes. Every plan gets a score and rank range for each partner-role interview, and Free includes 3 interview-report analyses a month. Pro adds your exact rank, percentile and question-by-question feedback on every report.',
  },
  {
    q: 'How do I cancel?',
    a: 'Pro renews monthly until you cancel, and you can cancel anytime in Settings → Billing. Pro 90-Day is charged once and never renews, so there is nothing to cancel.',
  },
  {
    q: "I'm on an existing plan or have credits. What changes?",
    a: "Your current plan and credit balance stay on your account, and you can see and manage them in Settings → Billing. If anything looks off, email operations@screna.ai and we'll sort it out.",
  },
];

// Design: Free $0 / Pro $29 a month / Pro 90-Day $79 one time.
// Pro checks out as the backend ADVANCED tier, so its price shows what that
// tier actually charges ($29.99), not the design's rounded $29.
// Pro 90-Day is a one-time 90-day pass. The backend has no one-time product —
// FLAGSHIP is a monthly subscription — so the card has no tier and its CTA
// does not start a checkout until that product exists.
const PLANS: Plan[] = [
  {
    name: 'Free',
    tier: 'FREE',
    price: '$0',
    tagline: 'Get seen, see your range',
    features: [
      '2 partner-role interviews a month',
      'Recommended and viewed status',
      'Score and rank range',
      'Points behind the top 5',
      '3 interview-report analyses a month',
    ],
    cta: 'Start for free',
    highlighted: false,
  },
  {
    name: 'Pro',
    tier: 'ADVANCED',
    price: '$29.99',
    priceSuffix: '/ month',
    tagline: 'See exactly where you stand',
    features: [
      { text: '15 interviews a month, redos included', strong: true },
      'Exact rank and percentile',
      'Gap by dimension vs. the top 3',
      'Question-by-question feedback',
      '200 practice minutes a month',
      'Every interview-report analysis',
    ],
    footnote: 'Renews monthly until you cancel. Cancel anytime in Account.',
    cta: 'Get Pro',
    highlighted: true,
    badge: 'For an active search',
  },
  {
    name: 'Pro 90-Day',
    tier: null,
    price: '$79',
    priceSuffix: 'one time',
    tagline: 'One job season, one payment',
    features: [
      'Everything in Pro for 90 days',
      { text: '45 interviews, use them anytime', strong: true },
      '600 practice minutes',
      'Reminder before it ends',
    ],
    footnote: 'Charged once. Never renews.',
    cta: 'Get 90 days',
    highlighted: false,
  },
];

const PARTNER_ROLE_STEPS = [
  { num: '01', title: 'One AI interview', desc: 'Built from the job description, about 20 minutes.' },
  { num: '02', title: 'Recommended on every plan', desc: "Completing the interview gets you to the hiring team's list." },
  { num: '03', title: 'Reply within 7 days', desc: 'You see when the hiring team opens your report.' },
];

// ─── Hero logo marquee (old-design scrolling company logos) ───────────────────
interface LogoEntry {
  name: string;
  src: string;
  h?: number;
}

const HERO_LOGOS: LogoEntry[] = [
  { name: 'Apple',     src: '/logos/companies/apple.svg',     h: 32 },
  { name: 'Microsoft', src: '/logos/companies/microsoft.png', h: 28 },
  { name: 'Google',    src: '/logos/companies/google.png',    h: 32 },
  { name: 'Walmart',   src: '/logos/companies/walmart.png',   h: 32 },
  { name: 'Amazon',    src: '/logos/companies/amazon.png',    h: 32 },
  { name: 'Disney',    src: '/logos/companies/disney.png',    h: 32 },
  { name: 'Hulu',      src: '/logos/companies/hulu.png',      h: 30 },
  { name: 'Meta',      src: '/logos/companies/meta.png',      h: 28 },
  { name: 'TikTok',    src: '/logos/companies/tiktok.svg',    h: 30 },
  { name: 'Nvidia',    src: '/logos/companies/nvidia.svg',    h: 26 },
];

// Each slot is 200px → exactly 5 visible at a time
const SLOT_W = 200;

function LogoMarquee({ logos, speed = 30 }: { logos: LogoEntry[]; speed?: number }) {
  const trackW = logos.length * 2 * SLOT_W;
  return (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
      }}
    >
      <style>{`
        @keyframes logo-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .logo-marquee-track { display: flex; align-items: center; will-change: transform; }
        .logo-marquee-track:hover { animation-play-state: paused; }
      `}</style>
      <div
        className="logo-marquee-track py-2"
        style={{ width: trackW, animation: `logo-scroll ${speed}s linear infinite` }}
      >
        {[...logos, ...logos].map((logo, i) => (
          <div
            key={i}
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: SLOT_W, height: 56 }}
          >
            <img
              src={logo.src}
              alt={logo.name}
              style={{ height: logo.h ?? 32, width: 'auto', maxWidth: 120, objectFit: 'contain', userSelect: 'none' }}
              draggable={false}
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = 'none';
                const span = document.createElement('span');
                span.textContent = logo.name;
                span.style.cssText = 'font-size:13px;font-weight:600;color:#4a4d57;white-space:nowrap;';
                img.parentNode?.appendChild(span);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── How It Works — two-column layout ─────────────────────────────────────────

function HowItWorksSection() {
  return (
    <div className="w-full flex items-center justify-center">
      <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-10 flex flex-col lg:flex-row gap-10 lg:gap-12 xl:gap-16 items-center py-20 lg:py-0">

        {/* ── Left text column ── */}
        <div className="w-full lg:w-[400px] xl:w-[440px] flex-shrink-0">
          <p
            data-reveal data-delay="0"
            className="text-[11px] tracking-[2.5px] mb-5 not-italic"
            style={{ color: '#2E5BFF', fontFamily: "'Inter', sans-serif" }}
          >
            PROCESS
          </p>
          <h2
            data-reveal data-delay="80"
            className="font-normal tracking-[-0.8px] mb-5"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(34px, 3.2vw, 52px)',
              lineHeight: '1.15',
              color: '#0A0A0A',
            }}
          >
            How Screna Works
          </h2>
          <p
            data-reveal data-delay="160"
            className="text-[17px] leading-relaxed mb-10"
            style={{ color: '#2A2A2A', fontFamily: "'Inter', sans-serif", maxWidth: 400 }}
          >
            Choose a real role, interview once, and see exactly where you stand.
          </p>

          <div className="flex flex-col gap-4 mb-10">
            {[
              { num: 'GROUP 01', label: 'Choose' },
              { num: 'GROUP 02', label: 'Interview' },
              { num: 'GROUP 03', label: 'Improve' },
            ].map((s, i) => (
              <div key={s.label} data-reveal data-delay={240 + i * 80} className="flex items-center gap-3">
                <span className="text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#8A8F9A', letterSpacing: '0.06em' }}>
                  {s.num}
                </span>
                <div className="h-px w-4 flex-shrink-0" style={{ background: '#E8E8EA' }} />
                <span className="text-[14px]" style={{ fontFamily: "'Inter', sans-serif", color: '#4A4D57' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div data-reveal data-delay="480" className="rounded-[1px]" style={{ width: 120, height: 2, background: '#2E5BFF' }} />
        </div>

        {/* ── Right diagram column ── */}
        <div data-reveal data-delay="200" className="flex-1 min-w-0 hidden lg:flex items-center justify-start">
          <img
            src={imgWorkflowDiagram}
            alt="How Screna Works diagram"
            width={1600}
            height={1549}
            loading="lazy"
            decoding="async"
            style={{ width: '100%', maxWidth: 800, height: 'auto', display: 'block' }}
          />
        </div>

        {/* Mobile: stacked card list */}
        <div className="lg:hidden w-full flex flex-col gap-3 mt-2">
          {[
            { num: '01', title: 'InterviewPrep Note', desc: 'Browse real interview signal to know what to expect.' },
            { num: '02', title: 'Resume context', desc: 'Personalize questions to your actual background.' },
            { num: '03', title: 'Quick Mock', desc: 'Start fast with a low-friction practice mode.' },
            { num: '04', title: 'Target job / JD', desc: 'Paste a JD or choose a recommended target role.' },
            { num: '05', title: 'AI Mock session', desc: 'Tailored questions, adjustable focus, built around your goal.' },
            { num: '06', title: 'Feedback + next reps', desc: 'Improve, retry, or move into mentor review.' },
            { num: '07', title: 'Mentorship', desc: 'Optional human guidance for strategy and confidence.' },
          ].map(card => (
            <div key={card.num} className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'white', border: '1px solid #2E5BFF' }}>
              <span className="text-[10px] font-semibold flex-shrink-0 mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#1231B8' }}>{card.num}</span>
              <div>
                <p className="text-[14px] font-semibold leading-tight" style={{ fontFamily: "'Inter', sans-serif", color: '#0A0A0A' }}>{card.title}</p>
                <p className="text-[12px] leading-relaxed mt-1" style={{ fontFamily: "'Inter', sans-serif", color: '#4A4D57' }}>{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}


// ─── Main Home Page ───────────────────────────────────────────────────────────
export function HomePage() {
  useSeo({ ...SEO_COPY.home, path: '/', jsonLd: [ORGANIZATION_JSON_LD] });

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { planData, isLoading: isPlanLoading, changePlan } = useUserPlan();
  const { toast } = useToast();
  const posthog = usePostHog();

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const avatarRef = useRef<HTMLDivElement>(null);
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  // P4: how many times this visitor has tried to pay in this page session.
  // A retry after a failure is the same intent, not a second buyer — the
  // dashboard groups on this so one person retrying three times reads as one.
  const paymentAttemptRef = useRef(0);

  const goAuth = () => navigate('/auth');
  const goSignup = () => navigate('/auth?signup=true');

  // Pay-as-you-go top-up. Signed-out visitors go to auth first (can't pay without
  // an account); signed-in users open the Buy-credits modal and check out via Stripe.
  const handleAddCredits = () => {
    if (!user) { goAuth(); return; }
    setShowBuyCredits(true);
  };

  const handleBuyCredits = async (n: number) => {
    // 04 — 变现: 点击购买 credits（发起 checkout 前上报）
    safeCapture(posthog, EVENTS.BUY_CREDITS_CLICKED);
    try {
      const res = await PaymentService.purchaseCustomPack(n);
      const url = res?.data?.data?.url ?? res?.data?.url;
      if (url) { markPendingCheckout('credits', String(n)); window.location.href = url; return; }
      toast({ title: 'Credits added', description: `${n} credits added to your balance.` });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Unable to start checkout. Please try again.';
      toast({ title: 'Checkout failed', description: message, variant: 'destructive' });
    } finally {
      setShowBuyCredits(false);
    }
  };

  // Initials for the logged-in avatar
  const nameParts = (user?.name || '').trim().split(' ');
  const avatarInitials =
    nameParts[0] && nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : nameParts[0]
      ? nameParts[0][0].toUpperCase()
      : 'U';

  // Fetch the profile avatar so the icon matches the personal center header.
  useEffect(() => {
    if (!user) return;
    getPersonalInfo()
      .then((res: { data: { data?: { avatarUrl?: string } } }) => {
        const url = (res.data?.data ?? res.data)?.avatarUrl;
        if (url) setAvatarUrl(url);
      })
      .catch(() => {});
  }, [user]);

  // Close the avatar dropdown when clicking outside of it.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setAvatarOpen(false);
    logout();
    navigate('/');
  };

  // Pricing CTA. New subscribers → POST /payments/subscriptions (Stripe Checkout).
  // Existing subscribers manage plan changes in Settings → Billing, so send them
  // there rather than changing tier from the landing page.
  // Billing cycle is MONTHLY-only for now.
  const handleSelectPlan = async (plan: Plan) => {
    const tier = plan.tier;
    // Pro 90-Day has no backend product yet (see PLANS) — don't start a
    // recurring checkout for a card that promises a one-time charge.
    if (!tier) {
      toast({
        title: 'Not available yet',
        description: `${plan.name} isn't available to buy yet. Email ${SUPPORT_EMAIL} and we'll help you get set up.`,
      });
      return;
    }
    // 04 — 变现: 选择套餐（发起 checkout 前上报；billing 目前仅 MONTHLY）
    safeCapture(posthog, EVENTS.PLAN_SELECTED, {
      plan_tier: tier.toLowerCase(),
      billing_cycle: 'monthly',
    });
    if (!user) {
      // Signed-out visitors used to land on a bare /auth and, after signing in,
      // on the dashboard — nowhere near the plan they had just picked. Carry the
      // pricing section as the return target (F4).
      navigate(buildAuthPath('/#pricing'));
      return;
    }
    if (tier === 'FREE') {
      navigate('/dashboard');
      return;
    }
    // Clicking the plan you're already on → manage it in Settings → Billing.
    if (planData.currentPlan.toUpperCase() === tier) {
      navigate('/settings?tab=billing');
      return;
    }
    // Subscribers on a current tier manage prorated changes in Settings →
    // Billing. Legacy rows (old PREMIUM/STARTER) render as Free here, so they
    // fall through to changePlan() below, which detects the existing row and
    // uses the tier-change endpoint instead of POSTing a second subscription.
    if (planData.currentPlan !== 'Free') {
      navigate('/settings?tab=billing');
      return;
    }

    setLoadingTier(tier);
    const attempt = (paymentAttemptRef.current += 1);
    const paymentProps = {
      entry: 'landing_pricing',
      payment_type: 'subscription',
      plan_tier: tier.toLowerCase(),
      attempt,
    };
    // P4: from here on the front end can see what happened. It cannot see
    // whether money moved — that is the Stripe webhook — so these events say
    // "we asked" / "the ask failed" / "we handed off to Checkout", nothing more.
    safeCapture(posthog, EVENTS.PAYMENT_REQUEST_STARTED, paymentProps);
    try {
      // changePlan() owns the create-vs-change-tier decision (and its own error
      // toast) using the subscription record fetched when the app loaded.
      const planType = (tier.charAt(0) + tier.slice(1).toLowerCase()) as PlanType;
      const result = await changePlan(planType);
      if (!result.success) {
        safeCapture(posthog, EVENTS.PAYMENT_REQUEST_FAILED, { ...paymentProps, reason: 'change_plan_rejected' });
        return;
      }
      if (result.url) {
        safeCapture(posthog, EVENTS.CHECKOUT_STARTED, { ...paymentProps, flow: 'change_plan' });
        window.location.href = result.url;
        return;
      }

      const res = await PaymentService.createSubscription(tier, 'MONTHLY');
      const url = res?.data?.data?.url ?? res?.data?.url;
      if (url) {
        // Stripe returns to /settings?tab=billing for both success and cancel,
        // and a real payment only lands via webhook — leave a marker so the
        // billing page knows to wait instead of showing "Free".
        markPendingCheckout('subscription', tier);
        safeCapture(posthog, EVENTS.CHECKOUT_STARTED, { ...paymentProps, flow: 'create_subscription' });
        window.location.href = url;
      } else {
        // No Checkout URL (e.g. saved payment method) — subscription created directly.
        // No Checkout hop, so nothing will come back through checkout_returned;
        // this is the "直接扣款" path in the acceptance table.
        safeCapture(posthog, EVENTS.SUBSCRIPTION_STARTED, { ...paymentProps, flow: 'saved_payment_method' });
        toast({ title: 'Subscription started', description: `You're now on ${plan.name}.` });
        navigate('/settings?tab=billing');
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Something went wrong. Please try again.';
      console.error('subscription error:', err);
      safeCapture(posthog, EVENTS.PAYMENT_REQUEST_FAILED, { ...paymentProps, reason: 'request_error', message });
      toast({ title: 'Unable to start plan', description: message, variant: 'destructive' });
    } finally {
      setLoadingTier(null);
    }
  };

  // ── Frosted-glass nav on scroll ──────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Scroll reveal observer ────────────────────────────────────────────────
  // Content fades/slides in each time its section enters the viewport, including
  // when you scroll back up. Reduced-motion users get a one-shot reveal.
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers = new WeakMap<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            const delay = prefersReduced ? 0 : parseInt(el.dataset.delay ?? '0', 10);
            const id = window.setTimeout(() => el.classList.add('sr-visible'), delay);
            timers.set(el, id);
            if (prefersReduced) observer.unobserve(el);
          } else if (!prefersReduced) {
            // Cancel any pending reveal and reset so it re-animates next entry.
            const pending = timers.get(el);
            if (pending) { clearTimeout(pending); timers.delete(el); }
            el.classList.remove('sr-visible');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ── 00 — Acquire: landing_page_viewed ─────────────────────────────────────
  // 仅未登录访客上报；等 auth 状态确定（isAuthLoading 结束）后上报一次。
  const landingViewedRef = useRef(false);
  useEffect(() => {
    if (isAuthLoading || user || landingViewedRef.current) return;
    landingViewedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    safeCapture(posthog, EVENTS.LANDING_PAGE_VIEWED, {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      referrer: document.referrer || null,
    });
  }, [isAuthLoading, user, posthog]);

  // ── 00 — Acquire: pricing_viewed ──────────────────────────────────────────
  // /pricing 已 301 到 /#pricing（见 router.tsx），到达 #pricing hash 时上报。
  // 每次到达只报一次（离开 hash 后再次到达会重新上报）；等 auth / plan 加载完
  // 再报，保证 is_logged_in / current_plan 准确。
  const pricingViewedRef = useRef(false);
  useEffect(() => {
    if (location.hash !== '#pricing') {
      pricingViewedRef.current = false;
      return;
    }
    if (pricingViewedRef.current || isAuthLoading || (user && isPlanLoading)) return;
    pricingViewedRef.current = true;
    safeCapture(posthog, EVENTS.PRICING_VIEWED, {
      is_logged_in: !!user,
      current_plan: user ? planData.currentPlan : null,
    });
  }, [location.hash, isAuthLoading, user, isPlanLoading, planData.currentPlan, posthog]);

  // ── Scroll to hash target (e.g. /#pricing, /#faq) ─────────────────────────
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    // Poll until the section has mounted — on a cold load the page isn't laid
    // out yet after a fixed delay, so a single deferred attempt can miss.
    // Scroll is 'instant' so the reveal observer and late layout shifts can't
    // interrupt a long smooth scroll before it reaches the target.
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
        clearInterval(timer);
      } else if (++tries >= 20) {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [location.hash]);

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Inter', sans-serif", overflowX: 'clip' }}
    >
      {/* ─── Buy credits modal (pay-as-you-go) ─── */}
      <AnimatePresence>
        {showBuyCredits && (
          <BuyCreditsModal onClose={() => setShowBuyCredits(false)} onPurchase={handleBuyCredits} />
        )}
      </AnimatePresence>


      {/* ─── Nav ─── */}
      <nav
        className="fixed left-0 right-0 z-50"
        style={{
          top: 'var(--topbar-h, 0px)',
          height: 72,
          backgroundColor: scrolled ? 'rgba(255,255,255,0.82)' : '#ffffff',
          backdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
          borderBottom: scrolled
            ? '1px solid rgba(0,0,0,0.07)'
            : '1px solid #E8E8EA',
          boxShadow: scrolled
            ? '0 1px 12px rgba(0,0,0,0.04)'
            : 'none',
          transition: 'background-color 220ms ease-out, backdrop-filter 220ms ease-out, -webkit-backdrop-filter 220ms ease-out, border-color 220ms ease-out, box-shadow 220ms ease-out',
        }}
      >
        <div className="relative max-w-[1440px] mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center">
            <img
              src={imgLogo}
              alt="Screna"
              className="h-6 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map(({ label: link, href }) => (
              <a
                key={link}
                href={href}
                className="text-[14px] transition-colors duration-150"
                style={{ color: '#4A4D57', fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.color = '#2E5BFF')
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.color = '#4A4D57')
                }
              >
                {link}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              to="/employers"
              className="hidden md:inline-flex items-center justify-center h-9 px-4 rounded-[7px] text-[14px] font-medium transition-colors duration-150 text-[#4A4D57] hover:text-[#0A0A0A]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              For employers
            </Link>
            {user ? (
              <div className="relative hidden md:block" ref={avatarRef}>
                <button
                  onClick={() => setAvatarOpen((v) => !v)}
                  aria-label="Account menu"
                  title={user.name || 'My Account'}
                  className="inline-flex w-9 h-9 rounded-full overflow-hidden items-center justify-center font-semibold text-[13px] text-white transition-all duration-150 hover:opacity-90 active:scale-95 bg-[#2E5BFF] border border-[#2E5BFF]"
                >
                  {avatarUrl || user.avatar ? (
                    <img src={avatarUrl || user.avatar} alt={avatarInitials} className="w-full h-full object-cover" />
                  ) : (
                    avatarInitials
                  )}
                </button>
                {avatarOpen && (
                  <div
                    className="absolute top-full right-0 mt-3 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl border border-[#F0F0F2] overflow-hidden z-50 p-1.5 origin-top-right"
                    style={{ boxShadow: '0 16px 48px -12px rgba(10,10,10,0.12)' }}
                  >
                    <div className="px-3 py-2.5 border-b border-[#F0F0F2] mb-1">
                      <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                        {user.name || 'My Account'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Coins className="w-3 h-3 text-[#2E5BFF]" />
                        <span className="text-xs text-[#8a8f9a]">
                          {isPlanLoading
                            ? 'Loading…'
                            : `${planData.permanentCreditBalance} credit${planData.permanentCreditBalance !== 1 ? 's' : ''} remaining`}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4a4d57] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] rounded-lg transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 opacity-50" />
                      Personal Center
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4a4d57] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4 opacity-50" />
                      Settings
                    </Link>
                    <div className="border-t border-[#F0F0F2] mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50/60 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4 opacity-60" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={goAuth}
                  className="hidden md:inline-flex items-center justify-center h-9 px-4 rounded-[7px] text-[14px] font-medium transition-all duration-150"
                  style={{ color: '#4A4D57', fontFamily: "'Inter', sans-serif", background: 'transparent' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#0A0A0A')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#4A4D57')}
                >
                  Log in
                </button>
                <button
                  onClick={goSignup}
                  className="hidden md:inline-flex items-center justify-center h-9 px-5 rounded-full text-[14px] font-medium text-white transition-all duration-150 active:scale-95"
                  style={{ background: '#2E5BFF', fontFamily: "'Inter', sans-serif" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#1E48E6')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#2E5BFF')}
                >
                  Sign up
                </button>
              </>
            )}
            <button
              className="md:hidden p-2 rounded-lg"
              style={{ color: '#0A0A0A' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden bg-white border-t px-6 py-4 flex flex-col gap-4"
            style={{ borderColor: '#E8E8EA' }}
          >
            {NAV_LINKS.map(({ label: link, href }) => (
              <a
                key={link}
                href={href}
                className="text-[15px]"
                style={{ color: '#4A4D57' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link}
              </a>
            ))}
            <Link
              to="/employers"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[15px] font-medium"
              style={{ color: '#2E5BFF' }}
            >
              For employers
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[15px]"
                  style={{ color: '#4A4D57' }}
                >
                  Personal Center
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[15px]"
                  style={{ color: '#4A4D57' }}
                >
                  Settings
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                  className="inline-flex items-center justify-center h-10 px-5 rounded-[7px] text-[14px] font-medium w-full"
                  style={{ color: '#EF4444', background: 'transparent', border: '1px solid #FCA5A5' }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={goAuth}
                  className="inline-flex items-center justify-center h-10 px-5 rounded-[7px] text-[14px] font-medium w-full"
                  style={{ color: '#4A4D57', background: 'transparent' }}
                >
                  Log in
                </button>
                <button
                  onClick={goSignup}
                  className="inline-flex items-center justify-center h-10 px-5 rounded-[7px] text-[14px] font-medium text-white w-full"
                  style={{ background: '#2E5BFF' }}
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        )}
      </nav>


      {/* ─── Page-wide styles ─── */}
      <style>{`
        .hero-cta:hover { background: #1E48E6 !important; box-shadow: 0 10px 32px rgba(46,91,255,0.55) !important; transform: translateY(-1px); }
        .hero-cta:active { transform: scale(0.97) translateY(0); }

        /* ── Scroll reveal ───────────────────────────────────────────── */
        [data-reveal] {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 550ms cubic-bezier(0.16,1,0.3,1),
                      transform 550ms cubic-bezier(0.16,1,0.3,1);
          will-change: opacity, transform;
        }
        [data-reveal].sr-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (max-width: 768px) {
          [data-reveal] { transform: translateY(12px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-reveal] {
            transform: none !important;
            transition: opacity 200ms linear !important;
          }
          nav {
            transition: none !important;
          }
        }

        /* Hard stop for horizontal overflow from any section (the hero's
           decorative objects bleed past the edges on purpose). clip, not
           hidden, so it doesn't create a scroll container. */
        html, body { overflow-x: clip; max-width: 100%; }
        html {
          scroll-padding-top: calc(72px + var(--topbar-h, 0px));
          scroll-behavior: smooth;
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto !important; }
        }
      `}</style>

      {/* ─── Hero ─── */}
      <section
        className="relative overflow-visible lg:overflow-hidden"
        style={{
          paddingTop: 'calc(72px + var(--topbar-h, 0px))',
          backgroundColor: '#ffffff',
          backgroundImage: 'radial-gradient(circle at 12px 12px, rgba(46,91,255,0.13) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* White gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 1,
            background: 'linear-gradient(to bottom, #ffffff 0%, #ffffff 42%, rgba(255,255,255,0.6) 58%, rgba(255,255,255,0) 72%)',
          }}
        />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-16 pb-10 flex flex-col items-center relative" style={{ zIndex: 2 }}>

          {/* ── Decorative objects ── */}
          <div className="absolute pointer-events-none hidden lg:block" style={{ left: 'calc((100% - 100vw) / 2 + 16px)', top: 44, zIndex: 1 }}>
            <img src={imgTeacup} alt="" width={236} height={214} decoding="async" style={{ width: 118, height: 94, objectFit: 'contain', transform: 'rotate(22.29deg)', display: 'block' }} />
          </div>
          <div className="absolute pointer-events-none hidden lg:block" style={{ right: 'calc((100% - 100vw) / 2)', top: -50, zIndex: 1 }}>
            <img src={imgNotebook} alt="" width={974} height={930} decoding="async" style={{ width: 487, height: 325, objectFit: 'contain', transform: 'translateX(22%) rotate(-31.73deg)', transformOrigin: 'top right', display: 'block' }} />
          </div>
          <div className="absolute pointer-events-none hidden lg:block" style={{ left: 'calc((100% - 100vw) / 2)', top: 270, zIndex: 1 }}>
            <img src={imgJobOffer} alt="" width={824} height={634} decoding="async" style={{ width: 412, height: 275, objectFit: 'contain', transform: 'translateX(-56%) rotate(-11.89deg)', display: 'block' }} />
          </div>
          <div className="absolute pointer-events-none hidden lg:block" style={{ right: 'calc((100% - 100vw) / 2 + 20px)', top: 440, zIndex: 1 }}>
            <img src={imgMicrophone} alt="" width={428} height={419} decoding="async" style={{ width: 214, height: 143, objectFit: 'contain', transform: 'rotate(-37.94deg)', display: 'block' }} />
          </div>

          {/* Pill badge */}
          <div
            data-reveal data-delay="0"
            className="relative inline-flex items-center px-4 py-1.5 rounded-full text-[12px] leading-[18px] mb-8"
            style={{ background: '#F0F3FF', color: '#2E5BFF', zIndex: 2 }}
          >
            ✶ BUILT ONLY FOR TECH ROLES
          </div>

          {/* Headline */}
          <h1
            data-reveal data-delay="100"
            className="relative text-center font-medium tracking-[-0.5px] sm:tracking-[-1.5px] mb-7 max-w-[820px]"
            style={{ fontSize: 'clamp(36px, 6vw, 64px)', lineHeight: 1.25, color: '#0A0A0A', zIndex: 2 }}
          >
            Know where you stand.{' '}
            <br className="hidden sm:block" />
            Get seen by real tech roles.
          </h1>

          {/* Sub text */}
          <p
            data-reveal data-delay="200"
            className="relative text-center text-[16px] sm:text-[17px] leading-[27.6px] mb-10 max-w-[620px]"
            style={{ color: '#4A4D57', zIndex: 2 }}
          >
            Verified roles only, and a reply within 7 days on partner roles. Your multi-dimension report and interview recording reach the hiring team. See your rank, your gap, and what to fix next.
          </p>

          {/* CTAs */}
          <div data-reveal data-delay="300" className="relative flex flex-wrap items-center justify-center gap-3 mb-12" style={{ zIndex: 2 }}>
            <button
              onClick={goSignup}
              className="hero-cta inline-flex items-center gap-2.5 h-12 px-7 rounded-full text-[15px] font-semibold text-white transition-all duration-200"
              style={{ background: '#2E5BFF', boxShadow: '0 8px 24px rgba(46,91,255,0.4)' }}
            >
              <span className="rounded-full bg-white" style={{ width: 5, height: 5, opacity: 0.6 }} />
              Start Free
            </button>
            <Link
              to="/opportunities"
              className="inline-flex items-center h-12 px-6 rounded-full text-[15px] font-medium transition-colors duration-150 hover:bg-[#F2F5FF]"
              style={{ color: '#2E5BFF', border: '1px solid rgba(46,91,255,0.3)' }}
            >
              Browse partner roles
            </Link>
          </div>

          {/* Product preview */}
          <div data-reveal data-delay="400" className="relative w-full flex justify-center" style={{ zIndex: 2 }}>
            <HeroPreview />
          </div>

          {/* Logos */}
          <div className="relative w-full mt-12 pt-7" style={{ borderTop: '1px solid #E8E8EA', zIndex: 2 }}>
            <p className="text-center text-[12px] tracking-[0.24px] mb-6" style={{ color: '#90A1B9' }}>
              Members have landed roles at
            </p>
            <LogoMarquee logos={HERO_LOGOS} />
          </div>
        </div>
      </section>

      {/* ─── Why Screna ─── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <SectionIntro
            eyebrow="WHY SCRENA"
            title={<>No ghost jobs.<br />No resume pile.</>}
            sub="One role-specific AI interview fixes the first round on both sides."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 lg:mt-16">
            <AudienceCard
              eyebrow="For Job Seekers"
              tone="primary"
              items={[
                { title: 'Real roles only', desc: 'Open roles are re-checked every 24 hours. Closed postings come down automatically.' },
                { title: 'Always hear back', desc: 'Partner roles reply within 7 days, and you see when the hiring team opens your report.' },
                { title: 'Seen as more than a resume', desc: 'Hiring teams get your four-dimension report and your interview recording, not a one-page PDF.' },
              ]}
              action={
                <Link
                  to="/opportunities"
                  className="inline-flex items-center h-10 px-6 rounded-full text-[14px] font-medium text-white transition-colors duration-150 bg-[#2E5BFF] hover:bg-[#1E48E6]"
                >
                  Browse partner roles
                </Link>
              }
            />
            <AudienceCard
              eyebrow="For Hiring Teams"
              tone="neutral"
              items={[
                { title: 'No AI-applied resume pile', desc: 'Nobody reaches your list without finishing an interview for your role.' },
                { title: 'Every candidate arrives with a report', desc: 'Score, four dimensions and checklist results, already ranked.' },
                { title: 'Questions that fit the role', desc: 'Your job description, requirements and screening checklist shape what candidates are asked.' },
              ]}
              action={
                <Link
                  to="/employers"
                  className="inline-flex items-center h-10 px-6 rounded-full text-[14px] font-medium transition-colors duration-150 bg-white hover:bg-[#F7F9FF]"
                  style={{ color: '#0A0A0A', border: '1px solid #E2E8F0' }}
                >
                  For employers
                </Link>
              }
            />
          </div>
        </div>
      </section>

      {/* ─── The Screna system (tabs) ─── */}
      <section id="how-it-works" className="py-20" style={{ background: '#FBFBFB' }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <SystemTabsSection />
        </div>
      </section>

      {/* ─── Process diagram ─── */}
      <section id="process" className="bg-white relative lg:min-h-[733px] flex">
        <HowItWorksSection />
      </section>

      {/* ─── Partner roles ─── */}
      <section className="py-20 lg:py-24" style={{ background: '#F7F9FF' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
          <SectionIntro
            eyebrow="PARTNER ROLES"
            title="Verified roles. Real hiring teams."
            titleSize="clamp(32px, 4vw, 44px)"
            sub="Every partner role has a hiring team that agreed to review Screna candidates and reply within 7 days."
            subMaxWidth={520}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-10">
            {PARTNER_ROLE_STEPS.map((s, i) => (
              <div
                key={s.num}
                data-reveal data-delay={i * 80}
                className="bg-white rounded-2xl p-6"
                style={{ border: '1px solid #DDE6FF' }}
              >
                <p className="text-[10px] tracking-[0.6px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#8A8F9A' }}>
                  {s.num}
                </p>
                <p className="text-[15px] font-semibold leading-[22.5px] mt-3" style={{ color: '#0A0A0A' }}>{s.title}</p>
                <p className="text-[13px] leading-[21px] mt-1.5" style={{ color: '#4A4D57' }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <Link
              to="/opportunities"
              className="hero-cta inline-flex items-center h-12 px-8 rounded-full text-[15px] font-semibold text-white transition-all duration-200"
              style={{ background: '#2E5BFF', boxShadow: '0 6px 20px rgba(46,91,255,0.3)' }}
            >
              Browse partner roles
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-20 lg:py-28" style={{ background: '#D0E0F8' }}>
        <div className="max-w-[1257px] mx-auto px-4 sm:px-6 lg:px-10">
          <SectionIntro
            eyebrow="PRICING"
            title="Start free. Get seen on every plan."
            sub="Every plan can interview for partner roles and get recommended. Paid plans show exactly where you stand."
            subMaxWidth={560}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-14">
            {PLANS.map((plan, i) => (
              <PricingCard
                key={plan.name}
                plan={plan}
                revealDelay={i * 80}
                loading={!!plan.tier && loadingTier === plan.tier}
                isCurrent={!!user && !isPlanLoading && !!plan.tier && plan.tier !== 'FREE' && planData.currentPlan.toUpperCase() === plan.tier}
                onSelect={() => handleSelectPlan(plan)}
              />
            ))}
          </div>
          <div className="pt-6">
            <AddOnRow onAdd={handleAddCredits} />
          </div>
        </div>
      </section>

      {/* ─── For hiring teams ─── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <p data-reveal className="text-[11px] tracking-[2.5px]" style={{ color: '#2E5BFF' }}>FOR HIRING TEAMS</p>
            <h2
              data-reveal data-delay="80"
              className="font-normal tracking-[-0.8px] mt-5"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(34px, 4.2vw, 52px)', lineHeight: 1.15, color: '#0A0A0A' }}
            >
              Only see candidates who showed up.
            </h2>
            <p data-reveal data-delay="160" className="text-[17px] leading-[27.6px] mt-5" style={{ color: '#4A4D57' }}>
              See the full ranked list free. Unlock the people you want to talk to.
            </p>
            <ul data-reveal data-delay="240" className="flex flex-col gap-4 mt-8">
              {[
                'No pile of AI-applied resumes',
                'Only candidates with a finished first-round interview and a report',
                'Questions shaped by your job description and screening checklist',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <img src={iconCheckCircle} alt="" width={18} height={18} className="flex-shrink-0 mt-0.5" />
                  <span className="text-[15px] leading-[20.6px]" style={{ color: '#0A0A0A' }}>{t}</span>
                </li>
              ))}
            </ul>
            <div data-reveal data-delay="320" className="flex flex-wrap items-center gap-3 mt-10">
              <Link
                to="/employer/login"
                className="inline-flex items-center h-12 px-7 rounded-full text-[15px] font-semibold text-white transition-colors duration-150 bg-[#0A0A0A] hover:bg-[#262626]"
              >
                Post a role free
              </Link>
              <Link
                to="/employers"
                className="inline-flex items-center h-12 px-6 rounded-full text-[15px] font-medium transition-colors duration-150 hover:bg-[#F7F9FF]"
                style={{ color: '#4A4D57', border: '1px solid #E2E8F0' }}
              >
                See how it works for employers
              </Link>
            </div>
            <p data-reveal data-delay="360" className="text-[12px] leading-[18px] mt-5" style={{ color: '#90A1B9' }}>
              Free to start · Business from $399 a month
            </p>
          </div>
          <div data-reveal data-delay="200">
            <EmployerPreview />
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="bg-white py-20 lg:py-28">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">
            <h2
              data-reveal
              className="font-normal tracking-[-0.8px]"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(34px, 4.2vw, 52px)', lineHeight: 1.2, color: '#0A0A0A' }}
            >
              Common Questions
            </h2>
            <div style={{ borderBottom: '1px solid #E1E4EA' }}>
              {FAQ_ITEMS.map((item, i) => (
                <FaqRow
                  key={item.q}
                  item={item}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                  revealDelay={i * 60}
                />
              ))}
            </div>
          </div>
          <div
            data-reveal
            className="mt-16 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6"
            style={{ background: '#F7F9FF', border: '1px solid #DDE6FF' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-semibold leading-[25.5px]" style={{ color: '#0A0A0A' }}>Not sure where to start?</p>
              <p className="text-[14px] leading-[22.75px] mt-2" style={{ color: '#4A4D57' }}>
                You're not alone. Email us at{' '}
                <a href="mailto:operations@screna.ai" className="hover:underline" style={{ color: '#2E5BFF' }}>operations@screna.ai</a>
                . A real person on the Screna team will help you figure out what to focus on next. We reply within one business day, Mon–Fri, 9:00 AM–5:00 PM ET.
              </p>
            </div>
            <a
              href="mailto:operations@screna.ai"
              className="self-start sm:self-center inline-flex items-center h-10 px-6 rounded-full text-[14px] font-medium text-white whitespace-nowrap transition-colors duration-150 bg-[#2E5BFF] hover:bg-[#1E48E6]"
            >
              Email the team
            </a>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section
        className="py-24 lg:py-32 overflow-hidden relative"
        style={{
          background: 'linear-gradient(176.59deg, rgb(18,49,184) 12.75%, rgb(46,91,255) 50%, rgb(74,123,255) 87.25%)',
        }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 text-center relative">
          <div data-reveal data-delay="0" className="flex items-center justify-center gap-3 mb-8">
            <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.6)' }} />
            <span className="text-[12px] font-semibold tracking-[1.68px] uppercase" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Get started
            </span>
            <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.6)' }} />
          </div>
          <h2
            data-reveal data-delay="100"
            className="font-normal tracking-[-1.5px] mb-4 mx-auto"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(34px, 4.2vw, 52px)',
              lineHeight: 1.25,
              color: '#FFFFFF',
              maxWidth: 700,
            }}
          >
            Your next role is already within reach.
          </h2>
          <p data-reveal data-delay="200" className="text-[18px] mb-10" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Start free in under 2 minutes.
          </p>
          <button
            data-reveal data-delay="300"
            onClick={goSignup}
            className="inline-flex items-center gap-2 h-12 px-8 rounded-full text-[14px] font-semibold transition-all duration-150 active:scale-95 bg-white hover:bg-[#F0F3FF]"
            style={{ color: '#1231B8' }}
          >
            <span className="rounded-full" style={{ width: 6, height: 6, background: '#2E5BFF' }} />
            Start free
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ background: '#F9FAFB' }}>
        <div className="max-w-[1280px] mx-auto px-6 py-20">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-12 pb-12">
            {/* Brand column */}
            <div className="col-span-2">
              <Link to="/" className="inline-block mb-[22px]">
                <img src={imgLogo} alt="Screna" className="h-6 w-auto object-contain" />
              </Link>
              <p className="text-[15px] leading-[22.5px] mb-6" style={{ color: '#62748E' }}>
                Know where you stand. Get seen by real tech roles.
              </p>
              <div className="flex gap-3">
                <SocialIcon aria-label="X" href="https://x.com/screnaai_">
                  <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                    <path
                      d="M16.5 3C16.5 3 15.975 4.575 15 5.55C16.2 13.05 7.95 18.525 1.5 14.25C3.15 14.325 4.8 13.8 6 12.75C2.25 11.625 0.375 7.2 2.25 3.75C3.9 5.7 6.45 6.825 9 6.75C8.325 3.6 12 1.8 14.25 3.9C15.075 3.9 16.5 3 16.5 3Z"
                      stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                </SocialIcon>
                <SocialIcon aria-label="LinkedIn" href="https://www.linkedin.com/company/screnaai/">
                  <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                    <path d="M12 6C13.1935 6 14.3381 6.47411 15.182 7.31802C16.0259 8.16193 16.5 9.30653 16.5 10.5V15.75H13.5V10.5C13.5 10.1022 13.342 9.72064 13.0607 9.43934C12.7794 9.15804 12.3978 9 12 9C11.6022 9 11.2206 9.15804 10.9393 9.43934C10.658 9.72064 10.5 10.1022 10.5 10.5V15.75H7.5V10.5C7.5 9.30653 7.97411 8.16193 8.81802 7.31802C9.66193 6.47411 10.8065 6 12 6Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4.5 6.75H1.5V15.75H4.5V6.75Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 4.5C3.82843 4.5 4.5 3.82843 4.5 3C4.5 2.17157 3.82843 1.5 3 1.5C2.17157 1.5 1.5 2.17157 1.5 3C1.5 3.82843 2.17157 4.5 3 4.5Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </SocialIcon>
                <SocialIcon aria-label="Email" href="mailto:operations@screna.ai">
                  <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                    <path d="M15 3H3C2.17157 3 1.5 3.67157 1.5 4.5V13.5C1.5 14.3284 2.17157 15 3 15H15C15.8284 15 16.5 14.3284 16.5 13.5V4.5C16.5 3.67157 15.8284 3 15 3Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16.5 5.25L9.7725 9.525C9.54095 9.67007 9.27324 9.74701 9 9.74701C8.72676 9.74701 8.45905 9.67007 8.2275 9.525L1.5 5.25" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </SocialIcon>
                <SocialIcon aria-label="Discord" href="https://discord.gg/7FqHDtea5X">
                  <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                    <path d="M13.545 3.894A12.894 12.894 0 0 0 10.599 3a.048.048 0 0 0-.051.025c-.13.232-.275.535-.376.773a11.892 11.892 0 0 0-3.546 0 7.805 7.805 0 0 0-.382-.773.05.05 0 0 0-.051-.025 12.862 12.862 0 0 0-2.946.894.045.045 0 0 0-.021.018C1.648 6.757 1.131 9.55 1.38 12.308a.054.054 0 0 0 .02.036 12.953 12.953 0 0 0 3.9 1.97.05.05 0 0 0 .055-.018c.3-.41.567-.843.796-1.298a.05.05 0 0 0-.027-.069 8.527 8.527 0 0 1-1.217-.58.05.05 0 0 1-.005-.083c.082-.061.163-.125.241-.19a.048.048 0 0 1 .05-.007c2.552 1.165 5.315 1.165 7.837 0a.048.048 0 0 1 .051.006c.078.065.16.13.242.191a.05.05 0 0 1-.004.083 7.99 7.99 0 0 1-1.218.579.05.05 0 0 0-.026.07c.233.455.5.887.795 1.297a.05.05 0 0 0 .055.019 12.918 12.918 0 0 0 3.907-1.97.051.051 0 0 0 .02-.035c.295-3.046-.494-5.816-2.09-8.396a.04.04 0 0 0-.02-.018ZM6.51 10.67c-.765 0-1.394-.702-1.394-1.563 0-.862.617-1.563 1.394-1.563.783 0 1.406.707 1.394 1.563 0 .861-.617 1.563-1.394 1.563Zm5.155 0c-.764 0-1.394-.702-1.394-1.563 0-.862.617-1.563 1.394-1.563.784 0 1.407.707 1.394 1.563 0 .861-.61 1.563-1.394 1.563Z" fill="#90A1B9" />
                  </svg>
                </SocialIcon>
              </div>
            </div>

            <FooterColumn
              title="Product"
              links={[
                { label: 'Roles', to: '/opportunities' },
                { label: 'Interview Reports', to: '/interview-questions' },
                { label: 'Pricing', to: '#pricing' },
                { label: 'For hiring teams', to: '/employers' },
              ]}
            />
            <FooterColumn
              title="Resources"
              links={[
                { label: 'Blog', to: '/blog' },
                { label: 'FAQ', to: '/faq' },
                { label: 'Help Center', to: '/help' },
                { label: 'Contact', to: '/contact' },
              ]}
            />
            <div>
              <FooterColumn
                title="Community"
                links={[{ label: 'Join our Discord', to: 'https://discord.gg/7FqHDtea5X' }]}
              />
              <div className="mt-8">
                <FooterColumn
                  title="Legal"
                  links={[
                    { label: 'Terms of Service', to: '/terms' },
                    { label: 'Privacy Policy', to: '/privacy' },
                    { label: 'Cookies', to: '/cookies' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-8 gap-3"
            style={{ borderTop: '1px solid #F8FAFC' }}
          >
            <p className="text-[14px]" style={{ color: '#90A1B9' }}>
              © 2026 Screna AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {['System Status', 'Security'].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-[14px] transition-colors duration-150 text-[#90A1B9] hover:text-[#2E5BFF]"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function FooterLink({ label, to }: { label: string; to: string }) {
  const className = 'block text-[14px] leading-[20px] mb-3 transition-colors duration-150';
  const style = { color: '#656D81', fontFamily: "'Inter', sans-serif" } as const;
  const onMouseEnter = (e: React.MouseEvent<HTMLElement>) => ((e.target as HTMLElement).style.color = '#2E5BFF');
  const onMouseLeave = (e: React.MouseEvent<HTMLElement>) => ((e.target as HTMLElement).style.color = '#656D81');

  if (to.startsWith('/')) {
    return (
      <Link to={to} className={className} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        {label}
      </Link>
    );
  }
  return (
    <a href={to} {...(/^https?:/.test(to) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={className} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {label}
    </a>
  );
}

function SocialIcon({ children, 'aria-label': label, href }: { children: ReactNode; 'aria-label': string; href?: string }) {
  const [hovered, setHovered] = useState(false);
  const style = {
    width: 40,
    height: 40,
    border: '0.667px solid #F1F5F9',
    background: hovered ? '#F7F9FF' : 'transparent',
    opacity: hovered ? 1 : 0.85,
  } as const;
  const className = 'flex items-center justify-center rounded-2xl transition-all duration-150';

  // Render an anchor when a destination is provided so the icon is actually clickable.
  // mailto: links stay in-page; external links open in a new tab.
  if (href) {
    const isExternal = /^https?:/.test(href);
    return (
      <a
        aria-label={label}
        href={href}
        className={className}
        style={style}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      aria-label={label}
      className={className}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}


// ─── Section building blocks ──────────────────────────────────────────────────

function SectionIntro({
  eyebrow,
  title,
  sub,
  titleSize = 'clamp(34px, 4.2vw, 52px)',
  subMaxWidth,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  titleSize?: string;
  subMaxWidth?: number;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <p data-reveal className="text-[11px] leading-[16.5px] tracking-[2.5px]" style={{ color: '#2E5BFF' }}>
        {eyebrow}
      </p>
      <h2
        data-reveal data-delay="80"
        className="font-normal tracking-[-0.8px] mt-5"
        style={{ fontFamily: "'Playfair Display', serif", fontSize: titleSize, lineHeight: 1.2, color: '#0A0A0A' }}
      >
        {title}
      </h2>
      {sub && (
        <p
          data-reveal data-delay="160"
          className="text-[16px] sm:text-[17px] leading-[25.5px] mt-5"
          style={{ color: '#595959', maxWidth: subMaxWidth }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function AudienceCard({
  eyebrow,
  tone,
  items,
  action,
}: {
  eyebrow: string;
  tone: 'primary' | 'neutral';
  items: { title: string; desc: string }[];
  action: ReactNode;
}) {
  const primary = tone === 'primary';
  return (
    <div
      data-reveal
      data-delay={primary ? 0 : 100}
      className="rounded-2xl p-6 sm:p-8 flex flex-col"
      style={{
        background: primary ? '#F7F9FF' : '#F9FAFB',
        border: `1px solid ${primary ? '#DDE6FF' : '#E2E8F0'}`,
      }}
    >
      <p
        className="text-[11px] font-semibold leading-[16.5px] tracking-[1.5px] uppercase"
        style={{ color: primary ? '#2E5BFF' : '#0A0A0A' }}
      >
        {eyebrow}
      </p>
      <div className="flex flex-col gap-6 pt-6 pb-8">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-4">
            <span
              className="rounded-full flex-shrink-0 mt-1"
              style={{ width: 8, height: 8, background: primary ? '#2E5BFF' : '#4A4D57' }}
            />
            <div>
              <p className="text-[15px] font-semibold leading-[22.5px]" style={{ color: '#0A0A0A' }}>{item.title}</p>
              <p className="text-[14px] leading-[22.75px] mt-1" style={{ color: '#4A4D57' }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto">{action}</div>
    </div>
  );
}

function Tag({ children, tone }: { children: ReactNode; tone: 'partner' | 'confirmed' | 'pending' }) {
  const styles = {
    partner: { background: '#EEF1FF', color: '#2563EB', border: '1px solid #C7D2FF' },
    confirmed: { background: '#DCFCE7', color: '#16A34A', border: '1px solid transparent' },
    pending: { background: '#FFF7ED', color: '#C2410C', border: '1px solid transparent' },
  }[tone];
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold leading-[15px] whitespace-nowrap" style={styles}>
      {children}
    </span>
  );
}

function TabBullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3 pt-6">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3">
          <span className="rounded-full flex-shrink-0 mt-[7px]" style={{ width: 6, height: 6, background: '#2E5BFF' }} />
          <span className="text-[15px] leading-[20.6px]" style={{ color: '#4A4D57' }}>{t}</span>
        </li>
      ))}
    </ul>
  );
}

// Only the Partner Roles tab is drawn in the design; the other two tabs reuse
// its layout with copy taken from elsewhere on the page.
function SystemTabsSection() {
  const [active, setActive] = useState<SystemTab>('Partner Roles');

  return (
    <div>
      <SectionIntro eyebrow="THE SCRENA SYSTEM" title="How it works" titleSize="clamp(38px, 4.4vw, 54px)" />

      <div data-reveal data-delay="200" className="flex justify-center pt-10">
        <div role="tablist" className="flex max-w-full overflow-x-auto rounded-[26px] p-1" style={{ background: '#EDEDED' }}>
          {SYSTEM_TABS.map((tab) => {
            const on = tab === active;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={on}
                onClick={() => setActive(tab)}
                className="h-11 min-w-[100px] px-4 sm:px-5 rounded-[22px] text-[13px] sm:text-[14px] font-medium whitespace-nowrap transition-colors duration-200"
                style={{ background: on ? '#0A0A0A' : 'transparent', color: on ? '#FBFBFB' : '#767676' }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 pt-12">
        {active === 'Partner Roles' && (
          <>
            <div>
              <p className="text-[16px] sm:text-[17px] leading-[27.6px]" style={{ color: '#595959' }}>
                Roles where the hiring team has agreed to review Screna candidates. Take one AI interview built from the job description and you're recommended, on every plan.
              </p>
              <TabBullets
                items={[
                  'Limited spots and a set time window',
                  'See when the hiring team views your report',
                  'A response within 7 days',
                  'Roles still being confirmed are clearly marked',
                ]}
              />
            </div>
            <div className="flex flex-col gap-3">
              {[
                { title: 'Machine Learning Engineer', meta: '[Company] · 21 of 40 spots left', tags: <><Tag tone="partner">Partner</Tag><Tag tone="confirmed">Confirmed</Tag></> },
                { title: 'Data Engineer', meta: '[Company] · Hiring team not yet confirmed', tags: <><Tag tone="partner">Partner</Tag><Tag tone="pending">Pending</Tag></> },
                { title: 'Site Reliability Engineer', meta: '[Company] · Checked 3 hours ago', tags: <Tag tone="partner">Open role</Tag> },
              ].map((role) => (
                <div
                  key={role.title}
                  className="bg-white rounded-2xl p-5 flex items-start justify-between gap-3"
                  style={{ border: '1px solid #E2E6F0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-[22.5px]" style={{ color: '#0A0A0A' }}>{role.title}</p>
                    <p className="text-[12px] leading-[18px] mt-1" style={{ color: '#6B7280' }}>{role.meta}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5 flex-shrink-0">{role.tags}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {active === 'Interview Report' && (
          <>
            <div>
              <p className="text-[16px] sm:text-[17px] leading-[27.6px]" style={{ color: '#595959' }}>
                Every interview ends in a report: an overall score, four dimensions and your screening checklist results. On partner roles it goes to the hiring team with your recording.
              </p>
              <TabBullets
                items={[
                  'Score and rank against everyone who interviewed',
                  'Four dimensions, so you know which one to work on',
                  'Your recording travels with the report',
                  'See when the hiring team opens it',
                ]}
              />
            </div>
            <div className="flex lg:justify-start">
              <ReportCard />
            </div>
          </>
        )}

        {active === 'Interview Reports Library' && (
          <>
            <div>
              <p className="text-[16px] sm:text-[17px] leading-[27.6px]" style={{ color: '#595959' }}>
                Real interview questions shared by candidates, filtered by company, role and round. Know what gets asked before you sit down.
              </p>
              <TabBullets
                items={[
                  'Questions from real interview loops',
                  'Filter by company, role and round',
                  'Use them to prepare before a partner-role interview',
                ]}
              />
              <Link
                to="/interview-questions"
                className="inline-flex items-center h-10 px-6 mt-8 rounded-full text-[14px] font-medium text-white transition-colors duration-150 bg-[#2E5BFF] hover:bg-[#1E48E6]"
              >
                Browse interview reports
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { title: 'Backend Engineer · System design', meta: 'Onsite round · 4 questions' },
                { title: 'Data Engineer · SQL and pipelines', meta: 'Technical screen · 6 questions' },
                { title: 'Machine Learning Engineer · Behavioral', meta: 'Hiring manager round · 5 questions' },
              ].map((r) => (
                <div
                  key={r.title}
                  className="bg-white rounded-2xl p-5"
                  style={{ border: '1px solid #E2E6F0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
                >
                  <p className="text-[15px] font-semibold leading-[22.5px]" style={{ color: '#0A0A0A' }}>{r.title}</p>
                  <p className="text-[12px] leading-[18px] mt-1" style={{ color: '#6B7280' }}>{r.meta}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Product previews (static illustrations) ──────────────────────────────────

const MONO = "'IBM Plex Mono', monospace";

function BrowserChrome({ url, children, dot = 10 }: { url: string; children: ReactNode; dot?: number }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden w-full" style={{ border: '1px solid #E2E8F0' }}>
      <div className="flex items-center gap-2 h-9 px-4" style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <span key={c} className="rounded-full flex-shrink-0" style={{ width: dot, height: dot, background: c }} />
        ))}
        <div className="flex-1 min-w-0 px-3">
          <div className="h-[22px] max-w-[340px] rounded-lg px-3 flex items-center" style={{ background: '#EAECEF' }}>
            <span className="text-[10px] truncate" style={{ color: '#6B7280' }}>{url}</span>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function ReportCard() {
  const dims = [
    { label: 'Technical accuracy', score: 84, color: '#2E5BFF' },
    { label: 'Communication', score: 80, color: '#2E5BFF' },
    { label: 'Structure', score: 66, color: '#FCD34D', scoreColor: '#F59E0B' },
    { label: 'Completeness', score: 79, color: '#2E5BFF' },
  ];
  return (
    <div
      className="bg-white rounded-[14px] p-5 w-full max-w-[420px]"
      style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold leading-[16.5px]" style={{ color: '#0A0A0A' }}>Your interview report</p>
          <div className="flex gap-1.5 pt-1.5">
            <span className="px-2 py-0.5 rounded-full text-[8px] font-semibold leading-3" style={{ background: '#DCFCE7', color: '#16A34A' }}>Recommended</span>
            <span className="px-2 py-0.5 rounded-full text-[8px] font-semibold leading-3" style={{ background: '#EEF1FF', color: '#2563EB' }}>Viewed</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[26px] leading-[26px] font-semibold" style={{ fontFamily: MONO, color: '#2E5BFF' }}>78</p>
          <p className="text-[8px] leading-3" style={{ color: '#90A1B9' }}>score</p>
        </div>
      </div>
      <div className="mt-3 py-2 flex items-center gap-2" style={{ borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }}>
        <span className="text-[10px]" style={{ color: '#4A4D57' }}>Your rank</span>
        <span className="text-[11px] font-semibold" style={{ fontFamily: MONO, color: '#0A0A0A' }}>#3 of 28</span>
        <span className="ml-auto text-[9px]" style={{ color: '#90A1B9' }}>Recording · 21:04</span>
      </div>
      <p className="text-[8px] leading-3 pt-1" style={{ color: '#90A1B9' }}>Shared with the hiring team with your report</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-3">
        {dims.map((d) => (
          <div key={d.label}>
            <div className="flex items-center justify-between">
              <span className="text-[8px] leading-3" style={{ color: '#90A1B9' }}>{d.label}</span>
              <span className="text-[9px] font-semibold" style={{ fontFamily: MONO, color: d.scoreColor ?? '#0A0A0A' }}>{d.score}</span>
            </div>
            <div className="mt-0.5 h-[3px] rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
              <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: d.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="w-full max-w-[820px]" style={{ boxShadow: '0 24px 64px rgba(46,91,255,0.13), 0 4px 16px rgba(0,0,0,0.06)', borderRadius: 16 }}>
      <BrowserChrome url="app.screna.ai/roles/backend-engineer">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5" style={{ background: '#FAFBFF' }}>
          <div className="rounded-[14px] p-5 flex flex-col text-left" style={{ background: '#2E5CFF', boxShadow: '0 8px 12px rgba(46,91,255,0.25)' }}>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full" style={{ width: 6, height: 6, background: 'rgba(255,255,255,0.7)' }} />
              <span className="text-[10px] font-semibold tracking-[0.5px] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Partner role</span>
            </div>
            <p className="text-[18px] font-semibold leading-[22.5px] text-white pt-3">Backend Engineer</p>
            <p className="text-[12px] leading-[18px] pt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>[Company]</p>
            <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-full rounded-full" style={{ width: '24%', background: 'rgba(255,255,255,0.85)' }} />
            </div>
            <p className="text-[10px] leading-[15px] pt-1.5 pb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>12 of 50 spots left · Closes in 9 days</p>
            <div className="mt-auto h-9 rounded-full bg-white flex items-center justify-center text-[12px] font-semibold" style={{ color: '#1231B8' }}>
              Start interview
            </div>
          </div>
          <ReportCard />
        </div>
      </BrowserChrome>
    </div>
  );
}

function EmployerPreview() {
  const rows = [
    { rank: '#1', name: 'Jamie R.', score: 91, status: 'Contacted', bg: '#FFF7ED', fg: '#C2410C' },
    { rank: '#2', name: 'Candidate', score: 87, status: 'Locked', bg: '#F3F4F6', fg: '#6B7280' },
    { rank: '#3', name: 'Alex P.', score: 84, status: 'Reviewed', bg: '#F0FDF4', fg: '#16A34A' },
  ];
  return (
    <div className="rounded-2xl p-4 sm:p-6" style={{ background: '#FAFBFF', border: '1px solid #E2E8F0' }}>
      <div style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)', borderRadius: 14 }}>
        <BrowserChrome url="app.screna.ai/employer" dot={8}>
          <div className="p-4">
            <p className="text-[11px] font-semibold leading-[16.5px]" style={{ color: '#0F172A' }}>Backend Engineer · 5 candidates</p>
            <div className="pt-3">
              {rows.map((r) => (
                <div key={r.rank} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <span className="w-5 text-[10px]" style={{ fontFamily: MONO, color: '#90A1B9' }}>{r.rank}</span>
                  <span className="flex-1 min-w-0 truncate text-[12px] font-medium" style={{ color: '#0A0A0A' }}>{r.name}</span>
                  <span className="text-[12px] font-semibold" style={{ fontFamily: MONO, color: '#2E5BFF' }}>{r.score}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold leading-[13.5px]" style={{ background: r.bg, color: r.fg }}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </BrowserChrome>
      </div>
    </div>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingCard({
  plan,
  revealDelay = 0,
  loading = false,
  isCurrent = false,
  onSelect,
}: {
  plan: Plan;
  revealDelay?: number;
  loading?: boolean;
  isCurrent?: boolean;
  onSelect: () => void;
}) {
  const hl = plan.highlighted;
  return (
    <div
      data-reveal
      data-delay={revealDelay}
      className="relative rounded-2xl p-7 flex flex-col"
      style={{
        background: hl ? '#F7F9FF' : '#FFFFFF',
        border: hl ? '2px solid #2E5BFF' : '1px solid #E2E6F0',
        boxShadow: hl ? '0 18px 42px rgba(46,91,255,0.14)' : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {plan.badge && (
        <div className="absolute -top-3 right-5 px-3 py-1 rounded-full text-[10px] font-medium leading-[15px] text-white" style={{ background: '#2E5BFF' }}>
          {plan.badge}
        </div>
      )}
      <p className="text-[15px] font-medium leading-[22.5px] pb-2" style={{ color: '#0A0A0A' }}>{plan.name}</p>
      <p className="flex items-baseline gap-2">
        <span className="text-[30px] leading-[45px] tracking-[-0.5px]" style={{ fontFamily: MONO, color: hl ? '#2E5BFF' : '#0A0A0A' }}>
          {plan.price}
        </span>
        {plan.priceSuffix && <span className="text-[13px]" style={{ color: '#90A1B9' }}>{plan.priceSuffix}</span>}
      </p>
      <p className="text-[12px] leading-[18px] pb-6" style={{ color: '#90A1B9' }}>{plan.tagline}</p>
      <ul className="flex-1 flex flex-col gap-3 pb-4">
        {plan.features.map((f) => {
          const text = typeof f === 'string' ? f : f.text;
          return (
            <li key={text} className="flex items-start gap-2.5">
              <img src={hl ? iconCheckPrimary : iconCheckMuted} alt="" width={14} height={14} className="flex-shrink-0 mt-0.5" />
              <span className={`text-[13px] leading-[19.5px] ${typeof f === 'string' ? '' : 'font-medium'}`} style={{ color: '#0A0A0A' }}>
                {text}
              </span>
            </li>
          );
        })}
      </ul>
      {plan.footnote && <p className="text-[11px] leading-[16.5px] pb-4" style={{ color: '#90A1B9' }}>{plan.footnote}</p>}
      <button
        onClick={onSelect}
        disabled={loading}
        className={`w-full h-10 rounded-[7px] text-[13px] font-medium transition-colors duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center ${
          hl ? 'bg-[#2E5BFF] hover:bg-[#1E48E6] text-white' : 'bg-white hover:bg-[#F0F3FF] text-[#1231B8]'
        }`}
        style={{ border: '1px solid #2E5BFF' }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrent ? 'Current plan' : plan.cta}
      </button>
    </div>
  );
}

function AddOnRow({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      data-reveal data-delay="300"
      className="bg-white rounded-2xl px-6 py-5 flex flex-col md:flex-row md:items-center gap-4"
      style={{ border: '1px solid #2E5BFF', boxShadow: '0 12px 14px rgba(46,91,255,0.06)' }}
    >
      <div className="flex items-stretch gap-4 flex-shrink-0">
        <span className="w-[3px] min-h-[28px] rounded-sm" style={{ background: '#2E5BFF' }} />
        <div>
          <p className="text-[11px] font-semibold leading-[16.5px] tracking-[0.88px]" style={{ fontFamily: MONO, color: '#1231B8' }}>ADD-ON</p>
          <p className="text-[15px] font-semibold leading-[22.5px]" style={{ color: '#0A0A0A' }}>Need a few more interviews?</p>
        </div>
      </div>
      <p className="flex-1 text-[14px] leading-[21px]" style={{ color: '#4A4D57' }}>
        Add 5 partner-role interviews anytime. For Pro and Pro 90-day members, valid 90 days.
      </p>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className="inline-flex items-center h-10 px-5 rounded-full text-[14px] font-semibold"
          style={{ fontFamily: MONO, color: '#1231B8', background: '#F7F9FF', border: '1px solid #2E5BFF' }}
        >
          $12
        </span>
        <button
          onClick={onAdd}
          className="inline-flex items-center h-10 px-5 rounded-full text-[14px] font-semibold transition-colors duration-150 bg-white hover:bg-[#F0F3FF]"
          style={{ color: '#1231B8', border: '1px solid #2E5BFF' }}
        >
          Add interviews
        </button>
      </div>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <p className="text-[14px] font-semibold tracking-[-0.35px] mb-5" style={{ color: '#0F172B' }}>
        {title}
      </p>
      {links.map((item) => (
        <FooterLink key={item.label} {...item} />
      ))}
    </div>
  );
}

function FaqRow({
  item,
  open,
  onToggle,
  revealDelay = 0,
}: {
  item: { q: string; a: string };
  open: boolean;
  onToggle: () => void;
  revealDelay?: number;
}) {
  const answerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (answerRef.current) {
      setHeight(open ? answerRef.current.scrollHeight : 0);
    }
  }, [open]);

  return (
    <div data-reveal data-delay={revealDelay} style={{ borderTop: '0.667px solid #E1E4EA' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left py-6 gap-4"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <span
          className="text-[18px] font-medium leading-[23.4px]"
          style={{ color: '#1E232F', fontFamily: "'Inter', sans-serif" }}
        >
          {item.q}
        </span>
        <div className="relative flex-shrink-0" style={{ width: 24, height: 24 }}>
          <div
            className="absolute"
            style={{
              top: 12,
              left: 0,
              width: 24,
              height: 1,
              background: '#5A6172',
            }}
          />
          <div
            className="absolute transition-all duration-200"
            style={{
              top: 0,
              left: 12,
              width: 1,
              height: 24,
              background: '#5A6172',
              transform: open ? 'scaleY(0)' : 'scaleY(1)',
              transformOrigin: 'center',
            }}
          />
        </div>
      </button>
      <div
        className="overflow-hidden ease-out"
        style={{ transition: 'height 250ms ease-out', height }}
      >
        <div ref={answerRef} className="pb-6">
          <p
            className="text-[15px] leading-[24px] whitespace-pre-line"
            style={{ color: '#4A4D57', fontFamily: "'Inter', sans-serif" }}
          >
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}
