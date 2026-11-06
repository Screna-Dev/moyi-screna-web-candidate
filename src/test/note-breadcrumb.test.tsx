/**
 * Note page (/experience/:id) — the "company > role" breadcrumb.
 *
 * Spec: the breadcrumb is "company > role" for every reader, and stops at the
 * company when the role has no indexed page (isIndexableRole). Role pages exist
 * only on the public surface — one URL per company × role — so that is where
 * the role link goes for a signed-in reader too, while their company link stays
 * on the personal centre.
 *
 * Its own file: the lookups behind the breadcrumb are stubbed module-wide here,
 * and the preview tests (note-preview) assert on timing those stubs would move.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { noteMocks, notePost, setPlan, setSignedIn } from './note-page-mocks';

vi.mock('@/services/CommunityService', async (orig) => ({ ...(await orig<object>()), ...noteMocks.community }));
vi.mock('@/services/api', async (orig) => ({ ...(await orig<object>()), hasStoredSession: () => noteMocks.session.signedIn }));
vi.mock('@/services/QuestionBankService', () => ({ getQuestionAiHints: () => new Promise(() => {}) }));
vi.mock('@/hooks/useDwellTracking', () => ({ useDwellTracking: () => {} }));
vi.mock('@/components/newDesign/dashboard-layout', () => ({ DashboardLayout: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/newDesign/insights-layout', () => ({ InsightsLayout: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => noteMocks.auth() }));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => noteMocks.plan() }));
const crumbs = vi.hoisted(() => ({ companySlugFor: vi.fn(), getRoleCrumb: vi.fn() }));
vi.mock('@/utils/companyDirectory', async (orig) => ({ ...(await orig<object>()), companySlugFor: crumbs.companySlugFor }));
vi.mock('@/utils/companyRole', async (orig) => ({ ...(await orig<object>()), getRoleCrumb: crumbs.getRoleCrumb }));

import { ExperienceDetailPage } from '@/pages/newDesign/experience-detail';

const renderNote = () =>
  render(
    <MemoryRouter initialEntries={['/experience/post-1']}>
      <Routes>
        <Route path="/experience/:id" element={<ExperienceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

const NOTE = 'They asked me to design a rate limiter. I started with a token bucket.';

/** Serve one full note to either audience: guests read the public search envelope. */
function serveNote() {
  const post = notePost({ user: { id: 'u9', name: 'Author' }, notes: NOTE });
  noteMocks.community.getPost.mockResolvedValue({ data: { data: post } });
  noteMocks.community.getPublicPost.mockResolvedValue({ data: { data: { posts: [post], total: 1, size: 10, page: 0 } } });
  noteMocks.community.getPosts.mockResolvedValue({ data: { data: [] } });
}

beforeEach(() => {
  vi.clearAllMocks();
  setPlan('Advanced');
  serveNote();
  crumbs.companySlugFor.mockResolvedValue('meta');
});

describe('note page — role breadcrumb', () => {
  it.each([
    ['a signed-in reader', true, '/interview-insights/meta'],
    ['a guest', false, '/interview-questions/meta'],
  ] as const)('shows company > role to %s, the role linking the public role page', async (_who, signedIn, companyHref) => {
    setSignedIn(signedIn);
    crumbs.getRoleCrumb.mockResolvedValue('software-engineer');
    renderNote();
    const role = await screen.findByRole('link', { name: 'Software Engineer' });
    expect(role.getAttribute('href')).toBe('/interview-questions/meta/software-engineer');
    expect(screen.getByRole('link', { name: /Meta Interview Insights/ }).getAttribute('href')).toBe(companyHref);
    expect(crumbs.getRoleCrumb).toHaveBeenCalledWith('Meta', 'Software Engineer');
  });

  it('stops at the company when the role has no indexed page', async () => {
    setSignedIn(true);
    crumbs.getRoleCrumb.mockResolvedValue(null);
    renderNote();
    await waitFor(() => expect(crumbs.getRoleCrumb).toHaveBeenCalled());
    await screen.findByRole('link', { name: /Meta Interview Insights/ });
    expect(screen.queryByRole('link', { name: 'Software Engineer' })).toBeNull();
  });
});
