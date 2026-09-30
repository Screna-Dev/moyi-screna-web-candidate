import { useNavigate } from "react-router";

const A = "/images/opportunities";
const imgMapPin    = `${A}/0e220.svg`;
const imgBriefcase = `${A}/c4789.svg`;
const imgDollar    = `${A}/7704b.svg`;
const imgEmail     = `${A}/2c691.svg`;
const imgInfo      = `${A}/2f058.svg`;
const imgClock     = `${A}/b10d2.svg`;
const imgMic       = `${A}/6f308.svg`;
const imgGlobe     = `${A}/4d480.svg`;
const imgAward     = `${A}/79238.svg`;
const imgCalendar  = `${A}/5cd1a.svg`;
const imgArrow     = `${A}/87f08.svg`;
const imgLine1     = `${A}/b5974.svg`;
const imgLine2     = `${A}/07fe8.svg`;
const imgLine3     = `${A}/8c64c.svg`;
const imgLine4     = `${A}/f5809.svg`;

function HRule({ src }: { src: string }) {
  return (
    <div className="relative shrink-0 w-full" style={{ height: 1 }}>
      <img alt="" className="block w-full" src={src} style={{ height: 1 }} />
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start">
      <p className="shrink-0 text-[#5a6172] text-[14px] leading-[22px]">•</p>
      <p className="flex-1 text-[#5a6172] text-[14px] leading-[22px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
        {children}
      </p>
    </div>
  );
}

