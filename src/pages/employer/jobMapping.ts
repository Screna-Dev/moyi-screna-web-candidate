import type { Criterion, EmploymentType, InterviewQuestion, Job, JobStatus, PayPeriod, WorkplaceType } from '@/components/admin/console/pages/employer/types';
import { CURRENCIES, TIME_ZONES, displayToInput, inputToDisplay } from '@/components/admin/console/pages/employer/views/wizard/logic';
import type {
  ApiEmploymentType,
  ApiJob,
  ApiJobStatus,
  ApiSalaryPeriod,
  ApiWorkplaceType,
  AssessmentBody,
  InterviewSettings,
  JobDetailsBody,
} from './employerApi';

// Converts between the employer jobs API and the wizard's Job shape, which the
// admin console's mock flow also uses. Job keeps display labels ("Full-time",
// "Central Time (CT)") and dates as wall-clock display strings in the job's
// time zone; the API uses enums, IANA zones and UTC ISO instants.
// API fields the wizard doesn't edit (seniority, role, skills, summary,
// benefits, passScore, screening criteria…) are carried over from the last
// saved ApiJob so a full-replace PUT doesn't wipe them.

const STATUS: Record<ApiJobStatus, JobStatus> = { DRAFT: 'Draft', SCHEDULED: 'Scheduled', OPEN: 'Open', CLOSED: 'Closed' };

const EMPLOYMENT: Record<ApiEmploymentType, EmploymentType> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  TEMPORARY: 'Temporary',
};

const WORKPLACE: Record<ApiWorkplaceType, WorkplaceType> = { ON_SITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' };

// Wizard label → IANA. An API zone outside this list is shown as the raw IANA name.
const ZONES: Record<string, string> = {
  'Pacific Time (PT)': 'America/Los_Angeles',
  'Mountain Time (MT)': 'America/Denver',
  'Central Time (CT)': 'America/Chicago',
  'Eastern Time (ET)': 'America/New_York',
  UTC: 'UTC',
};

// Interviews are English only (product decision 2026-10-28): the wizard has
// no language field, and every save sends 'en'.
const INTERVIEW_LANGUAGE = { label: 'English', code: 'en' };

function invert<K extends string, V extends string>(m: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<V, K>;
}

const EMPLOYMENT_API = invert(EMPLOYMENT);
const WORKPLACE_API = invert(WORKPLACE);
const ZONE_LABELS = invert(ZONES);

export const jobStatusOf = (s: ApiJobStatus): JobStatus => STATUS[s];
export const workplaceLabel = (w: ApiWorkplaceType | null) => (w ? WORKPLACE[w] : '');

export const timeZoneIana = (label: string) => ZONES[label] ?? label;
const timeZoneLabel = (iana: string | null) => (iana ? ZONE_LABELS[iana] ?? iana : TIME_ZONES[2]);

// The browser's zone when the wizard offers it, else Central (the old default).
export function defaultTimeZoneLabel(): string {
  try {
    return ZONE_LABELS[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? TIME_ZONES[2];
  } catch {
    return TIME_ZONES[2];
  }
}

// ─── Time zones ───────────────────────────────────────────────────────────────

function partsIn(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute'), s: get('second') };
}

// Milliseconds the zone is ahead of UTC at that instant.
function offsetMs(ms: number, tz: string): number {
  const p = partsIn(ms, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000;
}

function safeZone(tz: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

// "2026-11-07T17:00" wall clock in tz → "2026-11-07T23:00:00Z".
export function wallToIso(input: string, tz: string): string | null {
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const zone = safeZone(tz);
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  // Second pass settles instants near a DST change.
  let ms = guess - offsetMs(guess, zone);
  ms = guess - offsetMs(ms, zone);
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

// ISO instant → "2026-11-07T17:00" wall clock in tz.
export function isoToWall(iso: string, tz: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const p = partsIn(ms, safeZone(tz));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

// Job display string ("Nov 07, 2026 05:00 PM", wall clock in the job's zone) → ISO.
export function displayToIso(display: string, timeZone: string): string | null {
  return display ? wallToIso(displayToInput(display), timeZoneIana(timeZone)) : null;
}

const isoToDisplay = (iso: string | null, tz: string) => (iso ? inputToDisplay(isoToWall(iso, tz)) : '');

// "CST" — the zone's short name right now.
export function zoneAbbr(tz: string | null): string {
  const zone = safeZone(tz || 'UTC');
  return new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? zone;
}

// "Nov 7, 2026, 5:00 PM CST" in the job's own zone.
export function formatInZone(iso: string | null, tz: string | null, withTime = true): string {
  if (!iso) return '';
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }
    : { month: 'short', day: 'numeric', year: 'numeric' };
  return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: safeZone(tz || 'UTC') }).format(new Date(iso));
}

// ─── Application window (dates only, per the design) ─────────────────────────
// The wizard picks dates; a job opens at 00:00 on its opening date and closes
// at 23:59 on its closing date, wall clock in the job's zone.

// Today's date (YYYY-MM-DD) in the job's zone.
export function todayIn(timeZone: string): string {
  return isoToWall(new Date().toISOString(), timeZoneIana(timeZone)).slice(0, 10);
}

// "2026-11-07" + n days.
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// "2026-01-31" + n months, clamped to the month's last day ("2026-02-28").
export function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + n, Math.min(d, last))).toISOString().slice(0, 10);
}

