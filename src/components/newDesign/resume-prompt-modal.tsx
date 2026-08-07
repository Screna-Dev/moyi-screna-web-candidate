import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, UploadCloud, FileText, RefreshCw, AlertCircle, X, ArrowRight } from 'lucide-react';
import { usePostHog } from 'posthog-js/react';
import { useAuth, isStaffRole } from '@/contexts/AuthContext';
import { getProfile, uploadResumeAndWait } from '@/services/ProfileServices';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';
import { emitResumeUploaded, useResumeUploaded } from '@/hooks/useResumeUploaded';

/**
 * Global "you never uploaded a resume" prompt.
 *
 * Onboarding step 3 (/onboarding-resume) can be skipped, and nothing downstream
 * asked again — the user landed in an app where personalization, mock generation
 * and mentor applications all quietly need a resume. This is mounted once in
 * RootLayout so the ask follows the user across every app page, not just the
 * dashboard.
 *
 * Upload happens in place with the same contract as the Profile tab: POST
 * /profile/upload-resume answers 202 + job id, `uploadResumeAndWait` polls until
 * the parse job succeeds, and the backend has persisted the resume by then — no
 * follow-up save call.
 */

// Dismissing is a snooze, not a permanent opt-out: a user who skips the resume
// still needs it for most of the product, so we come back the next day.
const DISMISSED_AT_KEY = 'screna_resume_prompt_dismissed_at';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Same validation as the Profile tab's resume card.
const ACCEPTED_EXTS = ['.pdf', '.doc', '.docx'];
const MAX_BYTES = 5 * 1024 * 1024;

// Let the page settle before interrupting — the modal appearing mid-paint reads
// as a glitch.
const SHOW_DELAY_MS = 900;

// Routes where the prompt must not fire: flows that already ask for a resume,
// anything mid-interview or mid-payment, auth/onboarding, staff consoles, and
// the public marketing/legal pages (a signed-in user reading /terms is not who
// this is for).
const EXCLUDED_EXACT = new Set([
  '/',
  '/auth',
  '/register',
  '/forgot-password',
  '/signup-flow',
  '/onboarding-process',
  '/onboarding-flow',
  '/onboarding-resume',
  '/goal',
  '/goal-upload',
  '/ai-mock',
  '/ai-mockwhite',
  '/evaluation',
  '/payment-success',
  '/premium-onboarding',
  // Pages that already put a resume uploader in front of the user — the modal
  // on top of one is the same ask twice.
  '/personalized-practice', // full-page gate in personalized-practice-design.tsx
  '/profile',               // the profile tab's resume card
  '/mentor-dashboard',
  '/select-dashboard',
  '/guest-dashboard',
  '/pricing',
  '/faq',
  '/contact',
  '/help',
  '/privacy',
  '/cookies',
  '/terms',
  '/data-protection',
]);

const EXCLUDED_PREFIXES = [
  '/auth/',
  '/blog',
  '/question',
  '/pgs/',
  '/admin',
  '/redeem-code',
  '/audit-logs',
];

function isExcludedPath(pathname: string) {
  if (EXCLUDED_EXACT.has(pathname)) return true;
  return EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
}

