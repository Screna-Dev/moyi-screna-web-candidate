import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { settleIfDone } from "@/components/newDesign/opportunities/careersEnded";
import { leftToStartLabel, standingTile } from "@/components/newDesign/opportunities/careersDesignData";
import { useCareerInterviewStarter } from "@/components/newDesign/opportunities/careersShared";
import {
  careersErrorCode,
  getMyApplication,
  getMyInterviewResult,
  type CareerApplication,
  type CareerInterviewResult,
} from "@/services/careersApi";

const assetPathPrefix = "/images/opportunities";
const imgArrowRight = `${assetPathPrefix}/c68c4.svg`;
const imgChevronDown = `${assetPathPrefix}/e057d.svg`;
const imgChevronUp = `${assetPathPrefix}/05bbc.svg`;

function Divider() {
  return <div className="w-full h-px bg-[#e1e4ea]" />;
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full h-2 bg-[#e1e4ea] rounded overflow-hidden">
      <div className="h-full bg-[#3c77f6] rounded" style={{ width: `${score}%` }} />
    </div>
  );
}

type QuestionView = {
  id: string;
  text: string;
  summary?: string;
  toImprove?: string;
  transcript?: string; // the candidate's answer (Pro)
  sample?: boolean; // design sample, only when the API sends no questions
};

// Design sample (only when the API sends no questions); its "went well",
// tags and audio are not shown.
const questions = [
  { id: "Q1", text: "Tell us about a backend project you contributed to.", summary: "Clear context and contribution; add measurable results." },
  {
    id: "Q2",
    text: "How would you design a pipeline that processes 50,000 billing events per second without losing or double-counting events?",
    expanded: true,
    wentWell: "You clarified the delivery guarantees, proposed partitioned event processing, and used event IDs to support idempotent writes. You also identified the risk of hot partitions.",
    toImprove: "Explain how you would monitor failures and reconcile missing or duplicated events over time.",
    tags: [
      { label: "Clarified requirements", color: "blue" },
      { label: "Considered failure modes", color: "blue" },
      { label: "Add monitoring details", color: "red" },
    ],
  },
  { id: "Q3", text: "How would you choose transaction isolation levels for a billing system?", summary: "Good understanding of consistency trade-offs; connect your choice to a concrete scenario." },
  { id: "Q4", text: "Describe a time a teammate challenged your technical proposal.", summary: "You explained the trade-off well; clarify your ownership and the final outcome." },
  { id: "Q5", text: "How would you investigate a mismatch between usage records and a customer's bill?", summary: "Good diagnostic structure; include validation after the fix." },
];

// Design sample values. On /opportunities/applications/:applicationId/results
// the page shows the candidate's real result (#303) where the API has it —
// title, date, overall score, criterion scores, summary, strengths, areas to
// strengthen, application status — and keeps these samples for the rest
// (qualification, per-criterion feedback, question tags, recording, PDF,
// contact / email status), per the design-first rule. Replace before launch.
// Rank, attempt, best score, per-question text (Pro: summary / gap / answer)
// and the retake window are real.
const SAMPLE_CRITERIA = [
  { label: "Technical accuracy", score: 88, feedback: "Strong understanding of idempotency, database behavior, and backend reliability." },
  { label: "Structured thinking", score: 80, feedback: "Your approach was clear, but some answers would benefit from stating assumptions earlier." },
  { label: "Communication", score: 82, feedback: "You explained trade-offs clearly and responded constructively to follow-up questions." },
  { label: "Completeness", score: 86, feedback: "Most answers covered the key considerations. Add measurable outcomes when discussing past projects." },
];
const SAMPLE_STRENGTHS = ["Backend reliability and data correctness", "Identifying technical trade-offs", "Responding to follow-up questions"];
const SAMPLE_AREAS = [
  "State assumptions before presenting a solution.",
  "Explain monitoring and recovery, not just the initial design.",
  "Describe your individual contribution and measurable project outcomes.",
];

const DECISION_LABEL: Record<string, { text: string; color: string }> = {
  AWAITING: { text: "Awaiting recruiter decision", color: "text-[#5a6172]" },
  MOVED_FORWARD: { text: "Moved forward", color: "text-[#34c759]" },
  REJECTED: { text: "Not selected", color: "text-[#5a6172]" },
};

function viewedLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function shortDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function completedLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type LiveState =
  | { status: "loading" }
  // 409: still being scored. Checked again every few seconds while open.
  | { status: "processing" }
  | { status: "ready"; result: CareerInterviewResult; app: CareerApplication | null }
  | { status: "error"; message: string };

const RESULT_POLL_MS = 5000;

export function InterviewResultPage() {
  const navigate = useNavigate();
  const { applicationId = "" } = useParams<{ applicationId: string }>();
  const [expandedQ, setExpandedQ] = useState<string | null>("Q2");
  const [live, setLive] = useState<LiveState>({ status: "loading" });
  const starter = useCareerInterviewStarter();

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    let timer: number | undefined;
    setLive({ status: "loading" });
    const load = () =>
      Promise.all([getMyInterviewResult(applicationId), getMyApplication(applicationId).catch(() => null)])
        .then(([result, app]) => {
          if (cancelled) return;
          // Opened from a link before the watcher saw it: settle it here.
          if (app) settleIfDone(app);
          setLive({ status: "ready", result, app });
        })
        .catch((err) => {
          if (cancelled) return;
          const code = careersErrorCode(err);
          if (code === "INVALID_STATE") {
            setLive({ status: "processing" });
            timer = window.setTimeout(load, RESULT_POLL_MS);
            return;
          }
          setLive({
            status: "error",
            message: code === "NOT_FOUND" ? "We couldn't find this result." : "We couldn't load your result. Please try again.",
          });
        });
    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [applicationId]);

  if (live.status !== "ready") {
    return (
      <div className="flex flex-col gap-6 pb-12">
        <button
          onClick={() => navigate("/opportunities/my-jobs")}
          className="text-[#3c77f6] text-[14px] leading-5 text-left w-fit hover:underline"
          style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
        >
          ← Back to My Jobs
        </button>
        <p className="text-[#5a6172] text-[14px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
          {live.status === "loading"
            ? "Loading your result…"
            : live.status === "processing"
              ? "We're still scoring your interview. It usually takes about a minute — this page updates by itself, or you can leave and we'll let you know when it's ready."
              : live.message}
        </p>
      </div>
    );
  }

  const r = live.result;
  const decision = live.app?.hiringDecision;
  const score = `${r.overallScore}/100`;
  const criteriaRows = r.criteria.length
    ? r.criteria.map((c, i) => ({ label: c.name, score: c.score, feedback: SAMPLE_CRITERIA[i % SAMPLE_CRITERIA.length].feedback }))
    : SAMPLE_CRITERIA;
  const strengths = r.strengths.length ? r.strengths : SAMPLE_STRENGTHS;
  const areas = r.areasToStrengthen.length ? r.areasToStrengthen : SAMPLE_AREAS;
  const statusRow = decision ? DECISION_LABEL[decision] : undefined;
  const best = `${r.bestScore ?? r.overallScore}/100`;
  const rank = standingTile(r.standing);
  // Real questions when the API sends them; Pro adds summary / gap / answer.
  // No "What went well", tags or audio in the data: hidden for everyone.
  const questionRows: QuestionView[] = r.questions?.length
    ? r.questions.map((q) => ({
        id: `Q${q.seq}`,
        text: q.text,
        summary: q.summary ?? undefined,
        toImprove: q.gapAnalysis ?? undefined,
        transcript: q.answerText ?? undefined,
      }))
    : questions.map((q) => ({ id: q.id, text: q.text, summary: q.summary, toImprove: q.toImprove, sample: true }));
  const app = live.app;
  // Countdown and retake only while retakeAvailability is AVAILABLE.
  const canRetake = app?.interviewStatus === "COMPLETED" && app.canStartInterview && (app.retakeAvailability ?? "AVAILABLE") === "AVAILABLE";
  const timeLeft = leftToStartLabel(app?.retakeDeadline).replace(/ left to start$/, "");

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Back link */}
      <button
        onClick={() => navigate("/opportunities")}
        className="text-[#3c77f6] text-[14px] leading-5 text-left w-fit hover:underline"
        style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
      >
        ← Back to Opportunities
      </button>

      {/* Page header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1
            className="text-[#1e232f] text-[32px] font-bold leading-10"
            style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
          >
            Interview results
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <p
            className="text-[#5a6172] text-[16px] font-medium leading-[normal]"
            style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
          >
            {`${r.jobTitle} · ${r.companyName}`}
          </p>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold border bg-[rgba(60,119,246,0.1)] border-[rgba(60,119,246,0.2)] text-[#3c77f6]"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
          >
            Partner Job
          </span>
        </div>
        <p
          className="text-[#5a6172] text-[13px] leading-[normal]"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          {`Attempt ${r.attemptNo ?? 1} · ${completedLabel(r.interviewCompletedAt)} · ${r.durationMinutes ?? 20} minutes · English`}
        </p>
      </div>

      {/* Result Summary Card */}
      <div
        className="bg-white border border-[#e1e4ea] rounded-2xl p-7 flex flex-col gap-5"
        style={{ boxShadow: "0px 4px 8px rgba(0,0,0,0.03)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-bold border bg-[rgba(52,199,89,0.1)] border-[rgba(52,199,89,0.2)] text-[#34c759]"
            style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
          >
            Qualified
          </span>
          <p
            className="text-[#1e232f] text-[18px] font-bold leading-[normal]"
            style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
          >
            You've qualified to contact the recruiter.
          </p>
        </div>
        <p
          className="text-[#5a6172] text-[14px] leading-[22px]"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          Your score meets the qualifying criteria for this role. You can now prepare an email to the recruiter.
        </p>
        <Divider />
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(`/opportunities/job/${encodeURIComponent(r.jobId)}/contact`)}
            className="inline-flex items-center gap-2.5 bg-[#3c77f6] text-white text-[14px] font-semibold leading-[normal] px-6 py-3 rounded-xl hover:bg-[#2d6ae0] transition-colors w-fit"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif", boxShadow: "0px 4px 4px rgba(60,119,246,0.14)" }}
          >
            Contact recruiter
            <img src={imgArrowRight} alt="" className="w-3.5 h-3.5 shrink-0" />
          </button>
          <p
            className="text-[#5a6172] text-[12px] leading-[normal]"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Prepare an email draft to send from your own email account. Contacting the recruiter is optional for this partner role.
          </p>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="flex gap-6 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Score tiles */}
          <div className="flex gap-4">
            {[
              { label: "THIS ATTEMPT", value: score, valueColor: "text-[#34c759]", sub: "Score meets criteria" },
              { label: "BEST SCORE", value: best, valueColor: "text-[#1e232f]", sub: "Used in your shared report" },
              { label: rank.label, value: rank.value, valueColor: "text-[#1e232f]", sub: rank.sub },
            ].map(({ label, value, valueColor, sub }) => (
              <div key={label} className="bg-white border border-[#e1e4ea] rounded-2xl p-5 flex-1 flex flex-col gap-2">
                <p
                  className="text-[#5a6172] text-[13px] font-semibold tracking-[0.5px] uppercase"
                  style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                >
                  {label}
                </p>
                <p
                  className={`text-[36px] font-bold leading-none ${valueColor}`}
                  style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                >
                  {value}
                </p>
                <p
                  className="text-[#5a6172] text-[12px] leading-[normal]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  {sub}
                </p>
              </div>
            ))}
          </div>
          <p
            className="text-[rgba(90,97,114,0.8)] text-[12px] leading-[normal]"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Rank may change as more candidates complete assessments.
          </p>

          {/* Performance breakdown */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <p
                className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                Performance breakdown
              </p>
              <p
                className="text-[#5a6172] text-[14px] leading-[normal]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                {r.summary || "Feedback from this assessment"}
              </p>
            </div>
            <div className="flex flex-col gap-5">
              {criteriaRows.map(({ label, score, feedback }) => (
                <div key={label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p
                      className="text-[#1e232f] text-[14px] font-semibold leading-[normal]"
                      style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                    >
                      {label}
                    </p>
                    <p
                      className="text-[#1e232f] text-[14px] font-semibold leading-[normal]"
                      style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                    >
                      {score}/100
                    </p>
                  </div>
                  <ScoreBar score={score} />
                  <p
                    className="text-[#5a6172] text-[13px] leading-[18px]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {feedback}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Question-by-question feedback */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <p
                className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                Question-by-question feedback
              </p>
              <p
                className="text-[#5a6172] text-[14px] leading-[normal]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                {r.questions?.length
                  ? `${r.questions.length} questions · Review your answers`
                  : "5 questions · Review your answers and recordings"}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {questionRows.map((q) => {
                const isOpen = expandedQ === q.id;
                return (
                  <div
                    key={q.id}
                    className={`border rounded-xl ${isOpen ? "bg-[#f9fafb] border-[#3c77f6] border-[1.5px] p-5" : "border-[#e1e4ea] p-4"} flex flex-col gap-4`}
                  >
                    <button
                      className="flex items-center justify-between w-full text-left"
                      onClick={() => setExpandedQ(isOpen ? null : q.id)}
                    >
                      <div className="flex gap-3 items-center flex-1 min-w-0">
                        <span
                          className={`text-[14px] font-bold leading-[normal] shrink-0 ${isOpen ? "text-[#3c77f6]" : "text-[#5a6172]"}`}
                          style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                        >
                          {q.id}
                        </span>
                        <p
                          className="text-[#1e232f] text-[14px] font-semibold leading-[normal] flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                          style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                        >
                          {q.text}
                        </p>
                      </div>
                      <img src={isOpen ? imgChevronUp : imgChevronDown} alt="" className="w-4 h-4 shrink-0 ml-3" />
                    </button>

                    {/* Collapsed: the one-line summary (Pro). */}
                    {!isOpen && q.summary && (
                      <p className="text-[#5a6172] text-[13px] leading-[normal]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                        {q.summary}
                      </p>
                    )}

                    {/* Expanded. Free: question text only. Pro: summary, What to
                        improve (gapAnalysis), and the answer. No "What went
                        well", tags or audio in the data: never shown. */}
                    {isOpen && !q.summary && !q.toImprove && !q.transcript && (
                      <p className="text-[#5a6172] text-[13px] leading-5" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                        Question-by-question feedback is available on Pro.
                      </p>
                    )}

                    {isOpen && (q.summary || q.toImprove || q.transcript) && (
                      <div className="flex flex-col gap-4">
                        {q.summary && (
                          <p className="text-[#5a6172] text-[13px] leading-5" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                            {q.summary}
                          </p>
                        )}
                        {q.toImprove && (
                          <div className="flex flex-col gap-1">
                            <p
                              className="text-[#ff383c] text-[12px] font-bold tracking-[0.5px] uppercase leading-[normal]"
                              style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                            >
                              What to improve
                            </p>
                            <p className="text-[#5a6172] text-[13px] leading-5" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                              {q.toImprove}
                            </p>
                          </div>
                        )}
                        {q.transcript && (
                          <details>
                            <summary
                              className="text-[#3c77f6] text-[13px] font-semibold leading-[normal] cursor-pointer list-none"
                              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                            >
                              View full transcript
                            </summary>
                            <p className="mt-2 text-[#5a6172] text-[13px] leading-5 whitespace-pre-wrap" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                              {q.transcript}
                            </p>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Areas */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <p
              className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              What to focus on next
            </p>
            <div className="flex gap-6">
              <div className="flex-1 flex flex-col gap-3">
                <p
                  className="text-[#34c759] text-[14px] font-bold tracking-[0.5px] uppercase leading-[normal]"
                  style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                >
                  Your strengths
                </p>
                <div className="flex flex-col gap-2.5">
                  {strengths.map((s) => (
                    <div key={s} className="flex gap-2 items-start">
                      <span className="text-[#34c759] text-[14px] shrink-0">•</span>
                      <p
                        className="text-[#5a6172] text-[14px] leading-5"
                        style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                      >
                        {s}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <p
                  className="text-[#ff383c] text-[14px] font-bold tracking-[0.5px] uppercase leading-[normal]"
                  style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                >
                  Areas to strengthen
                </p>
                <div className="flex flex-col gap-2.5">
                  {areas.map((s) => (
                    <div key={s} className="flex gap-2 items-start">
                      <span className="text-[#ff383c] text-[14px] shrink-0">•</span>
                      <p
                        className="text-[#5a6172] text-[14px] leading-5"
                        style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                      >
                        {s}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Divider />
            <p
              className="text-[#3c77f6] text-[14px] font-semibold leading-[normal]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Explore practice sessions →
            </p>
          </div>

          {/* Bottom actions */}
          <div className="flex flex-col gap-4 pt-4">
            <Divider />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {["Download PDF", "My Interviews", "Back to Opportunities"].map((label) => (
                  <button
                    key={label}
                    onClick={label === "Back to Opportunities" ? () => navigate("/opportunities") : undefined}
                    className="text-[#3c77f6] text-[14px] font-semibold leading-[normal] hover:underline"
                    style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p
                className="text-[rgba(90,97,114,0.8)] text-[11px] leading-[normal]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Your shared report uses your highest-scoring attempt. Downloaded PDFs reflect the report at the time of download.
              </p>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6 w-[380px] shrink-0">
          {/* Your application */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p
              className="text-[#1e232f] text-[16px] font-bold leading-[normal]"
              style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
            >
              Your application
            </p>
            <div className="flex flex-col gap-3">
              {[
                { label: "Job type", value: "Partner Job", valueColor: "text-[#1e232f]" },
                { label: "Application status", value: statusRow?.text ?? "Applied", valueColor: statusRow?.color ?? "text-[#34c759]" },
                { label: "Contact eligibility", value: "Unlocked", valueColor: "text-[#3c77f6]" },
                { label: "Email status", value: "Not sent", valueColor: "text-[#5a6172]" },
                // reportUnlockedAt: the employer unlocked (viewed) the report.
                {
                  label: "Report",
                  value: r.reportUnlockedAt ? `Viewed on ${viewedLabel(r.reportUnlockedAt)}` : "Not viewed yet",
                  valueColor: r.reportUnlockedAt ? "text-[#3c77f6]" : "text-[#5a6172]",
                },
              ].map(({ label, value, valueColor }) => (
                <div key={label} className="flex items-center justify-between">
                  <p
                    className="text-[#5a6172] text-[14px] leading-[normal]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {label}
                  </p>
                  <p
                    className={`text-[14px] font-semibold leading-[normal] ${valueColor}`}
                    style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <Divider />
            <p
              className="text-[#5a6172] text-[12px] leading-[18px]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              The employer can unlock your candidate information and report. "Applied" does not mean the employer has viewed your materials.
            </p>
            <p
              className="text-[#3c77f6] text-[14px] font-semibold leading-[normal]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Go to My Jobs →
            </p>
            <Divider />
            <p
              className="text-[rgba(90,97,114,0.8)] text-[11px] leading-[normal]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              The employer decides whether to move forward.
            </p>
          </div>

          {/* Want another attempt */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p
              className="text-[#1e232f] text-[16px] font-bold leading-[normal]"
              style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
            >
              Want another attempt?
            </p>
            <p
              className="text-[#5a6172] text-[13px] leading-[18px]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              You can start additional attempts within 6 hours of submitting your first assessment, while this role remains open.
            </p>
            <div className="bg-[#f9fafb] rounded-lg p-3 flex flex-col gap-2.5">
              {[
                { label: "First submitted", value: shortDateTime(app?.firstInterviewCompletedAt ?? r.interviewCompletedAt) },
                { label: "Retake deadline", value: app?.retakeDeadline ? shortDateTime(app.retakeDeadline) : "No time limit" },
                { label: "Time left to start", value: canRetake ? timeLeft || (app?.retakeDeadline ? "—" : "No time limit") : "Closed", highlight: true },
                { label: "Cost per attempt", value: "1 interview" },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between">
                  <p
                    className="text-[#5a6172] text-[12px] leading-[normal]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {label}
                  </p>
                  <p
                    className={`text-[12px] font-semibold leading-[normal] ${highlight ? "text-[#3c77f6] font-bold" : "text-[#1e232f]"}`}
                    style={{ fontFamily: highlight ? "'Inter:Bold', Inter, sans-serif" : "'Inter:Semi_Bold', Inter, sans-serif" }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => app && canRetake && starter.openDialog(app)}
              disabled={!canRetake}
              className="bg-white border-[1.5px] border-[#3c77f6] text-[#3c77f6] text-[14px] font-semibold leading-[normal] px-4 py-3 rounded-xl flex items-center justify-center hover:bg-[#eef4ff] transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Retake to improve your score
            </button>
            <div className="flex flex-col gap-2">
              {[
                "Each retake uses 1 interview from your plan.",
                "Additional attempts do not extend the original deadline.",
                "Only a higher score updates your shared report.",
                "Equal or lower scores leave your shared report unchanged.",
                "Once you qualify, recruiter contact access is retained.",
              ].map((item) => (
                <div key={item} className="flex gap-2 items-start">
                  <span className="text-[#5a6172] text-[12px] shrink-0">•</span>
                  <p
                    className="text-[#5a6172] text-[12px] leading-[18px]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {starter.ui}
    </div>
  );
}
