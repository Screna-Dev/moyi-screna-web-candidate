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
const { mockUploadResume, mockUpdateProfile } = vi.hoisted(() => ({
  mockUploadResume: vi.fn(),
  mockUpdateProfile: vi.fn(),
}));

vi.mock('@/services/ProfileServices', () => ({
  uploadResume: mockUploadResume,
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
// Include visa_status so happy-path tests don't trigger the visa dialog
const structuredResume = { profile: { full_name: 'Test User', headline: 'Engineer', visa_status: 'US Citizen' } };

const successResponse = {
  data: {
    data: {
      structured_resume: structuredResume,
      resumeFileName: 'my-resume.pdf',
      resume_path: '/uploads/my-resume.pdf',
    },
  },
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
    expect(await screen.findByText(/smaller than 1MB/i)).toBeInTheDocument();
    expect(mockUploadResume).not.toHaveBeenCalled();
  });

  it('accepts files at exactly 1MB', async () => {
    mockUploadResume.mockResolvedValue(successResponse);
    mockUpdateProfile.mockResolvedValue({ data: {} });
    renderPage();
    await uploadFile(makeFile('exact.pdf', 1 * 1024 * 1024));
    await waitFor(() => expect(mockUploadResume).toHaveBeenCalledTimes(1));
  });

  it('accepts files under 1MB', async () => {
    mockUploadResume.mockResolvedValue(successResponse);
    mockUpdateProfile.mockResolvedValue({ data: {} });
    renderPage();
    await uploadFile(makeFile('small.pdf', 300 * 1024));
    await waitFor(() => expect(mockUploadResume).toHaveBeenCalledTimes(1));
  });
});

