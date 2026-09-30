import { useState } from "react";
import { useNavigate } from "react-router";

const imgArrowRight = "/images/opportunities/c68c4.svg";
const imgChevronDown = "/images/opportunities/e057d.svg";
const imgChevronUp = "/images/opportunities/05bbc.svg";
const imgPlay = "/images/opportunities/48bcb.svg";
const imgLine1 = "/images/opportunities/9d4c5.svg";
const imgLine2 = "/images/opportunities/07fe8.svg";
const imgLine3 = "/images/opportunities/f5809.svg";
const imgLine4 = "/images/opportunities/317ed.svg";

function Line({ src }: { src: string }) {
  return (
    <div className="h-0 relative shrink-0 w-full">
      <div className="absolute inset-[-1px_0_0_0]">
        <img alt="" className="block max-w-none size-full" src={src} />
      </div>
    </div>
  );
}

const BREAKDOWN = [
  { label: "Technical accuracy", score: "58/100", pct: 58, color: "#f5a623", note: "Review transaction isolation and explain how your design prevents duplicate processing." },
  { label: "Structured thinking", score: "64/100", pct: 64, color: "#f5a623", note: "Clarify the requirements before choosing a technical solution." },
  { label: "Communication", score: "79/100", pct: 79, color: "#3c77f6", note: "Your explanations were clear and easy to follow." },
  { label: "Completeness", score: "67/100", pct: 67, color: "#f5a623", note: "Include failure handling, validation, and measurable outcomes." },
];

const QUESTIONS = [
  {
    q: "Q1",
    text: "Tell us about a backend project you contributed to.",
    summary: "You explained the project context clearly, but your individual contribution and results need more detail.",
    expanded: false,
  },
  {
    q: "Q2",
    text: "How would you design a pipeline that processes 50,000 billing events per second without losing or double-counting events?",
    summary: null,
    expanded: true,
    wentWell: "You proposed a queue-based pipeline and explained how partitioning could increase throughput.",
    improve: "Clarify the delivery guarantees first. Explain how event IDs, idempotent writes, retries, and reconciliation prevent lost or duplicate billing events.",
    tags: [
      { label: "Clear explanation", color: "#3c77f6", bg: "#eef4ff", border: "rgba(60,119,246,0.2)" },
      { label: "Clarify requirements", color: "#3c77f6", bg: "#eef4ff", border: "rgba(60,119,246,0.2)" },
      { label: "Explain duplicate handling", color: "#f5a623", bg: "rgba(245,166,35,0.1)", border: "rgba(245,166,35,0.2)" },
    ],
  },
  { q: "Q3", text: "How would you choose transaction isolation levels for a billing system?", summary: "Review the differences between repeatable read and serializable isolation, then explain your choice using a concrete billing scenario.", expanded: false },
  { q: "Q4", text: "Describe a time a teammate challenged your technical proposal.", summary: "You explained the disagreement clearly. Add your individual responsibility and the outcome of the final decision.", expanded: false },
  { q: "Q5", text: "How would you investigate a mismatch between usage records and a customer's bill?", summary: "Start by narrowing down the discrepancy, then explain how you would validate both the cause and the fix.", expanded: false },
];

