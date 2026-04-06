import { useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import {
  Zap,
  Check,
  Mic,
  Video,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  RefreshCw,
  CreditCard,
  Info,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../../../components/newDesign/home/navbar';
import { Footer } from '../../../components/newDesign/home/footer';
import { Button } from '../../../components/newDesign/ui/button';
import { Badge } from '../../../components/newDesign/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentService } from '@/services';

// ─── FAQ Data ────────────────────────────────────────────
const FAQS = [
  {
    q: 'Do credits expire?',
    a: 'Credits never expire. Once purchased, they stay in your account until you use them — no rush, no pressure.',
  },
  {
    q: 'Why does Video cost 1.5 credits/min?',
    a: 'Video sessions require real-time video processing and facial expression analysis on top of voice recognition, which increases the compute cost. Voice sessions use 1 credit/min.',
  },
  {
    q: 'What happens if I end a session early?',
    a: 'You only pay for the minutes you actually used. If a 20-minute session ends after 12 minutes, the remaining 8 minutes of credits are automatically refunded to your balance — no action needed.',
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

// ─── FAQ Item ───────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left group"
      >
        <span className="text-sm text-slate-800">{q}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-50 transition-colors shrink-0 ml-4">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <p className="px-6 pb-4 text-sm text-slate-500 leading-relaxed">{a}</p>
        </motion.div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PRICING PAGE
// ════════════════════════════════════════════════════════════
export function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customCredits, setCustomCredits] = useState(150);
  const customTotal = (() => {
    const q = customCredits;
    const p100 = 0.1499;
    const p1000 = 0.12;
    const theoryPrice = p100 - (p100 - p1000) * Math.log10(q / 100);
    const total = q * theoryPrice;
    const step = 0.5;
    const rounded = Math.ceil(total / step) * step - 0.01;
    return Math.max(rounded, 19.99).toFixed(2);
  })();
  const customUnitPrice = (parseFloat(customTotal) / customCredits).toFixed(2);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const handleBuyStarter = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoadingPack('starter');
    try {
      const response = await PaymentService.purchaseStarterPack();
      const url = response.data?.data?.url;
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setLoadingPack(null);
    }
  };

  const handleBuyGrowth = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoadingPack('growth');
    try {
      const response = await PaymentService.purchaseGrowthPack();
      const url = response.data?.data?.url;
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setLoadingPack(null);
    }
  };

  const handleBuyCustom = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoadingPack('custom');
    try {
      const response = await PaymentService.purchaseCustomPack(customCredits);
      const url = response.data?.data?.url;
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ═══ HERO ═══════════════════════════════════════ */}
        <section className="pt-32 pb-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">
              {/* Left — headline */}
              <FadeIn className="flex-1 max-w-xl">
                <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50 shadow-none rounded-full px-3 py-1 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Credit-based pricing
                </Badge>
                <h1 className="text-4xl sm:text-5xl text-slate-900 tracking-tight mb-4 font-[family-name:var(--font-serif)]">
                  Choose how you practice
                </h1>
                <p className="text-slate-500 text-lg leading-relaxed">
                  Pay by minutes with credits — unused minutes are auto-refunded.
                </p>
              </FadeIn>

              {/* Right — How credits work card */}
              <FadeIn delay={0.15} className="lg:mt-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm w-full lg:w-[320px]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-sm text-slate-800">How credits work</span>
                  </div>
                  <ul className="space-y-3">
                    {[
                      { icon: CreditCard, text: '1 credit = 1 minute of practice' },
                      { icon: RefreshCw, text: 'End early → unused credits auto-refund' },
                      { icon: Video, text: 'Video sessions use 1.5 credits/min' },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                          <item.icon className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-600 leading-relaxed">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ═══ PLANS ═════════════════════════════════════ */}
        <section className="pb-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ── Free Plan ──────────────────────── */}
              <FadeIn>
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm h-full flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-lg text-slate-900 mb-1">Free</h3>
                    <p className="text-sm text-slate-500">Get started with 60 free credits</p>
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl text-slate-900 tracking-tight">$0</span>
                    <span className="text-sm text-slate-400">forever</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {[
                      '60 credits (one-time)',
                      'Text & Voice modes',
                      'Basic AI evaluation',
                      'Session history & transcripts',
                      'Community question bank access',
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-500" />
                        </div>
                        <span className="text-sm text-slate-600">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup-flow">
                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl text-sm border-slate-200"
                    >
                      Start free
                    </Button>
                  </Link>
                </div>
              </FadeIn>

              {/* ── Credit Packs ───────────────────── */}
              <FadeIn delay={0.1}>
                <div className="space-y-4 h-full flex flex-col">
                  {/* Starter Pack */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg text-slate-900">Starter</h3>
                      <span className="text-xs text-slate-400">~$0.20/credit</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-3xl text-slate-900 tracking-tight">$9.99</span>
                      <span className="text-sm text-slate-400">/ 50 credits</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      Perfect for a few focused practice sessions.
                    </p>
                    <Button
                      className="w-full h-10 rounded-xl text-sm bg-slate-900 hover:bg-slate-800 text-white"
                      disabled={loadingPack === 'starter'}
                      onClick={handleBuyStarter}
                    >
                      {loadingPack === 'starter' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buy Starter'}
                    </Button>
                  </div>

                  {/* Most Popular Pack */}
                  <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 shadow-sm relative flex-1">
                    <Badge className="absolute -top-2.5 right-5 bg-blue-600 text-white hover:bg-blue-600 shadow-none rounded-full px-3 py-0.5 text-[11px]">
                      Most popular
                    </Badge>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg text-slate-900">Growth</h3>
                      <span className="text-xs text-blue-500">~$0.15/credit</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-3xl text-slate-900 tracking-tight">$14.99</span>
                      <span className="text-sm text-slate-400">/ 100 credits</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      Best value — enough for weekly practice across all modes.
                    </p>
                    <Button
                      className="w-full h-10 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={loadingPack === 'growth'}
                      onClick={handleBuyGrowth}
                    >
                      {loadingPack === 'growth' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Buy Growth</span><ArrowRight className="w-4 h-4" /></>}
                    </Button>
                  </div>

                  {/* Customize Pack */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg text-slate-900">Customize</h3>
                      <span className="text-xs text-slate-400">~${customUnitPrice}/credit</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl text-slate-900 tracking-tight">
                        ${customTotal}
                      </span>
                      <span className="text-sm text-slate-400">
                        / {customCredits} credits
                      </span>
                    </div>
                    {/* Slider */}
                    <div className="mb-4">
                      <input
                        type="range"
                        min={150}
                        max={1000}
                        step={50}
                        value={customCredits}
                        onChange={(e) => setCustomCredits(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:shadow-sm"
                      />
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                        <span>150</span>
                        <span>1000</span>
                      </div>
                    </div>
                    <Button
                      className="w-full h-10 rounded-xl text-sm bg-slate-900 hover:bg-slate-800 text-white"
                      disabled={loadingPack === 'custom'}
                      onClick={handleBuyCustom}
                    >
                      {loadingPack === 'custom' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Customize'}
                    </Button>
                    <p className="text-center text-xs text-slate-400 mt-3">
                      Need 1,000+ credits?{' '}
                      <a href="mailto:sales@screna.ai" className="text-blue-500 hover:underline">
                        Contact sales
                      </a>
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ═══ RATES TABLE ═══════════════════════════════ */}
        <section className="pb-16 px-6">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100">
                  <h2 className="text-xl text-slate-900 mb-1">Credits per minute</h2>
                  <p className="text-sm text-slate-500">
                    Different modes use credits at different rates.
                  </p>
                </div>

                {/* Rate rows */}
                <div className="divide-y divide-slate-100">
                  {[
                    {
                      mode: 'Voice',
                      icon: Mic,
                      rate: '1 credit/min',
                      multiplier: '1×',
                      color: 'bg-indigo-50 text-indigo-500',
                      iconColor: 'text-indigo-400',
                    },
                    {
                      mode: 'Video',
                      icon: Video,
                      rate: '1.5 credits/min',
                      multiplier: '1.5×',
                      color: 'bg-violet-50 text-violet-500',
                      iconColor: 'text-violet-400',
                    },
                  ].map((row) => {
                    const Icon = row.icon;
                    return (
                    <div
                      key={row.mode}
                      className="px-8 py-5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl ${row.color.split(' ')[0]} flex items-center justify-center`}
                        >
                          <Icon className={`w-4 h-4 ${row.iconColor}`} />
                        </div>
                        <div>
                          <span className="text-sm text-slate-800">{row.mode}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">{row.rate}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs rounded-full px-2 py-0 border ${row.color}`}
                        >
                          {row.multiplier}
                        </Badge>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Examples & refund note */}
                <div className="px-8 py-6 bg-slate-50/70 border-t border-slate-100">
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Info className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        <span className="text-slate-700">Example:</span> A 20-min Voice session uses 20 credits.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Info className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        <span className="text-slate-700">Example:</span> A 30-min Video session uses 45 credits.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <RefreshCw className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-sm text-emerald-700">
                      <span className="text-emerald-800">Only pay what you use.</span>{' '}
                      If you end a session early, unused credits are automatically refunded.
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══ FAQ ════════════════════════════════════════ */}
        <section className="pb-20 px-6">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <h2 className="text-xl text-slate-900 mb-6 text-center">
                Frequently asked questions
              </h2>
              <div className="space-y-3">
                {FAQS.map((faq) => (
                  <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}