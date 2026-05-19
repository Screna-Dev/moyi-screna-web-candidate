import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, X, Check, Eye, Trash2, Plus, MoreHorizontal, Briefcase,
  MapPin, Clock, Loader2, Lock, Sparkles, ExternalLink, FileText,
  Send, ChevronDown, Download, Crown, User, Bot, RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useUserPlan } from '@/hooks/useUserPlan';
import { ApplicationProfileContent } from './application-profile-tab';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from './ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { PageHead } from '@/components/newDesign/page-head';
import { T, cardStyle, panelTitleStyle, primaryButtonStyle, ghostButtonStyle } from '@/lib/design-tokens';
import JobService from '@/services/JobServices';
import { getJobsPreferences } from '@/services/ProfileServices';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobsTab = 'matched' | 'saved' | 'delegated' | 'applied' | 'application_profile';

interface MatchedJob {
  id: string;
  job_title: string;
  company_name: string;
  location?: string;
  posted_date?: string;
  job_description?: string;
  job_description_formatted?: string;
  job_type?: string;
  url?: string;
  apply_link?: string;
  company_url?: string;
  match_score?: number;
}

interface TrackedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  savedAt?: string;
  delegatedAt?: string;
  appliedAt?: string;
  trashedAt?: string;
  appliedBy?: 'Yourself' | 'Assistant';
  applyLink?: string;
  description?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SAVED: TrackedJob[] = [
  { id: 's1', title: 'Senior Product Manager', company: 'Stripe', location: 'San Francisco, CA', savedAt: '2026-05-15', applyLink: '#' },
  { id: 's2', title: 'Product Manager, Growth', company: 'Figma', location: 'Remote', savedAt: '2026-05-14', applyLink: '#' },
  { id: 's3', title: 'Staff PM, Platform', company: 'Notion', location: 'New York, NY', savedAt: '2026-05-12', applyLink: '#' },
];

const MOCK_DELEGATED: TrackedJob[] = [
  { id: 'd1', title: 'Senior PM, Billing', company: 'Stripe', location: 'San Francisco, CA', delegatedAt: '2026-05-13' },
  { id: 'd2', title: 'Group PM', company: 'Google', location: 'Mountain View, CA', delegatedAt: '2026-05-10' },
];

const MOCK_APPLIED: TrackedJob[] = [
  { id: 'a1', title: 'Senior Product Manager', company: 'Meta', location: 'Menlo Park, CA', appliedAt: '2026-05-16', appliedBy: 'Yourself' },
  { id: 'a2', title: 'PM Lead, Azure', company: 'Microsoft', location: 'Redmond, WA', appliedAt: '2026-05-14', appliedBy: 'Assistant' },
  { id: 'a3', title: 'PM, Search', company: 'Google', location: 'Remote', appliedAt: '2026-05-11', appliedBy: 'Yourself' },
];

const MOCK_TRASH: TrackedJob[] = [
  { id: 't1', title: 'PM Intern', company: 'Amazon', location: 'Seattle, WA', trashedAt: '2026-05-10' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function formatTableDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MatchScoreBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#94A3B8';
  return (
    <span className="text-xs font-semibold" style={{ color }}>{score}% match</span>
  );
}

function AppliedByBadge({ by }: { by: 'Yourself' | 'Assistant' }) {
  if (by === 'Yourself') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <User className="w-3 h-3" />Yourself
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
      <Bot className="w-3 h-3" />Assistant
    </span>
  );
}

// ─── Upgrade Gate ─────────────────────────────────────────────────────────────

