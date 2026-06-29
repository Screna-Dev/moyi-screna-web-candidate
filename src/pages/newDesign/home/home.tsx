import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Menu, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentService } from '@/services';
import imgLogo from '@/imports/Frame1/2ac62cf8d338510e851fc6fd6ab9ce46a7956ad5.png';
import imgFeatureA from '@/imports/featurea-png.png';
import imgWorkflowDiagram from '@/imports/Group_10.png';
import imgTeacup from '@/imports/App/landing-teacup.png';
import imgJobOffer from '@/imports/App/landing-job-offer.png';
import imgMicrophone from '@/imports/App/landing-microphone.png';
import imgNotebook from '@/imports/App/landing-notebook.png';
import imgFeatureB from '@/imports/featureb.png';
import imgFeatureC from '@/imports/featurec.png';
import imgDashboard from '@/imports/image-2.png';
// AI-generated testimonial portraits (people who don't exist — commercial-safe)
import avMaya from '@/imports/avatars/maya-chen.jpg';
import avDaniel from '@/imports/avatars/daniel-park.jpg';
import avAisha from '@/imports/avatars/aisha-raman.jpg';
import avKevin from '@/imports/avatars/kevin-liu.jpg';
import avSofia from '@/imports/avatars/sofia-martinez.jpg';
import avJordan from '@/imports/avatars/jordan-blake.jpg';
import avPriya from '@/imports/avatars/priya-shah.jpg';
import avEthan from '@/imports/avatars/ethan-wu.jpg';

// ─── Types ──────────────────────────────────────────────────────────────────
type Tab = 'AI Mock' | 'Mentorship' | 'InterviewPrep Note';

// Landing-page subscription tier (maps to POST /payments/subscriptions/tierUpdate)
type PlanTier = 'FREE' | 'BASIC' | 'ADVANCED' | 'FLAGSHIP';

