import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Flame,
  Users,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Lock,
  Search,
  X,
  MessageSquare,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { Navbar } from '../components/navbar';
import { Footer } from '../components/footer';

// ─── Types ──────────────────────────────────────────────
type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Competition = 'Low' | 'Medium' | 'High';
type Level = 'All levels' | 'New grad' | 'Junior' | 'Mid' | 'Senior';
type SortMode = 'Trending' | 'Most practiced' | 'Rising fast';
type RoleFamily = 'All' | 'Engineering' | 'Product' | 'Data' | 'Design';

interface TrendingRole {
  rank: number;
  role: string;
  family: 'Engineering' | 'Product' | 'Data' | 'Design';
  practicingNow: number;
  delta: number;
  sparkline: number[];
  isNew?: boolean;
  difficulty: Difficulty;
  competition: Competition;
  risingFast?: boolean;
  focusChips: string[];
  salaryRange: string;
  interviewFormats: string[];
  typicalProcess: string;
  insightsCount: number;
  level: Level;
}

// ─── Sparkline generator ─────────────────────────────
function generateSparkline(seed: number): number[] {
  const pts: number[] = [];
  let v = 30 + ((seed * 17) % 40);
  for (let i = 0; i < 7; i++) {
    v += ((seed * (i + 3) * 7) % 21) - 8;
    v = Math.max(10, Math.min(90, v));
    pts.push(v);
  }
  return pts;
}