// ════════════════════════════════════════════════════════════
// SUCCESSFUL UPLOAD FLOW
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Successful upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUploadResume.mockResolvedValue(successResponse);
    mockUpdateProfile.mockResolvedValue({ data: {} });
  });

  it('calls uploadResume with the selected file', async () => {
    renderPage();
    const file = makeFile();
    await uploadFile(file);
    await waitFor(() => expect(mockUploadResume).toHaveBeenCalledWith(file));
  });

  it('calls updateProfile with the parsed structured resume', async () => {
    renderPage();
    await uploadFile(makeFile());
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(structuredResume)
    );
  });

  it('saves resume info to localStorage', async () => {
    renderPage();
    await uploadFile(makeFile());
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('screnaUserData') || '{}');
      expect(stored.resumeFileName).toBe('my-resume.pdf');
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
      expect(stored.resumeFileName).toBe('my-resume.pdf');
    });
  });

  it('calls onUploadSuccess after the full flow completes', async () => {
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
  });

  it('uses file.name as fallback when API does not return resumeFileName', async () => {
    mockUploadResume.mockResolvedValue({
      data: { data: { structured_resume: structuredResume } },
    });
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
describe('GoalUploadPage - No structured_resume in response', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips updateProfile when structured_resume is absent', async () => {
    mockUploadResume.mockResolvedValue({ data: { data: { resumeFileName: 'resume.pdf' } } });
    renderPage();
    await uploadFile(makeFile());
    await waitFor(() => expect(mockUploadResume).toHaveBeenCalledTimes(1));
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('still calls onUploadSuccess when structured_resume is absent', async () => {
    mockUploadResume.mockResolvedValue({ data: { data: { resumeFileName: 'resume.pdf' } } });
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
  });
});

// ════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Error handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows error message when uploadResume fails', async () => {
    mockUploadResume.mockRejectedValue(new Error('Network error'));
    renderPage();
    await uploadFile(makeFile());
    expect(await screen.findByText(/upload failed/i)).toBeInTheDocument();
  });

  it('does not call onUploadSuccess when upload fails', async () => {
    mockUploadResume.mockRejectedValue(new Error('Network error'));
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    await waitFor(() => screen.findByText(/upload failed/i));
    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it('does not call onUploadSuccess when updateProfile fails', async () => {
    mockUploadResume.mockResolvedValue(successResponse);
    mockUpdateProfile.mockRejectedValue(new Error('Save failed'));
    const { onUploadSuccess } = renderPage();
    await uploadFile(makeFile());
    await waitFor(() => screen.findByText(/upload failed/i));
    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it('does not update localStorage when upload fails', async () => {
    mockUploadResume.mockRejectedValue(new Error('Network error'));
    localStorage.clear();
    renderPage();
    await uploadFile(makeFile());
    await waitFor(() => screen.findByText(/upload failed/i));
    expect(localStorage.getItem('screnaUserData')).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════
// VISA STATUS FLOW
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Visa status flow', () => {
  const resumeWithoutVisa = { profile: { full_name: 'Test User' } }; // no visa_status
  const resumeWithVisa = { profile: { full_name: 'Test User', visa_status: 'H1B' } };

  const uploadResponseNoVisa = {
    data: { data: { structured_resume: resumeWithoutVisa, resumeFileName: 'resume.pdf' } },
  };
  const uploadResponseWithVisa = {
    data: { data: { structured_resume: resumeWithVisa, resumeFileName: 'resume.pdf' } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUpdateProfile.mockResolvedValue({ data: {} });
  });

  it('shows visa dialog when structured_resume has no visa_status', async () => {
    mockUploadResume.mockResolvedValue(uploadResponseNoVisa);
    renderPage();
    await uploadFile(makeFile());
    expect(await screen.findByTestId('visa-dialog')).toBeInTheDocument();
    expect(screen.getByText(/set your work authorization/i)).toBeInTheDocument();
  });

  it('does not show visa dialog when visa_status is already present', async () => {
    mockUploadResume.mockResolvedValue(uploadResponseWithVisa);
    renderPage();
    await uploadFile(makeFile());
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('visa-dialog')).not.toBeInTheDocument();
  });

  it('saves selected visa status merged into the resume on Save', async () => {
    mockUploadResume.mockResolvedValue(uploadResponseNoVisa);
    const { onUploadSuccess } = renderPage();

    await uploadFile(makeFile());
    await screen.findByTestId('visa-dialog');

    // Select a visa status
    fireEvent.change(screen.getByTestId('visa-select'), { target: { value: 'H1B' } });

    // Click Save
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({ visa_status: 'H1B' }),
        })
      )
    );
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
  });

  it('saves without visa status when user clicks Skip', async () => {
    mockUploadResume.mockResolvedValue(uploadResponseNoVisa);
    const { onUploadSuccess } = renderPage();

    await uploadFile(makeFile());
    await screen.findByTestId('visa-dialog');

    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(resumeWithoutVisa)
    );
    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
  });

  it('saves visa status to localStorage after Save', async () => {
    mockUploadResume.mockResolvedValue(uploadResponseNoVisa);
    renderPage();

    await uploadFile(makeFile());
    await screen.findByTestId('visa-dialog');
    fireEvent.change(screen.getByTestId('visa-select'), { target: { value: 'OPT' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('screnaUserData') || '{}');
      expect(stored.structuredResume.profile.visa_status).toBe('OPT');
    });
  });
});

// ════════════════════════════════════════════════════════════
// RETRY AFTER FAILURE
// ════════════════════════════════════════════════════════════
describe('GoalUploadPage - Retry after failure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows re-upload after a failed attempt', async () => {
    mockUploadResume
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(successResponse);
    mockUpdateProfile.mockResolvedValue({ data: {} });

    const { onUploadSuccess } = renderPage();

    // First attempt — fails
    await uploadFile(makeFile());
    expect(await screen.findByText(/upload failed/i)).toBeInTheDocument();
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
    mockUploadResume.mockReturnValue(new Promise(r => { resolve = r; }));

    renderPage();
    await uploadFile(makeFile());

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    expect(getFileInput().disabled).toBe(true);

    // Clean up
    resolve({ data: { data: {} } });
  });
});
