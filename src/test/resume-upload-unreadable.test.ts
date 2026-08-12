/**
 * A parse job that reports `succeeded` without producing a structured resume
 * means the file is stored but unreadable (scanned PDF, image-only, empty).
 * uploadResumeAndWait must reject so call sites ask for a different file
 * instead of showing success — but only after confirming against the profile,
 * since the status payload doesn't always echo the parse result back.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPost, mockGet } = vi.hoisted(() => ({ mockPost: vi.fn(), mockGet: vi.fn() }));

vi.mock('@/services/api', () => ({ default: { post: mockPost, get: mockGet } }));

import {
  uploadResumeAndWait,
  isResumeUnreadableError,
  isUsableStructuredResume,
  RESUME_UNREADABLE_MESSAGE,
} from '@/services/ProfileServices';

// Verbatim shape seen in staging: the parser recovered a name off the file and
// produced an otherwise empty skeleton.
const emptyParse = {
  profile: { full_name: 'Shaowei Xu', summary: '' },
  summary: '',
  job_titles: [],
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  links: { other: [] },
};

const file = new File(['x'], 'resume.pdf', { type: 'application/pdf' });
const opts = { intervalMs: 1, maxAttempts: 3 };

const resume = {
  profile: { full_name: 'Test User', headline: 'Engineer' },
  job_titles: ['Software Engineer'],
  experience: [{ company: 'Acme', title: 'Software Engineer' }],
};

function mockStatus(payload: Record<string, unknown>) {
  mockGet.mockImplementation((url: string) =>
    url.includes('/upload-resume/status/')
      ? Promise.resolve({ data: { data: payload } })
      : Promise.resolve({ data: { data: { resume_path: null, structured_resume: null } } })
  );
}

describe('uploadResumeAndWait — unreadable resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: { data: { job_id: 'job-1', status: 'PENDING' } } });
  });

  it('rejects with the "try another file" error when nothing was parsed', async () => {
    mockStatus({ status: 'succeeded', structured_resume: null, resume_path: '/files/resume.pdf' });

    await expect(uploadResumeAndWait(file, opts)).rejects.toMatchObject({
      code: 'RESUME_UNREADABLE',
      message: RESUME_UNREADABLE_MESSAGE,
      resumePath: '/files/resume.pdf',
    });

    await uploadResumeAndWait(file, opts).catch((err) => {
      expect(isResumeUnreadableError(err)).toBe(true);
    });
  });

  it('falls back to the stored profile when the status payload omits the resume', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/upload-resume/status/')
        ? Promise.resolve({ data: { data: { status: 'succeeded', structured_resume: null } } })
        : Promise.resolve({ data: { data: { resume_path: '/files/r.pdf', structured_resume: resume } } })
    );

    await expect(uploadResumeAndWait(file, opts)).resolves.toMatchObject({
      structuredResume: resume,
      resumePath: '/files/r.pdf',
    });
  });

  it('resolves straight from the status payload when it carries the resume', async () => {
    mockStatus({ status: 'succeeded', structured_resume: resume, resume_path: '/files/r.pdf' });

    await expect(uploadResumeAndWait(file, opts)).resolves.toMatchObject({ structuredResume: resume });
    // No confirmation fetch needed on the happy path.
    expect(mockGet.mock.calls.filter(([url]) => !url.includes('/upload-resume/status/'))).toHaveLength(0);
  });

  it('rejects on a name-only skeleton, which the backend reports as success', async () => {
    mockStatus({ status: 'succeeded', structured_resume: emptyParse, resume_path: '/files/r.pdf' });

    await expect(uploadResumeAndWait(file, opts)).rejects.toMatchObject({ code: 'RESUME_UNREADABLE' });
    // An empty parse is unambiguous — no confirmation fetch, and in particular
    // no chance of an older stored resume masking this failure.
    expect(mockGet.mock.calls.filter(([url]) => !url.includes('/upload-resume/status/'))).toHaveLength(0);
  });

  it('rejects when the stored profile fallback is an empty skeleton too', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/upload-resume/status/')
        ? Promise.resolve({ data: { data: { status: 'succeeded' } } })
        : Promise.resolve({ data: { data: { resume_path: '/files/r.pdf', structured_resume: emptyParse } } })
    );

    await expect(uploadResumeAndWait(file, opts)).rejects.toMatchObject({ code: 'RESUME_UNREADABLE' });
  });

  it('still rejects with the parse job error when the job itself fails', async () => {
    mockStatus({ status: 'failed', error: 'Resume parsing failed.' });

    await expect(uploadResumeAndWait(file, opts)).rejects.toThrow('Resume parsing failed.');
  });
});

describe('isUsableStructuredResume', () => {
  it('rejects empty, missing and name-only parses', () => {
    expect(isUsableStructuredResume(null)).toBe(false);
    expect(isUsableStructuredResume({})).toBe(false);
    expect(isUsableStructuredResume(emptyParse)).toBe(false);
    expect(isUsableStructuredResume({ ...emptyParse, profile: { full_name: 'A', email: 'a@b.c', phone: '123' } })).toBe(false);
  });

  it('accepts a parse with any real content', () => {
    expect(isUsableStructuredResume({ ...emptyParse, experience: [{ company: 'Acme' }] })).toBe(true);
    expect(isUsableStructuredResume({ ...emptyParse, skills: [{ name: 'Go' }] })).toBe(true);
    expect(isUsableStructuredResume({ ...emptyParse, job_titles: ['SWE'] })).toBe(true);
    expect(isUsableStructuredResume({ ...emptyParse, summary: 'Backend engineer' })).toBe(true);
    expect(isUsableStructuredResume({ ...emptyParse, profile: { headline: 'SWE' } })).toBe(true);
    expect(isUsableStructuredResume({ ...emptyParse, profile: { total_years_experience: 4 } })).toBe(true);
  });

  it('does not count whitespace as a summary', () => {
    expect(isUsableStructuredResume({ ...emptyParse, summary: '   ' })).toBe(false);
  });
});
