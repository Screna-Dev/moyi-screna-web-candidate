/**
 * postAuthRedirect tests
 * Covers: new candidates always land on onboarding, returning candidates are
 *         routed off GET /onboarding/progress, mentors are never onboarded,
 *         returnTo/ref handling, and the progress-endpoint failure fallback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetOnboardingProgress } = vi.hoisted(() => ({
  mockGetOnboardingProgress: vi.fn(),
}));

vi.mock('@/services/OnboardingServices', () => ({
  getOnboardingProgress: mockGetOnboardingProgress,
}));

import { resolvePostAuthPath, onboardingPath } from '@/utils/postAuthRedirect';

const candidate = { role: 'CANDIDATE', roles: ['CANDIDATE'] };
const mentor = { role: 'MENTOR', roles: ['MENTOR'] };
const dualRole = { role: 'CANDIDATE', roles: ['CANDIDATE', 'MENTOR'] };

const progress = (completed: boolean) => ({ data: { status: 'SUCCESS', data: { completed } } });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('onboardingPath', () => {
  it('builds a bare path with no params', () => {
    expect(onboardingPath()).toBe('/onboarding-resume');
  });

  it('carries returnTo and ref through', () => {
    expect(onboardingPath({ returnTo: '/profile', ref: 'AB3F9K2M' }))
      .toBe('/onboarding-resume?returnTo=%2Fprofile&ref=AB3F9K2M');
  });

  it('ignores a blank ref', () => {
    expect(onboardingPath({ ref: '   ' })).toBe('/onboarding-resume');
  });
});

describe('resolvePostAuthPath - new candidate', () => {
  it('goes to onboarding without consulting progress', async () => {
    const path = await resolvePostAuthPath(candidate, { forceOnboarding: true });
    expect(path).toBe('/onboarding-resume');
    expect(mockGetOnboardingProgress).not.toHaveBeenCalled();
  });

  it('carries the referral code into onboarding', async () => {
    const path = await resolvePostAuthPath(candidate, { forceOnboarding: true, ref: 'AB3F9K2M' });
    expect(path).toBe('/onboarding-resume?ref=AB3F9K2M');
  });

  // A returnTo must NOT short-circuit onboarding for a brand-new account —
  // it's preserved as a param so onboarding can forward there when it finishes.
  it('keeps returnTo as a param instead of jumping straight to it', async () => {
    const path = await resolvePostAuthPath(candidate, { forceOnboarding: true, returnTo: '/coaching' });
    expect(path).toBe('/onboarding-resume?returnTo=%2Fcoaching');
  });
});

describe('resolvePostAuthPath - returning candidate', () => {
  it('resumes onboarding when it is unfinished', async () => {
    mockGetOnboardingProgress.mockResolvedValue(progress(false));
    expect(await resolvePostAuthPath(candidate)).toBe('/onboarding-resume');
  });

  it('goes to the dashboard when onboarding is complete', async () => {
    mockGetOnboardingProgress.mockResolvedValue(progress(true));
    expect(await resolvePostAuthPath(candidate)).toBe('/dashboard');
  });

  it('honours returnTo once onboarding is complete', async () => {
    mockGetOnboardingProgress.mockResolvedValue(progress(true));
    expect(await resolvePostAuthPath(candidate, { returnTo: '/profile' })).toBe('/profile');
  });

  it('reads an unwrapped progress body too', async () => {
    mockGetOnboardingProgress.mockResolvedValue({ data: { completed: true } });
    expect(await resolvePostAuthPath(candidate)).toBe('/dashboard');
  });

  it('falls back to the dashboard when the progress lookup fails', async () => {
    // Infrastructure error (endpoint down / migration not run) must not trap a
    // returning user in onboarding.
    mockGetOnboardingProgress.mockRejectedValue(new Error('500'));
    expect(await resolvePostAuthPath(candidate)).toBe('/dashboard');
  });
});

describe('resolvePostAuthPath - non-candidate accounts', () => {
  it('sends a mentor-only account to the mentor dashboard', async () => {
    expect(await resolvePostAuthPath(mentor)).toBe('/mentor-dashboard');
    expect(mockGetOnboardingProgress).not.toHaveBeenCalled();
  });

  it('never forces a mentor through candidate onboarding', async () => {
    expect(await resolvePostAuthPath(mentor, { forceOnboarding: true })).toBe('/mentor-dashboard');
  });

  it('sends a dual-role account to the chooser, not onboarding', async () => {
    expect(await resolvePostAuthPath(dualRole)).toBe('/select-dashboard');
    expect(mockGetOnboardingProgress).not.toHaveBeenCalled();
  });

  it('respects a dual-role account remembered mode', async () => {
    localStorage.setItem('screna_dashboard_mode', 'mentor');
    expect(await resolvePostAuthPath(dualRole)).toBe('/mentor-dashboard');
  });
});
