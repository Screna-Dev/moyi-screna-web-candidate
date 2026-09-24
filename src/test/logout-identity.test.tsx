/**
 * Logout identity tests (P3)
 *
 * The bug this pins: logout used to delete every `ph_*` localStorage key by
 * hand and never call posthog.reset(). The SDK keeps distinct_id in memory, so
 * clearing its storage underneath it changed nothing — user A signed out, and
 * until the next reload user B's signup in that browser was written into A's
 * profile.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockPost, mockReset, mockIdentify, mockCapture, mockStopRefresh } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockReset: vi.fn(),
  mockIdentify: vi.fn(),
  mockCapture: vi.fn(),
  mockStopRefresh: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  default: { post: mockPost },
  scheduleProactiveRefresh: vi.fn(),
  stopTokenRefreshCycle: mockStopRefresh,
  hasStoredSession: () => Boolean(localStorage.getItem('authToken') || sessionStorage.getItem('authToken')),
}));
vi.mock('@/services/ProfileServices', () => ({ getPersonalInfo: vi.fn().mockResolvedValue({ data: { data: {} } }) }));

// One stable posthog object — setup.ts hands out a fresh one per call, which
// nothing can assert against.
vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({ capture: mockCapture, identify: mockIdentify, reset: mockReset }),
  PostHogProvider: ({ children }: never) => children,
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { getAuthState } from '@/utils/authState';
import { makeFakeJwt } from './utils';

// A decodable token: AuthProvider's mount-time checkAuth runs first, and a
// garbage string just fills the output with decode failures.
const TOKEN = makeFakeJwt();

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => { void logout(); }}>sign out</button>;
}

function renderApp() {
  render(
    <MemoryRouter>
      <AuthProvider><LogoutButton /></AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mockPost.mockResolvedValue({ data: {} });
});

describe('logout', () => {
  it('ends the analytics identity with reset()', async () => {
    localStorage.setItem('authToken', TOKEN);
    renderApp();
    fireEvent.click(screen.getByText('sign out'));
    await waitFor(() => expect(mockReset).toHaveBeenCalledTimes(1));
  });

  // reset() owns the SDK's own storage now. Reaching into ph_* keys from here
  // is what left the in-memory identity stale in the first place.
  it('leaves the SDK storage to the SDK', async () => {
    localStorage.setItem('authToken', TOKEN);
    localStorage.setItem('ph_phc_test_posthog', '{"distinct_id":"user-a"}');
    renderApp();
    fireEvent.click(screen.getByText('sign out'));
    await waitFor(() => expect(mockReset).toHaveBeenCalled());
    expect(localStorage.getItem('ph_phc_test_posthog')).not.toBeNull();
  });

  it('clears both token stores', async () => {
    localStorage.setItem('authToken', TOKEN);
    localStorage.setItem('refreshToken', 'refresh-token');
    sessionStorage.setItem('authToken', TOKEN);
    renderApp();
    fireEvent.click(screen.getByText('sign out'));
    await waitFor(() => expect(localStorage.getItem('authToken')).toBeNull());
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(sessionStorage.getItem('authToken')).toBeNull();
  });

  it('drops the shared gate to anonymous', async () => {
    localStorage.setItem('authToken', TOKEN);
    renderApp();
    fireEvent.click(screen.getByText('sign out'));
    await waitFor(() => expect(getAuthState()).toBe('anonymous'));
  });

  // A MENTOR-only account gets 403 from /auth/signout; the JWT is stateless and
  // keeps working until it expires, so the local teardown must happen anyway.
  it('signs the user out even when /auth/signout fails', async () => {
    mockPost.mockRejectedValue({ response: { status: 403 } });
    localStorage.setItem('authToken', TOKEN);
    renderApp();
    fireEvent.click(screen.getByText('sign out'));
    await waitFor(() => expect(localStorage.getItem('authToken')).toBeNull());
    expect(mockReset).toHaveBeenCalled();
    expect(mockStopRefresh).toHaveBeenCalled();
  });
});