interface Plan {
  name: string;
  tier: PlanTier;
  price: string;
  tagline: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const TABS: Tab[] = ['AI Mock', 'Mentorship', 'InterviewPrep Note'];

const FAQ_ITEMS = [
  {
    q: "What if it doesn't work out — can I get a refund?",
    a: "We offer a 3-day money-back guarantee on all paid plans. If Screna isn't right for you, reach out and we'll refund you in full — no questions asked.",
  },
  {
    q: "I haven't started applying yet. Is it too early?",
    a: "Not at all. Starting early means more reps, better stories, and less pressure when the real interviews arrive. Screna helps you build a solid prep foundation before the stakes are high.",
  },
  {
    q: 'How much time do I need to put in each week?',
    a: 'Most users improve with 3–5 focused hours per week. Start with InterviewPrep Notes to understand what to expect, use AI Mock for targeted practice, then bring your toughest answers or strategy questions to a mentor.',
  },
  {
    q: 'How is Screna different from other job search prep platforms?',
    a: 'Screna is built for the full preparation journey, not just one interview tool. You can understand what companies actually ask, practice with AI around your resume or target role, and get mentor guidance when you need human judgment. Interview prep is our strongest layer, but the system is designed to help you prepare for the job search as a whole.',
  },
  {
    q: "Not sure where to start? You're not alone.",
    a: 'Email us at operations@screna.ai. A real person on the Screna team will help you figure out what to focus on next. We reply within one business day during working hours.\nMon–Fri, 9:00 AM–5:00 PM ET',
  },
];

const PLANS: Plan[] = [
  {
    name: 'Free',
    tier: 'FREE',
    price: 'Free',
    tagline: 'Start at no cost',
    features: [
      'Buy extra credits',
      'Limited access to InterviewPrep Note',
      'Book 1-on-1 mentorship sessions with industry experts',
    ],
    cta: 'Start for free',
    highlighted: false,
  },
  {
    name: 'Basic',
    tier: 'BASIC',
    price: '$7.99/mo',
    tagline: 'Build your foundation',
    features: [
      '100 free credits / month',
      'Limited access to InterviewPrep Note',
      'Book 1-on-1 mentorship sessions with industry experts',
    ],
    cta: 'Get Basic',
    highlighted: false,
  },
  {
    name: 'Advanced',
    tier: 'ADVANCED',
    price: '$29.99/mo',
    tagline: 'For serious prep',
    features: [
      '300 free credits / month',
      'All access to InterviewPrep Note',
      'Book 1-on-1 mentorship sessions with industry experts',
    ],
    cta: 'Start Advanced',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Flagship',
    tier: 'FLAGSHIP',
    price: '$79.99/mo',
    tagline: 'For accelerated timelines',
    features: [
      'Unlimited credits',
      'All access to InterviewPrep Note',
      'Book 1-on-1 mentorship sessions with industry experts',
    ],
    cta: 'Get Flagship',
    highlighted: false,
  },
];

const MARQUEE_ROW1 = [
  { name: 'Maya Chen', role: 'Product Manager', company: 'Offer at Notion', quote: 'InterviewPrep Notes helped me understand what the round was really testing. My mock sessions finally felt specific instead of generic.', initials: 'MC', avatarBg: '#EEF1FF', initialsColor: '#2E5BFF', img: avMaya },
  { name: 'Daniel Park', role: 'Software Engineer', company: 'Final round at Stripe', quote: 'Quick Mock let me practice when I only had 20 minutes. The feedback made the next answer immediately stronger.', initials: 'DP', avatarBg: '#FFF0ED', initialsColor: '#C94025', img: avDaniel },
  { name: 'Aisha Raman', role: 'Data Analyst', company: 'Offer at Airbnb', quote: 'My mentor helped me turn scattered stories into answers that actually landed.', initials: 'AR', avatarBg: '#EDFFF1', initialsColor: '#1A7F33', img: avAisha },
  { name: 'Kevin Liu', role: 'New Grad SWE', company: 'Offer at Google', quote: 'I stopped guessing what to prepare. Screna gave me a path.', initials: 'KL', avatarBg: '#FFF8E0', initialsColor: '#9A7000', img: avKevin },
  { name: 'Sofia Martinez', role: 'PMM', company: 'Offer at Figma', quote: 'The notes showed me what candidates actually faced, and the AI Mock helped me rehearse with real context.', initials: 'SM', avatarBg: '#F4EEFF', initialsColor: '#7B3FE4', img: avSofia },
];

const MARQUEE_ROW2 = [
  { name: 'Jordan Blake', role: 'Backend Engineer', company: 'Offer at Meta', quote: 'The best part was how flexible the practice felt. I could paste a job description or just jump into a quick session.', initials: 'JB', avatarBg: '#E8F3FF', initialsColor: '#1868D4', img: avJordan },
  { name: 'Priya Shah', role: 'Strategy', company: 'Interview loop at Uber', quote: 'Mentorship gave me the strategy I was missing. AI Mock gave me the reps.', initials: 'PS', avatarBg: '#FFF0F5', initialsColor: '#C0245A', img: avPriya },
  { name: 'Ethan Wu', role: 'Designer', company: 'Offer at Dropbox', quote: 'It felt like practicing with signal, not practicing in the dark.', initials: 'EW', avatarBg: '#EDFFFC', initialsColor: '#0E8A79', img: avEthan },
  { name: 'Maya Chen', role: 'Product Manager', company: 'Offer at Notion', quote: 'InterviewPrep Notes helped me understand what the round was really testing. My mock sessions finally felt specific instead of generic.', initials: 'MC', avatarBg: '#EEF1FF', initialsColor: '#2E5BFF', img: avMaya },
  { name: 'Kevin Liu', role: 'New Grad SWE', company: 'Offer at Google', quote: 'I stopped guessing what to prepare. Screna gave me a path.', initials: 'KL', avatarBg: '#FFF8E0', initialsColor: '#9A7000', img: avKevin },
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

// ─── Feature Tab Cards ───────────────────────────────────────────────────────

function AiMockCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#2E5CFF' }}>
      <div
        className="flex items-center gap-2 px-5 h-[44px]"
        style={{ background: '#2447E0' }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{ width: 10, height: 10, background: 'rgba(255,255,255,0.45)' }}
          />
        ))}
        <span
          className="ml-2 text-[12px] font-medium"
          style={{ color: 'rgba(255,255,255,0.9)', fontFamily: "'Inter', sans-serif" }}
        >
          AI Interview Session
        </span>
      </div>
      <div className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-2">
            {[
              { w: '80%', op: 0.28 },
              { w: '60%', op: 0.15 },
              { w: '90%', op: 0.28 },
              { w: '55%', op: 0.15 },
              { w: '78%', op: 0.28 },
              { w: '58%', op: 0.15 },
              { w: '62%', op: 0.28 },
              { w: '38%', op: 0.15 },
            ].map((l, i) => (
              <div
                key={i}
                className="rounded-[4px]"
                style={{
                  height: 9,
                  width: l.w,
                  background: `rgba(255,255,255,${l.op})`,
                }}
              />
            ))}
          </div>
          <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-full"
            style={{
              width: 88,
              height: 88,
              background: 'rgba(255,255,255,0.15)',
            }}
          >
            <span
              className="text-[32px] font-medium leading-none text-white"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              92
            </span>
            <span
              className="text-[10px]"
              style={{ color: 'rgba(255,255,255,0.65)', fontFamily: "'Inter', sans-serif" }}
            >
              /100
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MentorshipCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#2E5CFF' }}>
      <div
        className="flex items-center gap-2 px-5 h-[44px]"
        style={{ background: '#2447E0' }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{ width: 10, height: 10, background: 'rgba(255,255,255,0.45)' }}
          />
        ))}
        <span
          className="ml-2 text-[12px] font-medium"
          style={{ color: 'rgba(255,255,255,0.9)', fontFamily: "'Inter', sans-serif" }}
        >
          Mentor Match
        </span>
      </div>
      <div className="p-5 space-y-3">
        <div
          className="rounded-[14px] p-4 flex items-center gap-3"
          style={{ background: '#FFF7F2', border: '1px solid #F2D0C1' }}
        >
          <div
            className="rounded-[26px] flex-shrink-0"
            style={{ width: 52, height: 52, background: '#FFB6A6' }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold text-[18px]"
              style={{ color: '#1F2328', fontFamily: "'Inter', sans-serif" }}
            >
              Lena Chen
            </p>
            <p
              className="text-[13px]"
              style={{ color: '#6F6F6F', fontFamily: "'Inter', sans-serif" }}
            >
              Ex-Google PM • behavioral + strategy
            </p>
          </div>
          <div
            className="rounded-full px-3 py-1 flex-shrink-0"
            style={{ background: '#1F2328' }}
          >
            <span
              className="text-[13px] font-semibold text-white"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              94% fit
            </span>
          </div>
        </div>
        {[
          { label: 'Answer review', detail: 'Tighten stories for impact, scope, and ownership.' },
          { label: 'Mock debrief', detail: 'Replay weak moments and turn feedback into next steps.' },
          { label: 'Prep plan', detail: 'A focused weekly plan for your target interview loop.' },
        ].map((row, i) => (
          <div
            key={i}
            className="rounded-xl px-4 flex items-center gap-4"
            style={{
              height: 52,
              background: '#FFFFFF',
              border: '1px solid #ECE7DF',
            }}
          >
            <span
              className="text-[14px] font-semibold w-28 flex-shrink-0"
              style={{ color: '#1F2328', fontFamily: "'Inter', sans-serif" }}
            >
              {row.label}
            </span>
            <span
              className="text-[13px]"
              style={{ color: '#5E5E5E', fontFamily: "'Inter', sans-serif" }}
            >
              {row.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Marquee testimonial card ─────────────────────────────────────────────────

function MarqueeCard({
  name, role, company, quote, initials, avatarBg, initialsColor, img,
}: {
  name: string; role: string; company: string; quote: string;
  initials: string; avatarBg: string; initialsColor: string; img?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div
      className="flex-shrink-0 flex flex-col"
      style={{
        width: 304,
        minHeight: 204,
        padding: '24px 26px',
        background: '#FFFFFF',
        borderRadius: 16,
        border: `1px solid ${hovered ? '#2E5BFF' : '#E8E8EA'}`,
        boxShadow: hovered
          ? '0 6px 24px rgba(46,91,255,0.10)'
          : '0 2px 10px rgba(46,91,255,0.04)',
        transition: 'border-color 180ms ease-out, box-shadow 180ms ease-out',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar + meta */}
      <div className="flex items-center gap-3 mb-4">
        {img && !imgFailed ? (
          <img
            src={img}
            alt={name}
            className="rounded-full flex-shrink-0 object-cover"
            style={{ width: 36, height: 36 }}
            loading="lazy"
            draggable={false}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 36, height: 36, background: avatarBg }}
          >
            <span
              className="text-[11px] font-semibold"
              style={{ color: initialsColor, fontFamily: "'Inter', sans-serif" }}
            >
              {initials}
            </span>
          </div>
        )}
        <div>
          <p
            className="text-[13px] font-semibold leading-[18px]"
            style={{ color: '#0A0A0A', fontFamily: "'Inter', sans-serif" }}
          >
            {name}
          </p>
          <p
            className="text-[11px] leading-[16px]"
            style={{ color: '#8A8F9A', fontFamily: "'Inter', sans-serif" }}
          >
            {role} · {company}
          </p>
        </div>
      </div>
      {/* Quote */}
      <p
        className="text-[13px] leading-[20px] flex-1"
        style={{ color: '#4A4D57', fontFamily: "'Inter', sans-serif" }}
      >
        "{quote}"
      </p>
    </div>
  );
}

// ─── How It Works — two-column layout ─────────────────────────────────────────

function HowItWorksSection() {
  return (
    <div className="bg-white size-full flex items-center justify-center">
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
            Choose direction, practice with context, and improve with the right next step.
          </p>

          <div className="flex flex-col gap-4 mb-10">
            {[
              { num: '01', label: 'Choose' },
              { num: '02', label: 'Practice' },
              { num: '03', label: 'Improve' },
            ].map((s, i) => (
              <div key={s.label} data-reveal data-delay={240 + i * 80} className="flex items-center gap-3">
                <span className="text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#8A8F9A', letterSpacing: '0.06em' }}>
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
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('AI Mock');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState({ left: 4, width: 196 });

  const goAuth = () => navigate('/auth');

  // Initials for the logged-in avatar
  const nameParts = (user?.name || '').trim().split(' ');
  const avatarInitials =
    nameParts[0] && nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : nameParts[0]
      ? nameParts[0][0].toUpperCase()
      : 'U';

  // Pricing CTA → POST /payments/subscriptions/tierUpdate
  const handleSelectPlan = async (plan: Plan) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (plan.tier === 'FREE') {
      navigate('/dashboard');
      return;
    }
    setLoadingTier(plan.tier);
    try {
      const res = await PaymentService.updateTier(plan.tier);
      const url = res?.data?.data?.url ?? res?.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        navigate('/billing');
      }
    } catch (err) {
      console.error('tierUpdate error:', err);
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
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = prefersReduced ? 0 : parseInt(el.dataset.delay ?? '0', 10);
            setTimeout(() => el.classList.add('sr-visible'), delay);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const idx = TABS.indexOf(activeTab);
    const el = tabRefs.current[idx];
    const parent = el?.parentElement;
    if (el && parent) {
      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setPillStyle({
        left: elRect.left - parentRect.left,
        width: elRect.width,
      });
    }
  }, [activeTab]);

  const featureContent = {
    'AI Mock': {
      num: '01',
      title: 'AI Mock Interview',
      desc: 'Turn your target role and interview notes into focused mock sessions. Choose the question type, difficulty, and length, then get feedback that helps you improve faster.',
      card: <AiMockCard />,
    },
    Mentorship: {
      num: '02',
      title: 'Mentorship',
      desc: 'Get unstuck with someone who has been there. Book time with mentors who can review your answers, sharpen your strategy, and help you understand what strong candidates do differently.',
      card: <MentorshipCard />,
    },
    'InterviewPrep Note': {
      num: '03',
      title: 'InterviewPrep Note',
      desc: 'Browse real interview notes from candidates who have been there, filtered by company, role, and round. See what gets asked, what matters, and where to focus your prep.',
      card: (
        <img
          src={imgFeatureB}
          alt="InterviewPrep Note"
          className="w-full h-auto object-contain"
          style={{ display: 'block', maxWidth: '100%' }}
        />
      ),
    },
  };

  const feature = featureContent[activeTab];

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ─── Nav ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
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
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center">
            <img
              src={imgLogo}
              alt="Screna"
              className="h-6 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Blog', 'Pricing', 'FAQ'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
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
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                aria-label="Go to dashboard"
                title={user.name || 'Dashboard'}
                className="hidden md:inline-flex w-9 h-9 rounded-full overflow-hidden items-center justify-center font-semibold text-[13px] text-white transition-all duration-150 hover:opacity-90 active:scale-95 bg-[#2E5BFF] border border-[#2E5BFF]"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={avatarInitials} className="w-full h-full object-cover" />
                ) : (
                  avatarInitials
                )}
              </button>
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
                  onClick={goAuth}
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
            {['Features', 'Blog', 'Pricing', 'FAQ'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-[15px]"
                style={{ color: '#4A4D57' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link}
              </a>
            ))}
            {user ? (
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                className="inline-flex items-center justify-center h-10 px-5 rounded-[7px] text-[14px] font-medium text-white w-full"
                style={{ background: '#2E5BFF' }}
              >
                Dashboard
              </button>
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
                  onClick={goAuth}
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

      {/* ─── Hero ─── */}
      <section
        className="snap-s pt-[72px] flex flex-col relative"
        style={{
          minHeight: '100svh',
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
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-16 lg:pt-20 pb-10 flex flex-col items-center relative" style={{ zIndex: 2 }}>

          {/* ── Decorative dot clusters ── */}
          <div
            className="absolute pointer-events-none hidden lg:block"
            style={{
              left: 0,
              top: 24,
              width: 220,
              height: 320,
              backgroundImage: 'radial-gradient(circle, rgba(46,91,255,0.13) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              WebkitMaskImage:
                'linear-gradient(to right, white 0%, white 40%, transparent 100%), linear-gradient(to bottom, transparent 0%, white 18%, white 82%, transparent 100%)',
              maskImage:
                'linear-gradient(to right, white 0%, white 40%, transparent 100%), linear-gradient(to bottom, transparent 0%, white 18%, white 82%, transparent 100%)',
              WebkitMaskComposite: 'destination-in',
              maskComposite: 'intersect' as any,
            }}
          />
          <div
            className="absolute pointer-events-none hidden lg:block"
            style={{
              right: 0,
              top: 24,
              width: 220,
              height: 320,
              backgroundImage: 'radial-gradient(circle, rgba(46,91,255,0.13) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              WebkitMaskImage:
                'linear-gradient(to left, white 0%, white 40%, transparent 100%), linear-gradient(to bottom, transparent 0%, white 18%, white 82%, transparent 100%)',
              maskImage:
                'linear-gradient(to left, white 0%, white 40%, transparent 100%), linear-gradient(to bottom, transparent 0%, white 18%, white 82%, transparent 100%)',
              WebkitMaskComposite: 'destination-in',
              maskComposite: 'intersect' as any,
            }}
          />

          {/* ── Decorative objects ── */}
          <div className="absolute pointer-events-none hidden lg:block" style={{ left: 'calc((100% - 100vw) / 2 + 16px)', top: 44, zIndex: 1 }}>
            <img src={imgTeacup} alt="" style={{ width: 118, height: 94, objectFit: 'contain', transform: 'rotate(22.29deg)', display: 'block' }} />
          </div>
          <div className="absolute pointer-events-none hidden lg:block" style={{ right: 'calc((100% - 100vw) / 2)', top: -50, zIndex: 1 }}>
            <img src={imgNotebook} alt="" style={{ width: 487, height: 325, objectFit: 'contain', transform: 'translateX(22%) rotate(-31.73deg)', transformOrigin: 'top right', display: 'block' }} />
          </div>
          <div className="absolute pointer-events-none hidden lg:block" style={{ left: 'calc((100% - 100vw) / 2)', top: 270, zIndex: 1 }}>
            <img src={imgJobOffer} alt="" style={{ width: 412, height: 275, objectFit: 'contain', transform: 'translateX(-56%) rotate(-11.89deg)', display: 'block' }} />
          </div>
          <div className="absolute pointer-events-none hidden lg:block" style={{ right: 'calc((100% - 100vw) / 2 + 20px)', top: 440, zIndex: 1 }}>
            <img src={imgMicrophone} alt="" style={{ width: 214, height: 143, objectFit: 'contain', transform: 'rotate(-37.94deg)', display: 'block' }} />
          </div>

          {/* Pill badge */}
          <div
            data-reveal data-delay="0"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] mb-8"
            style={{
              background: '#F0F3FF',
              color: '#2E5BFF',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            ✶&nbsp;&nbsp;Your career prep partner
          </div>

          {/* Headline */}
          <h1
            data-reveal data-delay="100"
            className="text-center font-medium tracking-[-1.5px] leading-tight mb-7 max-w-[1100px]"
            style={{
              fontSize: 'clamp(40px, 6vw, 64px)',
              color: '#0A0A0A',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Turning practice and mentorship<br />
            into your next offer.
          </h1>

          {/* Sub text */}
          <div
            data-reveal data-delay="200"
            className="text-center text-[14px] font-medium leading-relaxed mb-10 max-w-[660px]"
            style={{ color: '#0A0A0A', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em' }}
          >
            <p>AI mock interviews tailored to your target role, anytime you need them.</p>
            <p>A mentor who's walked your exact path, not a generalist coach.</p>
            <p>Real interview questions from real candidates at your target companies.</p>
          </div>

          {/* CTA + page-wide styles */}
          <style>{`
            @keyframes dotPulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.35; transform: scale(0.6); }
            }
            .hero-dot { animation: dotPulse 1.8s ease-in-out infinite; }
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

            /* ── Testimonial marquee ─────────────────────────────────────── */
            @keyframes mLeft  { from { transform: translateX(0); }    to { transform: translateX(-50%); } }
            @keyframes mRight { from { transform: translateX(-50%); } to { transform: translateX(0); } }
            .mr-row { overflow: hidden; }
            .mr-row:hover .mr-track,
            .mr-row:focus-within .mr-track { animation-play-state: paused; }
            .mr-track { display: flex; align-items: stretch; gap: 20px; width: max-content; }
            .mr-l  { animation: mLeft  42s linear infinite; }
            .mr-r  { animation: mRight 56s linear infinite; }
            .mr-fade {
              -webkit-mask-image: linear-gradient(to right, transparent 0%, black 9%, black 91%, transparent 100%);
              mask-image: linear-gradient(to right, transparent 0%, black 9%, black 91%, transparent 100%);
            }
            @media (prefers-reduced-motion: reduce) {
              .mr-l, .mr-r { animation: none !important; }
            }
            @media (max-width: 767px) {
              .mr-l, .mr-r { animation: none !important; }
            }

            /* ── Scroll snap ─────────────────────────────────────────────── */
            html {
              scroll-snap-type: y proximity;
              scroll-padding-top: 72px;
            }
            .snap-s {
              scroll-snap-align: start;
              scroll-snap-stop: normal;
            }
            @media (max-width: 767px) {
              html { scroll-snap-type: none; }
              .snap-s { scroll-snap-align: none; }
            }
            @media (prefers-reduced-motion: reduce) {
              html { scroll-snap-type: none !important; }
              .snap-s { scroll-snap-align: none !important; }
            }
          `}</style>
          <button
            data-reveal data-delay="300"
            onClick={goAuth}
            className="hero-cta inline-flex items-center gap-2.5 h-12 px-7 rounded-full text-[15px] font-semibold text-white transition-all duration-200 mb-10"
            style={{
              background: '#2E5BFF',
              boxShadow: '0 8px 24px rgba(46,91,255,0.40)',
            }}
          >
            <span
              className="hero-dot rounded-full flex-shrink-0"
              style={{ width: 7, height: 7, background: '#FFFFFF' }}
            />
            Start Free
          </button>

          {/* Dashboard screenshot */}
          <img
            data-reveal data-delay="420"
            src={imgDashboard}
            alt="Screna dashboard"
            className="h-auto"
            style={{ display: 'block', width: '88%', margin: '0 auto' }}
          />

          {/* Logo bar — scrolling company logos (old-design marquee) */}
          <div
            data-reveal data-delay="540"
            className="w-full mt-12"
            style={{ borderTop: '1px solid #E8E8EA', paddingTop: 28 }}
          >
            <p
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className="text-[10.5px] uppercase tracking-[0.1em] text-slate-400 mb-6 text-center"
            >
              Members have landed roles at
            </p>
            <LogoMarquee logos={HERO_LOGOS} />
          </div>
        </div>
      </section>

      {/* ─── The Screna System ─── */}
      <section
        id="features"
        className="snap-s"
        style={{ background: '#FBFBFB', height: 'max(900px, 100svh)', overflow: 'hidden' }}
      >
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-full relative">
          <p
            data-reveal data-delay="0"
            className="text-center text-[11px] tracking-[2.5px] absolute left-0 right-0"
            style={{ color: '#2E5BFF', fontFamily: "'Inter', sans-serif", top: 72 }}
          >
            THE SCRENA SYSTEM
          </p>

          <h2
            data-reveal data-delay="100"
            className="text-center font-normal tracking-[-0.8px] absolute left-0 right-0"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(36px, 4.5vw, 54px)',
              lineHeight: '68px',
              color: '#0A0A0A',
              top: 96,
            }}
          >
            How it works
          </h2>

          {/* Tab switcher */}
          <div data-reveal data-delay="200" className="absolute left-0 right-0 flex justify-center" style={{ top: 191 }}>
            <div
              className="relative flex items-center p-1 rounded-[26px]"
              style={{ background: '#EDEDED' }}
            >
              <div
                className="absolute top-1 rounded-[22px] transition-all duration-200 ease-out pointer-events-none"
                style={{
                  left: pillStyle.left,
                  width: pillStyle.width,
                  height: 44,
                  background: '#0A0A0A',
                }}
              />
              {TABS.map((tab, idx) => (
                <button
                  key={tab}
                  ref={(el) => { tabRefs.current[idx] = el; }}
                  onClick={() => setActiveTab(tab)}
                  className="relative z-10 px-5 rounded-[22px] text-[15px] font-medium whitespace-nowrap transition-colors duration-200"
                  style={{
                    height: 44,
                    minWidth: 140,
                    color: activeTab === tab ? '#FBFBFB' : '#767676',
                    fontFamily: "'Inter', sans-serif",
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Feature content */}
          <div
            className="absolute left-6 right-6 lg:left-10 lg:right-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
            style={{ top: 320, bottom: 60 }}
          >
            <div data-reveal data-delay="320">
              <p
                className="text-[12px] mb-2"
                style={{ color: '#999', fontFamily: "'Inter', sans-serif" }}
              >
                {feature.num}
              </p>
              <h3
                className="font-normal mb-5"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(32px, 3.5vw, 44px)',
                  color: '#0A0A0A',
                }}
              >
                {feature.title}
              </h3>
              <p
                className="text-[17px] leading-relaxed"
                style={{ color: '#595959', fontFamily: "'Inter', sans-serif", maxWidth: 480 }}
              >
                {feature.desc}
              </p>
            </div>
            <div data-reveal data-delay="440" className="w-full flex items-center justify-center">
              {activeTab === 'AI Mock' ? (
                <img
                  src={imgFeatureA}
                  alt="AI Mock feature"
                  className="w-full h-auto object-contain"
                  style={{ display: 'block', maxWidth: '100%' }}
                />
              ) : activeTab === 'InterviewPrep Note' ? (
                <img
                  src={imgFeatureB}
                  alt="InterviewPrep Note feature"
                  className="w-full h-auto object-contain"
                  style={{ display: 'block', maxWidth: '100%' }}
                />
              ) : activeTab === 'Mentorship' ? (
                <img
                  src={imgFeatureC}
                  alt="Mentorship feature"
                  className="w-full h-auto object-contain"
                  style={{ display: 'block', maxWidth: '100%' }}
                />
              ) : (
                feature.card
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="snap-s bg-white relative overflow-hidden" style={{ height: 'max(980px, 100svh)' }}>
        <HowItWorksSection />
      </section>

      {/* ─── Testimonials marquee ─── */}
      <section
        id="testimonials"
        className="snap-s bg-white flex flex-col justify-center overflow-hidden"
        style={{ minHeight: '100svh', paddingTop: 56, paddingBottom: 80 }}
      >
        <div className="text-center mb-10 px-6">
          <p
            data-reveal data-delay="0"
            className="text-[11px] tracking-[2.5px] mb-5"
            style={{ color: '#2E5BFF', fontFamily: "'Inter', sans-serif" }}
          >
            REAL CANDIDATE MOMENTS
          </p>
          <h2
            data-reveal data-delay="100"
            className="font-normal tracking-[-0.8px] mb-7 mx-auto"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(32px, 4vw, 52px)',
              lineHeight: '1.2',
              color: '#0A0A0A',
              maxWidth: 620,
            }}
          >
            Proof that better prep changes the room.
          </h2>
        </div>

        {/* Marquee rows */}
        <div data-reveal data-delay="300" className="mr-fade flex flex-col gap-5">
          <div className="mr-row">
            <div className="mr-track mr-l pl-5">
              {[...MARQUEE_ROW1, ...MARQUEE_ROW1].map((c, i) => (
                <MarqueeCard key={i} {...c} />
              ))}
            </div>
          </div>
          <div className="mr-row">
            <div className="mr-track mr-r pl-5">
              {[...MARQUEE_ROW2, ...MARQUEE_ROW2].map((c, i) => (
                <MarqueeCard key={i} {...c} />
              ))}
            </div>
          </div>
        </div>

        {/* Mobile fallback */}
        <style>{`
          @media (max-width: 767px) {
            .mr-mobile-scroll { display: flex; overflow-x: auto; gap: 16px; padding: 0 24px; scrollbar-width: none; }
            .mr-mobile-scroll::-webkit-scrollbar { display: none; }
            .mr-row { display: none; }
            .mr-mobile { display: block !important; }
          }
          @media (min-width: 768px) {
            .mr-mobile { display: none !important; }
          }
        `}</style>
        <div className="mr-mobile hidden flex-col gap-5 mt-4">
          <div className="mr-mobile-scroll">
            {MARQUEE_ROW1.map((c, i) => <MarqueeCard key={i} {...c} />)}
          </div>
          <div className="mr-mobile-scroll">
            {MARQUEE_ROW2.map((c, i) => <MarqueeCard key={i} {...c} />)}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section
        id="pricing"
        className="snap-s py-24 lg:py-28 flex flex-col justify-center"
        style={{ background: '#D0E0F8', minHeight: '100svh' }}
      >
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <p
            data-reveal data-delay="0"
            className="text-center text-[11px] tracking-[2.5px] mb-6"
            style={{ color: '#2E5BFF', fontFamily: "'Inter', sans-serif" }}
          >
            PRICING
          </p>
          <div
            data-reveal data-delay="100"
            className="text-center font-normal tracking-[-0.8px] mb-14"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(36px, 4.5vw, 52px)',
              lineHeight: '64px',
              color: '#0A0A0A',
            }}
          >
            <p>Start free.</p>
            <p>Grow at your pace.</p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
            {PLANS.map((plan, i) => (
              <PricingCard
                key={i}
                plan={plan}
                revealDelay={i * 90}
                loading={loadingTier === plan.tier}
                onSelect={() => handleSelectPlan(plan)}
              />
            ))}
          </div>

          {/* Credits add-on */}
          <CreditsAddOn revealDelay={400} onAddCredits={goAuth} />
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="snap-s py-24 lg:py-28 bg-white flex flex-col justify-center" style={{ minHeight: '100svh' }}>
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div data-reveal data-delay="0">
              <p
                className="text-[12px] font-semibold tracking-[1.68px] uppercase mb-5"
                style={{ color: '#3C77F6', fontFamily: "'Inter', sans-serif" }}
              >
                FAQ
              </p>
              <h2
                className="font-normal tracking-[-0.8px] leading-[64px]"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(36px, 4vw, 52px)',
                  color: '#0A0A0A',
                }}
              >
                Common Questions
              </h2>
            </div>
            <div>
              {FAQ_ITEMS.map((item, i) => (
                <FaqRow
                  key={i}
                  item={item}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                  revealDelay={i * 90}
                />
              ))}
              <div style={{ height: 1, background: '#E1E4EA' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section
        className="py-24 lg:py-32 overflow-hidden relative"
        style={{
          background:
            'linear-gradient(172.342deg, rgb(18,49,184) 8.49%, rgb(46,91,255) 50%, rgb(74,123,255) 91.51%)',
        }}
      >
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 text-center relative">
          <div data-reveal data-delay="0" className="flex items-center justify-center gap-3 mb-8">
            <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.6)' }} />
            <span
              className="text-[12px] font-semibold tracking-[1.68px] uppercase"
              style={{ color: 'rgba(255,255,255,0.85)', fontFamily: "'Inter', sans-serif" }}
            >
              Get started
            </span>
            <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.6)' }} />
          </div>
          <h2
            data-reveal data-delay="100"
            className="font-medium tracking-[-1.68px] leading-tight mb-4 mx-auto"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(32px, 5vw, 48px)',
              color: '#FFFFFF',
              maxWidth: 907,
            }}
          >
            Your next role is already within reach.
          </h2>
          <p
            data-reveal data-delay="200"
            className="text-[18px] mb-10"
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Start free in under 2 minutes.
          </p>
          <button
            data-reveal data-delay="300"
            onClick={goAuth}
            className="inline-flex items-center gap-2 h-12 px-8 rounded-full text-[14px] font-semibold transition-all duration-150 active:scale-95"
            style={{
              background: '#FFFFFF',
              color: '#1231B8',
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = '#F0F3FF')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = '#FFFFFF')
            }
          >
            <div
              className="rounded-full"
              style={{ width: 6, height: 6, background: '#2E5BFF' }}
            />
            Start free
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ background: '#F9FAFB' }}>
        <div className="max-w-[1280px] mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-12">
            {/* Brand column */}
            <div>
              <Link to="/" className="inline-block mb-4">
                <img src={imgLogo} alt="Screna" className="h-6 w-auto object-contain" />
              </Link>
              <p
                className="text-[15px] mb-6"
                style={{ color: '#62748E', fontFamily: "'Inter', sans-serif" }}
              >
                Empowering careers through AI and human judgment.
              </p>
              <div className="flex gap-3">
                <SocialIcon aria-label="Twitter">
                  <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                    <path
                      d="M16.5 3C16.5 3 15.975 4.575 15 5.55C16.2 13.05 7.95 18.525 1.5 14.25C3.15 14.325 4.8 13.8 6 12.75C2.25 11.625 0.375 7.2 2.25 3.75C3.9 5.7 6.45 6.825 9 6.75C8.325 3.6 12 1.8 14.25 3.9C15.075 3.9 16.5 3 16.5 3Z"
                      stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                </SocialIcon>
                <SocialIcon aria-label="LinkedIn">
                  <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                    <path d="M12 6C13.1935 6 14.3381 6.47411 15.182 7.31802C16.0259 8.16193 16.5 9.30653 16.5 10.5V15.75H13.5V10.5C13.5 10.1022 13.342 9.72064 13.0607 9.43934C12.7794 9.15804 12.3978 9 12 9C11.6022 9 11.2206 9.15804 10.9393 9.43934C10.658 9.72064 10.5 10.1022 10.5 10.5V15.75H7.5V10.5C7.5 9.30653 7.97411 8.16193 8.81802 7.31802C9.66193 6.47411 10.8065 6 12 6Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4.5 6.75H1.5V15.75H4.5V6.75Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 4.5C3.82843 4.5 4.5 3.82843 4.5 3C4.5 2.17157 3.82843 1.5 3 1.5C2.17157 1.5 1.5 2.17157 1.5 3C1.5 3.82843 2.17157 4.5 3 4.5Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </SocialIcon>
                <SocialIcon aria-label="Email">
                  <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                    <path d="M15 3H3C2.17157 3 1.5 3.67157 1.5 4.5V13.5C1.5 14.3284 2.17157 15 3 15H15C15.8284 15 16.5 14.3284 16.5 13.5V4.5C16.5 3.67157 15.8284 3 15 3Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16.5 5.25L9.7725 9.525C9.54095 9.67007 9.27324 9.74701 9 9.74701C8.72676 9.74701 8.45905 9.67007 8.2275 9.525L1.5 5.25" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </SocialIcon>
                <SocialIcon aria-label="Discord">
                  <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                    <path d="M13.545 3.894A12.894 12.894 0 0 0 10.599 3a.048.048 0 0 0-.051.025c-.13.232-.275.535-.376.773a11.892 11.892 0 0 0-3.546 0 7.805 7.805 0 0 0-.382-.773.05.05 0 0 0-.051-.025 12.862 12.862 0 0 0-2.946.894.045.045 0 0 0-.021.018C1.648 6.757 1.131 9.55 1.38 12.308a.054.054 0 0 0 .02.036 12.953 12.953 0 0 0 3.9 1.97.05.05 0 0 0 .055-.018c.3-.41.567-.843.796-1.298a.05.05 0 0 0-.027-.069 8.527 8.527 0 0 1-1.217-.58.05.05 0 0 1-.005-.083c.082-.061.163-.125.241-.19a.048.048 0 0 1 .05-.007c2.552 1.165 5.315 1.165 7.837 0a.048.048 0 0 1 .051.006c.078.065.16.13.242.191a.05.05 0 0 1-.004.083 7.99 7.99 0 0 1-1.218.579.05.05 0 0 0-.026.07c.233.455.5.887.795 1.297a.05.05 0 0 0 .055.019 12.918 12.918 0 0 0 3.907-1.97.051.051 0 0 0 .02-.035c.295-3.046-.494-5.816-2.09-8.396a.04.04 0 0 0-.02-.018ZM6.51 10.67c-.765 0-1.394-.702-1.394-1.563 0-.862.617-1.563 1.394-1.563.783 0 1.406.707 1.394 1.563 0 .861-.617 1.563-1.394 1.563Zm5.155 0c-.764 0-1.394-.702-1.394-1.563 0-.862.617-1.563 1.394-1.563.784 0 1.407.707 1.394 1.563 0 .861-.61 1.563-1.394 1.563Z" fill="#90A1B9" />
                  </svg>
                </SocialIcon>
              </div>
            </div>

            {/* Resources */}
            <div>
              <p
                className="text-[14px] font-semibold tracking-[-0.35px] mb-5"
                style={{ color: '#0F172B', fontFamily: "'Inter', sans-serif" }}
              >
                Resources
              </p>
              {[
                { label: 'Blog', to: '#' },
                { label: 'FAQ', to: '/faq' },
                { label: 'Help Center', to: '/help' },
                { label: 'Contact', to: '/contact' },
              ].map((item) => (
                <FooterLink key={item.label} {...item} />
              ))}
            </div>

            {/* Community */}
            <div>
              <p
                className="text-[14px] font-semibold tracking-[-0.35px] mb-5"
                style={{ color: '#0F172B', fontFamily: "'Inter', sans-serif" }}
              >
                Community
              </p>
              <a
                href="https://discord.gg/screna"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[14px] leading-[20px] mb-3 transition-colors duration-150"
                style={{ color: '#656D81', fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#2E5BFF')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#656D81')}
              >
                Join our Discord
              </a>
            </div>

            {/* Legal */}
            <div>
              <p
                className="text-[14px] font-semibold tracking-[-0.35px] mb-5"
                style={{ color: '#0F172B', fontFamily: "'Inter', sans-serif" }}
              >
                Legal
              </p>
              {[
                { label: 'Terms of Service', to: '/terms' },
                { label: 'Privacy Policy', to: '/privacy' },
                { label: 'Cookies', to: '/cookies' },
              ].map((item) => (
                <FooterLink key={item.label} {...item} />
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-8 gap-3"
            style={{ borderTop: '1px solid #F8FAFC' }}
          >
            <p
              className="text-[14px]"
              style={{ color: '#90A1B9', fontFamily: "'Inter', sans-serif" }}
            >
              © 2026 Screna AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {['System Status', 'Security'].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-[14px] transition-colors duration-150"
                  style={{ color: '#90A1B9', fontFamily: "'Inter', sans-serif" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#2E5BFF')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#90A1B9')}
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
    <a href={to} className={className} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {label}
    </a>
  );
}

function SocialIcon({ children, 'aria-label': label }: { children: ReactNode; 'aria-label': string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      aria-label={label}
      className="flex items-center justify-center rounded-2xl transition-all duration-150"
      style={{
        width: 40,
        height: 40,
        border: '0.667px solid #F1F5F9',
        background: hovered ? '#F7F9FF' : 'transparent',
        opacity: hovered ? 1 : 0.85,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

function PricingCard({
  plan,
  revealDelay = 0,
  loading = false,
  onSelect,
}: {
  plan: Plan;
  revealDelay?: number;
  loading?: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      data-reveal
      data-delay={revealDelay}
      className="relative rounded-[18px] p-7 flex flex-col transition-all duration-200"
      style={{
        background: plan.highlighted ? '#F7F9FF' : '#FFFFFF',
        border: plan.highlighted ? '2px solid #2E5BFF' : '1px solid #2E5BFF',
        boxShadow: hovered
          ? plan.highlighted
            ? '0 20px 48px rgba(46,91,255,0.18)'
            : '0 12px 28px rgba(46,91,255,0.10)'
          : plan.highlighted
          ? '0 18px 42px rgba(46,91,255,0.14)'
          : '0 10px 24px rgba(46,91,255,0.04)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        minHeight: 408,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {plan.badge && (
        <div
          className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[10px] font-medium text-white"
          style={{ background: '#2E5BFF' }}
        >
          {plan.badge}
        </div>
      )}
      <p
        className="text-[15px] font-semibold mb-2"
        style={{
          color: plan.highlighted ? '#2E5BFF' : '#0A0A0A',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {plan.name}
      </p>
      <p
        className="text-[30px] tracking-[-0.5px] mb-1"
        style={{
          color: plan.highlighted ? '#2E5BFF' : '#0A0A0A',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {plan.price}
      </p>
      <p
        className="text-[12px] mb-6"
        style={{
          color: plan.highlighted ? '#2E5BFF' : '#4A4D57',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {plan.tagline}
      </p>
      <div className="flex-1 space-y-2 mb-8">
        {plan.features.map((f, i) => (
          <p
            key={i}
            className="text-[12px] leading-[18px]"
            style={{
              color: plan.highlighted ? '#2E5BFF' : '#4A4D57',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            ✓&nbsp;&nbsp;{f}
          </p>
        ))}
      </div>
      <button
        onClick={onSelect}
        disabled={loading}
        className="w-full h-[38px] rounded-[7px] text-[13px] font-medium transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center"
        style={{
          background: plan.highlighted ? '#2E5BFF' : '#FFFFFF',
          color: plan.highlighted ? '#FFFFFF' : '#1231B8',
          border: '1px solid #2E5BFF',
          fontFamily: "'Inter', sans-serif",
        }}
        onMouseEnter={(e) => {
          if (plan.highlighted) {
            (e.currentTarget as HTMLElement).style.background = '#1E48E6';
          } else {
            (e.currentTarget as HTMLElement).style.background = '#F0F3FF';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = plan.highlighted ? '#2E5BFF' : '#FFFFFF';
        }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : plan.cta}
      </button>
    </div>
  );
}

function CreditsAddOn({ revealDelay = 0, onAddCredits }: { revealDelay?: number; onAddCredits: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      data-reveal
      data-delay={revealDelay}
      className="rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4 transition-all duration-200"
      style={{
        background: '#FFFFFF',
        border: '1px solid #2E5BFF',
        boxShadow: hovered
          ? '0 12px 28px rgba(46,91,255,0.10)'
          : '0 12px 28px rgba(46,91,255,0.05)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="self-stretch"
        style={{ width: 3, background: '#2E5BFF', borderRadius: 2, minHeight: 28 }}
      />
      <div className="flex-shrink-0">
        <p
          className="text-[11px] font-semibold"
          style={{
            color: '#1231B8',
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.08em',
          }}
        >
          PAY AS YOU GO
        </p>
        <p
          className="text-[15px] font-semibold"
          style={{ color: '#0A0A0A', fontFamily: "'Inter', sans-serif" }}
        >
          Need a few extra practice reps?
        </p>
      </div>
      <p
        className="text-[14px] flex-1 min-w-[200px]"
        style={{ color: '#4A4D57', fontFamily: "'Inter', sans-serif" }}
      >
        Buy credits anytime without upgrading your plan.
      </p>
      <div className="flex items-center gap-3 ml-auto">
        <div
          className="inline-flex items-center justify-center h-10 px-5 rounded-full text-[14px] font-semibold"
          style={{
            background: '#F7F9FF',
            border: '1px solid #2E5BFF',
            color: '#1231B8',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          $0.10 / credit
        </div>
        <button
          onClick={onAddCredits}
          className="inline-flex items-center justify-center h-10 px-5 rounded-full text-[14px] font-semibold transition-all duration-150 active:scale-95"
          style={{
            background: '#FFFFFF',
            border: '1px solid #2E5BFF',
            color: '#1231B8',
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#F0F3FF')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#FFFFFF')}
        >
          Add credits
        </button>
      </div>
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
