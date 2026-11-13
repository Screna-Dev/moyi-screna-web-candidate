import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { usePostHog } from 'posthog-js/react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { AddInterviewsDialog } from '@/components/newDesign/AddInterviewsDialog';
import {
  ADD_ON_INTERVIEWS,
  ADD_ON_PRICE,
  ADD_ON_VALID_DAYS,
  PLAN_INTERVIEWS,
  fetchInterviewQuota,
  grantKeys,
  startQuotaCheckout,
  useInterviewQuota,
} from '@/hooks/useInterviewQuota';
import { markPendingCheckout } from '@/utils/pendingCheckout';
import { PaymentService } from '@/services';
import { hasStoredSession } from '@/services/api';
import { safeCapture } from '@/utils/posthog';
import { useCandidatePrices } from '@/hooks/useCandidatePrices';
import { EVENTS } from '@/constants/analyticsEvents';

// In-app Pricing page (Figma "Candidate pricing", 2026-11), opened from the
// top bar and from Billing's "View pricing". Signed-out visitors are sent to
// the landing page's pricing section by the route. Checkout:
//   Pro        POST /payments/subscriptions (MONTHLY); anyone with a
//              subscription (Pro or a legacy tier) manages it in Billing.
//   Pro 90-Day one-time checkout (C9), returns to Billing which polls the quota.
// Prices and counts are the design's; the API has no price fields.

const BILLING = '/settings?tab=billing';

const PLANS = [
  {
    key: 'FREE' as const,
    name: 'Free',
    price: '$0',
    tagline: 'Get seen, see your range',
    features: [
      `${PLAN_INTERVIEWS.FREE} partner-role interviews a month`,
      'Recommended to the hiring team',
      'Delivered and viewed status',
      'Score and four-dimension breakdown',
      'Rank range (for example, top 25%)',
      'How many points behind the top 5',
      'One 15-minute practice session',
      '3 interview-report analyses a month',
    ],
  },
  {
    key: 'PRO' as const,
    name: 'Pro',
    price: '$29 / month',
    tagline: 'See exactly where you stand',
    badge: 'For an active search',
    features: [
      `${PLAN_INTERVIEWS.PRO} partner-role interviews a month, redos included`,
      'Exact rank: #3 of 28, plus role-family percentile',
      'Which dimension holds you back, compared with the top 3',
      'Question-by-question feedback and what to fix',
      'Redo an interview up to 2 times per role',
      '200 minutes of practice a month',
      'Every interview-report analysis',
    ],
  },
  {
    key: 'PRO_90_DAY' as const,
    name: 'Pro 90-day',
    price: '$79 one time',
    tagline: 'One job season, one payment',
    note: 'Charged once. Never renews automatically.',
    features: [
      'Everything in Pro for 90 days',
      `${PLAN_INTERVIEWS.PRO_90_DAY} interviews to use whenever you need them`,
      '600 minutes of practice',
      'We remind you before it ends',
    ],
  },
];

