// Mentorship enums shared by every mentor surface (discovery lists, mentor
// detail, mentor dashboard profile, admin console).
//
// The backend switched from the free-text `expertiseTags` to two closed enums
// on 2026-08-10:
//   - `services`    (ServiceType[])  — what a mentor offers; replaces expertiseTags
//   - `disciplines` (Discipline[])   — what field they work in; replaces the old
//                                     free-text `role` search param
// Both are now listing requirements: a mentor with an empty `services` or
// `disciplines` stays PENDING and is neither filterable nor bookable.
//
// Always send the enum value, never a display label — the API 400s on anything
// outside these sets.

// ─── Discipline ───────────────────────────────────────────────────────────────

export const DISCIPLINES = [
  'SOFTWARE_ENGINEERING',
  'PRODUCT_MANAGEMENT',
  'DATA_SCIENCE',
  'DESIGN',
  'ENGINEERING_MANAGEMENT',
] as const;

export type Discipline = (typeof DISCIPLINES)[number];

// Enum → human label. Keys match the labels the discovery filter bars already
// rendered when this was the free-text `role` param, so the filter UI is
// unchanged by the migration.
export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  SOFTWARE_ENGINEERING: 'Software Engineering',
  PRODUCT_MANAGEMENT: 'Product Management',
  DATA_SCIENCE: 'Data Science',
  DESIGN: 'Design',
  ENGINEERING_MANAGEMENT: 'Eng. Management',
};

// ─── ServiceType ──────────────────────────────────────────────────────────────

export const SERVICE_TYPES = [
  'MOCK_INTERVIEW',
  'RESUME_REVIEW',
  'PORTFOLIO_REVIEW',
  'BEHAVIORAL_COACHING',
  'CAREER_TRANSITION',
  'JOB_SEARCH_STRATEGY',
  'PROFESSIONAL_SKILLS',
  'OFFER_NEGOTIATION',
  'ONBOARDING_FIRST_90_DAYS',
  'CAREER_GROWTH_PROMOTION',
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  MOCK_INTERVIEW: 'Mock Interview',
  RESUME_REVIEW: 'Resume Review',
  PORTFOLIO_REVIEW: 'Portfolio Review',
  BEHAVIORAL_COACHING: 'Behavioral Coaching',
  CAREER_TRANSITION: 'Career Transition',
  JOB_SEARCH_STRATEGY: 'Job Search Strategy',
  PROFESSIONAL_SKILLS: 'Professional Skills',
  OFFER_NEGOTIATION: 'Offer Negotiation',
  ONBOARDING_FIRST_90_DAYS: 'Onboarding & First 90 Days',
  CAREER_GROWTH_PROMOTION: 'Career Growth & Promotion',
};

// Grouping used by the mentor dashboard's service-type chip picker.
export const SERVICE_TYPE_GROUPS: { label: string; options: ServiceType[] }[] = [
  {
    label: 'Job Search',
    options: [
      'MOCK_INTERVIEW',
      'RESUME_REVIEW',
      'PORTFOLIO_REVIEW',
      'BEHAVIORAL_COACHING',
      'CAREER_TRANSITION',
      'JOB_SEARCH_STRATEGY',
      'PROFESSIONAL_SKILLS',
    ],
  },
  {
    label: 'Offer & Career Development',
    options: ['OFFER_NEGOTIATION', 'ONBOARDING_FIRST_90_DAYS', 'CAREER_GROWTH_PROMOTION'],
  },
];

// ─── Years-of-experience bucket (discovery filter only) ───────────────────────

export const YOE_RANGES = ['RANGE_3_5', 'RANGE_6_8', 'RANGE_9_PLUS'] as const;

export type YoeRange = (typeof YOE_RANGES)[number];

// Mentors with a null/unset YoE, or fewer than 3 years, never match a bucket.
export const YOE_RANGE_LABELS: Record<YoeRange, string> = {
  RANGE_3_5: '3–5 yrs',
  RANGE_6_8: '6–8 yrs',
  RANGE_9_PLUS: '9+ yrs',
};

// ─── PhotoStatus (avatar moderation, PR-6) ────────────────────────────────────

// A mentor's avatar must be PHOTO_APPROVED (and resolvable) for them to be
// listed — the 7th listing requirement, alongside admin approval, calendar,
// office hours, price, ≥1 service and ≥1 discipline. Uploading or deleting an
// avatar resets this to PHOTO_REVIEW and temporarily unlists them.
export const PHOTO_STATUSES = ['PHOTO_REVIEW', 'PHOTO_APPROVED', 'PHOTO_REJECTED'] as const;

