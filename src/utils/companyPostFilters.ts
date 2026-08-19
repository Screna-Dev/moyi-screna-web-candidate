// Per-company toolbar state (filters + sort + search) for the Interview Insights
// company page (`/interview-insights/:companyId`).
//
// Opening a post navigates to a separate route (`/experience/:id`), which unmounts
// the company page and threw away everything the user had selected — coming back
// meant re-picking every filter. We keep the selections in sessionStorage, keyed by
// company, so returning from a post restores the exact list the user was reading.
//
// The state is only dropped when the user goes UP a level, back to the companies
// directory (`/interview-insights`), which calls `clearAllCompanyPostFilters()` on
// mount. Anything else — opening a post, a reload, browser back — restores it, and
// a manual change simply overwrites it.
//
// sessionStorage (not localStorage) so the selections die with the tab.

const PREFIX = 'interviewInsights:companyFilters:';

export interface CompanyPostFilters {
  role: string;
  round: string;
  level: string;
  time: string;
  sort: string;
  search: string;
}

export const EMPTY_COMPANY_POST_FILTERS: CompanyPostFilters = {
  role: '',
  round: '',
  level: '',
  time: '',
  sort: '',
  search: '',
};

function keyFor(companyId: string | undefined): string {
  return `${PREFIX}${(companyId || '').toLowerCase()}`;
}

function str(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

/** Restored toolbar state for a company, or all-empty when nothing is stored. */
export function readCompanyPostFilters(companyId: string | undefined): CompanyPostFilters {
  try {
    const raw = sessionStorage.getItem(keyFor(companyId));
    if (!raw) return EMPTY_COMPANY_POST_FILTERS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return EMPTY_COMPANY_POST_FILTERS;
    return {
      role: str(parsed.role),
      round: str(parsed.round),
      level: str(parsed.level),
      time: str(parsed.time),
      sort: str(parsed.sort),
      search: str(parsed.search),
    };
  } catch {
    // Private mode / storage disabled / corrupt entry — fall back to no filters.
    return EMPTY_COMPANY_POST_FILTERS;
  }
}

export function writeCompanyPostFilters(companyId: string | undefined, value: CompanyPostFilters): void {
  try {
    const isEmpty = !value.role && !value.round && !value.level && !value.time && !value.sort && !value.search;
    if (isEmpty) sessionStorage.removeItem(keyFor(companyId));
    else sessionStorage.setItem(keyFor(companyId), JSON.stringify(value));
  } catch {
    // Storage unavailable — filters just won't survive the trip into a post.
  }
}

/**
 * Drop the stored state for every company. Called by the companies directory
 * (`/interview-insights`) on mount: leaving a company page for its parent is the
 * one navigation that resets the filters.
 */
export function clearAllCompanyPostFilters(): void {
  try {
    const stale: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(PREFIX)) stale.push(k);
    }
    for (const k of stale) sessionStorage.removeItem(k);
  } catch {
    // Storage unavailable — nothing was persisted either.
  }
}
