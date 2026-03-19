import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Clock,
  ArrowRight,
  Coins,
  Zap,
  BarChart2,
  Building2,
  Search,
  Sparkles,
  Lock,
  User,
  Target,
  Plus,
  X,
  FileText,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  ClipboardPaste,
  Calendar,
  Crosshair,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/newDesign/ui/button';
import { Badge } from '../../components/newDesign/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/newDesign/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/newDesign/ui/dialog';
import { Navbar } from '../../components/newDesign/home/navbar';
import { Footer } from '../../components/newDesign/home/footer';
import { InterviewService } from '@/services';
import { getJobTitleRecommendations } from '@/services/ProfileServices';
import { createTrainingPlan } from '@/services/InterviewServices';
import { useAuth } from '@/contexts/AuthContext';

// ─── Auth helper (same as navbar) ──────────────────────
function useAuthState() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('screnaIsLoggedIn') === 'true';
  });
  const [userData, setUserData] = useState<{
    firstName?: string;
    lastName?: string;
    role?: string;
    experienceLevel?: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem('screnaUserData');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handler = () => {
      setIsLoggedIn(localStorage.getItem('screnaIsLoggedIn') === 'true');
      try {
        const raw = localStorage.getItem('screnaUserData');
        setUserData(raw ? JSON.parse(raw) : null);
      } catch {
        setUserData(null);
      }
    };
    window.addEventListener('screna-auth-change', handler);
    return () => window.removeEventListener('screna-auth-change', handler);
  }, []);

  const hasProfile = !!(userData?.role && userData?.experienceLevel);
  return { isLoggedIn, userData, hasProfile };
}

// ─── Types ─────────────────────────────────────────────
interface PracticeSet {
  id: number;
  module_id: string;
  title: string;
  role: string;
  focus: string;
  time: string;
  difficulty: 'Junior' | 'Intermediate' | 'Senior' | 'Staff';
  credits: number;
  practiced: number;
  popular?: boolean;
  category: string;
  company: string;
  matchScore?: number;
  topics?: string[];
  whatToExpect?: string[];
}

function mapModuleToPracticeSet(module: any, index: number, planTitle?: string, planCompany?: string): PracticeSet {
  const difficultyMap: Record<string, PracticeSet['difficulty']> = {
    easy: 'Junior',
    medium: 'Intermediate',
    hard: 'Senior',
    expert: 'Staff',
  };
  const categoryRoleMap: Record<string, string> = {
    product: 'Product Manager',
    'product sense': 'Product Manager',
    behavioral: 'General',
    'system-design': 'Software Engineer',
    'system design': 'Software Engineer',
    technical: 'Software Engineer',
    analytical: 'Data Scientist',
    leadership: 'Engineering Manager',
    resume: 'General',
  };
  const cat = (module.category || '').toLowerCase();
  const cfg = module.session_config || {};
  const topics: string[] = (cfg.questions || []).map((q: any) => q.description).filter(Boolean);
  const whatToExpect: string[] = (cfg.objectives || []).filter(Boolean);
  return {
    id: index,
    module_id: module.module_id || String(module.id || index),
    title: module.title || 'Practice Session',
    role: categoryRoleMap[cat] || 'General',
    focus: module.topic || module.category || 'General',
    time: module.duration_minutes ? `${module.duration_minutes} min` : '30 min',
    difficulty: difficultyMap[(module.difficulty || '').toLowerCase()] || 'Intermediate',
    credits: 5,
    practiced: 0,
    category: cat || 'general',
    company: planCompany || planTitle || 'Your Training Plan',
    popular: module.status !== 'completed',
    topics,
    whatToExpect,
  };
}

