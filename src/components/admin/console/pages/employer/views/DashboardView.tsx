import { useMemo, useState, type ReactNode } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bell, Briefcase, Check, CheckCircle2, ClipboardList, HelpCircle, Plus, Trophy, Users } from 'lucide-react';
import { useEmployerStore } from '../store';
import { applicationsSeries } from '../mockData';
import type { Candidate, Job } from '../types';
import { Button, Card, Pill, SectionTitle, StatCard, cx, statusTone } from '../ui';
import { applicationWindowLabel, nextAction, unlockedCount } from './jobTableHelpers';
import { HiringGuide } from './HiringGuide';

type Metric = 'applications' | 'interviews' | 'reports';
type Range = '7d' | '30d' | '3m';

const METRIC_LABEL: Record<Metric, string> = {
  applications: 'Applications received per day',
  interviews: 'Interviews completed per day',
  reports: 'Reports unlocked per day',
};

// Mock chart series. 3 months is derived from the 30-day series so the shape
// stays stable between renders.
function seriesFor(metric: Metric, range: Range) {
  const base = applicationsSeries.map((p) => p.value);
  const values = range === '7d' ? base.slice(-7) : range === '30d' ? base : [...base, ...base.map((v) => Math.max(0, v - 1)), ...base.map((v) => v + 1)];
  const scale = metric === 'applications' ? 1 : metric === 'interviews' ? 0.66 : 0.2;
  return values.map((v, i) => ({ day: i + 1, value: Math.round(v * scale * 10) / 10 }));
}

export type DashboardAttention = { title: string; body: string; action: string; tone: 'amber' | 'gray'; onClick: () => void };

// Employer app only: real figures for the parts the employer API covers
// (jobs list + counts). Everything else keeps the design's sample data until
// the backend adds it (product decision 2026-10-23: the design leads, the API
// follows). Without it the dashboard is the admin console's mock version.
export type LiveDashboard = {
  totalJobs: number;
  open: number;
  scheduled: number;
  interviewsCompleted: number | null; // null = couldn't be totalled; sample value shown
  attention: DashboardAttention[]; // real items; sample "waiting for a decision" is added
  jobsTable: ReactNode;
};

function greetingPrefix() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function useCompanyStats(jobs: Job[], candidatesFor: (id: string) => Candidate[]) {
  return useMemo(() => {
    const all = jobs.flatMap((j) => candidatesFor(j.id));
    const unlocked = all.filter((c) => c.unlocked);
    return {
      open: jobs.filter((j) => j.status === 'Open').length,
      scheduled: jobs.filter((j) => j.status === 'Scheduled').length,
      applicants: jobs.reduce((s, j) => s + j.applicants, 0),
      interviews: jobs.reduce((s, j) => s + j.interviewsCompleted, 0),
      unlocked: unlocked.length,
      pending: unlocked.filter((c) => c.decision === 'pending').length,
      moved: unlocked.filter((c) => c.decision === 'moved_forward').length,
      rejected: unlocked.filter((c) => c.decision === 'rejected').length,
      contacted: all.filter((c) => c.contact === 'contacted').length,
    };
  }, [jobs, candidatesFor]);
}

// ─── My Jobs table (shared look with JobsView) ───────────────────────────────

