import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { VideoInterview } from "@/components/newDesign/video-interview";
import { CONSENT_VERSION } from "@/components/newDesign/opportunities/interviewConsent";
import { endCareerInterview, careersErrorCode, careersErrorMessage, getMyApplication, startCareerInterview, type CareerInterviewSession } from "@/services/careersApi";
import { PrimaryButton, SecondaryButton, font, type CareerRoomState } from "@/components/newDesign/opportunities/careersShared";
import { checkCareerResult, isBeingScored, markInterviewEnded, settleIfDone } from "@/components/newDesign/opportunities/careersEnded";

// Live AI interview for a job application, always on video. Reuses the
// mock-interview room component (VideoInterview), but never the /ai-mock page: that page ends by calling the
// training endpoints and opening /evaluation, neither of which applies here.
//
// The room components only fall back to the training session API when they
// get no credentials, so this page renders them only once it holds the
// careers session (from the start dialog's navigation state, or by rejoining
// after a reload). Ending calls POST .../interview/end and releases the
// candidate at once: scoring runs in the background and they can go anywhere.
// While this page stays open it keeps checking the application (interviewStatus
// = COMPLETED) and offers the result when it lands; elsewhere,
// CareerResultWatcher does the checking and shows a toast. While it scores,
// the application still reads IN_PROGRESS, so the room marks it as ended
// (careersEnded) and a reload shows "submitted" instead of rejoining.

type Phase = "joining" | "live" | "ending" | "submitted" | "done" | "error";

const POLL_MS = 4000;

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 w-[480px] max-w-full flex flex-col items-center gap-4 text-center shadow-[0px_8px_24px_rgba(0,0,0,0.06)]">
        {children}
      </div>
    </div>
  );
}