// ─── Data ──────────────────────────────────────────────
const PRACTICE_SETS: PracticeSet[] = [
  {
    id: 1,
    module_id: 'product-sense-essentials',
    title: 'Product Sense Essentials',
    role: 'Product Manager',
    focus: 'Product',
    time: '30 min',
    difficulty: 'Intermediate',
    credits: 5,
    practiced: 539,
    popular: true,
    category: 'product',
    company: 'FAANG / Big Tech',
  },
  {
    id: 2,
    module_id: 'behavioral-star-method',
    title: 'Behavioral STAR Method',
    role: 'General',
    focus: 'Behavioral',
    time: '45 min',
    difficulty: 'Junior',
    credits: 8,
    practiced: 198,
    popular: true,
    category: 'behavioral',
    company: 'Mid-size tech',
  },
  {
    id: 3,
    module_id: 'system-design-scalability',
    title: 'System Design Scalability',
    role: 'Software Engineer',
    focus: 'System',
    time: '48 min',
    difficulty: 'Senior',
    credits: 10,
    practiced: 340,
    category: 'system-design',
    company: 'FAANG / Big Tech',
  },
  {
    id: 4,
    module_id: 'react-frontend-core',
    title: 'React Frontend Core',
    role: 'Software Engineer',
    focus: 'Technical',
    time: '20 min',
    difficulty: 'Intermediate',
    credits: 5,
    practiced: 181,
    category: 'technical',
    company: 'Startups',
  },
  {
    id: 5,
    module_id: 'ab-testing-metrics',
    title: 'A/B Testing & Metrics',
    role: 'Data Scientist',
    focus: 'Analytical',
    time: '30 min',
    difficulty: 'Staff',
    credits: 10,
    practiced: 198,
    category: 'analytical',
    company: 'FAANG / Big Tech',
  },
  {
    id: 6,
    module_id: 'leadership-principles',
    title: 'Leadership Principles',
    role: 'Engineering Manager',
    focus: 'Behavioral',
    time: '25 min',
    difficulty: 'Senior',
    credits: 5,
    practiced: 831,
    popular: true,
    category: 'behavioral',
    company: 'Mid-size tech',
  },
  {
    id: 7,
    module_id: 'pm-strategy-vision',
    title: 'PM Strategy & Vision',
    role: 'Product Manager',
    focus: 'Product',
    time: '35 min',
    difficulty: 'Senior',
    credits: 8,
    practiced: 412,
    category: 'product',
    company: 'FAANG / Big Tech',
  },
  {
    id: 8,
    module_id: 'api-design-patterns',
    title: 'API Design Patterns',
    role: 'Software Engineer',
    focus: 'Technical',
    time: '25 min',
    difficulty: 'Intermediate',
    credits: 5,
    practiced: 267,
    category: 'technical',
    company: 'Mid-size tech',
  },
];

const RECENT_SESSIONS = [
  { id: 1, title: 'System Design Interview', score: 82, date: 'Today, 2:30 PM', duration: '28 min', tag: 'Technical' },
  { id: 2, title: 'PM Product Sense', score: 74, date: 'Yesterday, 10:00 AM', duration: '32 min', tag: 'Product' },
  { id: 3, title: 'Behavioral STAR', score: 91, date: 'Mar 12, 4:15 PM', duration: '22 min', tag: 'Behavioral' },
];


// ─── Helpers ───────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  'Product Manager': 'bg-blue-50 text-blue-700 border-blue-200/60',
  General: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Software Engineer': 'bg-slate-50 text-slate-700 border-slate-200',
  'Data Scientist': 'bg-violet-50 text-violet-700 border-violet-200/60',
  'Engineering Manager': 'bg-amber-50 text-amber-700 border-amber-200/60',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Junior: 'text-emerald-600',
  Intermediate: 'text-blue-600',
  Senior: 'text-amber-600',
  Staff: 'text-rose-600',
};

