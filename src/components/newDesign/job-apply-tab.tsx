import { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2, ChevronDown,
  MapPin,
  Sparkles,
  Briefcase, X, Lock, RefreshCw,
  SendHorizonal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './ui/table';
import { Link } from 'react-router';
import { ApplicationProfileContent } from './application-profile-tab';
import { PremiumOnboardingWizard } from './premium-onboarding-wizard';
import JobService from '@/services/JobServices';
import { getOnboardingStatus, getProfilePreferences } from '@/services/ProfileServices';
import { useUserPlan } from '@/hooks/useUserPlan';

const formatRecTimeAgo = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
};

const mapAppStatus = (raw?: string): 'Queued' | 'In Progress' | 'Submitted' => {
  const s = (raw || '').toUpperCase().replace('-', '_');
  if (s === 'IN_PROGRESS' || s === 'INPROGRESS') return 'In Progress';
  if (s === 'SUBMITTED') return 'Submitted';
  return 'Queued';
};

const mapAppToDelegated = (a: any) => {
  const company = a.company_name || 'Unknown';
  return {
    id: String(a.application_id),
    title: a.role_title || '',
    company,
    logoLetter: (company[0] || '?').toUpperCase(),
    location: a.location_str || '',
    delegatedAgo: formatRecTimeAgo(a.queued_at || a.created_at),
    status: mapAppStatus(a.status),
  };
};

const mapRecToJob = (item: any): Job => {
  const company = item.company_name || 'Unknown';
  return {
    id: String(item.recommendation_id || item.job_id),
    company,
    logoLetter: (company[0] || '?').toUpperCase(),
    logoColor: 'bg-primary text-primary-foreground',
    title: item.role_title || '',
    location: item.location_str || '',
    timeAgo: formatRecTimeAgo(item.posted_at || item.created_at),
    matchScore: 0,
    type: '',
    remoteType: '',
    years: '',
    salary: '',
    isPositiveMatch: false,
    description: '',
    skills: [],
    positiveSkills: [],
    apply_url: item.apply_url || undefined,
  };
};

// ─── Data Models ─────────────────────────────────────���─────────────────────
type Job = {
  id: string;
  company: string;
  logoLetter: string;
  logoColor: string;
  title: string;
  location: string;
  timeAgo: string;
  matchScore: number;
  type: string;
  remoteType: string;
  years: string;
  salary: string;
  isPositiveMatch: boolean;
  description: string;
  skills: string[];
  positiveSkills: string[];
  apply_url?: string;
};

