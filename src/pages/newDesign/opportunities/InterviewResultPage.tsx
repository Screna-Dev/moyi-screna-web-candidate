import { useState } from "react";
import { useNavigate, useParams } from "react-router";

const assetPathPrefix = "/images/opportunities";
const imgArrowRight = `${assetPathPrefix}/c68c4.svg`;
const imgChevronDown = `${assetPathPrefix}/e057d.svg`;
const imgChevronUp = `${assetPathPrefix}/05bbc.svg`;
const imgPlay = `${assetPathPrefix}/48bcb.svg`;

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

export function InterviewResultPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [expandedQ, setExpandedQ] = useState<string | null>("Q2");

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
            Backend Engineer · Lumen Metrics
          </p>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold border bg-[rgba(60,119,246,0.1)] border-[rgba(60,119,246,0.2)] text-[#3c77f6]"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
          >
            Screna Sponsored
          </span>
        </div>
        <p
          className="text-[#5a6172] text-[13px] leading-[normal]"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          Attempt 1 · Sep 16, 2026, 10:00 AM PT · 30 minutes · English
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
            onClick={() => navigate(`/opportunities/job/${id}/contact`)}
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
              { label: "THIS ATTEMPT", value: "84/100", valueColor: "text-[#34c759]", sub: "Score meets criteria" },
              { label: "BEST SCORE", value: "84/100", valueColor: "text-[#1e232f]", sub: "Used in your shared report" },
              { label: "CURRENT RANK", value: "#2 of 31", valueColor: "text-[#1e232f]", sub: "Candidates with completed assessments" },
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
                Feedback from this assessment
              </p>
            </div>
            <div className="flex flex-col gap-5">
              {[
                { label: "Technical accuracy", score: 88, feedback: "Strong understanding of idempotency, database behavior, and backend reliability." },
                { label: "Structured thinking", score: 80, feedback: "Your approach was clear, but some answers would benefit from stating assumptions earlier." },
                { label: "Communication", score: 82, feedback: "You explained trade-offs clearly and responded constructively to follow-up questions." },
                { label: "Completeness", score: 86, feedback: "Most answers covered the key considerations. Add measurable outcomes when discussing past projects." },
              ].map(({ label, score, feedback }) => (
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
                5 questions · Review your answers and recordings
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {questions.map((q) => {
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

                    {!isOpen && q.summary && (
                      <p
                        className="text-[#5a6172] text-[13px] leading-[normal]"
                        style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                      >
                        {q.summary}
                      </p>
                    )}

                    {isOpen && q.wentWell && (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                          <p
                            className="text-[#34c759] text-[12px] font-bold tracking-[0.5px] uppercase leading-[normal]"
                            style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                          >
                            What went well
                          </p>
                          <p
                            className="text-[#5a6172] text-[13px] leading-5"
                            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                          >
                            {q.wentWell}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p
                            className="text-[#ff383c] text-[12px] font-bold tracking-[0.5px] uppercase leading-[normal]"
                            style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                          >
                            What to improve
                          </p>
                          <p
                            className="text-[#5a6172] text-[13px] leading-5"
                            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                          >
                            {q.toImprove}
                          </p>
                        </div>
                        {q.tags && (
                          <div className="flex flex-wrap gap-1.5">
                            {q.tags.map(({ label, color }) => (
                              <span
                                key={label}
                                className={`inline-flex items-center px-3 py-1 rounded text-[11px] font-semibold border ${
                                  color === "blue"
                                    ? "bg-[#eef4ff] border-[rgba(60,119,246,0.2)] text-[#3c77f6]"
                                    : "bg-[#fff0f0] border-[rgba(255,56,60,0.2)] text-[#ff383c]"
                                }`}
                                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                        <p
                          className="text-[#3c77f6] text-[13px] font-semibold leading-[normal]"
                          style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                        >
                          View full transcript
                        </p>
                        {/* Audio player */}
                        <div className="bg-white border border-[#e1e4ea] rounded-lg p-3 flex gap-3 items-center">
                          <img src={imgPlay} alt="" className="w-4 h-4 shrink-0" />
                          <div className="flex-1 min-w-0 h-1 bg-[#e5e5e5] rounded overflow-hidden">
                            <div className="h-full bg-[#3c77f6] rounded" style={{ width: "5%" }} />
                          </div>
                          <span
                            className="text-[#5a6172] text-[11px] leading-[normal] shrink-0"
                            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                          >
                            0:00 / 6:12
                          </span>
                        </div>
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
                  {["Backend reliability and data correctness", "Identifying technical trade-offs", "Responding to follow-up questions"].map((s) => (
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
                  {[
                    "State assumptions before presenting a solution.",
                    "Explain monitoring and recovery, not just the initial design.",
                    "Describe your individual contribution and measurable project outcomes.",
                  ].map((s) => (
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
                { label: "Application status", value: "Applied", valueColor: "text-[#34c759]" },
                { label: "Contact eligibility", value: "Unlocked", valueColor: "text-[#3c77f6]" },
                { label: "Email status", value: "Not sent", valueColor: "text-[#5a6172]" },
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
                { label: "First submitted", value: "Sep 16, 2026 · 10:00 AM" },
                { label: "Retake deadline", value: "Today · 4:00 PM PT" },
                { label: "Time left to start", value: "5h 42m", highlight: true },
                { label: "Cost per attempt", value: "30 credits" },
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
              className="bg-white border-[1.5px] border-[#3c77f6] text-[#3c77f6] text-[14px] font-semibold leading-[normal] px-4 py-3 rounded-xl flex items-center justify-center hover:bg-[#eef4ff] transition-colors w-full"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Retake to improve your score
            </button>
            <div className="flex flex-col gap-2">
              {[
                "Each retake costs credits.",
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
    </div>
  );
}