function isSnoozed() {
  try {
    const raw = localStorage.getItem(DISMISSED_AT_KEY);
    if (!raw) return false;
    const at = Date.parse(raw);
    if (Number.isNaN(at)) return false;
    return Date.now() - at < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

const BENEFITS = [
  'Role-specific interview questions',
  'A practice path around your experience',
  'More relevant recommendations',
];

export function ResumePromptModal() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const posthog = usePostHog();

  // null = not checked yet / check failed (never nag on a failed check).
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Uploading…');
  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shownRef = useRef(false);
  // A ref, not state: as an effect dependency it would re-run the effect that
  // sets it, and under StrictMode the resulting cleanup cancels the very
  // request that run just started.
  const checkedRef = useRef(false);
  // True only while this modal's own upload is emitting — see the listener below.
  const selfUploadRef = useRef(false);

  const isStaff = isStaffRole(user?.roles, user?.role);

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => stopProgressTimer, []);

  // ── Check once per signed-in session ──────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Signed out — forget everything so the next account is checked fresh.
      checkedRef.current = false;
      setHasResume(null);
      setOpen(false);
      shownRef.current = false;
      return;
    }

    // Staff accounts have no candidate profile; /profile/resume 404s for them.
    if (isStaff || checkedRef.current) return;

    checkedRef.current = true;
    // Deliberately not cancelled on cleanup: this component lives for the whole
    // signed-in session, and aborting on StrictMode's remount would discard the
    // only check we make.
    getProfile()
      .then((res: { data?: { data?: { resume_path?: string } } & { resume_path?: string } }) => {
        const data = res.data?.data ?? res.data;
        setHasResume(!!data?.resume_path);
      })
      .catch(() => {
        // Can't tell — stay quiet rather than prompting a user who has one.
        setHasResume(null);
      });
  }, [isAuthenticated, isLoading, isStaff]);

  // A resume uploaded anywhere else (profile tab, onboarding, goal upload,
  // mentor application…) retires the prompt for good — the per-session check
  // above already ran, so without this the stale `false` would pop the modal on
  // the next route change.
  useResumeUploaded(() => {
    setHasResume(true);
    // Our own upload emits this too, synchronously — before React has committed
    // `uploadState: 'success'`, so reading that state here would still say
    // 'uploading' and close the modal over its own confirmation. The ref is set
    // for exactly the duration of that dispatch.
    if (selfUploadRef.current) return;
    setOpen(false);
  });

  // ── Decide whether to show on this route ──────────────────────────────────
  useEffect(() => {
    // Once the modal is mid-upload or showing the result of one, it owns its own
    // visibility until the user acts — `hasResume` flipping true on success must
    // not close it over its own confirmation.
    if (uploadState === 'uploading' || uploadState === 'success') return;

    if (hasResume !== false || isExcludedPath(location.pathname) || isSnoozed()) {
      setOpen(false);
      return;
    }
    if (open) return;

    const t = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
    // `open` is read, not tracked — re-running on it would restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResume, location.pathname, uploadState]);

  // …but a navigation does retire a confirmation the user left sitting there.
  const lastPathRef = useRef(location.pathname);
  useEffect(() => {
    if (lastPathRef.current === location.pathname) return;
    lastPathRef.current = location.pathname;
    if (uploadState === 'success') setOpen(false);
  }, [location.pathname, uploadState]);

  useEffect(() => {
    if (!open || shownRef.current) return;
    shownRef.current = true;
    safeCapture(posthog, EVENTS.RESUME_UPLOAD_MODAL_SHOWN, { path: location.pathname });
  }, [open, posthog, location.pathname]);

  const dismiss = useCallback((reason: 'close' | 'later' | 'profile') => {
    if (uploadState === 'uploading') return;
    try {
      localStorage.setItem(DISMISSED_AT_KEY, new Date().toISOString());
    } catch {
      // localStorage unavailable — the modal simply reappears on the next route.
    }
    safeCapture(posthog, EVENTS.RESUME_UPLOAD_MODAL_DISMISSED, {
      reason,
      path: location.pathname,
    });
    setOpen(false);
  }, [uploadState, posthog, location.pathname]);

  // Esc closes, same as the dismiss link.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss('close'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  const handleFile = async (picked: File) => {
    if (uploadState === 'uploading') return;

    const ext = picked.name.toLowerCase().slice(picked.name.lastIndexOf('.'));
    if (!ACCEPTED_EXTS.includes(ext) || picked.size > MAX_BYTES) {
      stopProgressTimer();
      setFile(null);
      setError('Please use a PDF or DOCX under 5 MB.');
      setUploadState('error');
      return;
    }

    setFile(picked);
    setError('');
    setProgress(0);
    setProgressLabel('Uploading…');
    setUploadState('uploading');

    // Creep the bar: quick to ~55%, then slow so it keeps moving through the
    // much longer parse wait without hitting 100% before the server confirms.
    let p = 0;
    stopProgressTimer();
    progressTimerRef.current = setInterval(() => {
      p += p < 55 ? 4 : p < 80 ? 0.7 : 0.15;
      setProgress(Math.min(Math.round(p), 92));
    }, 220);

    const startedAt = Date.now();
    try {
      await uploadResumeAndWait(picked, {
        onPoll: () => setProgressLabel('Analyzing your resume…'),
      });
      stopProgressTimer();
      setProgress(100);
      setUploadState('success');
      safeCapture(posthog, EVENTS.RESUME_PARSE_COMPLETED, {
        duration_ms: Date.now() - startedAt,
        source: 'global_prompt',
      });
      // Resume now exists — stop the prompt from ever reopening this session,
      // and let already-mounted pages (profile, dashboard) refetch instead of
      // sitting on stale "no resume yet" state until the next navigation.
      setHasResume(true);
      selfUploadRef.current = true;
      emitResumeUploaded();
      selfUploadRef.current = false;
    } catch (err) {
      console.error('[resume-prompt] upload failed', err);
      stopProgressTimer();
      setUploadState('error');
      setError(
        err instanceof Error && err.message
          ? err.message
          : "We couldn't process your resume. Please try again.",
      );
    }
  };

  const resetFile = () => {
    stopProgressTimer();
    setFile(null);
    setProgress(0);
    setError('');
    setUploadState('idle');
  };

  const goToProfile = () => {
    dismiss('profile');
    navigate('/profile');
  };

  if (!open) return null;

  const isDragging = uploadState === 'dragging';
  const isUploading = uploadState === 'uploading';
  const isSuccess = uploadState === 'success';
  const isError = uploadState === 'error';

  return (
    <AnimatePresence>
      <motion.div
        key="resume-prompt"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 bg-[hsl(222,22%,12%)]/45 backdrop-blur-[2px] overflow-y-auto"
        onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss('close'); }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-prompt-title"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="relative w-full max-w-[460px] rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] border border-[hsl(220,16%,92%)] px-7 pt-7 pb-6 my-auto"
        >
          <button
            onClick={() => dismiss('close')}
            disabled={isUploading}
            aria-label="Close"
            className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-[hsl(222,12%,58%)] hover:bg-[hsl(220,18%,96%)] hover:text-[hsl(222,22%,25%)] transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>

          <h2
            id="resume-prompt-title"
            className="text-[21px] font-bold text-[hsl(222,22%,12%)] leading-[1.25] pr-8 mb-2"
            style={{ letterSpacing: '-0.02em' }}
          >
            {isSuccess ? 'Your resume is in' : 'Upload your resume to unlock personalization'}
          </h2>
          <p className="text-[13.5px] text-[hsl(222,12%,48%)] mb-5">
            {isSuccess
              ? 'Screna is now tailoring your questions and practice path.'
              : 'Screna uses your experience to tailor:'}
          </p>

          {!isSuccess && (
            <div className="rounded-xl bg-[hsl(220,20%,98.5%)] border border-[hsl(220,16%,93%)] px-4 py-3.5 mb-5 flex flex-col gap-2.5">
              {BENEFITS.map((b) => (
                <div key={b} className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-[hsl(142,70%,42%)] shrink-0" strokeWidth={3} />
                  <span className="text-[13px] text-[hsl(222,16%,32%)]">{b}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Upload zone ── */}
          <div
            onDragOver={(e) => { e.preventDefault(); if (uploadState === 'idle') setUploadState('dragging'); }}
            onDragLeave={(e) => { e.preventDefault(); if (uploadState === 'dragging') setUploadState('idle'); }}
            onDrop={(e) => {
              e.preventDefault();
              if (uploadState === 'uploading') return;
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`w-full rounded-xl border-[1.5px] transition-all duration-300 overflow-hidden ${
              isDragging
                ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5 shadow-[0_0_0_4px_hsl(221,91%,60%,0.1)]'
                : isUploading
                ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/[0.03]'
                : isSuccess
                ? 'border-[hsl(142,70%,45%)] bg-[hsl(142,70%,45%)]/[0.04]'
                : isError
                ? 'border-[hsl(0,60%,55%)] bg-[hsl(0,60%,55%)]/[0.04]'
                : 'border-dashed border-[hsl(220,16%,86%)] bg-white hover:border-[hsl(221,91%,60%)]/50'
            }`}
          >
            <AnimatePresence mode="wait">
              {(uploadState === 'idle' || isDragging) && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center px-6 py-8 text-center cursor-pointer"
                  onClick={() => inputRef.current?.click()}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                    isDragging ? 'bg-[hsl(221,91%,60%)]' : 'bg-[hsl(220,18%,96%)] border border-[hsl(220,16%,90%)]'
                  }`}>
                    <UploadCloud className={`w-[18px] h-[18px] ${isDragging ? 'text-white' : 'text-[hsl(222,12%,55%)]'}`} />
                  </div>
                  <p className="text-[13.5px] font-semibold text-[hsl(222,22%,18%)] mb-1">
                    Drag and drop your resume here
                  </p>
                  <p className="text-[11.5px] text-[hsl(222,12%,55%)]">PDF or DOCX · Max 5 MB</p>
                </motion.div>
              )}

              {isUploading && (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center px-6 py-7 text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-[hsl(221,91%,60%)]/10 border border-[hsl(221,91%,60%)]/20 flex items-center justify-center mb-3">
                    <FileText className="w-[18px] h-[18px] text-[hsl(221,91%,55%)]" />
                  </div>
                  <p className="text-[13px] font-semibold text-[hsl(222,22%,15%)] mb-0.5 max-w-[260px] truncate">
                    {file?.name}
                  </p>
                  <p className="text-[11.5px] text-[hsl(222,12%,58%)] mb-4">{progressLabel}</p>
                  <div className="w-full max-w-[280px]">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[11px] text-[hsl(222,12%,55%)]">Processing</span>
                      <span className="text-[11px] font-semibold text-[hsl(221,91%,55%)]">{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[hsl(220,16%,92%)] overflow-hidden">
                      <div
                        className="h-full bg-[hsl(221,91%,60%)] rounded-full transition-[width] duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[10.5px] text-[hsl(222,12%,62%)] mt-3.5 max-w-[280px]">
                    Parsing can take up to a minute. Keep this tab open.
                  </p>
                </motion.div>
              )}

              {isSuccess && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center px-6 py-7 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 16 }}
                    className="w-11 h-11 rounded-full bg-[hsl(142,70%,45%)] flex items-center justify-center shadow-[0_6px_20px_rgba(34,197,94,0.3)] mb-3"
                  >
                    <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </motion.div>
                  <p className="text-[13.5px] font-semibold text-[hsl(222,22%,15%)] mb-1">Resume uploaded</p>
                  {file && (
                    <p className="text-[11.5px] text-[hsl(222,12%,58%)] mb-1 max-w-[260px] truncate">
                      {file.name} · {formatFileSize(file.size)}
                    </p>
                  )}
                  <p className="text-[11.5px] text-[hsl(142,70%,38%)] font-medium">Saved to your profile</p>
                </motion.div>
              )}

              {isError && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center px-6 py-8 text-center"
                >
                  <div className="w-9 h-9 rounded-full bg-[hsl(0,60%,55%)]/10 flex items-center justify-center mb-2.5">
                    <AlertCircle className="w-[18px] h-[18px] text-[hsl(0,60%,50%)]" />
                  </div>
                  <p className="text-[13px] font-semibold text-[hsl(222,22%,18%)] mb-1">
                    {file ? "Couldn't process that resume" : "Can't use that file"}
                  </p>
                  <p className="text-[11.5px] text-[hsl(222,12%,55%)] mb-3.5 max-w-[280px]">{error}</p>
                  <button
                    onClick={resetFile}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[hsl(220,16%,90%)] text-[12px] font-medium text-[hsl(222,22%,20%)] hover:border-[hsl(221,91%,60%)]/50 transition-all"
                  >
                    <RefreshCw className="w-3 h-3" /> Try again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = ''; // allow re-picking the same file after a failure
              if (f) handleFile(f);
            }}
          />

          {/* ── Primary action ── */}
          <button
            onClick={() => {
              if (isSuccess) { setOpen(false); return; }
              if (!isUploading) inputRef.current?.click();
            }}
            disabled={isUploading}
            className={`w-full mt-5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 py-3.5 transition-all duration-200 ${
              isUploading
                ? 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,60%)] cursor-not-allowed'
                : isSuccess
                ? 'bg-[hsl(142,70%,42%)] text-white shadow-[0_4px_16px_rgba(34,197,94,0.26)] hover:bg-[hsl(142,70%,38%)] hover:-translate-y-[1px]'
                : 'bg-[hsl(221,91%,60%)] text-white shadow-[0_4px_16px_rgba(67,118,248,0.26)] hover:bg-[hsl(221,91%,55%)] hover:shadow-[0_6px_22px_rgba(67,118,248,0.36)] hover:-translate-y-[1px]'
            }`}
          >
            {isUploading
              ? 'Uploading your resume…'
              : isSuccess
              ? <>Continue <ArrowRight className="w-4 h-4" /></>
              : isError
              ? 'Choose another file'
              : 'Upload resume'}
          </button>

          {!isSuccess && (
            <button
              onClick={() => dismiss('later')}
              disabled={isUploading}
              className="w-full mt-3 text-[13px] font-medium text-[hsl(222,12%,52%)] hover:text-[hsl(222,22%,25%)] transition-colors disabled:opacity-40"
            >
              Continue with limited experience
            </button>
          )}

          {!isSuccess && (
            <p className="text-[11px] text-[hsl(222,12%,60%)] text-center mt-4 leading-relaxed">
              Your resume is private. We only use it to personalize your Screna experience — you can
              also{' '}
              <button
                onClick={goToProfile}
                disabled={isUploading}
                className="underline underline-offset-2 hover:text-[hsl(221,91%,55%)] disabled:opacity-40"
              >
                upload it in your profile
              </button>{' '}
              anytime.
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ResumePromptModal;