const COMPARE: [string, string, string, string][] = [
  ['Free interview reports', 'All', 'All', 'All'],
  ['Open roles and alerts', 'Yes', 'Yes', 'Yes'],
  ['Partner-role interviews', `${PLAN_INTERVIEWS.FREE} a month`, `${PLAN_INTERVIEWS.PRO} a month, redos included`, `${PLAN_INTERVIEWS.PRO_90_DAY} over 90 days, redos included`],
  ['Recommended to the hiring team', 'Yes', 'Yes', 'Yes'],
  ['Delivered and viewed status', 'Yes', 'Yes', 'Yes'],
  ['Rank', 'Range only', 'Exact rank + percentile', 'Exact rank + percentile'],
  ['Gap analysis', 'Points behind the top 5', 'By dimension, vs. the top 3', 'By dimension, vs. the top 3'],
  ['Question-by-question feedback', '—', 'Yes', 'Yes'],
  ['Redo an interview', '—', 'Up to 2 per role', 'Up to 2 per role'],
  ['Practice (audio)', 'One 15-minute session', '200 minutes a month', '600 minutes'],
  ['Interview-report analyses', '3 a month', 'All', 'All'],
  [`Add ${ADD_ON_INTERVIEWS} interviews for ${ADD_ON_PRICE}`, '—', 'Yes', 'Yes'],
  ['Billing', '—', 'Monthly, cancel anytime', 'Once, never renews'],
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Does paying improve my chances of being recommended?',
    a: 'No. Everyone who completes a partner-role interview is recommended, on every plan. Paid plans give you analysis, feedback and redos. Hiring teams always see which attempt they are looking at.',
  },
  {
    q: 'What counts as an interview?',
    a: "One completed AI interview for a partner role, about 20 minutes. Starting and leaving early doesn't count. A redo counts as one interview.",
  },
  {
    q: 'Do unused interviews roll over?',
    a: `Pro resets every month. Pro 90-day gives you all ${PLAN_INTERVIEWS.PRO_90_DAY} at once for the full 90 days. Add-on interviews last ${ADD_ON_VALID_DAYS} days.`,
  },
  {
    q: 'How do I cancel Pro?',
    a: (
      <>
        <Link to={BILLING} className="font-medium text-[#3c77f6] hover:underline">
          Account → Billing → Cancel subscription.
        </Link>{' '}
        One click, no calls or forms. You keep Pro until the end of the period you paid for.
      </>
    ),
  },
  { q: 'What happens to my reports when my plan ends?', a: 'Full reports you received on a paid plan stay available to you.' },
  { q: "I'm on the current $30 plan. What changes?", a: "We'll email you before anything changes. Nothing switches without your OK." },
];

const card = 'bg-white border border-[#e1e4ea] rounded-2xl';
const btn = 'w-full py-3 rounded-xl text-[14px] leading-[21px] font-semibold text-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

// /plans: without a session there is no app shell to show it in, so visitors
// see the public pricing section instead.
export function PlansRoute() {
  return hasStoredSession() ? <PlansPage /> : <Navigate to="/#pricing" replace />;
}