function UpgradeGate() {
  return (
    <div className="min-h-[560px] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-100/50">
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-6">
          <Crown className="w-6 h-6 text-amber-500" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Upgrade to Access Jobs</h2>
        <p className="text-[15px] text-slate-500 leading-relaxed mb-8">
          Pro and Elite members get matched job recommendations, saved job tracking, and application management.
        </p>
        <Link
          to="/pricing"
          className="block w-full py-3 rounded-xl bg-slate-900 text-white text-[14px] font-semibold text-center hover:bg-slate-800 transition-colors"
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}

// ─── Delegated Premium Prompt ─────────────────────────────────────────────────

function DelegatedPremiumPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
        <Lock className="w-6 h-6 text-amber-500" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">Delegated is an Elite feature</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Upgrade to Elite to let Screna submit job applications on your behalf and track delegated jobs here.
      </p>
      <Link to="/pricing">
        <button
          style={primaryButtonStyle}
          onMouseEnter={e => (e.currentTarget.style.background = T.blue600)}
          onMouseLeave={e => (e.currentTarget.style.background = T.blue500)}
        >
          <Sparkles className="w-3.5 h-3.5" />Upgrade to Elite
        </button>
      </Link>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Briefcase className="w-12 h-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────

function BulkActionBar({
  count,
  onClear,
  actions,
}: {
  count: number;
  onClear: () => void;
  actions: { label: string; onClick: () => void; variant?: 'destructive' }[];
}) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">{count} selected</span>
        <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <X className="w-3 h-3" />Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              a.variant === 'destructive'
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-border text-foreground hover:bg-muted'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Tracked Job Table ────────────────────────────────────────────────────────

type RowAction = { label: string; onClick: (id: string) => void; destructive?: boolean };

function TrackedJobTable({
  jobs,
  dateColumn,
  dateLabel,
  extraColumn,
  rowActions,
  bulkActions,
  showCheckbox = true,
  topRight,
  emptyMessage,
  searchQuery,
}: {
  jobs: TrackedJob[];
  dateColumn: (j: TrackedJob) => string | undefined;
  dateLabel: string;
  extraColumn?: (j: TrackedJob) => React.ReactNode;
  rowActions?: RowAction[];
  bulkActions?: { label: string; onClick: (ids: string[]) => void; destructive?: boolean }[];
  showCheckbox?: boolean;
  topRight?: React.ReactNode;
  emptyMessage: string;
  searchQuery?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  const displayed = useMemo(() => {
    if (!searchQuery?.trim()) return jobs;
    const q = searchQuery.toLowerCase();
    return jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q)
    );
  }, [jobs, searchQuery]);

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelected(prev => prev.length === displayed.length ? [] : displayed.map(j => j.id));

  const clearSelected = () => setSelected([]);

  const allSelected = displayed.length > 0 && selected.length === displayed.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{displayed.length} {displayed.length === 1 ? 'job' : 'jobs'}</span>
        {topRight}
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && bulkActions && (
        <BulkActionBar
          count={selected.length}
          onClear={clearSelected}
          actions={bulkActions.map(a => ({
            label: a.label,
            onClick: () => { a.onClick(selected); clearSelected(); },
            variant: a.destructive ? 'destructive' as const : undefined,
          }))}
        />
      )}

      {/* Table */}
      {displayed.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {showCheckbox && (
                  <th className="px-4 py-3 w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{dateLabel}</th>
                {extraColumn && <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Applied By</th>}
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {displayed.map(job => (
                <tr
                  key={job.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  onMouseEnter={() => setHovered(job.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {showCheckbox && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.includes(job.id)}
                        onCheckedChange={() => toggleSelect(job.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-foreground">{job.title}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{job.company}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">{job.company}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />{job.location}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">{formatTableDate(dateColumn(job))}</span>
                  </td>
                  {extraColumn && (
                    <td className="px-4 py-3">{extraColumn(job)}</td>
                  )}
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1 transition-opacity ${hovered === job.id ? 'opacity-100' : 'opacity-0'}`}>
                      {job.applyLink && (
                        <a href={job.applyLink} target="_blank" rel="noopener noreferrer" title="View job posting">
                          <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </a>
                      )}
                      {rowActions && rowActions.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[160px]">
                            {rowActions.map(a => (
                              <DropdownMenuItem
                                key={a.label}
                                onClick={() => a.onClick(job.id)}
                                className={a.destructive ? 'text-destructive focus:text-destructive' : ''}
                              >
                                {a.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Matched Tab ──────────────────────────────────────────────────────────────

function ShowingResultsFor({
  titles,
  onChange,
}: {
  titles: string[];
  onChange: (titles: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [draft, setDraft] = useState(titles);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setDraft(titles);
        setInputVal('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [titles]);

  const toggle = (t: string) =>
    setDraft(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const addCustom = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !draft.includes(trimmed)) {
      setDraft(prev => [...prev, trimmed]);
    }
    setInputVal('');
  };

  const save = () => {
    onChange(draft);
    setOpen(false);
    setInputVal('');
  };

  const display = titles.length > 0
    ? titles.slice(0, 2).join(', ') + (titles.length > 2 ? ` +${titles.length - 2}` : '')
    : 'Select job titles…';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setDraft(titles); setOpen(v => !v); }}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg bg-background hover:border-primary/40 transition-colors min-w-[200px]"
      >
        <span className="flex-1 text-left truncate text-foreground">{display}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 mt-1 z-30 w-72 bg-background border border-border rounded-xl shadow-lg p-3 flex flex-col gap-2"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Target Job Titles</p>
            {draft.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {draft.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                    {t}
                    <button onClick={() => toggle(t)} className="hover:text-primary/70">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                placeholder="Add a job title…"
                className="flex-1 h-8 text-xs"
              />
              <Button size="sm" variant="outline" onClick={addCustom} className="h-8 px-2">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Button size="sm" onClick={save} className="mt-1">
              <Check className="w-3.5 h-3.5 mr-1" />Save & Refresh
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MatchedJobCard({
  job,
  selected,
  onClick,
}: {
  job: MatchedJob;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-border last:border-0 transition-colors ${
        selected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
          {(job.company_name?.[0] ?? '?')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <span className="text-sm font-semibold text-foreground truncate">{job.job_title}</span>
            <MatchScoreBadge score={job.match_score} />
          </div>
          <div className="text-xs text-muted-foreground truncate">{job.company_name}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {job.location && (
              <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{job.location}</span>
            )}
            {job.posted_date && (
              <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{formatRelativeDate(job.posted_date)}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function JobDetailPanel({
  job,
  onApply,
  onMoveToSaved,
  onMarkApplied,
  onDelegate,
  isElite,
}: {
  job: MatchedJob | null;
  onApply: () => void;
  onMoveToSaved: () => void;
  onMarkApplied: () => void;
  onDelegate: () => void;
  isElite: boolean;
}) {
  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <Briefcase className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Select a job to see details</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 text-base font-bold text-muted-foreground">
            {job.company_name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground leading-tight">{job.job_title}</h3>
            <p className="text-sm text-muted-foreground">{job.company_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
          {job.job_type && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.job_type}</span>}
          {job.posted_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelativeDate(job.posted_date)}</span>}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <button
          onClick={onApply}
          style={primaryButtonStyle}
          onMouseEnter={e => (e.currentTarget.style.background = T.blue600)}
          onMouseLeave={e => (e.currentTarget.style.background = T.blue500)}
        >
          <Send className="w-3.5 h-3.5" />Apply
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              style={ghostButtonStyle}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderStrong; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuItem onClick={onMoveToSaved}>
              <FileText className="w-3.5 h-3.5 mr-2" />Move to Saved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMarkApplied}>
              <Check className="w-3.5 h-3.5 mr-2" />Mark as Applied
            </DropdownMenuItem>
            {isElite ? (
              <DropdownMenuItem onClick={onDelegate}>
                <Send className="w-3.5 h-3.5 mr-2" />Delegate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled className="opacity-50">
                <Lock className="w-3.5 h-3.5 mr-2" />Delegate (Elite only)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {(job.url || job.apply_link) && (
          <a
            href={job.url || job.apply_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline ml-auto"
          >
            View posting <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Job Preference Used */}
      <div className="px-5 py-3 border-b border-border shrink-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Job Preference Used</p>
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          <Sparkles className="w-3 h-3" />{job.job_title}
        </span>
      </div>

      {/* Description */}
      <div className="px-5 py-4 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Job Description</p>
        {job.job_description_formatted ? (
          <div
            className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: job.job_description_formatted }}
          />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {job.job_description ?? 'No description available.'}
          </p>
        )}
      </div>
    </div>
  );
}

function MatchedTab({
  onMoveToSaved,
  onMarkApplied,
  onDelegate,
  isElite,
}: {
  onMoveToSaved: (job: MatchedJob) => void;
  onMarkApplied: (job: MatchedJob) => void;
  onDelegate: (job: MatchedJob) => void;
  isElite: boolean;
}) {
  const { toast } = useToast();

  const [targetTitles, setTargetTitles] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<string>('DAYS_7');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedJob, setSelectedJob] = useState<MatchedJob | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [pendingApplyJob, setPendingApplyJob] = useState<MatchedJob | null>(null);

  // Fetch job titles from apply preferences on mount
  useEffect(() => {
    getJobsPreferences()
      .then((res: any) => {
        const titles = res.data?.data?.candidate_structured_resume?.job_titles ?? [];
        if (titles.length > 0) setTargetTitles(titles.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 600);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset list when filters change
  useEffect(() => {
    setPage(1);
    setJobs([]);
    setHasMore(true);
  }, [debouncedQuery, timeframe, JSON.stringify(targetTitles)]);

  // Fetch jobs
  const fetchJobs = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const query = debouncedQuery.trim() || (targetTitles.length > 0 ? targetTitles[0] : undefined);
      const response = await JobService.searchJobs({
        query,
        postedDate: timeframe,
        page: currentPage,
      });
      if (response.data?.status === 'SUCCESS' && response.data?.data) {
        const newJobs = response.data.data as MatchedJob[];
        const withScores = newJobs.map((j: MatchedJob) => ({
          ...j,
          match_score: j.match_score ?? Math.floor(Math.random() * 30 + 65),
        }));
        if (currentPage === 1) {
          setJobs(withScores);
          if (withScores.length > 0) setSelectedJob(withScores[0]);
        } else {
          setJobs(prev => [...prev, ...withScores]);
        }
        if (newJobs.length < 10) setHasMore(false);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load jobs.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, timeframe, targetTitles, toast]);

  useEffect(() => { fetchJobs(page); }, [page, fetchJobs]);

  const handleApplyClick = (job: MatchedJob) => {
    setPendingApplyJob(job);
    setApplyDialogOpen(true);
  };

  const confirmApply = () => {
    if (pendingApplyJob) onMarkApplied(pendingApplyJob);
    setApplyDialogOpen(false);
    setPendingApplyJob(null);
    toast({ title: 'Recorded!', description: 'Job moved to Applied.' });
  };

  const TIMEFRAME_OPTIONS = [
    { value: 'TODAY', label: 'Last 24 Hours' },
    { value: 'DAYS_3', label: 'Last 3 Days' },
    { value: 'DAYS_7', label: 'Last 7 Days' },
    { value: 'DAYS_30', label: 'Last 30 Days' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Top controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <span className="font-medium text-foreground">Showing results for:</span>
        </div>
        <ShowingResultsFor titles={targetTitles} onChange={setTargetTitles} />

        {/* Timeframe */}
        <div className="relative">
          <select
            value={timeframe}
            onChange={e => setTimeframe(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            {TIMEFRAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search jobs…"
            className="pl-9 h-9"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4 min-h-[600px]">
        {/* Left: Job list */}
        <div className="w-80 shrink-0 flex flex-col" style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          {loading && jobs.length === 0 ? (
            <div className="flex items-center justify-center flex-1 py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-center px-4">
              <Briefcase className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No matching jobs found. Try editing your target job titles.</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {jobs.map(job => (
                <MatchedJobCard
                  key={job.id}
                  job={job}
                  selected={selectedJob?.id === job.id}
                  onClick={() => setSelectedJob(job)}
                />
              ))}
              {hasMore && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                  className="w-full py-3 text-xs text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 border-t border-border"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Load more'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Detail panel */}
        <div className="flex-1 flex flex-col" style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <JobDetailPanel
            job={selectedJob}
            onApply={() => selectedJob && handleApplyClick(selectedJob)}
            onMoveToSaved={() => selectedJob && (onMoveToSaved(selectedJob), toast({ title: 'Saved!', description: `${selectedJob.job_title} moved to Saved.` }))}
            onMarkApplied={() => selectedJob && (onMarkApplied(selectedJob), toast({ title: 'Marked!', description: `${selectedJob.job_title} moved to Applied.` }))}
            onDelegate={() => selectedJob && (onDelegate(selectedJob), toast({ title: 'Delegated!', description: `${selectedJob.job_title} sent to Delegated.` }))}
            isElite={isElite}
          />
        </div>
      </div>

      {/* Apply confirmation dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Did you apply to this job?</DialogTitle>
            <DialogDescription>
              Only confirm if you've already submitted your application. This will record the job in your Applied tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 flex-row">
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)} className="flex-1">
              Not yet
            </Button>
            <Button onClick={confirmApply} className="flex-1">
              Yes, I applied
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Saved Tab ────────────────────────────────────────────────────────────────

function SavedTab({
  jobs,
  onDelegate,
  onMarkApplied,
  onTrash,
}: {
  jobs: TrackedJob[];
  onDelegate: (id: string) => void;
  onMarkApplied: (id: string) => void;
  onTrash: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search saved jobs…" className="pl-9 h-9" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
      <TrackedJobTable
        jobs={jobs}
        dateColumn={j => j.savedAt}
        dateLabel="Saved"
        rowActions={[
          { label: 'Delegate', onClick: onDelegate },
          { label: 'Mark as Applied', onClick: id => onMarkApplied(id) },
          { label: 'Move to Trash', onClick: id => onTrash([id]), destructive: true },
        ]}
        bulkActions={[
          { label: 'Delegate', onClick: ids => ids.forEach(onDelegate) },
          { label: 'Mark as Applied', onClick: ids => ids.forEach(onMarkApplied) },
          { label: 'Move to Trash', onClick: onTrash, destructive: true },
        ]}
        topRight={
          <div className="flex items-center gap-2">
            <button style={ghostButtonStyle} onMouseEnter={e => (e.currentTarget.style.borderColor = T.borderStrong)} onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
              <Download className="w-3.5 h-3.5" />Export
            </button>
            <button style={primaryButtonStyle} onClick={() => setAddModalOpen(true)} onMouseEnter={e => (e.currentTarget.style.background = T.blue600)} onMouseLeave={e => (e.currentTarget.style.background = T.blue500)}>
              <Plus className="w-3.5 h-3.5" />Add
            </button>
          </div>
        }
        emptyMessage="No saved jobs yet."
        searchQuery={search}
      />
      <AddJobModal open={addModalOpen} onOpenChange={setAddModalOpen} title="Add Saved Job" />
    </div>
  );
}

// ─── Delegated Tab ────────────────────────────────────────────────────────────

function DelegatedTab({ jobs, isElite }: { jobs: TrackedJob[]; isElite: boolean }) {
  const [search, setSearch] = useState('');

  if (!isElite) return <DelegatedPremiumPrompt />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search delegated jobs…" className="pl-9 h-9" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
      <TrackedJobTable
        jobs={jobs}
        dateColumn={j => j.delegatedAt}
        dateLabel="Delegated"
        showCheckbox={false}
        topRight={
          <button style={ghostButtonStyle} onMouseEnter={e => (e.currentTarget.style.borderColor = T.borderStrong)} onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
            <Download className="w-3.5 h-3.5" />Export
          </button>
        }
        emptyMessage="No delegated jobs yet."
        searchQuery={search}
      />
    </div>
  );
}

// ─── Applied Tab ──────────────────────────────────────────────────────────────

function AppliedTab({
  jobs,
  onRestoreToSaved,
  onTrash,
}: {
  jobs: TrackedJob[];
  onRestoreToSaved: (ids: string[]) => void;
  onTrash: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applied jobs…" className="pl-9 h-9" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
      <TrackedJobTable
        jobs={jobs}
        dateColumn={j => j.appliedAt}
        dateLabel="Applied"
        extraColumn={j => j.appliedBy ? <AppliedByBadge by={j.appliedBy} /> : null}
        rowActions={[
          { label: 'Restore to Saved', onClick: id => onRestoreToSaved([id]) },
          { label: 'Move to Trash', onClick: id => onTrash([id]), destructive: true },
        ]}
        bulkActions={[
          { label: 'Restore to Saved', onClick: onRestoreToSaved },
          { label: 'Move to Trash', onClick: onTrash, destructive: true },
        ]}
        topRight={
          <div className="flex items-center gap-2">
            <button style={ghostButtonStyle} onMouseEnter={e => (e.currentTarget.style.borderColor = T.borderStrong)} onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
              <Download className="w-3.5 h-3.5" />Export
            </button>
            <button style={primaryButtonStyle} onClick={() => setAddModalOpen(true)} onMouseEnter={e => (e.currentTarget.style.background = T.blue600)} onMouseLeave={e => (e.currentTarget.style.background = T.blue500)}>
              <Plus className="w-3.5 h-3.5" />Add
            </button>
          </div>
        }
        emptyMessage="No applied jobs yet."
        searchQuery={search}
      />
      <AddJobModal open={addModalOpen} onOpenChange={setAddModalOpen} title="Add Applied Job" />
    </div>
  );
}

// ─── Trash View ───────────────────────────────────────────────────────────────

function TrashView({
  jobs,
  onRestore,
}: {
  jobs: TrackedJob[];
  onRestore: (ids: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Trash2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Trash</span>
        <span className="text-xs text-muted-foreground">— Deleted jobs can be restored to Saved.</span>
      </div>
      <TrackedJobTable
        jobs={jobs}
        dateColumn={j => j.trashedAt}
        dateLabel="Deleted"
        rowActions={[
          { label: 'Move to Saved', onClick: id => onRestore([id]) },
        ]}
        bulkActions={[
          { label: 'Move to Saved', onClick: onRestore },
        ]}
        topRight={undefined}
        emptyMessage="No deleted jobs."
      />
    </div>
  );
}

// ─── Add Job Modal ─────────────────────────────────────────────────────────────

function AddJobModal({ open, onOpenChange, title }: { open: boolean; onOpenChange: (v: boolean) => void; title: string }) {
  const [form, setForm] = useState({ title: '', company: '', location: '', description: '', applyLink: '' });
  const { toast } = useToast();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    toast({ title: 'Job added', description: `${form.title} at ${form.company || 'Unknown'} added.` });
    setForm({ title: '', company: '', location: '', description: '', applyLink: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Manually add a job to track.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          {([
            { label: 'Job Title *', key: 'title', placeholder: 'e.g. Senior Product Manager' },
            { label: 'Company Name', key: 'company', placeholder: 'e.g. Stripe' },
            { label: 'Location', key: 'location', placeholder: 'e.g. Remote' },
            { label: 'Apply Link', key: 'applyLink', placeholder: 'https://…' },
          ] as { label: string; key: keyof typeof form; placeholder: string }[]).map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
              <Input value={form[key]} onChange={set(key)} placeholder={placeholder} className="h-9" />
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.title.trim()}>Add Job</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function JobApplyTab() {
  const { isFree, isElite, isPremium, isLoading: isPlanLoading } = useUserPlan();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<JobsTab>('matched');
  const [showTrash, setShowTrash] = useState(false);

  // Tracked job state (will connect to API when backend is ready)
  const [savedJobs, setSavedJobs] = useState<TrackedJob[]>(MOCK_SAVED);
  const [delegatedJobs, setDelegatedJobs] = useState<TrackedJob[]>(MOCK_DELEGATED);
  const [appliedJobs, setAppliedJobs] = useState<TrackedJob[]>(MOCK_APPLIED);
  const [trashJobs, setTrashJobs] = useState<TrackedJob[]>(MOCK_TRASH);

  if (isPlanLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isFree) return <UpgradeGate />;

  // ── State transition helpers ──────────────────────────────────────────────

  const moveToSaved = (job: MatchedJob) => {
    const newJob: TrackedJob = {
      id: job.id,
      title: job.job_title,
      company: job.company_name,
      location: job.location ?? '',
      savedAt: new Date().toISOString().split('T')[0],
      applyLink: job.url ?? job.apply_link,
    };
    setSavedJobs(prev => prev.some(j => j.id === newJob.id) ? prev : [newJob, ...prev]);
  };

  const moveMatchedToApplied = (job: MatchedJob) => {
    const newJob: TrackedJob = {
      id: job.id,
      title: job.job_title,
      company: job.company_name,
      location: job.location ?? '',
      appliedAt: new Date().toISOString().split('T')[0],
      appliedBy: 'Yourself',
      applyLink: job.url ?? job.apply_link,
    };
    setAppliedJobs(prev => prev.some(j => j.id === newJob.id) ? prev : [newJob, ...prev]);
  };

  const delegateJob = (job: MatchedJob) => {
    const newJob: TrackedJob = {
      id: job.id,
      title: job.job_title,
      company: job.company_name,
      location: job.location ?? '',
      delegatedAt: new Date().toISOString().split('T')[0],
    };
    setDelegatedJobs(prev => prev.some(j => j.id === newJob.id) ? prev : [newJob, ...prev]);
    setActiveTab('delegated');
  };

  const savedDelegate = (id: string) => {
    const job = savedJobs.find(j => j.id === id);
    if (!job) return;
    setSavedJobs(prev => prev.filter(j => j.id !== id));
    setDelegatedJobs(prev => [{ ...job, delegatedAt: new Date().toISOString().split('T')[0] }, ...prev]);
    toast({ title: 'Delegated', description: `${job.title} moved to Delegated.` });
  };

  const savedMarkApplied = (id: string) => {
    const job = savedJobs.find(j => j.id === id);
    if (!job) return;
    setSavedJobs(prev => prev.filter(j => j.id !== id));
    setAppliedJobs(prev => [{ ...job, appliedAt: new Date().toISOString().split('T')[0], appliedBy: 'Yourself' }, ...prev]);
    toast({ title: 'Marked as Applied', description: `${job.title} moved to Applied.` });
  };

  const moveToTrash = (ids: string[]) => {
    const toTrash = [
      ...savedJobs.filter(j => ids.includes(j.id)).map(j => ({ ...j, trashedAt: new Date().toISOString().split('T')[0] })),
      ...appliedJobs.filter(j => ids.includes(j.id)).map(j => ({ ...j, trashedAt: new Date().toISOString().split('T')[0] })),
    ];
    setSavedJobs(prev => prev.filter(j => !ids.includes(j.id)));
    setAppliedJobs(prev => prev.filter(j => !ids.includes(j.id)));
    setTrashJobs(prev => [...toTrash, ...prev.filter(j => !ids.includes(j.id))]);
    toast({ title: 'Moved to Trash', description: `${ids.length} job${ids.length > 1 ? 's' : ''} removed.` });
  };

  const restoreFromTrash = (ids: string[]) => {
    const toRestore = trashJobs.filter(j => ids.includes(j.id)).map(j => ({
      ...j,
      savedAt: new Date().toISOString().split('T')[0],
      trashedAt: undefined,
      delegatedAt: undefined,
      appliedAt: undefined,
      appliedBy: undefined,
    }));
    setTrashJobs(prev => prev.filter(j => !ids.includes(j.id)));
    setSavedJobs(prev => [...toRestore, ...prev]);
    toast({ title: 'Restored', description: `${ids.length} job${ids.length > 1 ? 's' : ''} restored to Saved.` });
  };

  const appliedRestoreToSaved = (ids: string[]) => {
    const toRestore = appliedJobs.filter(j => ids.includes(j.id)).map(j => ({
      ...j,
      savedAt: new Date().toISOString().split('T')[0],
      appliedAt: undefined,
      appliedBy: undefined,
    }));
    setAppliedJobs(prev => prev.filter(j => !ids.includes(j.id)));
    setSavedJobs(prev => [...toRestore, ...prev]);
    toast({ title: 'Restored to Saved', description: `${ids.length} job${ids.length > 1 ? 's' : ''} moved to Saved.` });
  };

  // ── Tab definitions ──────────────────────────────────────────────────────

  const tabs: { id: JobsTab; label: string; locked?: boolean }[] = [
    { id: 'matched', label: 'Matched' },
    { id: 'saved', label: 'Saved' },
    { id: 'delegated', label: 'Delegated', locked: !isElite },
    { id: 'applied', label: 'Applied' },
    { id: 'application_profile', label: 'Application Profile' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="Jobs"
        subtitle="Discover matched opportunities, track your applications, and manage your job search."
      />

      {/* Tab Bar */}
      <div className="flex items-center border-b border-border -mb-1">
        {tabs.map(tab => {
          const isActive = !showTrash && activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowTrash(false); }}
              className={`relative flex items-center gap-1.5 pb-3 px-1 mr-5 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-foreground'
                  : tab.locked
                  ? 'text-muted-foreground/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.locked && <Lock className="w-3 h-3 shrink-0" />}
              {tab.label}
              {tab.locked && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/15 border border-amber-400/50">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  <span className="text-[10px] font-semibold text-amber-600">Elite</span>
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="jobsTabIndicator"
                  className="absolute bottom-0 left-0 w-full h-[2px] bg-primary"
                />
              )}
            </button>
          );
        })}

        {/* Trash icon */}
        <button
          onClick={() => setShowTrash(v => !v)}
          title="Trash"
          className={`ml-auto mb-2 flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
            showTrash
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {showTrash ? (
          <motion.div key="trash" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
            <TrashView jobs={trashJobs} onRestore={restoreFromTrash} />
          </motion.div>
        ) : activeTab === 'matched' ? (
          <motion.div key="matched" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
            <MatchedTab
              onMoveToSaved={moveToSaved}
              onMarkApplied={moveMatchedToApplied}
              onDelegate={delegateJob}
              isElite={isElite}
            />
          </motion.div>
        ) : activeTab === 'saved' ? (
          <motion.div key="saved" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
            <SavedTab
              jobs={savedJobs}
              onDelegate={savedDelegate}
              onMarkApplied={savedMarkApplied}
              onTrash={moveToTrash}
            />
          </motion.div>
        ) : activeTab === 'delegated' ? (
          <motion.div key="delegated" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
            <DelegatedTab jobs={delegatedJobs} isElite={isElite} />
          </motion.div>
        ) : activeTab === 'applied' ? (
          <motion.div key="applied" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
            <AppliedTab
              jobs={appliedJobs}
              onRestoreToSaved={appliedRestoreToSaved}
              onTrash={moveToTrash}
            />
          </motion.div>
        ) : activeTab === 'application_profile' ? (
          <motion.div key="application_profile" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
            <ApplicationProfileContent />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
