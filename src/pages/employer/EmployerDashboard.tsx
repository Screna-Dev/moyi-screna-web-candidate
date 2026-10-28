import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { Button, Card, Pill, statusTone } from '@/components/admin/console/pages/employer/ui';
import type { EmployerView } from '@/components/admin/console/pages/employer/types';
import { DashboardView, type DashboardAttention, type LiveDashboard } from '@/components/admin/console/pages/employer/views/DashboardView';
import { listJobs, type JobList, type JobListItem } from './employerApi';
import { formatInZone, jobStatusOf } from './jobMapping';

// Employer dashboard: the design's dashboard, with GET /employer/jobs feeding
// what it can: open/scheduled counts, interviews completed (completedCount
// summed over every job), "needs attention" (jobs closing within a week,
// drafts) and the My Jobs table. Applicant trends, decisions, the activity
// chart, the pipeline and recent candidates keep the design's sample data
// until the board/reporting endpoints exist.

const WEEK_MS = 7 * 86_400_000;
const MAX_PAGES = 20; // 200 jobs; enough to total interviews for any real account

type Loaded = { counts: JobList['counts']; recent: JobListItem[]; closing: JobListItem[]; drafts: JobListItem[]; interviews: number | null; open: number };

async function totalInterviews(): Promise<number | null> {
  let sum = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await listJobs({ status: 'ALL', sort: 'RECENTLY_UPDATED', page });
    sum += res.items.reduce((s, j) => s + (j.completedCount ?? 0), 0);
    if (res.pageMeta.last || res.items.length === 0) return sum;
  }
  return null; // more jobs than we page through: don't show a partial total
}

async function load(): Promise<Loaded> {
  const [all, closing, drafts, interviews] = await Promise.all([
    listJobs({ status: 'ALL', sort: 'RECENTLY_UPDATED', page: 0 }),
    listJobs({ status: 'ACTIVE', sort: 'CLOSING_SOON', page: 0 }),
    listJobs({ status: 'DRAFT', sort: 'RECENTLY_UPDATED', page: 0 }),
    totalInterviews().catch(() => null),
  ]);
  // counts.active doesn't split OPEN/SCHEDULED; count them on the ACTIVE list
  // (exact up to 10 active jobs, then the rest are counted as open).
  const scheduledSeen = closing.items.filter((j) => j.status === 'SCHEDULED').length;
  return { counts: all.counts, recent: all.items, closing: closing.items, drafts: drafts.items, interviews, open: all.counts.active - scheduledSeen };
}

function windowLabel(j: JobListItem): string {
  const short = (iso: string | null) => formatInZone(iso, j.timezone, false).replace(/, \d{4}$/, '');
  if (j.status === 'OPEN') return j.closesAt ? `Closes ${short(j.closesAt)}` : 'Open';
  if (j.status === 'SCHEDULED') return j.opensAt ? `Opens ${short(j.opensAt)}` : 'Scheduled';
  if (j.status === 'CLOSED') return j.closedAt || j.closesAt ? `Closed ${short(j.closedAt ?? j.closesAt)}` : 'Closed';
  return 'Not set';
}

// Same columns as the admin JobsTable. "Unlocked" needs the board API.
function LiveJobsTable({ jobs }: { jobs: JobListItem[] }) {
  const { go } = useEmployerStore();
  if (jobs.length === 0) return <p className="text-[13px] text-[#5a6172]">No active jobs or drafts.</p>;
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
            <th className="text-right font-medium px-4 py-3 rounded-r-lg">Next Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => {
            const status = jobStatusOf(j.status);
            const published = j.status !== 'DRAFT';
            // Design labels (admin nextAction). Board links open the candidate board.
            const action: { label: string; view: EmployerView } =
              j.status === 'OPEN'
                ? { label: j.completedCount > 0 ? 'Review candidates' : 'View progress', view: { name: 'board', jobId: j.jobId } }
                : j.status === 'SCHEDULED'
                  ? { label: 'Edit', view: { name: 'wizard', jobId: j.jobId } }
                  : j.status === 'CLOSED'
                    ? { label: 'View candidates', view: { name: 'board', jobId: j.jobId } }
                    : { label: 'Continue editing', view: { name: 'wizard', jobId: j.jobId } };
            return (
              <tr key={j.jobId} className="border-b border-[#eef0f3] last:border-0">
                <td className="px-4 py-3.5 font-semibold text-[#1e232f]">{j.title || 'Untitled job'}</td>
                <td className="px-4 py-3.5">
                  <Pill tone={statusTone(status)}>{status}</Pill>
                </td>
                <td className="px-4 py-3.5 text-[#5a6172]">{windowLabel(j)}</td>
                <td className="px-4 py-3.5 text-center text-[#1e232f]">{published ? j.applicationCount : '-'}</td>
                <td className="px-4 py-3.5 text-center text-[#1e232f]">{published ? j.completedCount : '-'}</td>
                {/* Unlocked needs the board API; sample 0 until then. */}
                <td className="px-4 py-3.5 text-center text-[#1e232f]">{published ? 0 : '-'}</td>
                <td className="px-4 py-3.5 text-right">
                  <button type="button" onClick={() => go(action.view)} className="text-[#3c77f6] font-medium hover:underline">
                    {action.label}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EmployerDashboard() {
  const { go } = useEmployerStore();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    load()
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (failed) {
    return (
      <Card className="p-10 flex flex-col items-center gap-3 text-center">
        <p className="text-[16px] font-semibold text-[#1e232f]">We couldn't load your dashboard</p>
        <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
      </Card>
    );
  }
  if (!data) {
    return (
      <p className="flex items-center justify-center gap-2 py-24 text-[14px] text-[#5a6172]">
        <Loader2 size={15} className="animate-spin" /> Loading dashboard…
      </p>
    );
  }

  const attention: DashboardAttention[] = [];
  const soon = data.closing.filter((j) => j.status === 'OPEN' && j.closesAt && Date.parse(j.closesAt) - Date.now() < WEEK_MS);
  for (const j of soon.slice(0, 2)) {
    attention.push({
      title: `${j.title} closes ${formatInZone(j.closesAt, j.timezone)}`,
      body: `${j.completedCount} candidate${j.completedCount === 1 ? ' has' : 's have'} completed the interview.`,
      action: 'Review',
      tone: 'amber',
      onClick: () => go({ name: 'board', jobId: j.jobId }),
    });
  }
  for (const d of data.drafts.slice(0, 3)) {
    attention.push({
      title: `${d.title || 'Untitled job'} is still a draft`,
      body: `Last edited ${formatInZone(d.updatedAt, Intl.DateTimeFormat().resolvedOptions().timeZone, false)}.`,
      action: 'Continue',
      tone: 'gray',
      onClick: () => go({ name: 'wizard', jobId: d.jobId }),
    });
  }

  const live: LiveDashboard = {
    totalJobs: data.counts.total,
    open: data.open,
    scheduled: data.counts.active - data.open,
    interviewsCompleted: data.interviews,
    attention,
    jobsTable: <LiveJobsTable jobs={data.recent.filter((j) => j.status !== 'CLOSED').slice(0, 5)} />,
  };
  return <DashboardView live={live} />;
}
