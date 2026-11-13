import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, FileText, Loader2, Mic, ShieldCheck, UploadCloud, Video, Volume2, X } from "lucide-react";
import { useInterviewQuota } from "@/hooks/useInterviewQuota";
import { uploadResumeAndWait } from "@/services/ProfileServices";
import { emitResumeUploaded } from "@/hooks/useResumeUploaded";
import {
  applyToJob,
  careersErrorCode,
  careersErrorData,
  careersErrorMessage,
  fundingOf,
  getMyApplication,
  startCareerInterview,
  type CareerApplication,
  type CareerInterviewSession,
  type QuotaShortage,
  type SelfPayConfirmation,
} from "@/services/careersApi";
import { OutOfInterviewsDialog } from "./OutOfInterviewsDialog";
import { CONSENT_SECTIONS, CONSENT_VERSION } from "./interviewConsent";
import { isBeingScored } from "./careersEnded";
import { applicationStateMessage, retakeBlockedMessage } from "./careersDesignData";
import { DEVICE_ERROR_TEXT, playTestSound, useDeviceCheck } from "./deviceCheck";

// The careers (apply → AI interview) flow used by the design's Opportunities
// pages, plus the few dialogs the design has no frame for yet: the start
// confirmation, the resume upload when applying needs one, and error notices.

export const font = {
  regular: "'Inter:Regular', Inter, sans-serif",
  medium: "'Inter:Medium', Inter, sans-serif",
  semibold: "'Inter:Semi_Bold', Inter, sans-serif",
};

const LANGUAGES: Record<string, string> = { en: "English", es: "Spanish", fr: "French", de: "German", zh: "Mandarin Chinese" };
export const languageLabel = (code: string) => LANGUAGES[code] ?? code;

export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 bg-[#3c77f6] text-white text-[14px] font-medium leading-5 px-4 py-2 rounded-xl hover:bg-[#2d6ae0] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ fontFamily: font.medium, boxShadow: "0px 4px 3px rgba(60,119,246,0.2)" }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 bg-white border border-[#e1e4ea] text-[#1e232f] text-[14px] font-medium leading-5 px-4 py-2 rounded-xl hover:bg-[#f9fafb] transition-colors disabled:opacity-60"
      style={{ fontFamily: font.medium }}
    >
      {children}
    </button>
  );
}

function Modal({ children, onClose, width = 520 }: { children: ReactNode; onClose: () => void; width?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width }} className="relative bg-white rounded-2xl max-w-full max-h-[90vh] overflow-y-auto shadow-[0px_24px_48px_rgba(0,0,0,0.12)] flex flex-col gap-4 p-7">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 p-1 text-[#9ba1b0] hover:text-[#5a6172]" aria-label="Close">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[13px]" style={{ fontFamily: font.regular }}>
      <span className="text-[#5a6172]">{k}</span>
      <span className="text-[#1e232f] font-semibold">{v}</span>
    </div>
  );
}

// Carried to the interview room in navigation state. The room calls the start
// endpoint itself when it is missing (reload = rejoin).
// Career interviews are video only.
// attemptsBefore: completedAttempts before this attempt, to tell a retake's
// new result from one that ended without a result (see careersEnded).
export type CareerRoomState = { session: CareerInterviewSession; title: string; minutes: number; attemptsBefore?: number | null };

export const roomPath = (applicationId: string) => `/opportunities/applications/${encodeURIComponent(applicationId)}/interview`;

