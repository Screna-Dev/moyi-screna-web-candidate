import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { AddInterviewsDialog } from '@/components/newDesign/AddInterviewsDialog';

// The landing page's ADD-ON row buys the interview add-on (POST
// /payments/interview-add-on, C9), not credits. Pro / Pro 90-Day confirm and
// go to Stripe; Free is offered Pro.

const svc = vi.hoisted(() => ({ getInterviewQuota: vi.fn(), createInterviewAddOnCheckout: vi.fn() }));
vi.mock('@/services', () => ({ PaymentService: svc }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, user: {} }), isStaffRole: () => false }));

const quota = (q: Record<string, unknown>) => ({ data: { data: q } });
const PRO = { plan: 'PRO', available: 2, grants: [{ source: 'PRO_PERIOD', remaining: 2, expiresAt: '2026-12-01T00:00:00Z' }] };

let href = '';
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  href = '';
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, get href() { return href; }, set href(v: string) { href = v; } },
  });
});

describe('AddInterviewsDialog', () => {
  it('Pro: shows the pack, then checks out the add-on (not credits) and marks the return', async () => {
    svc.getInterviewQuota.mockResolvedValue(quota(PRO));
    svc.createInterviewAddOnCheckout.mockResolvedValue({ data: { data: { url: 'https://checkout.stripe.com/addon' } } });
    render(<AddInterviewsDialog onClose={() => {}} onUpgrade={() => {}} />);
    expect(await screen.findByText('5 partner-role interviews')).toBeInTheDocument();
    expect(screen.getByText('$12, charged once')).toBeInTheDocument();
    expect(screen.getByText('90 days')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add 5 interviews · $12' }));
    await waitFor(() => expect(href).toBe('https://checkout.stripe.com/addon'));
    expect(JSON.parse(sessionStorage.getItem('pendingCheckout')!)).toMatchObject({ kind: 'interview-add-on', grantsBefore: [] });
    expect(screen.getByRole('button', { name: 'Opening checkout…' })).toBeDisabled();
  });

  it('Free: explains the add-on is for Pro and offers Pro instead', async () => {
    svc.getInterviewQuota.mockResolvedValue(quota({ plan: 'FREE', available: 0, grants: [] }));
    const onUpgrade = vi.fn();
    render(<AddInterviewsDialog onClose={() => {}} onUpgrade={onUpgrade} />);
    expect(await screen.findByText('Add-on interviews are for Pro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Get Pro' }));
    expect(onUpgrade).toHaveBeenCalled();
    expect(svc.createInterviewAddOnCheckout).not.toHaveBeenCalled();
  });

  it('403 INSUFFICIENT_PLAN_TIER from checkout switches to the Pro offer', async () => {
    svc.getInterviewQuota.mockResolvedValue(quota(PRO));
    const err = new AxiosError('fail', '403');
    err.response = { status: 403, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { errorCode: 'INSUFFICIENT_PLAN_TIER' } };
    svc.createInterviewAddOnCheckout.mockRejectedValue(err);
    render(<AddInterviewsDialog onClose={() => {}} onUpgrade={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add 5 interviews · $12' }));
    expect(await screen.findByText('Add-on interviews are for Pro')).toBeInTheDocument();
    expect(href).toBe('');
  });
});
