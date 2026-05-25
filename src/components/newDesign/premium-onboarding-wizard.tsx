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
  recordCandidateConsent,
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
  // Optional starting step. Defaults to 1. Used by the Jobs-tab gate so a
  // user with resume + preferences already saved lands on the consent step.
  initialStep?: 1 | 2 | 3;
}

type Step = 1 | 2 | 3;
type ResumeState = 'checking' | 'idle' | 'uploading' | 'success';
type ConsentDocType =
  | 'APPLY_AUTHORIZATION'
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'CREDENTIAL_STORAGE_CONSENT';

interface JobPrefsDraft {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentTypes: string[];
  workModes: string[];
  salaryMin: string;
  salaryMax: string;
  locationTags: string[];
  startAvail: string;
}

const CONSENT_DOC_VERSION = '2026-05';

interface ConsentItem {
  key: ConsentDocType;
  required: boolean;
  label: string;
}

const CONSENT_ITEMS: ConsentItem[] = [
  {
    key: 'APPLY_AUTHORIZATION',
    required: true,
    label:
      'I authorize Screna AI to submit job applications on my behalf and operate third-party application accounts using the credentials I provide, as described in the Premium Membership Agreement above.',
  },
  {
    key: 'TERMS_OF_SERVICE',
    required: true,
    label:
      'I have read and agree to the Screna AI Terms of Service, including the auto-renewing subscription, refund policy, and limitations of the Managed Apply service.',
  },
  {
    key: 'PRIVACY_POLICY',
    required: true,
    label:
      'I consent to Screna sharing the information in my Application Profile with prospective employers and third-party application platforms as described in the Privacy Policy.',
  },
  {
    key: 'CREDENTIAL_STORAGE_CONSENT',
    required: true,
    label:
      'I consent to Screna securely storing the third-party application credentials I provide, solely for the purpose of submitting job applications on my behalf.',
  },
];

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

interface AgreementSection {
  number: string;
  title: string;
  body: React.ReactNode;
}

