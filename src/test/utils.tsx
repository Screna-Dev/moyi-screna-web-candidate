import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// ─── Default mock user ────────────────────────────────────
export const mockUser = {
  id: 'user-123',
  email: 'test@screna.ai',
  name: 'Test User',
  avatar: '',
  role: 'CANDIDATE',
};

// ─── Default mock plan data ───────────────────────────────
export const mockPlanData = {
  currentPlan: 'Free' as const,
  subscriptionCancelPending: false,
  planDowngradePending: false,
  creditBalance: 100,
  nextBillingDate: null,
  updatedAt: null,
  trialExpiresAt: null,
  isTrialActive: false,
  effectivePlan: 'Free',
  trialDaysRemaining: 0,
  recurringCreditBalance: 0,
  permanentCreditBalance: 100,
};

// ─── Auth context mock ────────────────────────────────────
export const createAuthMock = (overrides = {}) => ({
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn().mockResolvedValue(mockUser),
  signup: vi.fn().mockResolvedValue(undefined),
  loginWithGoogle: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  verifyEmail: vi.fn().mockResolvedValue(undefined),
  resendVerificationCode: vi.fn().mockResolvedValue(undefined),
  setUserFromToken: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ─── User plan context mock ───────────────────────────────
export const createUserPlanMock = (overrides = {}) => ({
  planData: mockPlanData,
  isLoading: false,
  error: null,
  isPremium: false,
  isElite: false,
  isFree: true,
  isPro: false,
  canAccessJobs: false,
  canAccessPremiumReport: false,
  canPushProfile: false,
  canAccessMentorship: false,
  refreshPlan: vi.fn().mockResolvedValue(undefined),
  changePlan: vi.fn().mockResolvedValue({ success: true, url: null }),
  buyCredits: vi.fn().mockResolvedValue('https://stripe.com/checkout'),
  isChangingPlan: false,
  isBuyingCredits: false,
  ...overrides,
});

// ─── Render with router ───────────────────────────────────
interface RenderWithRouterOptions extends RenderOptions {
  initialEntries?: string[];
}

export function renderWithRouter(
  ui: React.ReactElement,
  { initialEntries = ['/'], ...options }: RenderWithRouterOptions = {}
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>,
    options
  );
}

// ─── Mock localStorage ────────────────────────────────────
export function mockLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  };
}

// ─── Build fake JWT token ─────────────────────────────────
export function makeFakeJwt(payload: object = {}) {
  const base64 = (obj: object) => btoa(JSON.stringify(obj));
  return `header.${base64({ sub: 'user-123', roles: ['CANDIDATE'], ...payload })}.signature`;
}
