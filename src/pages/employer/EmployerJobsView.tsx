import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Briefcase, ChevronDown, Loader2, Plus, Repeat, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { Card, EmptyBox, cx } from '@/components/admin/console/pages/employer/ui';
import { authErrorMessage } from './employerAuth';
import {
  createJob,
  getJob,
  listJobs,
  saveInterviewSettings,
  saveJobAssessment,
  type ApiJob,
  type JobList,
  type JobListFilter,
  type JobListItem,
  type JobListSort,
} from './employerApi';
import { apiToJob, assessmentBody, defaultWindow, detailsBody, formatInZone, jobStatusOf, settingsBody, workplaceLabel, zoneAbbr } from './jobMapping';

// Employer Jobs page (Figma 2082:138 "Jobs-Management-Content"), backed by
// GET /employer/jobs. Layout follows the design: summary cards, filter chips,
// and Active / Closed / Drafts sections. The list is paged on the server (10
// per page), so each section loads its own status and has "Show more".
// Maximum applicants and interview payment aren't in the list rows; each card
// reads them from GET /employer/jobs/{id}. Repost has no endpoint: it copies
// the job into a new draft (POST + PUT assessment + PUT interview-settings).
// The admin console keeps its mock table-style JobsView.

type Filter = 'all' | 'active' | 'closed' | 'drafts';
type Sort = 'recent' | 'closing';

const SECTIONS: { key: Exclude<Filter, 'all'>; label: string; status: JobListFilter }[] = [
  { key: 'active', label: 'Active jobs', status: 'ACTIVE' },
  { key: 'closed', label: 'Closed jobs', status: 'CLOSED' },
  { key: 'drafts', label: 'Drafts', status: 'DRAFT' },
];

const EMPTY_COUNTS = { draft: 0, active: 0, closed: 0, total: 0 };

type Section = { items: JobListItem[]; page: number; last: boolean; total: number };

function windowText(job: JobListItem): string {
  if (!job.closesAt) return 'Not set';
  const short = (iso: string | null) => formatInZone(iso, job.timezone, false).replace(/, \d{4}$/, '');
  const closes = formatInZone(job.closesAt, job.timezone, false);
  return `${job.opensAt ? `${short(job.opensAt)} – ` : ''}${closes} · ${zoneAbbr(job.timezone)}`;
}

