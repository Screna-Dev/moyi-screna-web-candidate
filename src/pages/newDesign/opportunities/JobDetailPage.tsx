import { useNavigate, useParams } from "react-router";
import { useOpportunities } from "@/components/newDesign/opportunities/OpportunitiesContext";

const assetPathPrefix = "/images/opportunities";
const imgMapPin = `${assetPathPrefix}/0e220.svg`;
const imgBriefcase = `${assetPathPrefix}/c4789.svg`;
const imgDollarSign = `${assetPathPrefix}/7704b.svg`;
const imgEmailIcon = `${assetPathPrefix}/2c691.svg`;
const imgInfo = `${assetPathPrefix}/2f058.svg`;
const imgClock = `${assetPathPrefix}/b10d2.svg`;
const imgMic = `${assetPathPrefix}/6f308.svg`;
const imgGlobe = `${assetPathPrefix}/4d480.svg`;
const imgAward = `${assetPathPrefix}/79238.svg`;
const imgCalendar = `${assetPathPrefix}/5cd1a.svg`;
const imgArrowRight = `${assetPathPrefix}/87f08.svg`;
const imgLine3 = `${assetPathPrefix}/c8fd3.svg`;

function Divider() {
  return <div className="w-full h-px bg-[#e1e4ea]" />;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-[#5a6172] text-[14px] leading-[22px] shrink-0">•</span>
          <p
            className="text-[#5a6172] text-[14px] leading-[22px]"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}

export function JobDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const jobId = id ?? "5";
  const { interviewStatus, emailStatus, setInterviewCompleted } = useOpportunities();
  const isCompleted = interviewStatus[jobId] === "completed";
  const isEmailSent = emailStatus[jobId] === "sent";

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

      {/* Job Header Card */}
      <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-5">
        {/* Title + badge */}
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <p
              className="text-[#1e232f] text-[24px] font-semibold leading-8"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Software Engineer
            </p>
            <p
              className="text-[#5a6172] text-[16px] font-medium leading-[normal]"
              style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
            >
              Driftvale
            </p>
          </div>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold leading-5 border bg-[rgba(60,119,246,0.1)] border-[rgba(60,119,246,0.2)] text-[#3c77f6] shrink-0"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
          >
            Screna Sponsored
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-5">
          <div className="flex gap-1.5 items-center">
            <img src={imgMapPin} alt="" className="w-4 h-4 shrink-0" />
            <p
              className="text-[#5a6172] text-[14px] leading-[normal]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              Seattle, WA · Hybrid · Full-time
            </p>
          </div>
          <div className="flex gap-1.5 items-center">
            <img src={imgBriefcase} alt="" className="w-4 h-4 shrink-0" />
            <p
              className="text-[#5a6172] text-[14px] leading-[normal]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              Entry level · 0–2 years
            </p>
          </div>
          <div className="flex gap-1.5 items-center">
            <img src={imgDollarSign} alt="" className="w-4 h-4 shrink-0" />
            <p
              className="text-[#1e232f] text-[14px] font-semibold leading-[normal]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              $85,000 – $110,000 / year
            </p>
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-2">
          {["Python", "SQL", "Backend Development"].map((tag) => (
            <span
              key={tag}
              className="bg-[#f3f4f7] border border-[#e1e4ea] text-[#1e232f] text-[12px] font-medium leading-[normal] px-3 py-1 rounded-full"
              style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Email row */}
        <div className="flex items-center gap-2">
          <img src={imgEmailIcon} alt="" className="w-6 h-6 shrink-0" />
          <p
            className="text-[#4d4d4d] text-[13px] leading-[normal]"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            xxxxrena.gmail.com
          </p>
        </div>

        <Divider />

        {/* Info banner */}
        <div className="flex gap-2.5 items-start">
          <img src={imgInfo} alt="" className="w-4 h-4 shrink-0 mt-0.5" />
          <p
            className="text-[#5a6172] text-[14px] leading-5 flex-1"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            This role comes from a public job listing. Complete Screna's assessment and qualify to prepare a recruiter email. Send it yourself to apply.
          </p>
        </div>
        <p
          className="text-[#737373] text-[12px] leading-[normal]"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          Screna's assessment is based on the public job description and is not an employer-administered interview.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-5">
        <p
          className="text-[#1e232f] text-[16px] font-semibold leading-[normal]"
          style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
        >
          How the application process works
        </p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { step: "STEP 1", title: "Complete your assessment", body: "Take an AI assessment based on the public job description." },
            { step: "STEP 2", title: "View your results", body: "See your score, feedback, and qualification status." },
            {
              step: "STEP 3", title: "Contact if qualified", body: "Review your email draft and send it from your own account.",
              badge: "If qualified",
            },
            { step: "STEP 4", title: "Track in My Jobs", body: "Confirm your email was sent to mark the role as applied." },
          ].map(({ step, title, body, badge }) => (
            <div key={step} className="bg-[#f9fafb] rounded-xl p-3 flex flex-col gap-2">
              <p
                className="text-[#5a6172] text-[11px] font-bold tracking-[0.5px] uppercase leading-[normal]"
                style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
              >
                {step}
              </p>
              <p
                className="text-[#1e232f] text-[14px] font-semibold leading-[18px]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                {title}
              </p>
              {badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#edf2ff] text-[#3861d9]"
                  style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
                >
                  {badge}
                </span>
              )}
              <p
                className="text-[#5a6172] text-[12px] leading-[18px]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column content */}
      <div className="flex gap-6 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Job Description */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p
                className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                About the role
              </p>
              <p
                className="text-[#5a6172] text-[14px] leading-[22px]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Driftvale is looking for an early-career Software Engineer to help build and maintain backend services. You'll work with engineering teammates to deliver reliable features, improve data handling, and investigate technical issues.
              </p>
            </div>
            <Divider />
            <div className="flex flex-col gap-3">
              <p
                className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                What you'll do
              </p>
              <BulletList items={[
                "Build and maintain backend services and APIs.",
                "Work with SQL databases and improve query performance.",
                "Write tests and contribute to code reviews.",
                "Investigate bugs and help improve service reliability.",
                "Collaborate with teammates to deliver product features.",
              ]} />
            </div>
            <Divider />
            <div className="flex flex-col gap-3">
              <p
                className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                What we're looking for
              </p>
              <BulletList items={[
                "Programming experience with Python or a similar language.",
                "Understanding of APIs, SQL, and relational databases.",
                "Ability to break down problems and explain technical decisions.",
                "Experience contributing to a software project through coursework, internships, or work.",
                "Clear communication and a collaborative approach.",
              ]} />
            </div>
            <Divider />
            <div className="flex flex-col gap-3">
              <p
                className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                Nice to have
              </p>
              <BulletList items={[
                "Experience with cloud services.",
                "Familiarity with automated testing and CI/CD.",
                "Experience investigating performance or reliability issues.",
              ]} />
            </div>
          </div>

          {/* Assessment Info */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p
                className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                About the Screna assessment
              </p>
              <p
                className="text-[#5a6172] text-[14px] leading-[22px]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                This AI assessment is generated from the public job description. It evaluates relevant skills and provides a report you can share with the recruiter.
              </p>
            </div>
            <div className="bg-[#f9fafb] rounded-lg p-3 flex gap-6 flex-wrap">
              {[
                { icon: imgClock, label: "30 minutes" },
                { icon: imgMic, label: "Voice interview" },
                { icon: imgGlobe, label: "English" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex gap-1.5 items-center">
                  <img src={icon} alt="" className="w-4 h-4 shrink-0" />
                  <p
                    className="text-[#5a6172] text-[13px] font-medium leading-[normal]"
                    style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p
                className="text-[#1e232f] text-[15px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                Assessment areas
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { bold: "Backend fundamentals", rest: " — APIs, application logic, and error handling." },
                  { bold: "Databases", rest: " — SQL, indexes, and transactions." },
                  { bold: "Problem solving", rest: " — Clarifying requirements and explaining trade-offs." },
                  { bold: "Project experience", rest: " — Your contribution, decisions, and results." },
                ].map(({ bold, rest }) => (
                  <div key={bold} className="flex gap-2 items-start">
                    <span className="text-[#5a6172] text-[14px] shrink-0">•</span>
                    <p className="text-[14px] leading-5" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                      <span className="font-bold text-[#1e232f]" style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}>{bold}</span>
                      <span className="text-[#5a6172]">{rest}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6 w-[380px] shrink-0">
          {/* Primary CTA card — changes based on interview/email status */}
          {!isCompleted ? (
          <div
            className="bg-white border-2 border-[#3c77f6] rounded-2xl p-7 flex flex-col gap-6"
            style={{ boxShadow: "0px 8px 12px rgba(60,119,246,0.08)" }}
          >
            <div className="flex flex-col gap-2">
              <p
                className="text-[#1e232f] text-[18px] font-bold leading-[normal]"
                style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
              >
                Start your role assessment
              </p>
              <p
                className="text-[#5a6172] text-[13px] leading-[18px]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Qualify to prepare a recruiter email with your resume and assessment report link.
              </p>
            </div>
            <Divider />
            <div className="flex flex-col gap-4">
              {[
                { icon: imgClock, label: "DURATION", value: "30 minutes" },
                { icon: imgMic, label: "FORMAT", value: "Voice · English" },
                { icon: imgAward, label: "ASSESSMENT COST", value: "30 credits" },
                { icon: imgCalendar, label: "ASSESSMENT DEADLINE", value: "Oct 28, 2026 · 11:59 PM PT" },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex gap-3 items-center">
                  <img src={icon} alt="" className="w-4 h-4 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <p
                      className="text-[#5a6172] text-[11px] font-semibold tracking-[0.5px] uppercase leading-[normal]"
                      style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                    >
                      {label}
                    </p>
                    <p
                      className="text-[#1e232f] text-[13px] font-medium leading-[normal]"
                      style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
                    >
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setInterviewCompleted(jobId); navigate(`/opportunities/job/${jobId}/results`); }}
              className="bg-[#3c77f6] text-white text-[14px] font-semibold leading-[normal] px-4 py-3 rounded-xl flex items-center justify-center gap-2.5 hover:bg-[#2d6ae0] transition-colors w-full"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif", boxShadow: "0px 4px 3px rgba(60,119,246,0.2)" }}
            >
              Start AI interview
              <img src={imgArrowRight} alt="" className="w-4 h-4 shrink-0" />
            </button>
            <p
              className="text-[#5a6172] text-[11px] leading-4 text-center"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              Review the cost and check your microphone before you begin.
            </p>
            <p
              className="text-[#737373] text-[11px] leading-[normal]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              Completing the assessment does not submit an application.
            </p>
          </div>
          ) : (
          /* Completed — shows assessment & application panel */
          <div
            className="bg-white border-2 border-[#3c77f6] rounded-2xl p-7 flex flex-col gap-6"
            style={{ boxShadow: "0px 8px 12px rgba(60,119,246,0.08)" }}
          >
            <p
              className="text-[#1e232f] text-[18px] font-bold leading-[normal]"
              style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
            >
              Your assessment &amp; application
            </p>

            {!isEmailSent ? (
              /* Email not sent: frame 18:14 right panel */
              <>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[#5a6172] text-[11px] font-semibold tracking-[0.5px] uppercase" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
                      Assessment status
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-[#1e232f] text-[13px] font-medium" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>Qualified</p>
                      <span className="bg-[#e8f7ee] text-[#2e8b57] text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>Qualified</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[#5a6172] text-[11px] font-semibold tracking-[0.5px] uppercase" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>Best score</p>
                    <p className="text-[#1e232f] text-[13px] font-bold" style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}>84/100</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[#5a6172] text-[11px] font-semibold tracking-[0.5px] uppercase" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>Application status</p>
                    <p className="text-[#1e232f] text-[13px] font-medium" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>Not applied yet</p>
                  </div>
                </div>
                <div className="h-0 relative shrink-0 w-full">
                  <div className="absolute inset-[-1px_0_0_0]">
                    <img alt="" className="block max-w-none size-full" src={imgLine3} />
                  </div>
                </div>
                <p className="text-[#5a6172] text-[13px] leading-[18px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                  You've qualified to contact the recruiter. Send your recruiter email to apply.
                </p>
                <button
                  onClick={() => navigate(`/opportunities/job/${jobId}/contact`)}
                  className="text-[#3c77f6] text-[14px] font-semibold text-left hover:underline w-fit"
                  style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                >
                  Contact recruiter →
                </button>
                <div className="h-0 relative shrink-0 w-full">
                  <div className="absolute inset-[-1px_0_0_0]">
                    <img alt="" className="block max-w-none size-full" src={imgLine3} />
                  </div>
                </div>
              </>
            ) : (
              /* Email sent: frame 19:574 right panel */
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[#5a6172] text-[13px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>Assessment status:</p>
                    <span className="bg-[#e5f5e5] text-[#228b22] text-[12px] font-semibold px-2 py-0.5 rounded-[10px]" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>Qualified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[#5a6172] text-[13px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>Best score:</p>
                    <p className="text-[#1e232f] text-[13px] font-medium" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>84/100</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[#5a6172] text-[13px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>Application status:</p>
                    <p className="text-[#1e232f] text-[13px] font-medium" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>Applied</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[#5a6172] text-[13px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>Email status:</p>
                    <p className="text-[#1e232f] text-[13px] font-medium" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>Sent · Confirmed by you</p>
                  </div>
                </div>
                <p className="text-[#5a6172] text-[13px] leading-[18px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                  You marked your recruiter email as sent. Track this application in My Jobs.
                </p>
                <button
                  onClick={() => navigate("/opportunities/my-jobs")}
                  className="text-[#3c77f6] text-[13px] font-semibold text-left hover:underline w-fit"
                  style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                >
                  Go to My Jobs →
                </button>
                <div className="h-0 relative shrink-0 w-full">
                  <div className="absolute inset-[-1px_0_0_0]">
                    <img alt="" className="block max-w-none size-full" src={imgLine3} />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 bg-white border border-[#d7dce5] text-[#1e232f] text-[14px] font-semibold py-3 rounded-xl flex items-center justify-center hover:bg-[#f9fafb] transition-colors"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                onClick={() => navigate(`/opportunities/job/${jobId}/results`)}
              >
                View report
              </button>
              <button
                className="flex-1 bg-[#3c77f6] text-white text-[14px] font-semibold py-3 rounded-xl flex items-center justify-center hover:bg-[#2d6ae0] transition-colors"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif", boxShadow: "0px 4px 3px rgba(60,119,246,0.2)" }}
              >
                Retake interview
              </button>
            </div>
            <p className="text-[#5a6172] text-[11px] leading-4" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
              30 credits per retake · 4h 32m left to start
            </p>
            <p className="text-[#5a6172] text-[11px] leading-4" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
              {isEmailSent
                ? "A higher score updates your shared report link automatically. No need to resend your email."
                : "Your highest score is retained. Retakes do not extend your original 6-hour window."}
            </p>
          </div>
          )}

          {/* Want another attempt */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p
              className="text-[#1e232f] text-[15px] font-semibold leading-[normal]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Want another attempt?
            </p>
            <p
              className="text-[#5a6172] text-[12px] leading-[normal]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              You can start additional attempts within 6 hours of your first submission, while this role remains open.
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                "Each retake costs 30 credits.",
                "Retakes do not extend the original six-hour window.",
                "Only a higher score updates your shared report.",
                "Equal or lower scores leave your shared report unchanged.",
                "Once you qualify, recruiter contact access is retained.",
              ].map((item) => (
                <div key={item} className="flex gap-2 items-start">
                  <span className="text-[#5a6172] text-[12px] shrink-0">•</span>
                  <p
                    className="text-[#5a6172] text-[12px] leading-[normal]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* What happens when you finish */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p
              className="text-[#1e232f] text-[15px] font-semibold leading-[normal]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              What happens when you finish?
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                "View your score and feedback.",
                "If qualified, review a recruiter email draft with your resume automatically attached and your report link included.",
                "Send the email from your own account, then confirm sending in Screna to mark the role as applied.",
              ].map((item) => (
                <div key={item} className="flex gap-2 items-start">
                  <span className="text-[#5a6172] text-[12px] shrink-0">•</span>
                  <p
                    className="text-[#5a6172] text-[12px] leading-[normal]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {item}
                  </p>
                </div>
              ))}
            </div>
            <p
              className="text-[#5a6172] text-[12px] leading-[normal]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              If you haven't qualified yet, you can review your feedback and retake while eligible.
            </p>
            <Divider />
            <p
              className="text-[#737373] text-[11px] leading-[normal]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              The report link shows your highest-scoring assessment for this role and your current ranking.
            </p>
            <p
              className="text-[rgba(90,97,114,0.8)] text-[11px] leading-4"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              The recruiter decides whether to respond or move forward.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
