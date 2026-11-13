import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Employer forgot password: the shared /auth/forgot-password and
// /auth/confirm-reset-password endpoints, then straight into the app.

const auth = vi.hoisted(() => ({
  requestEmployerPasswordReset: vi.fn(),
  confirmEmployerPasswordReset: vi.fn(),
  signInEmployer: vi.fn(),
}));
vi.mock('@/pages/employer/employerAuth', async (orig) => ({ ...(await orig<object>()), ...auth }));

import { EmployerLoginPage } from '@/pages/employer/EmployerLoginPage';

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/employer/login']}>
      <Routes>
        <Route path="/employer/login" element={<EmployerLoginPage />} />
        <Route path="/employer" element={<p>Employer app</p>} />
      </Routes>
    </MemoryRouter>,
  );

async function toResetStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
  expect(screen.getByText('Reset your password')).toBeInTheDocument();
  await user.type(screen.getByPlaceholderText(/@/), 'Alex@Acme.com');
  await user.click(screen.getByRole('button', { name: 'Send code' }));
  expect(await screen.findByText('Set a new password')).toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  auth.requestEmployerPasswordReset.mockResolvedValue(undefined);
  auth.confirmEmployerPasswordReset.mockResolvedValue(undefined);
  auth.signInEmployer.mockResolvedValue({ accessToken: 'h.eyJzdWIiOiJ1MSJ9.s', refreshToken: 'r', isFirstLogin: false });
});

describe('Employer forgot password', () => {
  it('emails a code, sets the new password, then signs in', async () => {
    const user = userEvent.setup();
    renderLogin();
    await toResetStep(user);
    expect(auth.requestEmployerPasswordReset).toHaveBeenCalledWith('alex@acme.com');
    expect(screen.getByText('alex@acme.com')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('000000'), '123456');
    await user.type(screen.getByPlaceholderText('8–16 characters'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => expect(auth.confirmEmployerPasswordReset).toHaveBeenCalledWith('alex@acme.com', '123456', 'NewPass1!'));
    expect(auth.signInEmployer).toHaveBeenCalledWith('alex@acme.com', 'NewPass1!');
    expect(await screen.findByText('Employer app')).toBeInTheDocument();
  });

  it('checks the code and password rules before calling the API', async () => {
    const user = userEvent.setup();
    renderLogin();
    await toResetStep(user);
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(screen.getByText('Enter the 6-digit code from your email.')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('000000'), '123456');
    await user.type(screen.getByPlaceholderText('8–16 characters'), 'short');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(screen.getByText(/Your new password needs/)).toBeInTheDocument();
    expect(auth.confirmEmployerPasswordReset).not.toHaveBeenCalled();
  });

  it('shows a wrong or expired code and stays on the step', async () => {
    const user = userEvent.setup();
    auth.confirmEmployerPasswordReset.mockRejectedValue(new Error('bad'));
    renderLogin();
    await toResetStep(user);
    await user.type(screen.getByPlaceholderText('000000'), '000000');
    await user.type(screen.getByPlaceholderText('8–16 characters'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('That code is incorrect or has expired.')).toBeInTheDocument();
    expect(auth.signInEmployer).not.toHaveBeenCalled();
  });

  it('if signing in afterwards fails, goes back to log in with a note', async () => {
    const user = userEvent.setup();
    auth.signInEmployer.mockRejectedValue(new Error('down'));
    renderLogin();
    await toResetStep(user);
    await user.type(screen.getByPlaceholderText('000000'), '123456');
    await user.type(screen.getByPlaceholderText('8–16 characters'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('Password updated. Log in with your new password.')).toBeInTheDocument();
    expect(screen.getByText('Employer log in')).toBeInTheDocument();
  });
});
