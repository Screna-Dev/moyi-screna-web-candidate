import { useState, useRef, useEffect } from 'react';
import {
  Search, Bookmark, CheckCircle2, ChevronDown, Clock,
  MapPin, DollarSign, Building2, MoreVertical, Pencil,
  Sparkles, FileText, MessageSquare, Zap, Target, Send,
  ChevronUp, User, Globe, Eye, Download, Plus, Trash2,
  XCircle, RotateCcw, Bot, Star, Archive, Copy, Upload,
  Briefcase, X, ChevronRight, Lock, BarChart2, RefreshCw, Loader2
} from 'lucide-react';
import { JobService, ProfileService } from '@/services';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from './ui/sheet';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from './ui/accordion';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './ui/table';

// ─── Data Models ───────────────────────────────────────────────────────────
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
};

const JOB_RECOMMENDATIONS: Job[] = [
  {
    id: '1',
    company: 'Stripe',
    logoLetter: 'S',
    logoColor: 'bg-primary text-primary-foreground',
    title: 'Senior Product Manager, Billing',
    location: 'San Francisco, CA (Hybrid)',
    timeAgo: '2 hours ago',
    matchScore: 94,
    type: 'Full-time',
    remoteType: 'Hybrid',
    years: '5+ years',
    salary: '$180k - $240k',
    isPositiveMatch: true,
    description: `We are looking for a Senior Product Manager to lead the Billing platform team. You will be responsible for defining the product vision, strategy, and roadmap for Stripe's core billing infrastructure used by millions of businesses.

Responsibilities:
- Define and execute the product strategy for Stripe Billing
- Collaborate closely with engineering, design, and go-to-market teams
- Talk to users constantly to understand their needs and pain points
- Drive product launches and measure impact
- Mentor other product managers and help build the product team

Requirements:
- 5+ years of product management experience
- Experience building complex platform products or APIs
- Strong technical background and ability to work with engineers
- Excellent communication and leadership skills
- Customer-centric mindset and strong empathy for developers`,
    skills: ['Product Management', 'API Design', 'Go-To-Market Strategy', 'User Feedback', 'Customer Value'],
    positiveSkills: ['Product Management', 'Go-To-Market Strategy'],
  },
  {
    id: '2',
    company: 'Notion',
    logoLetter: 'N',
    logoColor: 'bg-primary text-primary-foreground',
    title: 'Product Manager, Collaboration',
    location: 'New York, NY (Remote)',
    timeAgo: '13 hours ago',
    matchScore: 88,
    type: 'Full-time',
    remoteType: 'Remote',
    years: '4+ years',
    salary: '$160k - $210k',
    isPositiveMatch: true,
    description: `Notion is looking for a Product Manager to lead our real-time collaboration features. You will work on multiplayer editing, comments, mentions, and notifications to make Notion the best place for teams to work together.`,
    skills: ['Collaboration', 'UX Design', 'Prototyping', 'Product Growth'],
    positiveSkills: ['Collaboration', 'Prototyping'],
  },
  {
    id: '3',
    company: 'Linear',
    logoLetter: 'L',
    logoColor: 'bg-primary text-primary-foreground',
    title: 'Product Manager',
    location: 'Remote (US)',
    timeAgo: '1 day ago',
    matchScore: 82,
    type: 'Full-time',
    remoteType: 'Remote',
    years: '3+ years',
    salary: '$150k - $190k',
    isPositiveMatch: false,
    description: `Help us build the next generation of issue tracking and project management tools. You will focus on improving the core workflow for engineering and product teams.`,
    skills: ['Product Management', 'Engineering Tools', 'Agile'],
    positiveSkills: ['Product Management'],
  },
];

// ─── API Types & Helpers ──────────────────────────────────────────────────
type ApiJob = {
  score: number;
  id: string;
  url: string;
  job_title: string;
  job_description: string;
  job_description_formatted: string;
  job_type: string[];
  company_name: string;
  company_url: string;
  apply_link: string;
  posted_date: string;
  location: string;
  source: string;
};

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function mapApiJobToJob(apiJob: ApiJob): Job {
  const letter = (apiJob.company_name || 'J')[0].toUpperCase();
  const score = Math.round((apiJob.score || 0) * 100);
  return {
    id: apiJob.id,
    company: apiJob.company_name || '',
    logoLetter: letter,
    logoColor: 'bg-primary text-primary-foreground',
    title: apiJob.job_title || '',
    location: apiJob.location || '',
    timeAgo: apiJob.posted_date ? formatRelativeDate(apiJob.posted_date) : '',
    matchScore: score,
    type: apiJob.job_type?.[0] || 'Full-time',
    remoteType: (apiJob.location || '').toLowerCase().includes('remote') ? 'Remote' : 'On-site',
    years: '',
    salary: '',
    isPositiveMatch: score >= 70,
    description: apiJob.job_description_formatted || apiJob.job_description || '',
    skills: [],
    positiveSkills: [],
  };
}

type SavedJob = { id: string; title: string; company: string; logoLetter: string; location: string; savedAgo: string; };
type DeletedSavedJob = SavedJob & { trashedAgo: string };
const SAVED_JOBS: SavedJob[] = [
  { id: 's1', title: 'Senior Product Manager, Billing', company: 'Stripe', logoLetter: 'S', location: 'San Francisco, CA', savedAgo: '3 days ago' },
  { id: 's2', title: 'Product Manager, Collaboration', company: 'Notion', logoLetter: 'N', location: 'New York, NY', savedAgo: '1 week ago' },
  { id: 's3', title: 'Staff PM, Platform', company: 'Linear', logoLetter: 'L', location: 'Remote (US)', savedAgo: '2 weeks ago' },
];

type DelegatedJob = { id: string; title: string; company: string; logoLetter: string; location: string; delegatedAgo: string; status: 'Queued' | 'In Progress' | 'Submitted'; };
const DELEGATED_JOBS: DelegatedJob[] = [
  { id: 'd1', title: 'Director of Product', company: 'Figma', logoLetter: 'F', location: 'San Francisco, CA', delegatedAgo: '5 hours ago', status: 'In Progress' },
  { id: 'd2', title: 'Group PM, Growth', company: 'Vercel', logoLetter: 'V', location: 'Remote', delegatedAgo: '1 day ago', status: 'Submitted' },
  { id: 'd3', title: 'Senior PM, Payments', company: 'Square', logoLetter: 'S', location: 'Atlanta, GA', delegatedAgo: '2 days ago', status: 'Queued' },
];

type AppliedJob = { id: string; title: string; company: string; logoLetter: string; location: string; appliedAgo: string; appliedBy: 'Yourself' | 'Assistant'; };
const APPLIED_JOBS_INITIAL: AppliedJob[] = [
  { id: 'a1', title: 'Senior Product Manager', company: 'Airbnb', logoLetter: 'A', location: 'San Francisco, CA', appliedAgo: '4 seconds ago', appliedBy: 'Yourself' },
  { id: 'a2', title: 'Product Manager, Trust', company: 'Coinbase', logoLetter: 'C', location: 'Remote', appliedAgo: '2 days ago', appliedBy: 'Assistant' },
  { id: 'a3', title: 'Lead PM, Growth', company: 'Discord', logoLetter: 'D', location: 'San Francisco, CA', appliedAgo: '5 days ago', appliedBy: 'Yourself' },
];

