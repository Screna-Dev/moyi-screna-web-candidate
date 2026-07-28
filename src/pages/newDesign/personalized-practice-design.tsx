import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Clock, ArrowRight, Zap, BarChart2, Building2, Sparkles, Target, Plus, CheckCircle2, Calendar, ChevronLeft, ChevronRight, Crosshair, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '../../components/newDesign/ui/button';
import { Badge } from '../../components/newDesign/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/newDesign/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/newDesign/ui/popover';
import { Navbar } from '../../components/newDesign/home/navbar';
import { Footer } from '../../components/newDesign/home/footer';
import { DashboardLayout } from '../../components/newDesign/dashboard-layout';
import { WidePageContainer } from '../../components/newDesign/dashboard-page';
import { GoalPage } from './goal-page';
import { GoalUploadPage } from './goal-upload-page';
import { InterviewService } from '@/services';
import { getProfile } from '@/services/ProfileServices';
import { useRecommendedJobs } from '@/hooks/useRecommendedJobs';
import type { RecommendedJob } from '@/hooks/useRecommendedJobs';
import { createTrainingPlan } from '@/services/InterviewServices';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';

// ─── Types ─────────────────────────────────────────────
interface PracticeSet {
  id: number;
  module_id: string;
  training_plan_id?: number;
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
  topics?: string[];
  whatToExpect?: string[];
}

function mapModuleToPracticeSet(module: any, index: number, planTitle?: string, planCompany?: string, planId?: number): PracticeSet {
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
    training_plan_id: planId,
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

// ─── Helpers ───────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  'Product Manager': 'bg-blue-50 text-blue-700 border-blue-200/60',
  General: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Software Engineer': 'bg-slate-50 text-slate-700 border-slate-200',
  'Data Scientist': 'bg-violet-50 text-violet-700 border-violet-200/60',
  'Engineering Manager': 'bg-amber-50 text-amber-700 border-amber-200/60',
};

// ════════════════════════════════════════════════════════
// GENERATION PROGRESS BAR COMPONENT
// ════════════════════════════════════════════════════════
function GenerationProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
        <span className="font-medium">Generating your training plan</span>
        <span className="font-mono text-blue-600">{progress}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 text-center mt-3">
        We're creating personalized practice modules based on your target role
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// PRACTICE SET CARD (reused from mock-interview)
// ════════════════════════════════════════════════════════
function PracticeSetCard({ set, onClick, isLoading, userBalance }: { set: PracticeSet; onClick?: () => void; isLoading?: boolean; userBalance?: number }) {
  const hasInsufficientBalance = userBalance !== undefined && userBalance < set.credits;

  const cardClass = `group bg-white rounded-2xl border border-[#E2E8F0] hover:border-blue-200 hover:shadow-lg hover:shadow-slate-900/[0.06] transition-all duration-250 overflow-hidden flex flex-col ${isLoading ? 'opacity-60 pointer-events-none' : ''}`;

  const inner = (
    <>
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
          {set.popular ? (
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
        <div className="flex items-center gap-1.5 min-w-0">
          {hasInsufficientBalance ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="text-xs text-orange-600 truncate">
                Need {set.credits} credits
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-400">
              {set.practiced > 0 ? `${set.practiced.toLocaleString()} practiced` : 'Ready to practice'}
            </span>
          )}
        </div>
        <div className="w-7 h-7 rounded-full border border-transparent flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`text-left w-full ${cardClass}`}>
        {inner}
      </button>
    );
  }

  return (
    <Link
      to={`/session-confirm?session=${set.module_id}&title=${encodeURIComponent(set.title)}&category=${encodeURIComponent(set.category)}&focus=${encodeURIComponent(set.focus)}&time=${encodeURIComponent(set.time)}&difficulty=${set.difficulty}${set.topics?.length ? `&topics=${encodeURIComponent(JSON.stringify(set.topics))}` : ''}${set.whatToExpect?.length ? `&whatToExpect=${encodeURIComponent(JSON.stringify(set.whatToExpect))}` : ''}`}
      className={cardClass}
    >
      {inner}
    </Link>
  );
}


