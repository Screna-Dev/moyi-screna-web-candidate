import type { Candidate, HiringDecision } from '@/components/admin/console/pages/employer/types';
import { mockCandidates } from '@/components/admin/console/pages/employer/mockData';
import type { BoardCandidate, CandidateReport, HiringStatus } from './employerApi';
import { formatInZone, zoneAbbr } from './jobMapping';

// Mapping helpers for the employer-app Applications / board / report / contact
// views (backend guide frontend-employer-board-api.md).

export const decisionOf = (s: HiringStatus): HiringDecision => (s === 'MOVED_FORWARD' ? 'moved_forward' : s === 'REJECTED' ? 'rejected' : 'pending');

// "Sep 17" in the job's zone.
export const shortDate = (iso: string | null, tz: string | null) =>
  iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: tz || undefined }).format(new Date(iso)) : '';

// "Nov 7, 2026 at 5:00 PM CST" in the job's zone.
export const dateTimeAt = (iso: string | null, tz: string | null) => formatInZone(iso, tz).replace(/, (\d{1,2}:\d{2})/, ' at $1');

// "Nov 7, 2026 5:00 PM CST" for the closing line.
export const closingLabel = (iso: string | null, tz: string | null) => (iso ? `${formatInZone(iso, tz).replace(/, (\d{1,2}:\d{2})/, ' $1')}` : 'Not set');

// The candidate-facing job page, for "Copy job link".
export const jobLinkOf = (jobId: string) => `${window.location.origin}/opportunities/job/${encodeURIComponent(jobId)}`;

// The viewer's own zone, for times the API sends without a job zone (report).
export function browserZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export const zoneOf = (tz: string | null) => (tz ? zoneAbbr(tz) : '');

// "Updated just now" / "Updated 5 min ago" / "Updated Oct 9".
export function updatedLabel(iso: string | null, now = Date.now()): string {
  if (!iso) return 'Updated just now';
  const mins = Math.floor((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  return `Updated ${shortDate(iso, null)}`;
}

// The board's 4-segment "Interview Performance" bar: one segment per scored
// criterion, coloured by score.
export function performanceOf(row: Pick<BoardCandidate, 'criteria'>): Candidate['performance'] {
  return row.criteria
    .filter((c) => c.score !== null)
    .slice(0, 4)
    .map((c) => ((c.score as number) >= 80 ? 'green' : (c.score as number) >= 70 ? 'amber' : 'orange'));
}

export function weakestLabelOf(row: Pick<BoardCandidate, 'weakestCriterion' | 'minCriterionScore'>): string {
  if (row.weakestCriterion) return `${row.weakestCriterion.name}: ${row.weakestCriterion.score}`;
  return row.minCriterionScore !== null ? `All criteria ${row.minCriterionScore}+` : '';
}

// ─── Design sample data ───────────────────────────────────────────────────────
// The AI doesn't assess screening criteria this release: the API returns
// {met: 0, total: 0}. Per the "design first" rule the board column and report
// section stay, filled from the design's sample candidates (by rank). Replace
// before launch; every use is marked SAMPLE.

const sampleFor = (rank: number) => mockCandidates[(Math.max(1, rank) - 1) % 31];

// SAMPLE when the API has no screening result.
export function screeningOf(row: Pick<BoardCandidate, 'screening' | 'rank'>): { met: number; total: number; sample: boolean } {
  if (row.screening.total > 0) return { ...row.screening, sample: false };
  const s = sampleFor(row.rank);
  return { met: s.screeningMet, total: s.screeningTotal, sample: true };
}

// SAMPLE when the API has no screening items.
export function reportScreeningOf(report: Pick<CandidateReport, 'screening' | 'rank'>): {
  met: number;
  total: number;
  items: { label: string; met: boolean }[];
  sample: boolean;
} {
  if (report.screening.total > 0) {
    return { met: report.screening.met, total: report.screening.total, items: report.screening.items.map((i) => ({ label: i.text, met: i.met })), sample: false };
  }
  const s = sampleFor(report.rank.position);
  return { met: s.screeningMet, total: s.screeningTotal, items: s.screening, sample: true };
}

// "4:25" from seconds.
export const clock = (secs: number | null) => (secs === null ? '0:00' : `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`);
