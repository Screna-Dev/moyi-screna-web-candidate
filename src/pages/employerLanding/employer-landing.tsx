import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '@/hooks/useSeo';
import { SEO_COPY } from '@/constants/seo';
import imgLogo from '@/imports/Frame1/2ac62cf8d338510e851fc6fd6ab9ce46a7956ad5.png';
import imgLock from '@/assets/landing-employer/lock.svg';
import imgCheckMuted from '@/assets/landing-employer/check-muted.svg';
import imgCheckBrand from '@/assets/landing-employer/check-brand.svg';
import imgLinkedIn from '@/assets/landing-employer/social-linkedin.svg';
import imgX from '@/assets/landing-employer/social-x.svg';
import imgEmail from '@/assets/landing-employer/social-email.svg';
import {
  COMPARE_ROWS,
  EVERY_PLAN,
  FAQS,
  FEATURES,
  PLANS,
  PROBLEMS,
  SALES_EMAIL,
  SALES_HREF,
  STEPS,
  type IconCard,
  type Plan,
} from './content';

// Employer-facing marketing page, ported from Figma tv7ju8o58LXo6ZJEsJI6kZ
// node 2451:2282. Every sign-up CTA goes to the company-email login at
// /employer/login — there is no separate employer registration flow.

const SIGNUP = '/employer/login';
const SERIF: CSSProperties = { fontFamily: 'var(--font-serif)' };
const MONO: CSSProperties = { fontFamily: 'var(--font-mono)' };

const NAV = [
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Features', id: 'features' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'FAQ', id: 'faq' },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function EmployerLandingPage() {
  useSeo({ ...SEO_COPY.employers, path: '/employers' });

  return (
    <div className="min-h-screen bg-white font-sans text-[#0a0a0a]">
      <AnnouncementBar />
      <TopNav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

// ─── Chrome ───────────────────────────────────────────────────────────────────

function AnnouncementBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#0a0a0a] px-4 py-[11px] text-center text-[12px] leading-[18px]">
      <span className="text-white/70">
        FREE TO START · Post a role free. Your first 20 report unlocks are on us.
      </span>
      <button
        type="button"
        onClick={() => scrollTo('pricing')}
        className="font-semibold text-white underline"
      >
        See plans
      </button>
    </div>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e8e8ea] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[71px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-10">
        <Link to="/employers" aria-label="Screna — go to homepage" className="shrink-0">
          <img src={imgLogo} alt="Screna" className="h-6 w-auto" />
        </Link>
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => scrollTo(n.id)}
              className="text-[14px] leading-[21px] text-[#4a4d57] transition-colors hover:text-[#2e5bff]"
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            to="/"
            className="hidden h-9 items-center rounded-[7px] px-4 text-[14px] font-medium text-[#4a4d57] hover:text-[#2e5bff] md:flex"
          >
            For job seekers
          </Link>
          <Link
            to={SIGNUP}
            className="flex h-9 items-center rounded-[7px] px-3 text-[14px] font-medium text-[#4a4d57] hover:text-[#2e5bff] sm:px-4"
          >
            Log in
          </Link>
          <Link
            to={SIGNUP}
            className="flex h-9 items-center whitespace-nowrap rounded-full bg-[#2e5bff] px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#1e3fcc] sm:px-5"
          >
            Post a role free
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-[11px] uppercase leading-[16.5px] tracking-[2.5px] text-[#2e5bff]">
      {children}
    </p>
  );
}

function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2
      style={SERIF}
      className={`mx-auto mt-4 text-center text-[34px] font-normal leading-[1.15] tracking-[-0.025em] text-[#0a0a0a] sm:text-[46px] lg:text-[48px] ${className}`}
    >
      {children}
    </h2>
  );
}