export function CareerInterviewPage() {
  const { applicationId = "" } = useParams<{ applicationId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const fromDialog = (location.state as CareerRoomState | null) ?? null;

  const [session, setSession] = useState<CareerInterviewSession | null>(fromDialog?.session ?? null);
  const [title, setTitle] = useState(fromDialog?.title ?? "");
  // Interviews last at most 20 minutes.
  const [minutes, setMinutes] = useState(fromDialog?.session.maxInterviewDuration ?? fromDialog?.minutes ?? 20);
  const [phase, setPhase] = useState<Phase>(fromDialog ? "live" : "joining");
  const [message, setMessage] = useState("");

  // Reload / direct link: rejoin only an interview that is already running.
  // Never start a fresh one from here — that would charge without the
  // confirmation dialog.
  const joinStarted = useRef(false);
  useEffect(() => {
    if (fromDialog || joinStarted.current) return;
    joinStarted.current = true;
    (async () => {
      try {
        const app = await getMyApplication(applicationId);
        setTitle(app.jobTitle);
        setMinutes(app.interviewDurationMinutes);
        if (settleIfDone(app) === "ready") return setPhase("done");
        // Ended here and still scoring: don't rejoin.
        if (isBeingScored(app)) return setPhase("submitted");
        if (app.interviewStatus !== "IN_PROGRESS" || !app.canStartInterview) {
          setMessage("This interview hasn't started. Start it from My Jobs.");
          return setPhase("error");
        }
        // A reconnect: the candidate agreed before this interview started, so
        // send the consent again without asking (#304) — the backend may open a
        // new interview if the last start got stuck.
        const s = await startCareerInterview(applicationId, { consentVersion: CONSENT_VERSION });
        setSession(s);
        if (s.maxInterviewDuration) setMinutes(s.maxInterviewDuration);
        setPhase("live");
      } catch (err) {
        if (careersErrorCode(err) === "INTERVIEW_CONSENT_REQUIRED") {
          setMessage("Please start the interview again from My Jobs and review the interview terms.");
          return setPhase("error");
        }
        setMessage(careersErrorMessage(err) || "We couldn't reconnect you to the interview.");
        setPhase("error");
      }
    })();
    // Runs once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Submitted: keep checking while this page is open. No time limit here;
  // the candidate can leave whenever they like.
  useEffect(() => {
    if (phase !== "submitted") return;
    let cancelled = false;
    let timer: number | undefined;
    const check = async () => {
      try {
        const { outcome } = await checkCareerResult(applicationId);
        if (cancelled) return;
        if (outcome === "ready") return setPhase("done");
        if (outcome === "void") {
          setMessage("This attempt didn't count — the interview didn't really get going. Nothing was used, and you can start again from My Jobs.");
          return setPhase("error");
        }
      } catch {
        /* try again */
      }
      if (!cancelled) timer = window.setTimeout(check, POLL_MS);
    };
    timer = window.setTimeout(check, POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phase, applicationId]);

  const ended = useRef(false);
  const finish = async () => {
    if (ended.current) return;
    ended.current = true;
    // Before /end: from here until scoring finishes, "continue" is hidden.
    markInterviewEnded(applicationId);
    setPhase("ending");
    try {
      await endCareerInterview(applicationId);
    } catch (err) {
      // Already over on the server (e.g. the bot ended it) is fine.
      if (careersErrorCode(err) !== "INVALID_STATE") console.warn("End interview failed", err);
    }
    setPhase("submitted");
  };

  if (phase === "live" && session) {
    const config = { type: "job", difficulty: "", duration: String(minutes), mode: "video", company: "" };
    return (
      <VideoInterview
        config={config}
        interviewId={applicationId}
        onEnd={() => void finish()}
        prefetchedSession={{ liveKitUrl: session.url, liveKitToken: session.token, maxInterviewDuration: session.maxInterviewDuration }}
      />
    );
  }

  if (phase === "joining" || phase === "ending") {
    return (
      <Screen>
        <Loader2 size={28} className="animate-spin text-[#3c77f6]" />
        <p className="text-[18px] font-semibold text-[#1e232f]" style={{ fontFamily: font.semibold }}>
          {phase === "joining" ? "Reconnecting to your interview…" : "Wrapping up your interview…"}
        </p>
        {phase === "joining" && (
          <p className="text-[14px] text-[#5a6172]" style={{ fontFamily: font.regular }}>
            You won't be charged again.
          </p>
        )}
      </Screen>
    );
  }

  if (phase === "submitted" || phase === "done") {
    const ready = phase === "done";
    return (
      <Screen>
        <span className="w-12 h-12 rounded-full bg-[#ecfdf3] text-[#15a560] flex items-center justify-center">
          <CheckCircle2 size={24} />
        </span>
        <p className="text-[20px] font-semibold text-[#1e232f]" style={{ fontFamily: font.semibold }}>
          {ready ? "Your result is ready" : "Interview submitted"}
        </p>
        <p className="text-[14px] text-[#5a6172]" style={{ fontFamily: font.regular }}>
          {ready
            ? `Thanks! Your interview${title ? ` for ${title}` : ""} has been sent to the employer. They'll review it and reach out if it's a match.`
            : "We're scoring your interview in the background. It usually takes about a minute — you don't need to wait here. We'll let you know when your result is ready, and you'll find it in My Jobs."}
        </p>
        {!ready && (
          <p className="flex items-center gap-2 text-[13px] text-[#7d8699]" style={{ fontFamily: font.regular }}>
            <Loader2 size={14} className="animate-spin" /> Processing your result…
          </p>
        )}
        <div className="flex gap-3">
          <SecondaryButton onClick={() => navigate(ready ? "/opportunities/my-jobs" : "/opportunities")}>
            {ready ? "Go to My Jobs" : "Browse more roles"}
          </SecondaryButton>
          <PrimaryButton
            onClick={() =>
              navigate(ready ? `/opportunities/applications/${encodeURIComponent(applicationId)}/results` : "/opportunities/my-jobs")
            }
          >
            {ready ? "View result" : "Go to My Jobs"}
          </PrimaryButton>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <p className="text-[18px] font-semibold text-[#1e232f]" style={{ fontFamily: font.semibold }}>
        Interview unavailable
      </p>
      <p className="text-[14px] text-[#5a6172]" style={{ fontFamily: font.regular }}>
        {message}
      </p>
      <PrimaryButton onClick={() => navigate("/opportunities/my-jobs")}>Go to My Jobs</PrimaryButton>
    </Screen>
  );
}
