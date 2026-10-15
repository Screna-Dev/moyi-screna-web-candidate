// Shared state + stubs for the note page tests (note-preview, note-seed).
// vi.mock factories in those files read from here, so each test can switch
// session, plan and API answers without re-mocking modules.
import { vi } from 'vitest';
import { createUserPlanMock, mockPlanData } from '@/test/utils';

type Plan = 'Free' | 'Basic' | 'Advanced' | 'Flagship';

const state = { signedIn: true, plan: 'Free' as Plan, passCompany: null as string | null };

export const noteMocks = {
  session: state,
  community: {
    getPost: vi.fn(),
    getPublicPost: vi.fn(),
    getPosts: vi.fn(),
    getComments: vi.fn(() => Promise.resolve({ data: { data: { content: [], pageMeta: { totalPages: 1 } } } })),
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
  passes: () => ({
    passes: [],
    isLoading: false,
    find: (company?: string) => (company && company === state.passCompany ? { company, status: 'ACTIVE' } : null),
  }),
};

/** Give the reader an active Company Pass for this company (null = none). */
export const setPass = (company: string | null) => {
  state.passCompany = company;
};

export const setSignedIn = (v: boolean) => {
  state.signedIn = v;
};
export const setPlan = (p: Plan) => {
  state.plan = p;
};

/** A note in the authenticated / public payload shape. */
export function notePost(over: { user?: unknown; isAnonymous?: boolean; notes: string; id?: string }) {
  return {
    id: over.id ?? 'post-1',
    company: 'Meta',
    role: 'Software Engineer',
    round: 'Technical Phone Screen',
    level: 'Senior',
    outcome: 'Offer',
    date: '2026-09-01T00:00:00Z',
    location: 'Remote',
    summary: 'Two coding rounds and a design round.',
    status: 'PUBLISHED',
    createdAt: '2026-09-02T00:00:00Z',
    isAnonymous: over.isAnonymous ?? false,
    user: over.user,
    questions: [{ id: 'q-1', seq: 1, label: 'Q1', title: 'Design a rate limiter', categories: ['System Design'], notes: over.notes }],
    likeCount: 0,
    saveCount: 0,
    commentCount: 0,
  };
}