export function JobsTable({ jobs, rowExtra }: { jobs: Job[]; rowExtra?: (job: Job) => React.ReactNode }) {
  const { go, candidatesFor } = useEmployerStore();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="bg-[#f3f4f7] text-[#1e232f] text-[13px]">
            <th className="text-left font-medium px-4 py-3 rounded-l-lg">Job</th>
            <th className="text-left font-medium px-4 py-3">Status</th>
            <th className="text-left font-medium px-4 py-3">Application Window</th>
            <th className="text-center font-medium px-4 py-3">Applicants</th>
            <th className="text-center font-medium px-4 py-3">Interviews</th>
            <th className="text-center font-medium px-4 py-3">Unlocked</th>
            <th className={cx('text-right font-medium px-4 py-3', !rowExtra && 'rounded-r-lg')}>Next Action</th>
            {rowExtra && <th className="px-2 py-3 rounded-r-lg" />}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const live = job.status === 'Open' || job.status === 'Closed';
            const action = nextAction(job);
            return (
              <tr key={job.id} className="border-b border-[#eef0f3] last:border-0">
                <td className="px-4 py-3.5 font-semibold text-[#1e232f]">{job.title || 'Untitled job'}</td>
                <td className="px-4 py-3.5">
                  <Pill tone={statusTone(job.status)}>{job.status}</Pill>
                </td>
                <td className="px-4 py-3.5 text-[#5a6172]">{applicationWindowLabel(job)}</td>
                <td className="px-4 py-3.5 text-center text-[#1e232f]">{live ? job.applicants : '-'}</td>
                <td className="px-4 py-3.5 text-center text-[#1e232f]">{live ? job.interviewsCompleted : '-'}</td>
                <td className="px-4 py-3.5 text-center text-[#1e232f]">{live ? unlockedCount(candidatesFor(job.id)) : '-'}</td>
                <td className="px-4 py-3.5 text-right">
                  <button type="button" onClick={() => go(action.view)} className="text-[#3c77f6] font-medium hover:underline">
                    {action.label}
                  </button>
                </td>
                {rowExtra && <td className="px-2 py-3.5 text-right">{rowExtra(job)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── First-time dashboard (no jobs yet) ──────────────────────────────────────

function FirstTimeDashboard() {
  const { company, go } = useEmployerStore();
  const firstName = company.contact.name.trim().split(/\s+/)[0] || 'there';
  const steps = [
    { title: 'Account created', body: '', done: true },
    { title: 'Create your first job', body: 'Add the role, requirements and application window.', done: false, action: { label: 'Create job', onClick: () => go({ name: 'wizard' }) } },
    { title: 'Review and publish the AI interview', body: 'Confirm the interview questions, candidate experience and sponsorship settings.', done: false, note: 'Starts after job creation' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Card className="px-6 py-5">
        <h1 className="text-[#1e232f] text-[26px] font-bold font-[family-name:var(--font-serif)] leading-8">Welcome to Screna, {firstName}</h1>
        <p className="text-[#5a6172] text-[14px] mt-1">Publish the first structured interview for {company.name}.</p>
      </Card>

      {/* Get started hero */}
      <div className="bg-[#f5f8ff] border border-[#dbe5fb] rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-[#3c77f6] uppercase">Get started</span>
          <h2 className="text-[#1e232f] text-[28px] font-semibold leading-9">Create your first structured interview.</h2>
          <p className="text-[#5a6172] text-[14px] leading-5">
            Add the role, confirm the AI-generated interview, and publish when everything looks right. You can save your work as a draft at any time.
          </p>
          <div className="flex flex-col items-start gap-3">
            <Button variant="primary" onClick={() => go({ name: 'wizard' })}>
              <Plus size={15} /> Create your first job
            </Button>
            <button type="button" onClick={() => setGuideOpen(true)} className="text-[13px] font-semibold text-[#3c77f6] hover:underline">
              See how employer hiring works →
            </button>
            <p className="text-[12px] text-[#5a6172]">No credits are used while drafting. Publishing a job is free.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3" aria-hidden>
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 bg-white border border-[#e1e4ea] rounded-xl p-3 flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#1e232f]"><span className="w-1.5 h-1.5 rounded-full bg-[#3c77f6]" />Job description</span>
              <span className="h-2 rounded bg-[#dbe5fb] w-2/3" />
              <span className="h-2 rounded bg-[#e1e4ea] w-full" />
              <span className="h-2 rounded bg-[#e1e4ea] w-4/5" />
            </div>
            <div className="col-span-2 bg-[#e8f7ee] border border-[#bbf7d0] rounded-xl p-3 flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#1e232f]"><CheckCircle2 size={14} className="text-[#15a560]" />Ready to publish</span>
              <span className="h-2 rounded bg-[#bbf7d0] w-full" />
              <span className="h-2 rounded bg-[#bbf7d0] w-2/3" />
            </div>
          </div>
          <div className="bg-white border border-[#e1e4ea] rounded-xl p-3 flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#1e232f]"><span className="w-1.5 h-1.5 rounded-full bg-[#3c77f6]" />AI interview questions</span>
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className="flex items-center gap-2">
                <span className="text-[10px] text-[#5a6172] w-3">{n}</span>
                <span className="h-2 rounded bg-[#e1e4ea] flex-1" />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        <Card>
          <SectionTitle title="Employer setup" subtitle="Complete these steps to start receiving candidates." />
          <div className="mt-4 flex flex-col gap-1.5">
            <span className="text-[12px] text-[#1e232f] font-medium">{doneCount} of {steps.length} complete</span>
            <div className="h-2 rounded-full bg-[#e1e4ea] overflow-hidden">
              <div className="h-full bg-[#15a560] rounded-full" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {steps.map((s, i) => (
              <div key={s.title} className="bg-[#f6f7f9] rounded-lg px-3 py-2.5 flex items-start gap-3">
                <span className={cx('w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[11px] mt-0.5', s.done ? 'text-[#15a560]' : 'bg-white border border-[#e1e4ea] text-[#5a6172]')}>
                  {s.done ? <Check size={14} /> : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#1e232f]">{s.title}</p>
                  {s.body && <p className="text-[12px] text-[#5a6172] mt-0.5">{s.body}</p>}
                </div>
                {s.done ? (
                  <span className="text-[12px] font-medium text-[#15a560]">Complete</span>
                ) : s.action ? (
                  <button type="button" onClick={s.action.onClick} className="text-[12px] font-medium text-[#3c77f6] hover:underline">{s.action.label}</button>
                ) : (
                  <span className="text-[12px] text-[#5a6172]">{s.note}</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle
            title="How hiring works"
            right={<button type="button" onClick={() => setGuideOpen(true)} className="text-[12px] font-medium text-[#3c77f6] hover:underline">Open guide →</button>}
          />
          <div className="mt-4 flex flex-col gap-2">
            {[
              { t: 'Publish a job', b: 'Add the role details and confirm the structured AI interview.' },
              { t: 'Candidates interview', b: 'Applicants complete the same structured interview and are ranked by score.' },
              { t: 'Review and decide', b: 'Unlock reports, contact candidates, and move them forward or reject them.' },
            ].map((s, i) => (
              <div key={s.t} className="bg-[#f6f7f9] rounded-lg px-3 py-2.5 flex gap-3">
                <span className="w-6 h-6 rounded-md bg-[#e6edfa] text-[#3c77f6] text-[12px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                <div>
                  <p className="text-[13px] font-semibold text-[#1e232f]">{s.t}</p>
                  <p className="text-[12px] text-[#5a6172] mt-0.5">{s.b}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[#1e232f] text-[16px] font-semibold">What happens after you publish</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Users size={14} />, t: 'Candidates apply', b: 'Applicants complete the structured AI interview for your role.' },
            { icon: <Trophy size={14} />, t: 'Rankings update', b: 'Candidates appear in a live ranking that updates when a new attempt is submitted.' },
            { icon: <Check size={14} />, t: 'You review and decide', b: 'Unlock detailed reports, contact candidates, and move them forward or reject them.' },
          ].map((c) => (
            <Card key={c.t} className="p-5 flex flex-col gap-2">
              <span className="w-7 h-7 rounded-md bg-[#eef4ff] text-[#3c77f6] flex items-center justify-center">{c.icon}</span>
              <p className="text-[14px] font-semibold text-[#1e232f] mt-1">{c.t}</p>
              <p className="text-[13px] text-[#5a6172]">{c.b}</p>
            </Card>
          ))}
        </div>
      </div>

      <HiringGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onFinish={() => {
          setGuideOpen(false);
          go({ name: 'wizard' });
        }}
      />

      <Card>
        <SectionTitle title="My Jobs" />
        <div className="mt-4 bg-[#f6f7f9] rounded-xl py-10 flex flex-col items-center gap-2 text-center">
          <p className="text-[22px] font-semibold text-[#1e232f]">No jobs yet</p>
          <p className="text-[14px] text-[#5a6172]">Create the first job to start receiving candidates.</p>
          <Button variant="primary" className="mt-2" onClick={() => go({ name: 'wizard' })}>
            <Plus size={15} /> Create your first job
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Regular dashboard ───────────────────────────────────────────────────────

export function DashboardView({ live }: { live?: LiveDashboard } = {}) {
  const { company, jobs, candidatesFor, go } = useEmployerStore();
  const [metric, setMetric] = useState<Metric>('applications');
  const [range, setRange] = useState<Range>('30d');
  const mockStats = useCompanyStats(jobs, candidatesFor);
  const stats = live
    ? { ...mockStats, open: live.open, scheduled: live.scheduled, interviews: live.interviewsCompleted ?? mockStats.interviews }
    : mockStats;
  const [guideOpen, setGuideOpen] = useState(false);

  const series = useMemo(() => seriesFor(metric, range), [metric, range]);
  const total = Math.round(series.reduce((s, p) => s + p.value, 0));
  const avg = (total / series.length).toFixed(1);

  if (live ? live.totalJobs === 0 : jobs.length === 0) return <FirstTimeDashboard />;

  const firstName = company.contact.name.trim().split(/\s+/)[0] || 'there';
  const firstOpen = jobs.find((j) => j.status === 'Open' && j.interviewsCompleted > 0);
  const recent = firstOpen ? candidatesFor(firstOpen.id).slice(0, 3) : [];
  const drafts = jobs.filter((j) => j.status === 'Draft');
  const closingSoon = jobs.find((j) => j.status === 'Open' && j.interviewsCompleted > 0);

  const attention: DashboardAttention[] = [];
  if (live) attention.push(...live.attention);
  else if (closingSoon) {
    attention.push({
      title: `${closingSoon.title} closes ${applicationWindowLabel(closingSoon).replace('Closes ', '')}`,
      body: `${closingSoon.interviewsCompleted} candidates have completed the interview.`,
      action: 'Review',
      tone: 'amber',
      onClick: () => go({ name: 'board', jobId: closingSoon.id }),
    });
  }
  if (stats.pending > 0) {
    attention.push({
      title: `${stats.pending} candidate${stats.pending === 1 ? ' is' : 's are'} waiting for a decision`,
      body: 'These candidates are unlocked but undecided.',
      action: 'Review',
      tone: 'gray',
      onClick: () => go({ name: 'applications' }),
    });
  }
  for (const d of live ? [] : drafts) {
    attention.push({
      title: `${d.title || 'Untitled job'} is still a draft`,
      body: d.lastEditedLabel ?? 'Not published yet.',
      action: 'Continue',
      tone: 'gray',
      onClick: () => go({ name: 'wizard', jobId: d.id }),
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[#1e232f] text-[30px] font-bold leading-9 font-[family-name:var(--font-serif)]">
            {greetingPrefix()}, {firstName}
          </h1>
          <p className="text-[#5a6172] text-[14px] mt-1">Here's what's happening with hiring at {company.name}.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => setGuideOpen(true)}>
            <HelpCircle size={15} /> How hiring works
          </Button>
          <Button variant="primary" onClick={() => go({ name: 'wizard' })}>
            <Plus size={15} /> Post a job
          </Button>
        </div>
        <HiringGuide
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          finishLabel="Post a job"
          onFinish={() => {
            setGuideOpen(false);
            go({ name: 'wizard' });
          }}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Jobs" value={stats.open + stats.scheduled} hint={`${stats.open} open · ${stats.scheduled} scheduled`} icon={<Briefcase size={13} />} />
        <StatCard label="Applicants · Last 30 Days" value={stats.applicants} hint="+18% vs prior period" hintTone="green" icon={<Users size={13} />} />
        <StatCard label="Interviews Completed" value={stats.interviews} hint="8 completed this week" icon={<Check size={13} />} />
        <StatCard label="Decisions Pending" value={stats.pending} hint="Unlocked candidates awaiting a decision" icon={<HelpCircle size={13} />} />
      </div>

      {/* Activity chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex bg-[#f3f4f7] rounded-lg p-1 gap-1">
            {(['applications', 'interviews', 'reports'] as Metric[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={cx('px-3 py-1 rounded-md text-[13px]', metric === m ? 'bg-white text-[#3c77f6] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-[#5a6172]')}
              >
                {m === 'applications' ? 'Applications' : m === 'interviews' ? 'Interviews' : 'Reports unlocked'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {([
              ['7d', 'Last 7 Days'],
              ['30d', 'Last 30 Days'],
              ['3m', 'Last 3 Months'],
            ] as [Range, string][]).map(([r, label]) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cx('px-2.5 py-1 rounded-md text-[13px]', range === r ? 'bg-[#eef4ff] text-[#3c77f6] font-medium' : 'text-[#5a6172] hover:text-[#1e232f]')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <div className="bg-[#f3f4f7] rounded-lg px-3 py-2 min-w-[140px]">
            <p className="text-[11px] text-[#5a6172]">Total {metric === 'applications' ? 'Applications' : metric === 'interviews' ? 'Interviews' : 'Reports unlocked'}:</p>
            <p className="text-[18px] font-semibold text-[#1e232f]">{total}</p>
          </div>
          <div className="bg-[#f3f4f7] rounded-lg px-3 py-2 min-w-[140px]">
            <p className="text-[11px] text-[#5a6172]">Daily Average:</p>
            <p className="text-[18px] font-semibold text-[#1e232f]">{avg}</p>
          </div>
        </div>
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="empDashFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3c77f6" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#3c77f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#eef0f3" />
              <XAxis dataKey="day" hide />
              <YAxis hide allowDecimals={false} />
              <Tooltip formatter={(v) => [v, 'Count']} labelFormatter={(l) => `Day ${l}`} />
              <Area type="linear" dataKey="value" stroke="#3c77f6" strokeWidth={2} fill="url(#empDashFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="flex items-center gap-1.5 text-[12px] text-[#5a6172] mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3c77f6]" /> {METRIC_LABEL[metric]}
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Needs attention */}
        <Card className="p-4 flex flex-col gap-3">
          <SectionTitle title="Needs Attention" right={<Bell size={16} className="text-[#d98c00]" />} />
          {attention.length === 0 && <p className="text-[13px] text-[#5a6172]">Nothing needs attention right now.</p>}
          {attention.map((a) => (
            <div key={a.title} className={cx('rounded-lg px-3 py-2.5 border', a.tone === 'amber' ? 'bg-[#fffbeb] border-[#fde68a]' : 'bg-[#f6f7f9] border-transparent')}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-[#1e232f]">{a.title}</p>
                <button type="button" onClick={a.onClick} className="text-[12px] font-medium text-[#3c77f6] hover:underline shrink-0">{a.action}</button>
              </div>
              <p className="text-[12px] text-[#5a6172] mt-0.5">{a.body}</p>
            </div>
          ))}
        </Card>

        {/* Pipeline */}
        <Card className="p-4 flex flex-col gap-2">
          <SectionTitle
            title="Candidate Pipeline"
            right={<button type="button" onClick={() => go({ name: 'applications' })} className="text-[12px] font-medium text-[#3c77f6] hover:underline">View candidates →</button>}
          />
          {[
            { k: 'Applicants', v: stats.applicants },
            { k: 'Interviews Completed', v: stats.interviews, hl: true },
            { k: 'Reports Unlocked', v: stats.unlocked },
          ].map((r) => (
            <div key={r.k} className={cx('flex justify-between rounded-lg px-3 py-2 text-[13px]', r.hl ? 'bg-[#eef4ff] text-[#3c77f6]' : 'bg-[#f6f7f9] text-[#1e232f]')}>
              <span>{r.k}</span>
              <span className="font-semibold">{r.v}</span>
            </div>
          ))}
          <div className="h-px bg-[#e1e4ea] my-2" />
          <p className="text-[13px] font-semibold text-[#1e232f]">Decision breakdown</p>
          {[
            { k: 'Pending Decision', v: stats.pending, amber: true },
            { k: 'Moved Forward', v: stats.moved },
            { k: 'Rejected', v: stats.rejected },
          ].map((r) => (
            <div key={r.k} className={cx('flex justify-between rounded-lg px-3 py-2 text-[13px]', r.amber ? 'bg-[#fffbeb] text-[#d98c00]' : 'bg-[#f6f7f9] text-[#1e232f]')}>
              <span>{r.k}</span>
              <span className="font-semibold">{r.v}</span>
            </div>
          ))}
          <p className="text-[11px] text-[#5a6172] mt-1">{stats.contacted} candidates contacted</p>
        </Card>

        {/* Recent candidates */}
        <Card className="p-4 flex flex-col gap-3">
          <SectionTitle
            title={
              <span className="flex items-center gap-2">
                Recent Candidates <Pill tone="blue">Live ranking</Pill>
              </span>
            }
            right={
              firstOpen && (
                <button type="button" onClick={() => go({ name: 'board', jobId: firstOpen.id })} className="text-[12px] font-medium text-[#3c77f6] hover:underline">
                  View all →
                </button>
              )
            }
          />
          {recent.length === 0 && <p className="text-[13px] text-[#5a6172]">No completed interviews yet.</p>}
          {recent.map((c, i) => (
            <div key={c.id} className="bg-[#f6f7f9] rounded-lg px-3 py-2.5 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-[#3c77f6] bg-white rounded px-1.5 py-0.5">#{i + 1}</span>
                <span className={cx('w-3 h-3 rounded-full', c.unlocked ? 'bg-[#3c77f6]' : 'bg-[#4d525e]')} />
                <span className="text-[13px] font-semibold text-[#1e232f] flex-1 truncate">{c.unlocked ? c.name : c.anonLabel}</span>
                <span className={cx('text-[10px] font-medium', c.unlocked ? 'text-[#15a560]' : 'text-[#5a6172]')}>{c.unlocked ? 'Unlocked' : 'Locked'}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#5a6172]">
                  {firstOpen?.title} · Score {c.score}
                  {c.rankDelta ? ` · ↑${c.rankDelta}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => go(c.unlocked ? { name: 'report', jobId: c.jobId, candidateId: c.id } : { name: 'board', jobId: c.jobId })}
                  className="text-[#3c77f6] font-medium hover:underline"
                >
                  {c.unlocked ? 'View report' : 'Unlock'}
                </button>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-[#5a6172] mt-auto">Live rankings update when candidates submit a new attempt.</p>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle
          title="My Jobs"
          right={<button type="button" onClick={() => go({ name: 'jobs' })} className="text-[13px] font-medium text-[#3c77f6] hover:underline">View all jobs</button>}
        />
        <div className="mt-4">
          {live ? live.jobsTable : <JobsTable jobs={jobs.filter((j) => j.status !== 'Closed').slice(0, 5)} />}
        </div>
      </Card>

      <p className="flex items-center gap-1.5 text-[11px] text-[#9ba1b0]">
        <ClipboardList size={12} /> Trend figures (+18%, completed this week) are placeholders until the employer API exists.
      </p>
    </div>
  );
}
