import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Footer } from '@/components/newDesign/home/footer';
import { MembershipOnboardingModal } from '@/components/newDesign/membership-onboarding-modal';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentService } from '@/services';
import { useSubscription, type Tier } from '@/hooks/useSubscription';

// ── SVG helpers ───────────────────────────────────────────────────────────────
const CheckFull = () => (
  <span
    className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full bg-[hsl(221,91%,60%)] text-white"
    style={{ boxShadow: '0 3px 10px -3px rgba(46,91,255,0.45)' }}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3L13 4.5"/></svg>
  </span>
);
const CheckMuted = () => (
  <span className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full border border-slate-200 text-slate-400">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3L13 4.5"/></svg>
  </span>
);
const XMark = () => (
  <span className="inline-flex items-center justify-center w-[26px] h-[26px] text-[#c8ccd3]">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
  </span>
);
const Note = ({ text }: { text: string }) => (
  <span className="text-[12px] font-[500] text-slate-400 tracking-[-0.005em] leading-[1.3] px-1 text-center">{text}</span>
);
const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4"/>
  </svg>
);

// ── Credit price calculator ───────────────────────────────────────────────────
function creditPrice(q: number): number {
  const p100 = 0.1499, p1000 = 0.12;
  const theory = p100 - (p100 - p1000) * Math.log10(q / 100);
  const total = q * theory;
  const step = 0.5;
  const rounded = Math.ceil(total / step) * step - 0.01;
  return Math.max(rounded, 19.99);
}

// ── Company logo list for hero + social proof ─────────────────────────────────
interface LogoEntry {
  name: string;
  src: string;   // URL — CDN or /public path
  h?: number;    // display height in px
}

// Hero marquee — tech companies (local seeklogo files in /public/logos/companies/)
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

// Social proof marquee — universities (local seeklogo files + clearbit for NYU/Columbia)
const cb = (domain: string) => `https://logo.clearbit.com/${domain}?size=200`;

const UNIVERSITY_LOGOS: LogoEntry[] = [
  { name: 'Stanford',        src: '/logos/universities/stanford.png', h: 36 },
  { name: 'UC Berkeley',     src: '/logos/universities/ucb.png',      h: 36 },
  { name: 'Carnegie Mellon', src: '/logos/universities/cmu.svg',      h: 36 },
  { name: 'MIT',             src: '/logos/universities/mit.png',      h: 36 },
  { name: 'U of Michigan',   src: '/logos/universities/umich.svg',    h: 36 },
  { name: 'NYU',             src: '/logos/universities/nyu.png',      h: 36 },
  { name: 'Cornell',         src: '/logos/universities/cornell.svg',  h: 36 },
  { name: 'Columbia',        src: '/logos/universities/columbia.png', h: 36 },
  { name: 'UW',              src: '/logos/universities/uw.png',       h: 36 },
  { name: 'UIUC',            src: '/logos/universities/uiuc.png',     h: 36 },
];

// ── Infinite horizontal logo marquee ─────────────────────────────────────────
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