export type PhotoStatus = (typeof PHOTO_STATUSES)[number];

export const PHOTO_STATUS_LABELS: Record<PhotoStatus, string> = {
  PHOTO_REVIEW: 'Pending review',
  PHOTO_APPROVED: 'Approved',
  PHOTO_REJECTED: 'Rejected',
};

// `statusReason` is normally a machine code, but a rejected photo carries the
// admin's free-text reason instead — so only map the codes we know.
const STATUS_REASON_LABELS: Record<string, string> = {
  PHOTO_PENDING_REVIEW: 'Profile photo pending review',
  'No service type selected': 'No service type selected',
  'No discipline selected': 'No discipline selected',
};

export function statusReasonLabel(reason: string | null | undefined): string {
  if (!reason) return '';
  return STATUS_REASON_LABELS[reason] ?? reason;
}

// ─── Special offer ($1 intro session, PR-5) ───────────────────────────────────

// Release gate. The rollout notes are explicit that BOTH the mentor-side config
// entry and the student-side "book a trial" entry must stay closed until every
// backend service is confirmed upgraded — an older backend ignores
// `isSpecialOffer` and would charge the regular price for a 30-minute trial,
// i.e. the student sees a $1 offer and gets billed full price.
//
// Both call sites are fully implemented and gated on this flag. Flip it to true
// once the backend rollout is verified.
export const SPECIAL_OFFER_ENABLED = false;

// A special-offer slot is always a 30-minute block, even for a 15-minute trial.
export const SPECIAL_OFFER_SLOT_MINUTES = 30;

// ─── LinkedIn URL (PR-5) ──────────────────────────────────────────────────────

// The backend now only accepts personal LinkedIn profile URLs and normalises
// them to https://www.linkedin.com/in/{handle}. Anything that isn't an /in/
// link (company pages, arbitrary URLs) is a 400, so validate before submitting
// rather than letting the request fail.
//
// Accepts: https://www.linkedin.com/in/xxx, linkedin.com/in/xxx (no scheme),
// cn.linkedin.com/in/xxx (regional subdomain); trailing slash and query ignored.
const LINKEDIN_PROFILE_RE = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)*linkedin\.com\/in\/([^/?#]+)/i;

export function normalizeLinkedinUrl(input: string): string | null {
  const match = LINKEDIN_PROFILE_RE.exec(input.trim());
  if (!match) return null;
  const handle = match[1].trim();
  return handle ? `https://www.linkedin.com/in/${handle}` : null;
}

export const LINKEDIN_HINT = 'Enter your personal LinkedIn profile URL (linkedin.com/in/…).';

// ─── Label ↔ enum helpers ─────────────────────────────────────────────────────

function invert<T extends string>(labels: Record<T, string>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(labels).map(([value, label]) => [label as string, value as T]),
  ) as Record<string, T>;
}

export const DISCIPLINE_BY_LABEL = invert(DISCIPLINE_LABELS);
export const SERVICE_TYPE_BY_LABEL = invert(SERVICE_TYPE_LABELS);
export const YOE_RANGE_BY_LABEL = invert(YOE_RANGE_LABELS);

// Display lists for filter dropdowns (human labels, in enum order).
export const DISCIPLINE_OPTION_LABELS = DISCIPLINES.map((d) => DISCIPLINE_LABELS[d]);
export const SERVICE_TYPE_OPTION_LABELS = SERVICE_TYPES.map((s) => SERVICE_TYPE_LABELS[s]);
export const YOE_RANGE_OPTION_LABELS = YOE_RANGES.map((y) => YOE_RANGE_LABELS[y]);

// Render an enum value that came back from the API. Unknown values (a backend
// enum we don't know about yet) degrade to a Title Cased version of the raw
// value rather than leaking SCREAMING_SNAKE_CASE into the UI.
function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function serviceLabel(value: string): string {
  return SERVICE_TYPE_LABELS[value as ServiceType] ?? humanize(value);
}

export function disciplineLabel(value: string): string {
  return DISCIPLINE_LABELS[value as Discipline] ?? humanize(value);
}

// Map a list of API enum values to display labels, dropping empties.
export function serviceLabels(values: string[] | null | undefined): string[] {
  return (values ?? []).filter(Boolean).map(serviceLabel);
}

export function disciplineLabels(values: string[] | null | undefined): string[] {
  return (values ?? []).filter(Boolean).map(disciplineLabel);
}
