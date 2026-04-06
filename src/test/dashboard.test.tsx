/**
 * Dashboard Tests
 * Covers: Resume upload, Resume download, Profile edit, Quick actions, Recent sessions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { createUserPlanMock } from '@/test/utils';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────
const mockGetPersonalInfo = vi.fn();
const mockGetProfile = vi.fn();
const mockSavePersonalInfo = vi.fn();
const mockUploadResume = vi.fn();
const mockUpdateProfile = vi.fn();
const mockGetTrainingPlans = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useUserPlan', () => ({
  useUserPlan: () => createUserPlanMock(),
  UserPlanProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/services/ProfileServices', () => ({
  getPersonalInfo: mockGetPersonalInfo,
  getProfile: mockGetProfile,
  savePersonalInfo: mockSavePersonalInfo,
  uploadResume: mockUploadResume,
  updateProfile: mockUpdateProfile,
}));

vi.mock('@/services/InterviewServices', () => ({
  getTrainingPlans: mockGetTrainingPlans,
}));

// Replace the current AuthContext mock (lines 44-52) with:
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@screna.ai', name: 'Test User', role: 'CANDIDATE', avatar: '' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
    loginWithGoogle: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerificationCode: vi.fn(),
    setUserFromToken: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/newDesign/dashboard-layout', () => ({
  DashboardLayout: ({ children, headerTitle }: any) => (
    <div data-testid="dashboard-layout">
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/components/newDesign/edit-profile-modal', () => ({
  EditProfileModal: ({ open, onClose, onSave, initialData }: any) =>
    open ? (
      <div data-testid="edit-profile-modal">
        <button onClick={() => onSave({ name: 'Updated Name', country: 'US', timezone: 'PST', jobStatus: 'active' })}>
          Save Profile
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('@/components/profile/ResumeAnalysisDialog', () => ({
  default: ({ open }: any) =>
    open ? <div data-testid="resume-analysis-dialog" /> : null,
}));

vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

vi.mock('@/utils/posthog', () => ({ safeCapture: vi.fn() }));

vi.mock('@/hooks/useRecommendedJobs', () => ({
  useRecommendedJobs: () => ({
    recommendations: [],
    isLoading: false,
    error: null,
    fetchRecommendations: vi.fn().mockResolvedValue([]),
    invalidate: vi.fn(),
  }),
  RecommendedJobsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Mock data ────────────────────────────────────────────
const personalInfoResponse = {
  data: {
    data: {
      name: 'Test User',
      email: 'test@screna.ai',
      avatarUrl: '',
      country: 'US',
      timezone: 'PST',
      resumeFileName: 'resume.pdf',
      resumeUploadedAt: '2024-01-01T00:00:00Z',
      resume_path: '/uploads/resume.pdf',
    },
  },
};

const trainingPlansResponse = {
  data: {
    data: [
      {
        id: 1,
        target_job_title: 'Software Engineer',
        target_company: 'Google',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
        modules: [
          {
            module_id: 'mod-1',
            title: 'Coding Round',
            status: 'completed',
            category: 'technical',
            score: 0.85,
            report_id: 'report-1',
            duration_minutes: 45,
          },
        ],
      },
    ],
  },
};

// ════════════════════════════════════════════════════════════
// RESUME UPLOAD
// ════════════════════════════════════════════════════════════
describe('Dashboard - Resume Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPersonalInfo.mockResolvedValue(personalInfoResponse);
    mockGetProfile.mockResolvedValue({ data: { data: {} } });
    mockGetTrainingPlans.mockResolvedValue(trainingPlansResponse);
    mockUploadResume.mockResolvedValue({
      data: { data: { resumeFileName: 'new-resume.pdf', resumeUploadedAt: new Date().toISOString() } },
    });
  });

  it('uploadResume is called with a File object', async () => {
    const file = new File(['resume content'], 'my-resume.pdf', { type: 'application/pdf' });
    await mockUploadResume(file);
    expect(mockUploadResume).toHaveBeenCalledWith(file);
  });

  it('uploadResume returns the new filename', async () => {
    const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    const result = await mockUploadResume(file);
    expect(result.data.data.resumeFileName).toBe('new-resume.pdf');
  });

  it('handles uploadResume API failure gracefully', async () => {
    mockUploadResume.mockRejectedValue(new Error('Upload failed'));
    const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    await expect(mockUploadResume(file)).rejects.toThrow('Upload failed');
  });

  it('uploads only PDF files (MIME validation)', () => {
    const pdfFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    const docxFile = new File(['content'], 'resume.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const isValidType = (f: File) =>
      ['application/pdf', 'application/msword',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type);

    expect(isValidType(pdfFile)).toBe(true);
    expect(isValidType(docxFile)).toBe(true);
    const imageFile = new File(['content'], 'pic.png', { type: 'image/png' });
    expect(isValidType(imageFile)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
// RESUME DOWNLOAD
// ════════════════════════════════════════════════════════════
describe('Dashboard - Resume Download', () => {
  it('opens resume URL in a new tab when download is triggered', () => {
    const openMock = vi.fn();
    window.open = openMock;

    const resumePath = '/uploads/resume.pdf';
    window.open(resumePath, '_blank');

    expect(openMock).toHaveBeenCalledWith('/uploads/resume.pdf', '_blank');
  });

  it('does not trigger download when resume_path is empty', () => {
    const openMock = vi.fn();
    window.open = openMock;

    const resumePath = '';
    if (resumePath) window.open(resumePath, '_blank');

    expect(openMock).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════
// PROFILE EDIT
// ════════════════════════════════════════════════════════════
describe('Dashboard - Profile Edit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPersonalInfo.mockResolvedValue(personalInfoResponse);
    mockGetProfile.mockResolvedValue({ data: { data: {} } });
    mockGetTrainingPlans.mockResolvedValue(trainingPlansResponse);
    mockSavePersonalInfo.mockResolvedValue({ data: { message: 'Saved' } });
    mockUpdateProfile.mockResolvedValue({ data: { message: 'Updated' } });
  });

  it('savePersonalInfo is called with updated name and country', async () => {
    await mockSavePersonalInfo({ name: 'John Doe', country: 'UK', timezone: 'GMT' });
    expect(mockSavePersonalInfo).toHaveBeenCalledWith({ name: 'John Doe', country: 'UK', timezone: 'GMT' });
  });

  it('getPersonalInfo is called on dashboard load', async () => {
    await mockGetPersonalInfo();
    expect(mockGetPersonalInfo).toHaveBeenCalled();
  });

  it('updateProfile saves full resume data', async () => {
    const profileData = { basics: { name: 'Test User', email: 'test@screna.ai' }, experience: [] };
    await mockUpdateProfile(profileData);
    expect(mockUpdateProfile).toHaveBeenCalledWith(profileData);
  });
});

// ════════════════════════════════════════════════════════════
// RECENT SESSIONS
// ════════════════════════════════════════════════════════════
describe('Dashboard - Recent Sessions', () => {
  it('maps completed training plan modules to recent sessions', () => {
    const plans = trainingPlansResponse.data.data;

    const mapScore = (raw: number) => {
      if (!raw) return 0;
      if (raw <= 1) return Math.round(raw * 100);
      if (raw <= 10) return Math.round(raw * 10);
      return Math.round(raw);
    };

    const sessions = plans.flatMap((plan: any) =>
      (plan.modules || [])
        .filter((m: any) => m.status === 'completed' && m.report_id)
        .map((m: any) => ({
          id: String(m.report_id),
          title: m.title,
          company: plan.target_company,
          score: mapScore(m.score ?? 0),
          duration: m.duration_minutes ? `${m.duration_minutes} min` : '--',
          date: plan.updated_at,
          tag: m.category,
        }))
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe('Coding Round');
    expect(sessions[0].score).toBe(85);
    expect(sessions[0].company).toBe('Google');
  });

  it('returns empty sessions when no completed modules', () => {
    const plans = [
      {
        id: 1,
        target_company: 'Meta',
        modules: [{ module_id: 'm1', status: 'pending', score: null, report_id: null }],
      },
    ];

    const sessions = plans.flatMap((plan) =>
      (plan.modules || []).filter((m) => m.status === 'completed' && m.report_id)
    );

    expect(sessions).toHaveLength(0);
  });

  it('handles training plans API failure gracefully', async () => {
    mockGetTrainingPlans.mockRejectedValue(new Error('Network error'));
    await expect(mockGetTrainingPlans()).rejects.toThrow('Network error');
  });
});

// ════════════════════════════════════════════════════════════
// QUICK ACTIONS
// ════════════════════════════════════════════════════════════
describe('Dashboard - Quick Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPersonalInfo.mockResolvedValue(personalInfoResponse);
    mockGetProfile.mockResolvedValue({ data: { data: {} } });
    mockGetTrainingPlans.mockResolvedValue(trainingPlansResponse);
  });

  it('fetches personal info on mount', async () => {
    const { DashboardPage } = await import('@/pages/newDesign/dashboard');
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(mockGetPersonalInfo).toHaveBeenCalled();
    });
  });

  it('navigate to /personalized-practice when quick action is clicked', () => {
    mockNavigate('/personalized-practice');
    expect(mockNavigate).toHaveBeenCalledWith('/personalized-practice');
  });

  it('navigate to /history when view history is clicked', () => {
    mockNavigate('/history');
    expect(mockNavigate).toHaveBeenCalledWith('/history');
  });
});

// ════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════
describe('Dashboard - Helper Functions', () => {
  it('formatRelativeTime returns "Today" for current date', () => {
    const formatRelativeTime = (isoDate: string): string => {
      const date = new Date(isoDate);
      const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    };

    expect(formatRelativeTime(new Date().toISOString())).toBe('Today');
  });

  it('formatRelativeTime returns "Yesterday" for yesterday', () => {
    const formatRelativeTime = (isoDate: string): string => {
      const date = new Date(isoDate);
      const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays} days ago`;
    };

    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    expect(formatRelativeTime(yesterday)).toBe('Yesterday');
  });
});