// Confirms duration and cost, then starts (or rejoins) the
// interview and opens the room. Candidate-paid interviews use 1 interview from
// the candidate's quota, not credits (change C9, #298); none left → the
// out-of-interviews dialog with the right way to get more.
// onChanged: the application was reloaded after 409 INVALID_STATE; show it.
export function StartInterviewDialog({ app, onClose, onChanged }: { app: CareerApplication; onClose: () => void; onChanged?: (app: CareerApplication) => void }) {
  const navigate = useNavigate();
  const { quota, refresh: refreshQuota } = useInterviewQuota();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 403 INSUFFICIENT_INTERVIEW_QUOTA, or a self-pay prompt with 0 left.
  const [shortage, setShortage] = useState<QuotaShortage | null>(null);
  // RESUME_REQUIRED on start: the interview service has no parsed resume yet
  // (upload failed to parse or is still parsing). Nothing was used.
  const [needResume, setNeedResume] = useState(false);
  // Authorization step: shown before every start or rejoin, never remembered.
  const [consent, setConsent] = useState(false);
  // Camera / mic / speaker check, after the authorization step and before the
  // start call: a broken device never opens a session or uses an interview.
  const [deviceCheck, setDeviceCheck] = useState(false);
  // 409 SELF_PAY_CONFIRMATION_REQUIRED: the employer's sponsorship ran out
  // after this dialog opened. Ask before starting again with acceptSelfPay.
  const [selfPay, setSelfPay] = useState<SelfPayConfirmation | null>(null);
  const rejoin = app.interviewStatus === "IN_PROGRESS";
  // A retake (start after a completed interview) is always candidate-paid.
  const retake = app.interviewStatus === "COMPLETED";
  const candidatePays = retake || fundingOf(app) === "CANDIDATE" || !!selfPay;
  const left = selfPay?.interviewsAvailable ?? quota?.available;

  // The quota is shown for context only; the server decides (403).
  // Only reached after the consent and device steps, so every call (including the retries
  // after a resume upload or the self-pay prompt) carries the consent (#304).
  const start = async (acceptSelfPay = false) => {
    setBusy(true);
    setError("");
    try {
      const session = await startCareerInterview(app.applicationId, { acceptSelfPay: acceptSelfPay || candidatePays, consentVersion: CONSENT_VERSION });
      const state: CareerRoomState = { session, title: app.jobTitle, minutes: app.interviewDurationMinutes, attemptsBefore: app.completedAttempts ?? null };
      navigate(roomPath(app.applicationId), { state });
    } catch (err) {
      const code = careersErrorCode(err);
      if (code === "INSUFFICIENT_INTERVIEW_QUOTA") {
        setShortage(careersErrorData<QuotaShortage>(err) ?? { plan: quota?.plan ?? "FREE", available: 0, resetsAt: quota?.resetsAt });
      } else if (code === "RESUME_REQUIRED") setNeedResume(true);
      // Consent became required, or this version is no longer accepted: ask again.
      else if (code === "INTERVIEW_CONSENT_REQUIRED") {
        setSelfPay(null);
        setDeviceCheck(false);
        setConsent(true);
        setError("Please review and agree to the interview terms to continue.");
      }
      else if (code === "SELF_PAY_CONFIRMATION_REQUIRED") {
        const d = careersErrorData<SelfPayConfirmation>(err) ?? { interviewsRequired: 1, interviewsAvailable: quota?.available ?? 1 };
        // Nothing to confirm with none left: go straight to getting more.
        if (d.interviewsAvailable <= 0) {
          const q = await refreshQuota();
          setShortage({ plan: q?.plan ?? quota?.plan ?? "FREE", available: 0, resetsAt: q?.resetsAt ?? quota?.resetsAt });
        } else setSelfPay(d);
      } else if (code === "HIRING_AI_UNAVAILABLE") setError("The interview service is unavailable right now. Nothing was used. Please try again.");
      // The application changed under us (closed, decided, window ended, a
      // start in flight): reload it and say why, never retry.
      else if (code === "INVALID_STATE") {
        const fresh = await getMyApplication(app.applicationId).catch(() => null);
        if (fresh) onChanged?.(fresh);
        setError(fresh ? applicationStateMessage(fresh) : careersErrorMessage(err) || "This interview can't be started right now.");
      }
      else setError(careersErrorMessage(err) || "Couldn't start the interview. Please try again.");
      setBusy(false);
    }
  };

  if (needResume) {
    return (
      <ResumeModal
        title="Upload your resume again"
        body="The interview needs a resume we can read, and yours is missing or still being processed. Upload it again and we'll start your interview. Nothing was charged."
        onClose={onClose}
        onUploaded={() => {
          setNeedResume(false);
          void start();
        }}
      />
    );
  }

  if (shortage) return <OutOfInterviewsDialog shortage={shortage} onClose={onClose} />;

  if (selfPay && !rejoin) {
    const n = selfPay.interviewsRequired;
    return (
      <Modal onClose={onClose}>
        <h2 className="text-[#1e232f] text-[20px] font-semibold leading-7 pr-6" style={{ fontFamily: font.semibold }}>
          Sponsored interviews have run out
        </h2>
        <p className="text-[#5a6172] text-[14px] leading-5" style={{ fontFamily: font.regular }}>
          {app.companyName} is no longer sponsoring interviews for this role. You can still take it with one of your own interviews.
        </p>
        <div className="bg-[#f6f7f9] rounded-lg px-4 py-3 flex flex-col gap-1.5">
          <Row k="Cost" v={`${n} interview${n === 1 ? "" : "s"} (${selfPay.interviewsAvailable} left)`} />
        </div>
        {error && <p className="text-[#dc2626] text-[13px]" style={{ fontFamily: font.regular }}>{error}</p>}
        <div className="flex justify-end gap-3">
          <SecondaryButton onClick={onClose}>Not now</SecondaryButton>
          <PrimaryButton onClick={() => void start(true)} disabled={busy}>
            Use 1 interview and start
          </PrimaryButton>
        </div>
      </Modal>
    );
  }

  if (deviceCheck) {
    return (
      <DeviceCheckStep
        rejoin={rejoin}
        busy={busy}
        error={error}
        onBack={() => {
          setDeviceCheck(false);
          setError("");
        }}
        onClose={onClose}
        onStart={() => void start()}
      />
    );
  }

  if (consent) {
    return (
      <InterviewConsent
        busy={busy}
        error={error}
        onBack={() => {
          setConsent(false);
          setError("");
        }}
        onClose={onClose}
        onAgree={() => {
          setError("");
          setDeviceCheck(true);
        }}
      />
    );
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-[#1e232f] text-[20px] font-semibold leading-7 pr-6" style={{ fontFamily: font.semibold }}>
        {rejoin ? "Rejoin your interview" : "Start your AI interview"}
      </h2>
      <p className="text-[#5a6172] text-[14px] leading-5" style={{ fontFamily: font.regular }}>
        {rejoin
          ? "Your interview is still in progress. You'll go back into the same session at no extra cost."
          : `${app.jobTitle} at ${app.companyName}. It's a video interview: review the cost and check your camera and microphone before you begin.`}
      </p>
      <div className="bg-[#f6f7f9] rounded-lg px-4 py-3 flex flex-col gap-1.5">
        <Row k="Length" v={`Up to ${app.interviewDurationMinutes} minutes`} />
        <Row k="Questions" v={app.questionCount} />
        <Row k="Language" v={languageLabel(app.interviewLanguage)} />
        <Row k="Cost" v={candidatePays ? (rejoin ? "Already counted" : "1 interview") : "Free · sponsored by recruiter"} />
        {candidatePays && !rejoin && left != null && <Row k="Interviews left" v={left} />}
      </div>
      {candidatePays && !rejoin && (
        <p className="text-[#7d8699] text-[12px] leading-normal" style={{ fontFamily: font.regular }}>
          It counts once you get a result. If the interview doesn't really happen, you get it back.
        </p>
      )}
      {error && <p className="text-[#dc2626] text-[13px]" style={{ fontFamily: font.regular }}>{error}</p>}
      <div className="flex justify-end gap-3">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={() => setConsent(true)} disabled={busy}>
          {rejoin ? "Rejoin interview" : "Start AI interview"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

// Shown before every career interview. Agreeing moves on to the device check.
function InterviewConsent({
  busy,
  error,
  onAgree,
  onBack,
  onClose,
}: {
  busy: boolean;
  error: string;
  onAgree: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  return (
    <Modal onClose={onClose} width={600}>
      <div className="flex items-start gap-3 pr-6">
        <span className="w-10 h-10 rounded-full bg-[#eef4ff] text-[#3c77f6] flex items-center justify-center shrink-0">
          <ShieldCheck size={20} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-[#1e232f] text-[20px] font-semibold leading-7" style={{ fontFamily: font.semibold }}>
            Before your interview
          </h2>
          <p className="text-[#5a6172] text-[14px] leading-5" style={{ fontFamily: font.regular }}>
            Please read how your interview is recorded and used, then confirm to continue.
          </p>
        </div>
      </div>
      <div className="bg-[#f6f7f9] rounded-lg px-4 py-3 flex flex-col gap-3 max-h-[320px] overflow-y-auto">
        {CONSENT_SECTIONS.map((s) => (
          <div key={s.title} className="flex flex-col gap-0.5">
            <p className="text-[#1e232f] text-[13px] font-semibold" style={{ fontFamily: font.semibold }}>
              {s.title}
            </p>
            <p className="text-[#5a6172] text-[13px] leading-5" style={{ fontFamily: font.regular }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
      <label className="flex items-start gap-2 text-[13px] text-[#1e232f] cursor-pointer" style={{ fontFamily: font.regular }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 mt-0.5 accent-[#3c77f6]" />
        I have read the above and agree to the recording, AI assessment and sharing of my interview.
      </label>
      {error && <p className="text-[#dc2626] text-[13px]" style={{ fontFamily: font.regular }}>{error}</p>}
      <div className="flex justify-end gap-3">
        <SecondaryButton onClick={onBack} disabled={busy}>
          Back
        </SecondaryButton>
        <PrimaryButton onClick={onAgree} disabled={!agreed || busy}>
          {busy && <Loader2 size={14} className="animate-spin" />}
          Agree and continue
        </PrimaryButton>
      </div>
    </Modal>
  );
}

// Camera preview, microphone level and a speaker chime. Starting needs a working
// camera and microphone (the interview is video only); hearing a voice on the
// meter is encouraged but not required, since a quiet room is fine.
function DeviceCheckStep({
  rejoin,
  busy,
  error,
  onStart,
  onBack,
  onClose,
}: {
  rejoin: boolean;
  busy: boolean;
  error: string;
  onStart: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const { status, stream, level, heardVoice, retry } = useDeviceCheck();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundPlayed, setSoundPlayed] = useState(false);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  const ready = status === "ready";
  const failed = status !== "ready" && status !== "checking";
  const bars = 12;
  const lit = Math.round(level * bars);

  return (
    <Modal onClose={onClose} width={600}>
      <div className="flex items-start gap-3 pr-6">
        <span className="w-10 h-10 rounded-full bg-[#eef4ff] text-[#3c77f6] flex items-center justify-center shrink-0">
          <Video size={20} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-[#1e232f] text-[20px] font-semibold leading-7" style={{ fontFamily: font.semibold }}>
            Check your camera and microphone
          </h2>
          <p className="text-[#5a6172] text-[14px] leading-5" style={{ fontFamily: font.regular }}>
            Make sure you can see yourself, the microphone bar moves when you speak, and you can hear the test sound.
          </p>
        </div>
      </div>

      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1e232f]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Camera preview"
          className={`w-full h-full object-cover ${ready ? "" : "invisible"}`}
          style={{ transform: "scaleX(-1)" }}
        />
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            {status === "checking" ? (
              <>
                <Loader2 size={24} className="animate-spin text-white/80" />
                <p className="text-white/80 text-[13px]" style={{ fontFamily: font.regular }}>
                  Waiting for camera and microphone access…
                </p>
              </>
            ) : (
              <>
                <p role="alert" className="text-white text-[14px] leading-5" style={{ fontFamily: font.regular }}>
                  {DEVICE_ERROR_TEXT[status as keyof typeof DEVICE_ERROR_TEXT]}
                </p>
                {status !== "unsupported" && <SecondaryButton onClick={retry}>Try again</SecondaryButton>}
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-[#f6f7f9] rounded-lg px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-[13px]" style={{ fontFamily: font.regular }}>
          <span className="flex items-center gap-2 text-[#5a6172]">
            <Video size={14} /> Camera
          </span>
          <DeviceState ok={ready} failed={failed} />
        </div>
        <div className="flex items-center justify-between gap-3 text-[13px]" style={{ fontFamily: font.regular }}>
          <span className="flex items-center gap-2 text-[#5a6172] shrink-0">
            <Mic size={14} /> Microphone
          </span>
          {ready ? (
            <span className="flex items-center gap-3">
              <span className="text-[#7d8699] text-[12px] hidden sm:inline">{heardVoice ? "We can hear you" : "Say something"}</span>
              <span className="flex items-end gap-[3px] h-4" aria-label="Microphone level">
                {Array.from({ length: bars }, (_, i) => (
                  <span
                    key={i}
                    className={`w-[4px] rounded-sm transition-colors ${i < lit ? "bg-[#15a560]" : "bg-[#dfe2e8]"}`}
                    style={{ height: `${40 + (i / bars) * 60}%` }}
                  />
                ))}
              </span>
            </span>
          ) : (
            <DeviceState ok={false} failed={failed} />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 text-[13px]" style={{ fontFamily: font.regular }}>
          <span className="flex items-center gap-2 text-[#5a6172]">
            <Volume2 size={14} /> Speakers
          </span>
          <button
            type="button"
            onClick={() => setSoundPlayed(playTestSound() || soundPlayed)}
            className="text-[#3c77f6] font-medium hover:underline"
            style={{ fontFamily: font.medium }}
          >
            {soundPlayed ? "Play again" : "Play test sound"}
          </button>
        </div>
      </div>
      <p className="text-[#7d8699] text-[12px] leading-normal" style={{ fontFamily: font.regular }}>
        The interview uses your browser's default camera, microphone and speakers. To use different ones, change them in your browser or system settings, then press Try again.
      </p>

      {error && <p className="text-[#dc2626] text-[13px]" style={{ fontFamily: font.regular }}>{error}</p>}
      <div className="flex justify-end gap-3">
        <SecondaryButton onClick={onBack} disabled={busy}>
          Back
        </SecondaryButton>
        <PrimaryButton onClick={onStart} disabled={!ready || busy}>
          {busy && <Loader2 size={14} className="animate-spin" />}
          {rejoin ? "Rejoin interview" : "Start interview"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function DeviceState({ ok, failed }: { ok: boolean; failed: boolean }) {
  if (ok)
    return (
      <span className="flex items-center gap-1.5 text-[#15a560] font-semibold">
        <CheckCircle2 size={14} /> Working
      </span>
    );
  return <span className={failed ? "text-[#dc2626] font-semibold" : "text-[#7d8699]"}>{failed ? "Not available" : "Checking…"}</span>;
}

const RESUME_EXTS = [".pdf", ".doc", ".docx"];
const RESUME_MAX_BYTES = 5 * 1024 * 1024;

// RESUME_REQUIRED: upload in place (same contract as the Profile tab), then retry.
function ResumeModal({
  onUploaded,
  onClose,
  title = "Add a resume to continue",
  body = "Recruiters receive the resume on your profile with your assessment. Upload one and we'll continue right away.",
}: {
  onUploaded: () => void;
  onClose: () => void;
  title?: string;
  body?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!RESUME_EXTS.some((e) => file.name.toLowerCase().endsWith(e))) return setError("Upload a PDF, DOC or DOCX file.");
    if (file.size > RESUME_MAX_BYTES) return setError("Resume must be 5 MB or smaller.");
    setBusy(true);
    setError("");
    try {
      await uploadResumeAndWait(file);
      emitResumeUploaded();
      onUploaded();
    } catch (err) {
      setError(careersErrorMessage(err) || "Couldn't process your resume. Please try another file.");
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start gap-3">
        <FileText size={20} className="text-[#b45309] shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <h2 className="text-[#1e232f] text-[18px] font-semibold" style={{ fontFamily: font.semibold }}>
            {title}
          </h2>
          <p className="text-[13px] text-[#5a6172]" style={{ fontFamily: font.regular }}>
            {body}
          </p>
        </div>
      </div>
      {error && <p className="text-[13px] text-[#dc2626]" style={{ fontFamily: font.regular }}>{error}</p>}
      <div className="flex justify-end gap-3">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={15} />}
          {busy ? "Reading your resume…" : "Upload resume"}
        </PrimaryButton>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
    </Modal>
  );
}

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <p className="text-[14px] text-[#1e232f] pr-6" style={{ fontFamily: font.regular }}>
        {message}
      </p>
      <div className="flex justify-end">
        <PrimaryButton onClick={onClose}>OK</PrimaryButton>
      </div>
    </Modal>
  );
}

// The design's "Quick interview" / "Start AI interview" buttons: apply (safe
// to repeat — returns the existing application), then confirm and start.
// Render `ui` once in the page.
export function useCareerInterviewStarter(onApplied?: (app: CareerApplication) => void) {
  const [app, setApp] = useState<CareerApplication | null>(null);
  const [busyJob, setBusyJob] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [resumeFor, setResumeFor] = useState<string | null>(null);

  const begin = async (jobId: string) => {
    setBusyJob(jobId);
    try {
      const a = await applyToJob(jobId);
      onApplied?.(a);
      if (isBeingScored(a)) setNotice("We're processing your interview. Check My Jobs in a few minutes.");
      // Completed: canStartInterview means a retake is allowed now.
      else if (a.interviewStatus === "COMPLETED" && !a.canStartInterview)
        setNotice(retakeBlockedMessage(a));
      else if (!a.canStartInterview) setNotice("This role is no longer accepting interviews.");
      else setApp(a);
    } catch (err) {
      const code = careersErrorCode(err);
      if (code === "RESUME_REQUIRED") setResumeFor(jobId);
      else if (code === "INVALID_STATE") setNotice(careersErrorMessage(err) || "This role is no longer accepting applications.");
      else if (code === "NOT_FOUND") setNotice("This role is no longer open.");
      else setNotice(careersErrorMessage(err) || "Couldn't continue. Please try again.");
    } finally {
      setBusyJob(null);
    }
  };

  const ui = (
    <>
      {app && <StartInterviewDialog app={app} onClose={() => setApp(null)} onChanged={(a) => onApplied?.(a)} />}
      {resumeFor && (
        <ResumeModal
          onClose={() => setResumeFor(null)}
          onUploaded={() => {
            const id = resumeFor;
            setResumeFor(null);
            void begin(id);
          }}
        />
      )}
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
    </>
  );

  return { begin, busyJob, openDialog: setApp, ui };
}
