/**
 * RequireAuth tests (F2)
 *
 * The machine-checkable form of the acceptance row "未登录进入功能深链":
 * the page must not mount, so its mount-time `*_viewed` capture never runs.
 * That is asserted directly here — the child renders a probe that fires a spy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import React from 'react';

const { mockUseAuth, mockHasStoredSession, mockViewed } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockHasStoredSession: vi.fn(),
  mockViewed: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/services/api', () => ({ hasStoredSession: mockHasStoredSession }));

import { RequireAuth } from '@/components/RequireAuth';

/** Stands in for a protected page: reports on mount, the way the real ones do. */
function ProtectedPage() {
  React.useEffect(() => { mockViewed(); }, []);
  return <div>coaching content</div>;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/coaching', element: <RequireAuth><ProtectedPage /></RequireAuth> },
      { path: '/auth', element: <div>login page</div> },
    ],
    { initialEntries: [path] }
  );
  render(<RouterProvider router={router} />);
  return router;
}

const authState = (over = {}) => ({ isAuthenticated: false, isLoading: false, ...over });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RequireAuth — genuine guest', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(authState());
    mockHasStoredSession.mockReturnValue(false);
  });

  it('never mounts the page, so no view event fires', () => {
    renderAt('/coaching');
    expect(screen.queryByText('coaching content')).not.toBeInTheDocument();
    expect(mockViewed).not.toHaveBeenCalled();
  });

  it('redirects to /auth carrying the deep link as returnTo', async () => {
    const router = renderAt('/coaching');
    await waitFor(() => expect(router.state.location.pathname).toBe('/auth'));
    expect(router.state.location.search).toBe('?returnTo=%2Fcoaching');
  });

  it('keeps query and hash on the way in', async () => {
    const router = renderAt('/coaching?sort=top#list');
    await waitFor(() => expect(router.state.location.pathname).toBe('/auth'));
    expect(decodeURIComponent(router.state.location.search)).toBe('?returnTo=/coaching?sort=top#list');
  });

  // replace, not push: the login page must not be on the stack, or pressing
  // back from the target lands the user on /auth again.
  it('replaces the history entry instead of pushing one', async () => {
    const router = renderAt('/coaching');
    await waitFor(() => expect(router.state.location.pathname).toBe('/auth'));
    expect(router.state.historyAction).toBe('REPLACE');
  });
});

describe('RequireAuth — signed in', () => {
  it('renders the page', () => {
    mockUseAuth.mockReturnValue(authState({ isAuthenticated: true }));
    mockHasStoredSession.mockReturnValue(true);
    renderAt('/coaching');
    expect(screen.getByText('coaching content')).toBeInTheDocument();
    expect(mockViewed).toHaveBeenCalledTimes(1);
  });
});

describe('RequireAuth — session still resolving', () => {
  // A stored token with AuthContext mid-flight is a returning user, not
  // pollution. Blocking here would put a blank screen in front of every
  // protected page on every reload, so the page renders and the API layer
  // stays responsible for a token that turns out to be dead.
  it('renders the page rather than bouncing a returning user', () => {
    mockUseAuth.mockReturnValue(authState({ isLoading: true }));
    mockHasStoredSession.mockReturnValue(true);
    const router = renderAt('/coaching');
    expect(screen.getByText('coaching content')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/coaching');
  });

  // isLoading with nothing in storage is not ambiguous — there is no session
  // to wait for.
  it('still bounces when nothing is stored', async () => {
    mockUseAuth.mockReturnValue(authState({ isLoading: true }));
    mockHasStoredSession.mockReturnValue(false);
    const router = renderAt('/coaching');
    await waitFor(() => expect(router.state.location.pathname).toBe('/auth'));
    expect(mockViewed).not.toHaveBeenCalled();
  });
});