// ─── Data ───────────────────��───────────────────────────
const LEADERBOARD: TrendingRole[] = [
  { rank: 1, role: 'Product Manager', family: 'Product', practicingNow: 1243, delta: 18, sparkline: generateSparkline(1), difficulty: 'Hard', competition: 'High', risingFast: true, focusChips: ['Metrics', 'Tradeoffs', 'Stakeholder Mgmt'], salaryRange: '$120k – $185k', interviewFormats: ['Behavioral', 'Case Study', 'Product Sense'], typicalProcess: 'Phone · Onsite · HM', insightsCount: 284, level: 'Mid' },
  { rank: 2, role: 'Frontend Engineer', family: 'Engineering', practicingNow: 852, delta: 12, sparkline: generateSparkline(2), difficulty: 'Medium', competition: 'High', focusChips: ['System Design', 'React Patterns', 'Performance'], salaryRange: '$110k – $170k', interviewFormats: ['Coding', 'System Design', 'Behavioral'], typicalProcess: 'Phone · Coding · Onsite', insightsCount: 196, level: 'Mid' },
  { rank: 3, role: 'Data Scientist', family: 'Data', practicingNow: 621, delta: 9, sparkline: generateSparkline(3), difficulty: 'Hard', competition: 'Medium', focusChips: ['ML Fundamentals', 'SQL', 'Experimentation'], salaryRange: '$125k – $190k', interviewFormats: ['Coding', 'Case Study', 'Technical'], typicalProcess: 'Phone · Take-home · Onsite', insightsCount: 158, level: 'Mid' },
  { rank: 4, role: 'UX Designer', family: 'Design', practicingNow: 584, delta: 15, sparkline: generateSparkline(4), difficulty: 'Medium', competition: 'Medium', risingFast: true, focusChips: ['Portfolio Review', 'Design Critique', 'User Research'], salaryRange: '$95k – $150k', interviewFormats: ['Portfolio', 'Design Challenge', 'Behavioral'], typicalProcess: 'Screen · Portfolio · Onsite', insightsCount: 132, level: 'Mid' },
  { rank: 5, role: 'Backend Engineer', family: 'Engineering', practicingNow: 541, delta: 7, sparkline: generateSparkline(5), difficulty: 'Hard', competition: 'High', focusChips: ['APIs', 'Scalability', 'Databases'], salaryRange: '$120k – $180k', interviewFormats: ['Coding', 'System Design', 'Behavioral'], typicalProcess: 'Phone · Coding · System Design · HM', insightsCount: 211, level: 'Mid' },
  { rank: 6, role: 'DevOps Engineer', family: 'Engineering', practicingNow: 472, delta: -3, sparkline: generateSparkline(6), difficulty: 'Hard', competition: 'Low', focusChips: ['CI/CD', 'Infrastructure', 'Monitoring'], salaryRange: '$115k – $175k', interviewFormats: ['Technical', 'System Design', 'Behavioral'], typicalProcess: 'Phone · Technical · Onsite', insightsCount: 87, level: 'Senior' },
  { rank: 7, role: 'ML Engineer', family: 'Data', practicingNow: 431, delta: 22, sparkline: generateSparkline(7), difficulty: 'Hard', competition: 'Medium', risingFast: true, focusChips: ['MLOps', 'Model Training', 'Data Pipelines'], salaryRange: '$135k – $210k', interviewFormats: ['Coding', 'ML Design', 'Behavioral'], typicalProcess: 'Phone · Coding · ML Deep-dive · HM', insightsCount: 143, level: 'Senior' },
  { rank: 8, role: 'iOS Developer', family: 'Engineering', practicingNow: 393, delta: 4, sparkline: generateSparkline(8), difficulty: 'Medium', competition: 'Low', focusChips: ['Swift', 'UIKit', 'App Architecture'], salaryRange: '$110k – $165k', interviewFormats: ['Coding', 'System Design', 'Behavioral'], typicalProcess: 'Phone · Coding · Onsite', insightsCount: 64, level: 'Mid' },
  { rank: 9, role: 'Solutions Architect', family: 'Engineering', practicingNow: 351, delta: -1, sparkline: generateSparkline(9), difficulty: 'Hard', competition: 'Medium', focusChips: ['Cloud Design', 'Cost Optimization', 'Security'], salaryRange: '$140k – $200k', interviewFormats: ['System Design', 'Case Study', 'Behavioral'], typicalProcess: 'Phone · Architecture · HM', insightsCount: 91, level: 'Senior' },
  { rank: 10, role: 'Data Analyst', family: 'Data', practicingNow: 328, delta: 11, sparkline: generateSparkline(10), difficulty: 'Easy', competition: 'Medium', focusChips: ['SQL', 'Dashboards', 'Storytelling'], salaryRange: '$75k – $120k', interviewFormats: ['SQL', 'Case Study', 'Behavioral'], typicalProcess: 'Phone · SQL · Case · HM', insightsCount: 108, level: 'Junior' },
  { rank: 11, role: 'Product Designer', family: 'Design', practicingNow: 305, delta: 8, sparkline: generateSparkline(11), difficulty: 'Medium', competition: 'Medium', focusChips: ['Figma', 'Design Systems', 'Prototyping'], salaryRange: '$105k – $160k', interviewFormats: ['Portfolio', 'Design Challenge', 'Behavioral'], typicalProcess: 'Screen · Portfolio · Challenge · HM', insightsCount: 95, level: 'Mid' },
  { rank: 12, role: 'Engineering Manager', family: 'Engineering', practicingNow: 289, delta: 6, sparkline: generateSparkline(12), difficulty: 'Hard', competition: 'High', focusChips: ['Leadership', 'Prioritization', 'Hiring'], salaryRange: '$160k – $230k', interviewFormats: ['Behavioral', 'System Design', 'Leadership'], typicalProcess: 'Phone · Behavioral · System Design · HM · VP', insightsCount: 127, level: 'Senior' },
  { rank: 13, role: 'Android Developer', family: 'Engineering', practicingNow: 264, delta: -2, sparkline: generateSparkline(13), difficulty: 'Medium', competition: 'Low', focusChips: ['Kotlin', 'Jetpack Compose', 'Architecture'], salaryRange: '$105k – $160k', interviewFormats: ['Coding', 'System Design', 'Behavioral'], typicalProcess: 'Phone · Coding · Onsite', insightsCount: 52, level: 'Mid' },
  { rank: 14, role: 'Technical PM', family: 'Product', practicingNow: 247, delta: 14, sparkline: generateSparkline(14), difficulty: 'Medium', competition: 'Medium', isNew: true, risingFast: true, focusChips: ['API Design', 'Roadmapping', 'Cross-Functional'], salaryRange: '$130k – $185k', interviewFormats: ['Product Sense', 'Technical', 'Behavioral'], typicalProcess: 'Phone · Case · Technical · HM', insightsCount: 74, level: 'Mid' },
  { rank: 15, role: 'Data Engineer', family: 'Data', practicingNow: 231, delta: 5, sparkline: generateSparkline(15), difficulty: 'Hard', competition: 'Low', focusChips: ['ETL', 'Spark', 'Data Modeling'], salaryRange: '$120k – $175k', interviewFormats: ['Coding', 'System Design', 'SQL'], typicalProcess: 'Phone · Coding · Data Design · HM', insightsCount: 63, level: 'Mid' },
  { rank: 16, role: 'UX Researcher', family: 'Design', practicingNow: 218, delta: 0, sparkline: generateSparkline(16), difficulty: 'Medium', competition: 'Low', isNew: true, focusChips: ['User Interviews', 'Surveys', 'Synthesis'], salaryRange: '$90k – $140k', interviewFormats: ['Case Study', 'Portfolio', 'Behavioral'], typicalProcess: 'Phone · Case · Portfolio · HM', insightsCount: 41, level: 'Mid' },
  { rank: 17, role: 'Full-Stack Engineer', family: 'Engineering', practicingNow: 204, delta: 3, sparkline: generateSparkline(17), difficulty: 'Medium', competition: 'High', focusChips: ['Frontend', 'Backend', 'DevOps'], salaryRange: '$110k – $170k', interviewFormats: ['Coding', 'System Design', 'Behavioral'], typicalProcess: 'Phone · Coding · System Design · HM', insightsCount: 89, level: 'Mid' },
  { rank: 18, role: 'Growth PM', family: 'Product', practicingNow: 189, delta: 19, sparkline: generateSparkline(18), difficulty: 'Medium', competition: 'Medium', isNew: true, risingFast: true, focusChips: ['Experimentation', 'Funnels', 'Activation'], salaryRange: '$125k – $180k', interviewFormats: ['Product Sense', 'Case Study', 'Behavioral'], typicalProcess: 'Phone · Case · Metrics · HM', insightsCount: 56, level: 'Mid' },
  { rank: 19, role: 'QA Engineer', family: 'Engineering', practicingNow: 172, delta: -4, sparkline: generateSparkline(19), difficulty: 'Easy', competition: 'Low', focusChips: ['Test Strategy', 'Automation', 'Regression'], salaryRange: '$80k – $130k', interviewFormats: ['Technical', 'Coding', 'Behavioral'], typicalProcess: 'Phone · Technical · HM', insightsCount: 34, level: 'Junior' },
  { rank: 20, role: 'Platform Engineer', family: 'Engineering', practicingNow: 158, delta: 10, sparkline: generateSparkline(20), difficulty: 'Hard', competition: 'Low', focusChips: ['Internal Tools', 'Developer Experience', 'Infra'], salaryRange: '$125k – $185k', interviewFormats: ['Coding', 'System Design', 'Behavioral'], typicalProcess: 'Phone · Coding · System Design · HM', insightsCount: 47, level: 'Senior' },
];

