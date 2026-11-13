import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { Button, Card, Pill, statusTone } from '@/components/admin/console/pages/employer/ui';
import type { EmployerView } from '@/components/admin/console/pages/employer/types';
import { DashboardView, type DashboardAttention, type LiveDashboard, type LiveDashboardStats } from '@/components/admin/console/pages/employer/views/DashboardView';
import {
  getBoardSummary,
  getEmployerDashboard,
  listBoardCandidates,
  listJobs,
  type BoardCandidate,
  type EmployerDashboardData,
  type JobList,
  type JobListItem,
} from './employerApi';
import { LOW_REPORT_UNLOCKS, reportUnlocksLeft, useEmployerCredits } from './creditsContext';
import { formatInZone, jobStatusOf } from './jobMapping';

// Employer dashboard: the design's dashboard on real data.
// - GET /employer/dashboard (#326): stat cards, the activity chart (daily),
//   the pipeline, the decision breakdown and "waiting for a decision". If it
//   fails, those blocks are hidden; the rest still shows.
// - GET /employer/jobs: total jobs (first-time state), "needs attention"
//   (jobs closing within a week, drafts) and the My Jobs table.
// - Recent candidates: top 3 of the board of recentCandidatesJobId (GET
//   .../candidates). Never POST .../board/visits from here: that would reset
//   the job's New count and rank movement before the employer saw the board.
// - "Report credits are running low": reportUnlocksLeft (credits context).

const WEEK_MS = 7 * 86_400_000;

type Loaded = {
  counts: JobList['counts'];
  recent: JobListItem[];
  closing: JobListItem[];
  drafts: JobListItem[];
  dash: EmployerDashboardData | null;
  board: { jobId: string; jobTitle: string; candidates: BoardCandidate[] } | null;
};

const viewerZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

async function recentBoard(jobId: string, known: JobListItem[]): Promise<Loaded['board']> {
  const [page, title] = await Promise.all([
    listBoardCandidates(jobId, { report: 'ALL', page: 0 }),
    known.find((j) => j.jobId === jobId)?.title ?? getBoardSummary(jobId).then((s) => s.job.title),
  ]);
  return { jobId, jobTitle: title, candidates: page.content.slice(0, 3) };
}

async function load(): Promise<Loaded> {
  const [all, closing, drafts, dash] = await Promise.all([
    listJobs({ status: 'ALL', sort: 'RECENTLY_UPDATED', page: 0 }),
    listJobs({ status: 'ACTIVE', sort: 'CLOSING_SOON', page: 0 }),
    listJobs({ status: 'DRAFT', sort: 'RECENTLY_UPDATED', page: 0 }),
    getEmployerDashboard(viewerZone()).catch(() => null),
  ]);
  const board = dash?.recentCandidatesJobId ? await recentBoard(dash.recentCandidatesJobId, [...all.items, ...closing.items]).catch(() => null) : null;
  return { counts: all.counts, recent: all.items, closing: closing.items, drafts: drafts.items, dash, board };
}

function liveStats(d: EmployerDashboardData): LiveDashboardStats {
  return {
    applicantsTotal: d.applicants.totalCount,
    applicantsLast30: d.applicants.last30DaysCount,
    applicantsPrior30: d.applicants.prior30DaysCount,
    interviewsCompleted: d.interviews.completedCount,
    interviewsLast7Days: d.interviews.completedLast7DaysCount,
    reportsUnlocked: d.unlockedReportCount,
    pending: d.decisions.pendingCount,
    movedForward: d.decisions.movedForwardCount,
    rejected: d.decisions.rejectedCount,
    contacted: d.decisions.contactedCount,
    daily: d.daily.map((x) => ({ date: x.date, applications: x.applicationCount, interviews: x.interviewCount, reports: x.reportUnlockCount })),
  };
}

function windowLabel(j: JobListItem): string {
  const short = (iso: string | null) => formatInZone(iso, j.timezone, false).replace(/, \d{4}$/, '');
  if (j.status === 'OPEN') return j.closesAt ? `Closes ${short(j.closesAt)}` : 'Open';
  if (j.status === 'SCHEDULED') return j.opensAt ? `Opens ${short(j.opensAt)}` : 'Scheduled';
  if (j.status === 'CLOSED') return j.closedAt || j.closesAt ? `Closed ${short(j.closedAt ?? j.closesAt)}` : 'Closed';
  return 'Not set';
}

// Same columns as the admin JobsTable; Unlocked = the job's unlockedCount.
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
                <td className="px-4 py-3.5 text-center text-[#1e232f]">{published ? (j.unlockedCount ?? '-') : '-'}</td>
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
  const { credits, plan } = useEmployerCredits();
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

  const unlocksLeft = reportUnlocksLeft(credits, plan);
  if (unlocksLeft !== null && unlocksLeft <= LOW_REPORT_UNLOCKS) {
    attention.unshift({
      title: 'Report credits are running low',
      body: `${unlocksLeft} report unlock${unlocksLeft === 1 ? '' : 's'} left${plan?.status === 'past_due' ? ' (prepaid credits only while your payment is past due)' : ''}.`,
      action: 'Manage plan',
      tone: 'amber',
      onClick: () => go({ name: 'plan' }),
    });
  }

  // Open/scheduled from the dashboard; without it, from the jobs lists
  // (counts.active doesn't split them: count SCHEDULED on the ACTIVE page).
  const scheduledSeen = data.closing.filter((j) => j.status === 'SCHEDULED').length;
  const open = data.dash ? data.dash.jobs.openCount : data.counts.active - scheduledSeen;
  const scheduled = data.dash ? data.dash.jobs.scheduledCount : scheduledSeen;
  const b = data.board;
  const live: LiveDashboard = {
    totalJobs: data.counts.total,
    open,
    scheduled,
    stats: data.dash ? liveStats(data.dash) : null,
    recent: b
      ? {
          jobId: b.jobId,
          jobTitle: b.jobTitle,
          candidates: b.candidates.map((c) => ({
            id: c.applicationId,
            rank: c.rank,
            label: c.candidate.label,
            unlocked: c.reportStatus === 'UNLOCKED',
            score: c.score,
            movement: c.movement,
          })),
        }
      : null,
    attention,
    jobsTable: <LiveJobsTable jobs={data.recent.filter((j) => j.status !== 'CLOSED').slice(0, 5)} />,
  };
  return <DashboardView live={live} />;
}
