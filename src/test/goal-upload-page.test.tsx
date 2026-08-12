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
const { mockUploadResumeAndWait } = vi.hoisted(() => ({
  mockUploadResumeAndWait: vi.fn(),
}));

vi.mock('@/services/ProfileServices', () => ({
  uploadResumeAndWait: mockUploadResumeAndWait,
}));

vi.mock('@/components/newDesign/ui/button', () => ({
  Button: ({ onClick, disabled, children, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>{children}</button>
  ),
}));

import { GoalUploadPage } from '../pages/newDesign/goal-upload-page';

// ─── Helpers ──────────────────────────────────────────────
// Shaped like the real ResumeUnreadableError (ProfileServices) — the page reads
// `message`, so that plus the code is all it needs.
function unreadableError() {
  const err = new Error(
    "We couldn't read your resume. Please try another file — a text-based PDF or Word document works best (scanned or image-only files can't be read).",
  ) as Error & { code: string };
  err.code = 'RESUME_UNREADABLE';
  return err;
}

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
// server-side, so the component never re-saves it.
const structuredResume = { profile: { full_name: 'Test User', headline: 'Engineer' } };

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
    renderPage();
    await uploadFile(makeFile('exact.pdf', 1 * 1024 * 1024));
    await waitFor(() => expect(mockUploadResumeAndWait).toHaveBeenCalledTimes(1));
  });

  it('accepts files under 1MB', async () => {
    mockUploadResumeAndWait.mockResolvedValue(successResponse);
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
  });

  it('calls uploadResumeAndWait with the selected file', async () => {
    renderPage();
    const file = makeFile();
    await uploadFile(file);
    await waitFor(() => expect(mockUploadResumeAndWait).toHaveBeenCalledWith(file));
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
// A file that stored fine but parsed to nothing never reaches the component as
// a resolved upload — uploadResumeAndWait rejects with ResumeUnreadableError so
// the step stays incomplete and the user is asked for a different file.
describe('GoalUploadPage - Unreadable resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows the "try another file" message and does not complete the step', async () => {
    mockUploadResumeAndWait.mockRejectedValue(unreadableError());
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    expect(await screen.findByText(/couldn't read your resume/i)).toBeInTheDocument();
    expect(onUploadSuccess).not.toHaveBeenCalled();
    expect(localStorage.getItem('screnaUserData')).toBeNull();
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
// RETRY AFTER FAILURE
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Retry after failure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows re-upload after a failed attempt', async () => {
    mockUploadResumeAndWait
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(successResponse);

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