type DelegatedJob = { id: string; title: string; company: string; logoLetter: string; location: string; delegatedAgo: string; status: 'Queued' | 'In Progress' | 'Submitted'; };
// ─── Reusable Pieces ───────────────────────────────────────────────────��───
function CompanyAvatar({ letter, color = 'bg-primary text-primary-foreground', size = 'md' }: { letter: string; color?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
  return (
    <div className={`${dim} rounded-md flex items-center justify-center font-bold shrink-0 ${color}`}>
      {letter}
    </div>
  );
}

function DelegatedTab({ items }: { items: DelegatedJob[] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Delegated Jobs</h3>
        <p className="text-sm text-muted-foreground">Jobs Screna's managed-apply workflow is handling on your behalf.</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Delegated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((job) => (
            <TableRow key={job.id} className="hover:bg-muted/30">
              <TableCell>
                <div className="flex items-center gap-3">
                  <CompanyAvatar letter={job.logoLetter} size="sm" />
                  <span className="font-medium text-foreground">{job.title}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{job.company}</TableCell>
              <TableCell className="text-muted-foreground">{job.location}</TableCell>
              <TableCell className="text-muted-foreground">{job.delegatedAgo}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                No delegated jobs. Hand a job to Screna to apply on your behalf.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export function JobApplyTab() {
  // Plan gate — Jobs is Premium-only. Pro (starter) and Free users see an
  // upgrade screen and never hit the onboarding flow.
  const { isElite, isLoading: isPlanLoading, planData } = useUserPlan();

  // Onboarding gate — premium users who haven't finished resume / preferences
  // / consent see a blocking screen that opens the wizard at the right step.
  const [onboardingState, setOnboardingState] =
    useState<'loading' | 'incomplete' | 'complete'>('loading');
  const [onboardingFlags, setOnboardingFlags] = useState({
    resume_uploaded: false,
    preferences_set: false,
    consent_agreed: false,
  });
  const [wizardOpen, setWizardOpen] = useState(false);

  const fetchOnboardingStatus = async () => {
    try {
      const res: any = await getOnboardingStatus();
      const data = res?.data?.data ?? {};
      setOnboardingFlags({
        resume_uploaded: !!data.resume_uploaded,
        preferences_set: !!data.preferences_set,
        consent_agreed: !!data.consent_agreed,
      });
      setOnboardingState(data.completed ? 'complete' : 'incomplete');
    } catch (e) {
      // Fail open so a flaky status endpoint doesn't lock paying users out.
      console.error('Failed to load onboarding status:', e);
      setOnboardingState('complete');
    }
  };

  useEffect(() => {
    if (isPlanLoading || !isElite) return;
    fetchOnboardingStatus();
  }, [isPlanLoading, isElite]);

  const wizardInitialStep: 1 | 2 | 3 = !onboardingFlags.resume_uploaded
    ? 1
    : !onboardingFlags.preferences_set
      ? 2
      : 3;

  const [activeTab, setActiveTab] = useState('search');

  // Matched-tab recommendations from /apply/candidates/recommendations
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [recsTotal, setRecsTotal] = useState(0);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsHasMore, setRecsHasMore] = useState(true);
  const recsScrollRef = useRef<HTMLDivElement>(null);
  const recsInitRef = useRef(false);

  const fetchRecs = async (offset: number) => {
    setRecsLoading(true);
    try {
      const res: any = await JobService.getRecommendations({ offset });
      const items: any[] = res?.data?.data?.items ?? [];
      const total: number = res?.data?.data?.total ?? 0;
      setRecsTotal(total);
      const mapped = items.map(mapRecToJob);
      if (offset === 0) {
        setRecommendedJobs(mapped);
        setRecsHasMore(mapped.length < total);
      } else {
        setRecommendedJobs(prev => {
          const next = [...prev, ...mapped];
          setRecsHasMore(next.length < total);
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to load job recommendations:', e);
    } finally {
      setRecsLoading(false);
    }
  };

  useEffect(() => {
    if (onboardingState !== 'complete') return;
    if (recsInitRef.current) return;
    recsInitRef.current = true;
    fetchRecs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingState]);

  const handleRecsScroll = () => {
    const el = recsScrollRef.current;
    if (!el || recsLoading || !recsHasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      fetchRecs(recommendedJobs.length);
    }
  };

  const [timeframe, setTimeframe] = useState('Last 7 Days');
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const timeframeRef = useRef<HTMLDivElement>(null);

  const [isDelegateUpgradeOpen, setIsDelegateUpgradeOpen] = useState(false);

  const [delegatedJobsState, setDelegatedJobsState] = useState<DelegatedJob[]>([]);
  const [profileTargetRoles, setProfileTargetRoles] = useState<string[]>([]);
  const appsInitRef = useRef(false);
  const profileRolesInitRef = useRef(false);

  const fetchApplications = async () => {
    try {
      const res: any = await JobService.getApplications({ offset: 0 });
      const items: any[] = res?.data?.data?.items ?? [];
      const queuedOrInProgress: any[] = items.filter(a => {
        const s = (a.status || '').toUpperCase().replace('-', '_');
        return s === 'QUEUED' || s === 'IN_PROGRESS' || s === 'INPROGRESS';
      });
      setDelegatedJobsState(queuedOrInProgress.map(mapAppToDelegated));
    } catch (e) {
      console.error('Failed to load applications:', e);
    }
  };

  useEffect(() => {
    if (onboardingState !== 'complete') return;
    if (appsInitRef.current) return;
    appsInitRef.current = true;
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingState]);

  useEffect(() => {
    if (onboardingState !== 'complete') return;
    if (profileRolesInitRef.current) return;
    profileRolesInitRef.current = true;
    (async () => {
      try {
        const res: any = await getProfilePreferences();
        const data = res?.data?.data ?? res?.data;
        const roles = Array.isArray(data?.target_roles) ? data.target_roles : [];
        setProfileTargetRoles(roles);
      } catch (e) {
        console.error('Failed to load profile target roles:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingState]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (timeframeRef.current && !timeframeRef.current.contains(e.target as Node)) setIsTimeframeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [delegatingIds, setDelegatingIds] = useState<Set<string>>(new Set());

  const handleDelegateClick = async (job: Job) => {
    if (!job?.id) return;
    const recId = job.id;
    if (delegatingIds.has(recId)) return;
    const recTitle = job.title;
    const recCompany = job.company;
    setDelegatingIds(prev => {
      const n = new Set(prev);
      n.add(recId);
      return n;
    });
    try {
      await JobService.acceptRecommendation(recId);
      setRecommendedJobs(prev => prev.filter(j => j.id !== recId));
      await fetchApplications();
      setActiveTab('delegated');
      toast.success('Job delegated successfully!', {
        description: `${recTitle} at ${recCompany} has been sent to your advisor.`,
        duration: 4000,
      });
    } catch (e: any) {
      if (e?.response?.status === 403 || e?.response?.status === 402) {
        setIsDelegateUpgradeOpen(true);
      } else {
        toast.error('Failed to delegate job', {
          description: e?.response?.data?.message || 'Please try again later.',
        });
      }
    } finally {
      setDelegatingIds(prev => {
        const n = new Set(prev);
        n.delete(recId);
        return n;
      });
    }
  };

  const handleRejectRec = async (recId: string) => {
    setRecommendedJobs(prev => prev.filter(j => j.id !== recId));
    try {
      await JobService.rejectRecommendation(recId);
    } catch (e) {
      console.error('Failed to reject recommendation:', e);
      toast.error('Failed to dismiss', { description: 'Please try again.' });
    }
  };

  if (isPlanLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-220px)] min-h-[600px] text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Loading your Jobs workspace…
      </div>
    );
  }

  if (!isElite) {
    const planLabel =
      planData.currentPlan === 'Pro'
        ? 'Starter'
        : planData.currentPlan === 'Free'
          ? 'Free'
          : planData.currentPlan;
    return (
      <div className="flex items-center justify-center h-[calc(100vh-220px)] min-h-[600px]">
        <div className="max-w-md w-full text-center px-6">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Jobs is a Premium feature
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Managed Apply &mdash; the workspace that submits applications to
            matched roles on your behalf &mdash; is included with Screna
            Premium. Your current plan is{' '}
            <span className="font-medium text-slate-900">{planLabel}</span>.
          </p>
          <Link to="/pricing">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              View Premium plans
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (onboardingState === 'loading') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-220px)] min-h-[600px] text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Loading your Jobs workspace…
      </div>
    );
  }

  if (onboardingState === 'incomplete') {
    const missingResume = !onboardingFlags.resume_uploaded;
    const missingPrefs = !onboardingFlags.preferences_set;
    const missingConsent = !onboardingFlags.consent_agreed;
    return (
      <>
        <div className="flex items-center justify-center h-[calc(100vh-220px)] min-h-[600px]">
          <div className="max-w-md w-full text-center px-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Finish your Premium setup
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              Before you can use the Jobs workspace, please complete the steps
              below so Screna can submit applications on your behalf.
            </p>
            <ul className="text-sm text-slate-700 text-left rounded-lg border border-slate-200 bg-slate-50 p-4 mb-6 space-y-2">
              <li className="flex items-center gap-2">
                {onboardingFlags.resume_uploaded ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className={missingResume ? 'text-slate-900' : 'text-slate-500 line-through'}>
                  Upload your resume
                </span>
              </li>
              <li className="flex items-center gap-2">
                {onboardingFlags.preferences_set ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className={missingPrefs ? 'text-slate-900' : 'text-slate-500 line-through'}>
                  Set your personal info &amp; job preferences
                </span>
              </li>
              <li className="flex items-center gap-2">
                {onboardingFlags.consent_agreed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className={missingConsent ? 'text-slate-900' : 'text-slate-500 line-through'}>
                  Sign the required consents
                </span>
              </li>
            </ul>
            <Button
              onClick={() => setWizardOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continue onboarding
            </Button>
          </div>
        </div>
        <PremiumOnboardingWizard
          open={wizardOpen}
          onCancel={() => setWizardOpen(false)}
          onComplete={async () => {
            setWizardOpen(false);
            await fetchOnboardingStatus();
          }}
          initialStep={wizardInitialStep}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[600px]">
      {/* Top Tabs */}
      <div className="flex items-center gap-0.5 pb-3 px-0">
        {['Search', 'Delegated', 'Application Profile'].map((tab) => {
          const id = tab.toLowerCase().replace(/ /g, '-');
          const isActive = activeTab === id;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(id)}
              style={{ fontWeight: isActive ? 500 : 400 }}
              className={`px-3.5 py-1.5 rounded-md text-sm transition-all duration-150 select-none ${
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab === 'Search' ? 'Matched' : tab}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 pt-4 overflow-y-auto">
        {activeTab === 'search' && (
          <>
            {/* Top Controls Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-muted-foreground shrink-0">Showing Results For</span>
                <div className="flex items-center flex-wrap gap-1.5">
                  {profileTargetRoles.length === 0 ? (
                    <span className="text-sm text-muted-foreground italic">No target role set in profile</span>
                  ) : (
                    profileTargetRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20 font-medium"
                      >
                        {role}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="relative" ref={timeframeRef}>
                <button
                  onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
                  className="flex items-center gap-2 text-sm text-foreground bg-white border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors" style={{ fontWeight: 500 }}
                >
                  {timeframe}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isTimeframeOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTimeframeOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-md shadow-md py-1 z-10 overflow-hidden">
                    {['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'All Time'].map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setTimeframe(option);
                          setIsTimeframeOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                          timeframe === option ? 'bg-primary/5 text-primary font-medium' : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {option}
                        {timeframe === option && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Single Column List */}
            <div
              ref={recsScrollRef}
              onScroll={handleRecsScroll}
              className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-2 custom-scrollbar"
            >
              {recommendedJobs.length === 0 && recsLoading && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Loading recommendations…
                </div>
              )}
              {recommendedJobs.length === 0 && !recsLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Briefcase className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No matched jobs yet. Check back soon.</p>
                </div>
              )}
              {recommendedJobs.map((job) => (
                <div
                  key={job.id}
                  className="relative group p-4 rounded-xl border border-border bg-card hover:border-border/80 hover:shadow-sm transition-all flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center font-bold text-lg shrink-0 ${job.logoColor}`}>
                    {job.logoLetter}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{job.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{job.company}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </span>
                      )}
                      {job.timeAgo && (
                        <span className="whitespace-nowrap">{job.timeAgo}</span>
                      )}
                      {job.matchScore > 0 && (
                        <Badge variant={job.matchScore >= 90 ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {job.matchScore}% Match
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => handleRejectRec(job.id)}
                      disabled={delegatingIds.has(job.id)}
                      className="px-4 font-medium gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-transparent hover:text-muted-foreground hover:border-border disabled:cursor-not-allowed"
                      style={{ fontWeight: 500 }}
                    >
                      <X className="w-3.5 h-3.5" />
                      Not Interested
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDelegateClick(job)}
                      disabled={delegatingIds.has(job.id)}
                      className={`px-5 font-medium gap-1.5 transition-opacity border-primary/40 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/60 disabled:cursor-not-allowed ${
                        delegatingIds.has(job.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      style={{ fontWeight: 500 }}
                    >
                      {delegatingIds.has(job.id) ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Delegating…
                        </>
                      ) : (
                        <>
                          <SendHorizonal className="w-3.5 h-3.5" />
                          Delegate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              {recsLoading && recommendedJobs.length > 0 && (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                  Loading more…
                </div>
              )}
              {!recsHasMore && recommendedJobs.length > 0 && (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                  You've reached the end.
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'delegated' && (
          <>
            <div className="mx-1 mb-4 px-4 py-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>Delegation Progress</span>
                <span className="text-sm tabular-nums" style={{ fontWeight: 700 }}>
                  <span className="text-primary">{delegatedJobsState.length}</span>
                  <span className="text-muted-foreground" style={{ fontWeight: 400 }}> / {recsTotal}</span>
                </span>
              </div>
              <div className="w-full h-[9px] rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${recsTotal > 0 ? Math.min(100, (delegatedJobsState.length / recsTotal) * 100) : 0}%`,
                    background: 'linear-gradient(90deg, var(--color-primary) 0%, #6fa4fa 100%)',
                  }}
                />
              </div>
            </div>
            <DelegatedTab items={delegatedJobsState} />
          </>
        )}

        {activeTab === 'application-profile' && (
          <ApplicationProfileContent />
        )}
      </div>

      {/* Delegate Upgrade Modal */}
      <Dialog open={isDelegateUpgradeOpen} onOpenChange={setIsDelegateUpgradeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <SendHorizonal className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle style={{ fontWeight: 600 }} className="text-foreground">
              Unlock Job Delegation
            </DialogTitle>
            <DialogDescription className="pt-1 leading-relaxed">
              Job delegation is a <span className="font-semibold text-foreground">Premium</span> feature. Upgrade to have your dedicated advisor apply on your behalf — directly to recruiters.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded-xl border border-border bg-muted/40 p-4 space-y-2">
            {[
              'Dedicated 1:1 job search advisor',
              'Auto-apply to matched roles',
              'Resume submission & recruiter outreach',
              'Daily application updates',
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-foreground" style={{ fontWeight: 400 }}>{benefit}</span>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-4 flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              style={{ fontWeight: 500 }}
              onClick={() => setIsDelegateUpgradeOpen(false)}
            >
              
              Upgrade to Premium
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:bg-muted hover:text-muted-foreground"
              style={{ fontWeight: 400 }}
              onClick={() => setIsDelegateUpgradeOpen(false)}
            >
              Maybe later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