const FAMILIES: RoleFamily[] = ['All', 'Engineering', 'Product', 'Data', 'Design'];
const LEVELS: Level[] = ['All levels', 'New grad', 'Junior', 'Mid', 'Senior'];
const SORT_MODES: SortMode[] = ['Trending', 'Most practiced', 'Rising fast'];

// ─── Helpers ────────────────────────────────────────────
function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
}

// ─── InfoTooltip ────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!show) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [show]);
  return (
    <div className="relative inline-flex" ref={ref}>
      <button onClick={() => setShow(!show)} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 px-3 py-2 rounded-lg bg-foreground text-background text-xs leading-relaxed shadow-lg pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Pills ──────────────────────────────────────────────
const DIFF_STYLES: Record<Difficulty, string> = {
  Easy: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
  Medium: 'bg-amber-50 text-amber-600 border-amber-200/60',
  Hard: 'bg-red-50 text-red-600 border-red-200/60',
};
const COMP_STYLES: Record<Competition, string> = {
  Low: 'bg-secondary text-muted-foreground border-border',
  Medium: 'bg-blue-50 text-blue-600 border-blue-200/60',
  High: 'bg-violet-50 text-violet-600 border-violet-200/60',
};

function DifficultyPill({ level }: { level: Difficulty }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${DIFF_STYLES[level]}`}>
      {level}
      <InfoTooltip text="Estimated from practice completion and evaluation patterns." />
    </span>
  );
}
function CompetitionPill({ level }: { level: Competition }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${COMP_STYLES[level]}`}>
      {level}
      <InfoTooltip text="Estimated from community demand signals (practice volume, trend growth, insights activity). Not applicant counts." />
    </span>
  );
}

