import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { languageLabel, useCareerInterviewStarter } from "@/components/newDesign/opportunities/careersShared";
import { leftToStartLabel, retakeBlockedMessage, seniorityLabel, workplaceLabel, yearsLabel } from "@/components/newDesign/opportunities/careersDesignData";
import { getCareerJob, type CareerJobDetail, type CareerPosting, type InterviewPayer } from "@/services/careersApi";

// Design page (Downloads export), filled from GET /careers/jobs/{id}. Real
// data only: anything the posting doesn't have is hidden (backend 11-12).
// Every job is a Partner Job this release, so the Screna Sponsored copy
// (public listing, qualify, recruiter email, shared report link) is replaced
// by the Partner flow: interview → the employer sees the result.

const PERIOD: Record<string, string> = { YEAR: "year", MONTH: "month", WEEK: "week", DAY: "day", HOUR: "hour" };
const EMPLOYMENT: Record<string, string> = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", INTERNSHIP: "Internship", TEMPORARY: "Temporary" };

function money(n: number, currency: string | null) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(n);
  } catch {
    return n.toLocaleString("en-US");
  }
}

function deadlineLabel(iso: string, tz: string | null) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  try {
    const d = new Intl.DateTimeFormat("en-US", { ...opts, timeZone: tz || undefined }).format(new Date(iso));
    const t = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: tz || undefined }).format(new Date(iso));
    return `${d} · ${t}`;
  } catch {
    return new Intl.DateTimeFormat("en-US", opts).format(new Date(iso));
  }
}

// funding: who pays if an interview starts now (detail.interviewFunding).
function viewOf(p: CareerPosting, funding?: InterviewPayer) {
  const years = yearsLabel(p.yearsExperienceMin, p.yearsExperienceMax);
  const minutes = p.interview.durationMinutes;
  return {
    title: p.title,
    company: p.company.name,
    jobType: "Partner Job",
    meta: [p.location, workplaceLabel(p.workplaceType), p.employmentType ? EMPLOYMENT[p.employmentType] : ""].filter(Boolean).join(" · "),
    level: [seniorityLabel(p.seniority), years].filter(Boolean).join(" · "),
    salary:
      p.salaryMin != null || p.salaryMax != null
        ? `${[p.salaryMin, p.salaryMax].filter((n): n is number => n != null).map((n) => money(n, p.salaryCurrency)).join(" – ")}${p.salaryPeriod ? ` / ${PERIOD[p.salaryPeriod]}` : ""}`
        : "",
    skills: p.skills ?? [],
    overview: p.roleOverview || p.summary || "",
    responsibilities: p.responsibilities ?? [],
    requirements: p.requirements ?? [],
    preferred: p.preferredQualifications ?? [],
    // #325: name + description (null on jobs published before 11-13).
    criteria: p.interview.criteria ?? [],
    minutes,
    language: languageLabel(p.interview.language),
    cost: (funding ?? p.interview.interviewPayer) === "EMPLOYER" ? "Free · sponsored by recruiter" : "1 interview",
    deadline: p.closesAt ? deadlineLabel(p.closesAt, p.timezone) : "",
  };
}

