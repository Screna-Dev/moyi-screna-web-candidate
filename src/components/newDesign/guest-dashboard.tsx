import { useState } from 'react';
import { Link } from 'react-router';
import {
  Lock,
  Sparkles,
  Mic,
  TrendingUp,
  MessageSquare,
  Briefcase,
  Users,
  ChevronRight,
  Target,
  Bot,
  ArrowRight,
  Search,
  Trophy,
  CheckCircle2,
  Flame,
  LayoutDashboard,
  Home,
  Zap,
  BookOpen,
  Award,
  Play,
} from 'lucide-react';
import logoImg from '@/assets/Navbar.png';

// ── Score ring (mini) ─────────────────────────────────────────────────────────
function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size / 2) - 5;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? '#10b981' : score >= 70 ? 'hsl(221,91%,60%)' : '#f59e0b';
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[11px] font-bold text-slate-700">{score}</span>
    </div>
  );
}

// ── Locked preview card ───────────────────────────────────────────────────────
function LockedCard({
  icon: Icon,
  title,
  description,
  accentColor = 'blue',
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor?: 'blue' | 'violet' | 'amber';
  children?: React.ReactNode;
}) {
  const accentBg: Record<string, string> = {
    blue:   'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]',
    violet: 'bg-violet-50 text-violet-600',
    amber:  'bg-amber-50 text-amber-600',
  };

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/20 overflow-hidden">
      {/* Faint background content */}
      {children && (
        <div className="p-5 opacity-[0.09] pointer-events-none select-none" aria-hidden="true">
          {children}
        </div>
      )}

      {/* Lock overlay */}
      <div className={`${children ? 'absolute inset-0' : ''} bg-gradient-to-b from-white/96 via-white/93 to-white/90 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center`}>
        {/* Lock badge */}
        <div className="w-10 h-10 rounded-2xl bg-[hsl(222,22%,15%)] flex items-center justify-center mb-4 shadow-md">
          <Lock className="w-[18px] h-[18px] text-white" />
        </div>

        {/* Icon + Title */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${accentBg[accentColor]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-[15px] text-[hsl(222,22%,15%)] mb-1.5">{title}</h3>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-5 max-w-[220px]">{description}</p>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Link to="/pricing">
            <button className="px-4 py-2 bg-[hsl(221,91%,60%)] text-white rounded-xl text-[13px] font-semibold hover:bg-[hsl(221,80%,55%)] transition-all shadow-sm shadow-[hsl(221,91%,60%)]/20">
              Upgrade to unlock
            </button>
          </Link>
          <Link to="/pricing">
            <button className="px-3 py-2 text-[13px] font-semibold text-slate-400 hover:text-slate-600 transition-colors">
              See plans →
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const CAREER_STAGES = [
  { id: 'understand', label: 'Understand', icon: Search,   state: 'done'   as const },
  { id: 'practice',  label: 'Practice',   icon: Mic,       state: 'active' as const },
  { id: 'support',   label: 'Get Support',icon: Users,     state: 'locked' as const },
  { id: 'apply',     label: 'Apply',      icon: Briefcase, state: 'locked' as const },
  { id: 'offer',     label: 'Offer & Grow',icon: Trophy,   state: 'locked' as const },
];

const TRENDING_ROLES = [
  { role: 'Product Manager (AI)', tags: ['Google', 'Stripe', 'Anthropic'], openings: 96,  demand: 'Very Hot',  demandColor: 'text-rose-600 bg-rose-50 border-rose-100' },
  { role: 'Software Engineer (ML)', tags: ['OpenAI', 'Meta', 'Cohere'],   openings: 234, demand: 'Hot',       demandColor: 'text-orange-600 bg-orange-50 border-orange-100' },
  { role: 'UX Designer',           tags: ['Figma', 'Airbnb', 'Linear'],   openings: 87,  demand: 'Trending',  demandColor: 'text-violet-600 bg-violet-50 border-violet-100' },
  { role: 'Data Analyst',          tags: ['Stripe', 'Plaid', 'Coinbase'],  openings: 156, demand: 'High',      demandColor: 'text-blue-600 bg-blue-50 border-blue-100' },
  { role: 'Frontend Engineer (React)', tags: ['Vercel', 'Linear', 'Notion'], openings: 198, demand: 'Trending', demandColor: 'text-violet-600 bg-violet-50 border-violet-100' },
];

const COMMUNITY_QUESTIONS = [
  { q: 'Tell me about a time you drove alignment across competing teams.',  role: 'PM at Google',    aiPick: true  },
  { q: 'Design a notifications system that scales to 100 million users.',  role: 'SWE at Meta',     aiPick: false },
  { q: 'How would you improve Instagram Reels for a more mature audience?', role: 'PM at Instagram', aiPick: true  },
];

const GUEST_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/guest-dashboard', active: true },
  { icon: Mic,             label: 'Practice',   path: '/mock-interview',  badge: '2 left' },
  { icon: MessageSquare,   label: 'Community',  path: '/interview-insights' },
];

const LOCKED_NAV = [
  { icon: Briefcase, label: 'Job Board'    },
  { icon: Users,     label: 'Mentorship'  },
  { icon: Target,    label: 'Career Center' },
];

// ── Guest Sidebar ─────────────────────────────────────────────────────────────
function GuestSidebar() {
  return (
    <div className="flex flex-col h-full">
      {/* Accessible nav */}
      <nav className="px-3 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[1.1px] text-slate-400 px-3 mb-2">Free Access</p>
        <div className="space-y-0.5">
          {GUEST_NAV.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                item.active
                  ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                  : 'text-[hsl(222,12%,45%)] hover:bg-[hsl(220,18%,96%)] hover:text-[hsl(222,22%,15%)]'
              }`}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span className="text-sm flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-3 my-1 border-t border-slate-100" />

      {/* Locked nav */}
      <nav className="px-3 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[1.1px] text-slate-400 px-3 mb-2 mt-2">Premium</p>
        <div className="space-y-0.5">
          {LOCKED_NAV.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 cursor-not-allowed select-none"
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span className="text-sm flex-1">{item.label}</span>
              <Lock className="w-3 h-3 text-slate-300" />
            </div>
          ))}
        </div>
      </nav>

      {/* Upgrade CTA */}
      <div className="px-3 pb-5 mt-auto">
        <div className="rounded-xl bg-gradient-to-br from-[hsl(221,91%,60%)] to-[hsl(221,62%,44%)] p-4 text-white shadow-lg shadow-[hsl(221,91%,60%)]/25">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Unlock Career Support</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed mb-3">
            Job Apply, Mentorship, and your full career roadmap.
          </p>
          <Link to="/pricing">
            <button className="w-full py-2 bg-white text-[hsl(221,91%,55%)] rounded-lg text-xs font-bold hover:bg-white/90 transition-colors">
              See Plans
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Stage Progress Bar ────────────────────────────────────────────────────────
function StageProgressBar() {
  return (
    <div className="sticky top-14 z-40 bg-white/95 backdrop-blur-xl border-b border-[hsl(220,16%,90%)] px-4 sm:px-6 py-0">
      <div className="flex items-center justify-between h-12 max-w-[1400px] mx-auto">
        {/* Stages */}
        <div className="flex items-center gap-0.5">
          {CAREER_STAGES.map((stage, i) => (
            <div key={stage.id} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                  stage.state === 'done'
                    ? 'bg-emerald-50 text-emerald-700'
                    : stage.state === 'active'
                    ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                    : 'opacity-40 text-slate-400'
                }`}
              >
                {stage.state === 'locked' ? (
                  <Lock className="w-3 h-3 shrink-0" />
                ) : stage.state === 'done' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <stage.icon className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="text-[12px] font-semibold whitespace-nowrap hidden sm:inline">{stage.label}</span>
              </div>
              {i < CAREER_STAGES.length - 1 && (
                <ChevronRight className={`w-3.5 h-3.5 mx-0.5 shrink-0 ${
                  stage.state === 'locked' || CAREER_STAGES[i + 1].state === 'locked'
                    ? 'text-slate-150'
                    : 'text-slate-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Upgrade prompt */}
        <div className="flex items-center gap-2.5 ml-4 shrink-0">
          <span className="text-[12px] text-slate-400 hidden md:inline">Upgrade to unlock your career roadmap</span>
          <Link to="/pricing">
            <button className="text-[12px] font-semibold text-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 px-3 py-1.5 rounded-lg hover:bg-[hsl(221,91%,60%)]/20 transition-colors whitespace-nowrap flex items-center gap-1">
              See Plans <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function GuestDashboardPage() {
  const [practiceTab, setPracticeTab] = useState<'recent' | 'start'>('recent');

  return (
    <div className="min-h-screen bg-[hsl(220,20%,97%)] flex flex-col">

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[hsl(220,16%,90%)] h-14 flex items-center px-4 sm:px-6">
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="Screna" className="h-6 w-auto" />
          </Link>
          <div className="w-px h-5 bg-slate-200" />
          <Link to="/" className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
            <Home className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">Home</span>
          </Link>
        </div>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-5 mx-auto">
          {[
            { label: 'Practice', href: '/mock-interview' },
            { label: 'Community', href: '/interview-insights' },
            { label: 'Pricing', href: '/pricing' },
          ].map((link) => (
            <Link key={link.label} to={link.href} className="text-[13px] font-medium text-slate-500 hover:text-blue-600 transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto md:ml-0">
          <Link to="/auth">
            <button className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              Log in
            </button>
          </Link>
          <Link to="/pricing">
            <button className="text-[13px] font-semibold text-white bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,80%,55%)] px-4 py-2 rounded-xl transition-all shadow-sm shadow-[hsl(221,91%,60%)]/25 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Upgrade
            </button>
          </Link>
        </div>
      </header>

      {/* ── Career Stage Progress Bar ── */}
      <StageProgressBar />

      {/* ── Main Layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-[hsl(220,16%,90%)] sticky top-[104px] h-[calc(100vh-104px)] z-40 shrink-0 overflow-y-auto">
          <GuestSidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 pb-12 max-w-[1400px] mx-auto">

            {/* ── Page Heading ── */}
            <div className="mb-7">
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-[22px] font-bold text-[hsl(222,22%,15%)] tracking-tight">Career Command Center</h1>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[11px] font-bold rounded-full border border-slate-200/60">
                  Free Member
                </span>
              </div>
              <p className="text-[14px] text-slate-500 leading-relaxed">
                Practice and explore — upgrade to unlock your full guided career roadmap.
              </p>
            </div>

            {/* ── Upgrade Banner ── */}
            <div className="mb-7 flex items-center justify-between gap-4 bg-gradient-to-r from-[hsl(221,91%,60%)]/8 via-[hsl(221,91%,60%)]/5 to-transparent border border-[hsl(221,91%,60%)]/20 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[hsl(221,91%,60%)]/15 text-[hsl(221,91%,60%)] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[hsl(222,22%,15%)] mb-0.5">
                    Unlock the full Career Command Center
                  </div>
                  <div className="text-[12px] text-slate-500">
                    Job Apply pipeline, 1:1 Mentorship, and a managed job search — all in one place.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link to="/pricing">
                  <button className="text-[13px] font-semibold text-[hsl(221,91%,60%)] hover:text-blue-700 transition-colors">
                    See plans
                  </button>
                </Link>
                <Link to="/pricing">
                  <button className="text-[13px] font-semibold text-white bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,80%,55%)] px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Upgrade Now
                  </button>
                </Link>
              </div>
            </div>

            {/* ── 2-Column Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ── LEFT: Active free content ── */}
              <div className="lg:col-span-8 flex flex-col gap-6">

                {/* ── Personalized Practice Card ── */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/20 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] flex items-center justify-center">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[14px] text-[hsl(222,22%,15%)]">Personalized Practice</h3>
                        <p className="text-[11px] text-slate-400">AI-tailored to your target role</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                        2 of 3 free sessions used
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Sessions remaining bar */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-semibold text-slate-600">Free sessions</span>
                        <span className="text-[12px] text-slate-400">1 remaining</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
                      </div>
                      <p className="text-[11px] text-amber-600 mt-1.5 font-medium">Upgrade for unlimited practice sessions</p>
                    </div>

                    {/* Recent mock summary */}
                    <div className="flex items-start gap-4 p-4 bg-slate-50/70 rounded-xl border border-slate-100 mb-5">
                      <ScoreRing score={78} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[14px] font-semibold text-slate-900">Product Manager — Behavioral</span>
                          <span className="text-[11px] text-slate-400 shrink-0">2 days ago</span>
                        </div>
                        <p className="text-[12px] text-slate-500 leading-relaxed mb-2.5 line-clamp-2">
                          Good structured responses. You used STAR method effectively. Consider being more concise when discussing tradeoffs.
                        </p>
                        <div className="flex gap-2">
                          <span className="text-[11px] font-medium text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-md">+ Structured Answers</span>
                          <span className="text-[11px] font-medium text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md">- Conciseness</span>
                        </div>
                      </div>
                    </div>

                    {/* CTA row */}
                    <div className="flex items-center gap-3">
                      <Link to="/mock-interview" className="flex-1">
                        <button className="w-full py-2.5 bg-[hsl(221,91%,60%)] text-white rounded-xl text-[13px] font-semibold hover:bg-[hsl(221,80%,55%)] transition-all shadow-sm flex items-center justify-center gap-2">
                          <Play className="w-3.5 h-3.5" /> Start New Session
                        </button>
                      </Link>
                      <Link to="/history">
                        <button className="py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-[13px] font-semibold hover:bg-slate-50 transition-all">
                          View History
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* ── Trending Roles ── */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/20 overflow-hidden">
                  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="w-[18px] h-[18px] text-slate-400" />
                      <h3 className="font-semibold text-base text-[hsl(222,22%,15%)]">Trending Roles</h3>
                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">This week</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-[12px] font-semibold text-orange-600">5 hot roles</span>
                    </div>
                  </div>

                  <div className="flex flex-col divide-y divide-slate-100/80">
                    {TRENDING_ROLES.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors group cursor-pointer">
                        {/* Rank */}
                        <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[11px] font-bold shrink-0">
                          {i + 1}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[14px] font-semibold text-slate-900 truncate">{item.role}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${item.demandColor}`}>
                              <Flame className="w-2.5 h-2.5" /> {item.demand}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.tags.map((tag) => (
                              <span key={tag} className="text-[11px] text-slate-400 font-medium">{tag}</span>
                            ))}
                            <span className="text-slate-200">·</span>
                            <span className="text-[11px] text-slate-400">{item.openings} open roles</span>
                          </div>
                        </div>
                        {/* Practice CTA */}
                        <Link to="/mock-interview">
                          <button className="text-[12px] font-semibold text-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/8 hover:bg-[hsl(221,91%,60%)]/15 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            Practice <ChevronRight className="w-3 h-3" />
                          </button>
                        </Link>
                        <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Community / Interview Insights ── */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/20 overflow-hidden">
                  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-[18px] h-[18px] text-slate-400" />
                      <h3 className="font-semibold text-base text-[hsl(222,22%,15%)]">Community · Interview Insights</h3>
                    </div>
                    <Link to="/interview-insights">
                      <button className="text-[12px] font-semibold text-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 px-3 py-1.5 rounded-lg hover:bg-[hsl(221,91%,60%)]/20 transition-colors">
                        View all insights
                      </button>
                    </Link>
                  </div>

                  <div className="flex flex-col divide-y divide-slate-100/80">
                    {COMMUNITY_QUESTIONS.map((item, i) => (
                      <Link to="/interview-insights" key={i}>
                        <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors group cursor-pointer">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              {item.aiPick && (
                                <span className="text-[10px] font-bold tracking-wide uppercase text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                  <Bot className="w-2.5 h-2.5" /> AI Pick
                                </span>
                              )}
                              <span className="text-[12px] text-slate-400 font-medium truncate">Asked for {item.role}</span>
                            </div>
                            <p className="text-[14px] font-medium text-slate-800 group-hover:text-[hsl(221,91%,60%)] transition-colors line-clamp-1">{item.q}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Footer CTA */}
                  <div className="px-6 py-3.5 bg-slate-50/40 border-t border-slate-100 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[12px] text-slate-400">Real questions shared by the community from top companies</span>
                  </div>
                </div>

              </div>

              {/* ── RIGHT: Locked premium previews ── */}
              <div className="lg:col-span-4 flex flex-col gap-5">

                {/* ── Career Command Center (locked) ── */}
                <LockedCard
                  icon={Target}
                  title="Career Command Center"
                  description="See your full guided job search journey from practice to offer."
                  accentColor="blue"
                >
                  {/* Mock content (faint background) */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {['Learning', 'Job Apply', 'Profile'].map(t => (
                        <div key={t} className="flex-1 h-7 rounded-lg bg-slate-300" />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl bg-slate-300" />)}
                    </div>
                    <div className="h-20 rounded-xl bg-slate-300" />
                    <div className="h-16 rounded-xl bg-slate-300" />
                  </div>
                </LockedCard>

                {/* ── Job Apply (locked) ── */}
                <LockedCard
                  icon={Briefcase}
                  title="Job Apply Pipeline"
                  description="Track applications, referrals, and outreach progress — all managed for you."
                  accentColor="blue"
                >
                  {/* Mock pipeline content */}
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      {[1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg bg-slate-300" />)}
                    </div>
                    {[1,2,3,4].map(i => (
                      <div key={i} className="flex gap-2.5 items-center">
                        <div className="w-8 h-8 rounded-lg bg-slate-300 shrink-0" />
                        <div className="flex-1">
                          <div className="h-2.5 bg-slate-300 rounded w-2/3 mb-1" />
                          <div className="h-2 bg-slate-200 rounded w-1/2" />
                        </div>
                        <div className="w-16 h-5 rounded-full bg-slate-300" />
                      </div>
                    ))}
                  </div>
                </LockedCard>

                {/* ── Mentorship (locked) ── */}
                <LockedCard
                  icon={Users}
                  title="1:1 Mentorship"
                  description="Get matched with role-specific mentors for coaching, resume reviews, and mock sessions."
                  accentColor="violet"
                >
                  {/* Mock mentor cards */}
                  <div className="space-y-2.5">
                    {[1,2].map(i => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-200">
                        <div className="w-10 h-10 rounded-full bg-slate-300 shrink-0" />
                        <div className="flex-1">
                          <div className="h-3 bg-slate-300 rounded w-2/3 mb-1.5" />
                          <div className="h-2.5 bg-slate-300 rounded w-1/2 mb-2" />
                          <div className="h-6 w-20 rounded-lg bg-slate-300" />
                        </div>
                      </div>
                    ))}
                    <div className="h-8 rounded-xl bg-slate-300" />
                  </div>
                </LockedCard>

                {/* ── Aspirational stats teaser ── */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/20 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-4 h-4 text-amber-500" />
                    <h3 className="font-semibold text-[14px] text-[hsl(222,22%,15%)]">What Pro members achieve</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { stat: '3.2×', desc: 'more interviews than solo applicants' },
                      { stat: '28 days', desc: 'avg. time from signup to first interview' },
                      { stat: '89%', desc: 'of Pro members land their target role' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-[18px] font-bold text-[hsl(221,91%,60%)] shrink-0 min-w-[56px]">{item.stat}</span>
                        <span className="text-[12px] text-slate-500 leading-snug">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <Link to="/pricing">
                      <button className="w-full py-2.5 bg-[hsl(221,91%,60%)] text-white rounded-xl text-[13px] font-semibold hover:bg-[hsl(221,80%,55%)] transition-all shadow-sm flex items-center justify-center gap-2">
                        <Zap className="w-3.5 h-3.5" /> Start with Pro
                      </button>
                    </Link>
                    <p className="text-[11px] text-center text-slate-400 mt-2">No commitment · Cancel anytime</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}