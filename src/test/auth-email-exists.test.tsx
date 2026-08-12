/**
 * Signup with an email that already has an account hands the user off to the
 * login form. On /register that also means leaving the route (the login toggle
 * is hidden there) — and because /auth and /register render the same element,
 * the component stays mounted across that navigation, so the switch has to come
 * from state, not from re-reading the query params on mount.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import React from 'react';

const { mockSignup, mockLogin, mockToast } = vi.hoisted(() => ({
  mockSignup: vi.fn(),
  mockLogin: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    signup: mockSignup,
    loginWithGoogle: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerificationCode: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));
vi.mock('@/utils/posthog', () => ({ safeCapture: vi.fn() }));
vi.mock('@/utils/postAuthRedirect', () => ({ resolvePostAuthPath: vi.fn().mockResolvedValue('/dashboard') }));

vi.mock('@/components/newDesign/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: any) => (
    <input type="checkbox" id={id} checked={!!checked} onChange={(e) => onCheckedChange(e.target.checked)} />
  ),
}));

import { AuthPage } from '../pages/newDesign/auth';

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/auth', element: <AuthPage /> },
      { path: '/register', element: <AuthPage /> },
    ],
    { initialEntries: [path] }
  );
  render(<RouterProvider router={router} />);
  return router;
}

function fillSignupForm() {
  fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taken@screna.ai' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Passw0rd!' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
}

const alreadyRegistered = {
  response: { status: 400, data: { errorCode: 'AUTH_EMAIL_ALREADY_REGISTERED', message: 'Email already registered' } },
};

describe('AuthPage — signup with an already registered email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignup.mockRejectedValue(alreadyRegistered);
  });

  it('switches to the login form and shows the notice on /auth', async () => {
    renderAt('/auth');
    fillSignupForm();
    await waitFor(() => expect(mockSignup).toHaveBeenCalled());
    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText(/already registered/i)).toBeInTheDocument();
    // Email and password are kept so one click finishes the login.
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('taken@screna.ai');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('Passw0rd!');
  });

  it('switches to the login form and shows the notice on /register', async () => {
    const router = renderAt('/register');
    fillSignupForm();
    await waitFor(() => expect(mockSignup).toHaveBeenCalled());
    // Left /register so the login toggle is reachable...
    await waitFor(() => expect(router.state.location.pathname).toBe('/auth'));
    // ...and the form actually switched, even though the component never
    // remounted to re-read ?login=true.
    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText(/already registered/i)).toBeInTheDocument();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('taken@screna.ai');
  });
});
