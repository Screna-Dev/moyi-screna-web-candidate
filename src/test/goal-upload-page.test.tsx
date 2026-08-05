/**
 * GoalUploadPage Tests
 * Covers: file size validation, successful upload flow, localStorage update,
 *         onUploadSuccess callback, API failure handling, loading state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────
const { mockUploadResumeAndWait, mockUpdateProfile } = vi.hoisted(() => ({
  mockUploadResumeAndWait: vi.fn(),
  mockUpdateProfile: vi.fn(),
}));

vi.mock('@/services/ProfileServices', () => ({
  uploadResumeAndWait: mockUploadResumeAndWait,
  updateProfile: mockUpdateProfile,
}));

vi.mock('@/types/profile', () => ({
  VISA_STATUS_OPTIONS: [
    { value: 'US Citizen', label: 'US Citizen' },
    { value: 'H1B', label: 'H1B Visa' },
    { value: 'OPT', label: 'OPT' },
  ],
}));

vi.mock('@/components/newDesign/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => open ? <div data-testid="visa-dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/newDesign/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select data-testid="visa-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/newDesign/ui/button', () => ({
  Button: ({ onClick, disabled, children, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>{children}</button>
  ),
}));

vi.mock('@/components/newDesign/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

import { GoalUploadPage } from '../pages/newDesign/goal-upload-page';

// ─── Helpers ──────────────────────────────────────────────
function makeFile(name = 'resume.pdf', sizeBytes = 500 * 1024, type = 'application/pdf'): File {
  const file = new File(['x'.repeat(sizeBytes)], name, { type });
  // File constructor doesn't set size from repeated chars reliably; override explicitly
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

function getFileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

async function uploadFile(file: File) {
  const input = getFileInput();
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

function renderPage(onUploadSuccess = vi.fn()) {
  return {
    onUploadSuccess,
    ...render(
      <MemoryRouter>
        <GoalUploadPage onUploadSuccess={onUploadSuccess} />
      </MemoryRouter>
    ),
  };
}

// ─── Mock API responses ───────────────────────────────────
// uploadResumeAndWait uploads, polls the parse job, and resolves once the
// backend reports `succeeded` — at which point the resume is already saved
// server-side, so the component must NOT call updateProfile on the happy path.
// Include visa_status so happy-path tests don't trigger the visa dialog.
const structuredResume = { profile: { full_name: 'Test User', headline: 'Engineer', visa_status: 'US Citizen' } };

const successResponse = {
  structuredResume,
  rawText: null,
  resumePath: '/uploads/my-resume.pdf',
  jobId: 'job-1',
};

// ════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Render', () => {
  it('renders the upload zone and progress steps', () => {
    renderPage();
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
    expect(screen.getByText(/signed in/i)).toBeInTheDocument();
    expect(screen.getByText(/upload resume/i)).toBeInTheDocument();
  });

  it('has a hidden file input accepting pdf and docx', () => {
    renderPage();
    const input = getFileInput();
    expect(input).toBeTruthy();
    expect(input.accept).toContain('.pdf');
    expect(input.accept).toContain('.docx');
  });
});

// ════════════════════════════════════════════════════════════
// FILE SIZE VALIDATION
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - File size validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects files larger than 1MB and shows error', async () => {
    renderPage();
    await uploadFile(makeFile('big.pdf', 2 * 1024 * 1024));
    expect(await screen.findByText(/too large.*max 1mb/i)).toBeInTheDocument();
    expect(mockUploadResumeAndWait).not.toHaveBeenCalled();
  });

  it('accepts files at exactly 1MB', async () => {
    mockUploadResumeAndWait.mockResolvedValue(successResponse);
    mockUpdateProfile.mockResolvedValue({ data: {} });
    renderPage();
    await uploadFile(makeFile('exact.pdf', 1 * 1024 * 1024));
    await waitFor(() => expect(mockUploadResumeAndWait).toHaveBeenCalledTimes(1));
  });

  it('accepts files under 1MB', async () => {
    mockUploadResumeAndWait.mockResolvedValue(successResponse);
    mockUpdateProfile.mockResolvedValue({ data: {} });
    renderPage();
    await uploadFile(makeFile('small.pdf', 300 * 1024));
    await waitFor(() => expect(mockUploadResumeAndWait).toHaveBeenCalledTimes(1));
  });
});

// ════════════════════════════════════════════════════════════
// SUCCESSFUL UPLOAD FLOW
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Successful upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUploadResumeAndWait.mockResolvedValue(successResponse);
    mockUpdateProfile.mockResolvedValue({ data: {} });
  });

  it('calls uploadResumeAndWait with the selected file', async () => {
    renderPage();
    const file = makeFile();
    await uploadFile(file);
    await waitFor(() => expect(mockUploadResumeAndWait).toHaveBeenCalledWith(file));
  });

  it('does not re-save the resume — the backend persists it on parse success', async () => {
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('saves resume info to localStorage', async () => {
    renderPage();
    await uploadFile(makeFile());
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('screnaUserData') || '{}');
      // Component persists the selected file's own name, not the API's resumeFileName.
      expect(stored.resumeFileName).toBe('resume.pdf');
      expect(stored.resumeUploaded).toBe(true);
      expect(stored.resume_path).toBe('/uploads/my-resume.pdf');
      expect(stored.structuredResume).toEqual(structuredResume);
      expect(stored.resumeUploadedAt).toBeTruthy();
    });
  });

  it('merges with existing screnaUserData in localStorage', async () => {
    localStorage.setItem('screnaUserData', JSON.stringify({ firstName: 'Lu', existingKey: 'keep' }));
    renderPage();
    await uploadFile(makeFile());
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('screnaUserData') || '{}');
      expect(stored.firstName).toBe('Lu');
      expect(stored.existingKey).toBe('keep');
      // Component persists the selected file's own name, not the API's resumeFileName.
      expect(stored.resumeFileName).toBe('resume.pdf');
    });
  });

  it('calls onUploadSuccess after the full flow completes', async () => {
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
  });

  it('stores the selected file name even when no resume path comes back', async () => {
    mockUploadResumeAndWait.mockResolvedValue({ structuredResume, resumePath: null, jobId: 'job-1' });
    renderPage();
    await uploadFile(makeFile('fallback-name.pdf'));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('screnaUserData') || '{}');
      expect(stored.resumeFileName).toBe('fallback-name.pdf');
    });
  });
});

// ════════════════════════════════════════════════════════════
// NO STRUCTURED RESUME IN RESPONSE
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - No structured resume returned', () => {
  beforeEach(() => vi.clearAllMocks());

  // NOTE: with no structured resume the component can't read a visa_status, so
  // it routes to the visa dialog (onUploadSuccess is deferred until the dialog
  // is resolved) rather than completing immediately.
  it('shows the visa dialog when no structured resume comes back', async () => {
    mockUploadResumeAndWait.mockResolvedValue({ structuredResume: null, resumePath: null, jobId: 'job-1' });
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    expect(await screen.findByTestId('visa-dialog')).toBeInTheDocument();
    expect(onUploadSuccess).not.toHaveBeenCalled();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Error handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows error message when the upload/parse fails', async () => {
    mockUploadResumeAndWait.mockRejectedValue(new Error('Network error'));
    renderPage();
    await uploadFile(makeFile());
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('does not call onUploadSuccess when upload fails', async () => {
    mockUploadResumeAndWait.mockRejectedValue(new Error('Network error'));
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    await waitFor(() => screen.findByText(/network error/i));
    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it('surfaces a parse timeout from the poll helper', async () => {
    mockUploadResumeAndWait.mockRejectedValue(new Error('Timed out while processing your resume.'));
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    expect(await screen.findByText(/timed out while processing/i)).toBeInTheDocument();
    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it('does not update localStorage when upload fails', async () => {
    mockUploadResumeAndWait.mockRejectedValue(new Error('Network error'));
    localStorage.clear();
    renderPage();
    await uploadFile(makeFile());
    await waitFor(() => screen.findByText(/network error/i));
    expect(localStorage.getItem('screnaUserData')).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════
// VISA STATUS FLOW
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Visa status flow', () => {
  const resumeWithoutVisa = { profile: { full_name: 'Test User' } }; // no visa_status
  const resumeWithVisa = { profile: { full_name: 'Test User', visa_status: 'H1B' } };

  const parsedNoVisa = { structuredResume: resumeWithoutVisa, resumePath: null, jobId: 'job-1' };
  const parsedWithVisa = { structuredResume: resumeWithVisa, resumePath: null, jobId: 'job-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUpdateProfile.mockResolvedValue({ data: {} });
  });

  it('shows visa dialog when the parsed resume has no visa_status', async () => {
    mockUploadResumeAndWait.mockResolvedValue(parsedNoVisa);
    renderPage();
    await uploadFile(makeFile());
    expect(await screen.findByTestId('visa-dialog')).toBeInTheDocument();
    expect(screen.getByText(/couldn't detect your visa status/i)).toBeInTheDocument();
  });

  it('does not show visa dialog when visa_status is already present', async () => {
    mockUploadResumeAndWait.mockResolvedValue(parsedWithVisa);
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('visa-dialog')).not.toBeInTheDocument();
    // Nothing to re-save — the backend already persisted the parsed resume.
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('overwrites the saved resume once, with the visa status merged in', async () => {
    // This is the documented "user edited the parse result" case: a single
    // POST /profile/resume carrying the full resume. A bare { visa_status }
    // body would replace the whole stored resume with just that field.
    mockUploadResumeAndWait.mockResolvedValue(parsedNoVisa);
    const { onUploadSuccess } = renderPage();

    await uploadFile(makeFile());
    await screen.findByTestId('visa-dialog');

    // Select a visa status
    fireEvent.change(screen.getByTestId('visa-select'), { target: { value: 'H1B' } });

    // Click Save (button label is "Save & Continue")
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        profile: { full_name: 'Test User', visa_status: 'H1B' },
      })
    );
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
  });

  it('persists the resume with the chosen visa status to localStorage after Save', async () => {
    mockUploadResumeAndWait.mockResolvedValue(parsedNoVisa);
    renderPage();

    await uploadFile(makeFile());
    await screen.findByTestId('visa-dialog');
    fireEvent.change(screen.getByTestId('visa-select'), { target: { value: 'OPT' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('screnaUserData') || '{}');
      expect(stored.resumeUploaded).toBe(true);
      expect(stored.structuredResume).toEqual({
        profile: { full_name: 'Test User', visa_status: 'OPT' },
      });
    });
  });
});

// ════════════════════════════════════════════════════════════
// RETRY AFTER FAILURE
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Retry after failure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows re-upload after a failed attempt', async () => {
    mockUploadResumeAndWait
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(successResponse);
    mockUpdateProfile.mockResolvedValue({ data: {} });

    const { onUploadSuccess } = renderPage();

    // First attempt — fails
    await uploadFile(makeFile());
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
    expect(onUploadSuccess).not.toHaveBeenCalled();

    // Second attempt — succeeds
    await uploadFile(makeFile());
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
  });
});

// ════════════════════════════════════════════════════════════
// LOADING STATE
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Loading state', () => {
  it('shows uploading indicator while request is in flight', async () => {
    let resolve!: (v: any) => void;
    mockUploadResumeAndWait.mockReturnValue(new Promise(r => { resolve = r; }));

    renderPage();
    await uploadFile(makeFile());

    // Component gates re-entry via pointer-events on the drop zone rather than
    // a `disabled` attribute on the input, so we assert the uploading indicator.
    expect(screen.getByText(/uploading/i)).toBeInTheDocument();

    // Clean up
    resolve({ structuredResume: null, resumePath: null, jobId: 'job-1' });
  });
});