const assetPathPrefix = "/images/opportunities";
const imgMapPin = `${assetPathPrefix}/0e220.svg`;
const imgBriefcase = `${assetPathPrefix}/c4789.svg`;
const imgDollarSign = `${assetPathPrefix}/7704b.svg`;
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
  const jobId = id ?? "";
  const [detail, setDetail] = useState<CareerJobDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const starter = useCareerInterviewStarter((app) => setDetail((d) => (d ? { ...d, myApplication: app } : d)));

  useEffect(() => {
    let cancelled = false;
    getCareerJob(jobId)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const myApp = detail?.myApplication ?? null;
  const isCompleted = myApp?.interviewStatus === "COMPLETED";
  // Applied: who pays the next interview is the application's funding; a
  // retake is always the candidate's.
  const v = detail && viewOf(detail.posting, isCompleted ? "CANDIDATE" : myApp?.interviewFunding ?? detail?.interviewFunding);
  const bestScore = myApp?.bestScore != null ? `${myApp.bestScore}/100` : "—";
  // Completed + canStartInterview = a retake can start now (always candidate-paid).
  const canRetake = isCompleted && !!myApp?.canStartInterview && (myApp?.retakeAvailability ?? "AVAILABLE") === "AVAILABLE";
  const retakeLeft = leftToStartLabel(myApp?.retakeDeadline);
  // #317: the start button only when an interview can start. Applied: the
  // application's canStartInterview (still true for existing applicants of a
  // job auto-closed by sponsorship). Not applied: only while the job takes
  // applications.
  const canStart = myApp ? myApp.canStartInterview : detail?.acceptingApplications !== false;
  const inProgress = myApp?.interviewStatus === "IN_PROGRESS";
  const decision = myApp?.hiringDecision;
  // A result puts the candidate on the employer's board: "Recommended" until
  // the employer decides (backend 11-12).
  const applicationStatus = decision === "MOVED_FORWARD" ? "Moved forward" : decision === "REJECTED" ? "Not selected" : "Recommended";
  const aboutSections = v
    ? ([
        ["What you'll do", v.responsibilities],
        ["What we're looking for", v.requirements],
        ["Nice to have", v.preferred],
      ] as const).filter(([, items]) => items.length > 0)
    : [];

  if (!detail || !v) {
    return (
      <div className="bg-white border border-[#e1e4ea] rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
        <p className="text-[#1e232f] text-[18px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
          {missing ? "This role isn't open" : "Loading…"}
        </p>
        {missing && (
          <button onClick={() => navigate("/opportunities")} className="text-[#3c77f6] text-[14px] hover:underline" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>
            ← Back to Opportunities
          </button>
        )}
      </div>
    );
  }

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
              {v.title}
            </p>
            <p
              className="text-[#5a6172] text-[16px] font-medium leading-[normal]"
              style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
            >
              {v.company}
            </p>
          </div>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold leading-5 border bg-[rgba(60,119,246,0.1)] border-[rgba(60,119,246,0.2)] text-[#3c77f6] shrink-0"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
          >
            {v.jobType}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-5">
          {v.meta && (
          <div className="flex gap-1.5 items-center">
            <img src={imgMapPin} alt="" className="w-4 h-4 shrink-0" />
            <p
              className="text-[#5a6172] text-[14px] leading-[normal]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              {v.meta}
            </p>
          </div>
          )}
          {v.level && (
          <div className="flex gap-1.5 items-center">
            <img src={imgBriefcase} alt="" className="w-4 h-4 shrink-0" />
            <p
              className="text-[#5a6172] text-[14px] leading-[normal]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              {v.level}
            </p>
          </div>
          )}
          {v.salary && (
          <div className="flex gap-1.5 items-center">
            <img src={imgDollarSign} alt="" className="w-4 h-4 shrink-0" />
            <p
              className="text-[#1e232f] text-[14px] font-semibold leading-[normal]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              {v.salary}
            </p>
          </div>
          )}
        </div>

        {/* Skills */}
        {v.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {v.skills.map((tag) => (
            <span
              key={tag}
              className="bg-[#f3f4f7] border border-[#e1e4ea] text-[#1e232f] text-[12px] font-medium leading-[normal] px-3 py-1 rounded-full"
              style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
            >
              {tag}
            </span>
          ))}
        </div>

        )}

        <Divider />

        {/* Info banner */}
        <div className="flex gap-2.5 items-start">
          <img src={imgInfo} alt="" className="w-4 h-4 shrink-0 mt-0.5" />
          <p
            className="text-[#5a6172] text-[14px] leading-5 flex-1"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Partner Job: complete the AI interview to apply. {v.company} sees your result and can unlock your profile and report.
          </p>
        </div>
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
            { step: "STEP 1", title: "Complete your interview", body: "Take a short AI interview set up by the employer for this role." },
            { step: "STEP 2", title: "View your results", body: "See your score and feedback." },
            { step: "STEP 3", title: "Employer review", body: "Your result goes to the employer, who can unlock your profile and report." },
            { step: "STEP 4", title: "Track in My Jobs", body: "Follow your application status in My Jobs." },
          ].map(({ step, title, body, badge }: { step: string; title: string; body: string; badge?: string }) => (
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
          {(v.overview || aboutSections.length > 0) && (
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            {v.overview && (
            <div className="flex flex-col gap-3">
              <p
                className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                About the role
              </p>
              <p
                className="text-[#5a6172] text-[14px] leading-[22px] whitespace-pre-line"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                {v.overview}
              </p>
            </div>
            )}
            {aboutSections.map(([title, items], i) => (
              <div key={title} className="flex flex-col gap-6">
                {(i > 0 || v.overview) && <Divider />}
                <div className="flex flex-col gap-3">
                  <p
                    className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
                    style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                  >
                    {title}
                  </p>
                  <BulletList items={[...items]} />
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Assessment Info */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p
                className="text-[#1e232f] text-[18px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                About the AI interview
              </p>
              <p
                className="text-[#5a6172] text-[14px] leading-[22px]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                The employer set up this AI interview for the role. Your answers are scored on the areas below, and the employer sees your result.
              </p>
            </div>
            <div className="bg-[#f9fafb] rounded-lg p-3 flex gap-6 flex-wrap">
              {[
                { icon: imgClock, label: `${v.minutes} minutes` },
                { icon: imgMic, label: "Video interview" },
                { icon: imgGlobe, label: v.language },
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
            {/* #325: the criteria the interview is scored on; jobs published
                before 11-13 have no descriptions, so the name only. */}
            {v.criteria.length > 0 && (
            <div className="flex flex-col gap-3">
              <p
                className="text-[#1e232f] text-[15px] font-semibold leading-[normal]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                Assessment areas
              </p>
              <div className="flex flex-col gap-3">
                {v.criteria.map(({ name, description }, i) => (
                  <div key={`${name}-${i}`} className="flex gap-2 items-start">
                    <span className="text-[#5a6172] text-[14px] shrink-0">•</span>
                    <p className="text-[14px] leading-5" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                      <span className="font-bold text-[#1e232f]" style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}>{name}</span>
                      {description && <span className="text-[#5a6172]">{` — ${description}`}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            )}
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
                Complete the AI interview to apply. The employer reviews your result.
              </p>
            </div>
            <Divider />
            <div className="flex flex-col gap-4">
              {[
                { icon: imgClock, label: "DURATION", value: `${v.minutes} minutes` },
                { icon: imgMic, label: "FORMAT", value: `Video · ${v.language}` },
                { icon: imgAward, label: "ASSESSMENT COST", value: v.cost },
                { icon: imgCalendar, label: "ASSESSMENT DEADLINE", value: v.deadline },
              ].filter((row) => row.value).map(({ icon, label, value }) => (
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
            {canStart ? (
            <>
            <button
              onClick={() => void starter.begin(jobId)}
              disabled={starter.busyJob === jobId}
              className="bg-[#3c77f6] text-white text-[14px] font-semibold leading-[normal] px-4 py-3 rounded-xl flex items-center justify-center gap-2.5 hover:bg-[#2d6ae0] transition-colors w-full"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif", boxShadow: "0px 4px 3px rgba(60,119,246,0.2)" }}
            >
              {inProgress ? "Continue AI interview" : "Start AI interview"}
              <img src={imgArrowRight} alt="" className="w-4 h-4 shrink-0" />
            </button>
            <p
              className="text-[#5a6172] text-[11px] leading-4 text-center"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              Review the cost and check your microphone before you begin.
            </p>
            </>
            ) : (
              <p
                className="text-[#5a6172] text-[13px] leading-5"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                This role is no longer accepting applications.
              </p>
            )}
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

            <div className="flex flex-col gap-4">
              {[
                ["Assessment status", "Completed"],
                ["Best score", bestScore],
                ["Application status", applicationStatus],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-[#5a6172] text-[11px] font-semibold tracking-[0.5px] uppercase" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
                    {label}
                  </p>
                  <p className="text-[#1e232f] text-[13px] font-medium" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>{value}</p>
                </div>
              ))}
            </div>
            <div className="h-0 relative shrink-0 w-full">
              <div className="absolute inset-[-1px_0_0_0]">
                <img alt="" className="block max-w-none size-full" src={imgLine3} />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 bg-white border border-[#d7dce5] text-[#1e232f] text-[14px] font-semibold py-3 rounded-xl flex items-center justify-center hover:bg-[#f9fafb] transition-colors"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                onClick={() =>
                  detail.myApplication && navigate(`/opportunities/applications/${encodeURIComponent(detail.myApplication.applicationId)}/results`)
                }
              >
                View report
              </button>
              <button
                onClick={() => myApp && starter.openDialog(myApp)}
                disabled={!canRetake}
                className="flex-1 bg-[#3c77f6] text-white text-[14px] font-semibold py-3 rounded-xl flex items-center justify-center hover:bg-[#2d6ae0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#3c77f6]"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif", boxShadow: "0px 4px 3px rgba(60,119,246,0.2)" }}
              >
                Retake interview
              </button>
            </div>
            <p className="text-[#5a6172] text-[11px] leading-4" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
              {canRetake
                ? ["1 interview per retake", retakeLeft].filter(Boolean).join(" · ")
                : myApp
                  ? retakeBlockedMessage(myApp)
                  : ""}
            </p>
            <p className="text-[#5a6172] text-[11px] leading-4" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
              Your highest score is retained. Retakes do not extend the retake deadline.
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
              You can start another attempt before the retake deadline, while this role remains open.
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                "Each retake uses 1 interview from your plan.",
                "Retakes do not extend the retake deadline.",
                "Only a higher score updates your best score.",
                "Equal or lower scores leave your best score unchanged.",
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
                "Your result goes to the employer, who can unlock your profile and report.",
                "Track your application in My Jobs.",
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
            <Divider />
            <p
              className="text-[rgba(90,97,114,0.8)] text-[11px] leading-4"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              The employer decides whether to move forward.
            </p>
          </div>
        </div>
      </div>
      {starter.ui}
    </div>
  );
}
