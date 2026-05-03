import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Footer } from '@/components/newDesign/home/footer';

// ── SVG helpers ───────────────────────────────────────────────────────────────
const CheckFull = () => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[hsl(221,91%,60%)] text-white">
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3L13 4.5"/></svg>
  </span>
);
const CheckMuted = () => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3L13 4.5"/></svg>
  </span>
);
const XMark = () => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-400">
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
  </span>
);
const Note = ({ text }: { text: string }) => (
  <span className="text-[11px] text-slate-400 italic">{text}</span>
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
        <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] tracking-[0.14em] uppercase text-[hsl(221,91%,60%)] mb-5 font-medium">
          AI · COMMUNITY · CAREER SUPPORT
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(38px,5.5vw,66px)] font-[500] leading-[1.08] tracking-[-0.02em] text-slate-900 mb-6 max-w-3xl mx-auto">
          Cut the busywork. Focus on what{' '}
          <em className="italic text-[hsl(221,91%,60%)]">actually</em>{' '}
          gets you the offer.
        </h1>
        <p className="text-[17px] text-slate-500 leading-relaxed max-w-xl mx-auto mb-10">
          AI practice. Real community. Vetted mentors. 24/7 support. Everything you need to prep smarter — without reinventing the wheel every time.
        </p>
        <div className="flex items-center justify-center gap-4 mb-16 flex-wrap">
          <Link to="/auth" className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-[hsl(221,91%,60%)] text-white text-[15px] font-medium hover:bg-[hsl(221,91%,52%)] shadow-lg shadow-blue-600/25 transition-all duration-200">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
            Start free
          </Link>
          <a href="#pillars" className="inline-flex items-center gap-2 h-12 px-7 rounded-full border border-slate-200 text-slate-700 text-[15px] font-medium hover:border-slate-300 hover:bg-slate-50 transition-all duration-200">
            See how it works
            <ArrowRight />
          </a>
        </div>

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
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[hsl(221,91%,60%)] font-semibold">+6</span>
            <span className="text-slate-400 text-[11px]">mocks done this week</span>
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
    { num: 200, suf: '+', label: 'Offers with the help of Screna' },
    { num: 100, suf: '%', label: 'Real-time 1:1 support, 7 days a week' },
    { num: 140, suf: '+', label: 'Targeted applications per week' },
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
        <div className="text-center mb-14">
          <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] uppercase tracking-[0.12em] text-[hsl(221,91%,60%)] mb-4">
            The Screna system
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(28px,3.5vw,44px)] font-[500] leading-[1.15] text-slate-900 max-w-2xl mx-auto">
            Everything you need to run a smarter job search{' '}
            <em className="italic text-slate-600">— in one place.</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {PILLARS.map(({ icon, title, desc, link, linkLabel, shot }) => (
            <article key={title} className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[hsl(221,91%,60%)]/40 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300" style={{ boxShadow: '0 1px 3px rgba(10,10,10,0.06)' }}>
              <div className="p-7 pb-5">
                <div className="w-10 h-10 rounded-xl border border-slate-200 text-slate-700 group-hover:bg-[hsl(221,91%,60%)] group-hover:text-white group-hover:border-[hsl(221,91%,60%)] flex items-center justify-center mb-5 transition-all duration-300">
                  {icon}
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[22px] font-[400] text-slate-900 mb-3 leading-snug tracking-[-0.01em]">{title}</h3>
                <p className="text-[14px] text-slate-500 leading-relaxed mb-5">{desc}</p>
                <Link to={link} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[hsl(221,91%,60%)] hover:underline">
                  {linkLabel}
                  <ArrowRight />
                </Link>
              </div>
              {/* Mockup shot area */}
              <div className="border-t border-slate-100 bg-[#F7F9FF] group-hover:bg-[#F0F3FF] transition-colors duration-300 flex justify-center items-end px-5 pt-5 overflow-hidden" style={{ minHeight: 240 }}>
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
  {
    label: 'Resume & profile',
    rows: [
      { name: 'Resume review by practitioner', desc: 'Reviewed by someone who actually hires for your role.', screna: 'yes', scale: 'Resume submission', exponent: 'no', simplify: 'no', wonsulting: 'muted' },
      { name: 'Priority resume exposure', desc: 'Surface your profile to recruiters in our network.', screna: 'yes', scale: 'no', exponent: 'no', simplify: 'no', wonsulting: 'no' },
      { name: 'LinkedIn / profile polish', desc: 'Positioning and keyword work for inbound reach.', screna: 'yes', scale: 'no', exponent: 'no', simplify: 'no', wonsulting: 'muted' },
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
        <div className="text-center mb-12">
          <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] uppercase tracking-[0.12em] text-[hsl(221,91%,60%)] mb-4">
            Compare job search platforms
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(26px,3.2vw,40px)] font-[500] leading-[1.2] text-slate-900 mb-3">
            How Screna compares to{' '}
            <em className="italic text-slate-600">alternatives.</em>
          </h2>
          <p className="text-[15px] text-slate-500 max-w-xl mx-auto">
            See how Screna combines AI, community signals, and human support into one career command center.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid gap-0 mb-1" style={{ gridTemplateColumns: '1fr repeat(5, 100px)' }}>
              <div />
              <div className="text-center">
                <span className="inline-block bg-[hsl(221,91%,60%)] text-white text-[12px] font-semibold px-3 py-1.5 rounded-full">Screna</span>
              </div>
              {competitors.map((c) => (
                <div key={c} className="text-center">
                  <span className="text-[11px] font-medium text-slate-400">{c}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {CMP_DATA.map((group) => (
                <div key={group.label}>
                  <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                    <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[10.5px] uppercase tracking-[0.1em] text-slate-500 font-medium">{group.label}</p>
                  </div>
                  {group.rows.map((row, i) => (
                    <div key={row.name} className={`grid items-center gap-0 px-5 py-3.5 ${i > 0 ? 'border-t border-slate-50' : ''}`} style={{ gridTemplateColumns: '1fr repeat(5, 100px)' }}>
                      <div>
                        <p className="text-[13px] font-medium text-slate-800">{row.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{row.desc}</p>
                      </div>
                      {(['screna', 'scale', 'exponent', 'simplify', 'wonsulting'] as const).map((key) => (
                        <div key={key} className="flex justify-center items-center">
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
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY
// ─────────────────────────────────────────────────────────────────────────────
const STAGES = [
  { num: '01', name: 'Understand', desc: 'Know where you stand. Resume analysis, role fit, gaps to close.' },
  { num: '02', name: 'Practice', desc: 'AI mocks, personalized drills, real company questions.' },
  { num: '03', name: 'Get support', desc: 'Mentors, coaches, and resume reviewers on demand.' },
  { num: '04', name: 'Apply', desc: 'Track every application, get referrals through our network, stay organized.' },
  { num: '05', name: 'Offer & grow', desc: 'Salary negotiation, onboarding prep, career strategy after day one.' },
];

function Journey() {
  return (
    <section className="py-24" style={{ background: 'linear-gradient(180deg, #FAFBFF 0%, #F7F9FF 100%)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] uppercase tracking-[0.14em] text-[hsl(221,91%,60%)] mb-5 font-semibold inline-flex items-center gap-2.5 before:content-[''] before:w-6 before:h-px before:bg-[hsl(221,91%,60%)] before:block">
            Your full job search
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(36px,4.6vw,56px)] font-[400] leading-[1.1] tracking-[-0.02em] text-slate-900 mb-4 max-w-[22ch] mx-auto">
            From first application to first offer{' '}
            <em className="italic text-slate-500">— stage by stage.</em>
          </h2>
          <p className="text-[17px] text-slate-500 leading-relaxed max-w-[54ch] mx-auto">
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
type BillingCycle = 'monthly' | 'quarterly' | 'annual';

const PRICES: Record<BillingCycle, { price: string; note: string }> = {
  monthly:   { price: '$199', note: 'Billed $199 / month · cancel anytime' },
  quarterly: { price: '$159', note: 'Billed $477 / quarter · cancel anytime' },
  annual:    { price: '$129',  note: 'Billed $1,548 / year · cancel anytime' },
};

const LIMITED_FEATURES = [
  { ok: true,  text: 'AI mock interview (credits required)' },
  { ok: true,  text: 'Limited Interview Insights' },
  { ok: false, text: 'Resume submission & auto-apply' },
  { ok: false, text: 'Mentor Marketplace' },
  { ok: false, text: 'Cold email & recruiter outreach' },
  { ok: false, text: 'Application tracking dashboard' },
];

const FULL_GROUPS = [
  {
    title: 'Job search support',
    items: ['Dedicated 1:1 job search advisor', 'Resume submission & auto-apply', 'Daily application progress updates', 'Application tracking dashboard'],
  },
  {
    title: 'Outreach & visibility',
    items: ['Cold email & recruiter outreach (AI-generated)', 'Priority resume exposure'],
  },
  {
    title: 'Mentor access',
    items: ['Full Mentor Marketplace', 'Mock interview, resume review, salary negotiation', 'Mentor reviews & ratings'],
  },
  {
    title: 'Community benefits',
    items: ['Interview Insights — full access', 'Weekly members-only live sessions', '2 annual networking events', 'Pre-interview warm-up reminders'],
  },
];

function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>('quarterly');
  const { price, note } = PRICES[cycle];

  return (
    <section id="pricing" className="py-24" style={{ background: '#F7F7F7' }}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Step 01 block header */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-12 mb-12">
          <div>
            <div className="flex items-center gap-5 mb-3">
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[13px] font-[500] tracking-[0.04em] text-[hsl(221,91%,60%)] bg-[#F0F3FF] px-3 py-1 rounded-full">01</span>
              <span className="text-[11px] font-[600] tracking-[0.14em] uppercase text-[hsl(221,91%,60%)]">Membership</span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(28px,3vw,36px)] font-[500] leading-[1.15] text-[#0A0A0A] tracking-[-0.01em]">
              Plans for every stage of your{' '}
              <em className="italic text-slate-500">job search.</em>
            </h2>
          </div>
          <p className="text-[16px] text-[#4a4d57] leading-[1.55] md:self-end">
            Start with self-serve AI practice, or upgrade to guided career support with mentorship and managed job search help.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-stretch bg-[#F0F0F2] border border-[#E8E8EA] rounded-full p-1 gap-0.5">
            {(['monthly', 'quarterly', 'annual'] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-[500] transition-all duration-200 ${
                  cycle === c ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#8a8f9a] hover:text-[#0A0A0A]'
                }`}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
                {c === 'quarterly' && (
                  <span className={`text-[11px] font-[600] px-1.5 py-0.5 rounded-full transition-all ${
                    cycle === c ? 'bg-[hsl(221,91%,60%)] text-white' : 'bg-[#E8E8EA] text-[#4a4d57]'
                  }`}>Save 20%</span>
                )}
                {c === 'annual' && (
                  <span className={`text-[11px] font-[600] px-1.5 py-0.5 rounded-full transition-all ${
                    cycle === c ? 'bg-[hsl(221,91%,60%)] text-white' : 'bg-[#E8E8EA] text-[#4a4d57]'
                  }`}>Save 35%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Limited Access */}
          <div className="bg-white border border-[#E8E8EA] rounded-3xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[#D9E1FF] hover:shadow-xl hover:shadow-blue-900/[0.08]">
            <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[32px] font-[500] text-[#0A0A0A] leading-none tracking-[-0.01em]">Limited Access</h3>
            <p className="text-[14.5px] text-[#4a4d57] mt-3 mb-0 max-w-[36ch] leading-[1.5]">Practice on your own schedule. No subscription required — buy credits when you need them.</p>
            <div className="flex items-baseline gap-2 mt-6">
              <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[64px] font-[500] text-[#0A0A0A] leading-none tracking-[-0.02em]">$0</span>
              <span className="text-[16px] text-[#4a4d57] font-[500]">no recurring charge</span>
            </div>
            <p className="text-[12.5px] text-[#8a8f9a] mt-1.5 mb-6">Pay only for the credits you use</p>
            <div className="mb-7">
              <Link to="/auth" className="flex items-center justify-center w-full h-[52px] rounded-full border-2 border-[hsl(221,91%,60%)] text-[hsl(221,91%,60%)] text-[14.5px] font-[500] hover:bg-[hsl(221,91%,60%)] hover:text-white transition-colors duration-200">
                Get started free
              </Link>
            </div>
            <p className="text-[13px] font-[500] text-[hsl(221,91%,60%)] mb-5">What's included</p>
            <ul className="space-y-3 flex-1">
              {LIMITED_FEATURES.map(({ ok, text }) => (
                <li key={text} className={`flex items-center gap-3 text-[14.5px] ${ok ? 'text-[#2A2A2A]' : 'text-[#c0c4cc]'}`}>
                  {ok ? (
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.4px] border-[hsl(221,91%,60%)] text-[hsl(221,91%,60%)] shrink-0">
                      <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3L13 4.5"/></svg>
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.4px] border-[#E8E8EA] text-[#c0c4cc] shrink-0">
                      <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                    </span>
                  )}
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Full Access — light blue gradient */}
          <div
            className="relative rounded-3xl p-8 border border-[#D9E1FF] flex flex-col overflow-visible transition-all duration-300 hover:-translate-y-1"
            style={{ background: 'linear-gradient(172deg, #fbfcff 0%, #F7F9FF 100%)', boxShadow: '0 24px 60px -32px rgba(46,91,255,0.35)' }}
          >
            <span className="absolute top-[-13px] left-9 bg-[hsl(221,91%,60%)] text-white text-[11px] font-[600] px-4 py-1.5 rounded-full tracking-[0.03em]">Recommended</span>
            <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[32px] font-[500] text-[#0A0A0A] leading-none tracking-[-0.01em] mt-3">Full Access</h3>
            <p className="text-[14.5px] text-[#4a4d57] mt-3 mb-0 max-w-[36ch] leading-[1.5]">The complete job search platform. Every feature, every service, one subscription.</p>
            <div className="flex items-baseline gap-2 mt-6">
              <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[64px] font-[500] text-[#0A0A0A] leading-none tracking-[-0.02em]">{price}</span>
              <span className="text-[16px] text-[#4a4d57] font-[500]">/ month</span>
            </div>
            <p className="text-[12.5px] text-[#8a8f9a] mt-1.5 mb-6">{note}</p>
            <div className="relative mb-7">
              <button disabled className="block w-full h-[52px] rounded-full bg-[hsl(221,91%,60%)] text-white text-[14.5px] font-[500] opacity-60 cursor-not-allowed">
                Start Premium
              </button>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[hsl(221,91%,60%)] text-white text-[10px] font-[600] tracking-[0.06em] uppercase px-2.5 py-1 rounded-full whitespace-nowrap">
                Coming soon
              </span>
            </div>
            <p className="text-[13px] font-[500] text-[hsl(221,91%,60%)] mb-5">Everything in Limited Access, plus:</p>
            <div className="space-y-5 flex-1">
              {FULL_GROUPS.map(({ title, items }) => (
                <div key={title}>
                  <p className="text-[10.5px] font-[600] text-[#8a8f9a] uppercase tracking-[0.08em] mb-2.5">{title}</p>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-[14.5px] text-[#2A2A2A]">
                        <span className="w-[18px] h-[18px] rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center shrink-0">
                          <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3L13 4.5"/></svg>
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-white/70 border border-[#D9E1FF] rounded-xl p-4 flex flex-col gap-1">
              <p className="text-[10.5px] font-[500] text-[#4a4d57] uppercase tracking-[0.08em]">Included each month</p>
              <p style={{ fontFamily: "'Playfair Display', serif" }} className="text-[18px] font-[500] text-[#0A0A0A] tracking-[-0.01em]">300 credits / mo</p>
              <p className="text-[12px] text-[#8a8f9a]">Use toward AI mocks and mentor sessions</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREDIT PACKS
// ─────────────────────────────────────────────────────────────────────────────
function CreditPacks() {
  const [credits, setCredits] = useState(300);
  const total = creditPrice(credits);
  const per = total / credits;
  const pct = ((credits - 150) / (1000 - 150)) * 100;

  return (
    <section className="py-24" style={{ background: '#F7F7F7' }}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Step 02 block header */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-12 mb-12">
          <div>
            <div className="flex items-center gap-5 mb-3">
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[13px] font-[500] tracking-[0.04em] text-[#4a4d57] bg-[#F7F7F7] border border-[#E8E8EA] px-3 py-1 rounded-full">02</span>
              <span className="text-[11px] font-[600] tracking-[0.14em] uppercase text-[#4a4d57]">Credit packs</span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(28px,3vw,36px)] font-[500] leading-[1.15] text-[#0A0A0A] tracking-[-0.01em]">
              Pay only for what you use.{' '}
              <em className="italic text-slate-500">Refund after the mock.</em>
            </h2>
          </div>
          <p className="text-[16px] text-[#4a4d57] leading-[1.55] md:self-end">
            Flexible, controllable, low-commitment — perfect for "just a few sessions."
          </p>
        </div>

        {/* Preset packs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          {[
            { name: 'Trial', credits: 50, price: '$9.99', per: '$0.20', rate: '≈ 50 min of AI practice — try it once' },
            { name: 'Standard', credits: 100, price: '$14.99', per: '$0.1499', rate: '≈ 100 min of AI practice — a couple of full mocks' },
          ].map(({ name, credits: c, price, per: perC, rate }) => (
            <div key={name} className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-[hsl(221,91%,60%)]/30 hover:shadow-lg hover:shadow-blue-900/[0.04] hover:-translate-y-1 transition-all duration-300">
              <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[10px] uppercase tracking-[0.12em] text-slate-400 mb-3">{name}</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[48px] font-[600] text-slate-900 leading-none">{c}</span>
                <span className="text-[14px] text-slate-400">credits</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[24px] font-[600] text-slate-900">{price}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] text-slate-400">{perC} / credit</span>
              </div>
              <p className="text-[12px] text-slate-400 mb-2">{rate}</p>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[hsl(221,91%,60%)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(221,91%,60%)]"></span>
                Refund after the mock
              </span>
              <Link to="/pricing" className="mt-4 block w-full h-10 rounded-full border-2 border-slate-200 text-slate-700 text-[13px] font-medium hover:border-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,60%)] transition-all duration-200 text-center leading-[38px]">
                Buy {c} credits
              </Link>
            </div>
          ))}
        </div>

        {/* Custom slider */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/60 border border-[hsl(221,91%,60%)]/20 rounded-2xl p-8 shadow-lg shadow-blue-900/[0.05]">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[hsl(221,91%,60%)] font-medium mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Customize</p>
              <h3 className="text-[22px] font-semibold text-slate-900 mb-1">Need more than 100? Build your own pack.</h3>
              <p className="text-[13px] text-slate-500">Slide to choose any amount from 150 to 1,000 credits. More credits = lower per-credit price.</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1">
                <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[56px] font-[600] text-slate-900 leading-none">{credits.toLocaleString()}</span>
                <span className="text-[14px] text-slate-400">credits</span>
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif" }} className="text-[22px] font-[600] text-[hsl(221,91%,60%)] mt-1">${total.toFixed(2)}</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] text-slate-400">${per.toFixed(4)} / credit</p>
            </div>
          </div>
          <div className="relative pb-6">
            <input
              type="range"
              min={150} max={1000} step={50}
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
              className="w-full h-1.5 rounded-full cursor-pointer appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[hsl(221,91%,60%)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
              style={{
                background: `linear-gradient(to right, hsl(221,91%,60%) 0%, hsl(221,91%,60%) ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`,
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 flex justify-between" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {['150', '300', '500', '750', '1,000'].map((t) => (
                <span key={t} className="text-[10px] text-slate-400">{t}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-5 flex-wrap text-[12px] text-slate-500">
              {['Credits never expire', 'Refund after the mock', 'Use across AI & mentor sessions'].map((n) => (
                <span key={n} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(221,91%,60%)]"></span>
                  {n}
                </span>
              ))}
            </div>
            <Link to="/pricing" className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[hsl(221,91%,60%)] text-white text-[14px] font-medium hover:bg-[hsl(221,91%,52%)] shadow-md shadow-blue-600/25 transition-all duration-200">
              Buy {credits.toLocaleString()} credits · ${total.toFixed(2)}
            </Link>
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
    <section className="py-24 bg-slate-50/60">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-14">
          <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[10.5px] uppercase tracking-[0.1em] text-slate-400 mb-6 text-center">
            Trusted by candidates accepted to
          </p>
          <LogoMarquee logos={UNIVERSITY_LOGOS} speed={22} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ quote, name, role, initials, bg }) => (
            <article key={name} className="bg-white rounded-2xl border border-slate-200 p-7 hover:shadow-lg hover:shadow-slate-900/[0.04] hover:-translate-y-1 transition-all duration-300">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="hsl(221,91%,60%)" className="opacity-90">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="text-[14px] text-slate-700 leading-relaxed mb-6">"{quote}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center text-[11px] font-semibold text-slate-600`}>
                  {initials}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">{name}</p>
                  <p className="text-[11px] text-slate-400">{role}</p>
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
    q: 'Is Screna free to start?',
    a: 'Yes. Self-serve is free forever — AI mocks, resume analysis, community insights, and the application tracker. Upgrade only when you want mentor access or priority support.',
  },
  {
    q: 'Who are the mentors?',
    a: 'Current and recent engineers, PMs, designers, and data professionals from the companies our members target. Every mentor is vetted and has hired for or interviewed in the role they coach on.',
  },
  {
    q: 'Do you do the applying for me?',
    a: "No. You drive your search — we back you up. On Managed Outcome, a strategist helps with referral outreach and pipeline hygiene, but the decisions, applications, and interviews are yours.",
  },
  {
    q: 'How is Screna different from other AI job tools?',
    a: "Most tools hand you generic AI feedback and disappear. Screna combines AI practice, peer-shared interview intel, and on-demand human mentors — so you get the scale of software and the judgment of people who've done the loops.",
  },
  {
    q: 'What kinds of tech roles is Screna for?',
    a: 'Early-career engineers (new grad through senior), product managers, product designers, and data roles. Our strongest coverage today is backend, ML/AI, and PM at FAANG and well-known tech companies.',
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-64 shrink-0">
            <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] uppercase tracking-[0.12em] text-[hsl(221,91%,60%)] mb-4">FAQ</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(32px,4vw,48px)] font-[500] text-[#0A0A0A] leading-[1.15] max-w-[12ch]">
              Questions people ask before signing up.
            </h2>
          </div>
          <div className="flex-1 divide-y divide-slate-100">
            {FAQ_ITEMS.map(({ q, a }, i) => (
              <div key={q} className="py-4">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex items-center justify-between w-full text-left gap-4 group"
                >
                  <span className={`text-[18px] font-[500] transition-colors leading-[1.4] ${open === i ? 'text-[hsl(221,91%,60%)]' : 'text-[#0A0A0A] group-hover:text-[hsl(221,91%,60%)]'}`}>
                    {q}
                  </span>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${open === i ? 'border-[hsl(221,91%,60%)] text-[hsl(221,91%,60%)] rotate-45' : 'border-slate-200 text-slate-400'}`}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M8 3v10M3 8h10"/>
                    </svg>
                  </span>
                </button>
                {open === i && (
                  <p className="mt-3 text-[14px] text-slate-500 leading-relaxed">{a}</p>
                )}
              </div>
            ))}
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
        <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] uppercase tracking-[0.14em] text-white/55 mb-5">
          Get started
        </p>
        <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(44px,6.5vw,84px)] font-[500] leading-[1.05] tracking-[-0.02em] text-white max-w-[18ch] mx-auto mb-6">
          Ready to run a smarter{' '}
          <em className="italic" style={{ color: 'rgba(255,255,255,0.72)' }}>job search?</em>
        </h2>
        <p className="text-[18px] mb-11 max-w-[44ch] mx-auto" style={{ color: 'rgba(255,255,255,0.82)' }}>Start free in under 2 minutes.</p>
        <div className="inline-flex items-center justify-center gap-4 flex-wrap">
          <Link to="/auth" className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-white text-[hsl(221,91%,55%)] text-[15px] font-semibold hover:bg-white/90 transition-all duration-200" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(221,91%,60%)]"></span>
            Start free
          </Link>
          <div className="relative inline-flex">
            <a href="#" className="inline-flex items-center gap-2 h-12 px-8 rounded-full border border-white/25 text-white/85 text-[15px] font-[500] cursor-not-allowed opacity-60">
              Book a consult
              <ArrowRight />
            </a>
            <span className="absolute -top-2.5 -right-2.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-[600] tracking-wide bg-white text-[#2E5BFF]">
              Coming soon
            </span>
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