const AVATAR_COLOR_SETS = [
  ['bg-rose-200 text-rose-700', 'bg-blue-200 text-blue-700', 'bg-amber-200 text-amber-700'],
  ['bg-purple-200 text-purple-700', 'bg-green-200 text-green-700', 'bg-pink-200 text-pink-700'],
  ['bg-cyan-200 text-cyan-700', 'bg-orange-200 text-orange-700', 'bg-indigo-200 text-indigo-700'],
];

const INITIALS = ['A', 'N', 'J', 'M', 'S', 'K', 'R', 'T'];


// ════════════════════════════════════════════════════════
// PRACTICE SET CARD (reused from mock-interview)
// ════════════════════════════════════════════════════════
function PracticeSetCard({ set, showMatch }: { set: PracticeSet; showMatch?: boolean }) {
  const colorSet = AVATAR_COLOR_SETS[set.id % AVATAR_COLOR_SETS.length];
  const visibleAvatars = 3;

  return (
    <Link
      to={`/session-confirm?session=${set.module_id}&title=${encodeURIComponent(set.title)}&category=${encodeURIComponent(set.category)}&focus=${encodeURIComponent(set.focus)}&time=${encodeURIComponent(set.time)}&difficulty=${set.difficulty}${set.topics?.length ? `&topics=${encodeURIComponent(JSON.stringify(set.topics))}` : ''}${set.whatToExpect?.length ? `&whatToExpect=${encodeURIComponent(JSON.stringify(set.whatToExpect))}` : ''}`}
      className="group bg-white rounded-2xl border border-[#E2E8F0] hover:border-blue-200 hover:shadow-lg hover:shadow-slate-900/[0.06] transition-all duration-250 overflow-hidden flex flex-col"
    >
      {/* Top: Role + Popular/Match badge */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <Badge
            variant="outline"
            className={`font-medium text-xs rounded-full px-3 py-1 ${
              ROLE_COLORS[set.role] || 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {set.role}
          </Badge>
          {showMatch && set.matchScore ? (
            <Badge className="bg-blue-600 text-white hover:bg-blue-600 border-blue-600 shadow-none font-semibold text-[11px] px-2.5 py-0.5 shrink-0 rounded-full gap-1">
              <Target className="w-3 h-3" />
              {set.matchScore}% Match
            </Badge>
          ) : set.popular ? (
            <Badge className="bg-blue-600 text-white hover:bg-blue-600 border-blue-600 shadow-none font-semibold text-[11px] px-2.5 py-0.5 shrink-0 rounded-full gap-1">
              <Sparkles className="w-3 h-3" />
              Popular
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Title */}
      <div className="px-5 pt-3 pb-0 flex-1">
        <h3 className="text-[18px] font-bold text-[#0F172A] leading-snug group-hover:text-blue-600 transition-colors mb-4">
          {set.title}
        </h3>

        {/* Metadata chips row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
            <Zap className="w-3.5 h-3.5 text-slate-400" style={{ strokeWidth: 1.5 }} />
            <span>{set.focus}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" style={{ strokeWidth: 1.5 }} />
            <span>{set.time}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
            <BarChart2 className="w-3.5 h-3.5 text-slate-400" style={{ strokeWidth: 1.5 }} />
            <span className="font-medium text-[#62748e]">{set.difficulty}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
            <Building2 className="w-3.5 h-3.5 text-slate-400" style={{ strokeWidth: 1.5 }} />
            <span>{set.company}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 mt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex -space-x-1.5">
            {colorSet.slice(0, visibleAvatars).map((color, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-[10px] font-semibold border-[1.5px] border-white`}
              >
                {INITIALS[(set.id + i) % INITIALS.length]}
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-slate-400">
            +{set.practiced.toLocaleString()} practiced
          </span>
        </div>
        <div className="w-7 h-7 rounded-full border border-transparent flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}


// ════════════════════════════════════════════════════════
// SIGN-IN MODAL (soft gate)
// ════════════════════════════════════════════════════════
function SignInModal({
  open,
  onOpenChange,
  message,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  message?: string;
}) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] rounded-2xl">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-blue-600" />
          </div>
          <DialogTitle className="text-center">Sign in to continue</DialogTitle>
          <DialogDescription className="text-center text-sm text-slate-500">
            {message || 'Sign in to personalize your mock and save progress.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2.5 mt-2">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            onClick={() => {
              onOpenChange(false);
              navigate('/auth');
            }}
          >
            Sign in
          </Button>
          <Button
            variant="ghost"
            className="w-full text-slate-500 hover:text-slate-700"
            onClick={() => onOpenChange(false)}
          >
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ════════════════════════════════════════════════════════
// TARGET JOB MODAL
// ════════════════════════════════════════════════════════
interface RecommendedJob {
  job_title: string;
  match_percentage: number;
  reason: string;
  key_requirements: string[];
}

function TargetJobModal({
  open,
  onOpenChange,
  onApply,
  onPlanCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply: (job: string) => void;
  onPlanCreated?: () => void;
}) {
  const [tab, setTab] = useState<'quick' | 'paste'>('quick');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedJobData, setSelectedJobData] = useState<RecommendedJob | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [dailyPrepTime, setDailyPrepTime] = useState('2');
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedRole('');
      setSelectedJobData(null);
      setTab('quick');
      setApiError(null);
      fetchRecommendations();
    }
  }, [open]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await getJobTitleRecommendations();
      const data = response.data?.data;
      setRecommendedJobs(data?.recommendations || []);
    } catch {
      setRecommendedJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickApply = async () => {
    if (!selectedRole || !selectedJobData) return;
    setIsCreatingPlan(true);
    setApiError(null);
    try {
      await createTrainingPlan({
        jobTitle: selectedJobData.job_title,
        company: '',
        jobDescription: selectedJobData.key_requirements.join(', '),
      });
      onApply(selectedJobData.job_title);
      onOpenChange(false);
      setSelectedRole('');
      setSelectedJobData(null);
      onPlanCreated?.();
    } catch (err: any) {
      setApiError(err?.response?.data?.message || 'Failed to create plan. Please try again.');
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handlePasteApply = async () => {
    if (!jobTitle.trim()) return;
    setIsCreatingPlan(true);
    setApiError(null);
    try {
      await createTrainingPlan({
        jobTitle: jobTitle.trim(),
        company: jobCompany.trim(),
        jobDescription: jobDescription.trim(),
      });
      const label = `${jobTitle.trim()}${jobCompany.trim() ? ` at ${jobCompany.trim()}` : ''}`;
      onApply(label);
      onOpenChange(false);
      setJobTitle('');
      setJobCompany('');
      setJobDescription('');
      setInterviewDate('');
      setDailyPrepTime('2');
      onPlanCreated?.();
    } catch (err: any) {
      setApiError(err?.response?.data?.message || 'Failed to create plan. Please try again.');
    } finally {
      setIsCreatingPlan(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl">Add New Target Job</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              Enter details for your target job position
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-5">
          <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1">
            <button
              onClick={() => setTab('quick')}
              className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-all ${
                tab === 'quick'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 border border-transparent'
              }`}
            >
              Quick setup
            </button>
            <button
              onClick={() => setTab('paste')}
              className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-all ${
                tab === 'paste'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 border border-transparent'
              }`}
            >
              Paste JD
            </button>
          </div>
        </div>

        {tab === 'quick' ? (
          <div className="px-6 pt-5 pb-6 space-y-4">
            <p className="text-sm text-slate-400">Suggested based on your profile</p>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : recommendedJobs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No recommendations found. Use &ldquo;Paste JD&rdquo; to enter a custom role.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                {recommendedJobs.map((role) => {
                  const roleKey = role.job_title;
                  const isSelected = selectedRole === roleKey;
                  return (
                    <button
                      key={roleKey}
                      onClick={() => {
                        setSelectedRole(roleKey);
                        setSelectedJobData(role);
                      }}
                      className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Radio circle */}
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-blue-500' : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-[15px] text-slate-900">{role.job_title}</h4>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 border border-blue-200/60">
                              {role.match_percentage}% match
                            </span>
                          </div>
                          {role.key_requirements.length > 0 && (
                            <p className="text-sm text-slate-500 mt-0.5">
                              {role.key_requirements.slice(0, 3).join(' · ')}
                            </p>
                          )}
                          {role.reason && (
                            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                              {role.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {apiError && (
              <p className="text-sm text-red-500">{apiError}</p>
            )}
            {/* Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none px-6"
                onClick={() => onOpenChange(false)}
                disabled={isCreatingPlan}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-none px-6"
                disabled={!selectedRole || isCreatingPlan}
                onClick={handleQuickApply}
              >
                {isCreatingPlan ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Creating…</>
                ) : (
                  'Use selected role'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-6 pt-5 pb-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Senior Product Manager"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full h-11 text-sm bg-white border border-slate-200 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                Company
              </label>
              <input
                type="text"
                placeholder="e.g., Google"
                value={jobCompany}
                onChange={(e) => setJobCompany(e.target.value)}
                className="w-full h-11 text-sm bg-white border border-slate-200 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                Job Description
              </label>
              <textarea
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={5}
                className="w-full text-sm bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                  Interview Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={interviewDate}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9/]/g, '');
                      if (v.length <= 10) setInterviewDate(v);
                    }}
                    lang="en"
                    className="w-full h-11 text-sm bg-white border border-slate-200 rounded-xl pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 text-slate-500"
                    placeholder="MM/DD/YYYY"
                  />
                  {!interviewDate && (
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-blue-400 pointer-events-none">
                      Pick a date
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                  Daily Prep Time (hrs)
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={dailyPrepTime}
                  onChange={(e) => setDailyPrepTime(e.target.value)}
                  className="w-full h-11 text-sm bg-white border border-slate-200 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                />
              </div>
            </div>
            {apiError && (
              <p className="text-sm text-red-500">{apiError}</p>
            )}
            {/* Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none px-6"
                onClick={() => onOpenChange(false)}
                disabled={isCreatingPlan}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-none px-6"
                disabled={!jobTitle.trim() || isCreatingPlan}
                onClick={handlePasteApply}
              >
                {isCreatingPlan ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Creating…</>
                ) : (
                  'Generate Plan'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


// ════════════════════════════════════════════════════════
// TOAST (simple inline)
// ════════════════════════════════════════════════════════
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        {message}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════
export function PersonalizedPracticePage() {
  const navigate = useNavigate();
  const { isAuthenticated: isLoggedIn, user } = useAuth();
  const userData = user ? { role: user.role } : null;
  const hasProfile = !!userData?.role;

  // Training plan modules (real data)
  const [planSets, setPlanSets] = useState<PracticeSet[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setPlanSets([]);
      return;
    }
    setIsLoadingPlan(true);
    InterviewService.getTrainingPlans()
      .then((response) => {
        let plansData = response.data?.data ?? response.data ?? [];
        if (!Array.isArray(plansData)) plansData = [];
        const pendingModules: { module: any; planTitle: string }[] = [];
        for (const plan of plansData) {
          const planTitle = plan.target_job_title || 'Your Training Plan';
          const modules: any[] = plan.modules || [];
          for (const m of modules) {
            if (m.status === 'pending') {
              pendingModules.push({ module: m, planTitle });
            }
          }
        }
        const first8 = pendingModules.slice(0, 8);
        setPlanSets(first8.map(({ module, planTitle }, i) => mapModuleToPracticeSet(module, i, planTitle)));
      })
      .catch(() => setPlanSets([]))
      .finally(() => setIsLoadingPlan(false));
  }, [isLoggedIn]);

  // Use real plan data when available, otherwise fall back to static sets (only after loading)
  const activeSets = planSets.length > 0 ? planSets : (isLoadingPlan ? [] : PRACTICE_SETS);

  // Tabs
  const [activeTab, setActiveTab] = useState<'popular' | 'foryou'>('popular');

  // Filters (apply to Popular tab)
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Target Job
  const [targetJob, setTargetJob] = useState<string | null>(null);
  const [showTargetJobModal, setShowTargetJobModal] = useState(false);

  // Sign-in modal
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInMessage, setSignInMessage] = useState('');

  // Toast
  const [toast, setToast] = useState({ visible: false, message: '' });

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  };

  // Quick Start personalization
  const [personalizeWith, setPersonalizeWith] = useState<'profile' | 'targetjob' | null>(null);

  // Gate check helper
  const requireAuth = (msg?: string) => {
    if (!isLoggedIn) {
      setSignInMessage(msg || 'Sign in to personalize your mock and save progress.');
      setShowSignIn(true);
      return true;
    }
    return false;
  };

  // ─── Filtered sets (Popular tab) ──────────────
  const popularSets = activeSets.filter((set) => {
    if (roleFilter !== 'all' && set.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        set.title.toLowerCase().includes(q) ||
        set.role.toLowerCase().includes(q) ||
        set.focus.toLowerCase().includes(q) ||
        set.company.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => (b.practiced || 0) - (a.practiced || 0));

  // ─── Personalized sets (For you tab) ──────────
  const personalizedSets: PracticeSet[] = activeSets.map((set) => ({
    ...set,
    matchScore: Math.floor(65 + Math.random() * 30),
  })).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-6 py-20 max-w-md">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
              <Lock className="w-7 h-7 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Sign in to access Personalized Practice</h1>
            <p className="text-slate-500 mb-7 leading-relaxed">
              Get AI-powered mock interviews tailored to your profile, track your progress, and build a personalized training plan.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-none px-6"
                onClick={() => navigate('/auth')}
              >
                Sign in
              </Button>
              <Button
                variant="outline"
                className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none px-6"
                onClick={() => navigate('/')}
              >
                Go home
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 pt-[150px] pb-16">
          {/* ─── Page Header ─────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-[#0F172A] mb-2 font-bold text-[40px]">Personalized Practice</h1>
            <p className="text-slate-500 max-w-2xl whitespace-nowrap">
              AI-powered mock interviews tailored to your profile and target roles.
            </p>
          </div>

          {/* ─── Quick Start / Custom Session ───────── */}
          
          {/* ─── Target Job Bar ────────────────────── */}
          <div className="mb-8">
            {targetJob ? (
              /* Active target job state */
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-white rounded-2xl border border-blue-100 px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <Crosshair className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">Target job</span>
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200/60 shadow-none text-[11px] px-2 py-0 rounded-full">
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{targetJob}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none text-xs h-9 px-4"
                    onClick={() => setShowTargetJobModal(true)}
                  >
                    Change
                  </Button>
                  <button
                    onClick={() => {
                      setTargetJob(null);
                      showToast('Target Job cleared');
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Empty target job state */
              <div className="flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-white rounded-2xl border border-slate-200/80 px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-200/60 flex items-center justify-center shrink-0">
                    <Crosshair className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-900">Target job</span>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Add a job description to tailor sessions, or keep using recommendations based on your profile.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-none text-xs h-9 px-4 shrink-0 gap-1.5"
                  onClick={() => setShowTargetJobModal(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add target job
                </Button>
              </div>
            )}
          </div>

          {/* ─── Curated Practice Sets ────────────────  */}
          <div className="mb-12">
            {/* Section header + tabs + filters */}
            

            {/* ── Popular Tab Content ─────────────────── */}
            {activeTab === 'popular' && (
              <>
                {isLoadingPlan ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden flex flex-col animate-pulse">
                        <div className="px-5 pt-5 pb-0">
                          <div className="h-6 w-28 bg-slate-100 rounded-full" />
                        </div>
                        <div className="px-5 pt-3 pb-0 flex-1">
                          <div className="h-5 w-3/4 bg-slate-100 rounded mb-2" />
                          <div className="h-4 w-1/2 bg-slate-100 rounded mb-4" />
                          <div className="flex gap-2 mb-3">
                            <div className="h-6 w-16 bg-slate-100 rounded-full" />
                            <div className="h-6 w-16 bg-slate-100 rounded-full" />
                          </div>
                          <div className="flex gap-2">
                            <div className="h-6 w-20 bg-slate-100 rounded-full" />
                            <div className="h-6 w-24 bg-slate-100 rounded-full" />
                          </div>
                        </div>
                        <div className="px-5 py-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="h-4 w-24 bg-slate-100 rounded" />
                          <div className="w-7 h-7 bg-slate-100 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {popularSets.map((set) => (
                        <PracticeSetCard key={set.id} set={set} />
                      ))}
                    </div>
                    {popularSets.length === 0 && (
                      <div className="text-center py-16">
                        <p className="text-sm text-slate-500 mb-3">No practice sets match your search.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRoleFilter('all');
                            setSearchQuery('');
                          }}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── For You Tab Content ─────────────────── */}
            {activeTab === 'foryou' && (
              <>
                {/* Not signed in: soft gate */}
                {!isLoggedIn ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-6 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <Lock className="w-6 h-6 text-slate-400" />
                    </div>
                    <h3 className="text-[16px] font-bold text-slate-900 mb-2">
                      Sign in to get personalized practice sets
                    </h3>
                    <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                      We'll recommend sets based on your profile, experience level, and target roles.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-none"
                        onClick={() => navigate('/auth')}
                      >
                        Sign in
                      </Button>
                      <button
                        onClick={() => setActiveTab('popular')}
                        className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        Continue browsing
                      </button>
                    </div>
                  </div>
                ) : !hasProfile ? (
                  /* Signed in but profile incomplete */
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/30 py-16 px-6 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-blue-100/60 flex items-center justify-center mb-4">
                      <User className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-[16px] font-bold text-slate-900 mb-2">
                      Complete your profile to personalize recommendations
                    </h3>
                    <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                      Add your role and experience level so we can tailor practice sets for you.
                    </p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-none"
                      onClick={() => navigate('/settings')}
                    >
                      Complete profile
                    </Button>
                  </div>
                ) : (
                  /* Signed in + profile exists: show personalized */
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {personalizedSets.map((set) => (
                        <PracticeSetCard key={set.id} set={set} showMatch />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* ─── Recent Sessions ──────────────────────  */}
          
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SignInModal
        open={showSignIn}
        onOpenChange={setShowSignIn}
        message={signInMessage}
      />
      <TargetJobModal
        open={showTargetJobModal}
        onOpenChange={setShowTargetJobModal}
        onApply={(job) => {
          setTargetJob(job);
          showToast(`Target Job set: ${job}`);
        }}
        onPlanCreated={() => {
          setIsLoadingPlan(true);
          InterviewService.getTrainingPlans()
            .then((response) => {
              let plansData = response.data?.data ?? response.data ?? [];
              if (!Array.isArray(plansData)) plansData = [];
              const pendingModules: { module: any; planTitle: string }[] = [];
              for (const plan of plansData) {
                const planTitle = plan.target_job_title || 'Your Training Plan';
                const modules: any[] = plan.modules || [];
                for (const m of modules) {
                  if (m.status === 'pending') {
                    pendingModules.push({ module: m, planTitle });
                  }
                }
              }
              const first8 = pendingModules.slice(0, 8);
              setPlanSets(first8.map(({ module, planTitle }, i) => mapModuleToPracticeSet(module, i, planTitle)));
            })
            .catch(() => setPlanSets([]))
            .finally(() => setIsLoadingPlan(false));
        }}
      />
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}