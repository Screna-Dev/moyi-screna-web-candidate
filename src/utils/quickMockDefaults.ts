// ============================================================================
// Quick Mock — one-click defaults.
//
// Spec: "Quick Mock One-Click Redesign" (Shelley Xu, 2026-08-05), with the
// 2026-08-20 product decisions folded in:
//   • every Quick Mock is 3 questions / ~15 minutes (backend guarantees 3)
//   • the difficulty control uses the API's four seniority levels
//   • role comes from the user's own profile selection, not an inferred guess
//   • the level mapping is live, driven by the resume's parsed years
// ============================================================================

// The difficulty vocabulary is the API's `level` enum, so no translation layer:
// what the UI shows is what POST /training-plans/interviews/quick-mock receives.
export type Level = 'Junior' | 'Intermediate' | 'Senior' | 'Staff';
export const LEVELS: Level[] = ['Junior', 'Intermediate', 'Senior', 'Staff'];
export const DEFAULT_LEVEL: Level = 'Intermediate';

// ─────────────────────────────────────────────────────────────────────────────
// Spec Open Question #1 is settled (2026-08-20): the resume's parsed
// `total_years_experience` is trusted, so the mapping runs. Years are the primary
// signal — they're the accurate one — and the title is only allowed to promote
// someone into the Staff band. Anything unparseable falls back to Intermediate.
// ─────────────────────────────────────────────────────────────────────────────

// Explicit staff-band markers only. Deliberately excludes "manager", "director",
// "head" and friends: those are role names, not seniority claims, and matching
// them would push every Product Manager to a senior interview.
const STAFF_TITLE_SIGNALS = /\b(staff|principal|distinguished|fellow)\b/i;
// Used only when the resume has no usable years figure.
const SENIOR_TITLE_SIGNALS = /\b(senior|sr\.?|lead)\b/i;
const JUNIOR_TITLE_SIGNALS = /\b(intern|internship|junior|jr\.?|associate|new\s?grad|graduate|entry[-\s]?level|trainee|apprentice)\b/i;
// "Engineer II" / "PM 2" — mid-level ladder markers.
const MID_TITLE_SIGNALS = /\b(mid[-\s]?level|ii|2)\b/i;

export interface ResumeSignals {
  /** structured_resume.profile.total_years_experience */
  totalYearsExperience?: number | null;
  /** Title of the most recent role (spec: multiple experiences → take the latest). */
  latestTitle?: string | null;
}

export type LevelSource = 'auto' | 'default' | 'manual';

export interface InferredLevel {
  level: Level;
  source: LevelSource;
  /** Why this value — surfaced to the user and useful in analytics. */
  reason: 'years_experience' | 'title_signal' | 'no_resume' | 'unparsed';
}

/**
 * Map resume signals to a level (spec §3, retargeted at the four API values).
 *
 *   under 2 yrs   → Junior
 *   2–5 yrs       → Intermediate
 *   5+ yrs        → Senior
 *   staff·principal·distinguished·fellow in the latest title → Staff
 *
 * Years drive the result because that's the signal product confirmed as reliable;
 * the title can only promote into the Staff band, which years alone can't express.
 * With no years figure the title is the fallback, and anything ambiguous — no
 * resume, failed parse, no usable signal — lands on Intermediate.
 */
export function inferLevel(signals: ResumeSignals | null): InferredLevel {
  const title = (signals?.latestTitle ?? '').trim();
  const years = Number(signals?.totalYearsExperience);
  const hasYears = Number.isFinite(years) && years > 0;

  if (!signals || (!hasYears && !title)) {
    return { level: DEFAULT_LEVEL, source: 'default', reason: 'no_resume' };
  }

  // Staff is a ladder position, not a year count — only the title can say it.
  if (title && STAFF_TITLE_SIGNALS.test(title)) {
    return { level: 'Staff', source: 'auto', reason: 'title_signal' };
  }

  if (hasYears) {
    // A career switcher with 10 years in a new field still maps by years (spec's
    // explicit call) and can override in Adjust settings.
    if (years < 2) return { level: 'Junior', source: 'auto', reason: 'years_experience' };
    if (years < 5) return { level: 'Intermediate', source: 'auto', reason: 'years_experience' };
    return { level: 'Senior', source: 'auto', reason: 'years_experience' };
  }

  if (SENIOR_TITLE_SIGNALS.test(title)) return { level: 'Senior', source: 'auto', reason: 'title_signal' };
  if (JUNIOR_TITLE_SIGNALS.test(title)) return { level: 'Junior', source: 'auto', reason: 'title_signal' };
  if (MID_TITLE_SIGNALS.test(title)) return { level: 'Intermediate', source: 'auto', reason: 'title_signal' };

  return { level: DEFAULT_LEVEL, source: 'default', reason: 'unparsed' };
}

/** Latest experience entry by end date ("Present"/empty ranks newest). */
export function latestExperienceTitle(
  experience: { title?: string; start_date?: string; end_date?: string }[] | null | undefined
): string | null {
  if (!Array.isArray(experience) || experience.length === 0) return null;
  const rank = (e: { end_date?: string }) => {
    const end = (e.end_date ?? '').trim();
    if (!end || /present|current|now/i.test(end)) return Infinity;
    const year = Number(end.match(/\d{4}/)?.[0]);
    return Number.isFinite(year) ? year : -Infinity;
  };
  // Resumes are conventionally newest-first, so a tie keeps the original order.
  const sorted = [...experience].sort((a, b) => rank(b) - rank(a));
  return sorted[0]?.title?.trim() || null;
}

/**
 * Snap a free-text job title onto the question bank's role vocabulary.
 *
 * `role` is sent to the quick-mock endpoint as a plain string and matched against
 * the bank, so an off-vocabulary title ("Growth Product Manager") is a likely
 * 422 not_enough_insights. Exact match wins, then containment either way, then
 * the best word overlap. Returns null when nothing is close enough — callers
 * fall back rather than send a guess.
 */
export function matchRoleToOptions(title: string | null | undefined, options: string[]): string | null {
  const raw = (title ?? '').trim();
  if (!raw || options.length === 0) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const target = norm(raw);

  const exact = options.find((o) => norm(o) === target);
  if (exact) return exact;

  const contains = options.find((o) => {
    const n = norm(o);
    return n.includes(target) || target.includes(n);
  });
  if (contains) return contains;

  const targetWords = new Set(target.split(' ').filter((w) => w.length > 2));
  let best: { option: string; score: number } | null = null;
  for (const option of options) {
    const words = norm(option).split(' ').filter((w) => w.length > 2);
    if (words.length === 0) continue;
    const hits = words.filter((w) => targetWords.has(w)).length;
    const score = hits / words.length;
    if (hits > 0 && (!best || score > best.score)) best = { option, score };
  }
  // Require more than half of the option's words, so one shared head noun isn't
  // enough — "Sales Manager" must not resolve to "Product Manager". Missing a
  // fuzzy match is fine (the caller falls back); interviewing someone for the
  // wrong role is not.
  return best && best.score >= 0.6 ? best.option : null;
}

/** Most frequent role among a company's posts — the spec's role fallback. */
export function mostCommonRole(roles: (string | null | undefined)[]): string | null {
  const counts = new Map<string, number>();
  for (const r of roles) {
    const role = (r ?? '').trim();
    if (!role) continue;
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  let best: { role: string; n: number } | null = null;
  for (const [role, n] of counts) {
    if (!best || n > best.n) best = { role, n };
  }
  return best?.role ?? null;
}

/** URL/analytics id for a company name (matches the interview-insights slugs). */
export function companySlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
