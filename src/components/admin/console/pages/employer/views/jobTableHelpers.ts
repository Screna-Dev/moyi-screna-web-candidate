import type { Candidate, Job } from '../types';
import type { EmployerView } from '../types';

// Shared by the dashboard "My Jobs" table and the Jobs list.

// "Nov 07, 2026 05:00 PM" → "Nov 07"
function shortDate(s: string) {
  const m = s.match(/^([A-Za-z]{3}) (\d{1,2})/);
  return m ? `${m[1]} ${Number(m[2])}` : s;
}

export function applicationWindowLabel(job: Job): string {
  switch (job.status) {
    case 'Open':
      return job.closesAt ? `Closes ${shortDate(job.closesAt)}` : 'Open';
    case 'Scheduled':
      return job.opensAt ? `Opens ${shortDate(job.opensAt)}` : 'Scheduled';
    case 'Closed':
      return job.closesAt ? `Closed ${shortDate(job.closesAt)}` : 'Closed';
    default:
      return 'Not set';
  }
}

export function unlockedCount(candidates: Candidate[]) {
  return candidates.filter((c) => c.unlocked).length;
}

export function nextAction(job: Job): { label: string; view: EmployerView } {
  switch (job.status) {
    case 'Open':
      return job.interviewsCompleted > 0
        ? { label: 'Review candidates', view: { name: 'board', jobId: job.id } }
        : { label: 'View progress', view: { name: 'board', jobId: job.id } };
    case 'Scheduled':
      return { label: 'Edit', view: { name: 'wizard', jobId: job.id } };
    case 'Closed':
      return { label: 'View candidates', view: { name: 'board', jobId: job.id } };
    default:
      return { label: 'Continue editing', view: { name: 'wizard', jobId: job.id } };
  }
}

// "+12% vs prior period" from the last 30 days vs the 30 before. Hidden
// (null) when the prior period had no applicants: no meaningful percentage.
export function applicantTrend(last30: number, prior30: number): { text: string; tone?: 'green' } | null {
  if (!prior30) return null;
  const pct = Math.round(((last30 - prior30) / prior30) * 100);
  return { text: `${pct > 0 ? '+' : ''}${pct}% vs prior period`, tone: pct > 0 ? 'green' : undefined };
}