// ─── Job Search Filters Data ──────────────────────────────────────────────
type JobFilter = {
  id: string;
  name: string;
  isDefault: boolean;
  isArchived: boolean;
  targetTitles: string[];
  locations: string[];
  remote: boolean;
  resume: { name: string; uploadedAgo: string } | null;
  coverLetter: { name: string; uploadedAgo: string } | null;
  skills: string[];
  salaryMin: number;
  salaryMax: number;
  jobTypes: string[];
};

const FILTERS_INITIAL: JobFilter[] = [
  {
    id: 'f1',
    name: 'Senior Product Manager — US',
    isDefault: true,
    isArchived: false,
    targetTitles: ['Senior Product Manager', 'Group Product Manager', 'Lead PM'],
    locations: ['United States'],
    remote: true,
    resume: { name: 'PM_Resume_2026.pdf', uploadedAgo: '3 days ago' },
    coverLetter: { name: 'PM_CoverLetter.pdf', uploadedAgo: '1 week ago' },
    skills: ['Product Strategy', 'API Design', 'Go-To-Market'],
    salaryMin: 180,
    salaryMax: 240,
    jobTypes: ['Full-time'],
  },
  {
    id: 'f2',
    name: 'Staff PM, Platform',
    isDefault: false,
    isArchived: false,
    targetTitles: ['Staff Product Manager', 'Principal PM, Platform'],
    locations: ['San Francisco, CA', 'New York, NY'],
    remote: false,
    resume: { name: 'Platform_PM_Resume.pdf', uploadedAgo: '1 week ago' },
    coverLetter: null,
    skills: ['Platform Products', 'Developer Tools'],
    salaryMin: 220,
    salaryMax: 300,
    jobTypes: ['Full-time'],
  },
  {
    id: 'f3',
    name: 'Design-Adjacent PM',
    isDefault: false,
    isArchived: true,
    targetTitles: ['Product Designer', 'Design PM'],
    locations: ['Remote'],
    remote: true,
    resume: null,
    coverLetter: null,
    skills: ['Design Systems', 'UX Research'],
    salaryMin: 150,
    salaryMax: 210,
    jobTypes: ['Full-time', 'Contract'],
  },
];

const ROLE_CATEGORIES: { category: string; titles: string[] }[] = [
  { category: 'Product', titles: ['Product Manager', 'Senior Product Manager', 'Group PM', 'Staff PM', 'Director of Product'] },
  { category: 'Engineering', titles: ['Software Engineer', 'Senior Engineer', 'Staff Engineer', 'Engineering Manager'] },
  { category: 'Design', titles: ['Product Designer', 'Senior Product Designer', 'Design Lead'] },
  { category: 'Data', titles: ['Data Scientist', 'Data Analyst', 'ML Engineer'] },
];