const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    number: '1',
    title: 'Authorization Granted',
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
          active Premium Membership subscription, unless earlier revoked by you
          in accordance with Section 6 of this Agreement.
        </p>
      </>
    ),
  },
  {
    number: '2',
    title: 'Member Representations and Responsibilities',
    body: (
      <>
        <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-2">
          2.1 Accuracy of Information
        </h4>
        <p className="mb-2">
          You represent and warrant that all information contained in your
          Application Profile is accurate, complete, and truthful. You
          acknowledge that you bear sole legal responsibility for the accuracy
          of all information submitted to prospective employers on your behalf,
          including without limitation:
        </p>
        <ul className="list-disc pl-5 mb-2 space-y-1">
          <li>Personal and contact information;</li>
          <li>Work authorization status and visa sponsorship requirements;</li>
          <li>
            Employment history, including any prior employment with or
            termination by any employer to which an application is submitted;
          </li>
          <li>
            The existence and scope of any non-compete, non-solicitation,
            non-disclosure, or other restrictive covenant agreements to which
            you are subject;
          </li>
          <li>
            The existence of any familial or personal relationships with
            employees of any company to which an application is submitted; and
          </li>
          <li>
            Any current or former government employment or affiliations that
            may give rise to a conflict of interest.
          </li>
        </ul>
        <p className="mb-3">
          Screna transmits your information to prospective employers as provided
          by you, without independent verification.{' '}
          <strong>
            You are solely and legally responsible for the truthfulness of all
            submitted information.
          </strong>
        </p>

        <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-2">
          2.2 Monitoring of Applications
        </h4>
        <p className="mb-3">
          You acknowledge that you have the ability to review all applications
          submitted on your behalf through the Jobs &rarr; Applied panel within
          your account dashboard. You are responsible for monitoring submitted
          applications and for notifying Screna promptly via Discord if any
          submission contains an error or inaccuracy.
        </p>

        <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-2">
          2.3 Application Credentials
        </h4>
        <p className="mb-3">
          You are responsible for the Application Password you provide to
          Screna. Screna will use such credentials solely for the purpose of
          submitting job applications on your behalf. You agree to designate a
          password that is not used for any other personal or financial
          accounts.
        </p>
      </>
    ),
  },
  {
    number: '3',
    title: 'Scope and Limitations of the Managed Apply Service',
    body: (
      <>
        <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-2">
          3.1 Service Description
        </h4>
        <p className="mb-2">
          The Managed Apply service is a{' '}
          <strong>job application submission service only</strong>. Screna will
          match open roles to your Job Search Filter and submit applications
          accordingly. Screna does not, and shall not be understood to:
        </p>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <li>Negotiate compensation or employment terms on your behalf;</li>
          <li>
            Represent you in any interview, assessment, or hiring process;
          </li>
          <li>
            Guarantee any response, interview invitation, or employment offer
            from any prospective employer; or
          </li>
          <li>
            Modify your resume or application materials without your express
            instruction.
          </li>
        </ul>

        <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-2">
          3.2 No Guarantee of Outcomes
        </h4>
        <p className="mb-3">
          Screna makes no representations or warranties, express or implied,
          regarding the likelihood or occurrence of any particular job search
          outcome. Results are subject to factors beyond Screna's control,
          including your individual qualifications, employer requirements, and
          prevailing labor market conditions.
        </p>

        <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-2">
          3.3 Monthly Application Volume
        </h4>
        <p className="mb-3">
          Your Premium Membership includes up to{' '}
          <strong>200 managed applications per calendar month</strong>. Unused
          application capacity does not roll over to subsequent months.
          Applications are submitted at Screna's operational discretion in
          accordance with your Job Search Filter.
        </p>
      </>
    ),
  },
  {
    number: '4',
    title: 'Subscription Terms, Billing, and Refunds',
    body: (
      <>
        <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-2">
          4.1 Automatic Renewal
        </h4>
        <p className="mb-3">
          Your Premium Membership is a{' '}
          <strong>recurring subscription</strong> that renews automatically at
          the conclusion of each billing period (monthly, quarterly, or annual,
          as elected at the time of purchase). By subscribing, you authorize
          Screna to charge the payment method on file at the then-applicable
          renewal rate, unless you cancel prior to the renewal date in
          accordance with Section 4.2.
        </p>

        <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-2">
          4.2 Cancellation
        </h4>
        <p className="mb-3">
          You may cancel the automatic renewal of your subscription at any time
          by navigating to{' '}
          <strong>Settings &rarr; Billing &rarr; Membership &rarr; Request
          cancellation</strong>. Cancellation will stop future charges. Your
          Premium membership benefits will remain accessible through the end of
          the then-current paid billing period. Cancellation of auto-renewal
          does not constitute a request for a refund.
        </p>

        <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-2">
          4.3 Refund Policy
        </h4>
        <p className="mb-2">
          Screna offers a{' '}
          <strong>full refund within three (3) calendar days</strong> of any
          subscription payment, including renewal payments. Refund requests
          must be submitted through the designated entry point on the Billing
          page. Requests submitted within the three-day window will be honored
          in full, regardless of the extent to which the service has been used
          during that period. Refund requests submitted after the expiration of
          the three-day window will not be accepted.
        </p>
        <p className="mb-3">
          Approved refunds will be processed within{' '}
          <strong>five (5) to ten (10) business days</strong>, depending on
          your payment method and financial institution. Pay-as-you-go credits
          purchased separately are non-refundable.
        </p>
      </>
    ),
  },
  {
    number: '5',
    title: 'Data Sharing and Privacy',
    body: (
      <>
        <p className="mb-3">
          In order to perform the Managed Apply service, Screna will share
          information contained in your Application Profile &mdash; including
          your personal information, employment history, and compliance
          disclosures &mdash; with prospective employers and third-party
          application platforms as necessary to complete the application
          submission process. By confirming this Agreement, you expressly
          consent to such disclosure.
        </p>
        <p className="mb-3">
          For a complete description of how Screna collects, stores, uses, and
          protects your personal information, please refer to our Privacy
          Policy.
        </p>
      </>
    ),
  },
  {
    number: '6',
    title: 'Revocation of Authorization',
    body: (
      <>
        <p className="mb-2">
          You may revoke the authorization granted under this Agreement at any
          time by:
        </p>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <li>Notifying your dedicated client manager via Discord; or</li>
          <li>
            Pausing or disabling the Managed Apply feature within your account
            settings.
          </li>
        </ul>
        <p className="mb-3">
          Revocation shall apply to applications not yet submitted at the time
          of such notice. Applications already submitted on your behalf prior
          to revocation cannot be withdrawn by Screna. If you wish to withdraw
          a previously submitted application, you must contact the relevant
          employer directly.
        </p>
      </>
    ),
  },
  {
    number: '7',
    title: 'Limitation of Liability',
    body: (
      <p className="mb-3">
        To the fullest extent permitted by applicable law, Screna's aggregate
        liability to you arising out of or in connection with the Managed Apply
        service shall not exceed the total fees paid by you for your current
        billing period. In no event shall Screna be liable for any indirect,
        incidental, special, consequential, or punitive damages, including but
        not limited to lost employment opportunities, loss of income, or
        adverse employer decisions, arising from or related to applications
        submitted under this Agreement.
      </p>
    ),
  },
  {
    number: '8',
    title: 'Governing Law and Dispute Resolution',
    body: (
      <p className="mb-3">
        This Agreement shall be governed by and construed in accordance with
        the laws of the State of Delaware, without regard to its conflict of
        laws principles. Any dispute arising out of or relating to this
        Agreement shall be resolved by binding arbitration administered by the
        American Arbitration Association in accordance with its Consumer
        Arbitration Rules, except that either party may seek emergency
        injunctive or other equitable relief in a court of competent
        jurisdiction where necessary to prevent irreparable harm.
      </p>
    ),
  },
  {
    number: '9',
    title: 'Modifications to This Agreement',
    body: (
      <p className="mb-3">
        Screna reserves the right to modify this Agreement at any time. In the
        event of any material modification, Screna will provide you with prior
        notice and will require your re-confirmation before the Managed Apply
        service continues. Your continued use of the Managed Apply service
        following re-confirmation constitutes your acceptance of the modified
        Agreement.
      </p>
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
  initialStep = 1,
}: PremiumOnboardingWizardProps) {
  const [step, setStep] = useState<Step>(initialStep);

  // Step 1 — resume
  const [resumeState, setResumeState] = useState<ResumeState>('checking');
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — job prefs + personal info
  const [prefs, setPrefs] = useState<JobPrefsDraft>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
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
  const [consents, setConsents] = useState<Record<ConsentDocType, boolean>>({
    APPLY_AUTHORIZATION: false,
    TERMS_OF_SERVICE: false,
    PRIVACY_POLICY: false,
    CREDENTIAL_STORAGE_CONSENT: false,
  });
  const [consentError, setConsentError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Reset + load on open ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';

    setStep(initialStep);
    setResumeError(null);
    setPrefsError(null);
    setConsentError(null);
    setLocationInput('');
    setConsents({
      APPLY_AUTHORIZATION: false,
      TERMS_OF_SERVICE: false,
      PRIVACY_POLICY: false,
      CREDENTIAL_STORAGE_CONSENT: false,
    });

    // Check whether the user already has a resume on file, and capture
    // structured_resume.profile so we can fall back to it for personal fields
    // that aren't yet stored in apply-prefs.
    setResumeState('checking');
    type ResumeProfile = { full_name?: string; email?: string; phone?: string };
    const resumeProfilePromise: Promise<ResumeProfile> = getProfile()
      .then((res: { data?: { data?: { structured_resume?: unknown; resume_path?: string } } & { structured_resume?: unknown; resume_path?: string } }) => {
        const payload = res?.data?.data ?? res?.data ?? {};
        const sr = (payload as { structured_resume?: { experience?: unknown[]; profile?: ResumeProfile } }).structured_resume;
        const hasResume =
          !!(payload as { resume_path?: string }).resume_path ||
          !!(sr && (sr.profile || (Array.isArray(sr.experience) && sr.experience.length > 0)));
        setResumeState(hasResume ? 'success' : 'idle');
        return sr?.profile ?? {};
      })
      .catch(() => {
        setResumeState('idle');
        return {};
      });

    // Pre-fill job preferences from existing apply-prefs if any, then fall
    // back to the parsed resume profile for first_name/last_name/email/phone.
    Promise.all([
      getJobsPreferences().catch(() => null),
      resumeProfilePromise,
    ]).then(([prefsRes, resumeProfile]) => {
      const ap =
        ((prefsRes as { data?: { data?: { candidate_apply_preferences?: Record<string, unknown> } } } | null)
          ?.data?.data?.candidate_apply_preferences ?? {}) as Record<string, unknown>;
      setExistingApplyPrefs(ap);

      // Split parsed full_name into first/last as a fallback.
      const fullName = (resumeProfile.full_name ?? '').trim();
      const nameParts = fullName ? fullName.split(/\s+/) : [];
      const fallbackFirst = nameParts[0] ?? '';
      const fallbackLast = nameParts.slice(1).join(' ');

      setPrefs({
        firstName: (ap.first_name as string | undefined) ?? fallbackFirst,
        middleName: (ap.middle_name as string | undefined) ?? '',
        lastName: (ap.last_name as string | undefined) ?? fallbackLast,
        email: (ap.email as string | undefined) ?? resumeProfile.email ?? '',
        phone: (ap.phone as string | undefined) ?? resumeProfile.phone ?? '',
        employmentTypes: (ap.employment_types as string[] | undefined) ?? [],
        workModes: (ap.work_modes as string[] | undefined) ?? [],
        salaryMin:
          ap.salary_min != null ? String(Math.round((ap.salary_min as number) / 1000)) : '',
        salaryMax:
          ap.salary_max != null ? String(Math.round((ap.salary_max as number) / 1000)) : '',
        locationTags: (ap.target_locations as string[] | undefined) ?? [],
        startAvail: (ap.earliest_start_date as string | undefined) ?? 'Immediately',
      });
    });

    return () => {
      document.body.style.overflow = '';
    };
  }, [open, initialStep]);

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
    const missingPersonal: string[] = [];
    if (!prefs.firstName.trim()) missingPersonal.push('First name');
    if (!prefs.lastName.trim()) missingPersonal.push('Last name');
    if (!prefs.email.trim()) missingPersonal.push('Email');
    if (!prefs.phone.trim()) missingPersonal.push('Phone');
    if (missingPersonal.length > 0) {
      setPrefsError(`Please fill in: ${missingPersonal.join(', ')}.`);
      return;
    }
    if (prefs.employmentTypes.length === 0 || prefs.workModes.length === 0) {
      setPrefsError('Please select at least one employment type and one work mode.');
      return;
    }
    setPrefsError(null);
    setSavingPrefs(true);
    try {
      const patch: Record<string, unknown> = {
        first_name: prefs.firstName.trim(),
        middle_name: prefs.middleName.trim(),
        last_name: prefs.lastName.trim(),
        email: prefs.email.trim(),
        phone: prefs.phone.trim(),
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

  const requiredConsentsAccepted = CONSENT_ITEMS.every(
    (c) => !c.required || consents[c.key],
  );

  const handleConfirm = async () => {
    if (!requiredConsentsAccepted) return;
    setConsentError(null);
    // Backend rejects `agreed: false`, so only send consents the user actually
    // checked. Optional unchecked items are simply omitted from the payload.
    const agreedItems = CONSENT_ITEMS.filter((c) => consents[c.key]);
    try {
      await recordCandidateConsent(
        agreedItems.map((c) => ({
          document_type: c.key,
          document_version: CONSENT_DOC_VERSION,
          agreed: true,
        })),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not record your consent. Please try again.';
      setConsentError(msg);
      return;
    }
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
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/40">
          {([1, 2, 3] as Step[]).map((s, i) => {
            const done = s < step;
            const active = s === step;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                    done || active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : s}
                </div>
                <span
                  className={`text-xs ${
                    active
                      ? 'text-primary font-medium'
                      : done
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  }`}
                >
                  {s === 1 ? 'Resume' : s === 2 ? 'Preferences' : 'Agreement'}
                </span>
                {i < 2 && (
                  <div
                    className={`flex-1 h-px ${done ? 'bg-primary/40' : 'bg-border'}`}
                  />
                )}
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
                        ? 'border-border bg-white pointer-events-none'
                        : 'border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 cursor-pointer'
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
                          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                          <p className="text-sm font-medium text-foreground">
                            Uploading your resume…
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center mb-4">
                            <UploadCloud className="w-6 h-6 text-primary" strokeWidth={2} />
                          </div>
                          <p className="text-sm font-medium text-foreground text-center mb-1">
                            Drag and drop your resume here, or{' '}
                            <span className="text-primary group-hover:underline">browse</span>
                          </p>
                          <p className="text-xs text-muted-foreground text-center">
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

              {/* Personal info */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2.5">
                  Personal Information
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  We pre-fill these from your resume when possible. Please review
                  and complete any missing fields &mdash; this information is
                  submitted with every managed application.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      First name <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={prefs.firstName}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, firstName: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Middle name <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      value={prefs.middleName}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, middleName: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Last name <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={prefs.lastName}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, lastName: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={prefs.email}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, email: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={prefs.phone}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, phone: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                </div>
              </div>

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
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground bg-card hover:border-primary/40'
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
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground bg-card hover:border-primary/40'
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
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40'
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
                Effective May 2026 &middot; Please read the agreement and confirm
                your consents below.
              </p>
              <p className="mb-4">
                Before your Managed Apply service is activated, please read this
                Agreement in its entirety. Your Managed Apply service activates
                only after you confirm the required consents at the bottom of
                this page.
              </p>

              {AGREEMENT_SECTIONS.map((section) => (
                <div key={section.number}>
                  <h3 className="text-base font-semibold text-slate-900 mt-5 mb-2">
                    {section.number}) {section.title}
                  </h3>
                  {section.body}
                </div>
              ))}

              <div className="mt-6 border-t border-slate-200 pt-5">
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  Your Consents
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  All consents below are required to activate Managed Apply.
                </p>
                <div className="flex flex-col gap-2">
                  {CONSENT_ITEMS.map((item) => (
                    <label
                      key={item.key}
                      htmlFor={`consent-${item.key}`}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <Checkbox
                        id={`consent-${item.key}`}
                        checked={consents[item.key]}
                        onCheckedChange={(v) =>
                          setConsents((prev) => ({ ...prev, [item.key]: v === true }))
                        }
                        className="mt-0.5"
                      />
                      <span className="text-[13px] leading-snug text-slate-700">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
                {consentError && (
                  <div className="flex items-center gap-2 text-red-500 mt-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-[13px]">{consentError}</p>
                  </div>
                )}
              </div>

              <p className="italic text-slate-500 text-xs border-t border-slate-200 pt-3 mt-6">
                By checking the boxes above and clicking "Confirm &amp; Activate
                Managed Apply," you acknowledge that you have read, understood,
                and agree to be bound by this Agreement in its entirety; that
                you are at least eighteen (18) years of age; and that you
                accept full legal responsibility for the accuracy of all
                information submitted to prospective employers on your behalf.
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
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continue
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                onClick={handleSavePrefsAndContinue}
                disabled={savingPrefs}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {savingPrefs && <Loader2 className="size-4 animate-spin" />}
                Save &amp; Continue
              </Button>
            )}

            {step === 3 && (
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!requiredConsentsAccepted || isCompleting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
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