export function PlansPage() {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { quota } = useInterviewQuota();
  const [busy, setBusy] = useState<'PRO' | 'PRO_90_DAY' | null>(null);
  const [addOnOpen, setAddOnOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const plan = quota?.plan ?? null;
  // Live prices (#323) once signed in; the published defaults otherwise.
  const prices = useCandidatePrices();
  const priceOf = (key: string, fallback: string) =>
    key === 'PRO' ? `${prices.pro} / month` : key === 'PRO_90_DAY' ? `${prices.pro90Day} one time` : fallback;

  const fail = (err: unknown) => {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast.error(message || "Couldn't start checkout. Please try again.");
    setBusy(null);
  };

  // Stays busy until the redirect: a second checkout would be a second charge.
  const getPro = async () => {
    safeCapture(posthog, EVENTS.PLAN_SELECTED, { plan_tier: 'pro', billing_cycle: 'monthly', source: 'plans_page' });
    // PRO = any paid subscription, including a legacy tier: change it in Billing.
    if (plan === 'PRO') return navigate(BILLING);
    setBusy('PRO');
    try {
      const res = await PaymentService.createSubscription('PRO', 'MONTHLY');
      const url = res?.data?.data?.url ?? res?.data?.url;
      if (url) {
        markPendingCheckout('subscription', 'PRO');
        window.location.href = url;
        return;
      }
      // Charged on a saved card, no Checkout page.
      navigate(BILLING);
    } catch (err) {
      fail(err);
    }
  };

  const getPro90 = async () => {
    safeCapture(posthog, EVENTS.PLAN_SELECTED, { plan_tier: 'pro_90_day', billing_cycle: 'one_time', source: 'plans_page' });
    setBusy('PRO_90_DAY');
    try {
      const before = await fetchInterviewQuota().catch(() => null);
      const url = await startQuotaCheckout('pro-90-day');
      markPendingCheckout('pro-90-day', undefined, undefined, before ? grantKeys(before, 'PRO_90_DAY') : undefined);
      window.location.href = url;
    } catch (err) {
      fail(err);
    }
  };

  const action = (key: (typeof PLANS)[number]['key']) => {
    if (key === 'FREE') {
      return plan === 'FREE' ? (
        <button disabled className={`${btn} bg-[#eef4ff] text-[#3c77f6]`}>Current plan</button>
      ) : (
        <button onClick={() => navigate('/dashboard')} className={`${btn} bg-[#eef4ff] text-[#3c77f6] hover:bg-[#e2ecff]`}>Start free</button>
      );
    }
    if (key === 'PRO') {
      return (
        <button onClick={() => void getPro()} disabled={busy !== null} className={`${btn} bg-[#3c77f6] text-white hover:bg-[#2d6ae0]`}>
          {busy === 'PRO' ? 'Opening checkout…' : plan === 'PRO' ? 'Manage plan' : 'Get Pro'}
        </button>
      );
    }
    return (
      <button onClick={() => void getPro90()} disabled={busy !== null} className={`${btn} bg-[#eef4ff] text-[#3c77f6] hover:bg-[#e2ecff]`}>
        {busy === 'PRO_90_DAY' ? 'Opening checkout…' : 'Get 90 days of Pro'}
      </button>
    );
  };

  return (
    <DashboardLayout headerTitle="Pricing" fullBleed>
      {addOnOpen && (
        <AddInterviewsDialog
          onClose={() => setAddOnOpen(false)}
          onUpgrade={() => {
            setAddOnOpen(false);
            void getPro();
          }}
        />
      )}
      <div className="px-4 sm:px-8 py-6">
        <div className="mx-auto w-full max-w-[1180px]">
          {/* Header strip */}
          <div className={`${card} flex items-center gap-4 px-5 sm:px-8 py-5`}>
            <Link to="/" className="flex-1 text-[20px] leading-[30px] font-bold tracking-[-0.45px] text-[#1e232f]">Screna</Link>
            <Link to="/employers" className="hidden sm:block text-[14px] leading-[21px] font-medium text-[#5a6172] hover:text-[#1e232f]">Hiring?</Link>
            <Link to="/employers#pricing" className="hidden sm:block text-[14px] leading-[21px] font-medium text-[#5a6172] hover:text-[#1e232f]">Employer pricing</Link>
            <Link to="/dashboard" className="text-[14px] leading-[21px] font-semibold text-[#3c77f6] hover:underline">Start free</Link>
          </div>

          {/* Hero */}
          <div className="mx-auto max-w-[800px] pt-8 text-center">
            <h1 className="text-[30px] sm:text-[40px] leading-tight sm:leading-[50px] font-bold tracking-[-0.8px] text-[#1e232f]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Getting seen is always free. Knowing where you stand is Pro.
            </h1>
            <p className="pt-4 text-[16px] leading-7 tracking-[-0.31px] text-[#5a6172]">
              Every plan can interview for partner roles and get recommended to the hiring team. Paid plans show your exact rank, what's holding you back, and let you try again.
            </p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-9">
            {PLANS.map((p) => (
              <div
                key={p.key}
                className={`bg-white rounded-2xl p-6 flex flex-col ${
                  p.key === 'PRO' ? 'border border-[#3c77f6] shadow-[0px_10px_15px_rgba(60,119,246,0.12)]' : 'border border-[#e1e4ea]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-[22px] leading-[33px] font-bold tracking-[-0.26px] text-[#1e232f]">{p.name}</h2>
                  {'badge' in p && p.badge && (
                    <span className="rounded-full bg-[#e6edfa] px-3 py-1 text-[11px] leading-[16.5px] font-semibold text-[#3c77f6]">{p.badge}</span>
                  )}
                </div>
                <p className="pt-5 text-[26px] leading-[39px] font-bold tracking-[0.22px] text-[#1e232f]">{priceOf(p.key, p.price)}</p>
                <p className="pt-1 text-[14px] leading-[21px] tracking-[-0.15px] text-[#5a6172]">{p.tagline}</p>
                <div className="pt-5">{action(p.key)}</div>
                {p.key === 'PRO' && (
                  <p className="pt-[11px] text-[11px] leading-4 text-[#8f99b5]">
                    Renews monthly at {prices.pro} until you cancel. Cancel anytime in{' '}
                    <Link to={BILLING} className="font-medium text-[#3c77f6] hover:underline">Account → Billing</Link>.
                  </p>
                )}
                {'note' in p && p.note && <p className="pt-3 text-[11px] leading-4 text-[#8f99b5]">{p.note}</p>}
                <ul className="mt-5 border-t border-[#e1e4ea] pt-5 flex flex-col gap-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-[10px] text-[13px] leading-5 text-[#4d525e]">
                      <span className="font-bold text-[#3c77f6]" aria-hidden>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Add-on */}
          <div className={`${card} mt-5 p-6 flex flex-col sm:flex-row sm:items-center gap-5`}>
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] leading-[27px] font-bold tracking-[-0.44px] text-[#1e232f]">Out of interviews?</h2>
              <p className="pt-1 max-w-[760px] text-[13px] leading-5 text-[#5a6172]">
                Add {ADD_ON_INTERVIEWS} for {prices.addOn}. For Pro and Pro 90-day members. Valid {ADD_ON_VALID_DAYS} days, used after your plan's interviews. Redo limits stay the same.
              </p>
            </div>
            <p className="text-[24px] leading-9 font-bold text-[#1e232f]">{prices.addOn}</p>
            {plan === 'PRO' || plan === 'PRO_90_DAY' ? (
              <button onClick={() => setAddOnOpen(true)} className="shrink-0 px-5 py-3 rounded-xl bg-[#3c77f6] hover:bg-[#2d6ae0] text-white text-[14px] leading-[21px] font-semibold">
                Add {ADD_ON_INTERVIEWS} interviews
              </button>
            ) : (
              <button disabled className="shrink-0 px-5 py-3 rounded-xl bg-[#edf0f2] text-[#8f99b5] text-[14px] leading-[21px] font-semibold">
                Available with Pro
              </button>
            )}
          </div>

          {/* Compare plans */}
          <h2 className="pt-12 text-[28px] leading-[42px] font-bold text-[#1e232f]" style={{ fontFamily: "'Playfair Display', serif" }}>Compare plans</h2>
          <div className={`${card} mt-5 overflow-x-auto`}>
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-[#f3f6fb]">
                  {['Feature', 'Free', `Pro · ${prices.pro}/mo`, `Pro 90-day · ${prices.pro90Day}`].map((h) => (
                    <th key={h} className="px-5 py-4 text-[13px] leading-[19.5px] font-semibold text-[#1e232f]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([rawFeature, ...values]) => {
                  const feature = rawFeature.replace(` for ${ADD_ON_PRICE}`, ` for ${prices.addOn}`);
                  return (
                  <tr key={feature} className="border-t border-[#e1e4ea]">
                    <td className="px-5 py-[14px] text-[13px] leading-[19.5px] font-medium text-[#1e232f]">{feature}</td>
                    {values.map((v, i) => (
                      <td key={i} className="px-5 py-[14px] text-[13px] leading-[19.5px] text-[#5a6172]">{v}</td>
                    ))}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FAQ */}
          <h2 className="pt-12 text-[28px] leading-[42px] font-bold text-[#1e232f]" style={{ fontFamily: "'Playfair Display', serif" }}>Pricing FAQ</h2>
          <div className="pt-5 pb-8 flex flex-col gap-3">
            {FAQ.map(({ q, a }, i) => {
              const open = openFaq === i;
              return (
                <div key={q} className={`${card} !rounded-xl px-5 py-4`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 text-left"
                  >
                    <span className="text-[14px] leading-[21px] font-semibold text-[#1e232f]">{q}</span>
                    <span className="text-[20px] leading-[30px] font-semibold text-[#3c77f6]" aria-hidden>{open ? '−' : '+'}</span>
                  </button>
                  {open && <div className="pt-3 pr-8 text-[13px] leading-6 text-[#5a6172]">{a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