// ── Hero tracker mockup ───────────────────────────────────────────────────────
function HeroTracker() {
  const navItems = ['Dashboard','Mock interviews','Interview insights','Mentors','Applications','Resume'];
  const stages = [
    { n: '01', l: 'Understand', s: 'done' },
    { n: '02', l: 'Practice',   s: 'active' },
    { n: '03', l: 'Get support',s: 'todo' },
    { n: '04', l: 'Apply',      s: 'todo' },
    { n: '05', l: 'Offer',      s: 'todo' },
  ];
  const tasks = [
    { l: 'System design · 3 mocks',         p: 100 },
    { l: 'Behavioral · STAR tightening',     p: 66  },
    { l: 'Coding · 2 hard DP problems',      p: 50  },
    { l: 'Read 3 Meta E5 experiences',       p: 100 },
    { l: '1-on-1 with coach',                p: 0   },
  ];
  return (
    <div style={{ borderRadius: 20, background: '#fff', border: '1px solid #E8E8EA', boxShadow: '0 2px 4px rgba(10,10,10,0.03),0 30px 60px -20px rgba(30,60,120,0.18),0 80px 120px -40px rgba(30,60,120,0.12)', overflow: 'hidden' }}>
      {/* App chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid #F0F0F2', background: '#FBFBFC' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#EEE','#EEE','#EEE'].map((c, i) => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />)}
        </div>
        <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: '#fff', border: '1px solid #EEE', borderRadius: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8a8f9a' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#bfc4cc', display: 'inline-block' }} />
          app.screna.ai / career
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#5b5f6a' }}>
          <span>Priya Shah</span>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#E7EFFB,#C9D8EF)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#2B7AEF' }}>PS</span>
        </div>
      </div>
      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 480 }}>
        {/* Sidebar */}
        <aside style={{ borderRight: '1px solid #F0F0F2', padding: '22px 18px', background: '#FBFBFC' }}>
          <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a8f9a', marginBottom: 10 }}>Workspace</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map((l, i) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13, color: i === 0 ? '#2E5BFF' : '#5b5f6a', background: i === 0 ? '#F0F3FF' : 'transparent', fontWeight: i === 0 ? 600 : 450 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#2E5BFF' : '#cfd3da', display: 'inline-block' }} />{l}
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: '#F0F0F2', margin: '22px -18px 22px' }} />
          <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a8f9a', marginBottom: 10 }}>Your journey</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, color: '#0A0A0A', lineHeight: 1.3 }}>Staff backend · Meta, Stripe, Airbnb</div>
          <div style={{ fontSize: 11, color: '#8a8f9a', marginTop: 4 }}>Target start · June 2026</div>
        </aside>
        {/* Main */}
        <div style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2E5BFF', marginBottom: 8, fontWeight: 600 }}>Your career path</div>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 400, fontSize: 28, letterSpacing: '-0.02em', margin: 0, color: '#0A0A0A', lineHeight: 1.15 }}>
                You're in <em style={{ color: '#2E5BFF' }}>Practice</em>.
                <span style={{ color: '#8a8f9a', fontSize: 14, fontFamily: "'Inter',sans-serif", fontStyle: 'normal', marginLeft: 8 }}>Week 3 of 7</span>
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: '#8a8f9a' }}>Progress</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#2E5BFF', fontWeight: 600 }}>42%</span>
            </div>
          </div>
          {/* Progress rail */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
              {stages.map(st => (
                <div key={st.n}>
                  <div style={{ height: 4, borderRadius: 2, background: st.s === 'done' ? '#2E5BFF' : st.s === 'active' ? 'linear-gradient(to right,#2E5BFF 55%,#E8E8EA 55%)' : '#E8E8EA' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: st.s === 'done' ? '#2E5BFF' : '#fff', border: `1px solid ${st.s === 'done' ? '#2E5BFF' : st.s === 'active' ? '#2E5BFF' : '#E8E8EA'}`, color: st.s === 'done' ? '#fff' : '#2E5BFF', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {st.s === 'done' ? '✓' : st.n}
                    </span>
                    <div style={{ fontSize: 12, color: '#0A0A0A', fontWeight: 500 }}>{st.l}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Two cards row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginTop: 36 }}>
            {/* This week */}
            <div style={{ border: '1px solid #F0F0F2', borderRadius: 14, padding: '18px 20px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A' }}>This week</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8a8f9a' }}>3 of 5</div>
              </div>
              {tasks.map(row => (
                <div key={row.l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid #F6F6F8' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: row.p === 100 ? '#22B07D' : '#fff', border: `1px solid ${row.p === 100 ? '#22B07D' : '#D7D9DE'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8 }}>
                    {row.p === 100 ? '✓' : ''}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: row.p === 100 ? '#8a8f9a' : '#0A0A0A', textDecoration: row.p === 100 ? 'line-through' : 'none' }}>{row.l}</div>
                    <div style={{ height: 3, background: '#F3F3F5', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${row.p}%`, background: row.p === 100 ? '#22B07D' : '#2E5BFF' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Next up */}
            <div style={{ border: '1px solid #E4EAFC', borderRadius: 14, padding: '18px 20px', background: 'linear-gradient(160deg,#F0F3FF 0%,#FFFFFF 60%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A' }}>Next up</div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600, color: '#22B07D', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22B07D', display: 'inline-block' }} />Live
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#8a8f9a', marginBottom: 16 }}>In 12 minutes · with Aditi D.</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.01em', color: '#0A0A0A', marginBottom: 20 }}>Staff backend system design</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: '8px 12px', background: '#2E5BFF', color: '#fff', fontSize: 12, fontWeight: 500, borderRadius: 999, textAlign: 'center', boxShadow: '0 6px 16px -4px rgba(46,91,255,0.4)' }}>Join mock</div>
                <div style={{ padding: '8px 12px', background: '#fff', color: '#0A0A0A', fontSize: 12, fontWeight: 500, borderRadius: 999, textAlign: 'center', border: '1px solid #E8E8EA' }}>Reschedule</div>
              </div>
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(10,10,10,0.06)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex' }}>
                  {['#C9D8EF','#EFD5C6','#CFE3D8'].map((c, i) => (
                    <span key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: i === 0 ? 0 : -8, display: 'inline-block' }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#5b5f6a', lineHeight: 1.4 }}>3 mentors available<br/>in your target role today</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pillar shot mockups ───────────────────────────────────────────────────────
function ShotAI() {
  return (
    <div style={{ width: '100%', maxWidth: 300, background: '#fff', border: '1px solid #E8E8EA', borderRadius: 12, boxShadow: '0 20px 40px -12px rgba(10,10,10,0.12)', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 110, background: 'linear-gradient(135deg,#1a2d4a,#0e1a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ position: 'absolute', top: 10, left: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.22)', color: '#FCA5A5', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 999 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />Recording
        </span>
        <span style={{ position: 'absolute', top: 12, right: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 6 }}>05:20</span>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#C9D8EF,#2B7AEF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 15, boxShadow: '0 0 0 4px rgba(255,255,255,0.08)' }}>AD</div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a8f9a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="11" height="11" fill="none" stroke="#2B7AEF" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z" strokeLinejoin="round"/></svg>
          Live coaching
        </div>
        <div style={{ background: '#F0F7EE', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2A7A47', marginBottom: 2 }}>Strong framing</div>
          <div style={{ fontSize: 10.5, color: '#3c3e42', lineHeight: 1.4 }}>You asked the right scoping questions in the first 30 seconds.</div>
        </div>
        <div style={{ background: '#FDF5E8', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#A06912', marginBottom: 2 }}>Try a trade-off</div>
          <div style={{ fontSize: 10.5, color: '#3c3e42', lineHeight: 1.4 }}>Name one concrete trade-off before diving into the design.</div>
        </div>
      </div>
    </div>
  );
}

function ShotCommunity() {
  const rows = [
    { n: 'Priya S.',  r: 'Staff SWE', c: 'Stripe', t: '2d', o: 'offer',  init: 'PS', bg: '#C9D8EF' },
    { n: 'Ravi M.',   r: 'Staff SWE', c: 'Meta',   t: '3d', o: 'offer',  init: 'RM', bg: '#EFD5C6' },
    { n: 'Jordan K.', r: 'Senior PM', c: 'Airbnb', t: '4d', o: 'reject', init: 'JK', bg: '#CFE3D8' },
    { n: 'Alicia N.', r: 'SWE L4',   c: 'Google', t: '5d', o: 'offer',  init: 'AN', bg: '#E0D4EF' },
  ];
  return (
    <div style={{ width: '100%', maxWidth: 300, background: '#fff', border: '1px solid #E8E8EA', borderRadius: 12, boxShadow: '0 20px 40px -12px rgba(10,10,10,0.12)' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #F0F0F2', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 500 }}>Fresh experiences</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600, color: '#22B07D', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22B07D', display: 'inline-block' }} />Live
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#8a8f9a' }}>this week · 847</span>
      </div>
      {rows.map((row, i) => (
        <div key={row.init} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < 3 ? '1px solid #F6F6F8' : 'none' }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: row.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#0A0A0A', flexShrink: 0 }}>{row.init}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: '#0A0A0A' }}>{row.n} · <span style={{ color: '#5b5f6a', fontWeight: 450 }}>{row.r}</span></div>
            <div style={{ fontSize: 10.5, color: '#8a8f9a' }}>{row.c} · {row.t} ago · 4 rounds</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, ...(row.o === 'offer' ? { background: 'rgba(34,176,125,0.12)', color: '#17794F' } : { background: '#F5F0F0', color: '#8a8f9a' }) }}>{row.o}</span>
        </div>
      ))}
      <div style={{ padding: '10px 14px', background: '#FBFBFC', borderTop: '1px solid #F0F0F2', borderRadius: '0 0 12px 12px' }}>
        <div style={{ fontSize: 10, color: '#8a8f9a', marginBottom: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>Top question this week</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 12.5, lineHeight: 1.35, color: '#0A0A0A', fontStyle: 'italic' }}>"Design a rate limiter for a global API at 10M QPS."</div>
      </div>
    </div>
  );
}

function ShotMentor() {
  const tags = ['System design','Backend','E5/E6 loops','Offer negotiation'];
  return (
    <div style={{ width: '100%', maxWidth: 300, background: '#fff', border: '1px solid #E8E8EA', borderRadius: 12, boxShadow: '0 20px 40px -12px rgba(10,10,10,0.12)', overflow: 'hidden' }}>
      <div style={{ height: 56, background: 'linear-gradient(120deg,#E7EFFB,#D7E3F7)' }} />
      <div style={{ padding: '0 16px 16px', marginTop: -26 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#EFD5C6,#E6B998)', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#6b3a1c', marginBottom: 10 }}>AD</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: '#0A0A0A', letterSpacing: '-0.01em', lineHeight: 1.1 }}>Aditi D.</div>
          <div style={{ fontSize: 10, color: '#2A7A47', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2A7A47', display: 'inline-block' }} />Available
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: '#5b5f6a', marginTop: 4 }}>Staff Engineer · Stripe · ex-Meta</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '12px 0' }}>
          {tags.map(t => (
            <span key={t} style={{ fontSize: 9.5, color: '#5b5f6a', padding: '3px 7px', border: '1px solid #E8E8EA', borderRadius: 999 }}>{t}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#5b5f6a', lineHeight: 1.45, padding: '10px 12px', background: '#FBFBFC', borderRadius: 8, marginBottom: 12, fontStyle: 'italic', fontFamily: "'Playfair Display',serif" }}>"Helped 40+ engineers land staff roles at FAANG + unicorns."</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, color: '#0A0A0A' }}>$80<span style={{ fontSize: 10.5, color: '#8a8f9a', fontFamily: "'Inter',sans-serif" }}> · 45 min</span></div>
          <div style={{ padding: '7px 12px', background: '#2E5BFF', color: '#fff', fontSize: 11.5, fontWeight: 500, borderRadius: 999, boxShadow: '0 6px 16px -4px rgba(46,91,255,0.45)' }}>Book session</div>
        </div>
      </div>
    </div>
  );
}

function ShotSupport() {
  return (
    <div style={{ width: '100%', maxWidth: 300, background: '#fff', border: '1px solid #E8E8EA', borderRadius: 12, boxShadow: '0 20px 40px -12px rgba(10,10,10,0.12)', overflow: 'hidden' }}>
      <div style={{ padding: '11px 13px', borderBottom: '1px solid #F0F0F2', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A' }}>Career support</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600, color: '#22B07D', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22B07D', display: 'inline-block' }} />24/7
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#8a8f9a' }}>Members only</span>
      </div>
      <div style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 9, background: '#FBFBFC' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 17, height: 17, borderRadius: '50%', background: '#7C3AED', color: '#fff', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✦</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED' }}>AI Coach</span>
          </div>
          <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '8px 10px', fontSize: 11, lineHeight: 1.4, color: '#1f1a2e' }}>Based on your L5 offer from Google, push back on: sign-on bonus (20–30% flex) and RSU cliff timing.</div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 17, height: 17, borderRadius: '50%', background: '#16A34A', color: '#fff', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>S</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#16A34A' }}>Sarah · Screna team</span>
          </div>
          <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '8px 10px', fontSize: 11, lineHeight: 1.4, color: '#14321b' }}>Saw you're prepping the Meta system design loop — here are our top 3 picks for E5.</div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 17, height: 17, borderRadius: '50%', background: '#7C3AED', color: '#fff', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✦</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED' }}>AI Coach</span>
          </div>
          <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '8px 10px', fontSize: 11, lineHeight: 1.4, color: '#1f1a2e' }}>Your next mock is Thursday. Want 3 practice questions on last session's weak areas?</div>
        </div>
      </div>
    </div>
  );
}

// ── Stats item with count-up animation ────────────────────────────────────────
function StatItem({ num, suf, label }: { num: number; suf: string; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !animated.current) {
          animated.current = true;
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.textContent = String(num);
            observer.disconnect();
            return;
          }
          const DURATION = 1600;
          const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION);
            el.textContent = String(Math.round(num * easeOut(t)));
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = String(num);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [num]);

  return (
    <div className="flex flex-col items-center text-center gap-2.5 px-5">
      <div style={{ fontFamily: "'Playfair Display', serif" }} className="flex items-baseline leading-none tracking-[-0.03em]">
        <span ref={ref} className="text-[52px] font-[400] text-slate-900">0</span>
        <span className="text-[36px] font-[400] text-[hsl(221,91%,60%)] ml-0.5">{suf}</span>
      </div>
      <p className="text-[13px] text-slate-500 leading-snug max-w-[24ch]">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-36 pb-24" style={{ background: 'radial-gradient(ellipse 1000px 500px at 50% -5%, #F0F3FF, transparent 65%), linear-gradient(180deg, #F7F9FF 0%, #FFFFFF 70%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(46,91,255,0.13), transparent 60%)', animation: 'pulse 7s ease-in-out infinite' }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <p className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase text-[#2E5BFF] mb-7">
          <span className="w-6 h-px bg-[#2E5BFF]" />
          AI · COMMUNITY · CAREER SUPPORT
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(44px,7vw,84px)] font-[500] leading-[1.02] tracking-[-0.02em] text-[#0A0A0A] mb-9 max-w-[22ch] mx-auto">
          Unlock career opportunities{' '}
          <em className="italic text-[#4a4d57] font-[400]">10X closer</em>{' '}
          with Industry Insiders.
        </h1>
        <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 max-w-[1100px] mx-auto mb-10 px-2" aria-label="Why members choose Screna">
          {[
            'Full-time career managers own your pipeline',
            'Vetted recruiter networks surface hidden roles',
            'Industry coaches share insider intel',
          ].map((feature) => (
            <li key={feature} className="inline-flex items-center gap-2 text-[clamp(12px,0.95vw,14px)] font-[500] text-[#4a4d57] leading-[1.3] tracking-[-0.005em] whitespace-normal sm:whitespace-nowrap">
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded-full text-[#2E5BFF]"
                style={{ border: '1.5px solid #2E5BFF', background: 'rgba(255,255,255,0.5)' }}
              >
                <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3L13 4.5"/></svg>
              </span>
              {feature}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-center gap-4 mb-16 flex-wrap">
          <Link to="/auth" className="inline-flex items-center gap-2 h-[44px] px-5 rounded-full bg-[#2E5BFF] text-white text-[14px] font-[500] tracking-[-0.005em] hover:bg-[#1E48E6] hover:-translate-y-0.5 transition-all duration-200" style={{ boxShadow: '0 6px 18px -4px rgba(46,91,255,0.35)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white" style={{ animation: 'breathe 1.8s ease-in-out infinite' }}></span>
            Start free
          </Link>
          <a href="#pillars" className="inline-flex items-center gap-2 h-[44px] px-2 text-[#0A0A0A] text-[14px] font-[500] tracking-[-0.005em] hover:text-[#2E5BFF] transition-colors duration-200 group">
            See how it works
            <span className="group-hover:translate-x-1 transition-transform duration-200">
              <ArrowRight />
            </span>
          </a>
        </div>
        <style>{`
          @keyframes breathe {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.45; transform: scale(0.8); }
          }
        `}</style>

        {/* Hero visual: career progress tracker mockup */}
        <div className="relative max-w-4xl mx-auto">
          {/* Floating chips */}
          <div className="absolute -top-4 left-6 z-10 flex items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-lg border border-slate-100/80 text-[12.5px] font-medium text-slate-700" style={{ boxShadow: '0 10px 30px -10px rgba(10,10,10,0.12), 0 20px 60px -20px rgba(46,91,255,0.2)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 0 4px rgba(34,176,125,0.15)' }}></span>
            Priya S. just landed at Stripe
          </div>
          <div className="absolute top-1/3 -right-2 z-10 flex items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-lg border border-slate-100/80 text-[12.5px] text-slate-700" style={{ boxShadow: '0 10px 30px -10px rgba(10,10,10,0.12)' }}>
            <span className="w-6 h-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#2E5BFF,#1231B8)' }}>AD</span>
            Aditi's session · in 12 min
          </div>
          <div className="absolute -bottom-4 left-8 z-10 flex items-center gap-1.5 bg-white rounded-2xl px-3 py-2 shadow-lg border border-slate-100/80 text-[12.5px] text-slate-700" style={{ boxShadow: '0 10px 30px -10px rgba(10,10,10,0.12)' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[hsl(221,91%,60%)] font-semibold">+6 this week</span>
            <span className="text-slate-400 text-[11px]">mocks done</span>
          </div>
          {/* Scale tracker to fit container on all screen sizes */}
          <style>{`
            .tracker-outer { overflow: hidden; border-radius: 20px; height: 600px; }
            .tracker-inner { transform-origin: top left; }
            @media (max-width: 1024px) {
              .tracker-outer { height: 468px; }
              .tracker-inner { transform: scale(0.78); width: calc(100% / 0.78); }
            }
            @media (max-width: 640px) {
              .tracker-outer { height: 300px; }
              .tracker-inner { transform: scale(0.5); width: calc(100% / 0.5); }
            }
          `}</style>
          <div className="tracker-outer">
            <div className="tracker-inner">
              <HeroTracker />
            </div>
          </div>
        </div>
      </div>

      {/* Company logos marquee */}
      <div className="relative mt-20">
        <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[10.5px] uppercase tracking-[0.1em] text-slate-400 mb-6 text-center">
          Members have landed roles at
        </p>
        <LogoMarquee logos={HERO_LOGOS} />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { num: 300, suf: '+', label: 'Startups hiring right now' },
    { num: 500, suf: '+', label: 'Recruiter connections' },
    { num: 7000, suf: '+', label: 'Contract roles' },
  ];
  return (
    <section className="bg-white py-16" style={{ borderTop: '1px solid #F0F0F2', borderBottom: '1px solid #F0F0F2' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ maxWidth: 980, margin: '0 auto' }}>
          {stats.map((s, i) => (
            <div key={s.label} className="relative">
              {i > 0 && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 hidden sm:block"
                  style={{ width: 1, height: 64, background: '#E8E8EA' }}
                />
              )}
              <StatItem {...s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PILLARS
// ─────────────────────────────────────────────────────────────────────────────
const PILLARS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/>
        <path d="M19 4l.7 2 2 .7-2 .7L19 9.5l-.7-2-2-.7 2-.7z"/>
      </svg>
    ),
    title: 'AI that tells you the why',
    desc: "Practice for your exact target role. Get feedback that explains what worked, what didn't, and what to focus on next — based on your resume and the jobs you're chasing.",
    link: '/personalized-practice',
    linkLabel: 'Start practicing',
    shot: <ShotAI />,
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/>
        <circle cx="17" cy="7.5" r="2.5"/><path d="M15.5 13c3 .4 5.5 2.6 5.5 5.5"/>
      </svg>
    ),
    title: 'Real experiences, not just ratings',
    desc: 'Read structured debriefs from people who just went through the process. See what was asked, how many rounds, and what got them the offer — searchable by company, role, and level.',
    link: '/interview-insights',
    linkLabel: 'Browse insights',
    shot: <ShotCommunity />,
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12V5.5a1.5 1.5 0 013 0V11M11 10V4.5a1.5 1.5 0 013 0V11M14 10.5V6.5a1.5 1.5 0 013 0V13"/>
        <path d="M17 13v1c0 3.9-3.1 7-7 7-2.6 0-4.9-1.4-6.1-3.5L2 13.5c-.4-.7.1-1.7.9-1.7.3 0 .6.2.8.4L5 14V8a1.5 1.5 0 013 0v5"/>
      </svg>
    ),
    title: 'A mentor who grows with your search',
    desc: "Work with a vetted mentor on a structured topic — resume, system design, offer negotiation. Come back as you progress. Build an ongoing relationship that changes what's possible.",
    link: '/marketplace',
    linkLabel: 'Find a mentor',
    shot: <ShotMentor />,
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: "Support that doesn't clock out",
    desc: "Get answers anytime from our AI career coach. Members also get direct access to our team — prep advice, curated resources, the best tools for every stage, and negotiation guidance after you land the offer.",
    link: '/auth',
    linkLabel: 'Get started',
    shot: <ShotSupport />,
  },
];

function Pillars() {
  return (
    <section id="pillars" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase text-[#2E5BFF] mb-5">
            <span className="w-6 h-px bg-[#2E5BFF]" />
            The Screna system
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(36px,4.6vw,56px)] font-[400] leading-[1.02] tracking-[-0.02em] text-[#0A0A0A] max-w-[28ch] mx-auto">
            Everything you need to run a smarter job search
            <br />
            — <em className="italic font-[400] text-[#4a4d57]">in one place.</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-[960px] mx-auto">
          {PILLARS.map(({ icon, title, desc, shot }) => (
            <article key={title} className="group relative bg-white border border-[#E8E8EA] rounded-[20px] overflow-hidden hover:border-[#D9E1FF] hover:-translate-y-1.5 transition-all duration-300 flex flex-col" style={{ boxShadow: '0 1px 3px rgba(10,10,10,0.04)' }}>
              <div className="px-8 pt-8 pb-7 flex-1">
                <div className="w-10 h-10 rounded-[10px] border border-[#E8E8EA] text-[#0A0A0A] group-hover:bg-[#2E5BFF] group-hover:text-white group-hover:border-[#2E5BFF] flex items-center justify-center mb-5 transition-all duration-300">
                  {icon}
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[26px] font-[400] text-[#0A0A0A] mb-3.5 leading-[1.15] tracking-[-0.02em]">{title}</h3>
                <p className="text-[14.5px] text-[#4a4d57] leading-[1.65]">{desc}</p>
              </div>
              {/* Mockup shot area */}
              <div className="border-t border-[#E8E8EA] bg-[#F7F7F7] group-hover:bg-[#F7F9FF] transition-colors duration-300 flex justify-center items-end px-6 pt-6 overflow-hidden" style={{ minHeight: 220 }}>
                {shot}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON TABLE
// ─────────────────────────────────────────────────────────────────────────────
type Cell = 'yes' | 'muted' | 'no' | string;

interface CmpRow {
  name: string;
  desc: string;
  screna: Cell;
  scale: Cell;
  exponent: Cell;
  simplify: Cell;
  wonsulting: Cell;
}

interface CmpGroup {
  label: string;
  rows: CmpRow[];
}

const CMP_DATA: CmpGroup[] = [
  {
    label: 'Application support',
    rows: [
      { name: 'Applies to jobs for you', desc: 'Submits role-matched applications on your behalf.', screna: 'yes', scale: 'muted', exponent: 'no', simplify: 'Form autofill only', wonsulting: 'no' },
      { name: 'Application tracking', desc: 'Dashboard of every submission, status, and follow-up.', screna: 'yes', scale: 'muted', exponent: 'no', simplify: 'muted', wonsulting: 'no' },
      { name: 'Referrals through network', desc: 'Warm intros from members inside target companies.', screna: 'yes', scale: 'no', exponent: 'no', simplify: 'no', wonsulting: 'Varies' },
    ],
  },
  {
    label: 'Interview preparation',
    rows: [
      { name: 'AI mock interviews', desc: 'Role-specific practice with instant feedback.', screna: 'yes', scale: 'no', exponent: 'muted', simplify: 'no', wonsulting: 'no' },
      { name: 'Real interview debriefs', desc: 'Questions and loops from recent candidates, by company.', screna: 'yes', scale: 'no', exponent: 'Course content', simplify: 'no', wonsulting: 'no' },
      { name: 'Mentor-led mock loops', desc: '1:1 sessions with practitioners who hire for the role.', screna: 'yes', scale: 'no', exponent: 'muted', simplify: 'no', wonsulting: 'Add-on only' },
    ],
  },
  {
    label: 'Ongoing support',
    rows: [
      { name: 'Dedicated career advisor', desc: 'A human point of contact throughout the search.', screna: 'yes', scale: 'no', exponent: 'no', simplify: 'no', wonsulting: 'One-time package' },
      { name: '24/7 AI career coach', desc: 'Always-on guidance for prep, outreach, and decisions.', screna: 'yes', scale: 'no', exponent: 'no', simplify: 'no', wonsulting: 'no' },
      { name: 'Offer negotiation support', desc: 'Coaching on comp, sign-on, RSUs, and counter strategy.', screna: 'yes', scale: 'no', exponent: 'Limited', simplify: 'no', wonsulting: 'Add-on only' },
    ],
  },
];

function renderCell(val: Cell) {
  if (val === 'yes') return <CheckFull />;
  if (val === 'muted') return <CheckMuted />;
  if (val === 'no') return <XMark />;
  return <Note text={val} />;
}

function ComparisonTable() {
  const competitors = ['Scale Jobs', 'Exponent', 'Simplify', 'Wonsulting'];

  return (
    <section className="py-24" style={{ background: '#F7F7F7' }}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Section head — centered with eyebrow dash */}
        <div className="text-center mb-16">
          <p className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase text-[#2E5BFF] mb-5">
            <span className="w-6 h-px bg-[#2E5BFF]" />
            Compare job search platforms
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(36px,4.6vw,56px)] font-[400] leading-[1.02] tracking-[-0.02em] text-[#0A0A0A] max-w-[22ch] mx-auto mb-4">
            How Screna compares to{' '}
            <em className="italic font-[400] text-[#4a4d57]">alternatives.</em>
          </h2>
          <p className="text-[17px] text-[#4a4d57] leading-[1.55] max-w-[54ch] mx-auto">
            See how Screna combines AI, community signals, and human support into one career command center.
          </p>
        </div>

        {/* Unified grid table */}
        <div className="max-w-[1100px] mx-auto overflow-x-auto">
          <div
            className="bg-white border border-slate-200 rounded-[20px] overflow-hidden min-w-[840px]"
            style={{ boxShadow: '0 1px 2px rgba(10,10,10,0.03), 0 20px 50px -24px rgba(10,10,10,0.08)' }}
          >
            {/* Header row */}
            <div
              className="grid items-stretch border-b border-slate-200"
              style={{
                gridTemplateColumns: 'minmax(240px, 3fr) repeat(5, minmax(120px, 1fr))',
                background: '#FAFBFD',
              }}
            >
              <div />
              <div
                className="relative px-3.5 py-4 flex items-center justify-center text-center"
                style={{ background: '#DCE7FF' }}
              >
                <span className="absolute left-0 top-0 bottom-0 w-px bg-[#A8C0F0] opacity-60" />
                <span className="absolute right-0 top-0 bottom-0 w-px bg-[#A8C0F0] opacity-60" />
                <span
                  style={{ fontFamily: "'Playfair Display', serif", color: 'hsl(221,91%,42%)' }}
                  className="text-[22px] font-[500] tracking-[-0.02em] leading-tight"
                >
                  Screna
                </span>
              </div>
              {competitors.map((c) => (
                <div key={c} className="px-3.5 py-4 flex items-center justify-center text-center">
                  <span className="text-[14px] font-[600] text-slate-600 tracking-[-0.005em]">{c}</span>
                </div>
              ))}
            </div>

            {/* Body — groups & rows */}
            {CMP_DATA.map((group) => (
              <div key={group.label}>
                {/* Group label spans all columns */}
                <div
                  className="px-6 py-2.5 border-t border-slate-200 border-b border-slate-100"
                  style={{ background: '#F4F5F8' }}
                >
                  <span className="text-[11px] font-[600] tracking-[0.14em] uppercase text-slate-500">
                    {group.label}
                  </span>
                </div>
                {/* Feature rows */}
                {group.rows.map((row) => (
                  <div
                    key={row.name}
                    className="grid items-stretch border-t border-slate-100 first:border-t-0"
                    style={{ gridTemplateColumns: 'minmax(240px, 3fr) repeat(5, minmax(120px, 1fr))' }}
                  >
                    <div className="px-6 py-3 flex flex-col justify-center min-h-[64px]">
                      <p className="text-[14.5px] font-[600] text-[#0A0A0A] leading-snug tracking-[-0.005em]">
                        {row.name}
                      </p>
                      <p className="text-[12.5px] text-slate-400 mt-0.5 leading-[1.4]">{row.desc}</p>
                    </div>
                    {/* Highlighted Screna cell */}
                    <div
                      className="relative px-3.5 flex items-center justify-center min-h-[64px]"
                      style={{ background: '#EAF1FF' }}
                    >
                      <span className="absolute left-0 top-0 bottom-0 w-px bg-[#A8C0F0] opacity-60" />
                      <span className="absolute right-0 top-0 bottom-0 w-px bg-[#A8C0F0] opacity-60" />
                      {renderCell(row.screna)}
                    </div>
                    {(['scale', 'exponent', 'simplify', 'wonsulting'] as const).map((key) => (
                      <div
                        key={key}
                        className="px-3.5 flex items-center justify-center min-h-[64px]"
                      >
                        {renderCell(row[key])}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY
// ─────────────────────────────────────────────────────────────────────────────
const STAGES = [
  { num: '01', name: 'Understand', desc: 'Know where to start. We analyze your resume, suggest the right titles, and match you to roles that fit your profile and goals.' },
  { num: '02', name: 'Mock with AI', desc: 'Start training the moment interviews arrive. Practice instantly, get fast feedback, and improve through structured evaluation.' },
  { num: '03', name: 'Get help from mentors', desc: 'Choose the right mentor for the right moment. Book flexible sessions on any topic and gain insider guidance on companies and roles.' },
  { num: '04', name: 'Apply smartly', desc: 'Access curated opportunities plus 500+ startups, 300+ recruiter connections, and 7,000+ contract roles, with human assistants along the way.' },
  { num: '05', name: 'Offer & Grow', desc: 'Interviews often begin in 2–3 months. With consistent training, many reach their target role in 6–8 months, then continue with negotiation and career growth.' },
];

function Journey() {
  return (
    <section className="py-24" style={{ background: 'linear-gradient(180deg, #FAFBFF 0%, #F7F9FF 100%)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase text-[#2E5BFF] mb-5">
            <span className="w-6 h-px bg-[#2E5BFF]" />
            Your full job search
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(36px,4.6vw,56px)] font-[400] leading-[1.02] tracking-[-0.02em] text-[#0A0A0A] mb-4 max-w-[22ch] mx-auto">
            From first application to first offer{' '}
            <em className="italic font-[400] text-[#4a4d57]">— stage by stage.</em>
          </h2>
          <p className="text-[17px] text-[#4a4d57] leading-[1.55] max-w-[54ch] mx-auto">
            Screna guides you from figuring out where you stand to celebrating your offer. Unlock more support as you go.
          </p>
        </div>

        {/* Desktop: 5-column grid with dashed line */}
        <div className="hidden lg:block relative mt-10">
          <div className="absolute left-[10%] right-[10%]" style={{ top: 28, height: 1, background: 'repeating-linear-gradient(to right, rgba(46,91,255,0.45) 0 6px, transparent 6px 12px)' }} />
          <div className="grid grid-cols-5 gap-5">
            {STAGES.map(({ num, name, desc }) => (
              <div key={num} className="text-center px-2 group">
                <div style={{ fontFamily: "'Playfair Display', serif" }} className="text-[48px] font-[400] leading-none text-[hsl(221,91%,60%)] tracking-[-0.03em] mb-4 relative z-10 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-[hsl(221,91%,48%)]">
                  {num}
                </div>
                <h4 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[22px] font-[400] text-slate-900 mb-2 tracking-[-0.015em]">{name}</h4>
                <p className="text-[14px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: single column with vertical line */}
        <div className="lg:hidden relative pl-10">
          <div className="absolute left-[18px] top-0 bottom-0" style={{ width: 1, background: 'repeating-linear-gradient(to bottom, rgba(46,91,255,0.45) 0 6px, transparent 6px 12px)' }} />
          <div className="space-y-8">
            {STAGES.map(({ num, name, desc }) => (
              <div key={num} className="grid grid-cols-[36px_1fr] gap-5 items-start">
                <div style={{ fontFamily: "'Playfair Display', serif" }} className="text-[36px] font-[400] leading-none text-[hsl(221,91%,60%)] tracking-[-0.03em]">
                  {num}
                </div>
                <div className="pt-1">
                  <h4 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[20px] font-[400] text-slate-900 mb-1.5 tracking-[-0.01em]">{name}</h4>
                  <p className="text-[14px] text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────────────────────────────────────
type BillingCycle = 'monthly' | 'quarterly';

const PRICES: Record<BillingCycle, { price: string; note: string }> = {
  monthly:   { price: '$219', note: 'Billed $219 / month · cancel anytime' },
  quarterly: { price: '$199', note: 'Billed $597 / quarter · cancel anytime' },
};

const STARTER_PRICES: Record<BillingCycle, { price: string; note: string }> = {
  monthly:   { price: '$29.9',  note: 'Billed $29.9 / month · cancel anytime' },
  quarterly: { price: '$29.9',  note: 'Billed $89.7 / quarter · cancel anytime' },
};

const LIMITED_INCLUDED = [
  'AI mock interview (credits required)',
  'Limited Interview Insights',
];

type FeatureItem = { text: string; ok: boolean };
type TierFeatureGroup = { title: string; items: FeatureItem[] };

// Limited Access — all disabled groups (matches Claude design)
const LIMITED_GROUPS: TierFeatureGroup[] = [
  {
    title: 'Job search support',
    items: [
      { text: 'Dedicated 1:1 job search human assistants', ok: false },
      { text: 'We find jobs and apply for you (500 applications/month)', ok: false },
      { text: 'Daily application progress updates', ok: false },
      { text: 'Updated & Personalized job recommendation list', ok: false },
    ],
  },
  {
    title: 'Outreach & visibility',
    items: [{ text: 'We reach out to recruiters and request referrals for you', ok: false }],
  },
  {
    title: 'Mentor access',
    items: [
      { text: 'Mentor Marketplace', ok: false },
      { text: 'Mock interview, resume review, salary negotiation', ok: false },
      { text: 'Mentor reviews & ratings', ok: false },
    ],
  },
  {
    title: 'Community benefits',
    items: [
      { text: 'Weekly members-only live sessions', ok: false },
      { text: '2 annual networking events', ok: false },
      { text: 'Pre-interview warm-up reminders', ok: false },
    ],
  },
];

// Starter Plan — partial checks
const STARTER_GROUPS: TierFeatureGroup[] = [
  {
    title: 'Job search support',
    items: [
      { text: 'AI Mock Interview — 150 credits / month', ok: true },
      { text: 'Personal Question Bank', ok: true },
      { text: 'Updated & Personalized job recommendation list', ok: true },
      { text: 'Dedicated 1:1 job search human assistants', ok: false },
      { text: 'We find jobs and apply for you (500 applications/month)', ok: false },
      { text: 'Daily application progress updates', ok: false },
    ],
  },
  {
    title: 'Outreach & visibility',
    items: [{ text: 'We reach out to recruiters and request referrals for you', ok: false }],
  },
  {
    title: 'Mentor access',
    items: [
      { text: 'Mentorship Marketplace', ok: true },
      { text: 'Mock interview, resume review, salary negotiation', ok: true },
      { text: 'Mentor reviews & ratings', ok: true },
    ],
  },
  {
    title: 'Community benefits',
    items: [
      { text: 'Interview Insights — full access', ok: true },
      { text: 'Weekly members-only live sessions', ok: false },
      { text: '2 annual networking events', ok: false },
      { text: 'Pre-interview warm-up reminders', ok: false },
    ],
  },
];

// Full Access (Premium) — all checks (matches Claude design)
const FULL_GROUPS: TierFeatureGroup[] = [
  {
    title: 'Job search support',
    items: [
      { text: 'Dedicated 1:1 job search human assistants', ok: true },
      { text: 'We find jobs and apply for you (500 applications/month)', ok: true },
      { text: 'Daily application progress updates', ok: true },
      { text: 'Updated & Personalized job recommendation list', ok: true },
    ],
  },
  {
    title: 'Outreach & visibility',
    items: [{ text: 'We reach out to recruiters and request referrals for you', ok: true }],
  },
  {
    title: 'Mentor access',
    items: [
      { text: 'Full Mentor Marketplace', ok: true },
      { text: 'Mock interview, resume review, salary negotiation', ok: true },
      { text: 'Mentor reviews & ratings', ok: true },
    ],
  },
  {
    title: 'Community benefits',
    items: [
      { text: 'Interview Insights — full access', ok: true },
      { text: 'Weekly members-only live sessions', ok: true },
      { text: '2 annual networking events', ok: true },
      { text: 'Pre-interview warm-up reminders', ok: true },
    ],
  },
];

function TierCheck({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#3B6FE8] text-white shrink-0 mt-px">
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3L13 4.5"/></svg>
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.5px] border-[#D0D0D0] text-[#A0A0A0] shrink-0 mt-px">
      <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
    </span>
  );
}

function TierFeatureGroups({ groups }: { groups: TierFeatureGroup[] }) {
  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <section key={g.title} className="border-t border-[#E5E5E5] pt-4 pb-1">
          <p className="text-[10px] font-[700] tracking-[0.09em] uppercase text-[#A0A0A0] mb-3">{g.title}</p>
          <ul className="flex flex-col gap-[9px]">
            {g.items.map((item) => (
              <li
                key={item.text}
                className={`flex items-start gap-2.5 text-[13.5px] leading-[1.5] ${
                  item.ok ? 'text-[#2A2A2A]' : 'text-[#A0A0A0]'
                }`}
              >
                <TierCheck ok={item.ok} />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, subscribe, changeTier, isActing: isSubscribing } = useSubscription();

  const [cycle, setCycle] = useState<BillingCycle>('quarterly');
  const starter = STARTER_PRICES[cycle];
  const { price, note } = PRICES[cycle];

  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);
  const [onboardingTier, setOnboardingTier] = useState<Tier | null>(null);

  const isActiveMember = subscription !== null && subscription.status !== 'canceled';

  const handleSubscribe = async (plan: Tier) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isActiveMember) {
      navigate('/billing');
      return;
    }
    setLoadingTier(plan);
    try {
      if (subscription && subscription.status === 'canceled') {
        const ok = await changeTier(plan);
        if (!ok) return;
        if (plan === 'premium') {
          navigate('/premium-onboarding');
        } else {
          setOnboardingTier(plan);
        }
      } else {
        const url = await subscribe(plan, cycle);
        if (url) {
          window.location.href = url;
        } else if (plan === 'premium') {
          navigate('/premium-onboarding');
        } else {
          setOnboardingTier(plan);
        }
      }
    } finally {
      setLoadingTier(null);
    }
  };

  const handleOnboardingClose = () => {
    setOnboardingTier(null);
    navigate('/billing');
  };

  const starterLabel = isActiveMember
    ? (subscription!.plan === 'starter' ? 'Current plan' : 'Manage plan')
    : 'Start Starter';
  const premiumLabel = isActiveMember
    ? (subscription!.plan === 'premium' ? 'Current plan' : 'Manage plan')
    : 'Start Premium';
  const starterDisabled = (isActiveMember && subscription!.plan === 'starter') || isSubscribing;
  const premiumDisabled = (isActiveMember && subscription!.plan === 'premium') || isSubscribing;

  return (
    <section id="pricing" className="py-24" style={{ background: '#F7F7F7' }}>
      <div className="mx-auto px-8" style={{ maxWidth: 1160 }}>
        {/* Section head */}
        <div className="text-center mb-12">
          <p className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase text-[#2E5BFF] mb-5">
            <span className="w-6 h-px bg-[#2E5BFF]" />
            Pricing
          </p>
          <h2
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[clamp(36px,4.6vw,56px)] font-[400] leading-[1.02] tracking-[-0.02em] text-[#0A0A0A] max-w-[22ch] mx-auto mb-4"
          >
            Plans for every stage of your{' '}
            <em className="italic font-[400] text-[#4a4d57]">job search.</em>
          </h2>
          <p className="text-[17px] text-[#4a4d57] leading-[1.55] max-w-[54ch] mx-auto">
            Start with self-serve AI practice, or upgrade to guided career support with mentorship and managed job search help.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-9">
          <div className="inline-flex items-stretch bg-[#F3F4F6] rounded-full p-1 gap-0">
            {(['monthly', 'quarterly'] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`flex items-center gap-2 px-[18px] py-2 rounded-full text-[13px] font-[500] transition-all duration-200 ${
                  cycle === c ? 'bg-white text-[#0A0A0A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
                }`}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
                {c === 'quarterly' && (
                  <span className="text-[10px] font-[700] tracking-[0.04em] bg-[#3B6FE8] text-white px-[7px] py-[2px] rounded-full leading-[1.2]">Save 19%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards — 3 across on desktop */}
        <div className="grid grid-cols-1 min-[960px]:grid-cols-3 gap-6 items-stretch">
          {/* ── Limited Access ─────────────────────── */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-7 flex flex-col transition-all duration-300 hover:border-[#D0D7E5] hover:shadow-[0_12px_40px_-22px_rgba(10,10,10,0.10)]" style={{ padding: '28px 24px' }}>
            <p className="text-[11px] font-[700] tracking-[0.08em] uppercase text-[#3B6FE8] mb-3">Free Plan</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[36px] font-[700] text-[#0A0A0A] leading-[1.1] tracking-[-0.02em] mb-2.5">Limited Access</h3>
            <p className="text-[13px] text-[#6B6B6B] mb-5 max-w-[32ch] leading-[1.55]">
              Practice on your own schedule. No subscription required — buy credits when you need them.
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[42px] font-[700] text-[#0A0A0A] leading-none tracking-[-0.02em]">$0</span>
              <span className="text-[15px] text-[#6B6B6B] font-[500]">no recurring charge</span>
            </div>
            <p className="text-[12px] text-[#6B6B6B] mt-2 mb-[22px]">Pay only for the credits you use</p>

            <Link to="/auth" className="flex items-center justify-center w-full py-3 px-[18px] rounded-full border-[1.5px] border-[#D0D0D0] text-[#0A0A0A] text-[14px] font-[600] hover:border-[#0A0A0A] transition-colors duration-200 mb-6">
              Get started free
            </Link>

            <p className="text-[10px] font-[700] tracking-[0.09em] uppercase text-[#A0A0A0] pt-4 border-t border-[#E5E5E5] mb-2 mt-2">
              What's included
            </p>
            <ul className="flex flex-col gap-[9px] mb-1">
              {LIMITED_INCLUDED.map((text) => (
                <li key={text} className="flex items-start gap-2.5 text-[13px] leading-[1.5] text-[#0A0A0A]">
                  <TierCheck ok />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <TierFeatureGroups groups={LIMITED_GROUPS} />

            <div className="mt-auto pt-5">
              <div className="bg-[#F7F7F7] rounded-[10px] px-4 py-3.5 flex flex-col gap-1">
                <p className="text-[10px] font-[700] tracking-[0.09em] uppercase text-[#A0A0A0]">Credits</p>
                <p className="text-[18px] font-[700] text-[#0A0A0A] tracking-[-0.01em]">Pay-as-you-go</p>
                <p className="text-[11px] text-[#6B6B6B] leading-[1.45]">Buy a pack when you need it</p>
              </div>
            </div>
          </div>

          {/* ── Starter Plan ───────────────────────── */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl flex flex-col transition-all duration-300 hover:border-[#D0D7E5] hover:shadow-[0_12px_40px_-22px_rgba(10,10,10,0.10)]" style={{ padding: '28px 24px' }}>
            <p className="text-[11px] font-[700] tracking-[0.08em] uppercase text-[#3B6FE8] mb-3">Starter Plan</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[36px] font-[700] text-[#0A0A0A] leading-[1.1] tracking-[-0.02em] mb-2.5">Self-Guided Access</h3>
            <p className="text-[13px] text-[#6B6B6B] mb-5 max-w-[32ch] leading-[1.55]">
              Practice smarter and job search independently. Built for self-driven candidates with the time to do it right.
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[42px] font-[700] text-[#0A0A0A] leading-none tracking-[-0.02em]">{starter.price}</span>
              <span className="text-[15px] text-[#6B6B6B] font-[500]">/ month</span>
            </div>
            <p className="text-[12px] text-[#6B6B6B] mt-2 mb-[22px]">{starter.note}</p>

            <div className="relative mb-6">
              <button
                onClick={() => handleSubscribe('starter')}
                disabled={starterDisabled}
                className="flex items-center justify-center w-full py-3 px-[18px] rounded-full border-[1.5px] border-[#D0D0D0] text-[#0A0A0A] text-[14px] font-[600] text-center hover:bg-[#F7F7F7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingTier === 'starter' ? <Loader2 className="w-4 h-4 animate-spin" /> : starterLabel}
              </button>
            </div>

            <p className="text-[13px] font-[500] text-[#3B6FE8] mb-1.5">Everything in Limited Access, plus:</p>

            <TierFeatureGroups groups={STARTER_GROUPS} />

            <div className="mt-auto pt-5">
              <div className="bg-[#F7F7F7] rounded-[10px] px-4 py-3.5 flex flex-col gap-1">
                <p className="text-[10px] font-[700] tracking-[0.09em] uppercase text-[#A0A0A0]">Included each month</p>
                <p className="text-[18px] font-[700] text-[#0A0A0A] tracking-[-0.01em]">150 credits / mo</p>
                <p className="text-[11px] text-[#6B6B6B] leading-[1.45]">1 credit = $0.28 = 1 min of AI mock interview (Audio mode)</p>
              </div>
            </div>
          </div>

          {/* ── Full Access — Recommended ───────────── */}
          <div
            className="relative rounded-2xl flex flex-col overflow-visible transition-all duration-300 bg-white"
            style={{ padding: '28px 24px', border: '2px solid #3B6FE8', boxShadow: '0 18px 50px -28px rgba(59,111,232,0.35)' }}
          >
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#3B6FE8] text-white text-[11px] font-[700] px-4 py-1 rounded-full tracking-[0.08em] uppercase whitespace-nowrap" style={{ boxShadow: '0 6px 18px -6px rgba(59,111,232,0.45)' }}>
              Recommended
            </span>
            <p className="text-[11px] font-[700] tracking-[0.08em] uppercase text-[#3B6FE8] mb-3">Premium Membership</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[36px] font-[700] text-[#0A0A0A] leading-[1.1] tracking-[-0.02em] mb-2.5">Full Access</h3>
            <p className="text-[13px] text-[#6B6B6B] mb-5 max-w-[32ch] leading-[1.55]">
              The complete job search platform. Every feature, every service, one subscription.
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[42px] font-[700] text-[#0A0A0A] leading-none tracking-[-0.02em]">{price}</span>
              <span className="text-[15px] text-[#6B6B6B] font-[500]">/ month</span>
            </div>
            <p className="text-[12px] text-[#6B6B6B] mt-2 mb-[22px]">{note}</p>

            <div className="relative mb-6">
              <button
                onClick={() => handleSubscribe('premium')}
                disabled={premiumDisabled}
                className="flex items-center justify-center w-full py-3 px-[18px] rounded-full bg-[#3B6FE8] text-white text-[14px] font-[600] text-center hover:bg-[#2E5BFF] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ border: '1.5px solid #3B6FE8' }}
              >
                {loadingTier === 'premium' ? <Loader2 className="w-4 h-4 animate-spin" /> : premiumLabel}
              </button>
            </div>

            <p className="text-[13px] font-[500] text-[#3B6FE8] mb-1.5">Everything in Limited Access, plus:</p>

            <TierFeatureGroups groups={FULL_GROUPS} />

            <div className="mt-auto pt-5">
              <div className="bg-[#F7F7F7] rounded-[10px] px-4 py-3.5 flex flex-col gap-1">
                <p className="text-[10px] font-[700] tracking-[0.09em] uppercase text-[#A0A0A0]">Included each month</p>
                <p className="text-[18px] font-[700] text-[#0A0A0A] tracking-[-0.01em]">500 credits / mo</p>
                <p className="text-[11px] text-[#6B6B6B] leading-[1.45]">1 credit = $0.28 = 1 min of AI mock interview (Audio mode)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MembershipOnboardingModal
        open={onboardingTier !== null}
        tier={onboardingTier ?? 'starter'}
        onClose={handleOnboardingClose}
      />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FREE VS PREMIUM (UPGRADE COMPARE)
// ─────────────────────────────────────────────────────────────────────────────
const UPGRADE_STAGES: {
  step: string;
  name: string;
  badge: string;
  badgeNum?: string;
  free: string[];
  premium: { text: string; bold?: string[] }[];
}[] = [
  {
    step: 'Stage 01',
    name: 'Resume & Job Search',
    badge: 'More exposure',
    badgeNum: '+73%',
    free: [
      'Search and apply manually on your own',
      'Limited to public channels: LinkedIn, Indeed, company sites',
      'No active follow-up after you submit',
    ],
    premium: [
      { text: 'Guided application support with a real advisor', bold: ['real advisor'] },
      { text: '10+ direct application channels', bold: ['10+ direct application channels'] },
      { text: '500+ recruiter connections & 300+ startup openings', bold: ['500+ recruiter connections', '300+ startup openings'] },
      { text: 'Mentor referral pathways into target companies' },
    ],
  },
  {
    step: 'Stage 02',
    name: 'Interview Prep',
    badge: 'First-round pass',
    badgeNum: '+32%',
    free: [
      'Generic practice tools with no clear improvement path',
      'Hard to know what to fix next',
      'Feedback is fragmented across tools',
    ],
    premium: [
      { text: 'AI voice mock 7 days × 24 hrs' },
      { text: 'Sessions tuned to your resume and target role' },
      { text: 'Large bank of real interview questions', bold: ['real interview questions'] },
      { text: 'Detailed report with weaknesses + next steps', bold: ['weaknesses + next steps'] },
      { text: 'Far lower cost than traditional mentor mocks' },
    ],
  },
  {
    step: 'Stage 03',
    name: 'Final-Round Support',
    badge: 'Offer rate',
    badgeNum: '+25%',
    free: [
      'Cold LinkedIn outreach with low response rates',
      'Limited insider guidance going in',
      'Final performance depends heavily on luck',
    ],
    premium: [
      { text: 'Direct access to a working mentor network', bold: ['working mentor network'] },
      { text: 'Transparent pricing & traceable service' },
      { text: 'Mentors review your full AI training history', bold: ['AI training history'] },
      { text: '1:1 targeted prep before final rounds' },
      { text: 'Firsthand, company-specific experience reuse' },
    ],
  },
  {
    step: 'Stage 04',
    name: 'Offer & Beyond',
    badge: 'Long-term support',
    free: [
      'Limited salary & onboarding information',
      'Information asymmetry during negotiation',
      'Little support after the offer lands',
    ],
    premium: [
      { text: 'Internal community from people in the same role' },
      { text: 'Stronger salary data behind your negotiation' },
      { text: 'Continued access to the high-quality network' },
      { text: 'Career talks & long-term growth beyond the first offer', bold: ['Career talks & long-term growth beyond the first offer'] },
    ],
  },
];

function renderBoldText(text: string, bold?: string[]) {
  if (!bold || bold.length === 0) return text;
  let parts: (string | { b: string })[] = [text];
  bold.forEach((b) => {
    const next: (string | { b: string })[] = [];
    parts.forEach((part) => {
      if (typeof part !== 'string') { next.push(part); return; }
      const idx = part.indexOf(b);
      if (idx === -1) { next.push(part); return; }
      if (idx > 0) next.push(part.slice(0, idx));
      next.push({ b });
      const rest = part.slice(idx + b.length);
      if (rest) next.push(rest);
    });
    parts = next;
  });
  return parts.map((p, i) =>
    typeof p === 'string' ? <span key={i}>{p}</span> : <strong key={i} className="font-[500] text-[#0A0A0A]">{p.b}</strong>
  );
}

function FreeVsPremium() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase text-[#2E5BFF] mb-5">
            <span className="w-6 h-px bg-[#2E5BFF]" />
            Free vs Premium
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(36px,4.6vw,56px)] font-[400] leading-[1.02] tracking-[-0.02em] text-[#0A0A0A] mb-4 max-w-[22ch] mx-auto">
            What changes when you{' '}
            <em className="italic font-[400] text-[#4a4d57]">upgrade.</em>
          </h2>
          <p className="text-[17px] text-[#4a4d57] leading-[1.55] max-w-[54ch] mx-auto">
            Premium changes how you move through the job search, not just what tools you can access.
          </p>
        </div>

        <div className="bg-white border border-[#E8E8EA] rounded-[20px] overflow-hidden" style={{ boxShadow: '0 24px 60px -36px rgba(10,10,10,0.08)' }}>
          {/* Header row */}
          <div className="hidden md:grid border-b border-[#E8E8EA]" style={{ gridTemplateColumns: 'minmax(220px,1fr) 1.2fr 1.2fr', background: '#FAFBFD' }}>
            <div className="px-7 py-5 self-center text-[10.5px] tracking-[0.14em] uppercase text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>By stage</div>
            <div className="px-7 py-[18px] flex items-center gap-3 border-l border-[#E8E8EA]" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="text-[22px] font-[500] tracking-[-0.01em] text-[#0A0A0A]">Free</span>
            </div>
            <div className="px-7 py-[18px] flex items-center gap-3 border-l border-[#E8E8EA]" style={{ fontFamily: "'Playfair Display', serif", background: 'linear-gradient(180deg, #DCE7FF 0%, #EAF1FF 100%)' }}>
              <span className="text-[22px] font-[500] tracking-[-0.01em]" style={{ color: 'hsl(221,91%,42%)' }}>Premium</span>
              <span className="text-[10px] font-[700] tracking-[0.1em] uppercase px-2.5 py-1 rounded-full text-white" style={{ background: '#2E5BFF', fontFamily: "'Inter', sans-serif" }}>Recommended</span>
            </div>
          </div>

          {/* Stage rows */}
          {UPGRADE_STAGES.map((stage, idx) => (
            <div key={stage.step} className={`grid md:grid-cols-[minmax(220px,1fr)_1.2fr_1.2fr] ${idx > 0 ? 'border-t border-[#F0F0F2]' : ''}`}>
              {/* Stage label */}
              <div className="px-7 py-8 md:border-r-0">
                <div className="text-[11px] font-[500] tracking-[0.12em] uppercase text-slate-500 mb-2.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stage.step}</div>
                <h3 className="text-[clamp(22px,2.2vw,28px)] font-[400] leading-[1.15] tracking-[-0.015em] text-[#0A0A0A] mb-3.5" style={{ fontFamily: "'Playfair Display', serif" }}>{stage.name}</h3>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-[600] tracking-[0.01em] px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: '#EAF1FF', color: 'hsl(221,91%,38%)', border: '1px solid #C9D7F7' }}>
                  <span className="w-[5px] h-[5px] rounded-full bg-[#2E5BFF]" />
                  {stage.badge}
                  {stage.badgeNum && <span className="ml-0.5 font-[700] tabular-nums">{stage.badgeNum}</span>}
                </span>
              </div>
              {/* Free column */}
              <div className="px-7 py-8 border-t md:border-t-0 md:border-l border-[#F0F0F2]">
                <div className="md:hidden text-[10.5px] tracking-[0.14em] uppercase text-slate-500 mb-3.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Free</div>
                <ul className="flex flex-col gap-3">
                  {stage.free.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] leading-[1.55] text-slate-500">
                      <span className="flex-shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#E8E8EA] text-slate-400 mt-0.5">
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Premium column */}
              <div className="relative px-7 py-8 border-t md:border-t-0 md:border-l border-[#F0F0F2]" style={{ background: '#EAF1FF' }}>
                <span className="hidden md:block absolute top-0 left-0 bottom-0 w-[3px]" style={{ background: '#2E5BFF', opacity: 0.7 }} />
                <span className="md:hidden block h-[3px] w-full absolute top-0 left-0" style={{ background: '#2E5BFF', opacity: 0.7 }} />
                <div className="md:hidden text-[10.5px] tracking-[0.14em] uppercase mb-3.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'hsl(221,91%,38%)' }}>Premium</div>
                <ul className="flex flex-col gap-3">
                  {stage.premium.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] leading-[1.55] font-[500] text-[#0A0A0A]">
                      <span className="flex-shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#2E5BFF] text-white mt-0.5">
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3L13 4.5"/></svg>
                      </span>
                      <span>{renderBoldText(item.text, item.bold)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREDIT PACKS
// ─────────────────────────────────────────────────────────────────────────────
function CreditPacks() {
  const ACCENT = 'hsl(221,91%,60%)';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [credits, setCredits] = useState(300);
  const [loadingPack, setLoadingPack] = useState<'trial' | 'standard' | 'custom' | null>(null);
  const customTotal = creditPrice(credits);
  const customUnit = customTotal / credits;
  const fillPct = ((credits - 150) / (1000 - 150)) * 100;

  const buyPack = async (
    kind: 'trial' | 'standard' | 'custom',
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

  const handleBuyTrial    = () => buyPack('trial',    () => PaymentService.purchaseStarterPack());
  const handleBuyStandard = () => buyPack('standard', () => PaymentService.purchaseGrowthPack());
  const handleBuyCustom   = () => buyPack('custom',   () => PaymentService.purchaseCustomPack(credits));

  return (
    <section id="credits" className="py-24" style={{ background: '#F7F7F7' }}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Centered section head — eyebrow + Playfair title + sub */}
        <div className="text-center mb-12">
          <p className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase text-[#2E5BFF] mb-5">
            <span className="w-6 h-px bg-[#2E5BFF]" />
            Credit packs
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(36px,4.6vw,56px)] font-[400] leading-[1.02] tracking-[-0.02em] text-[#0A0A0A] max-w-[22ch] mx-auto mb-4">
            Pay only for what you use.{' '}
            <em className="italic font-[400] text-[#4a4d57]">Refund after the mock.</em>
          </h2>
          <p className="text-[17px] text-[#4a4d57] leading-[1.55] max-w-[54ch] mx-auto">
            Flexible, controllable, low-commitment — perfect for "just a few sessions." Or build a custom pack for bigger volume.
          </p>
        </div>

        {/* Pricing-block head — 2-column step / kicker / title / subhead */}
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

        {/* Two preset packs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {[
            { kind: 'trial' as const,    name: 'Trial',    credits: 50,  price: '$9.99',  per: '$0.20',   rate: '≈ 50 min of AI practice — try it once',                    handler: handleBuyTrial },
            { kind: 'standard' as const, name: 'Standard', credits: 100, price: '$14.99', per: '$0.1499', rate: '≈ 100 min of AI practice — a couple of full mocks', handler: handleBuyStandard },
          ].map((p) => (
            <article key={p.name} className="h-full bg-white border border-[#E5E5E5] rounded-[18px] px-7 pt-7 pb-6 flex flex-col gap-1.5 hover:-translate-y-1 hover:border-[#D9E1FF] hover:shadow-[0_24px_60px_-28px_rgba(46,91,255,0.22)] transition-all">
              <p className="text-[11px] font-mono tracking-[0.12em] uppercase text-[#6B6B6B] mb-1.5">{p.name}</p>
              <div className="flex items-baseline gap-2">
                <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[48px] font-[600] leading-none tracking-[-0.02em] text-[#0A0A0A]">
                  {p.credits}
                </span>
                <span className="text-[14px] text-[#6B6B6B] font-[500]">credits</span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[26px] font-[600] text-[#0A0A0A]">
                  {p.price}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[12px] text-[#A0A0A0] tracking-[0.04em]">
                  {p.per} / credit
                </span>
              </div>
              <p className="text-[12.5px] text-[#A0A0A0] mt-1">{p.rate}</p>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-mono tracking-[0.04em] mt-3" style={{ color: ACCENT }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
                Refund after the mock
              </span>
              <button
                onClick={p.handler}
                disabled={loadingPack === p.kind}
                className="mt-4 flex items-center justify-center w-full rounded-full py-3 px-4 text-[14px] font-[500] border-[1.5px] border-[#D0D0D0] text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingPack === p.kind ? <Loader2 className="w-4 h-4 animate-spin" /> : `Buy ${p.credits} credits`}
              </button>
            </article>
          ))}
        </div>

        {/* Customize slider card */}
        <div
          className="rounded-[22px] p-8 md:px-9 mb-6"
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
              <div style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(22px,2.4vw,28px)] font-[600] text-[#0A0A0A] leading-tight mt-2">
                Need more than 100? Build your own pack.
              </div>
              <p className="text-[14px] text-[#6B6B6B] max-w-[38ch] mt-1.5">
                Slide to choose any amount from 150 to 1,000 credits, in steps of 50. The more you buy, the lower the per-credit price.
              </p>
            </div>
            <div className="text-right min-w-[180px]">
              <div>
                <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[56px] font-[600] leading-none tracking-[-0.02em] text-[#0A0A0A]">
                  {credits.toLocaleString()}
                </span>
                <span className="text-[14px] text-[#6B6B6B] ml-1.5 font-[500]">credits</span>
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", color: ACCENT }} className="text-[22px] font-[600] mt-1.5">
                ${customTotal.toFixed(2)}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11.5px] text-[#A0A0A0] tracking-[0.04em] mt-0.5">
                ${customUnit.toFixed(4)} / credit
              </div>
            </div>
          </div>

          {/* Slider */}
          <div className="relative pt-2 pb-8">
            <input
              type="range"
              min={150}
              max={1000}
              step={50}
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
              aria-label="Credits amount"
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[hsl(221,91%,60%)] [&::-webkit-slider-thumb]:shadow-[0_4px_10px_rgba(46,91,255,0.3)] [&::-webkit-slider-thumb]:cursor-grab"
              style={{
                background: `linear-gradient(to right, ${ACCENT} 0%, ${ACCENT} ${fillPct}%, rgba(0,0,0,0.08) ${fillPct}%, rgba(0,0,0,0.08) 100%)`,
              }}
            />
            <div style={{ fontFamily: "'JetBrains Mono', monospace" }} className="absolute inset-x-0 bottom-0 flex justify-between text-[10.5px] text-[#A0A0A0] tracking-[0.04em] pointer-events-none">
              <span>150</span>
              <span>300</span>
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
              className="rounded-full px-6 py-3 text-[14px] font-[600] text-white transition-colors inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: ACCENT }}
            >
              {loadingPack === 'custom' ? <Loader2 className="w-4 h-4 animate-spin" /> : `Buy ${credits.toLocaleString()} credits · $${customTotal.toFixed(2)}`}
            </button>
          </div>
        </div>

        {/* Credits per minute card */}
        <div className="bg-white border border-[#E5E5E5] rounded-2xl px-8 py-7">
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
            { mode: 'Voice mode', rate: '1 credit/min',    badge: '1×',
              svg: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/>
                  <line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
                </svg>
              ),
            },
            { mode: 'Video mode', rate: '1.5 credits/min', badge: '1.5×',
              svg: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M15.5 10.5l5-3v9l-5-3z"/>
                </svg>
              ),
            },
          ].map(({ mode, rate, badge, svg }) => (
            <div key={mode} className="flex items-center py-5 border-b border-[#E5E5E5]">
              <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EEF0FF', color: '#5B6AD0' }}>
                {svg}
              </span>
              <span className="text-[15px] font-[500] text-[#0A0A0A] ml-3.5">{mode}</span>
              <span className="ml-auto flex items-center gap-2.5">
                <span className="text-[14px] text-[#6B6B6B]">{rate}</span>
                <span className="text-[12px] font-[600] px-2.5 py-0.5 rounded-full leading-[1.4]" style={{ background: '#EEF0FF', color: '#5B6AD0' }}>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#5B6AD0' }}>
                  <circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="8" r="0.6" fill="currentColor"/>
                </svg>
                <span>
                  <b className="font-[600] text-[#6B6B6B]">Example:</b> {ex}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-[10px] px-4 py-3 mt-4 flex items-start gap-2.5" style={{ background: '#F0FBF4' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#1A9E5C' }}>
              <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><polyline points="21 3 21 8 16 8"/>
              <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><polyline points="3 21 3 16 8 16"/>
            </svg>
            <span className="text-[13px] leading-[1.5]" style={{ color: '#1A9E5C' }}>
              Only pay what you use. If you end a session early, unused credits are automatically refunded.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALLBACK CTA
// ─────────────────────────────────────────────────────────────────────────────
function CallbackCTA() {
  const [sent, setSent] = useState(false);
  const [phone, setPhone] = useState('');

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div
          className="relative rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 p-10 md:p-12"
          style={{
            background: 'linear-gradient(135deg, #2E5BFF 0%, #1231B8 100%)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 24px 60px -28px rgba(18,49,184,0.55)',
          }}
        >
          {/* Decorative radial highlight */}
          <div className="pointer-events-none absolute" style={{ inset: '-40% -20% auto auto', width: '60%', paddingTop: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)' }} />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-[600] tracking-[0.1em] uppercase text-white/85 bg-white/15 border border-white/20 px-3 py-1.5 rounded-full mb-5">
              Free consultation
            </span>
            <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(32px,4vw,48px)] font-[500] text-white leading-[1.15] tracking-[-0.01em] mb-3 text-wrap-pretty">
              Want us to call you?
            </h2>
            <p className="text-[15.5px] text-white/75 mb-7 max-w-[48ch] leading-[1.55]">
              Leave your number and a Screna advisor will reach out within one business day. No sales pressure — just a quick chat about your goals.
            </p>
            {sent ? (
              <p className="text-[14px] font-[500] text-white bg-white/15 px-4 py-3 rounded-xl inline-block">
                Thanks — we'll call you within one business day.
              </p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <div className="flex items-stretch bg-white rounded-full overflow-hidden max-w-[520px]" style={{ boxShadow: '0 8px 24px -12px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.6) inset' }}>
                  <span className="flex items-center gap-1.5 px-4 text-[13px] text-slate-500 shrink-0 border-r border-[#E8E8EA]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 opacity-60">
                      <path d="M22 16.92V21a1 1 0 0 1-1.09 1 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 3.21 4.09 1 1 0 0 1 4.2 3h4.09a1 1 0 0 1 1 .75 12 12 0 0 0 .66 2.65 1 1 0 0 1-.23 1l-1.73 1.73a16 16 0 0 0 6 6l1.73-1.73a1 1 0 0 1 1-.23 12 12 0 0 0 2.65.66 1 1 0 0 1 .75 1z"/>
                    </svg>
                    +1
                  </span>
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="flex-1 min-w-0 h-14 bg-transparent text-[14px] text-[#0A0A0A] placeholder-[#9aa0ad] outline-none px-3"
                  />
                  <button type="submit" className="shrink-0 m-1.5 px-5 rounded-full bg-[#0A0A0A] text-white text-[13px] font-[500] hover:bg-[#1a1a1a] transition-colors" style={{ boxShadow: '0 6px 14px -4px rgba(0,0,0,0.22)' }}>
                    Call me back
                  </button>
                </div>
                <p className="text-[12.5px] text-white/70 mt-3 flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                    <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/>
                  </svg>
                  Your number is 100% private and will never be shared.
                </p>
              </form>
            )}
          </div>

          <div className="hidden md:flex flex-col items-center justify-center gap-4 shrink-0 relative z-10">
            <div className="relative flex items-center justify-center w-[180px] h-[180px]">
              <div className="absolute w-[220px] h-[220px] rounded-full border border-white/60 animate-ping" style={{ animationDuration: '2.6s', animationDelay: '0s' }} />
              <div className="absolute w-[280px] h-[280px] rounded-full border border-white/40 animate-ping" style={{ animationDuration: '2.6s', animationDelay: '0.6s' }} />
              <div className="absolute w-[340px] h-[340px] rounded-full border border-white/25 animate-ping" style={{ animationDuration: '2.6s', animationDelay: '1.2s' }} />
              <div className="relative z-10 w-[180px] h-[180px] rounded-full overflow-hidden border-4 border-white/30 shadow-xl bg-gradient-to-b from-[#EEF2FF] to-[#DCE4FF] flex items-end justify-center">
                <img
                  src="/landing/cta-agent.png"
                  alt="Screna advisor"
                  className="w-[106%] max-h-[112%] object-cover"
                  style={{ transform: 'translateY(4%)' }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {['1:1 advisor', 'No obligation', '~15 min'].map((chip) => (
                <span key={chip} className="bg-white/15 border border-white/20 text-white text-[11px] font-[500] px-3 py-1.5 rounded-full text-center">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL PROOF + TESTIMONIALS
// ─────────────────────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "The coding round wasn't the hard part. It was the behavioral — three PMs in a row asking about scope. Screna's mocks got me ready for that.",
    name: 'Priya S.',
    role: 'Senior SWE · Stripe',
    initials: 'PS',
    bg: 'from-[#E7EFFB] to-[#C9D8EF]',
  },
  {
    quote: "I'd read every system-design guide out there. What moved the needle was hearing someone actually describe the Meta E5 loop two days before mine.",
    name: 'Ravi M.',
    role: 'Staff SWE · Meta',
    initials: 'RM',
    bg: 'from-[#F7E7DE] to-[#EFD5C6]',
  },
  {
    quote: "My mentor walked me through an offer negotiation I was about to leave $18k on the table for. The membership paid for itself in a single call.",
    name: 'Jordan K.',
    role: 'Senior PM · Airbnb',
    initials: 'JK',
    bg: 'from-[#E4F0E9] to-[#CFE3D8]',
  },
];

function SocialProof() {
  return (
    <section className="py-24" style={{ background: '#F7F7F7' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16">
          <p className="text-[12px] font-[600] uppercase tracking-[0.12em] text-[#8a8f9a] mb-6 text-center">
            Trusted by job hunters who landed roles at
          </p>
          <LogoMarquee logos={UNIVERSITY_LOGOS} speed={22} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map(({ quote, name, role, initials, bg }) => (
            <article
              key={name}
              className="relative bg-white rounded-[20px] border border-[#E8E8EA] p-8 flex flex-col hover:border-[#D9E1FF] hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(46,91,255,0.15)] transition-all duration-300"
            >
              <span
                aria-hidden
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="absolute top-3 right-5 italic text-[80px] leading-none text-[#2E5BFF] pointer-events-none"
              >&ldquo;</span>
              <p style={{ fontFamily: "'Playfair Display', serif" }} className="text-[20px] font-[400] text-[#0A0A0A] leading-[1.4] tracking-[-0.01em] mb-7 flex-1 relative z-10">
                &ldquo;{quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-5 border-t border-[#E8E8EA]">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center text-[13px] font-[600] text-[#3a4252]`}>
                  {initials}
                </div>
                <div>
                  <p className="text-[14px] font-[500] text-[#0A0A0A] leading-tight">{name}</p>
                  <p className="text-[13px] text-[#4a4d57] mt-0.5">{role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Is $219/month worth it?',
    a: "It's not cheap — because this isn't a software subscription, it's a human-powered service. Membership includes 200+ manually reviewed, targeted applications per month, 48-hour resume feedback, AI Mock + real Mentor dual-track practice, a status tracking dashboard, and Discord community access. If each polished application takes you 30–60 minutes on your own, that's typically 40+ hours saved in a single month.",
  },
  {
    q: "What if it doesn't work out — can I get a refund?",
    a: 'Full refund within 3 days. After that, you can cancel at the end of your current billing period — no refund, but your service continues until it ends.',
  },
  {
    q: "I haven't started applying yet. Is it too early?",
    a: "It's never too early to prepare. Start with AI Mock and Interview Insights to get a baseline. When you need guidance, book a session with one of our mentors. When you're ready to apply, our ops team will step in to help you apply efficiently and improve your chances of landing interviews.",
  },
  {
    q: "Who's actually submitting my applications — humans or bots?",
    a: "Humans reviewing, AI assisting. Our ops team checks every application: whether the company sponsors your visa type, whether the JD actually matches your level (we won't send an entry-level candidate to a senior role), and whether the position is still open (filtering out ghost jobs). You can track every application in your Dashboard — no black box.",
  },
  {
    q: "I'm an international student who needs sponsorship. Can you handle that?",
    a: "That's our core use case. The application process automatically filters out companies that don't sponsor, and matches roles to your visa status — OPT, STEM OPT, CPT, or cap-exempt.",
  },
  {
    q: "What if my resume isn't ready?",
    a: "Resume editing is a separate paid add-on — not required, but available. Just note: we can't start submitting applications until you have a finalized resume.",
  },
  {
    q: 'How much time do I need to put in each week?',
    a: 'We recommend 5–8 hours: 2–3 hours for Mock practice, 1–2 hours for Dashboard check-ins and OA responses, 1 hour for Mentor sessions as needed, and community and Insights on your own schedule. We take the applying, tracking, and research off your plate — the interview prep part is still yours to own.',
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-24 items-start">
          <div>
            <p className="inline-flex items-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase text-[#2E5BFF] mb-5">
              <span className="w-6 h-px bg-[#2E5BFF]" />
              FAQ
            </p>
            <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(32px,4vw,48px)] font-[400] text-[#0A0A0A] leading-[1.05] tracking-[-0.02em] max-w-[12ch]">
              Questions people ask before signing up.
            </h2>
          </div>
          <div className="flex flex-col">
            {FAQ_ITEMS.map(({ q, a }, i) => {
              const isOpen = open === i;
              return (
                <div key={q} className="border-t border-[#E8E8EA] last:border-b py-6">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex items-center justify-between w-full text-left gap-6 group"
                  >
                    <span className={`text-[18px] font-[500] transition-colors leading-[1.4] ${isOpen ? 'text-[#2E5BFF]' : 'text-[#0A0A0A] group-hover:text-[#2E5BFF]'}`}>
                      {q}
                    </span>
                    <span className="relative w-6 h-6 shrink-0">
                      <span className="absolute left-0 right-0 top-1/2 h-px bg-[#0A0A0A]" />
                      <span
                        className="absolute top-0 bottom-0 left-1/2 w-px bg-[#0A0A0A] origin-center transition-transform duration-200"
                        style={{ transform: isOpen ? 'translateX(-50%) scaleY(0)' : 'translateX(-50%) scaleY(1)' }}
                      />
                    </span>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: isOpen ? 600 : 0, marginTop: isOpen ? 16 : 0 }}
                  >
                    <p className="text-[16px] text-[#4a4d57] leading-[1.6] max-w-[58ch]">{a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL CTA
// ─────────────────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden text-white text-center"
      style={{
        padding: 'clamp(112px, 14vw, 180px) 0',
        background: 'radial-gradient(ellipse 800px 500px at 50% 120%, rgba(255,255,255,0.22), transparent 60%), radial-gradient(ellipse 600px 400px at 20% 10%, rgba(255,255,255,0.14), transparent 60%), linear-gradient(160deg, #1231B8 0%, #2E5BFF 50%, #4A7BFF 100%)',
      }}
    >
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.08,
        }}
      />
      <div className="relative max-w-3xl mx-auto px-6">
        <p className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] tracking-[0.14em] uppercase mb-5" style={{ color: 'rgba(255,255,255,0.85)' }}>
          <span className="w-6 h-px" style={{ background: 'rgba(255,255,255,0.6)' }} />
          Get started
        </p>
        <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(44px,6.5vw,84px)] font-[500] leading-[1.02] tracking-[-0.02em] text-white max-w-[18ch] mx-auto mb-6">
          Ready to run a smarter{' '}
          <em className="italic font-[400]" style={{ color: 'rgba(255,255,255,0.72)' }}>job search?</em>
        </h2>
        <p className="text-[18px] mb-11 max-w-[44ch] mx-auto leading-[1.55]" style={{ color: 'rgba(255,255,255,0.82)' }}>Start free in under 2 minutes.</p>
        <div className="inline-flex items-center justify-center gap-4 flex-wrap">
          <Link to="/auth" className="inline-flex items-center gap-2 h-[44px] px-5 rounded-full bg-white text-[#0A0A0A] text-[14px] font-[500] tracking-[-0.005em] hover:-translate-y-0.5 transition-all duration-200" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E5BFF]" style={{ animation: 'breathe 1.8s ease-in-out infinite' }}></span>
            Start free
          </Link>
          <div className="relative inline-flex">
            <Link to="/auth" className="inline-flex items-center gap-2 h-[44px] px-2 text-[14px] font-[500] tracking-[-0.005em] hover:-translate-y-0.5 transition-all duration-200" style={{ color: 'rgba(255,255,255,0.92)' }}>
              Book a consult
              <ArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar transparent />
      <main>
        <Hero />
        <StatsBar />
        <Pillars />
        <ComparisonTable />
        <Journey />
        <Pricing />
        <FreeVsPremium />
        <CreditPacks />
        <CallbackCTA />
        <SocialProof />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