// ─── SVG Sparkline ──────────────────────────────────────
function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 56, h = 20, pad = 2;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => ({ x: pad + (i / (data.length - 1)) * (w - pad * 2), y: h - pad - ((v - mn) / rng) * (h - pad * 2) }));
  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${pts[0].y} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;
  const col = positive ? '#3b82f6' : '#94a3b8';
  const gid = `sp-${data[0]}-${data[3]}`;
  return (
    <svg width={w} height={h} className="shrink-0">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity={0.12} /><stop offset="100%" stopColor={col} stopOpacity={0} /></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={poly} />
    </svg>
  );
}

// ─── DeltaBadge ─────────────────────────────────────────
function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="w-3 h-3" />0%</span>;
  const pos = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${pos ? 'text-emerald-600' : 'text-muted-foreground'}`}>
      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pos ? '+' : ''}{delta}%
    </span>
  );
}

// ════════════════════════════════════════════════════════════
// HOW WE RANK MODAL
// ════════════════════════════════════════════════════════════
function HowWeRankModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div ref={ref} className="bg-card rounded-2xl shadow-xl border border-border max-w-lg w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">How we rank</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><span className="font-medium text-foreground">Ranking</span> — Roles are ranked by a composite of practice volume, engagement intensity, and week-over-week growth across the Screna community. This is not a job market ranking.</p>
          <p><span className="font-medium text-foreground">Difficulty (est.)</span> — Estimated from aggregated completion rates and evaluation feedback from mock sessions. Reflects community perception, not an objective measure.</p>
          <p><span className="font-medium text-foreground">Competition (est.)</span> — Derived from community demand signals — practice volume, trend velocity, and insights frequency. Not based on real applicant counts.</p>
          <p><span className="font-medium text-foreground">Salary (est.)</span> — Approximate US ranges from public compensation databases. Varies significantly by company, location, level, and negotiation.</p>
          <p><span className="font-medium text-foreground">Insights</span> — Count of community-contributed interview tips, question breakdowns, and experience reports for each role.</p>
          <p className="text-xs text-muted-foreground/70 pt-1">All "estimated" metrics are approximations. Use as directional guidance, not definitive assessments.</p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TOP 3 SPOTLIGHT CARD
// ════════════════════════════════════════════════════════════
function SpotlightCard({ item, onStart }: { item: TrendingRole; onStart: (item: TrendingRole) => void }) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded]);

  return (
    <div className="relative bg-card border border-border rounded-2xl px-6 py-6 hover:shadow-md transition-shadow group cursor-default flex flex-col">
      {/* Rank badge + Role */}
      <div className="flex items-center gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
          {item.rank}
        </span>
        <div>
          <h3 className="text-base font-semibold text-foreground leading-snug">{item.role}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{formatCount(item.practicingNow)} practicing</span>
            <DeltaBadge delta={item.delta} />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {item.risingFast && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 rounded-full px-2.5 py-1 border border-amber-200/60 flex items-center gap-1">
            <Zap className="w-3 h-3" />Rising fast
          </span>
        )}
        {item.isNew && (
          <span className="text-xs font-medium text-primary bg-primary/5 rounded-full px-2.5 py-1 border border-primary/20">New</span>
        )}
        <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2.5 py-1 border border-border">{item.family}</span>
      </div>

      {/* Collapsible details toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-[0px] mt-[0px] mb-[10px]"
      >
        <span>{expanded ? 'Less details' : 'More details'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Collapsible details panel */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? `${contentHeight}px` : '0px', opacity: expanded ? 1 : 0 }}
      >
        <div ref={contentRef} className="pt-4 space-y-2.5">
          <div className="border-t border-border/60 space-y-2.5 px-[0px] pt-[12px] pb-[0px]">
            {/* Focus chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">Focus:</span>
              {item.focusChips.map(c => (
                <span key={c} className="text-xs font-medium text-primary bg-primary/5 rounded-full px-2.5 py-1">{c}</span>
              ))}
            </div>
            {/* Difficulty */}
            
            {/* Competition */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Competition (est.)</span>
              <CompetitionPill level={item.competition} />
            </div>
            {/* Salary */}
            
            {/* 7d trend */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">7d trend</span>
              <MiniSparkline data={item.sparkline} positive={item.delta >= 0} />
            </div>
            {/* Interview formats */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Format</span>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {item.interviewFormats.map(f => (
                  <span key={f} className="text-xs text-foreground/60 bg-secondary rounded-md px-1.5 py-0.5 border border-border">{f}</span>
                ))}
              </div>
            </div>
            {/* Typical process */}
            
            {/* Insights */}
            
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => onStart(item)}
        className="mt-auto w-full h-10 text-sm font-medium rounded-xl text-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 hover:bg-[hsl(221,91%,60%)]/20 transition-all flex items-center justify-center gap-1.5 px-[0px] py-[12px] mx-[0px] my-[12px]"
      >
        View
        <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// RANKED ROW (#4-#20)
// ════════════════════════════════════════════════════════════
function RankedRow({ item, onStart, isLoggedIn }: { item: TrendingRole; onStart: (item: TrendingRole) => void; isLoggedIn: boolean }) {
  return (
    <div className="flex gap-4 px-5 py-4 border-b border-border/60 last:border-b-0 hover:bg-secondary/30 transition-colors group">
      {/* LEFT: Rank + Title + Practicing */}
      <div className="w-44 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-muted-foreground tabular-nums w-6 text-right">{item.rank}</span>
          <span className="text-sm font-semibold text-foreground truncate">{item.role}</span>
        </div>
        <div className="flex items-center gap-2 pl-8">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            {formatCount(item.practicingNow)}
          </div>
          <DeltaBadge delta={item.delta} />
        </div>
        {/* Tags */}
        <div className="flex items-center gap-1 pl-8 mt-1.5">
          {item.risingFast && (
            null
          )}
          {item.isNew && (
            <span className="text-xs font-medium text-primary bg-blue-50 rounded-full px-1.5 py-px border border-blue-200/60">New</span>
          )}
        </div>
      </div>

      {/* MIDDLE: Focus + Format + Process */}
      <div className="flex-1 min-w-0">
        {/* Focus chips */}
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          <span className="text-xs text-muted-foreground shrink-0">Focus on:</span>
          {item.focusChips.map(c => (
            <span key={c} className="text-xs font-medium text-primary/80 bg-primary/5 rounded-full px-2 py-0.5">{c}</span>
          ))}
        </div>
        {/* Interview format chips */}
        <div className="flex items-center gap-1 flex-wrap mb-1">
          <span className="text-xs text-muted-foreground shrink-0">Format:</span>
          {item.interviewFormats.map(f => (
            <span key={f} className="text-xs text-foreground/60 bg-secondary rounded-md px-1.5 py-0.5 border border-border">{f}</span>
          ))}
        </div>
        {/* Typical process */}
        <p className="text-xs text-muted-foreground/70">Rounds: {item.typicalProcess}</p>
      </div>

      {/* RIGHT: Stats column */}
      <div className="w-48 shrink-0 space-y-1.5">
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground/70">Competition</span>
          <CompetitionPill level={item.competition} />
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs text-muted-foreground/70">7d trend</span>
          <MiniSparkline data={item.sparkline} positive={item.delta >= 0} />
        </div>
        
        
      </div>

      {/* ACTIONS */}
      <div className="w-32 shrink-0 flex flex-col items-end justify-center gap-1.5">
        <button
          onClick={() => onStart(item)}
          className="inline-flex items-center justify-center w-full h-9 rounded-xl text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all"
        >
          View
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// RESPONSIVE RANKED ROW (mobile-friendly)
// ════════════════════════════════════════════════════════════
function RankedRowMobile({ item, onStart }: { item: TrendingRole; onStart: (item: TrendingRole) => void }) {
  return (
    <div className="px-4 py-3.5 border-b border-border/60 last:border-b-0">
      <div className="flex items-start gap-3 mb-2">
        <span className="text-sm font-semibold text-muted-foreground tabular-nums w-5 text-right shrink-0 mt-0.5">{item.rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-foreground truncate">{item.role}</span>
            {item.risingFast && <Zap className="w-3 h-3 text-amber-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>{formatCount(item.practicingNow)} practicing</span>
            <DeltaBadge delta={item.delta} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <DifficultyPill level={item.difficulty} />
            <CompetitionPill level={item.competition} />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {item.focusChips.map(c => (
              <span key={c} className="text-xs font-medium text-primary/80 bg-primary/5 rounded-full px-2 py-0.5">{c}</span>
            ))}
          </div>
        </div>
        <button onClick={() => onStart(item)} className="text-sm font-medium text-primary shrink-0 bg-primary/10 hover:bg-primary/20 px-4 py-1.5 rounded-lg transition-colors">View</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FILTER SIDEBAR
// ════════════════════════════════════════════════════════════
function FilterSidebar({
  family, setFamily,
  level, setLevel,
  sort, setSort,
  search, setSearch,
}: {
  family: RoleFamily; setFamily: (f: RoleFamily) => void;
  level: Level; setLevel: (l: Level) => void;
  sort: SortMode; setSort: (s: SortMode) => void;
  search: string; setSearch: (s: string) => void;
}) {
  return (
    <aside className="w-52 shrink-0 hidden lg:block">
      <div className="sticky top-32 space-y-6">
        {/* Search */}
        <div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search roles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs text-foreground bg-card border border-border rounded-lg placeholder-muted-foreground/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/20 transition-all"
            />
          </div>
        </div>

        {/* Job family */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Job family</p>
          <div className="space-y-0.5">
            {FAMILIES.map(f => (
              <button
                key={f}
                onClick={() => setFamily(f)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  family === f
                    ? 'bg-primary/8 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div>
          
          <div className="space-y-0.5">
            {LEVELS.map(l => (
              null
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Sort by</p>
          <div className="space-y-0.5">
            {SORT_MODES.map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  sort === s
                    ? 'bg-primary/8 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════
// MOBILE FILTERS (horizontal pills)
// ════════════════════════════════════════════════════════════
function MobileFilters({
  family, setFamily,
  search, setSearch,
}: {
  family: RoleFamily; setFamily: (f: RoleFamily) => void;
  search: string; setSearch: (s: string) => void;
}) {
  return (
    <div className="lg:hidden space-y-3 mb-6">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search roles…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-9 pl-8 pr-3 text-sm text-foreground bg-card border border-border rounded-lg placeholder-muted-foreground/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/20 transition-all"
        />
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {FAMILIES.map(f => (
          <button
            key={f}
            onClick={() => setFamily(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              family === f
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground border border-border'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export function MockInterviewPage() {
  const navigate = useNavigate();
  const [family, setFamily] = useState<RoleFamily>('All');
  const [level, setLevel] = useState<Level>('All levels');
  const [sort, setSort] = useState<SortMode>('Trending');
  const [search, setSearch] = useState('');
  const [showHowWeRank, setShowHowWeRank] = useState(false);

  const isLoggedIn = false;

  const top3 = LEADERBOARD.slice(0, 3);
  const rest = LEADERBOARD.slice(3);

  const filtered = useMemo(() => {
    let items = [...rest];
    if (family !== 'All') items = items.filter(i => i.family === family);
    if (level !== 'All levels') items = items.filter(i => i.level === level);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.role.toLowerCase().includes(q));
    }
    if (sort === 'Most practiced') items.sort((a, b) => b.practicingNow - a.practicingNow);
    if (sort === 'Rising fast') items.sort((a, b) => b.delta - a.delta);
    return items;
  }, [rest, family, level, search, sort]);

  const handleStart = (item: TrendingRole) => {
    // Navigate to the new job-detail page, can pass id or just go to standard page
    navigate(`/job-detail`); 
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-[140px] pb-16">
          {/* ─── Page Header ─────────────────────────── */}
          <div className="mb-10">
            <h1 className="text-foreground font-bold text-[40px] mb-1 font-[Playfair_Display]">Trending Roles</h1>
            <p className="text-muted-foreground mb-2">
              See what roles are trending today — updated daily.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground/60">Last updated: 9:30 AM</span>
              <span className="text-muted-foreground/30">·</span>
              <button onClick={() => setShowHowWeRank(true)} className="text-xs text-primary hover:underline font-medium transition-colors">
                How we rank
              </button>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-xs text-muted-foreground/60">Based on community activity signals. Updated daily.</span>
            </div>
          </div>

          {/* ─── Top 3 Spotlight ──────────────────────── */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-foreground">Top Trending Today</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {top3.map(item => (
                <SpotlightCard key={item.rank} item={item} onStart={handleStart} />
              ))}
            </div>
          </div>

          {/* ─── Mobile filters ──────────────────────── */}
          <MobileFilters family={family} setFamily={setFamily} search={search} setSearch={setSearch} />

          {/* ─── Two-column layout ───────────────────── */}
          <div className="flex gap-8">
            {/* Left: Filter sidebar */}
            <FilterSidebar
              family={family} setFamily={setFamily}
              level={level} setLevel={setLevel}
              sort={sort} setSort={setSort}
              search={search} setSearch={setSearch}
            />

            {/* Right: Ranked list */}
            <div className="flex-1 min-w-0">
              {/* List header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">
                  All roles
                  <span className="font-normal text-muted-foreground ml-1">({filtered.length})</span>
                </span>
              </div>

              {/* Desktop rows */}
              <div className="hidden lg:block border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                {/* Column header */}
                <div className="flex gap-4 px-5 py-2 border-b border-border/60 text-xs text-muted-foreground font-medium bg-secondary/30">
                  <span className="w-44 shrink-0">Role</span>
                  <span className="flex-1">Details</span>
                  <span className="w-48 shrink-0 text-left">Stats</span>
                  <span className="w-32 shrink-0" />
                </div>
                {filtered.length > 0 ? (
                  filtered.map(item => (
                    <RankedRow key={item.rank} item={item} onStart={handleStart} isLoggedIn={isLoggedIn} />
                  ))
                ) : (
                  <div className="px-5 py-12 text-center text-sm text-muted-foreground">No roles match your filters.</div>
                )}
              </div>

              {/* Mobile rows */}
              <div className="lg:hidden border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                {filtered.length > 0 ? (
                  filtered.map(item => (
                    <RankedRowMobile key={item.rank} item={item} onStart={handleStart} />
                  ))
                ) : (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">No roles match your filters.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <HowWeRankModal open={showHowWeRank} onClose={() => setShowHowWeRank(false)} />
    </div>
  );
}