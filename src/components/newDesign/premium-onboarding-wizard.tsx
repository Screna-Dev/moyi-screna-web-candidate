import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Loader2,
  UploadCloud,
  AlertCircle,
  FileText,
  X,
  ArrowLeft,
} from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  uploadResume,
  updateProfile,
  getProfile,
  getJobsPreferences,
  upsertJobsPreferences,
} from '@/services/ProfileServices';

// ── Types ────────────────────────────────────────────────────────────────────

interface PremiumOnboardingWizardProps {
  open: boolean;
  onCancel: () => void;
  // Called after the user signs consent on step 3. Parent should run the
  // actual subscribe / changeTier API call (Stripe redirect, etc.).
  onComplete: () => void | Promise<void>;
  // Loading state from parent (e.g. while subscribe API is running).
  isCompleting?: boolean;
}

type Step = 1 | 2 | 3;
type ResumeState = 'checking' | 'idle' | 'uploading' | 'success';
type ConsentKey = 'authorization' | 'representations' | 'scope' | 'subscription';

interface JobPrefsDraft {
  employmentTypes: string[];
  workModes: string[];
  salaryMin: string;
  salaryMax: string;
  locationTags: string[];
  startAvail: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EMP_TYPES = [
  { id: 'Full-time', label: 'Full-time' },
  { id: 'Part-time', label: 'Part-time' },
  { id: 'Contract', label: 'Contract' },
  { id: 'Internship', label: 'Internship' },
];
const WORK_MODES = [
  { id: 'Remote', label: 'Remote' },
  { id: 'Hybrid', label: 'Hybrid' },
  { id: 'On-site', label: 'On-site' },
];
const START_OPTIONS = [
  { id: 'Immediately', label: 'Immediately' },
  { id: '2 weeks', label: '2 weeks' },
  { id: '1 month', label: '1 month' },
  { id: '2 months', label: '2 months' },
  { id: '3 months', label: '3 months' },
];

interface ConsentSection {
  key: ConsentKey;
  number: string;
  title: string;
  checkboxLabel: string;
  body: React.ReactNode;
}

const CONSENT_SECTIONS: ConsentSection[] = [
  {
    key: 'authorization',
    number: '1',
    title: 'Authorization Granted',
    checkboxLabel:
      'I authorize Screna AI to submit job applications, operate third-party application accounts on my behalf, and attach my resume and cover letter as described above.',
    body: (
      <>
        <p className="mb-3">
          By confirming your acceptance below, you expressly authorize Screna AI
          ("Screna," "we," "us") to:
        </p>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <li>Submit job applications to prospective employers on your behalf;</li>
          <li>
            Create, access, and operate application accounts on third-party
            platforms &mdash; including but not limited to Workday, LinkedIn, and
            company-operated career portals &mdash; using credentials you have
            provided;
          </li>
          <li>
            Complete employment application forms using the personal information,
            job preferences, and compliance disclosures stored in your Application
            Profile; and
          </li>
          <li>
            Attach and submit your resume and, where required, a cover letter, as
            part of such applications.
          </li>
        </ul>
        <p className="mb-3">
          This authorization shall remain in effect for the duration of your
          active Premium Membership subscription, unless earlier revoked by you.
        </p>
      </>
    ),
  },
  {
    key: 'representations',
    number: '2',
    title: 'Member Representations and Responsibilities',
    checkboxLabel:
      'I confirm that all information in my Application Profile is accurate, complete, and truthful, and I accept sole legal responsibility for the information submitted on my behalf.',
    body: (
      <>
        <p className="mb-2">
          <strong>2.1 Accuracy of Information.</strong> You represent and warrant
          that all information contained in your Application Profile is accurate,
          complete, and truthful. You bear sole legal responsibility for the
          accuracy of all information submitted to prospective employers on your
          behalf, including work authorization status, employment history,
          restrictive covenants, and any conflict-of-interest disclosures.
        </p>
        <p className="mb-2">
          Screna transmits your information to prospective employers as provided
          by you, without independent verification.{' '}
          <strong>
            You are solely and legally responsible for the truthfulness of all
            submitted information.
          </strong>
        </p>
        <p className="mb-2">
          <strong>2.2 Monitoring of Applications.</strong> You can review all
          submitted applications through Jobs &rarr; Applied and are responsible
          for notifying Screna promptly via Discord of any errors.
        </p>
        <p className="mb-3">
          <strong>2.3 Application Credentials.</strong> The Application Password
          you provide to Screna must not be used for any other personal or
          financial accounts.
        </p>
      </>
    ),
  },
  {
    key: 'scope',
    number: '3',
    title: 'Scope and Limitations of the Managed Apply Service',
    checkboxLabel:
      'I understand Managed Apply is an application-submission service only, that Screna does not guarantee any interview or offer, and that my plan includes up to 200 managed applications per calendar month.',
    body: (
      <>
        <p className="mb-2">
          <strong>3.1 Service Description.</strong> Managed Apply is a job
          application submission service only. Screna does not negotiate
          compensation, represent you in any interview, guarantee any response or
          offer, or modify your resume without your instruction.
        </p>
        <p className="mb-2">
          <strong>3.2 No Guarantee of Outcomes.</strong> Results are subject to
          factors beyond Screna's control, including your qualifications,
          employer requirements, and labor market conditions.
        </p>
        <p className="mb-3">
          <strong>3.3 Monthly Application Volume.</strong> Your Premium
          Membership includes up to <strong>200 managed applications per
          calendar month</strong>. Unused capacity does not roll over.
        </p>
      </>
    ),
  },
  {
    key: 'subscription',
    number: '4',
    title: 'Subscription Terms, Billing, and Refunds',
    checkboxLabel:
      'I understand the subscription auto-renews until cancelled, that refunds are available within 3 calendar days of any payment, and I agree to the cancellation and refund process described.',
    body: (
      <>
        <p className="mb-2">
          <strong>4.1 Automatic Renewal.</strong> Your Premium Membership renews
          automatically at the conclusion of each billing period unless cancelled
          prior to the renewal date.
        </p>
        <p className="mb-2">
          <strong>4.2 Cancellation.</strong> You may cancel auto-renewal at any
          time via Settings &rarr; Billing. Cancellation stops future charges;
          benefits remain accessible through the end of the paid period.
        </p>
        <p className="mb-3">
          <strong>4.3 Refund Policy.</strong> Screna offers a{' '}
          <strong>full refund within three (3) calendar days</strong> of any
          subscription payment, including renewals. Approved refunds are
          processed within 5&ndash;10 business days. Pay-as-you-go credits are
          non-refundable.
        </p>
      </>
    ),
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const REQUIRED_PREFS_FIELDS = ['first_name', 'middle_name', 'last_name', 'email', 'phone'] as const;

// Mirror the toApiPayload behavior used by application-profile-tab.tsx: required
// fields always present (null when missing), optional blanks omitted.
function buildApplyPrefsPayload(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...existing, ...patch };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) {
    const value =
      k === 'work_modes' && Array.isArray(v)
        ? v.map((m: unknown) => (typeof m === 'string' && m.trim() === 'Hybrid' ? 'Hybrid' : m))
        : v;
    if ((REQUIRED_PREFS_FIELDS as readonly string[]).includes(k)) {
      out[k] = value === '' || value === undefined ? null : value;
    } else if (value !== '' && value !== null && value !== undefined) {
      out[k] = value;
    }
  }
  for (const f of REQUIRED_PREFS_FIELDS) {
    if (!(f in out)) out[f] = null;
  }
  return out;
}

// ── Component ────────────────────────────────────────────────────────────────

export function PremiumOnboardingWizard({
  open,
  onCancel,
  onComplete,
  isCompleting = false,
}: PremiumOnboardingWizardProps) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 — resume
  const [resumeState, setResumeState] = useState<ResumeState>('checking');
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — job prefs
  const [prefs, setPrefs] = useState<JobPrefsDraft>({
    employmentTypes: [],
    workModes: [],
    salaryMin: '',
    salaryMax: '',
    locationTags: [],
    startAvail: 'Immediately',
  });
  const [existingApplyPrefs, setExistingApplyPrefs] = useState<Record<string, unknown>>({});
  const [locationInput, setLocationInput] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Step 3 — consent
  const [checked, setChecked] = useState<Record<ConsentKey, boolean>>({
    authorization: false,
    representations: false,
    scope: false,
    subscription: false,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Reset + load on open ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';

    setStep(1);
    setResumeError(null);
    setPrefsError(null);
    setLocationInput('');
    setChecked({
      authorization: false,
      representations: false,
      scope: false,
      subscription: false,
    });

    // Check whether the user already has a resume on file.
    setResumeState('checking');
    getProfile()
      .then((res: { data?: { data?: { structured_resume?: unknown; resume_path?: string } } & { structured_resume?: unknown; resume_path?: string } }) => {
        const payload = res?.data?.data ?? res?.data ?? {};
        const sr = (payload as { structured_resume?: { experience?: unknown[]; profile?: unknown } }).structured_resume;
        const hasResume =
          !!(payload as { resume_path?: string }).resume_path ||
          !!(sr && (sr.profile || (Array.isArray(sr.experience) && sr.experience.length > 0)));
        setResumeState(hasResume ? 'success' : 'idle');
      })
      .catch(() => {
        setResumeState('idle');
      });

    // Pre-fill job preferences from existing apply-prefs if any.
    getJobsPreferences()
      .then((res: { data?: { data?: { candidate_apply_preferences?: Record<string, unknown> } } }) => {
        const ap = (res?.data?.data?.candidate_apply_preferences ?? {}) as Record<string, unknown>;
        setExistingApplyPrefs(ap);
        setPrefs({
          employmentTypes: (ap.employment_types as string[] | undefined) ?? [],
          workModes: (ap.work_modes as string[] | undefined) ?? [],
          salaryMin:
            ap.salary_min != null ? String(Math.round((ap.salary_min as number) / 1000)) : '',
          salaryMax:
            ap.salary_max != null ? String(Math.round((ap.salary_max as number) / 1000)) : '',
          locationTags: (ap.target_locations as string[] | undefined) ?? [],
          startAvail: (ap.earliest_start_date as string | undefined) ?? 'Immediately',
        });
      })
      .catch(() => {
        // Empty profile — start with defaults.
      });

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Reset scroll on step change.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  if (!open) return null;

  // ── Step 1 handlers ──────────────────────────────────────────────────────

  const processResumeFile = async (file: File) => {
    if (file.size > 1024 * 1024) {
      setResumeError('File is too large. Max 1MB.');
      return;
    }
    setResumeError(null);
    setResumeState('uploading');
    try {
      const res = await uploadResume(file);
      const rd = (res as { data?: { data?: { structured_resume?: unknown; resume_path?: string } } & { structured_resume?: unknown; resume_path?: string } }).data;
      const structuredResume =
        (rd?.data as { structured_resume?: unknown })?.structured_resume ??
        (rd as { structured_resume?: unknown })?.structured_resume ??
        rd;
      updateProfile(structuredResume).catch(() => {});
      setResumeFileName(file.name);
      setResumeState('success');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Upload failed. Please try again.';
      setResumeError(msg);
      setResumeState('idle');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processResumeFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await processResumeFile(file);
  };

  // ── Step 2 handlers ──────────────────────────────────────────────────────

  const toggleArr = (arr: string[], v: string): string[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const addLocation = () => {
    const v = locationInput.trim();
    if (!v) return;
    if (prefs.locationTags.includes(v)) {
      setLocationInput('');
      return;
    }
    setPrefs((p) => ({ ...p, locationTags: [...p.locationTags, v] }));
    setLocationInput('');
  };

  const removeLocation = (loc: string) => {
    setPrefs((p) => ({ ...p, locationTags: p.locationTags.filter((l) => l !== loc) }));
  };

  const handleSavePrefsAndContinue = async () => {
    if (prefs.employmentTypes.length === 0 || prefs.workModes.length === 0) {
      setPrefsError('Please select at least one employment type and one work mode.');
      return;
    }
    setPrefsError(null);
    setSavingPrefs(true);
    try {
      const patch: Record<string, unknown> = {
        employment_types: prefs.employmentTypes,
        work_modes: prefs.workModes,
        target_locations: prefs.locationTags,
        earliest_start_date: prefs.startAvail,
      };
      if (prefs.salaryMin) patch.salary_min = parseInt(prefs.salaryMin) * 1000;
      if (prefs.salaryMax) patch.salary_max = parseInt(prefs.salaryMax) * 1000;
      await upsertJobsPreferences({
        candidate_apply_preferences: buildApplyPrefsPayload(existingApplyPrefs, patch),
      });
      setStep(3);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not save your preferences. Please try again.';
      setPrefsError(msg);
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── Step 3 handlers ──────────────────────────────────────────────────────

  const allChecked = CONSENT_SECTIONS.every((s) => checked[s.key]);

  const handleConfirm = async () => {
    await onComplete();
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const STEP_TITLES: Record<Step, string> = {
    1: 'Upload your resume',
    2: 'Set your job preferences',
    3: 'Review the Premium Membership Agreement',
  };

  const canAdvanceFromStep1 = resumeState === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!isCompleting && !savingPrefs && resumeState !== 'uploading') onCancel();
        }}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2
              className="text-lg font-semibold text-slate-900"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Activate Screna Premium
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Step {step} of 3 &middot; {STEP_TITLES[step]}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isCompleting}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* ── Stepper ── */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/60">
          {([1, 2, 3] as Step[]).map((s, i) => {
            const done = s < step;
            const active = s === step;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                    done
                      ? 'bg-[#00bc7d] text-white'
                      : active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : s}
                </div>
                <span
                  className={`text-xs ${
                    active ? 'text-slate-900 font-medium' : 'text-slate-500'
                  }`}
                >
                  {s === 1 ? 'Resume' : s === 2 ? 'Preferences' : 'Agreement'}
                </span>
                {i < 2 && <div className="flex-1 h-px bg-slate-200" />}
              </div>
            );
          })}
        </div>

        {/* ── Body (scrollable) ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Screna uses your resume to personalize applications, match you to
                roles, and pre-fill third-party application forms on your behalf.
              </p>

              {resumeState === 'checking' && (
                <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Checking for an existing resume…
                </div>
              )}

              {resumeState !== 'checking' && resumeState !== 'success' && (
                <>
                  <div
                    className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 group ${
                      resumeState === 'uploading'
                        ? 'border-slate-200 bg-white pointer-events-none'
                        : 'border-[rgba(60,119,246,0.3)] bg-[rgba(239,246,255,0.3)] hover:border-blue-500/50 hover:bg-blue-50/60 cursor-pointer'
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => resumeState !== 'uploading' && fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center justify-center py-10 px-6">
                      {resumeState === 'uploading' ? (
                        <>
                          <Loader2 className="w-8 h-8 text-[hsl(221,91%,60%)] animate-spin mb-3" />
                          <p className="text-sm font-medium text-slate-700">
                            Uploading your resume…
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center mb-4">
                            <UploadCloud className="w-6 h-6 text-[#3c77f6]" strokeWidth={2} />
                          </div>
                          <p className="text-sm font-medium text-[#314158] text-center mb-1">
                            Drag and drop your resume here, or{' '}
                            <span className="text-[#3c77f6] group-hover:underline">browse</span>
                          </p>
                          <p className="text-xs text-[#62748e] text-center">
                            Supports PDF, DOCX &middot; Max 1MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {resumeError && (
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p className="text-[13px]">{resumeError}</p>
                    </div>
                  )}
                </>
              )}

              {resumeState === 'success' && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {resumeFileName ? 'Resume uploaded' : 'Resume already on file'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {resumeFileName ??
                        "We'll use your existing resume for managed applications. You can swap it later from your profile."}
                    </p>
                  </div>
                  {!resumeFileName && (
                    <button
                      onClick={() => {
                        setResumeState('idle');
                        setResumeFileName(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 shrink-0"
                    >
                      Replace
                    </button>
                  )}
                  {resumeFileName && (
                    <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <p className="text-sm text-slate-600 leading-relaxed">
                Tell us what you're looking for. We'll only apply to roles that
                match these preferences. You can update them anytime from your
                Application Profile.
              </p>

              {/* Employment type */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2.5">
                  Employment Type
                </p>
                <div className="flex flex-wrap gap-2">
                  {EMP_TYPES.map(({ id, label }) => {
                    const sel = prefs.employmentTypes.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setPrefs((p) => ({ ...p, employmentTypes: toggleArr(p.employmentTypes, id) }))
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                          sel
                            ? 'border-slate-900 bg-slate-900/5 text-slate-900'
                            : 'border-slate-200 text-slate-600 bg-white hover:border-slate-400'
                        }`}
                      >
                        {sel && <Check className="w-3 h-3 shrink-0" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Work mode */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2.5">
                  Work Mode
                </p>
                <div className="flex flex-wrap gap-2">
                  {WORK_MODES.map(({ id, label }) => {
                    const sel = prefs.workModes.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setPrefs((p) => ({ ...p, workModes: toggleArr(p.workModes, id) }))
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                          sel
                            ? 'border-slate-900 bg-slate-900/5 text-slate-900'
                            : 'border-slate-200 text-slate-600 bg-white hover:border-slate-400'
                        }`}
                      >
                        {sel && <Check className="w-3 h-3 shrink-0" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Salary */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2.5">
                  Desired Salary Range (USD / year)
                </p>
                <div className="flex items-center gap-3 max-w-[360px]">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      $
                    </span>
                    <input
                      value={prefs.salaryMin}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, salaryMin: e.target.value.replace(/[^0-9]/g, '') }))
                      }
                      className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="120"
                      inputMode="numeric"
                    />
                  </div>
                  <span className="text-slate-400 text-sm shrink-0">to</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      $
                    </span>
                    <input
                      value={prefs.salaryMax}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, salaryMax: e.target.value.replace(/[^0-9]/g, '') }))
                      }
                      className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="160"
                      inputMode="numeric"
                    />
                  </div>
                  <span className="text-slate-400 text-sm shrink-0">K</span>
                </div>
              </div>

              {/* Locations */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2.5">
                  Preferred Locations
                </p>
                <div className="flex flex-wrap gap-2">
                  {prefs.locationTags.map((loc) => (
                    <div
                      key={loc}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-100 text-sm text-slate-700"
                    >
                      {loc}
                      <button
                        onClick={() => removeLocation(loc)}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <input
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addLocation();
                      }
                    }}
                    placeholder="Add location…"
                    className="px-3 py-1.5 rounded-full border border-dashed border-slate-400 text-slate-700 text-sm bg-transparent focus:outline-none focus:border-slate-600 w-[160px] placeholder:text-slate-400"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Press Enter to add. Leave blank for any location.
                </p>
              </div>

              {/* Availability */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2.5">
                  Available to Start
                </p>
                <div className="flex flex-wrap gap-2">
                  {START_OPTIONS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPrefs((p) => ({ ...p, startAvail: id }))}
                      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                        prefs.startAvail === id
                          ? 'border-slate-900 bg-slate-900/5 text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {prefsError && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-[13px]">{prefsError}</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="text-sm text-slate-600 leading-relaxed prose prose-slate prose-sm max-w-none">
              <p className="text-slate-500 text-xs mb-4">
                Effective May 2026 &middot; Please read each section and confirm
                separately below.
              </p>
              <p className="mb-4">
                Before your Managed Apply service is activated, please read this
                Agreement in its entirety and confirm your authorization. Your
                Managed Apply service activates only after you have checked all
                four boxes below.
              </p>

              {CONSENT_SECTIONS.map((section) => (
                <div key={section.key}>
                  <h3 className="text-base font-semibold text-slate-900 mt-5 mb-2">
                    {section.number}) {section.title}
                  </h3>
                  {section.body}
                  <label
                    htmlFor={`consent-${section.key}`}
                    className="mt-2 mb-2 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <Checkbox
                      id={`consent-${section.key}`}
                      checked={checked[section.key]}
                      onCheckedChange={(v) =>
                        setChecked((prev) => ({ ...prev, [section.key]: v === true }))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-[13px] leading-snug text-slate-700">
                      {section.checkboxLabel}
                    </span>
                  </label>
                </div>
              ))}

              <p className="italic text-slate-500 text-xs border-t border-slate-200 pt-3 mt-6">
                By checking the four boxes above and clicking "Confirm &amp;
                Activate Managed Apply," you acknowledge that you have read,
                understood, and agree to be bound by the Screna AI Premium
                Membership Agreement (Sections 1&ndash;9) in its entirety; that
                you are at least eighteen (18) years of age; and that you accept
                full legal responsibility for the accuracy of all information
                submitted to prospective employers on your behalf.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-200">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={isCompleting || savingPrefs}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCompleting || savingPrefs || resumeState === 'uploading'}
            >
              Cancel
            </Button>

            {step === 1 && (
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canAdvanceFromStep1 || resumeState === 'uploading'}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                Continue
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                onClick={handleSavePrefsAndContinue}
                disabled={savingPrefs}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {savingPrefs && <Loader2 className="size-4 animate-spin" />}
                Save &amp; Continue
              </Button>
            )}

            {step === 3 && (
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!allChecked || isCompleting}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {isCompleting && <Loader2 className="size-4 animate-spin" />}
                Confirm &amp; Activate Managed Apply
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PremiumOnboardingWizard;