// Fields the list rows lack, read once per job.
type Extras = { maxApplicants: number | null; payer: ApiJob['interviewSettings']['interviewPayer'] };
const extrasCache = new Map<string, Promise<Extras>>();
function useExtras(jobId: string): Extras | null {
  const [extras, setExtras] = useState<Extras | null>(null);
  useEffect(() => {
    let cancelled = false;
    let p = extrasCache.get(jobId);
    if (!p) {
      p = getJob(jobId).then((j) => ({ maxApplicants: j.maxApplicants, payer: j.interviewSettings?.interviewPayer ?? null }));
      p.catch(() => extrasCache.delete(jobId));
      extrasCache.set(jobId, p);
    }
    p.then((e) => !cancelled && setExtras(e)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [jobId]);
  return extras;
}

// Repost: copy role, interview and settings into a new draft with a fresh window.
async function repost(jobId: string): Promise<string> {
  const src = await getJob(jobId);
  const form = apiToJob(src, '');
  const copy = { ...form, ...defaultWindow(form.timeZone) };
  const created = await createJob(detailsBody(copy, src));
  await saveJobAssessment(created.id, assessmentBody(copy, new Set(), src.assessmentAreas ?? []));
  if (src.interviewSettings?.interviewPayer) await saveInterviewSettings(created.id, settingsBody(copy, src));
  return created.id;
}

export function EmployerJobsView() {
  const { go } = useEmployerStore();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [counts, setCounts] = useState<JobList['counts']>(EMPTY_COUNTS);
  const [sections, setSections] = useState<Record<string, Section> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState<string | null>(null);
  const [reposting, setReposting] = useState<string | null>(null);
  const loadId = useRef(0);

  // Debounce typing into the server-side title search.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const apiSort: JobListSort = sort === 'closing' ? 'CLOSING_SOON' : 'RECENTLY_UPDATED';

  useEffect(() => {
    const id = ++loadId.current;
    setFailed(false);
    Promise.all(SECTIONS.map((s) => listJobs({ status: s.status, q, sort: apiSort, page: 0 })))
      .then((lists) => {
        if (id !== loadId.current) return;
        setCounts(lists[0].counts);
        setSections(
          Object.fromEntries(
            SECTIONS.map((s, i) => [s.key, { items: lists[i].items, page: 0, last: lists[i].pageMeta.last, total: lists[i].pageMeta.totalElements }]),
          ),
        );
      })
      .catch(() => id === loadId.current && setFailed(true));
  }, [q, apiSort, attempt]);

  const loadMore = async (key: string) => {
    const meta = SECTIONS.find((s) => s.key === key)!;
    const cur = sections?.[key];
    if (!cur) return;
    setLoadingMore(key);
    try {
      const res = await listJobs({ status: meta.status, q, sort: apiSort, page: cur.page + 1 });
      setSections((prev) => (prev ? { ...prev, [key]: { items: [...cur.items, ...res.items], page: cur.page + 1, last: res.pageMeta.last, total: res.pageMeta.totalElements } } : prev));
    } catch {
      toast.error('Could not load more jobs');
    } finally {
      setLoadingMore(null);
    }
  };

  const onRepost = async (job: JobListItem) => {
    setReposting(job.jobId);
    try {
      const id = await repost(job.jobId);
      toast.success(`New draft created from ${job.title}`);
      go({ name: 'wizard', jobId: id });
    } catch (err) {
      toast.error(authErrorMessage(err) || 'Could not repost the job.');
      setReposting(null);
    }
  };

  const visible = SECTIONS.filter((s) => (filter === 'all' || filter === s.key) && (sections?.[s.key]?.items.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 max-w-[720px]">
          <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#1e232f]">Jobs</h1>
          <p className="text-[14px] text-[#5a6172]">Manage your job postings, review applications, and repost closed roles.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <PrimaryButton onClick={() => go({ name: 'wizard' })}>
            <Plus size={15} /> Create a job
          </PrimaryButton>
          <span className="text-[12px] font-medium text-[#5a6172]">Publishing a job is free.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard dot="bg-[#15a560]" label="Active jobs" value={counts.active} />
        <SummaryCard dot="bg-[#98a2b3]" label="Closed jobs" value={counts.closed} />
        <SummaryCard dot="bg-[#d0d5dd]" label="Drafts" value={counts.draft} />
      </div>

      {failed ? (
        <Card>
          <EmptyBox title="Couldn't load your jobs" body="Check your connection and try again." actions={<PrimaryButton onClick={() => setAttempt((n) => n + 1)}>Try again</PrimaryButton>} />
        </Card>
      ) : !sections ? (
        <p className="flex items-center justify-center gap-2 text-[14px] text-[#5a6172] py-10">
          <Loader2 size={14} className="animate-spin" /> Loading jobs…
        </p>
      ) : counts.total === 0 ? (
        <Card>
          <EmptyBox
            icon={<Briefcase size={20} />}
            title="No jobs yet"
            body="Create the first job to start receiving candidates."
            actions={
              <PrimaryButton onClick={() => go({ name: 'wizard' })}>
                <Plus size={15} /> Create a job
              </PrimaryButton>
            }
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 min-w-[220px] h-10 items-center gap-2 rounded-lg border border-[#e1e4ea] bg-white px-3.5 focus-within:border-[#3c77f6]">
              <Search size={16} className="text-[#98a2b3]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job title"
                className="flex-1 bg-transparent outline-none text-[14px] text-[#1e232f] placeholder:text-[#98a2b3]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['all', `All jobs ${counts.total}`],
                  ['active', `Active ${counts.active}`],
                  ['closed', `Closed ${counts.closed}`],
                  ['drafts', `Drafts ${counts.draft}`],
                ] as [Filter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={cx(
                    'px-3 py-2 rounded-full text-[13px] whitespace-nowrap transition-colors',
                    filter === value ? 'bg-[rgba(60,119,246,0.08)] text-[#3c77f6] font-semibold' : 'bg-white border border-[#e1e4ea] text-[#5a6172] font-medium hover:bg-[#f3f4f7]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-[180px] shrink-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Sort jobs"
                className="w-full h-10 appearance-none rounded-lg border border-[#e1e4ea] bg-white pl-3.5 pr-9 text-[14px] text-[#1e232f] outline-none focus:border-[#3c77f6]"
              >
                <option value="recent">Recently updated</option>
                <option value="closing">Closing soon</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5a6172]" />
            </div>
          </div>

          {visible.length === 0 && <p className="text-center text-[14px] text-[#5a6172] py-10">No jobs match your search.</p>}

          <div className="flex flex-col gap-8">
            {visible.map(({ key, label }) => {
              const sec = sections[key];
              return (
                <section key={key} className="flex flex-col gap-4">
                  <h2 className="text-[16px] font-bold text-[#1e232f]">
                    {label} · {sec.total}
                  </h2>
                  {sec.items.map((job) =>
                    key === 'drafts' ? (
                      <DraftCard key={job.jobId} job={job} onEdit={() => go({ name: 'wizard', jobId: job.jobId })} />
                    ) : (
                      <JobCard
                        key={job.jobId}
                        job={job}
                        reposting={reposting === job.jobId}
                        onViewJob={() => go({ name: 'wizard', jobId: job.jobId })}
                        onViewApplications={() => go({ name: 'board', jobId: job.jobId })}
                        onRepost={() => void onRepost(job)}
                      />
                    ),
                  )}
                  {!sec.last && (
                    <button
                      type="button"
                      disabled={loadingMore === key}
                      onClick={() => void loadMore(key)}
                      className="self-center text-[13px] font-semibold text-[#3c77f6] hover:underline disabled:opacity-60"
                    >
                      {loadingMore === key ? 'Loading…' : `Show more ${label.toLowerCase()}`}
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#3c77f6] hover:bg-[#2d6ae0] text-white text-[14px] font-semibold whitespace-nowrap disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="px-4 py-2.5 rounded-[10px] border border-[#e1e4ea] bg-white hover:bg-[#f9fafb] text-[#1e232f] text-[14px] font-semibold whitespace-nowrap">
      {children}
    </button>
  );
}

function SummaryCard({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="bg-white border border-[#e1e4ea] rounded-2xl p-5 flex flex-col gap-3">
      <span className="flex items-center gap-2 text-[13px] font-semibold text-[#5a6172]">
        <span className={cx('w-2 h-2 rounded-full', dot)} />
        {label}
      </span>
      <span className="text-[28px] font-bold tracking-[-0.5px] text-[#1e232f] leading-none">{value}</span>
    </div>
  );
}

function StatusBadge({ job }: { job: JobListItem }) {
  const status = jobStatusOf(job.status);
  const tone =
    status === 'Open'
      ? { bg: 'bg-[#ecfdf5]', dot: 'bg-[#10b981]', text: 'text-[#047857]', label: 'Active' }
      : status === 'Scheduled'
        ? { bg: 'bg-[#eef4ff]', dot: 'bg-[#3c77f6]', text: 'text-[#3c77f6]', label: 'Scheduled' }
        : status === 'Closed'
          ? { bg: 'bg-[#f3f4f7]', dot: 'bg-[#98a2b3]', text: 'text-[#667085]', label: 'Closed' }
          : { bg: 'bg-[#f3f4f7]', dot: 'bg-[#d0d5dd]', text: 'text-[#667085]', label: 'Draft' };
  return (
    <span className={cx('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-semibold shrink-0', tone.bg, tone.text)}>
      <span className={cx('w-1.5 h-1.5 rounded-full', tone.dot)} />
      {tone.label}
    </span>
  );
}

function CardHeader({ job }: { job: JobListItem }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2 min-w-0 max-w-[640px]">
        <p className="text-[18px] font-semibold text-[#1e232f] truncate">{job.title || 'Untitled job'}</p>
        <p className="text-[14px] text-[#5a6172]">{[job.location, workplaceLabel(job.workplaceType)].filter(Boolean).join(' · ') || 'Location not set'}</p>
      </div>
      <StatusBadge job={job} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[13px]">
      <span className="text-[#5a6172]">{k}</span>
      <span className="font-semibold text-[#1e232f] text-right">{v}</span>
    </div>
  );
}

function JobCard({
  job,
  reposting,
  onViewJob,
  onViewApplications,
  onRepost,
}: {
  job: JobListItem;
  reposting: boolean;
  onViewJob: () => void;
  onViewApplications: () => void;
  onRepost: () => void;
}) {
  const closed = job.status === 'CLOSED';
  const extras = useExtras(job.jobId);
  const payer = extras?.payer === 'EMPLOYER' ? 'Recruiter-sponsored' : extras?.payer === 'CANDIDATE' ? 'Candidate-paid' : '—';
  return (
    <div className={cx('border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4', closed ? 'bg-[#f9fafb]' : 'bg-white')}>
      <CardHeader job={job} />
      <div className="flex flex-col gap-2.5">
        <Row k="Applications" v={job.applicationCount} />
        <Row k="Application window" v={windowText(job)} />
        {/* Blank in the wizard means no cap. */}
        <Row k="Maximum applicants" v={extras ? extras.maxApplicants ?? 'Unlimited' : '—'} />
        <Row k="Interview payment" v={payer} />
      </div>
      {closed ? (
        <>
          <p className="text-[13px] text-[#5a6172]">Application deadline passed.</p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap justify-end gap-3">
              <SecondaryButton onClick={onViewApplications}>View applications</SecondaryButton>
              <PrimaryButton onClick={onRepost} disabled={reposting}>
                {reposting ? <Loader2 size={14} className="animate-spin" /> : <Repeat size={14} />} Repost
              </PrimaryButton>
            </div>
            <p className="text-[12px] text-[#5a6172]">Repost creates a new job. Existing applications remain with this posting.</p>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap justify-end gap-3">
          <SecondaryButton onClick={onViewJob}>View job</SecondaryButton>
          <PrimaryButton onClick={onViewApplications}>View applications</PrimaryButton>
        </div>
      )}
    </div>
  );
}

function DraftCard({ job, onEdit }: { job: JobListItem; onEdit: () => void }) {
  const datesSet = !!(job.opensAt && job.closesAt);
  return (
    <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
      <CardHeader job={job} />
      <p className="text-[13px] text-[#5a6172]">{datesSet ? `Not published · ${windowText(job)}` : 'Not published · Application dates and limits not set'}</p>
      <div className="flex justify-end">
        <SecondaryButton onClick={onEdit}>Continue editing</SecondaryButton>
      </div>
    </div>
  );
}
