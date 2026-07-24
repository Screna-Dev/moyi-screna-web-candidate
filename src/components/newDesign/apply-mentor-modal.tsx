import { useState, useEffect, useRef } from 'react';
import { Loader2, X, Check, ArrowRight, FileText, Upload, Clock } from 'lucide-react';
import { usePostHog } from 'posthog-js/react';
import { applyMentor, getMyMentorProfile } from '../../services/MentorService';
import { getProfile, uploadResume } from '../../services/ProfileServices';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';
import type { ProfileData } from '../../types/profile';

// The mentor application now collects only identity essentials —
// realName, workEmail, linkedinUrl — plus a resume. The resume uses a
// two-step flow: it must be stored via POST /profile/upload-resume before
// POST /mentorship/apply is called (applying without a stored resume → 400).
// Everything else (bio, headline, tags, office hours, topic pricing, calendar)
// is configured later in the mentor dashboard after admin approval.

const emptyForm = {
  realName: '',
  workEmail: '',
  linkedinUrl: '',
};

export function ApplyMentorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const posthog = usePostHog();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // An application already on file blocks re-submitting (the backend 400s with
  // "a mentor profile already exists for this user"). We detect it up front so
  // the user sees their status instead of a form that can only fail.
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  // Resume: a stored resume is required before applying. We detect an existing
  // one from the profile and otherwise upload the selected file on submit.
  const [hasStoredResume, setHasStoredResume] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setForm(emptyForm);
    setSubmitting(false);
    setSubmitted(false);
    setError('');
    setPrefilled(false);
    setAlreadyApplied(false);
    setApplicationStatus(null);
    setHasStoredResume(false);
    setResumeFile(null);
    setResumeUploading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // On open: detect an existing mentor application (to block re-submitting) and
  // prefill identity fields from the profile. We wait for both before revealing
  // the body so the form never flashes before we know the user already applied.
  useEffect(() => {
    if (!open) return;
    // mentor_apply_started —— 申请弹窗打开时上报一次
    safeCapture(posthog, EVENTS.MENTOR_APPLY_STARTED);
    setProfileLoading(true);

    const detectApplication = getMyMentorProfile()
      .then((res: { data?: { data?: { status?: string }; status?: string } }) => {
        const p = res.data?.data ?? res.data;
        if (p?.status) {
          setAlreadyApplied(true);
          setApplicationStatus(p.status);
        }
      })
      // No application on file (typically 404) — leave the form available.
      .catch(() => {});

    const prefill = getProfile()
      .then((res: {
        data: {
          data?: { structured_resume?: ProfileData; resume_path?: string };
          structured_resume?: ProfileData;
          resume_path?: string;
        };
      }) => {
        const body = res.data?.data ?? res.data ?? {};
        const sr: ProfileData | undefined = body.structured_resume;
        const resumePath = body.resume_path;
        if (resumePath) setHasStoredResume(true);
        if (sr?.profile) {
          setForm(f => ({
            realName: f.realName || sr.profile.full_name || '',
            workEmail: f.workEmail || sr.profile.email || '',
            linkedinUrl: f.linkedinUrl || sr.links?.linkedin || '',
          }));
          setPrefilled(true);
        }
      })
      .catch(() => {});

    Promise.allSettled([detectApplication, prefill]).then(() => setProfileLoading(false));
  }, [open]);

  // Copy for the "already applied" state, keyed on the server-side status.
  const appliedCopy =
    applicationStatus === 'APPROVED'
      ? { title: "You're already a mentor", body: 'Your application was approved. Open the mentor dashboard to manage your profile, availability, and services.' }
      : applicationStatus === 'REJECTED'
      ? { title: 'Application not approved', body: "Your previous application wasn't approved. If you'd like it reconsidered, please reach out to our team." }
      : { title: 'Application already submitted', body: "You've already applied to become a mentor. Your application is under review — we'll let you know once it's approved. No need to apply again." };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.realName.trim()) { setError('Enter your full name.'); return; }
    if (!form.workEmail.trim()) { setError('Enter your work email.'); return; }
    if (!form.linkedinUrl.trim()) { setError('Enter your LinkedIn profile URL.'); return; }
    if (!hasStoredResume && !resumeFile) { setError('Upload your resume to continue.'); return; }

    setSubmitting(true);
    try {
      // Two-step flow: make sure a resume is stored before applying.
      if (resumeFile) {
        setResumeUploading(true);
        await uploadResume(resumeFile);
        setHasStoredResume(true);
        setResumeUploading(false);
      }
      await applyMentor({
        realName: form.realName.trim(),
        workEmail: form.workEmail.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
      });
      // mentor_apply_submitted —— 申请提交成功（仅 API 成功后上报）
      safeCapture(posthog, EVENTS.MENTOR_APPLY_SUBMITTED);
      setSubmitted(true);
    } catch (err: unknown) {
      setResumeUploading(false);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.toLowerCase().includes('already')) {
        // Application already exists (e.g. a concurrent submit, or the precall
        // was skipped) — surface the real status instead of a misleading
        // "submitted" success so the user knows to just wait for approval.
        setAlreadyApplied(true);
      } else {
        setError(msg ?? 'Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-[480px] bg-card rounded-2xl border border-border shadow-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-foreground text-[16px]" style={{ fontWeight: 600 }}>
              {submitted ? 'Application Submitted' : alreadyApplied ? 'Mentor Application' : 'Become a Mentor'}
            </h2>
            {!submitted && !alreadyApplied && (
              <p className="text-muted-foreground text-[12px] mt-0.5">
                Tell us who you are — we'll set up the rest after approval.
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile pre-fill banner (only when the form is shown) */}
        {!submitted && !alreadyApplied && !profileLoading && prefilled && (
          <div className="px-6 pt-3 shrink-0">
            <div className="flex items-center gap-1.5 text-[12px] text-primary/80">
              <Check className="w-3 h-3" />
              Pre-filled from your profile — edit any field below.
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {profileLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px]">Loading…</span>
            </div>
          ) : submitted ? (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground text-[16px] mb-2" style={{ fontWeight: 600 }}>
                  Application submitted
                </h3>
                <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                  Your application is under review. Once our team approves it, you'll get the
                  Mentor role and can set up your profile, availability, services, and Google
                  Calendar from the mentor dashboard.
                </p>
              </div>
            </div>
          ) : alreadyApplied ? (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                {applicationStatus === 'APPROVED'
                  ? <Check className="w-7 h-7 text-primary" />
                  : <Clock className="w-7 h-7 text-primary" />}
              </div>
              <div>
                <h3 className="text-foreground text-[16px] mb-2" style={{ fontWeight: 600 }}>
                  {appliedCopy.title}
                </h3>
                <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                  {appliedCopy.body}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Full name <span className="text-destructive">*</span></p>
                <input
                  value={form.realName}
                  onChange={e => setForm(f => ({ ...f, realName: e.target.value }))}
                  placeholder="e.g. Jane Doe"
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Work email <span className="text-destructive">*</span></p>
                <input
                  type="email"
                  value={form.workEmail}
                  onChange={e => setForm(f => ({ ...f, workEmail: e.target.value }))}
                  placeholder="e.g. jane.doe@acme.com"
                  maxLength={255}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">LinkedIn URL <span className="text-destructive">*</span></p>
                <input
                  value={form.linkedinUrl}
                  onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))}
                  placeholder="https://www.linkedin.com/in/janedoe"
                  maxLength={255}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Resume */}
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Resume <span className="text-destructive">*</span></p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {resumeFile ? (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-primary/30 bg-primary/[4%]">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-[13px] text-foreground truncate flex-1">{resumeFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : hasStoredResume ? (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-secondary/20">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-[13px] text-foreground flex-1">Resume on file</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[12px] text-primary hover:underline"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-primary/30 text-[13px] text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload resume (PDF, DOC, DOCX)
                  </button>
                )}
              </div>

              {error && (
                <p className="text-[12.5px] text-destructive">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {profileLoading ? null : submitted || alreadyApplied ? (
          <div className="px-6 py-4 border-t border-border shrink-0">
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] hover:bg-primary/90 transition-colors"
              style={{ fontWeight: 500 }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
            <button
              onClick={handleClose}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontWeight: 500 }}
            >
              {submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />{resumeUploading ? 'Uploading resume…' : 'Submitting…'}</>
              ) : (
                <>Submit Application <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplyMentorModal;
