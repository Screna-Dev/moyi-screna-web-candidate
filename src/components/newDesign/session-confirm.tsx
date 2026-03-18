import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Clock,
  Coins,
  Zap,
  Mic,
  Video,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
  BarChart2,
  Users,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Navbar } from './home/navbar';
import { Footer } from './home/footer';
import { DashboardLayout } from './dashboard-layout';
import { motion, AnimatePresence } from 'motion/react';
import imgRectangle from '@/assets/a7264fd48ee44c90a6ee1d9d5f038a62ea570b04.png';

// ─── Session Detail Data ─────────────────────────────────
interface SessionDetail {
  id: number;
  title: string;
  domain: string;
  description: string;
  focus: string;
  time: string;
  difficulty: 'Junior' | 'Intermediate' | 'Senior' | 'Staff';
  mode: 'Voice' | 'Video';
  credits: number;
  practiced: number;
  questions: number;
  topics: string[];
  whatToExpect: string[];
  recommended?: boolean;
}

const SESSION_MAP: Record<number, SessionDetail> = {
  1: {
    id: 1,
    title: 'Leadership & Conflict Resolution',
    domain: 'Behavioral',
    description:
      'Practice handling team conflicts and demonstrating leadership principles through structured behavioral questions. This session uses the STAR framework to help you articulate impactful stories.',
    focus: 'Leadership',
    time: '20 min',
    difficulty: 'Intermediate',
    mode: 'Voice',
    credits: 5,
    practiced: 390,
    questions: 6,
    topics: ['Stakeholder Management', 'Conflict Resolution', 'Team Leadership', 'Decision Making'],
    whatToExpect: [
      'Warm-up question to ease into the conversation',
      '4 behavioral questions using the STAR framework',
      'Follow-up probes on leadership decisions and outcomes',
      'Closing question about lessons learned',
      'AI-generated feedback on structure, clarity, and impact',
    ],
    recommended: true,
  },
  2: {
    id: 2,
    title: 'Product Metrics & Trade-offs',
    domain: 'Product Sense',
    description:
      'Analyze product decisions through data-driven frameworks. You\'ll be challenged to define success metrics, evaluate trade-offs, and present recommendations backed by quantitative reasoning.',
    focus: 'Metrics',
    time: '30 min',
    difficulty: 'Senior',
    mode: 'Video',
    credits: 7,
    practiced: 301,
    questions: 8,
    topics: ['Product Analytics', 'A/B Testing', 'KPI Definition', 'Trade-off Analysis'],
    whatToExpect: [
      'Scenario-based product metric questions',
      'A/B testing design and interpretation exercises',
      'Trade-off discussions between competing product goals',
      'Framework presentation for prioritization',
      'Real-time follow-ups based on your responses',
      'Comprehensive scoring across analytical depth and communication',
    ],
    recommended: true,
  },
  3: {
    id: 3,
    title: 'Stakeholder Communication',
    domain: 'Behavioral',
    description:
      'Effectively communicate technical concepts to non-technical stakeholders. This session focuses on clarity, empathy, and persuasion in cross-functional settings.',
    focus: 'Communication',
    time: '15 min',
    difficulty: 'Junior',
    mode: 'Voice',
    credits: 3,
    practiced: 568,
    questions: 5,
    topics: ['Stakeholder Management', 'Cross-functional Alignment', 'Presentation Skills'],
    whatToExpect: [
      'Ice-breaker question on a past collaboration experience',
      'Role-play: explain a technical decision to a marketing lead',
      'Scenario: handle pushback from a senior stakeholder',
      'Reflection on communication style and improvements',
      'AI feedback on clarity, tone, and persuasiveness',
    ],
  },
  4: {
    id: 4,
    title: 'System Design: Rate Limiter',
    domain: 'System Design',
    description:
      'Design a distributed rate limiting system with trade-off analysis. Covers functional requirements, high-level architecture, data storage choices, and scalability considerations.',
    focus: 'Technical',
    time: '45 min',
    difficulty: 'Staff',
    mode: 'Voice',
    credits: 10,
    practiced: 212,
    questions: 4,
    topics: ['System Design', 'Distributed Systems', 'Scalability', 'Technical Trade-offs'],
    whatToExpect: [
      'Clarify requirements and define scope',
      'High-level architecture design with component breakdown',
      'Deep dive into data storage and algorithm choices',
      'Scalability and fault tolerance discussion',
      'Trade-off analysis on consistency vs availability',
    ],
  },
  5: {
    id: 5,
    title: 'Resume Deep Dive: Projects',
    domain: 'Resume',
    description:
      'Answer technical questions about your past projects and achievements. The AI interviewer will probe into your contributions, impact, and the technical decisions you made.',
    focus: 'Technical',
    time: '25 min',
    difficulty: 'Intermediate',
    mode: 'Video',
    credits: 6,
    practiced: 479,
    questions: 7,
    topics: ['Technical Trade-offs', 'API & Integrations', 'Project Impact', 'Problem Solving'],
    whatToExpect: [
      'Walk through your most impactful project',
      'Deep dive into technical architecture decisions',
      'Questions about challenges faced and how you overcame them',
      'Quantitative impact and metrics discussion',
      'Follow-up on collaboration and ownership',
      'AI feedback on storytelling and technical depth',
    ],
  },
  6: {
    id: 6,
    title: 'Product Strategy & Vision',
    domain: 'Product Sense',
    description:
      'Develop product strategy considering market dynamics and resource constraints. Practice articulating long-term vision while addressing near-term execution priorities.',
    focus: 'Tradeoffs',
    time: '35 min',
    difficulty: 'Staff',
    mode: 'Video',
    credits: 8,
    practiced: 123,
    questions: 6,
    topics: ['Product Strategy', 'Pricing & Monetization', 'Market Analysis', 'Roadmap Planning'],
    whatToExpect: [
      'Market sizing and opportunity analysis exercise',
      'Product vision articulation for a hypothetical product',
      'Prioritization framework presentation',
      'Monetization strategy discussion',
      'Competitive landscape analysis',
      'AI evaluation on strategic thinking and business acumen',
    ],
    recommended: true,
  },
  7: {
    id: 7,
    title: 'STAR Method Practice',
    domain: 'Behavioral',
    description:
      'Master the STAR framework for behavioral interview responses. This session provides structured practice with real-time coaching on Situation, Task, Action, and Result delivery.',
    focus: 'Communication',
    time: '20 min',
    difficulty: 'Junior',
    mode: 'Voice',
    credits: 4,
    practiced: 657,
    questions: 5,
    topics: ['Adaptability & Ambiguity', 'Conflict Resolution', 'STAR Framework', 'Self-Reflection'],
    whatToExpect: [
      'Brief introduction to the STAR framework structure',
      'Practice question: Tell me about a time you handled ambiguity',
      'Practice question: Describe a conflict and your resolution approach',
      'Real-time coaching on response structure',
      'Summary feedback with improvement suggestions',
    ],
  },
  8: {
    id: 8,
    title: 'Data-Driven Decision Making',
    domain: 'Product Sense',
    description:
      'Learn to make product decisions backed by data and analytics. This session covers hypothesis formulation, experiment design, and interpreting results to drive product direction.',
    focus: 'Metrics',
    time: '30 min',
    difficulty: 'Intermediate',
    mode: 'Voice',
    credits: 5,
    practiced: 301,
    questions: 6,
    topics: ['Product Analytics & Metrics', 'A/B Testing & Experimentation', 'Data Interpretation', 'Hypothesis Testing'],
    whatToExpect: [
      'Scenario: define success metrics for a new feature launch',
      'Design an A/B experiment with control and treatment groups',
      'Interpret sample data and draw actionable conclusions',
      'Discussion on statistical significance and practical significance',
      'Final recommendation presentation',
      'AI scoring on analytical rigor and communication clarity',
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  Behavioral: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Product Sense': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'System Design': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Resume: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const DIFFICULTY_CONFIG: Record<string, { color: string; dots: number }> = {
  Junior: { color: 'text-emerald-500', dots: 1 },
  Intermediate: { color: 'text-amber-500', dots: 2 },
  Senior: { color: 'text-orange-500', dots: 3 },
  Staff: { color: 'text-red-500', dots: 4 },
};

const MODE_ICON: Record<string, typeof Mic> = {
  Voice: Mic,
  Video: Video,
};

// ════════════════════════════════════════════════════════════
// SESSION CONFIRM PAGE
// ════════════════════════════════════════════════════════════
export function SessionConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionParam = searchParams.get('session') || '1';
  const sessionId = Number(sessionParam);
  const isDashboard = searchParams.get('source') === 'dashboard';

  // Build a session from URL params when the ID isn't in the static map
  const categoryDomainMap: Record<string, string> = {
    product: 'Product Sense',
    'product sense': 'Product Sense',
    behavioral: 'Behavioral',
    'system-design': 'System Design',
    'system design': 'System Design',
    technical: 'System Design',
    analytical: 'Product Sense',
    leadership: 'Behavioral',
    general: 'Behavioral',
    resume: 'Resume',
  };
  const titleParam = searchParams.get('title');
  const parsedTopics: string[] = (() => {
    try { return JSON.parse(searchParams.get('topics') || '[]'); } catch { return []; }
  })();
  const parsedWhatToExpect: string[] = (() => {
    try { return JSON.parse(searchParams.get('whatToExpect') || '[]'); } catch { return []; }
  })();
  const dynamicTimeStr = searchParams.get('time') || '30 min';
  const dynamicCredits = parseInt(dynamicTimeStr) || 30;
  const dynamicSession: SessionDetail | null = titleParam
    ? {
        id: 0,
        title: titleParam,
        domain: categoryDomainMap[(searchParams.get('category') || '').toLowerCase().replace('_', '-')] || 'Behavioral',
        description: `Practice session focused on ${searchParams.get('focus') || searchParams.get('category') || 'interview skills'}.`,
        focus: searchParams.get('focus') || searchParams.get('category') || 'General',
        time: dynamicTimeStr,
        difficulty: (searchParams.get('difficulty') as SessionDetail['difficulty']) || 'Intermediate',
        mode: 'Video',
        credits: dynamicCredits,
        practiced: 0,
        questions: parsedTopics.length || 5,
        topics: parsedTopics,
        whatToExpect: parsedWhatToExpect,
      }
    : null;

  const session: SessionDetail | undefined = SESSION_MAP[sessionId] ?? dynamicSession ?? undefined;

  const [expectOpen, setExpectOpen] = useState(false);
  const selectedMode = 'Video' as const;
  // If session not found
  if (!session) {
    const notFound = (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-slate-900 mb-2">Session Not Found</h1>
          <p className="text-slate-500 mb-6">The requested session doesn't exist.</p>
          <Link to="/dashboard/mock-interview">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
    if (isDashboard) {
      return <DashboardLayout headerTitle="Session">{notFound}</DashboardLayout>;
    }
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">{notFound}</main>
        <Footer />
      </div>
    );
  }

  const diffConfig = DIFFICULTY_CONFIG[session.difficulty];

  const cardContent = (
        <div className={`max-w-3xl mx-auto px-6 pb-16 ${isDashboard ? 'pt-8' : 'pt-[130px]'}`}>
          {/* Back link */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>

          {/* ─── Main Card ─────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* ── Dark Header ─────────────────────────── */}
            <div className="px-8 py-8 relative overflow-hidden">
              {/* Background image */}
              <div className="absolute inset-0">
                <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none w-full h-full scale-120" src={imgRectangle} />
              </div>

              <div className="relative z-10">
                {/* Domain badge */}
                <Badge
                  variant="outline"
                  className={`mb-4 text-xs rounded-full px-3 py-1 border bg-white/60 backdrop-blur-sm ${
                    DOMAIN_COLORS[session.domain] || 'text-slate-700 border-slate-300'
                  }`}
                >
                  {session.domain}
                </Badge>

                {/* Title */}
                <h1 className="text-2xl text-slate-900 mb-2">{session.title}</h1>

                {/* Description */}
                <p className="text-slate-600 text-sm leading-relaxed max-w-xl">
                  {session.description}
                </p>

                {/* Practiced count */}
                <div className="flex items-center gap-2 mt-5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-500">
                    {session.practiced.toLocaleString()} people practiced this session
                  </span>
                </div>
              </div>
            </div>

            {/* ── Meta Info Row ───────────────────────── */}
            <div className="px-8 py-5 border-b border-slate-100">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Time */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Duration</p>
                    <p className="text-sm text-slate-900">{session.time}</p>
                  </div>
                </div>

                {/* Mode — Video only */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Mode</p>
                    <p className="text-sm text-slate-900">Video</p>
                  </div>
                </div>

                {/* Questions */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Questions</p>
                    <p className="text-sm text-slate-900">{session.questions}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Difficulty ──────────────────────────── */}
            <div className="px-8 py-4 border-b border-slate-100 flex items-center gap-3">
              <BarChart2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Difficulty:</span>
              <span className={`text-sm ${diffConfig.color}`}>
                {session.difficulty}
              </span>
              <div className="flex items-center gap-1 ml-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < diffConfig.dots ? diffConfig.color.replace('text-', 'bg-') : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* ── Topics ──���───────────────────────────── */}
            <div className="px-8 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Topics Covered</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.topics.map((topic) => (
                  <Badge
                    key={topic}
                    variant="outline"
                    className="bg-slate-50 text-slate-600 border-slate-200 rounded-full px-3 py-1 text-xs"
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>

            {/* ── What to Expect (collapsible) ────────── */}
            <div className="px-8 py-5 border-b border-slate-100">
              <button
                onClick={() => setExpectOpen(!expectOpen)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-slate-700">What to Expect</span>
                  <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 shadow-none text-[10px] px-2 py-0 rounded-full border-slate-200">
                    {session.whatToExpect.length} steps
                  </Badge>
                </div>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-50 transition-colors">
                  {expectOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {expectOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-2.5">
                      {session.whatToExpect.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-3"
                        >
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-blue-500" />
                          </div>
                          <span className="text-sm text-slate-600 leading-relaxed">{item}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer / CTA ────────────────────────── */}
            <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>
                    This session will use <span className="text-slate-700 font-medium">{session.credits}</span> credits
                  </span>
                </div>
              </div>

              <Link to={(() => {
                const domainTypeMap: Record<string, string> = {
                  'Behavioral': 'behavioral',
                  'Product Sense': 'product',
                  'System Design': 'system-design',
                  'Resume': 'resume',
                };
                const type = domainTypeMap[session.domain] ?? 'behavioral';
                const difficulty = session.difficulty.toLowerCase();
                const duration = session.time.replace(' min', '');
                const mode = selectedMode.toLowerCase();
                return `/ai-mock?interviewId=${sessionParam}&type=${type}&difficulty=${difficulty}&duration=${duration}&mode=${mode}`;
              })()}>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 h-11 text-sm gap-2 shadow-sm">
                  Begin Session
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
  );

  if (isDashboard) {
    return (
      <DashboardLayout headerTitle={session.title}>
        {cardContent}
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Navbar />
      <main className="flex-1">{cardContent}</main>
      <Footer />
    </div>
  );
}