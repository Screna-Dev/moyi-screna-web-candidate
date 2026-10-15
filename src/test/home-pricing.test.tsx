/**
 * Home page pricing — Basic is no longer sold (the backend 400s a BASIC
 * checkout since 2026-08-28), so its card and its "Get Basic" button are gone.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import { createUserPlanMock } from '@/test/utils';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false, logout: vi.fn() }),
}));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => createUserPlanMock() }));
vi.mock('@/services/ProfileServices', () => ({ getPersonalInfo: vi.fn().mockResolvedValue({ data: {} }) }));
vi.mock('@/services', () => ({ PaymentService: {} }));

import { HomePage } from '@/pages/newDesign/home/home';

beforeEach(() => {
  // jsdom has neither; the home page uses both.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as any;
  }
  if (!('IntersectionObserver' in window)) {
    (window as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const renderHome = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <HomePage />
    </MemoryRouter>,
  );

describe('home page pricing', () => {
  it('has no Basic card and no Get Basic button', () => {
    renderHome();
    expect(screen.queryByRole('button', { name: /Get Basic/i })).toBeNull();
    expect(screen.queryByText('Get Basic')).toBeNull();
    expect(screen.queryByText('Build your foundation')).toBeNull();
  });

  it('shows Free, Advanced and Flagship, each with its button', () => {
    renderHome();
    for (const cta of ['Start for free', 'Start Advanced', 'Get Flagship']) {
      expect(screen.getByText(cta)).toBeInTheDocument();
    }
  });

  it('lays the three cards out three across', () => {
    const src = readFileSync('src/pages/newDesign/home/home.tsx', 'utf8');
    const grid = src.match(/\{\/\* Pricing cards \*\/\}\s*<div className="([^"]+)"/)![1];
    expect(grid).toContain('md:grid-cols-3');
    expect(grid).not.toContain('grid-cols-4');
  });
});