export function BackendEngineerDetailPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Back link */}
      <button
        onClick={() => navigate("/opportunities")}
        className="text-[#3c77f6] text-[14px] text-left w-fit"
        style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
      >
        ← Back to Opportunities
      </button>

      {/* Job Header Card */}
      <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-5">
        {/* Title + Badge */}
        <div className="flex items-center gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <h1
              className="text-[#1e232f] text-[24px] font-semibold leading-8"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Backend Engineer
            </h1>
            <p className="text-[#5a6172] text-[16px]" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>
              TechCorp
            </p>
          </div>
          {/* Partner Job badge — blue per user request */}
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[12px] border bg-[rgba(60,119,246,0.08)] border-[rgba(60,119,246,0.15)] text-[#3c77f6]"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
          >
            Partner Job
          </span>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-5">
          <div className="flex items-center gap-1.5">
            <img src={imgMapPin} alt="" className="w-4 h-4 shrink-0" />
            <span className="text-[#5a6172] text-[14px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
              San Francisco, CA · Remote · Full-time
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src={imgBriefcase} alt="" className="w-4 h-4 shrink-0" />
            <span className="text-[#5a6172] text-[14px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
              Entry level · 0–2 years
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src={imgDollar} alt="" className="w-4 h-4 shrink-0" />
            <span className="text-[#1e232f] text-[14px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
              $150,000 – $200,000
            </span>
          </div>
        </div>

        {/* Skill tags */}
        <div className="flex flex-wrap gap-2">
          {["Python", "Distributed Systems", "AWS"].map((tag) => (
            <span
              key={tag}
              className="bg-[#f3f4f7] border border-[#e1e4ea] text-[#1e232f] text-[12px] px-3 py-1 rounded-full"
              style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Email row */}
        <div className="flex items-center gap-2">
          <img src={imgEmail} alt="" className="w-6 h-6 shrink-0" />
          <span className="text-[#4d4d4d] text-[13px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
            xxxxrena.gmail.com
          </span>
        </div>

        <HRule src={imgLine1} />

        {/* Info banner */}
        <div className="flex items-start gap-2.5">
          <img src={imgInfo} alt="" className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-[#5a6172] text-[14px] leading-5" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
            Complete the AI assessment to apply.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-5">
        <p className="text-[#1e232f] text-[16px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
          How the application process works
        </p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { step: "STEP 1", title: "Complete your assessment", desc: "Take a role-specific AI assessment based on the job requirements." },
            { step: "STEP 2", title: "Application recorded automatically", desc: "Complete the assessment to apply automatically." },
            { step: "STEP 3", title: "View your report", desc: "See your score, feedback, and areas to improve." },
            { step: "STEP 4", title: "Track your application", desc: "View your application and contact status in My Interviews. The employer decides the next steps." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-[#f9fafb] rounded-xl p-3 flex flex-col gap-2">
              <p className="text-[#5a6172] text-[11px] font-bold tracking-[0.5px] uppercase" style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}>
                {step}
              </p>
              <p className="text-[#1e232f] text-[14px] font-semibold leading-[18px]" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
                {title}
              </p>
              <p className="text-[#5a6172] text-[12px] leading-[18px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column grid */}
      <div className="flex gap-6 items-start">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Job Description */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-[#1e232f] text-[18px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>About the role</p>
              <div className="text-[#5a6172] text-[14px] leading-[22px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                <p>Lumen Metrics builds usage-based billing tools for SaaS companies. You'll join our backend team to develop services that process usage events, calculate charges, and keep billing data accurate.</p>
                <p className="mt-3">This role is suited to an early-career engineer who enjoys working with data, investigating problems, and building reliable systems.</p>
              </div>
            </div>

            <HRule src={imgLine2} />

            <div className="flex flex-col gap-3">
              <p className="text-[#1e232f] text-[18px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>What you'll do</p>
              <div className="flex flex-col gap-2">
                <Bullet>Build and maintain backend services for usage tracking and billing.</Bullet>
                <Bullet>Design APIs and work with relational databases.</Bullet>
                <Bullet>Help improve data accuracy, reliability, and system performance.</Bullet>
                <Bullet>Investigate production issues and contribute to practical solutions.</Bullet>
                <Bullet>Work with product and engineering teammates to turn requirements into clear technical tasks.</Bullet>
              </div>
            </div>

            <HRule src={imgLine2} />

            <div className="flex flex-col gap-3">
              <p className="text-[#1e232f] text-[18px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>What we're looking for</p>
              <div className="flex flex-col gap-2">
                <Bullet>Strong fundamentals in Go or another strongly typed programming language.</Bullet>
                <Bullet>Practical experience with SQL and relational databases through work, internships, or projects.</Bullet>
                <Bullet>Understanding of transactions, indexes, and API design.</Bullet>
                <Bullet>Ability to break down an ambiguous problem and explain technical trade-offs.</Bullet>
                <Bullet>Ability to communicate clearly in English during technical discussions.</Bullet>
              </div>
            </div>

            <HRule src={imgLine2} />

            <div className="flex flex-col gap-3">
              <p className="text-[#1e232f] text-[18px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>Nice to have</p>
              <div className="flex flex-col gap-2">
                <Bullet>Experience with Kafka or similar messaging systems.</Bullet>
                <Bullet>Familiarity with idempotency and distributed systems.</Bullet>
                <Bullet>Experience building or maintaining a data-processing pipeline.</Bullet>
              </div>
            </div>
          </div>

          {/* Assessment Info */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-[#1e232f] text-[18px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>About the AI assessment</p>
              <p className="text-[#5a6172] text-[14px] leading-[22px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                This assessment is tailored to the role and based on the employer's job requirements. You'll answer technical and experience-based questions, with follow-up questions where relevant.
              </p>
            </div>

            {/* Stats row */}
            <div className="bg-[#f9fafb] rounded-lg p-3 flex gap-6">
              {[
                { icon: imgClock, label: "30 minutes" },
                { icon: imgMic,   label: "Voice interview" },
                { icon: imgGlobe, label: "English" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <img src={icon} alt="" className="w-4 h-4 shrink-0" />
                  <span className="text-[#5a6172] text-[13px] font-medium" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>{label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[#1e232f] text-[15px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>Assessment areas</p>
              <div className="flex flex-col gap-3">
                {[
                  ["Backend fundamentals", " — APIs, databases, transactions, and indexes."],
                  ["System design", " — Reliable data processing and technical trade-offs."],
                  ["Problem solving", " — Clarifying requirements and explaining your approach."],
                  ["Project experience", " — Your contribution, decisions, and results."],
                ].map(([bold, rest]) => (
                  <div key={bold} className="flex gap-2 items-start">
                    <p className="shrink-0 text-[#5a6172] text-[14px]">•</p>
                    <p className="flex-1 text-[#5a6172] text-[14px] leading-5" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                      <span className="text-[#1e232f] font-bold" style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}>{bold}</span>
                      {rest}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <HRule src={imgLine2} />

            <div className="flex flex-col gap-3">
              <p className="text-[#1e232f] text-[15px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>What the employer will also assess</p>
              <div className="flex flex-col gap-2">
                <Bullet>Practical experience with distributed systems.</Bullet>
                <Bullet>Understanding of transaction isolation.</Bullet>
                <Bullet>Evidence of independently owning a module or project.</Bullet>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6 w-[380px] shrink-0">
          {/* Primary action card */}
          <div
            className="bg-white border-2 border-[#3c77f6] rounded-2xl p-7 flex flex-col gap-6"
            style={{ boxShadow: "0px 8px 12px rgba(60,119,246,0.08)" }}
          >
            <div className="flex flex-col gap-2">
              <p className="text-[#1e232f] text-[18px] font-bold" style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}>
                Apply with an AI assessment
              </p>
              <p className="text-[#5a6172] text-[13px] leading-[18px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                Complete the assessment to apply to this partner role.
              </p>
            </div>

            <HRule src={imgLine3} />

            <div className="flex flex-col gap-4">
              {[
                { icon: imgClock,    label: "DURATION",            value: "30 minutes" },
                { icon: imgMic,      label: "FORMAT",              value: "Voice · English" },
                { icon: imgAward,    label: "FIRST ASSESSMENT",    value: "Sponsored by employer" },
                { icon: imgCalendar, label: "APPLICATION DEADLINE", value: "Sep 30, 2026 · 11:59 PM PT" },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <img src={icon} alt="" className="w-4 h-4 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[#5a6172] text-[11px] font-semibold tracking-[0.5px] uppercase leading-none" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
                      {label}
                    </p>
                    <p className="text-[#1e232f] text-[13px] font-medium leading-none" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/opportunities/job/1/results")}
              className="w-full bg-[#3c77f6] hover:bg-[#2d6ae0] text-white text-[14px] font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-colors"
              style={{
                fontFamily: "'Inter:Semi_Bold', Inter, sans-serif",
                boxShadow: "0px 4px 3px rgba(60,119,246,0.2)",
              }}
            >
              Start AI interview
              <img src={imgArrow} alt="" className="w-4 h-4 shrink-0" />
            </button>

            <p className="text-[#5a6172] text-[11px] leading-4 text-center" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
              Review the assessment details and check your microphone before you begin.
            </p>
          </div>

          {/* Want another attempt */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p className="text-[#1e232f] text-[15px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
              Want another attempt?
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                "You can start additional attempts within 6 hours of submitting your first assessment, while the role remains open.",
                "Each retake costs 30 credits. Your highest score is used, and retakes do not extend the 6-hour window.",
                "Once you qualify, your recruiter contact access is retained.",
              ].map((text, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <p className="shrink-0 text-[#5a6172] text-[12px]">•</p>
                  <p className="flex-1 text-[#5a6172] text-[12px] leading-[18px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* What happens */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p className="text-[#1e232f] text-[15px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
              What happens when you finish?
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                "Your application is recorded automatically. The employer can unlock your profile, resume, and assessment report, including your responses and recordings.",
                "If you qualify, you can also choose to contact the recruiter using a prepared email draft.",
              ].map((text, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <p className="shrink-0 text-[#5a6172] text-[12px]">•</p>
                  <p className="flex-1 text-[#5a6172] text-[12px] leading-[18px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
            <HRule src={imgLine4} />
            <p className="text-[rgba(90,97,114,0.8)] text-[11px] leading-4" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
              Completing the assessment does not guarantee an interview invitation or a response.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