function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1120px] px-4 sm:px-10 ${className}`}>{children}</div>;
}

function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(46,91,255,0.08) 0%, rgba(46,91,255,0) 70%)',
      }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col items-center px-4 pb-16 pt-12 sm:px-10 sm:pt-16 lg:pb-24">
        <span className="rounded-full border border-[#c7d2ff] bg-[#f0f3ff] px-4 py-1.5 text-center text-[12px] font-medium leading-[18px] text-[#2e5bff]">
          ✶ FOR RECRUITERS, AGENCIES AND TECH TEAMS
        </span>
        <h1
          style={SERIF}
          className="mt-8 max-w-[820px] text-center text-[42px] font-normal leading-[1.1] tracking-[-0.025em] text-[#0a0a0a] sm:text-[56px] lg:text-[66px]"
        >
          Only see candidates who showed up.
        </h1>
        <p className="mt-6 max-w-[560px] text-center text-[16px] leading-[1.625] text-[#4a4d57] sm:text-[17px]">
          No pile of AI-applied resumes. Every applicant finishes an AI interview first. See the full
          ranked list, scores and four dimensions for free. Pay only to contact the people you want
          to talk to.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={SIGNUP}
            className="flex h-12 items-center rounded-full bg-[#2e5bff] px-8 text-[15px] font-semibold text-white transition-colors hover:bg-[#1e3fcc]"
          >
            Post a role free
          </Link>
          <a
            href={SALES_HREF}
            className="flex h-12 items-center rounded-full border border-[#2e5bff] px-8 text-[15px] font-semibold text-[#2e5bff] transition-colors hover:bg-[#f0f3ff]"
          >
            Talk to sales
          </a>
        </div>
        <p className="mt-4 text-center text-[13px] leading-[19.5px] text-[#8a8f9a]">
          Free to start · No credit card · Unlimited open roles
        </p>
        <div className="mt-12 w-full max-w-[900px]">
          <HeroRankedMockup />
        </div>
      </div>
    </section>
  );
}

const MOCK_ROWS = [
  { rank: '#1', name: 'Jamie R.', initials: 'JR', score: 91, unlocked: true },
  { rank: '#2', name: 'Candidate #12', score: 88 },
  { rank: '#3', name: 'Candidate #03', score: 86 },
  { rank: '#4', name: 'Candidate #21 · attempt 2', score: 84 },
];

const MOCK_GRID = 'grid grid-cols-[36px_minmax(0,1fr)_44px_84px] sm:grid-cols-[44px_minmax(0,1fr)_52px_100px]';

function HeroRankedMockup() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-[14px] border border-[#e2e8f0] bg-white text-left shadow-[0px_8px_40px_0px_rgba(46,91,255,0.09),0px_2px_8px_0px_rgba(0,0,0,0.04)]"
    >
      <div className="flex h-9 items-center gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-4">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex h-[22px] w-full max-w-[340px] items-center overflow-hidden rounded-lg bg-[#eaecef] px-3">
          <span className="truncate text-[10px] leading-[15px] text-[#6b7280]">
            app.screna.ai/employer/jobs/backend-engineer
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] bg-[#fafbff] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold leading-[19.5px] text-[#0f172a]">Backend Engineer</span>
          <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold leading-[15px] text-[#16a34a]">
            ● Open
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] leading-[16.5px] text-[#64748b] sm:inline">
            28 candidates interviewed · Closes in 9 days
          </span>
          <span className="hidden text-[11px] text-[#cbd5e1] sm:inline">·</span>
          <span className="rounded-full border border-[#c7d2ff] bg-[#eef1ff] px-2 py-0.5 text-[10px] font-semibold leading-[15px] text-[#2563eb]">
            Unlocks 18 left
          </span>
        </div>
      </div>
      <div className={`${MOCK_GRID} border-b border-[#f1f5f9] px-4 py-2 text-[9px] font-bold uppercase leading-[13.5px] tracking-[0.45px] text-[#94a3b8]`}>
        <span className="text-center">Rank</span>
        <span className="text-center">Candidate · checklist</span>
        <span className="text-center">Score</span>
        <span className="text-right">Action</span>
      </div>
      {MOCK_ROWS.map((r) => (
        <div key={r.rank} className={`${MOCK_GRID} items-center border-b border-[#f8fafc] px-4 py-2.5`}>
          <span style={MONO} className="text-center text-[12px] font-bold leading-[18px] text-[#0f172a]">
            {r.rank}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            {r.unlocked ? (
              <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border border-[#c7d2ff] bg-[#eef1ff] text-[8px] font-bold text-[#2e5bff]">
                {r.initials}
              </span>
            ) : (
              <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border border-[#e2e8f0] bg-[#f1f5f9]">
                <img src={imgLock} alt="" width={10} height={10} />
              </span>
            )}
            <span
              className={`truncate text-[11px] font-medium leading-[16.5px] ${r.unlocked ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}
            >
              {r.name}
            </span>
          </span>
          <span
            style={MONO}
            className={`text-center text-[12px] font-bold leading-[18px] ${r.unlocked ? 'text-[#16a34a]' : 'text-[#2563eb]'}`}
          >
            {r.score}
          </span>
          <span className="flex justify-end">
            {r.unlocked ? (
              <span className="whitespace-nowrap rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold leading-[15px] text-[#15803d]">
                Next round
              </span>
            ) : (
              <span className="rounded-lg bg-[#2e5bff] px-2.5 py-1 text-[10px] font-semibold leading-[15px] text-white">
                Unlock
              </span>
            )}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-[#f1f5f9] bg-[#fafbff] px-4 py-2.5">
        <span className="size-1.5 shrink-0 rounded-full bg-[#2e5bff]" />
        <span className="text-[10px] leading-[15px] text-[#64748b]">
          Rankings update as candidates apply or complete a new attempt.
        </span>
      </div>
    </div>
  );
}

function IconCardGrid({ items, compact }: { items: IconCard[]; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${compact ? 'gap-5' : 'gap-6'}`}>
      {items.map((it) => (
        <div
          key={it.title}
          className="flex flex-col gap-4 rounded-2xl border border-[#e2e8f0] bg-[#fafbff] p-6"
        >
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#eef1ff]">
            <img src={it.icon} alt="" width={20} height={20} />
          </span>
          <div>
            <h3
              className={`font-semibold text-[#0a0a0a] ${compact ? 'text-[15px] leading-[22.5px]' : 'text-[16px] leading-6'}`}
            >
              {it.title}
            </h3>
            <p
              className={`text-[#4a4d57] ${compact ? 'pt-1.5 text-[13px] leading-[21.125px]' : 'pt-4 text-[14px] leading-[22.75px]'}`}
            >
              {it.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Problem() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <Container>
        <Eyebrow>The problem</Eyebrow>
        <SectionTitle className="max-w-[720px]">
          Applying costs a candidate one click. Reviewing costs you an afternoon.
        </SectionTitle>
        <div className="pt-12">
          <IconCardGrid items={PROBLEMS} />
        </div>
      </Container>
    </section>
  );
}

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-[72px] py-20 lg:py-28"
      style={{ backgroundImage: 'linear-gradient(152deg, #f0f4ff 0%, #f5f0ff 100%)' }}
    >
      <Container>
        <Eyebrow>Process</Eyebrow>
        <SectionTitle>How it works</SectionTitle>
        <div className="relative pt-14">
          {/* connector between the four step markers, desktop only */}
          <div className="absolute left-[12.5%] right-[12.5%] top-[76px] hidden h-px bg-[#c7d2ff] lg:block" />
          <ol className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {STEPS.map((s, i) => (
              <li key={s.n} className="relative flex flex-col items-center px-3 text-center">
                <span
                  style={MONO}
                  className="flex size-10 items-center justify-center rounded-full bg-[#2e5bff] text-[11px] font-semibold text-white"
                >
                  {s.n}
                </span>
                <h3 className="pb-2 pt-4 text-[14px] font-semibold leading-[21px] text-[#0a0a0a]">{s.title}</h3>
                <p className="max-w-[236px] text-[12px] leading-[19.5px] text-[#4a4d57]">{s.body}</p>
                <div className="pt-5">
                  <StepVisual index={i} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

function StepVisual({ index }: { index: number }) {
  const card = 'rounded-[10px] border border-[#e2e8f0] bg-white';
  if (index === 0) {
    return (
      <div aria-hidden className={`${card} w-[85px] p-4`}>
        {[0, 1, 2].map((k) => (
          <div key={k} className={k ? 'pt-2' : ''}>
            <div className="h-[5px] w-[25px] rounded-md bg-[#cbd5e1]" />
            <div className="mt-1 h-[22px] rounded-lg border border-[#e2e8f0] bg-[#f8faff]" />
          </div>
        ))}
        <div className="mt-3 rounded-lg bg-[#2e5bff] py-1.5 text-center text-[9px] font-semibold leading-[13.5px] text-white">
          Publish role
        </div>
      </div>
    );
  }
  if (index === 1) {
    const bars = [
      { w: '100%', c: '#16a34a' },
      { w: '100%', c: '#16a34a' },
      { w: '60%', c: '#2e5bff' },
      { w: '0%', c: '#2e5bff' },
    ];
    return (
      <div aria-hidden className={`${card} w-[170px] p-4 pb-2`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold leading-[15px] text-[#0f172a]">Interview in progress</span>
          <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[9px] font-semibold leading-[13.5px] text-[#16a34a]">
            Live
          </span>
        </div>
        {bars.map((b, k) => (
          <div key={k} className={`h-1 overflow-hidden rounded-full bg-[#e2e8f0] ${k ? 'mt-2' : 'mt-3'}`}>
            <div className="h-1 rounded-full" style={{ width: b.w, background: b.c }} />
          </div>
        ))}
        <div className="h-2" />
      </div>
    );
  }
  if (index === 2) {
    const rows = [
      { r: '#1', s: 91, tag: 'Viewed', tone: 'bg-[#fff7ed] text-[#c2410c]' },
      { r: '#2', s: 88, tag: 'Free', tone: 'bg-[#f3f4f6] text-[#6b7280]' },
      { r: '#3', s: 84, tag: 'Free', tone: 'bg-[#f3f4f6] text-[#6b7280]' },
    ];
    return (
      <div aria-hidden className="w-[126px] overflow-hidden rounded-[10px] border border-[#e2e8f0]">
        {rows.map((x) => (
          <div key={x.r} className="flex items-center gap-2 border-b border-[#f1f5f9] bg-white px-3 py-2 last:border-b-0">
            <span style={MONO} className="w-6 text-[10px] font-bold leading-[15px] text-[#0f172a]">
              {x.r}
            </span>
            <span className="h-[5px] min-w-px flex-1 rounded bg-[#e2e8f0]" />
            <span style={MONO} className="text-[10px] font-bold leading-[15px] text-[#2563eb]">
              {x.s}
            </span>
            <span className={`rounded-full px-1.5 py-0.5 text-[8px] leading-3 ${x.tone}`}>{x.tag}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden className={`${card} w-[133px] p-4`}>
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full border border-[#c7d2ff] bg-[#eef1ff] text-[8px] font-bold text-[#2e5bff]">
          JR
        </span>
        <div className="text-left">
          <p className="text-[10px] font-semibold leading-[15px] text-[#0f172a]">Jamie R.</p>
          <p className="text-[8px] leading-3 text-[#94a3b8]">Resume unlocked</p>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-[#dcfce7] py-1.5 text-center text-[9px] font-semibold leading-[13.5px] text-[#16a34a]">
        Moved to next round
      </div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="scroll-mt-[72px] bg-white py-20 lg:py-28">
      <Container>
        <Eyebrow>Features</Eyebrow>
        <SectionTitle>Built for the first round</SectionTitle>
        <div className="pt-12">
          <IconCardGrid items={FEATURES} compact />
        </div>
      </Container>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const featured = !!plan.featured;
  const btn =
    'flex h-10 w-full items-center justify-center rounded-[7px] text-[13px] font-medium transition-colors';
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-7 ${
        featured
          ? 'border-2 border-[#2e5bff] bg-[#f7f9ff] shadow-[0px_18px_21px_rgba(46,91,255,0.14)]'
          : 'border border-[#e2e8f0] bg-white shadow-[0px_1px_1.5px_rgba(0,0,0,0.06)]'
      }`}
    >
      {plan.featured && (
        <span className="absolute -top-3 right-5 rounded-full bg-[#2e5bff] px-3 py-1 text-[10px] font-medium leading-[15px] text-white">
          {plan.featured.badge}
        </span>
      )}
      <p className="pb-1 text-[15px] font-medium leading-[22.5px] text-[#0a0a0a]">{plan.name}</p>
      <p className="flex items-baseline gap-1.5">
        <span
          style={MONO}
          className={`text-[32px] leading-[48px] tracking-[-0.8px] ${featured ? 'text-[#2e5bff]' : 'text-[#0a0a0a]'}`}
        >
          {plan.price}
        </span>
        {plan.per && <span className="text-[13px] leading-[19.5px] text-[#90a1b9]">{plan.per}</span>}
      </p>
      <div className="pb-5">
        {plan.notes.map((n, i) => (
          <p
            key={n}
            className={`text-[#90a1b9] ${featured ? 'pt-0.5 text-[11px] leading-[16.5px]' : 'text-[12px] leading-[18px]'} ${!featured && i === 0 ? 'pb-1' : ''}`}
          >
            {n}
          </p>
        ))}
      </div>
      <ul className="flex flex-1 flex-col gap-2.5 pb-5">
        {plan.features.map((f) => (
          <li key={f.text} className="flex items-start gap-2.5">
            <img
              src={featured ? imgCheckBrand : imgCheckMuted}
              alt=""
              width={14}
              height={14}
              className="mt-0.5 shrink-0"
            />
            <span className={`text-[13px] leading-[19.5px] text-[#0a0a0a] ${f.strong ? 'font-medium' : ''}`}>
              {f.text}
            </span>
          </li>
        ))}
      </ul>
      {plan.cta.action === 'sales' ? (
        <a href={SALES_HREF} className={`${btn} border border-[#e2e8f0] bg-white text-[#0a0a0a] hover:bg-[#f8fafc]`}>
          {plan.cta.label}
        </a>
      ) : featured ? (
        <Link to={SIGNUP} className={`${btn} bg-[#2e5bff] text-white hover:bg-[#1e3fcc]`}>
          {plan.cta.label}
        </Link>
      ) : (
        <Link to={SIGNUP} className={`${btn} border border-[#2e5bff] bg-white text-[#1231b8] hover:bg-[#f0f3ff]`}>
          {plan.cta.label}
        </Link>
      )}
    </div>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-[72px] bg-[#d0e0f8] py-20 lg:py-28">
      <Container>
        <Eyebrow>Pricing</Eyebrow>
        <SectionTitle className="max-w-[1040px] !text-[32px] sm:!text-[40px] lg:!text-[46px]">
          Pay to contact candidates, not to sort through them.
        </SectionTitle>
        <p className="pt-3 text-center text-[16px] leading-6 text-[#4a4d57]">
          Applicants and rankings are always free to view.
        </p>

        <div className="grid grid-cols-1 gap-5 pt-12 md:grid-cols-3">
          {PLANS.map((p) => (
            <PlanCard key={p.name} plan={p} />
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-[#e2e8f0] bg-white px-6 py-5">
          <p className="text-[13px] font-semibold leading-[19.5px] text-[#0a0a0a]">Every plan includes</p>
          <ul className="flex flex-wrap gap-x-10 gap-y-2 pt-3">
            {EVERY_PLAN.map((t) => (
              <li key={t} className="flex items-center gap-2 text-[13px] leading-[19.5px] text-[#4a4d57]">
                <span className="size-1.5 shrink-0 rounded-full bg-[#2e5bff]" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <h3 className="pt-10 text-center text-[18px] font-semibold leading-[27px] text-[#0a0a0a]">Compare plans</h3>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[#e2e8f0] text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px]">
                <th className="px-5 py-3 text-[#90a1b9]">Feature</th>
                <th className="w-[120px] px-4 py-3 text-center text-[#90a1b9]">Free</th>
                <th className="w-[160px] bg-[#f7f9ff] px-4 py-3 text-center text-[#2e5bff]">Business · $399/mo</th>
                <th className="w-[140px] px-4 py-3 text-center text-[#90a1b9]">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(([feature, free, biz, ent]) => (
                <tr key={feature} className="border-b border-[#f1f5f9] align-top last:border-b-0">
                  <th scope="row" className="px-5 py-3 text-[13px] font-medium leading-[19.5px] text-[#0a0a0a]">
                    {feature}
                  </th>
                  <td className="px-4 py-3 text-center text-[12px] leading-[18px] text-[#4a4d57]">{free}</td>
                  <td className="bg-[#f7f9ff] px-4 py-3 text-center text-[12px] font-medium leading-[18px] text-[#0a0a0a]">
                    {biz}
                  </td>
                  <td className="px-4 py-3 text-center text-[12px] leading-[18px] text-[#4a4d57]">{ent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="scroll-mt-[72px] bg-white py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[720px] px-4 sm:px-10">
        <Eyebrow>FAQ</Eyebrow>
        <h2
          style={SERIF}
          className="mt-4 text-center text-[34px] font-normal leading-[1.2] tracking-[-1px] text-[#0a0a0a] sm:text-[40px]"
        >
          Common Questions
        </h2>
        <div className="mt-12 border-b border-[#e1e4ea]">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-t border-[#e1e4ea]">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`emp-faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span className="text-[16px] font-medium leading-[23.375px] text-[#1e232f] sm:text-[17px]">
                    {f.q}
                  </span>
                  <span aria-hidden className="relative size-6 shrink-0">
                    <span className="absolute left-0 top-3 h-px w-6 bg-[#5a6172]" />
                    <span
                      className={`absolute left-3 top-0 h-6 w-px bg-[#5a6172] transition-transform duration-200 ${isOpen ? 'scale-y-0' : ''}`}
                    />
                  </span>
                </button>
                {/* Kept in the DOM while closed so the prerendered snapshot carries the answers. */}
                <div id={`emp-faq-${i}`} hidden={!isOpen} className="pb-6 pr-10">
                  <p className="text-[15px] leading-[24px] text-[#4a4d57]">{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col items-start gap-5 rounded-2xl border border-[#dde6ff] bg-[#f7f9ff] p-7 sm:flex-row sm:items-center">
          <p className="flex-1 text-[14px] leading-[22.75px] text-[#4a4d57]">
            Hiring at volume, or running an agency? Email{' '}
            <a href={SALES_HREF} className="text-[#2e5bff] hover:underline">
              {SALES_EMAIL}
            </a>{' '}
            and a real person on the Screna team will set up a walkthrough. We reply within one business
            day, Mon–Fri, 9:00 AM–5:00 PM ET.
          </p>
          <a
            href={SALES_HREF}
            className="flex h-10 shrink-0 items-center rounded-full bg-[#2e5bff] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#1e3fcc]"
          >
            Talk to sales
          </a>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-[#f7f9ff] px-4 py-16 sm:px-10 lg:py-24">
      <div
        className="mx-auto max-w-[800px] rounded-3xl px-6 py-14 text-center shadow-[0px_16px_24px_rgba(46,91,255,0.25)] sm:px-8"
        style={{ backgroundImage: 'linear-gradient(154deg, #2e5bff 0%, #1e3fcc 100%)' }}
      >
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-5 bg-white/50" />
          <span className="text-[11px] font-semibold uppercase leading-[16.5px] tracking-[1.5px] text-white/80">
            Get started
          </span>
          <span className="h-px w-5 bg-white/50" />
        </div>
        <h2
          style={SERIF}
          className="mx-auto mt-6 max-w-[736px] text-[34px] font-normal leading-[1.2] tracking-[-0.025em] text-white sm:text-[46px]"
        >
          Start your next search with ranked interviews.
        </h2>
        <p className="pb-8 pt-4 text-[16px] leading-6 text-white/80">Post your first role free. No credit card.</p>
        <Link
          to={SIGNUP}
          className="inline-flex h-12 items-center rounded-full bg-white px-7 text-[15px] font-semibold text-[#2e5bff] transition-colors hover:bg-[#f0f3ff]"
        >
          Post a role free
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

type FooterItem = { label: string } & ({ to: string } | { href: string } | { section: string });

const FOOTER_COLUMNS: { title: string; items: FooterItem[] }[] = [
  {
    title: 'For Hiring Teams',
    items: [
      { label: 'How it works', section: 'how-it-works' },
      { label: 'Features', section: 'features' },
      { label: 'Pricing', section: 'pricing' },
      { label: 'Talk to sales', href: SALES_HREF },
    ],
  },
  {
    title: 'For Job Seekers',
    items: [
      { label: 'Screna for candidates', to: '/' },
      { label: 'Candidate pricing', to: '/#pricing' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Privacy Policy', to: '/privacy' },
      // No employer-specific terms page exists yet; the general terms cover it.
      { label: 'Employer Terms', to: '/terms' },
    ],
  },
];

function FooterLink({ item, className }: { item: FooterItem; className: string }) {
  if ('section' in item) {
    return (
      <button type="button" onClick={() => scrollTo(item.section)} className={className}>
        {item.label}
      </button>
    );
  }
  if ('href' in item) {
    return (
      <a href={item.href} className={className}>
        {item.label}
      </a>
    );
  }
  return (
    <Link to={item.to} className={className}>
      {item.label}
    </Link>
  );
}

const SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/screnaai/', icon: imgLinkedIn, size: 15 },
  { label: 'X / Twitter', href: 'https://x.com/screnaai_', icon: imgX, size: 14 },
  { label: 'Email', href: `mailto:${SALES_EMAIL}`, icon: imgEmail, size: 14 },
];

function SiteFooter() {
  const link = 'text-[13px] leading-[19.5px] text-[#8a8f9a] transition-colors hover:text-white';
  return (
    <footer className="bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1120px] px-4 pb-10 pt-14 sm:px-10">
        <div className="flex flex-col gap-12 md:flex-row md:gap-16">
          <div className="w-full shrink-0 md:w-[208px]">
            <img src={imgLogo} alt="Screna" className="h-6 w-auto" />
            <p className="pt-3 text-[14px] font-medium leading-[21px] text-white">Screna</p>
            <p className="pt-2 text-[13px] leading-[21.125px] text-[#8a8f9a]">Only see candidates who showed up.</p>
            <div className="flex items-center gap-3 pt-5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  {...(s.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="flex size-9 items-center justify-center rounded-[14px] border border-[#2a2a2a] bg-[#1a1a1a] transition-colors hover:border-[#4a4d57]"
                >
                  <img src={s.icon} alt="" width={s.size} height={s.size} />
                </a>
              ))}
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.55px] text-[#4a4d57]">
                  {col.title}
                </p>
                <ul className="flex flex-col gap-2.5 pt-4">
                  {col.items.map((it) => (
                    <li key={it.label}>
                      <FooterLink item={it} className={`${link} text-left`} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-[#1e1e1e] pt-8 text-[12px] leading-[18px] text-[#4a4d57] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Screna AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/help" className="hover:text-white">
              System Status
            </Link>
            <Link to="/data-protection" className="hover:text-white">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default EmployerLandingPage;
