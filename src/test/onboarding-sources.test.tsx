/**
 * Onboarding "How did you hear about Screna?" — the two new sources.
 * Covers: option list and order, the enum sent on Continue, pre-selection when
 * a returning user's saved source comes back from GET /onboarding/progress.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGetProgress = vi.fn();
const mockSubmitSource = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/services/OnboardingServices', () => ({
  getOnboardingProgress: (...a: unknown[]) => mockGetProgress(...a),
  submitReferralSource: (...a: unknown[]) => mockSubmitSource(...a),
}));
vi.mock('@/services/ProfileServices', () => ({ uploadResumeAndWait: vi.fn() }));
vi.mock('@/hooks/useResumeUploaded', () => ({ emitResumeUploaded: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/utils/analytics', () => ({ markOnboardingComplete: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { OnboardingUploadResumePage } from '@/pages/newDesign/onboarding-upload-resume';
import { safeCapture } from '@/utils/posthog';

const ORDER = [
  'Xiaohongshu (RED)',
  'Reddit',
  'X (Twitter)',
  'LinkedIn',
  'Google / search engine',
  'ChatGPT / AI assistant',
  'Other social media',
  'Somewhere else',
  'Referred by someone',
];

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <OnboardingUploadResumePage />
    </MemoryRouter>,
  );

/** The source tiles, in DOM order, by their label text. */
const tileLabels = () =>
  ORDER.map((label) => screen.getByText(label))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
    .map((el) => el.textContent);

/** The radio dot of a tile is filled (has a child) only when it is selected. */
const isSelected = (label: string) => {
  const tile = screen.getByText(label).closest('button')!;
  return tile.className.includes('border-[hsl(221,91%,60%)] bg-');
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetProgress.mockResolvedValue({ data: { data: { referralSourceCompleted: false } } });
  mockSubmitSource.mockResolvedValue({ data: { data: { creditsGranted: 30, inviteCodeApplied: false } } });
});

describe('onboarding source step', () => {
  it('offers nine sources, the two new ones after LinkedIn', async () => {
    renderPage();
    await screen.findByText('Google / search engine');
    expect(tileLabels()).toEqual(ORDER);
  });

  it.each([
    ['Google / search engine', 'SEARCH_ENGINE'],
    ['ChatGPT / AI assistant', 'AI_ASSISTANT'],
  ])('submits %s as %s and moves on to the resume step', async (label, value) => {
    renderPage();
    fireEvent.click(await screen.findByText(label));
    fireEvent.click(screen.getByRole('button', { name: /Continue to resume/ }));

    await waitFor(() => expect(mockSubmitSource).toHaveBeenCalledWith({ referralSource: value, inviteCode: null }));
    expect(safeCapture).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ source: value, credits_granted: 30 }),
    );
    // Step 3 is the resume upload; its Back button is what returns to the sources.
    expect(await screen.findByRole('button', { name: /Back/ })).toBeInTheDocument();
  });

  it.each([
    ['SEARCH_ENGINE', 'Google / search engine'],
    ['AI_ASSISTANT', 'ChatGPT / AI assistant'],
  ])('pre-selects %s for a returning user who goes back to the step', async (saved, label) => {
    mockGetProgress.mockResolvedValue({
      data: { data: { referralSourceCompleted: true, referralSource: saved } },
    });
    renderPage();
    // A completed source sends the user straight to the resume step.
    fireEvent.click(await screen.findByRole('button', { name: /Back/ }));
    await screen.findByText(label);
    expect(isSelected(label)).toBe(true);
    for (const other of ORDER.filter((l) => l !== label)) expect(isSelected(other)).toBe(false);
  });
});