// Product rule (2026-10-28): applications stay open at least 3 days and at
// most 1 month after the opening date.
export const MIN_OPEN_DAYS = 3;
export const closingRange = (opens: string) => ({ min: addDays(opens, MIN_OPEN_DAYS), max: addMonths(opens, 1) });

// Job display string → its date (YYYY-MM-DD), '' when unset.
export const dateOf = (display: string) => displayToInput(display).slice(0, 10);

// Date + "HH:MM" → Job display string.
export const withDate = (date: string, time: string) => inputToDisplay(`${date}T${time}`);

// What to send as opensAt. An opening date of today (or earlier) is sent as
// null, which the API reads as "open on publish": a past instant would make
// the job SCHEDULED, which candidates can't see. A later date schedules it.
export function opensAtIso(job: Pick<Job, 'opensAt' | 'timeZone'>): string | null {
  const date = dateOf(job.opensAt);
  if (!date || date <= todayIn(job.timeZone)) return null;
  return displayToIso(job.opensAt, job.timeZone);
}

// Default application window for a new or reposted job: opens today, closes 7
// days later (the design's default), in the job's zone. The API needs a
// closing time to create a draft.
export function defaultWindow(timeZone: string): Pick<Job, 'opensAt' | 'closesAt'> {
  const today = todayIn(timeZone);
  return { opensAt: withDate(today, '00:00'), closesAt: withDate(addDays(today, 7), '23:59') };
}

// ─── ApiJob → Job ─────────────────────────────────────────────────────────────

const orBlank = (items: string[]) => (items.length ? items : ['']);
const money = (n: number | null) => (n == null ? '' : n.toLocaleString('en-US', { maximumFractionDigits: 2 }));
const payPeriodOf = (p: ApiSalaryPeriod | null): PayPeriod => (p === 'HOUR' ? 'Hourly' : 'Annual');

export function apiToJob(api: ApiJob, companyId: string): Job {
  const tz = api.timezone || timeZoneIana(defaultTimeZoneLabel());
  const s = api.interviewSettings;
  const criteria: Criterion[] = api.criteria.map((c) => ({ id: c.id, name: c.name, description: c.description ?? '', source: c.source }));
  const questions: InterviewQuestion[] = [...api.questions]
    .sort((a, b) => a.seq - b.seq)
    .map((q) => ({
      id: q.id,
      text: q.text,
      criteriaIds: q.criterionIds,
      minutes: q.estimatedMinutes ?? 5,
      source: q.source,
      edited: q.edited,
    }));
  return {
    id: api.id,
    companyId,
    status: STATUS[api.status],
    title: api.title ?? '',
    department: api.department ?? '',
    hrContactPhone: '',
    employmentType: EMPLOYMENT[api.employmentType] ?? 'Full-time',
    workplace: WORKPLACE[api.workplaceType] ?? 'Hybrid',
    location: api.location ?? '',
    salaryMin: money(api.salaryMin),
    salaryMax: money(api.salaryMax),
    currency: CURRENCIES.find((c) => c.split(' ')[0] === api.salaryCurrency) ?? api.salaryCurrency ?? CURRENCIES[0],
    payPeriod: payPeriodOf(api.salaryPeriod),
    showSalary: api.showSalary ?? true,
    overview: api.roleOverview ?? '',
    responsibilities: orBlank(api.responsibilities ?? []),
    requirements: orBlank(api.requirements ?? []),
    preferred: api.preferredQualifications ?? [],
    criteria,
    questions,
    interviewLength: s?.durationMinutes ?? 20,
    candidateInstructions: s?.candidateInstructions ?? '',
    language: INTERVIEW_LANGUAGE.label,
    interviewConfirmed: !!api.questionsReviewedAt,
    // A draft without an opening date opens on publish: the design shows today.
    opensAt: api.opensAt ? isoToDisplay(api.opensAt, tz) : api.status === 'DRAFT' ? withDate(todayIn(tz), '00:00') : '',
    closesAt: isoToDisplay(api.closesAt, tz),
    timeZone: timeZoneLabel(api.timezone),
    maxApplicants: api.maxApplicants == null ? '' : String(api.maxApplicants),
    // null until the employer picks one on step 3; nothing is preselected.
    sponsor: s?.interviewPayer === 'CANDIDATE' ? 'candidate' : s?.interviewPayer === 'EMPLOYER' ? 'employer' : null,
    sponsorship: { totalBudget: '', dailyBudget: '', maxCandidates: '', afterLimit: null },
    applicants: 0,
    interviewsCompleted: 0,
    updatedAt: api.updatedAt,
  };
}