// ════════════════════════════════════════════════════════
// ENGLISH DATE PICKER (locale-independent)
// ════════════════════════════════════════════════════════
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDateMDY(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${m}/${d}/${y}`;
}

function EnglishDatePicker({
  value,
  onChange,
  minDate,
}: {
  value: string;
  onChange: (iso: string) => void;
  minDate?: Date;
}) {
  const today = new Date();
  const initialMonth = value
    ? new Date(`${value}T00:00:00`)
    : new Date(today.getFullYear(), today.getMonth(), 1);
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());
  const [open, setOpen] = useState(false);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const minTime = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime() : -Infinity;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full h-11 text-sm bg-white border border-slate-200 rounded-xl pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 text-left relative ${
            value ? 'text-slate-900' : 'text-slate-400'
          }`}
        >
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          {value ? formatDateMDY(value) : 'Pick a date'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={goPrev}
            className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-semibold text-slate-900">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[11px] text-slate-400 mb-1">
          {WEEKDAY_NAMES.map((w) => (
            <div key={w} className="h-7 flex items-center justify-center font-medium">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="h-8" />;
            const cellTime = new Date(viewYear, viewMonth, d).getTime();
            const disabled = cellTime < minTime;
            const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
            const isSelected = value === iso;
            const isToday =
              today.getFullYear() === viewYear &&
              today.getMonth() === viewMonth &&
              today.getDate() === d;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(iso);
                  setOpen(false);
                }}
                className={`h-8 text-sm rounded-md transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : isToday
                    ? 'bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ════════════════════════════════════════════════════════
// TARGET JOB MODAL
// ════════════════════════════════════════════════════════

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
  const { recommendations: recommendedJobs, isLoading, error: recError, fetchRecommendations, invalidate } = useRecommendedJobs();
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const posthog = usePostHog();

  useEffect(() => {
    if (open) {
      setSelectedRole('');
      setSelectedJobData(null);
      setTab('quick');
      setApiError(null);
      invalidate();
      fetchRecommendations();
    }
  }, [open]);

  const handleQuickApply = async () => {
    if (!selectedRole || !selectedJobData) return;
    setIsCreatingPlan(true);
    setApiError(null);
    // mock_new_titles —— create a new training plan from a recommended JD
    safeCapture(posthog, EVENTS.MOCK_NEW_TITLES, {
      method: 'quick_select',
      job_title: selectedJobData.job_title,
    });
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
    if (!jobTitle.trim() || !jobDescription.trim()) return;
    setIsCreatingPlan(true);
    setApiError(null);
    // mock_new_titles —— create a new training plan from a pasted JD
    safeCapture(posthog, EVENTS.MOCK_NEW_TITLES, {
      method: 'paste_jd',
      job_title: jobTitle.trim(),
    });
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

        {tab === 'quick' && (
          <div className="px-6 pt-5 pb-6 space-y-4">
            <p className="text-sm text-slate-400">Suggested based on your profile</p>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : recommendedJobs.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-slate-400">
                  {recError || 'No recommendations found yet. Your profile may still be processing.'}
                </p>
                <button
                  onClick={() => { invalidate(); fetchRecommendations(); }}
                  className="text-xs text-blue-500 hover:text-blue-600 underline"
                >
                  Retry
                </button>
                <p className="text-xs text-slate-400">Or use &ldquo;Paste JD&rdquo; to enter a custom role.</p>
              </div>
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
        )}

        {tab === 'paste' && (
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
                Job Description <span className="text-red-500">*</span>
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
                <EnglishDatePicker
                  value={interviewDate}
                  onChange={setInterviewDate}
                  minDate={new Date()}
                />
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
                disabled={!jobTitle.trim() || !jobDescription.trim() || isCreatingPlan}
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
// ─── Hero banner ──────────────────────────────────────────
function PersonalizedPracticeHeroBanner() {
  // Arrow-head path from the decorative target motif (inlined).
  const arrowHead = "M853.2 150.571L881.1 154.171L861.3 173.971L853.2 150.571Z";
  return (
    <section
      aria-label="Personalized Practice hero"
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(to right, #fbfaff, #f1efff 48%, #eafbf6)',
        marginTop: 0,
        marginLeft: -32,
        marginRight: -32,
        marginBottom: 28,
      }}
    >
      {/* Decorative target motif — aria-hidden */}
      <svg
        aria-hidden="true"
        focusable="false"
        width="600"
        height="238"
        viewBox="0 0 1147 330"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, height: '100%', pointerEvents: 'none' }}
        preserveAspectRatio="xMaxYMid meet"
      >
        <rect fill="white" fillOpacity="0.16" height="288" rx="30" transform="rotate(10 587.2 -4.74866)" width="324" x="587.2" y="-4.74866" />
        <circle cx="842.2" cy="143.811" fill="white" fillOpacity="0.04" r="70.2" />
        <circle cx="842.2" cy="143.811" r="69.2" stroke="#8B5CF6" strokeOpacity="0.22" strokeWidth="2" />
        <circle cx="842.2" cy="143.811" fill="white" fillOpacity="0.06" r="47.736" />
        <circle cx="842.2" cy="143.811" r="46.736" stroke="#14B8A6" strokeOpacity="0.22" strokeWidth="2" />
        <circle cx="842.201" cy="143.811" fill="white" fillOpacity="0.12" r="25.272" />
        <circle cx="842.201" cy="143.811" r="24.272" stroke="#F59E0B" strokeOpacity="0.2" strokeWidth="2" />
        <circle cx="842.2" cy="143.811" fill="#8B5CF6" fillOpacity="0.24" r="9.9" />
        <circle cx="842.2" cy="143.811" r="8.9" stroke="white" strokeOpacity="0.78" strokeWidth="2" />
        <rect fill="#8B5CF6" fillOpacity="0.16" height="2.7" rx="1.35" width="45" x="745" y="142.461" />
        <rect fill="#8B5CF6" fillOpacity="0.16" height="2.7" rx="1.35" width="45" x="894.4" y="142.461" />
        <rect fill="#14B8A6" fillOpacity="0.16" height="45" rx="1.35" width="2.7" x="840.851" y="46.6113" />
        <rect fill="#14B8A6" fillOpacity="0.16" height="45" rx="1.35" width="2.7" x="840.851" y="196.011" />
        <path d={arrowHead} fill="#8B5CF6" fillOpacity="0.22" stroke="white" strokeOpacity="0.32" />
        <rect fill="#F59E0B" fillOpacity="0.16" height="3.6" rx="1.8" transform="rotate(24 1068.46 199.611)" width="30.6" x="1068.46" y="199.611" />
        <rect fill="#14B8A6" fillOpacity="0.13" height="3.6" rx="1.8" transform="rotate(24 1077.46 214.011)" width="27" x="1077.46" y="214.011" />
        <rect fill="white" fillOpacity="0.38" height="30.6" rx="12" width="118.8" x="942" y="81.6113" />
        <rect fill="white" fillOpacity="0.28" height="30.6" rx="12" width="144" x="958" y="128.611" />
        <rect fill="#8B5CF6" fillOpacity="0.16" height="3.6" rx="1.8" width="57.6" x="967" y="94.6113" />
        <rect fill="#14B8A6" fillOpacity="0.15" height="3.6" rx="1.8" width="75.6" x="981.4" y="142.611" />
        <circle cx="958" cy="96.6113" fill="#F59E0B" fillOpacity="0.2" r="9" />
        <circle cx="958" cy="96.6113" r="8.25" stroke="white" strokeOpacity="0.66" strokeWidth="1.5" />
        <circle cx="976.2" cy="143.811" fill="#14B8A6" fillOpacity="0.18" r="7.2" />
        <circle cx="976.2" cy="143.811" r="6.45" stroke="white" strokeOpacity="0.58" strokeWidth="1.5" />
      </svg>

      {/* Content */}
      <div className="relative flex flex-col" style={{ padding: '48px 32px 36px', zIndex: 1 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8B5CF6', marginBottom: 10 }}>
          Personalized Practice
        </span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 700, color: '#172033', lineHeight: 1.18, margin: 0, marginBottom: 10 }}>
          Practice for your target role
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: '#526070', margin: 0, maxWidth: 560, lineHeight: 1.55 }}>
          Use your profile or job description to find role-specific sessions for the interview ahead.
        </p>
      </div>
    </section>
  );
}

export function PersonalizedPracticePage() {
  const posthog = usePostHog();
  const { isAuthenticated: isLoggedIn } = useAuth();

  // personalized_practice_viewed —— 进入 Personalized Practice 页面时上报一次
  useEffect(() => {
    safeCapture(posthog, EVENTS.PERSONALIZED_PRACTICE_VIEWED);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { planData } = useUserPlan();
  const { fetchRecommendations: prefetchRecommendations } = useRecommendedJobs();
  const userBalance = planData?.permanentCreditBalance;

  // Resume check
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [hasSkippedTargetJob, setHasSkippedTargetJob] = useState(false);

  const refetchProfile = () => {
    getProfile()
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setHasResume(!!(data?.resume_path));
      })
      .catch(() => setHasResume(false));
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setHasResume(null);
      setHasSkippedTargetJob(false);
      return;
    }
    refetchProfile();
    prefetchRecommendations();
  }, [isLoggedIn]);

  // ── All state declarations ──
  const [planSets, setPlanSets] = useState<PracticeSet[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isModulesGenerating, setIsModulesGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isPartiallyReady, setIsPartiallyReady] = useState(false);
  const [existingPlanId, setExistingPlanId] = useState<number | null>(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [targetJob, setTargetJob] = useState<string | null>(null);
  const [showTargetJobModal, setShowTargetJobModal] = useState(false);

  // mock_recommendations_viewed —— practice set list rendered (fires once)
  const mockRecoTrackedRef = useRef(false);
  useEffect(() => {
    if (isLoggedIn && planSets.length > 0 && !mockRecoTrackedRef.current) {
      mockRecoTrackedRef.current = true;
      safeCapture(posthog, EVENTS.MOCK_RECOMMENDATIONS_VIEWED, {
        count: planSets.length,
      });
    }
  }, [isLoggedIn, planSets.length, posthog]);
  const [toast, setToast] = useState({ visible: false, message: '' });

  // ── Helper functions ──
  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  };

  // ── Fetch plans function ──
  const refetchPlans = async () => {
    if (!isLoggedIn) return;

    try {
      const response = await InterviewService.getTrainingPlans();
      let plansData = response.data?.data ?? response.data ?? [];
      if (!Array.isArray(plansData)) plansData = [];

      // Set target job from the first plan if it exists
      if (plansData.length > 0 && !targetJob) {
        const firstPlan = plansData[0];
        setTargetJob(firstPlan.target_job_title || 'Your Training Plan');
        setExistingPlanId(firstPlan.id);
      }

      // Check plan status and modules
      const hasAnyModules = plansData.some((plan: any) => (plan.modules || []).length > 0);
      const planStatus = plansData[0]?.status;
      const apiProgress = plansData[0]?.progress;

      if (planStatus === 'active' && hasAnyModules) {
        // Fully ready
        setIsModulesGenerating(false);
        setIsPartiallyReady(false);
        setGenerationProgress(100);

        const pendingModules: { module: any; planTitle: string; planId: number }[] = [];
        for (const plan of plansData) {
          const planTitle = plan.target_job_title || 'Your Training Plan';
          const planId = plan.id;
          const modules: any[] = plan.modules || [];
          for (const m of modules) {
            if (m.status === 'pending') {
              pendingModules.push({ module: m, planTitle, planId });
            }
          }
        }
        const first8 = pendingModules.slice(0, 8);
        setPlanSets(first8.map(({ module, planTitle, planId }, i) =>
          mapModuleToPracticeSet(module, i, planTitle, undefined, planId)
        ));
      } else if (planStatus === 'partially_ready' && hasAnyModules) {
        // First batch of modules ready, more still generating
        setIsModulesGenerating(false);
        setIsPartiallyReady(true);
        if (apiProgress != null) setGenerationProgress(apiProgress);

        const pendingModules: { module: any; planTitle: string; planId: number }[] = [];
        for (const plan of plansData) {
          const planTitle = plan.target_job_title || 'Your Training Plan';
          const planId = plan.id;
          const modules: any[] = plan.modules || [];
          for (const m of modules) {
            if (m.status === 'pending') {
              pendingModules.push({ module: m, planTitle, planId });
            }
          }
        }
        const first8 = pendingModules.slice(0, 8);
        setPlanSets(first8.map(({ module, planTitle, planId }, i) =>
          mapModuleToPracticeSet(module, i, planTitle, undefined, planId)
        ));
      } else if (plansData.length > 0) {
        // Plan exists but no modules yet — still processing
        setIsModulesGenerating(true);
        setIsPartiallyReady(false);
        if (apiProgress != null) setGenerationProgress(apiProgress);
      } else {
        setIsModulesGenerating(false);
        setIsPartiallyReady(false);
        setPlanSets([]);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  // ── Delete plan function ──
  const handleDeletePlan = async () => {
    if (!existingPlanId) return;

    setIsDeletingPlan(true);
    try {
      await InterviewService.deleteTrainingPlan(existingPlanId);
      setTargetJob(null);
      setExistingPlanId(null);
      setPlanSets([]);
      setIsPartiallyReady(false);
      setHasSkippedTargetJob(false);
      showToast('Training plan deleted successfully');
    } catch (error) {
      console.error('Error deleting plan:', error);
      showToast('Failed to delete training plan');
    } finally {
      setIsDeletingPlan(false);
    }
  };

  // ── Effects ──
  useEffect(() => {
    if (!isLoggedIn) {
      setPlanSets([]);
      setExistingPlanId(null);
      setTargetJob(null);
      return;
    }

    setIsLoadingPlan(true);
    refetchPlans().finally(() => setIsLoadingPlan(false));
  }, [isLoggedIn]);

  // ── Poll while modules are still generating or partially ready ──
  useEffect(() => {
    if (!isModulesGenerating && !isPartiallyReady) return;

    // Poll the API every 3 seconds
    const pollInterval = setInterval(() => {
      refetchPlans();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [isModulesGenerating, isPartiallyReady]);

  // ─── Gate: not signed in ──────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,98%)] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-[150px]">
          <GoalPage returnTo="/personalized-practice" />
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Gate: signed in but no resume → upload resume (onboarding) ───
  // Rendered inside DashboardLayout so the sidebar + top header stay consistent
  // with the rest of the dashboard.
  if (isLoggedIn && hasResume === false) {
    return (
      <DashboardLayout headerTitle="Personalized Practice" fullBleed>
        <div className="flex items-start justify-center pt-10 pb-16 px-6">
          <GoalUploadPage
            onUploadSuccess={() => { refetchProfile(); setHasSkippedTargetJob(false); }}
            onAddTargetJob={() => setShowTargetJobModal(true)}
          />
        </div>
        <TargetJobModal
          open={showTargetJobModal}
          onOpenChange={setShowTargetJobModal}
          onApply={(job) => { setTargetJob(job); setHasSkippedTargetJob(true); }}
          onPlanCreated={() => { refetchPlans(); setHasSkippedTargetJob(true); }}
        />
      </DashboardLayout>
    );
  }

  // ─── Gate: resume uploaded but no target job yet → add target job (onboarding) ───
  // Rendered inside DashboardLayout so the sidebar + top header stay consistent
  // with the rest of the dashboard.
  if (isLoggedIn && hasResume === true && !isLoadingPlan && !targetJob && !hasSkippedTargetJob) {
    return (
      <DashboardLayout headerTitle="Personalized Practice" fullBleed>
        <div className="flex items-start justify-center pt-10 pb-16 px-6">
          <GoalUploadPage
            initialState="target-job"
            onUploadSuccess={() => setHasSkippedTargetJob(true)}
            onAddTargetJob={() => setShowTargetJobModal(true)}
          />
        </div>
        <TargetJobModal
          open={showTargetJobModal}
          onOpenChange={setShowTargetJobModal}
          onApply={(job) => { setTargetJob(job); setHasSkippedTargetJob(true); }}
          onPlanCreated={() => { refetchPlans(); setHasSkippedTargetJob(true); }}
        />
      </DashboardLayout>
    );
  }

  // ─── Main practice page (new design shell) ────────────
  return (
    <DashboardLayout headerTitle="Personalized Practice" fullBleed>
      <WidePageContainer maxWidth="none">
        <PersonalizedPracticeHeroBanner />
        <div className="space-y-6">

          {/* ─── Target Job Bar ────────────────────── */}
          {targetJob && (
            <div>
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
                  <button
                    onClick={handleDeletePlan}
                    disabled={isDeletingPlan}
                    title="Delete training plan"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    {isDeletingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Practice Sets Content ─────────────────── */}
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
          ) : isModulesGenerating ? (
            /* Plan exists but modules still generating - with progress bar */
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white py-12 px-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  </div>
                </div>
              </div>
              <h3 className="text-[18px] font-bold text-slate-900 mb-3">
                Crafting your personalized training plan
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                We're analyzing your target role and creating practice modules tailored to your needs.
                This usually takes 15-30 seconds.
              </p>
              <GenerationProgressBar progress={generationProgress || 10} />

              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <Badge variant="outline" className="bg-white/50 text-xs">
                  <Sparkles className="w-3 h-3 mr-1 text-blue-500" />
                  Analyzing job requirements
                </Badge>
                <Badge variant="outline" className="bg-white/50 text-xs">
                  <Target className="w-3 h-3 mr-1 text-blue-500" />
                  Identifying skill gaps
                </Badge>
                <Badge variant="outline" className="bg-white/50 text-xs">
                  <Clock className="w-3 h-3 mr-1 text-blue-500" />
                  Creating practice modules
                </Badge>
              </div>
            </div>
          ) : planSets.length === 0 ? (
            /* No training plan yet */
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-[16px] font-bold text-slate-900 mb-2">Add a target job to start</h3>
              <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                Set your target role to get a personalized training plan with practice sessions tailored to your goal.
              </p>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-none"
                onClick={() => setShowTargetJobModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add target job
              </Button>
            </div>
          ) : (
            /* Show practice sets */
            <>
              {isPartiallyReady && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-700">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>More practice modules are being generated…</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {planSets.map((set) => (
                  <PracticeSetCard
                    key={set.id}
                    set={set}
                    userBalance={userBalance}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        <TargetJobModal
          open={showTargetJobModal}
          onOpenChange={setShowTargetJobModal}
          onApply={(job) => {
            setTargetJob(job);
            showToast(`Target Job set: ${job}`);
          }}
          onPlanCreated={() => {
            setIsLoadingPlan(true);
            refetchPlans().finally(() => setIsLoadingPlan(false));
          }}
        />
        <Toast message={toast.message} visible={toast.visible} />
      </WidePageContainer>
    </DashboardLayout>
  );
}
