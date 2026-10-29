import { useNavigate, useParams } from "react-router";
import { useOpportunities } from "@/components/newDesign/opportunities/OpportunitiesContext";

const assetPathPrefix = "/images/opportunities";
const imgRecruiter = `${assetPathPrefix}/7d8a8.png`;
const imgMail = `${assetPathPrefix}/5b722.svg`;
const imgCopy = `${assetPathPrefix}/d74c1.svg`;
const imgFile = `${assetPathPrefix}/7d420.svg`;
const imgFileText = `${assetPathPrefix}/17552.svg`;
const imgArrowRight = `${assetPathPrefix}/dc431.svg`;
const imgCheck = `${assetPathPrefix}/9d143.svg`;
const imgEllipse = `${assetPathPrefix}/ee1a8.svg`;
const imgLine2 = `${assetPathPrefix}/a9b73.svg`;

function Divider() {
  return <div className="w-full h-px bg-[#e1e4ea]" />;
}

export function ContactRecruiterPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const jobId = id ?? "5";
  const { emailStatus, setEmailSent, setEmailUnsent } = useOpportunities();
  const isEmailSent = emailStatus[jobId] === "sent";

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Back link */}
      <button
        onClick={() => navigate(`/opportunities/job/${id}/results`)}
        className="text-[#3c77f6] text-[14px] leading-5 text-left w-fit hover:underline"
        style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
      >
        ← Back to interview results
      </button>

      {/* Page header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <h1
            className="text-[#1e232f] text-[32px] font-bold leading-[normal]"
            style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
          >
            Contact recruiter
          </h1>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold border bg-[rgba(60,119,246,0.1)] border-[rgba(60,119,246,0.2)] text-[#3c77f6]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Screna Sponsored
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold border bg-[rgba(52,199,89,0.1)] border-[rgba(52,199,89,0.2)] text-[#34c759]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              Qualified
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold border bg-[#f3f4f6] border-[#e5e7eb] text-[#5a6172]"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              {isEmailSent ? "Applied" : "Not applied yet"}
            </span>
          </div>
        </div>
        <p
          className="text-[#1e232f] text-[16px] font-semibold leading-[normal]"
          style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
        >
          Software Engineer · Driftvale
        </p>
        <p
          className="text-[#5a6172] text-[13px] leading-[normal]"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          {isEmailSent ? "You marked your recruiter email as sent. Track your application in My Interviews." : "Review your email draft and send it from your own email account. · Best score: 84/100"}
        </p>
        <p
          className="text-[#5a6172] text-[13px] leading-[normal]"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          Your application will be marked as applied after you confirm that you've sent the email.
        </p>
      </div>

      {/* Two-column grid */}
      <div className="flex gap-6 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Recruiter Card */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p
              className="text-[#1e232f] text-[16px] font-bold leading-[normal]"
              style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
            >
              Recruiter
            </p>
            <div className="flex items-center gap-3">
              <img
                src={imgRecruiter}
                alt="Sarah Jenkins"
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <div className="flex flex-col gap-0.5">
                <p
                  className="text-[#1e232f] text-[15px] leading-[normal]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  Sarah Jenkins
                </p>
                <p
                  className="text-[#5a6172] text-[13px] leading-[normal]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  Recruiter · Driftvale
                </p>
              </div>
            </div>
            <Divider />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={imgMail} alt="" className="w-4 h-4 shrink-0" />
                <p
                  className="text-[#1e232f] text-[14px] leading-[normal]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  recruiter@example.com
                </p>
              </div>
              <button className="bg-[#f3f4f6] p-1.5 rounded-md hover:bg-[#e8e9ec] transition-colors">
                <img src={imgCopy} alt="Copy" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Email Draft Card */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <p
                className="text-[#1e232f] text-[16px] font-bold leading-[normal]"
                style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
              >
                Email draft
              </p>
              <button
                className="text-[#3c77f6] text-[14px] leading-[normal] hover:underline"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Reset draft
              </button>
            </div>
            <p
              className="text-[#5a6172] text-[13px] leading-[normal]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              Personalize your message before opening it in your email app.
            </p>

            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <p
                className="text-[#5a6172] text-[12px] uppercase leading-[normal]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Subject
              </p>
              <div className="bg-white border border-[#e1e4ea] rounded-md p-3">
                <p
                  className="text-[#1e232f] text-[14px] leading-[normal]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  Application for Software Engineer - Alex Morgan
                </p>
              </div>
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1.5">
              <p
                className="text-[#5a6172] text-[12px] uppercase leading-[normal]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Message
              </p>
              <div className="bg-white border border-[#e1e4ea] rounded-md p-4">
                <div
                  className="text-[#1e232f] text-[14px]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  <p className="leading-6 mb-0">Hi Sarah Jenkins,</p>
                  <p className="leading-6 mb-0">I'm interested in the Software Engineer role at Driftvale. I've completed a role-specific AI assessment on Screna, with a best score of 84/100.</p>
                  <p className="leading-6 mb-0">My resume is attached. You can view my assessment report here:</p>
                  <p className="leading-6 mb-0 text-[#3c77f6]">https://screna.com/reports/shared/alex-morgan-driftvale</p>
                  <p className="leading-6 mb-0">The link shows my highest-scoring assessment for this role and the latest ranking.</p>
                  <p className="leading-6 mb-0">I'd welcome the opportunity to discuss the role and my background.</p>
                  <p className="leading-6 mb-0">Best,</p>
                  <p className="leading-6">Alex Morgan</p>
                </div>
              </div>
            </div>

            {/* Attachment */}
            <div className="bg-[#f3f4f6] rounded-md p-3 flex items-center gap-2.5">
              <img src={imgFile} alt="" className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <p
                  className="text-[#1e232f] text-[14px] leading-[normal]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  Alex_Morgan_Resume.pdf
                </p>
                <p
                  className="text-[#5a6172] text-[11px] leading-[normal]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  Automatically attached
                </p>
              </div>
              <button
                className="text-[#3c77f6] text-[13px] leading-[normal] shrink-0 hover:underline"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Preview
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6 w-[420px] shrink-0">
          {/* Your materials */}
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p
              className="text-[#1e232f] text-[16px] font-bold leading-[normal]"
              style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
            >
              Your materials
            </p>

            {/* Resume */}
            <div className="flex flex-col gap-2">
              <p
                className="text-[#5a6172] text-[12px] uppercase leading-[normal]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Resume
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={imgFileText} alt="" className="w-4 h-4 shrink-0" />
                  <p
                    className="text-[#1e232f] text-[14px] leading-[normal]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    Alex_Morgan_Resume.pdf
                  </p>
                </div>
                <p
                  className="text-[#34c759] text-[12px] leading-[normal]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  Automatically attached
                </p>
              </div>
              <button
                className="text-[#3c77f6] text-[13px] leading-[normal] text-left hover:underline w-fit"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Preview resume
              </button>
            </div>

            <Divider />

            {/* Assessment report */}
            <div className="flex flex-col gap-2">
              <p
                className="text-[#5a6172] text-[12px] uppercase leading-[normal]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Assessment report
              </p>
              <div className="flex items-center justify-between">
                <p
                  className="text-[#1e232f] text-[14px] leading-[normal]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  Best score: 84/100
                </p>
                <p
                  className="text-[#3c77f6] text-[12px] leading-[normal]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  Link included in draft
                </p>
              </div>
              <div className="flex gap-4">
                <button className="text-[#3c77f6] text-[13px] hover:underline" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                  Preview shared report
                </button>
                <button className="text-[#3c77f6] text-[13px] hover:underline" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                  Copy link
                </button>
              </div>
            </div>

            <Divider />

            <div className="flex flex-col gap-2.5">
              <p
                className="text-[#5a6172] text-[12px] leading-[1.4]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                The recruiter can open this link to view your full shared assessment report without signing in.
              </p>
              <p
                className="text-[#5a6172] text-[12px] leading-[1.4]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                The same link updates when you achieve a higher score and shows your current ranking. You do not need to resend the email when the report or ranking updates.
              </p>
              <p
                className="text-[#5a6172] text-[11px] leading-[normal] italic"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Your resume attachment remains the version included when you send the email.
              </p>
            </div>
          </div>

          {!isEmailSent ? (
          /* Send from your email — before sending */
          <div className="bg-white border border-[#e1e4ea] rounded-2xl p-6 flex flex-col gap-4">
            <p
              className="text-[#1e232f] text-[16px] font-bold leading-[normal]"
              style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
            >
              Send from your email
            </p>

            <div className="flex flex-col gap-2.5">
              {[
                { num: "1.", text: "Review the message and attached resume." },
                { num: "2.", text: "Open the draft in your email app and send it." },
                { num: "3.", text: "Return here and mark the email as sent." },
              ].map(({ num, text }) => (
                <div key={num} className="flex gap-2 items-start">
                  <p
                    className="text-[#3c77f6] text-[13px] font-bold leading-[normal] shrink-0"
                    style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                  >
                    {num}
                  </p>
                  <p
                    className="text-[#1e232f] text-[13px] leading-[normal]"
                    style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {text}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setEmailSent(jobId)}
                className="bg-[#3c77f6] text-white text-[14px] leading-[normal] px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#2d6ae0] transition-colors w-full"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Open in email app
                <img src={imgArrowRight} alt="" className="w-3.5 h-3.5 shrink-0" />
              </button>
              <button
                className="border border-[#3c77f6] text-[#3c77f6] text-[14px] leading-[normal] px-6 py-3 rounded-xl flex items-center justify-center hover:bg-[#eef4ff] transition-colors w-full"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Copy email text
              </button>
            </div>

            <p
              className="text-[#5a6172] text-[12px] leading-[1.4]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              Screna prepares the draft. You send it from your own email account, and replies go to that account.
            </p>

            <Divider />

            <div className="flex items-center gap-1.5">
              <p
                className="text-[#5a6172] text-[12px] leading-[1.4] flex-1 min-w-0"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Copying text does not copy attachments. Download and attach your resume if you compose manually.
              </p>
              <button
                className="text-[#3c77f6] text-[12px] leading-[normal] shrink-0 hover:underline"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Download resume
              </button>
            </div>
          </div>
          ) : (
          /* Sent confirmation card — frame 18:352 */
          <div className="bg-white border border-[#e1e4ea] rounded-lg p-6 flex flex-col gap-4">
            {/* Marked as sent header */}
            <div className="flex items-center gap-3">
              <div className="bg-[rgba(52,199,89,0.1)] p-1.5 rounded-full shrink-0 flex items-center justify-center">
                <img src={imgCheck} alt="" style={{ width: 16, height: 16 }} />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-[#1e232f] text-[16px] font-bold leading-[normal]" style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}>
                  Marked as sent
                </p>
                <p className="text-[#5a6172] text-[13px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                  You marked this email as sent on Sep 16, 2026.
                </p>
              </div>
            </div>
            <div className="h-0 relative shrink-0 w-full">
              <div className="absolute inset-[-1px_0_0_0]">
                <img alt="" className="block max-w-none size-full" src={imgLine2} />
              </div>
            </div>
            {/* Status line */}
            <div className="flex items-center gap-1.5">
              <img src={imgEllipse} alt="" style={{ width: 8, height: 8, flexShrink: 0 }} />
              <p className="text-[#1e232f] text-[14px] font-semibold flex-1 min-w-0" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
                Email sent · Confirmed by you
              </p>
            </div>
            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/opportunities/my-jobs")}
                className="bg-[#3c77f6] text-white text-[14px] leading-[normal] px-6 py-3 rounded-xl flex items-center justify-center hover:bg-[#2d6ae0] transition-colors w-full"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Go to My Interviews
              </button>
              <div className="flex items-center gap-3 text-[13px]">
                <button
                  onClick={() => navigate(`/opportunities/job/${jobId}/results`)}
                  className="text-[#3c77f6] hover:underline shrink-0"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  Back to assessment results
                </button>
                <span className="text-[#5a6172]">·</span>
                <button
                  onClick={() => setEmailUnsent(jobId)}
                  className="text-[#ff383c] hover:underline shrink-0"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  Undo
                </button>
              </div>
              <p className="text-[#5a6172] text-[11px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                Undo only changes your application status in Screna. It does not recall the email.
              </p>
            </div>
            <div className="h-0 relative shrink-0 w-full">
              <div className="absolute inset-[-1px_0_0_0]">
                <img alt="" className="block max-w-none size-full" src={imgLine2} />
              </div>
            </div>
            <p className="text-[#5a6172] text-[11px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
              This is a candidate-confirmed status. Screna does not verify delivery.
            </p>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