// ─── Job → request bodies ─────────────────────────────────────────────────────

const text = (s: string) => s.trim() || null;
const items = (list: string[]) => list.map((s) => s.trim()).filter(Boolean);

function amount(s: string): number | null {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return s.trim() && Number.isFinite(n) ? n : null;
}

export function detailsBody(job: Job, base?: ApiJob | null): JobDetailsBody {
  // Keep a MONTH/WEEK/DAY period the wizard can't show unless the pay period was changed.
  const period: ApiSalaryPeriod =
    base?.salaryPeriod && payPeriodOf(base.salaryPeriod) === job.payPeriod ? base.salaryPeriod : job.payPeriod === 'Hourly' ? 'HOUR' : 'YEAR';
  const max = amount(job.maxApplicants);
  return {
    title: job.title.trim(),
    department: text(job.department),
    employmentType: EMPLOYMENT_API[job.employmentType],
    workplaceType: WORKPLACE_API[job.workplace],
    location: job.location.trim(),
    seniority: base?.seniority ?? null,
    role: base?.role ?? null,
    yearsExperienceMin: base?.yearsExperienceMin ?? null,
    yearsExperienceMax: base?.yearsExperienceMax ?? null,
    skills: base?.skills ?? [],
    salaryMin: amount(job.salaryMin),
    salaryMax: amount(job.salaryMax),
    salaryCurrency: job.currency.split(' ')[0] || null,
    salaryPeriod: period,
    showSalary: job.showSalary,
    summary: base?.summary ?? null,
    roleOverview: job.overview.trim(),
    responsibilities: items(job.responsibilities),
    requirements: items(job.requirements),
    preferredQualifications: items(job.preferred),
    benefits: base?.benefits ?? [],
    opensAt: opensAtIso(job),
    closesAt: displayToIso(job.closesAt, job.timeZone) ?? '',
    timezone: timeZoneIana(job.timeZone),
    maxApplicants: max == null ? null : Math.round(max),
  };
}

// serverIds: ids the backend issued. Anything else is a client-side id for a
// row created in the wizard, so it is sent without an id (= create).
// screeningCriteria is omitted on purpose (= unchanged): the wizard has no UI for it.
// assessmentAreas: the latest from AI question generation, else what was saved.
export function assessmentBody(job: Job, serverIds: Set<string>, assessmentAreas: string[]): AssessmentBody {
  const nameOf = new Map(job.criteria.map((c) => [c.id, c.name.trim()]));
  return {
    criteria: job.criteria.map((c) => ({
      ...(serverIds.has(c.id) ? { id: c.id } : {}),
      name: c.name.trim(),
      description: text(c.description),
      ...(c.source ? { source: c.source } : {}),
    })),
    questions: job.questions.map((q) => ({
      ...(serverIds.has(q.id) ? { id: q.id } : {}),
      text: q.text.trim(),
      estimatedMinutes: Math.min(15, Math.max(1, Math.round(q.minutes))),
      criterionNames: q.criteriaIds.map((id) => nameOf.get(id)).filter((n): n is string => !!n),
      source: q.source ?? 'MANUAL',
      edited: q.source === 'AI' ? !!q.edited : false,
    })),
    assessmentAreas,
  };
}

export function settingsBody(job: Job, base?: ApiJob | null): InterviewSettings {
  return {
    durationMinutes: job.interviewLength,
    language: INTERVIEW_LANGUAGE.code,
    candidateInstructions: text(job.candidateInstructions),
    passScore: base?.interviewSettings?.passScore ?? null,
    interviewPayer: job.sponsor === 'candidate' ? 'CANDIDATE' : job.sponsor === 'employer' ? 'EMPLOYER' : null,
  };
}

export function serverIdsOf(api: ApiJob): Set<string> {
  return new Set([...api.criteria.map((c) => c.id), ...api.questions.map((q) => q.id)]);
}

// AI criterion names come back verbatim: match them to the form's criteria by
// trimmed, case-insensitive name and drop the ones that don't match.
export function criteriaIdsByName(names: string[], criteria: Criterion[]): string[] {
  const byName = new Map(criteria.map((c) => [c.name.trim().toLowerCase(), c.id]));
  return [...new Set(names.map((n) => byName.get(n.trim().toLowerCase())).filter((id): id is string => !!id))];
}
