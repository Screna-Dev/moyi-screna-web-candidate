import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { FileText, Loader2, Mic, UploadCloud, Video, X } from "lucide-react";
import { useUserPlan } from "@/hooks/useUserPlan";
import { uploadResumeAndWait } from "@/services/ProfileServices";
import { emitResumeUploaded } from "@/hooks/useResumeUploaded";
import {
  applyToJob,
  careersErrorCode,
  careersErrorMessage,
  startCareerInterview,
  type CareerApplication,
  type CareerInterviewSession,
} from "@/services/careersApi";
import { QuickInterviewModal } from "./QuickInterviewModal";
import { isBeingScored } from "./careersEnded";

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

// Credits a candidate-paid interview pre-charges: 1/min audio, ×1.5 video.
// The unused part is refunded after the interview.
export const interviewCost = (minutes: number, video: boolean) => Math.ceil(minutes * (video ? 1.5 : 1));

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

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative bg-white rounded-2xl w-[520px] max-w-full shadow-[0px_24px_48px_rgba(0,0,0,0.12)] flex flex-col gap-4 p-7">
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
export type CareerRoomState = { session: CareerInterviewSession; video: boolean; title: string; minutes: number };

export const roomPath = (applicationId: string) => `/opportunities/applications/${encodeURIComponent(applicationId)}/interview`;

// Confirms duration, cost and voice vs video, then starts (or rejoins) the
// interview and opens the room. Not enough credits → the design's
// QuickInterviewModal with the real numbers.
export function StartInterviewDialog({ app, onClose }: { app: CareerApplication; onClose: () => void }) {
  const navigate = useNavigate();
  const { planData, buyCredits } = useUserPlan();
  // Assumed: careers interviews draw on the same candidate credit pool.
  const creditBalance = planData.creditBalance;
  const [video, setVideo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [short, setShort] = useState(false);
  // RESUME_REQUIRED on start: the interview service has no parsed resume yet
  // (upload failed to parse or is still parsing). Nothing was charged.
  const [needResume, setNeedResume] = useState(false);
  const rejoin = app.interviewStatus === "IN_PROGRESS";
  const candidatePays = app.interviewPayer === "CANDIDATE";
  const cost = interviewCost(app.interviewDurationMinutes, video);

  // The balance is shown for context only; the server decides (403
  // INSUFFICIENT_CREDITS), since the plan may still be loading.
  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const session = await startCareerInterview(app.applicationId, !video);
      const state: CareerRoomState = { session, video, title: app.jobTitle, minutes: app.interviewDurationMinutes };
      navigate(roomPath(app.applicationId), { state });
    } catch (err) {
      const code = careersErrorCode(err);
      if (code === "INSUFFICIENT_CREDITS") setShort(true);
      else if (code === "RESUME_REQUIRED") setNeedResume(true);
      else if (code === "INTERVIEW_UNAVAILABLE") setError("This company can't host interviews right now. Please try again later.");
      else if (code === "HIRING_AI_UNAVAILABLE") setError("The interview service is unavailable right now. Nothing was charged. Please try again.");
      else if (code === "INVALID_STATE") setError(careersErrorMessage(err) || "This interview can't be started right now. Refresh and try again.");
      else setError(careersErrorMessage(err) || "Couldn't start the interview. Please try again.");
      setBusy(false);
    }
  };

  const buy = async () => {
    setBusy(true);
    const url = await buyCredits(Math.max(1, cost - creditBalance));
    if (url) window.location.href = url;
    else setBusy(false);
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

  if (short) {
    return <QuickInterviewModal onClose={onClose} minutes={app.interviewDurationMinutes} balance={creditBalance} required={cost} onBuy={() => void buy()} buying={busy} />;
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-[#1e232f] text-[20px] font-semibold leading-7 pr-6" style={{ fontFamily: font.semibold }}>
        {rejoin ? "Rejoin your interview" : "Start your AI interview"}
      </h2>
      <p className="text-[#5a6172] text-[14px] leading-5" style={{ fontFamily: font.regular }}>
        {rejoin
          ? "Your interview is still in progress. You'll go back into the same session at no extra cost."
          : `${app.jobTitle} at ${app.companyName}. Review the cost and check your microphone before you begin.`}
      </p>
      <div className="bg-[#f6f7f9] rounded-lg px-4 py-3 flex flex-col gap-1.5">
        <Row k="Length" v={`Up to ${app.interviewDurationMinutes} minutes`} />
        <Row k="Questions" v={app.questionCount} />
        <Row k="Language" v={languageLabel(app.interviewLanguage)} />
        <Row k="Cost" v={candidatePays ? (rejoin ? "Already paid" : `${cost} credits held · unused part refunded`) : "Free · sponsored by recruiter"} />
        {candidatePays && !rejoin && <Row k="Your balance" v={`${creditBalance} credits`} />}
      </div>
      {!rejoin && (
        <div className="flex gap-2">
          {[
            { v: false, icon: <Mic size={15} />, label: "Voice interview" },
            { v: true, icon: <Video size={15} />, label: candidatePays ? "Video interview (×1.5 credits)" : "Video interview" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setVideo(o.v)}
              aria-pressed={video === o.v}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] transition-colors ${
                video === o.v ? "border-[#3c77f6] bg-[#f8fbff] text-[#3c77f6] font-semibold" : "border-[#e1e4ea] text-[#5a6172] hover:bg-[#f9fafb]"
              }`}
              style={{ fontFamily: font.medium }}
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-[#dc2626] text-[13px]" style={{ fontFamily: font.regular }}>{error}</p>}
      <div className="flex justify-end gap-3">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={() => void start()} disabled={busy}>
          {busy && <Loader2 size={14} className="animate-spin" />}
          {rejoin ? "Rejoin interview" : "Start AI interview"}
        </PrimaryButton>
      </div>
    </Modal>
  );
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
      if (a.interviewStatus === "COMPLETED") setNotice("You've already completed the interview for this role. The recruiter will review it.");
      else if (isBeingScored(a)) setNotice("We're processing your interview. Check My Jobs in a few minutes.");
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
      {app && <StartInterviewDialog app={app} onClose={() => setApp(null)} />}
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