// ─── Reusable Pieces ───────────────────────────────────────────────────────
function CompanyAvatar({ letter, color = 'bg-primary text-primary-foreground', size = 'md' }: { letter: string; color?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
  return (
    <div className={`${dim} rounded-md flex items-center justify-center font-bold shrink-0 ${color}`}>
      {letter}
    </div>
  );
}

function KebabMenu({
  items,
}: {
  items: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; destructive?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen((v) => !v)}>
        <MoreVertical className="w-4 h-4" />
      </Button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-md shadow-md py-1 z-20">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                item.destructive
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TableActionsHeader({ title, subtitle, onAdd, onExport }: { title: string; subtitle: string; onAdd: () => void; onExport: () => void }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
        <Button size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

// ─── Job Detail Panel (used in Search + Detail Dialog) ────────────────────
function JobDetailPanel({
  job,
  onApplyClick,
  showKebab = true,
  aiInput,
  setAiInput,
  isCommentsOpen,
  setIsCommentsOpen,
}: {
  job: Job;
  onApplyClick?: () => void;
  showKebab?: boolean;
  aiInput: string;
  setAiInput: (v: string) => void;
  isCommentsOpen: boolean;
  setIsCommentsOpen: (v: boolean) => void;
}) {
  const [isKebabOpen, setIsKebabOpen] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const kebabRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) setIsKebabOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-border shrink-0">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${job.logoColor}`}>
              {job.logoLetter}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-0.5">{job.title}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{job.company}</span>
                <span>•</span>
                <span>{job.location}</span>
              </div>
            </div>
          </div>
          {onApplyClick && (
            <div className="flex items-center gap-2">
              <Button onClick={onApplyClick} className="px-6 font-medium">Apply</Button>
              {showKebab && (
                <div className="relative" ref={kebabRef}>
                  <Button variant="outline" size="icon" onClick={() => setIsKebabOpen(!isKebabOpen)}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                  {isKebabOpen && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-md shadow-md py-1 z-10">
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                        <Bookmark className="w-4 h-4" /> Move to Saved
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                        <CheckCircle2 className="w-4 h-4" /> Mark as Applied
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                        <User className="w-4 h-4" /> Delegate
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-3 text-xs mb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span className="text-foreground">{job.type}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="w-3.5 h-3.5" />
            <span className="text-foreground">{job.remoteType}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-foreground">{job.years}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-foreground">{job.salary}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-muted/40 rounded-md px-3 py-1.5">
          <Target className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Profile Used:</span>
          <span className="font-medium text-foreground">Senior Product Manager, United States</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="mb-6">
          <h4 className="text-[11px] font-semibold text-foreground mb-2 uppercase tracking-wider">Required Skills</h4>
          <div className="flex flex-wrap gap-1.5">
            {job.skills.map((skill, i) => {
              const isPositive = job.positiveSkills.includes(skill);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${
                    isPositive
                      ? 'bg-green-500/10 text-green-700 border-green-500/20'
                      : 'bg-muted/50 text-muted-foreground border-border'
                  }`}
                >
                  {skill}
                  {isPositive && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wider">AI Job Assistant</h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Zap, title: 'Match Score', desc: 'Detailed breakdown', cta: 'View Analysis', onClick: () => setShowMatchModal(true) },
              { icon: MessageSquare, title: 'Practice for this job', desc: 'Interview prep', cta: 'Practice Now', onClick: () => {} },
            ].map((card, i) => (
              <div key={i} onClick={card.onClick} className="bg-muted/30 border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer group flex flex-col">
                <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center mb-2 shadow-sm border border-border">
                  <card.icon className="w-4 h-4 text-primary" />
                </div>
                <h5 className="font-medium text-foreground text-xs mb-0.5">{card.title}</h5>
                <p className="text-[11px] text-muted-foreground mb-2 flex-1">{card.desc}</p>
                <span className="text-[11px] font-medium text-primary group-hover:underline mt-auto">{card.cta}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 relative">
            
            
          </div>

          
        </div>

        <hr className="border-border my-6" />

        <div className="max-w-none mb-8">
          <h4 className="text-[11px] font-semibold text-foreground mb-2 uppercase tracking-wider">About the role</h4>
          <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {job.description}
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-background">
          <button
            onClick={() => setIsCommentsOpen(!isCommentsOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-xs text-foreground">Comments & Notes</span>
            <ChevronUp className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${!isCommentsOpen ? 'rotate-180' : ''}`} />
          </button>
          {isCommentsOpen && (
            <div className="p-3 border-t border-border">
              <textarea
                placeholder="Add personal notes or track your thoughts here..."
                className="w-full h-20 bg-transparent border-0 resize-none focus:ring-0 p-0 text-xs text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" variant="secondary">Save Note</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Fitment Analysis Modal ── */}
      <Dialog open={showMatchModal} onOpenChange={setShowMatchModal}>
        <DialogContent className="max-w-[640px] max-h-[88vh] overflow-y-auto p-0" aria-describedby={undefined}>
          <div className="p-8">

            {/* ── Section 1: Header ── */}
            <div className="flex items-start gap-6 mb-6">
              {/* Circular progress ring — 100px, 8px stroke */}
              <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
                <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="hsl(221 91% 60%)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42 * job.matchScore / 100} ${2 * Math.PI * 42}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-bold text-primary tabular-nums" style={{ fontSize: 24 }}>{job.matchScore}</span>
                  <span className="text-muted-foreground" style={{ fontSize: 11 }}>/100</span>
                </div>
              </div>

              {/* Text block */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <DialogTitle className="font-semibold text-foreground" style={{ fontSize: 20 }}>Fitment Analysis</DialogTitle>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle2 className="w-3 h-3" />
                    {job.matchScore >= 80 ? 'Strong Fit' : job.matchScore >= 60 ? 'Good Fit' : 'Partial Fit'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                  The candidate is a strong match for this role, possessing relevant experience and skills aligned with the job requirements. They meet key educational and skills criteria and are well-positioned for this position.
                </p>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Re-score
                </button>
              </div>
            </div>

            <div className="border-t border-border mb-6" />

            {/* ── Section 2: Score Breakdown ── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">Score Breakdown</h3>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-2">
                  {[
                    { label: 'Job Title Match',        icon: Target,    score: 10, max: 10 },
                    { label: 'Skills Match',            icon: Zap,       score: 20, max: 20 },
                    { label: 'Experience Level',        icon: Clock,     score: 10, max: 10 },
                    { label: 'Domain / Industry',       icon: Building2, score: 5,  max: 5  },
                    { label: 'Location / Work Setting', icon: MapPin,    score: 10, max: 10 },
                    { label: 'Additional Factors',      icon: Sparkles,  score: 15, max: 20 },
                    { label: 'Education',               icon: User,      score: 10, max: 10 },
                    { label: 'Date of Posting',         icon: Clock,     score: 5,  max: 5  },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between py-3 px-4 border-b border-border${i % 2 === 0 ? ' border-r border-border' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm tabular-nums ml-2 shrink-0">
                        <span className="font-semibold text-foreground">{item.score}</span>
                        <span className="text-muted-foreground">/ {item.max}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Custom Preferences — full width last row */}
                <div className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Custom Preferences</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm tabular-nums">
                    <span className="font-semibold text-foreground">10</span>
                    <span className="text-muted-foreground">/ 10</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border mb-6" />

            {/* ── Section 3: Skills Analysis ── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">Skills Analysis</h3>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" /> MATCHED
                  </span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                    {job.positiveSkills.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.positiveSkills.map((skill, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border border-green-200 bg-green-50 text-green-700">
                      <CheckCircle2 className="w-3 h-3" /> {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-border mb-6" />

            {/* ── Section 4: Experience ── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">Experience</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> REQUIRED
                  </p>
                  <p className="text-sm text-foreground font-medium">{job.title} experience ({job.years})</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" /> CANDIDATE
                  </p>
                  <p className="text-sm text-foreground font-medium">Relevant professional experience with demonstrated skills matching this role's requirements.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">Strong alignment with the technical domain and functional responsibilities.</p>
            </div>

            <div className="border-t border-border mb-6" />

            {/* ── Section 5: Role Alignment ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">Role Alignment</h3>
              </div>
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The candidate's background aligns closely with the responsibilities outlined for this {job.title} position at {job.company}. Their skills and experience trajectory make them a competitive applicant for this role.
                </p>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Add Application Modal ────────────────────────────────────────────────
function AddApplicationModal({
  open,
  onOpenChange,
  context = 'Saved',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context?: 'Saved' | 'Delegated' | 'Applied';
}) {
  const titles: Record<string, { title: string; description: string; cta: string }> = {
    Saved: { title: 'Save a Job', description: 'Enter the job details below to save it for later.', cta: 'Save Job' },
    Delegated: { title: 'Delegate an Application', description: 'Enter the job details below and Screna will apply on your behalf.', cta: 'Delegate Application' },
    Applied: { title: 'Add Application', description: 'Enter the job application details below.', cta: 'Add Application' },
  };
  const t = titles[context];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[Playfair_Display] text-xl">{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between bg-muted/40 border border-border rounded-md px-3 py-2 my-1">
          <div className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Showing Results For:</span>
            <span className="font-medium text-foreground">Senior Product Manager, United States</span>
          </div>
          <button className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Job Title</label>
            <Input placeholder="e.g. Senior Product Manager" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Company Name</label>
            <Input placeholder="e.g. Stripe" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Location</label>
            <Input placeholder="e.g. San Francisco, CA" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Description</label>
            <textarea
              placeholder="Paste or describe the role responsibilities..."
              className="w-full min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Apply Link</label>
            <Input placeholder="https://" />
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>{t.cta}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Job Detail Dialog (used by eye icon) ─────────────────────────────────
type DetailContext =
  | { kind: 'saved' }
  | { kind: 'delegated'; status: 'Queued' | 'In Progress' | 'Submitted' }
  | { kind: 'applied'; appliedBy: 'Yourself' | 'Assistant' };

function DetailContextBanner({ ctx }: { ctx?: DetailContext }) {
  if (!ctx) return null;
  if (ctx.kind === 'applied') {
    return (
      <div className="flex items-center gap-2 px-6 py-3 bg-muted/30 border-b border-border text-sm">
        <span className="text-muted-foreground">Applied by:</span>
        <AppliedByPill by={ctx.appliedBy} />
      </div>
    );
  }
  if (ctx.kind === 'delegated') {
    const style =
      ctx.status === 'Submitted'
        ? 'bg-green-500/10 text-green-700 border-green-500/20'
        : ctx.status === 'In Progress'
        ? 'bg-primary/10 text-primary border-primary/20'
        : 'bg-amber-500/10 text-amber-700 border-amber-500/20';
    return (
      <div className="flex items-center gap-2 px-6 py-3 bg-muted/30 border-b border-border text-sm">
        <Bot className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">Managed apply status:</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border uppercase tracking-wide ${style}`}>
          {ctx.status}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-6 py-3 bg-muted/30 border-b border-border text-sm">
      <Bookmark className="w-4 h-4 text-muted-foreground" />
      <span className="text-muted-foreground">Saved to revisit later</span>
    </div>
  );
}

function JobDetailDialog({
  open, onOpenChange, job, context,
}: { open: boolean; onOpenChange: (v: boolean) => void; job: Job | null; context?: DetailContext }) {
  const [aiInput, setAiInput] = useState('');
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);
  if (!job) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden h-[85vh] flex flex-col">
        <DialogTitle className="sr-only">{job.title}</DialogTitle>
        <DialogDescription className="sr-only">Job details for {job.title} at {job.company}</DialogDescription>
        <DetailContextBanner ctx={context} />
        <div className="flex-1 min-h-0">
          <JobDetailPanel
            job={job}
            aiInput={aiInput}
            setAiInput={setAiInput}
            isCommentsOpen={isCommentsOpen}
            setIsCommentsOpen={setIsCommentsOpen}
            showKebab={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Filter Editor Drawer ─────────────────────────────────────────────────
const EMPTY_FILTER: JobFilter = {
  id: '',
  name: '',
  isDefault: false,
  isArchived: false,
  targetTitles: [],
  locations: [],
  remote: true,
  resume: null,
  coverLetter: null,
  skills: [],
  salaryMin: 100,
  salaryMax: 200,
  jobTypes: ['Full-time'],
};

function FilterEditorDrawer({
  open, onOpenChange, mode, initial, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: 'create' | 'edit';
  initial: JobFilter | null;
  onSave: (filter: JobFilter) => void;
}) {
  const [draft, setDraft] = useState<JobFilter>(EMPTY_FILTER);
  const [titleQuery, setTitleQuery] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(initial ? { ...initial } : { ...EMPTY_FILTER, id: `f${Date.now()}` });
      setTitleQuery('');
    }
  }, [open, initial]);

  const addTitle = (t: string) => {
    if (!t.trim() || draft.targetTitles.includes(t)) return;
    setDraft({ ...draft, targetTitles: [...draft.targetTitles, t] });
    setTitleQuery('');
  };
  const removeTitle = (t: string) =>
    setDraft({ ...draft, targetTitles: draft.targetTitles.filter((x) => x !== t) });

  const addSkill = (s: string) => {
    if (!s.trim() || draft.skills.includes(s)) return;
    setDraft({ ...draft, skills: [...draft.skills, s] });
  };

  const filteredCategories = ROLE_CATEGORIES.map((c) => ({
    ...c,
    titles: c.titles.filter(
      (t) =>
        !draft.targetTitles.includes(t) &&
        (titleQuery === '' || t.toLowerCase().includes(titleQuery.toLowerCase())),
    ),
  })).filter((c) => c.titles.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border flex-row items-center justify-between space-y-0">
          <div>
            <SheetTitle className="font-[Playfair_Display] text-xl">
              {mode === 'edit' ? 'Edit Filter' : 'New Filter'}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {mode === 'edit'
                ? 'Update this filter to refine your job recommendations.'
                : 'Create a new filter to target a specific role and preferences.'}
            </SheetDescription>
          </div>
          <Button onClick={() => onSave(draft)} className="font-medium">
            {mode === 'edit' ? 'Update Filter' : 'Create Filter'}
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
          {/* 1. Basic Information */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-1">Basic Information</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Give your filter a clear, descriptive name so you can switch between profiles easily.
            </p>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Display Name</label>
            <Input
              placeholder="e.g. Senior Product Manager — US"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <label className="flex items-center gap-2 mt-3 text-sm text-foreground cursor-pointer">
              <Checkbox
                checked={draft.isDefault}
                onCheckedChange={(c) => setDraft({ ...draft, isDefault: !!c })}
              />
              Set as default profile
            </label>
          </section>

          {/* 2. Target Job Titles */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-1">Target Job Titles</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Add multiple related titles to broaden your search across similar roles.
            </p>
            {draft.targetTitles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {draft.targetTitles.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {t}
                    <button onClick={() => removeTitle(t)} className="hover:text-primary/70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search or add a job title..."
                className="pl-9"
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && titleQuery.trim()) {
                    e.preventDefault();
                    addTitle(titleQuery.trim());
                  }
                }}
              />
            </div>
            <div className="space-y-3">
              {filteredCategories.map((cat) => (
                <div key={cat.category}>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                    {cat.category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.titles.map((t) => (
                      <button
                        key={t}
                        onClick={() => addTitle(t)}
                        className="px-2.5 py-1 text-xs bg-background border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Documents */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-3">Documents</h4>

            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Base Resume</label>
            {draft.resume ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-background border border-border flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{draft.resume.name}</p>
                    <p className="text-xs text-muted-foreground">Uploaded {draft.resume.uploadedAgo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> View
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Replace
                  </Button>
                </div>
              </div>
            ) : (
              <button className="w-full flex flex-col items-center justify-center gap-1 p-6 mb-4 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Upload Resume</span>
                <span className="text-xs text-muted-foreground">PDF, DOCX up to 10MB</span>
              </button>
            )}

            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Base Cover Letter</label>
            {draft.coverLetter ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-background border border-border flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{draft.coverLetter.name}</p>
                    <p className="text-xs text-muted-foreground">Uploaded {draft.coverLetter.uploadedAgo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> View
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Replace
                  </Button>
                </div>
              </div>
            ) : (
              <button className="w-full flex flex-col items-center justify-center gap-1 p-6 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Upload Cover Letter</span>
                <span className="text-xs text-muted-foreground">PDF, DOCX up to 10MB</span>
              </button>
            )}
          </section>

          {/* 4-6. Collapsible sections */}
          <Accordion type="multiple" defaultValue={['skills']} className="space-y-2">
            <AccordionItem value="skills" className="border border-border rounded-lg px-4 bg-card">
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">Skills</AccordionTrigger>
              <AccordionContent className="pb-4">
                <p className="text-xs text-muted-foreground mb-3">Skills you want to highlight for this filter.</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {draft.skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
                    >
                      {s}
                      <button
                        onClick={() => setDraft({ ...draft, skills: draft.skills.filter((x) => x !== s) })}
                        className="hover:text-muted-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  placeholder="Type a skill and press Enter..."
                  onKeyDown={(e) => {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (e.key === 'Enter' && val) {
                      e.preventDefault();
                      addSkill(val);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="preferences" className="border border-border rounded-lg px-4 bg-card">
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">Job Preferences</AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Locations</label>
                  <Input
                    placeholder="e.g. United States, Remote"
                    value={draft.locations.join(', ')}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        locations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Remote-friendly</p>
                    <p className="text-xs text-muted-foreground">Include fully remote roles</p>
                  </div>
                  <Switch
                    checked={draft.remote}
                    onCheckedChange={(c) => setDraft({ ...draft, remote: c })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Salary Range (USD, thousands)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={draft.salaryMin}
                      onChange={(e) => setDraft({ ...draft, salaryMin: Number(e.target.value) })}
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                      type="number"
                      value={draft.salaryMax}
                      onChange={(e) => setDraft({ ...draft, salaryMax: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Job Types</label>
                  <div className="flex flex-wrap gap-2">
                    {['Full-time', 'Contract', 'Part-time', 'Internship'].map((t) => {
                      const active = draft.jobTypes.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              jobTypes: active ? draft.jobTypes.filter((x) => x !== t) : [...draft.jobTypes, t],
                            })
                          }
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-background text-muted-foreground border-border hover:text-foreground'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="advanced" className="border border-border rounded-lg px-4 bg-card">
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">Advanced Filters</AccordionTrigger>
              <AccordionContent className="pb-4 space-y-3">
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Exclude staffing agencies</p>
                    <p className="text-xs text-muted-foreground">Hide listings from third-party recruiters</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Hide companies you've applied to</p>
                    <p className="text-xs text-muted-foreground">Avoid duplicate suggestions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted/10 px-3 py-2 opacity-60">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Needs H1B Sponsorship</p>
                      <p className="text-xs text-muted-foreground">Filter for sponsorship-friendly employers</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    Coming soon
                  </span>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Filters Tab (Job Search Filters) ─────────────────────────────────────
function FiltersTab({
  filters, onEdit, onCreate, onSetDefault, onArchive, onDuplicate, onDelete,
}: {
  filters: JobFilter[];
  onEdit: (f: JobFilter) => void;
  onCreate: () => void;
  onSetDefault: (id: string) => void;
  onArchive: (id: string, archive: boolean) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const visible = filters.filter((f) => (showArchived ? f.isArchived : !f.isArchived));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground font-[Playfair_Display]">Job Search Filters</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Create and manage multiple job search filters to target different roles, each with its own preferences and attached resume.
          </p>
        </div>
        <Button onClick={onCreate} className="gap-1.5 font-medium">
          <Plus className="w-4 h-4" />
          New Filter
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            {showArchived ? 'No archived filters.' : 'No filters yet. Create one to start tailoring your job search.'}
          </p>
          {!showArchived && (
            <Button onClick={onCreate} className="gap-1.5">
              <Plus className="w-4 h-4" /> Create your first filter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((f) => (
            <div
              key={f.id}
              onClick={() => onEdit(f)}
              className="bg-card border border-border rounded-xl p-3.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{f.name}</h3>
                  {f.isDefault && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide shrink-0">
                      <Star className="w-2.5 h-2.5" /> Default
                    </span>
                  )}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <KebabMenu
                    items={[
                      { label: 'Edit Filter', icon: Pencil, onClick: () => onEdit(f) },
                      { label: f.isDefault ? 'Default' : 'Set as Default', icon: Star, onClick: () => onSetDefault(f.id) },
                      { label: 'Duplicate', icon: Copy, onClick: () => onDuplicate(f.id) },
                      { label: f.isArchived ? 'Unarchive' : 'Archive', icon: Archive, onClick: () => onArchive(f.id, !f.isArchived) },
                      { label: 'Delete', icon: Trash2, onClick: () => onDelete(f.id), destructive: true },
                    ]}
                  />
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <Briefcase className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="text-foreground line-clamp-1">
                    {f.targetTitles.length > 0 ? f.targetTitles.join(', ') : <span className="text-muted-foreground italic">No target titles set</span>}
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="text-foreground line-clamp-1">
                    {f.locations.length > 0 ? f.locations.join(', ') : <span className="text-muted-foreground italic">Any location</span>}
                    {f.remote && <span className="text-muted-foreground"> · Remote OK</span>}
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="text-foreground truncate">
                    {f.resume ? f.resume.name : <span className="text-muted-foreground italic">No resume attached</span>}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end mt-2 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Edit Filter <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
        <label htmlFor="show-archived" className="text-sm text-muted-foreground cursor-pointer">Show Archived</label>
      </div>
    </div>
  );
}

// ─── Filter Switcher Dropdown (Search tab) ────────────────────────────────
function FilterSwitcher({
  filters, activeId, onSelect, onEdit, onCreate,
}: {
  filters: JobFilter[];
  activeId: string;
  onSelect: (id: string) => void;
  onEdit: (f: JobFilter) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const active = filters.find((f) => f.id === activeId);
  const visibleFilters = filters.filter((f) => !f.isArchived);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors group"
      >
        <span className="text-sm font-medium text-foreground">
          {active?.name || 'Choose a profile'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[360px] bg-card border border-border rounded-lg shadow-md z-20 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-foreground">Choose the job profile to search jobs for</p>
          </div>
          <div className="max-h-[360px] overflow-y-auto py-1">
            {visibleFilters.map((f) => {
              const isActive = f.id === activeId;
              return (
                <div
                  key={f.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onSelect(f.id); setOpen(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onSelect(f.id); setOpen(false); } }}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors group cursor-pointer ${
                    isActive ? 'bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    isActive ? 'border-primary bg-primary' : 'border-border'
                  }`}>
                    {isActive && <CheckCircle2 className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : 'text-foreground'}`}>
                        {f.name}
                      </span>
                      {f.isDefault && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[9px] font-medium bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide shrink-0">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {f.targetTitles.slice(0, 2).join(', ') || 'No titles'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {f.locations.join(', ') || 'Any location'}{f.remote ? ' · Remote OK' : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      onEdit(f);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
            className="w-full px-3 py-2.5 border-t border-border flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Job Profile
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Profile Title Switcher (Search tab) ─────────────────────────────────
function ProfileTitleSwitcher({
  titles,
  activeTitle,
  onSelect,
  isLoading,
}: {
  titles: string[];
  activeTitle: string;
  onSelect: (title: string) => void;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading || titles.length === 0}
        className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        ) : (
          <span className="text-sm font-medium text-foreground">
            {activeTitle || 'No title found'}
          </span>
        )}
        {!isLoading && titles.length > 1 && (
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && titles.length > 1 && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-lg shadow-md z-20 overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground">Job titles from your profile</p>
          </div>
          <div className="py-1">
            {titles.map((title) => {
              const isActive = title === activeTitle;
              return (
                <button
                  key={title}
                  onClick={() => { onSelect(title); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    isActive ? 'bg-primary/5 text-foreground font-medium' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    isActive ? 'border-primary bg-primary' : 'border-border'
                  }`}>
                    {isActive && <CheckCircle2 className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                  </div>
                  {title}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Saved / Delegated / Applied Tabs ─────────────────────────────────────
function SavedTab({ onView, onAdd, onTrash }: { onView: (job: Job, ctx: DetailContext) => void; onAdd: () => void; onTrash: (jobs: SavedJob[]) => void }) {
  const [items, setItems] = useState(SAVED_JOBS);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleDelegate = (id: string) => setItems((prev) => prev.filter((j) => j.id !== id));
  const handleMarkApplied = (id: string) => setItems((prev) => prev.filter((j) => j.id !== id));
  const handleTrash = (id: string) => {
    const job = items.find((j) => j.id === id);
    if (job) onTrash([job]);
    setItems((prev) => prev.filter((j) => j.id !== id));
  };

  const handleBulkDelegate = () => { setItems((prev) => prev.filter((j) => !selected.has(j.id))); clearSelection(); };
  const handleBulkMarkApplied = () => { setItems((prev) => prev.filter((j) => !selected.has(j.id))); clearSelection(); };
  const handleBulkTrash = () => {
    const toTrash = items.filter((j) => selected.has(j.id));
    onTrash(toTrash);
    setItems((prev) => prev.filter((j) => !selected.has(j.id)));
    clearSelection();
  };

  const isBulk = selected.size > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <TableActionsHeader
        title="Saved Jobs"
        subtitle="Jobs you've bookmarked from Search to revisit later."
        onAdd={onAdd}
        onExport={() => {}}
      />

      {/* ── Bulk action bar ── */}
      {isBulk && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-lg bg-primary/5 border border-primary/15">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-medium text-foreground tabular-nums">{selected.size} selected</span>
            <span className="text-border select-none mx-0.5">·</span>
            <button onClick={clearSelection} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleBulkDelegate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-muted/60 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Delegate
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={handleBulkMarkApplied}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-muted/60 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
              Mark as Applied
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={handleBulkTrash}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Move to Trash
            </button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Saved</TableHead>
            <TableHead className="text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((job) => (
            <TableRow key={job.id} className={selected.has(job.id) ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/30'}>
              <TableCell>
                <Checkbox checked={selected.has(job.id)} onCheckedChange={() => toggle(job.id)} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <CompanyAvatar letter={job.logoLetter} size="sm" />
                  <span className="font-medium text-foreground">{job.title}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{job.company}</TableCell>
              <TableCell className="text-muted-foreground">{job.location}</TableCell>
              <TableCell className="text-muted-foreground">{job.savedAgo}</TableCell>
              <TableCell className="text-right pr-2">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onView(JOB_RECOMMENDATIONS.find((j) => j.company === job.company) || JOB_RECOMMENDATIONS[0], { kind: 'saved' })}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <KebabMenu
                    items={[
                      { label: 'Delegate', icon: User, onClick: () => handleDelegate(job.id) },
                      { label: 'Mark as Applied', icon: CheckCircle2, onClick: () => handleMarkApplied(job.id) },
                      { label: 'Move to Trash', icon: Trash2, onClick: () => handleTrash(job.id), destructive: true },
                    ]}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                No saved jobs yet. Bookmark jobs from Search to see them here.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Deleted Saved Jobs Tab ────────────────────────────────────────────────
function DeletedSavedTab({
  items, onRestore, onView,
}: {
  items: DeletedSavedJob[];
  onRestore: (ids: string[]) => void;
  onView: (job: Job, ctx: DetailContext) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelection = () => setSelected(new Set());

  const handleRestoreOne = (id: string) => { onRestore([id]); setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; }); };
  const handleBulkRestore = () => { onRestore(Array.from(selected)); clearSelection(); };

  const isBulk = selected.size > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Deleted Jobs</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Previously saved jobs that were removed from your Saved list.</p>
      </div>

      {/* Bulk action bar */}
      {isBulk && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-lg bg-primary/5 border border-primary/15">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-medium text-foreground tabular-nums">{selected.size} selected</span>
            <span className="text-border select-none mx-0.5">·</span>
            <button onClick={clearSelection} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleBulkRestore}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-muted/60 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              Move to Saved
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Trash2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No deleted jobs</p>
          <p className="text-xs text-muted-foreground mt-1">Jobs you remove from Saved will appear here temporarily.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Trashed</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((job) => (
              <TableRow key={job.id} className={selected.has(job.id) ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/30'}>
                <TableCell>
                  <Checkbox checked={selected.has(job.id)} onCheckedChange={() => toggle(job.id)} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <CompanyAvatar letter={job.logoLetter} size="sm" />
                    <span className="font-medium text-foreground">{job.title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{job.company}</TableCell>
                <TableCell className="text-muted-foreground">{job.location}</TableCell>
                <TableCell className="text-muted-foreground">{job.trashedAgo}</TableCell>
                <TableCell className="text-right pr-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onView(JOB_RECOMMENDATIONS.find((j) => j.company === job.company) || JOB_RECOMMENDATIONS[0], { kind: 'saved' })}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <KebabMenu
                      items={[
                        { label: 'Move to Saved', icon: RotateCcw, onClick: () => handleRestoreOne(job.id) },
                      ]}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function DelegatedTab({ onView, onAdd }: { onView: (job: Job, ctx: DetailContext) => void; onAdd: () => void }) {
  const [items, setItems] = useState(DELEGATED_JOBS);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const clearSelection = () => setSelected(new Set());
  const handleBulkMarkApplied = () => { setItems((prev) => prev.filter((j) => !selected.has(j.id))); clearSelection(); };
  const handleBulkCancel = () => { setItems((prev) => prev.filter((j) => !selected.has(j.id))); clearSelection(); };
  const isBulk = selected.size > 0;

  const statusStyle = (s: DelegatedJob['status']) => {
    if (s === 'Submitted') return 'bg-green-500/10 text-green-700 border-green-500/20';
    if (s === 'In Progress') return 'bg-primary/10 text-primary border-primary/20';
    return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <TableActionsHeader
        title="Delegated Jobs"
        subtitle="Jobs Screna's managed-apply workflow is handling on your behalf."
        onAdd={onAdd}
        onExport={() => {}}
      />

      {/* ── Bulk action bar ── */}
      {isBulk && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-lg bg-primary/5 border border-primary/15">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-medium text-foreground tabular-nums">{selected.size} selected</span>
            <span className="text-border select-none mx-0.5">·</span>
            <button onClick={clearSelection} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleBulkMarkApplied}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-muted/60 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
              Mark as Applied
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={handleBulkCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Delegation
            </button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Delegated</TableHead>
            <TableHead className="text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((job) => (
            <TableRow key={job.id} className={selected.has(job.id) ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/30'}>
              <TableCell>
                <Checkbox checked={selected.has(job.id)} onCheckedChange={() => toggle(job.id)} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <CompanyAvatar letter={job.logoLetter} size="sm" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{job.title}</span>
                    
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{job.company}</TableCell>
              <TableCell className="text-muted-foreground">{job.location}</TableCell>
              <TableCell className="text-muted-foreground">{job.delegatedAgo}</TableCell>
              <TableCell className="text-right pr-2">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onView(JOB_RECOMMENDATIONS.find((j) => j.company === job.company) || JOB_RECOMMENDATIONS[0], { kind: 'delegated', status: job.status })}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <KebabMenu
                    items={[
                      { label: 'Mark as Applied', icon: CheckCircle2, onClick: () => setItems((p) => p.filter((j) => j.id !== job.id)) },
                      { label: 'Retry Delegation', icon: RotateCcw, onClick: () => {} },
                      { label: 'Cancel Delegation', icon: XCircle, onClick: () => setItems((p) => p.filter((j) => j.id !== job.id)), destructive: true },
                    ]}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                No delegated jobs. Hand a job to Screna to apply on your behalf.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function AppliedByPill({ by }: { by: 'Yourself' | 'Assistant' }) {
  if (by === 'Assistant') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
        <Bot className="w-3 h-3" />
        Assistant
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border">
      <User className="w-3 h-3" />
      Yourself
    </span>
  );
}

function AppliedTab({
  jobs, onView, onAdd, onRemove,
}: {
  jobs: AppliedJob[];
  onView: (job: Job, ctx: DetailContext) => void;
  onAdd: () => void;
  onRemove: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const clearSelection = () => setSelected(new Set());
  const bulkRemove = (ids: string[]) => { onRemove(ids); clearSelection(); };
  const isBulk = selected.size > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <TableActionsHeader
        title="Applied Jobs"
        subtitle="Confirmed applications submitted by you or Screna's assistant."
        onAdd={onAdd}
        onExport={() => {}}
      />

      {/* ── Bulk action bar ── */}
      {isBulk && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-lg bg-primary/5 border border-primary/15">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground tabular-nums">{selected.size} selected</span>
            <span className="text-border select-none mx-0.5">·</span>
            <button onClick={clearSelection} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => bulkRemove(Array.from(selected))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-muted/60 transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
              Restore to Saved
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              onClick={() => bulkRemove(Array.from(selected))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-muted/60 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Restore to Delegated
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              onClick={() => bulkRemove(Array.from(selected))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Move to Trash
            </button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Applied by</TableHead>
            <TableHead className="text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job.id}
              className={selected.has(job.id) ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/30'}
            >
              <TableCell>
                <Checkbox checked={selected.has(job.id)} onCheckedChange={() => toggle(job.id)} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <CompanyAvatar letter={job.logoLetter} size="sm" />
                  <span className="font-medium text-foreground">{job.title}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{job.company}</TableCell>
              <TableCell className="text-muted-foreground">{job.location}</TableCell>
              <TableCell className="text-muted-foreground">{job.appliedAgo}</TableCell>
              <TableCell><AppliedByPill by={job.appliedBy} /></TableCell>
              <TableCell className="text-right pr-2">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onView(JOB_RECOMMENDATIONS.find((j) => j.company === job.company) || JOB_RECOMMENDATIONS[0], { kind: 'applied', appliedBy: job.appliedBy })}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {jobs.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                No applications yet. Confirm an Apply in Search to add one here.
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
  const { canAccessJobs } = useUserPlan();
  const [activeTab, setActiveTab] = useState('search');
  const [showDeletedView, setShowDeletedView] = useState(false);
  const [deletedSavedJobs, setDeletedSavedJobs] = useState<DeletedSavedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('1');

  const [timeframe, setTimeframe] = useState('Last 7 Days');
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const timeframeRef = useRef<HTMLDivElement>(null);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);

  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>(APPLIED_JOBS_INITIAL);

  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalContext, setAddModalContext] = useState<'Saved' | 'Delegated' | 'Applied'>('Applied');

  const [detailContext, setDetailContext] = useState<DetailContext | undefined>(undefined);

  // Filters state
  const [filters, setFilters] = useState<JobFilter[]>(FILTERS_INITIAL);
  const [activeFilterId, setActiveFilterId] = useState<string>(
    FILTERS_INITIAL.find((f) => f.isDefault)?.id || FILTERS_INITIAL[0].id,
  );
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterDrawerMode, setFilterDrawerMode] = useState<'create' | 'edit'>('create');
  const [filterDrawerInitial, setFilterDrawerInitial] = useState<JobFilter | null>(null);

  // ─── Search tab API state ───────────────────────────────────────────────
  const [profileTitles, setProfileTitles] = useState<string[]>([]);
  const [activeProfileTitle, setActiveProfileTitle] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const response = await ProfileService.getProfile();
        const profileData = response.data?.data || response.data;
        const titles: string[] = profileData?.structured_resume?.job_titles || [];
        setProfileTitles(titles);
        if (titles.length > 0) setActiveProfileTitle(titles[0]);
      } catch {
        // profile fetch failure is non-fatal; search will run with empty query
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const [apiJobs, setApiJobs] = useState<Job[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiPage, setApiPage] = useState(1);
  const [apiHasMore, setApiHasMore] = useState(true);

  const timeframeToPostedDate = (tf: string) => {
    if (tf === 'Last 24 Hours') return 'TODAY';
    if (tf === 'Last 7 Days') return 'DAYS_7';
    return undefined;
  };

  useEffect(() => {
    setApiPage(1);
    setApiJobs([]);
    setApiHasMore(true);
  }, [activeProfileTitle, timeframe]);

  useEffect(() => {
    if (profileLoading || !canAccessJobs) return;
    const fetchSearchJobs = async () => {
      setApiLoading(true);
      try {
        const response = await JobService.searchJobs({
          query: activeProfileTitle || undefined,
          postedDate: timeframeToPostedDate(timeframe),
          page: apiPage,
        });
        if (response.data?.status === 'SUCCESS' && Array.isArray(response.data?.data)) {
          const mapped = (response.data.data as ApiJob[]).map(mapApiJobToJob);
          setApiJobs((prev) => (apiPage === 1 ? mapped : [...prev, ...mapped]));
          if (response.data.data.length < 10) setApiHasMore(false);
        } else {
          if (apiPage === 1) setApiJobs([]);
          setApiHasMore(false);
        }
      } catch {
        if (apiPage === 1) setApiJobs([]);
        setApiHasMore(false);
      } finally {
        setApiLoading(false);
      }
    };
    fetchSearchJobs();
  }, [activeProfileTitle, timeframe, apiPage, profileLoading, canAccessJobs]);

  useEffect(() => {
    if (apiJobs.length > 0 && !apiJobs.find((j) => j.id === selectedJobId)) {
      setSelectedJobId(apiJobs[0].id);
    }
  }, [apiJobs]);

  const handleSearchScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (apiLoading || !apiHasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      setApiPage((prev) => prev + 1);
    }
  };
  // ────────────────────────────────────────────────────────────────────────

  const openCreateFilter = () => {
    setFilterDrawerMode('create');
    setFilterDrawerInitial(null);
    setFilterDrawerOpen(true);
  };
  const openEditFilter = (f: JobFilter) => {
    setFilterDrawerMode('edit');
    setFilterDrawerInitial(f);
    setFilterDrawerOpen(true);
  };
  const handleSaveFilter = (f: JobFilter) => {
    setFilters((prev) => {
      const exists = prev.some((p) => p.id === f.id);
      if (exists) return prev.map((p) => (p.id === f.id ? f : p));
      return [...prev, f];
    });
    if (f.isDefault) {
      setFilters((prev) => prev.map((p) => ({ ...p, isDefault: p.id === f.id })));
    }
    setFilterDrawerOpen(false);
  };

  const openAdd = (ctx: 'Saved' | 'Delegated' | 'Applied') => {
    setAddModalContext(ctx);
    setAddModalOpen(true);
  };

  const openDetail = (job: Job, ctx?: DetailContext) => {
    setDetailJob(job);
    setDetailContext(ctx);
    setIsDetailOpen(true);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (timeframeRef.current && !timeframeRef.current.contains(e.target as Node)) setIsTimeframeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedJob = apiJobs.find((j) => j.id === selectedJobId) ?? apiJobs[0];

  const handleApplyClick = () => setIsApplyModalOpen(true);
  const handleConfirmApply = () => {
    if (!selectedJob) return;
    setIsApplyModalOpen(false);
    setAppliedJobs((prev) => [
      {
        id: `a${Date.now()}`,
        title: selectedJob.title,
        company: selectedJob.company,
        logoLetter: selectedJob.logoLetter,
        location: selectedJob.location,
        appliedAgo: 'just now',
        appliedBy: 'Yourself',
      },
      ...prev,
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[600px]">
      {/* Top Tabs */}
      <div className="flex items-center gap-1 border-b border-border px-1">
        {['Search', 'Saved', 'Delegated', 'Applied', 'Job Search Filters'].map((tab) => {
          const id = tab.toLowerCase().replace(/ /g, '-');
          const isActive = activeTab === id && !showDeletedView;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(id); setShowDeletedView(false); }}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 relative top-[1px] ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-md'
              }`}
            >
              {tab}
            </button>
          );
        })}
        {/* Trash / Deleted Jobs shortcut */}
        <div className="ml-auto relative top-[1px] pb-[1px] flex items-center">
          <button
            onClick={() => setShowDeletedView((v) => !v)}
            title="Deleted Jobs"
            className={`flex items-center justify-center w-7 h-7 rounded-md border transition-colors ${
              showDeletedView
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-primary/5 border-primary/15 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/25'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {deletedSavedJobs.length > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold tabular-nums pointer-events-none">
              {deletedSavedJobs.length > 9 ? '9+' : deletedSavedJobs.length}
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 pt-4 overflow-y-auto">
        {activeTab === 'search' && !showDeletedView && (
          <>
            {/* Top Controls Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Showing Results For</span>
                <ProfileTitleSwitcher
                  titles={profileTitles}
                  activeTitle={activeProfileTitle}
                  onSelect={setActiveProfileTitle}
                  isLoading={profileLoading}
                />
              </div>

              <div className="relative" ref={timeframeRef}>
                <button
                  onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-md px-3 py-1.5 hover:bg-muted/50 transition-colors"
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

            {/* Two Column Layout */}
            <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
              <div
                className="w-[30%] shrink-0 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar"
                onScroll={handleSearchScroll}
              >
                {apiLoading && apiPage === 1 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading jobs...</p>
                  </div>
                ) : apiJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <Briefcase className="w-10 h-10 text-muted-foreground opacity-40" />
                    <p className="text-sm font-medium text-foreground">No jobs found</p>
                    <p className="text-xs text-muted-foreground">Try changing your filter or timeframe</p>
                  </div>
                ) : (
                  <>
                    {apiJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedJobId === job.id
                            ? 'bg-card border-primary/50 shadow-sm ring-1 ring-primary/20'
                            : 'bg-card border-border hover:border-border/80 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-md flex items-center justify-center font-bold text-lg shrink-0 ${job.logoColor}`}>
                            {job.logoLetter}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-foreground truncate">{job.title}</h3>
                            <p className="text-xs text-muted-foreground">{job.company}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{job.timeAgo}</span>
                            <Badge variant={job.matchScore >= 90 ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                              {job.matchScore}% Match
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{job.location}</span>
                        </div>
                      </div>
                    ))}
                    {apiLoading && (
                      <div className="flex items-center justify-center py-4 gap-2">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">Loading more...</span>
                      </div>
                    )}
                    {!apiHasMore && !apiLoading && (
                      <p className="text-center text-xs text-muted-foreground py-4">End of results</p>
                    )}
                  </>
                )}
              </div>

              <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
                {selectedJob ? (
                  <JobDetailPanel
                    job={selectedJob}
                    onApplyClick={handleApplyClick}
                    aiInput={aiInput}
                    setAiInput={setAiInput}
                    isCommentsOpen={isCommentsOpen}
                    setIsCommentsOpen={setIsCommentsOpen}
                  />
                ) : !apiLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                    <Briefcase className="w-12 h-12 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">Select a job to view details</p>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}

        {activeTab === 'saved' && !showDeletedView && (
          <SavedTab
            onView={openDetail}
            onAdd={() => openAdd('Saved')}
            onTrash={(jobs) =>
              setDeletedSavedJobs((prev) => [
                ...jobs.map((j) => ({ ...j, trashedAgo: 'just now' })),
                ...prev.filter((d) => !jobs.some((j) => j.id === d.id)),
              ])
            }
          />
        )}

        {showDeletedView && (
          <DeletedSavedTab
            items={deletedSavedJobs}
            onView={openDetail}
            onRestore={(ids) => setDeletedSavedJobs((prev) => prev.filter((j) => !ids.includes(j.id)))}
          />
        )}

        {activeTab === 'delegated' && !showDeletedView && (
          <DelegatedTab onView={openDetail} onAdd={() => openAdd('Delegated')} />
        )}

        {activeTab === 'applied' && !showDeletedView && (
          <AppliedTab
            jobs={appliedJobs}
            onView={openDetail}
            onAdd={() => openAdd('Applied')}
            onRemove={(ids) => setAppliedJobs((prev) => prev.filter((j) => !ids.includes(j.id)))}
          />
        )}

        {activeTab === 'job-search-filters' && !showDeletedView && (
          <FiltersTab
            filters={filters}
            onEdit={openEditFilter}
            onCreate={openCreateFilter}
            onSetDefault={(id) =>
              setFilters((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })))
            }
            onArchive={(id, archive) =>
              setFilters((prev) => prev.map((p) => (p.id === id ? { ...p, isArchived: archive } : p)))
            }
            onDuplicate={(id) =>
              setFilters((prev) => {
                const src = prev.find((p) => p.id === id);
                if (!src) return prev;
                return [...prev, { ...src, id: `f${Date.now()}`, name: `${src.name} (Copy)`, isDefault: false }];
              })
            }
            onDelete={(id) => setFilters((prev) => prev.filter((p) => p.id !== id))}
          />
        )}
      </div>

      {/* Apply Modal (Search confirm) */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[Playfair_Display] text-xl">Did you apply to this job?</DialogTitle>
            <DialogDescription className="pt-2">
              We only add jobs to your Applied list after you confirm you actually submitted your application.
            </DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="bg-muted/40 p-4 rounded-lg my-2 flex items-center gap-3 border border-border">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center font-bold ${selectedJob.logoColor}`}>
                {selectedJob.logoLetter}
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">{selectedJob.title}</p>
                <p className="text-muted-foreground text-xs">{selectedJob.company}</p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsApplyModalOpen(false)}>Not yet</Button>
            <Button onClick={handleConfirmApply}>Yes, I applied</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Application Modal */}
      <AddApplicationModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        context={addModalContext}
      />

      {/* Job Detail Dialog (eye icon) */}
      <JobDetailDialog open={isDetailOpen} onOpenChange={setIsDetailOpen} job={detailJob} context={detailContext} />

      {/* Filter Editor Drawer */}
      <FilterEditorDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        mode={filterDrawerMode}
        initial={filterDrawerInitial}
        onSave={handleSaveFilter}
      />
    </div>
  );
}
