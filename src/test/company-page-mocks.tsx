// Shared state + stubs for the company page tests (company-page, company-seed,
// company-archive-seed). vi.mock factories in those files read from here.
import { vi } from 'vitest';
import { createUserPlanMock, mockPlanData } from '@/test/utils';

type Plan = 'Free' | 'Basic' | 'Advanced' | 'Flagship';

const state = { signedIn: false, plan: 'Free' as Plan, passCompany: null as string | null };

export const companyMocks = {
  session: state,
  community: {
    getPosts: vi.fn(),
    getPublicPosts: vi.fn(),
    getCompanyProfile: vi.fn(),
    getPublicCompanyProfile: vi.fn(),
    getPublicCompanyBreakdown: vi.fn(),
    getPostOptions: vi.fn(() => Promise.resolve({ data: { data: [] } })),
  },
  auth: () =>
    state.signedIn
      ? { user: { id: 'reader-1', name: 'Reader' }, isAuthenticated: true, isLoading: false }
      : { user: null, isAuthenticated: false, isLoading: false },
  plan: () =>
    createUserPlanMock({
      planData: { ...mockPlanData, currentPlan: state.plan },
      isPremium: state.plan === 'Advanced' || state.plan === 'Flagship',
      isFree: state.plan === 'Free',
    }),
};

/**
 * A posthog client that is the same object on every render, as the real
 * usePostHog is. The shared setup returns a fresh object each call, and the
 * company page's fetch depends on the client — so it would refetch forever.
 */
export const stablePosthog = { capture: vi.fn(), identify: vi.fn(), reset: vi.fn() };

/** useCompanyPasses stand-in: an active pass for state.passCompany, if any. */
export const passesMock = () => ({
  passes: [],
  isLoading: false,
  find: (company?: string) => (company && company === state.passCompany ? { company, status: 'ACTIVE' } : null),
});
export const setPass = (company: string | null) => {
  state.passCompany = company;
};

export const setSignedIn = (v: boolean) => {
  state.signedIn = v;
};
export const setPlan = (p: Plan) => {
  state.plan = p;
};

/** Filter popovers stubbed to two buttons: apply a role, clear it. */
export const filterPopoversMock = {
  RoleFilter: ({ onApply }: { onApply?: (s: string[]) => void }) => (
    <>
      <button type="button" onClick={() => onApply?.(['Software Engineer'])}>apply role</button>
      <button type="button" onClick={() => onApply?.([])}>clear role</button>
    </>
  ),
  RoundFilter: () => null,
  LevelFilter: () => null,
  TimeFilter: () => null,
};

export const SUMMARY = 'Meta is a global technology company building social apps.';

export const BREAKDOWN = {
  company: 'Meta',
  totalPosts: 40,
  topRoles: [{ name: 'Software Engineer', posts: 30 }],
  topRounds: [{ name: 'Technical Phone Screen', posts: 25 }],
  roundTopics: { 'Technical Phone Screen': [{ name: 'System Design', questions: 12 }] },
};
export const INTRO = 'Most of these Meta write-ups come from Software Engineers (30). The most reported round is the technical phone screen (25).';
export const FAQ_Q1 = 'What rounds are in the Meta interview?';
export const FAQ_Q2 = 'What does the Meta technical phone screen cover?';

export const PROFILE = { displayName: 'Meta', category: 'FAANG / Big Tech', summary: SUMMARY, postCount: 40 };

/** A note card in the feed's payload shape. */
export function feedPost(id: string, over: { user?: unknown; isAnonymous?: boolean; notes?: string } = {}) {
  return {
    id,
    company: 'Meta',
    role: 'Software Engineer',
    round: 'Technical Phone Screen',
    level: 'Senior',
    outcome: 'Offer',
    date: '2026-09-01T00:00:00Z',
    summary: `Summary of ${id}.`,
    status: 'PUBLISHED',
    createdAt: '2026-09-02T00:00:00Z',
    isAnonymous: over.isAnonymous ?? false,
    user: 'user' in over ? over.user : { id: 'author', name: 'Author' },
    questions: [{ id: `q-${id}`, title: 'Design a rate limiter', categories: [], notes: over.notes ?? `Notes of ${id}.` }],
  };
}

/** Wire the default answers: profile, breakdown, an empty feed. */
export function defaultAnswers() {
  companyMocks.community.getCompanyProfile.mockResolvedValue({ data: { data: PROFILE } });
  companyMocks.community.getPublicCompanyProfile.mockResolvedValue({ data: { data: PROFILE } });
  companyMocks.community.getPublicCompanyBreakdown.mockResolvedValue({ data: { data: BREAKDOWN } });
  companyMocks.community.getPosts.mockResolvedValue({ data: { data: [] } });
  companyMocks.community.getPublicPosts.mockResolvedValue({ data: { data: { posts: [], total: 0, size: 10, page: 0 } } });
}

/** Save toolbar filters for a company the way the page itself does. */
export function saveFilters(companyId: string, filters: Partial<Record<'role' | 'round' | 'level' | 'time' | 'sort' | 'search', string>>) {
  sessionStorage.setItem(
    `interviewInsights:companyFilters:${companyId}`,
    JSON.stringify({ role: '', round: '', level: '', time: '', sort: '', search: '', ...filters }),
  );
}
