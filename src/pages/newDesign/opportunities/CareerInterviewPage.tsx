import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { LiveInterview } from "@/components/newDesign/live-interview";
import { VideoInterview } from "@/components/newDesign/video-interview";
import { endCareerInterview, careersErrorCode, careersErrorMessage, getMyApplication, startCareerInterview, type CareerInterviewSession } from "@/services/careersApi";
import { PrimaryButton, SecondaryButton, font, type CareerRoomState } from "@/components/newDesign/opportunities/careersShared";

// Live AI interview for a job application. Reuses the mock-interview room
// components, but never the /ai-mock page: that page ends by calling the
// training endpoints and opening /evaluation, neither of which applies here.
//
// The room components only fall back to the training session API when they
// get no credentials, so this page renders them only once it holds the
// careers session (from the start dialog's navigation state, or by rejoining
// after a reload). Ending calls POST .../interview/end, then polls the
// application until the backend has finished scoring (interviewStatus =
// COMPLETED); candidates never see the score.

type Phase = "joining" | "live" | "ending" | "done" | "error";

const POLL_MS = 3000;
const POLL_LIMIT_MS = 120_000;
const modeKey = (id: string) => `careerInterviewVideo:${id}`;

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
  const [video] = useState<boolean>(() => {
    if (fromDialog) return fromDialog.video;
    try {
      return sessionStorage.getItem(modeKey(applicationId)) === "1";
    } catch {
      return false;
    }
  });
  const [title, setTitle] = useState(fromDialog?.title ?? "");
  const [minutes, setMinutes] = useState(fromDialog?.session.maxInterviewDuration ?? fromDialog?.minutes ?? 30);
  const [phase, setPhase] = useState<Phase>(fromDialog ? "live" : "joining");
  const [message, setMessage] = useState("");

  // Remember audio vs video so a reload rejoins the same way.
  useEffect(() => {
    if (!fromDialog) return;
    try {
      sessionStorage.setItem(modeKey(applicationId), fromDialog.video ? "1" : "0");
    } catch {
      /* private mode */
    }
  }, [fromDialog, applicationId]);

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
        if (app.interviewStatus === "COMPLETED") return setPhase("done");
        if (app.interviewStatus !== "IN_PROGRESS" || !app.canStartInterview) {
          setMessage("This interview hasn't started. Start it from My Jobs.");
          return setPhase("error");
        }
        const s = await startCareerInterview(applicationId, !video);
        setSession(s);
        if (s.maxInterviewDuration) setMinutes(s.maxInterviewDuration);
        setPhase("live");
      } catch (err) {
        setMessage(careersErrorMessage(err) || "We couldn't reconnect you to the interview.");
        setPhase("error");
      }
    })();
    // Runs once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ended = useRef(false);
  const finish = async () => {
    if (ended.current) return;
    ended.current = true;
    setPhase("ending");
    try {
      await endCareerInterview(applicationId);
    } catch (err) {
      // Already over on the server (e.g. the bot ended it) is fine.
      if (careersErrorCode(err) !== "INVALID_STATE") console.warn("End interview failed", err);
    }
    const deadline = Date.now() + POLL_LIMIT_MS;
    for (;;) {
      try {
        const app = await getMyApplication(applicationId);
        if (app.interviewStatus === "COMPLETED") break;
        // Back to NOT_STARTED = the attempt didn't count (dropped / never spoke).
        if (app.interviewStatus === "NOT_STARTED") {
          setMessage("This attempt didn't count — the interview didn't really get going. Any credits held were refunded, and you can start again from My Jobs.");
          return setPhase("error");
        }
      } catch {
        /* keep polling */
      }
      if (Date.now() > deadline) {
        setMessage("We're still processing your interview. Check My Jobs in a few minutes.");
        break;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    try {
      sessionStorage.removeItem(modeKey(applicationId));
    } catch {
      /* ignore */
    }
    setPhase("done");
  };

  if (phase === "live" && session) {
    const config = { type: "job", difficulty: "", duration: String(minutes), mode: video ? "video" : "voice", company: "" };
    return video ? (
      <VideoInterview
        config={config}
        interviewId={applicationId}
        onEnd={() => void finish()}
        prefetchedSession={{ liveKitUrl: session.url, liveKitToken: session.token, maxInterviewDuration: session.maxInterviewDuration }}
      />
    ) : (
      <LiveInterview
        config={config}
        interviewId={applicationId}
        onEnd={() => void finish()}
        sessionCredentials={{ sessionId: session.sessionId, url: session.url, token: session.token, roomName: session.roomName, maxDuration: session.maxInterviewDuration ?? undefined }}
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
        <p className="text-[14px] text-[#5a6172]" style={{ fontFamily: font.regular }}>
          {phase === "joining" ? "You won't be charged again." : "This usually takes a few seconds to a minute. Please keep this page open."}
        </p>
      </Screen>
    );
  }

  if (phase === "done") {
    return (
      <Screen>
        <span className="w-12 h-12 rounded-full bg-[#ecfdf3] text-[#15a560] flex items-center justify-center">
          <CheckCircle2 size={24} />
        </span>
        <p className="text-[20px] font-semibold text-[#1e232f]" style={{ fontFamily: font.semibold }}>
          Interview complete
        </p>
        <p className="text-[14px] text-[#5a6172]" style={{ fontFamily: font.regular }}>
          {message || `Thanks! Your interview${title ? ` for ${title}` : ""} has been sent to the employer. They'll review it and reach out if it's a match.`}
        </p>
        <div className="flex gap-3">
          <SecondaryButton onClick={() => navigate("/opportunities")}>Browse more roles</SecondaryButton>
          <PrimaryButton onClick={() => navigate("/opportunities/my-jobs")}>Go to My Jobs</PrimaryButton>
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