export function NotQualifiedResultPage() {
  const navigate = useNavigate();
  const [expandedQ, setExpandedQ] = useState<string | null>("Q2");

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Back */}
      <button
        onClick={() => navigate("/opportunities")}
        className="text-[#3c77f6] text-[14px] leading-5 text-left w-fit hover:underline"
        style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
      >
        ← Back to Opportunities
      </button>

      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h1
            className="text-[#1e232f] text-[32px] font-bold leading-[40px]"
            style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
          >
            Assessment results
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[#5a6172] text-[16px]"
              style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
            >
              Backend Engineer · Lumen Metrics
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold border"
              style={{
                background: "rgba(60,119,246,0.1)",
                borderColor: "rgba(60,119,246,0.2)",
                color: "#3c77f6",
                fontFamily: "'Inter:Semi_Bold', Inter, sans-serif",
              }}
            >
              Public Job
            </span>
          </div>
          <p
            className="text-[#5a6172] text-[13px]"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Attempt 1 · Sep 16, 2026, 10:00 AM PT · 30 minutes · English
          </p>
        </div>
      </div>

      {/* Result Summary Card */}
      <div className="bg-white border border-[#e1e4ea] rounded-2xl p-7 flex flex-col gap-5 drop-shadow-[0px_4px_8px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-bold border"
            style={{
              background: "rgba(245,166,35,0.1)",
              borderColor: "rgba(245,166,35,0.2)",
              color: "#f5a623",
              fontFamily: "'Inter:Bold', Inter, sans-serif",
            }}
          >
            Not yet qualified
          </span>
          <p
            className="text-[#1e232f] text-[18px] font-bold"
            style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
          >
            Your score hasn't met this role's qualifying criteria yet.
          </p>
        </div>
        <p
          className="text-[#5a6172] text-[14px] leading-[22px]"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          Your score does not yet meet the qualifying criteria for direct recruiter contact.
        </p>
        <Line src={imgLine1} />
        <div className="flex flex-col gap-3">
          <div className="flex items-start">
            <button
              className="flex items-center gap-2.5 bg-[#3c77f6] text-white text-[14px] font-semibold px-6 py-3 rounded-xl hover:bg-[#2d6ae0] transition-colors"
              style={{
                fontFamily: "'Inter:Semi_Bold', Inter, sans-serif",
                boxShadow: "0px 4px 4px rgba(60,119,246,0.14)",
              }}
            >
              Retake assessment
              <img src={imgArrowRight} alt="" style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <p
            className="text-[#3c77f6] text-[14px]"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Explore practice sessions →
          </p>
          <p
            className="text-[#5a6172] text-[13px]"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            30 credits per attempt · 5h 42m left to start
          </p>
          <p
            className="text-[11px]"
            style={{ color: "rgba(90,97,114,0.8)", fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Review your feedback before trying again. Retakes do not extend your original 6-hour window.
          </p>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="flex gap-6 items-start">
        {/* Left Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Score Overview */}
          <div className="flex gap-4">
            {[
              { label: "This attempt", score: "67/100", scoreColor: "#f5a623", sub: "Below contact qualification criteria" },
              { label: "Best score", score: "67/100", scoreColor: "#1e232f", sub: "Used in your shared report" },
              { label: "Current rank", score: "#18 of 31", scoreColor: "#1e232f", sub: "Candidates with completed assessments for this role" },
            ].map(({ label, score, scoreColor, sub }) => (
              <div key={label} className="bg-white border border-[#e1e4ea] rounded-2xl p-5 flex flex-col gap-2 flex-1 min-w-0">
                <p
                  className="text-[#5a6172] text-[13px] uppercase tracking-[0.5px]"
                  style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                >
                  {label}
                </p>
                <p
                  className="text-[36px] font-bold"
                  style={{ color: scoreColor, fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                >
                  {score}
                </p>
                <p
                  className="text-[#5a6172] text-[12px]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  {sub}
                </p>
              </div>
            ))}
          </div>
          <p
            className="text-[12px]"
            style={{ color: "rgba(90,97,114,0.8)", fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Rank may change as more candidates complete assessments.
          </p>

          {/* Performance Breakdown */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <p
                className="text-[#1e232f] text-[18px]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                Performance breakdown
              </p>
              <p
                className="text-[#5a6172] text-[14px]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Feedback from this assessment
              </p>
            </div>
            <div className="flex flex-col gap-5">
              {BREAKDOWN.map((item) => (
                <div key={item.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p
                      className="text-[#1e232f] text-[14px]"
                      style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="text-[#1e232f] text-[14px]"
                      style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                    >
                      {item.score}
                    </p>
                  </div>
                  <div className="bg-[#e1e4ea] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.pct}%`, background: item.color }}
                    />
                  </div>
                  <p
                    className="text-[#5a6172] text-[13px] leading-[18px]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {item.note}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Q&A Feedback */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <p
                className="text-[#1e232f] text-[18px]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                Question-by-question feedback
              </p>
              <p
                className="text-[#5a6172] text-[14px]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                5 questions · Review your answers and recordings
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {QUESTIONS.map((q) => {
                const isOpen = expandedQ === q.q;
                return (
                  <div
                    key={q.q}
                    className={`border rounded-xl flex flex-col gap-2 ${isOpen ? "bg-[#f9fafb] border-[#3c77f6] border-[1.5px] p-5" : "border-[#e1e4ea] p-4"}`}
                  >
                    <button
                      className="flex items-center justify-between w-full text-left"
                      onClick={() => setExpandedQ(isOpen ? null : q.q)}
                    >
                      <div className="flex gap-3 flex-1 min-w-0 items-start">
                        <p
                          className="text-[14px] font-bold shrink-0"
                          style={{ color: isOpen ? "#3c77f6" : "#5a6172", fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                        >
                          {q.q}
                        </p>
                        <p
                          className="text-[#1e232f] text-[14px] flex-1 min-w-0"
                          style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                        >
                          {q.text}
                        </p>
                      </div>
                      <img
                        src={isOpen ? imgChevronUp : imgChevronDown}
                        alt=""
                        style={{ width: 16, height: 16, flexShrink: 0 }}
                      />
                    </button>
                    {isOpen && q.wentWell ? (
                      <div className="flex flex-col gap-3.5 mt-2">
                        <div className="flex flex-col gap-1">
                          <p
                            className="text-[12px] font-bold uppercase tracking-[0.5px] text-[#34c759]"
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
                            className="text-[12px] font-bold uppercase tracking-[0.5px] text-[#ff383c]"
                            style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                          >
                            What to improve
                          </p>
                          <p
                            className="text-[#5a6172] text-[13px] leading-5"
                            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                          >
                            {q.improve}
                          </p>
                        </div>
                        {q.tags && (
                          <div className="flex flex-wrap gap-1.5">
                            {q.tags.map((tag) => (
                              <span
                                key={tag.label}
                                className="inline-flex items-center px-3 py-1 rounded text-[11px] font-semibold border"
                                style={{
                                  background: tag.bg,
                                  borderColor: tag.border,
                                  color: tag.color,
                                  fontFamily: "'Inter:Semi_Bold', Inter, sans-serif",
                                }}
                              >
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        )}
                        <p
                          className="text-[#3c77f6] text-[13px]"
                          style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                        >
                          View full transcript
                        </p>
                        {/* Audio player */}
                        <div className="bg-white border border-[#e1e4ea] rounded-lg p-3 flex items-center gap-3">
                          <img src={imgPlay} alt="" style={{ width: 16, height: 16, flexShrink: 0 }} />
                          <div className="bg-[#e5e5e5] flex-1 min-w-0 h-1 rounded-full overflow-hidden">
                            <div className="bg-[#3c77f6] h-full w-5" />
                          </div>
                          <p
                            className="text-[#5a6172] text-[11px] shrink-0"
                            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                          >
                            0:00 / 6:12
                          </p>
                        </div>
                      </div>
                    ) : !isOpen && (
                      <p
                        className="text-[#5a6172] text-[13px]"
                        style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                      >
                        {q.summary}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* What to improve */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <p
              className="text-[#1e232f] text-[18px]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              What to improve before your next attempt
            </p>
            <div className="flex flex-col gap-4 text-[14px]">
              {[
                { title: "Review database fundamentals", sub: "Focus on transaction isolation, indexes, and practical examples.", color: "#1e232f" },
                { title: "Structure your approach", sub: "Clarify the problem, explain your options, and justify your decision.", color: "#1e232f" },
                { title: "Clear communication", sub: "Keep explaining your reasoning as you work through the problem.", color: "#34c759" },
              ].map((item) => (
                <div key={item.title} className="flex flex-col gap-1">
                  <p
                    className="font-bold leading-5"
                    style={{ color: item.color, fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-[#5a6172] leading-5"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {item.sub}
                  </p>
                </div>
              ))}
            </div>
            <Line src={imgLine2} />
            <p
              className="text-[#3c77f6] text-[14px]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Explore practice sessions →
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6 w-[420px] shrink-0">
          {/* Your Application */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p
              className="text-[#1e232f] text-[16px] font-bold"
              style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
            >
              Your application
            </p>
            <div className="flex flex-col gap-3 text-[14px]">
              {[
                { label: "Job type", value: "Partner Job", valueColor: "#1e232f" },
                { label: "Application status", value: "Applied", valueColor: "#34c759" },
                { label: "Contact eligibility", value: "Not yet unlocked", valueColor: "#f5a623" },
              ].map(({ label, value, valueColor }) => (
                <div key={label} className="flex items-center justify-between">
                  <p
                    className="text-[#5a6172]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {label}
                  </p>
                  <p
                    className="font-semibold"
                    style={{ color: valueColor, fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <Line src={imgLine3} />
            <p
              className="text-[#5a6172] text-[12px] leading-[18px]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              The employer can unlock your profile, resume, and assessment report. Your assessment result does not represent an employer hiring decision.
            </p>
            <p
              className="text-[#3c77f6] text-[14px]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Go to My Jobs →
            </p>
          </div>

          {/* Ready to try again */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p
              className="text-[#1e232f] text-[16px] font-bold"
              style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
            >
              Ready to try again?
            </p>
            <p
              className="text-[#5a6172] text-[13px] leading-[18px]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              You can start additional attempts within 6 hours of submitting your first assessment, while this role remains open.
            </p>
            <div className="bg-[#f9fafb] rounded-lg p-3 flex flex-col gap-2.5 text-[12px]">
              {[
                { label: "First submitted", value: "Sep 16, 2026 · 10:00 AM PT", bold: false },
                { label: "Retake deadline", value: "Today · 4:00 PM PT", bold: false },
                { label: "Time left to start", value: "5h 42m", bold: true, valueColor: "#3c77f6" },
                { label: "Cost per attempt", value: "30 credits", bold: false },
              ].map(({ label, value, bold, valueColor }) => (
                <div key={label} className="flex items-center justify-between">
                  <p
                    className="text-[#5a6172]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {label}
                  </p>
                  <p
                    className={bold ? "font-bold" : "font-semibold"}
                    style={{
                      color: valueColor ?? "#1e232f",
                      fontFamily: bold ? "'Inter:Bold', Inter, sans-serif" : "'Inter:Semi_Bold', Inter, sans-serif",
                    }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <button
              className="w-full border-[1.5px] border-[#3c77f6] text-[#3c77f6] text-[14px] font-semibold py-3 rounded-xl flex items-center justify-center hover:bg-[#eef4ff] transition-colors"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Retake interview
            </button>
            <div className="flex flex-col gap-2 text-[12px] text-[#5a6172]">
              {[
                "Each retake costs credits.",
                "Additional attempts do not extend the original deadline.",
                "Only a higher score updates your shared report.",
                "Equal or lower scores leave your shared report unchanged.",
              ].map((bullet) => (
                <div key={bullet} className="flex gap-2 items-start">
                  <span className="shrink-0">•</span>
                  <p style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>{bullet}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-4 pt-4">
        <Line src={imgLine4} />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-6 items-center">
            {["Download PDF", "My Interviews", "Back to Opportunities"].map((link) => (
              <button
                key={link}
                className="text-[#3c77f6] text-[14px] hover:underline"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                onClick={link === "Back to Opportunities" ? () => navigate("/opportunities") : undefined}
              >
                {link}
              </button>
            ))}
          </div>
          <p
            className="text-[11px]"
            style={{ color: "rgba(90,97,114,0.8)", fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Your shared report uses your highest-scoring attempt. Downloaded PDFs reflect the report at the time of download.
          </p>
        </div>
      </div>
    </div>
  );
}
