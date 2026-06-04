import { useEffect } from 'react';
import { Footer } from '@/components/newDesign/home/footer';
import { Navbar } from '@/components/newDesign/home/navbar';

export function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(220,20%,98%)] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-[107px]">
        {/* Hero header */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(221,91%,60%)]/[0.04] to-transparent pointer-events-none" />
          <div className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center relative">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] mb-5">
              Legal
            </span>
            <h1 className="text-4xl lg:text-5xl text-[hsl(222,22%,15%)] mb-3 tracking-tight font-[family-name:var(--font-serif)]">
              Privacy Policy
            </h1>
            <p className="text-lg text-[hsl(222,12%,45%)] max-w-lg mx-auto leading-relaxed">
              Screna.ai Privacy Policy
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-[hsl(222,12%,55%)]">
              <span>Effective: 21st March, 2026</span>
              <span className="w-1 h-1 rounded-full bg-[hsl(222,12%,70%)]" />
              <span>Last Updated: 21st March, 2026</span>
            </div>
          </div>
        </section>

        {/* Content area */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] shadow-sm overflow-hidden">
            <div className="p-8 md:p-10">
              <div className="prose prose-slate max-w-none">
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  Screna Tech Inc. ("Company," "we," "us") provides the services available at https://www.screna.ai/ and affiliated
                  applications, communications, and other instances where we link to this Privacy Policy (collectively, the "Services").
                </p>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  This Privacy Policy explains how we process personal data when providing the Services. Any capitalized term not defined
                  here has the meaning in our Terms of Service. As used in this Policy, "including" means "including but not limited to."
                </p>

                {/* Section 1 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">1) Data Controller</h2>
                <p className="text-[hsl(222,12%,45%)] mb-2">Screna Tech Inc. is the data controller for the Services.</p>
                <p className="text-[hsl(222,12%,45%)] mb-1"><strong className="text-[hsl(222,22%,15%)]">Contact:</strong> operations@screna.ai</p>
                <p className="text-[hsl(222,12%,45%)] mb-8"><strong className="text-[hsl(222,22%,15%)]">Address:</strong> 42 HANSOM RD, BASKING RIDGE, NJ 07920</p>

                {/* Section 2 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">2) Personal Data We Process and How We Use It</h2>
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  We process personal data to provide the Services (e.g., running mock interviews, generating transcripts, and delivering
                  AI-based feedback). The personal data we collect varies depending on how you use the Services.
                </p>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  You are not required to provide personal data, but if you do not provide certain data, we may be unable to provide parts
                  of the Services (for example, we cannot generate interview feedback without your interview inputs).
                </p>

                {/* Section 3 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">3) Categories of Personal Data We Collect</h2>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full border border-[hsl(222,15%,88%)] text-sm rounded-xl">
                    <thead className="bg-[hsl(222,15%,96%)]">
                      <tr>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Personal Data Category</th>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Examples</th>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Typical Legal Categories (GDPR / US State-Law)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Account &amp; Profile Information</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Name, email, password or auth token, username, preferences, role/industry targets</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Identifiers; account data</td>
                      </tr>
                      <tr className="bg-[hsl(220,20%,99%)]">
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Interview Content (Audio/Video) &amp; Files</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Video/audio recordings (if enabled), webcam/mic streams, uploaded resume/portfolio files, notes</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Audio/visual information; user content</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Transcripts &amp; Derived Interview Outputs</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Transcripts, summaries, rubric scores, evaluation reports, improvement plans, "strength/weakness" insights</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Inferences; profiling/derived data</td>
                      </tr>
                      <tr className="bg-[hsl(220,20%,99%)]">
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Communications</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Support tickets, emails, surveys, chat messages with our support or within the product</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Communications content</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Payment &amp; Subscription Data (if paid)</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Billing address (partial), subscription status, invoices, payment confirmation from processor</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Commercial information</td>
                      </tr>
                      <tr className="bg-[hsl(220,20%,99%)]">
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Usage &amp; Device Data</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">IP address, device identifiers, browser type, pages viewed, clicks, feature usage, log files, crash reports</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Internet activity; identifiers</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Security &amp; Fraud Data</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Login history, suspicious activity signals, abuse reports</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Security-related data; inferences</td>
                      </tr>
                      <tr className="bg-[hsl(220,20%,99%)]">
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Cookie/Tracking Data</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Cookie IDs, analytics events, preferences, A/B test assignments</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Internet activity; identifiers</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Optional Job-Search Context (if you provide it)</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Target roles, job descriptions, interview question sets, recruiter prompts</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Professional/employment-related info</td>
                      </tr>
                      <tr className="bg-[hsl(220,20%,99%)]">
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Sensitive Data (only if you choose to provide it)</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Any data revealing health, immigration status, union membership, race/ethnicity, etc. (often appears in resumes or interview stories)</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Sensitive data / special category (GDPR) / sensitive PI (US)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5 mb-8 border-l-4 border-l-[hsl(221,91%,60%)]">
                  <p className="text-sm font-semibold text-[hsl(222,22%,15%)] mb-2">Important notes about audio/video and "biometric" concepts</p>
                  <p className="text-sm text-[hsl(222,12%,45%)]">
                    Some laws treat certain audio/visual data as sensitive when used for identification (e.g., faceprints/voiceprints). We do
                    not use your audio/video to identify you as a unique person (no face/voice recognition for identity verification) unless
                    we clearly tell you and obtain any required consent. We process audio/video to provide interview functionality (recording,
                    playback, transcription, feedback).
                  </p>
                </div>

                {/* Section 4 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">4) How We Use Personal Data (Key Purposes)</h2>
                <p className="text-[hsl(222,12%,45%)] mb-3">We use personal data to:</p>
                <ul className="list-disc pl-6 mb-8 space-y-2 text-[hsl(222,12%,45%)]">
                  <li><strong className="text-[hsl(222,22%,15%)]">Provide the Services</strong> (run mock interviews, generate transcripts, deliver feedback, maintain your account, and other Services).</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Personalize and improve the Services</strong> (recommend practice plans, improve rubrics, fix bugs, optimize performance, and other Services).</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Customer support</strong> (answer requests, troubleshoot, communicate with you).</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Security and safety</strong> (prevent fraud/abuse, enforce Terms, protect users).</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Payments and subscriptions</strong> (manage billing and plan access).</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Marketing (limited)</strong> (send product updates and promotional communications where permitted).</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Legal compliance</strong> (respond to lawful requests, protect rights).</li>
                </ul>

                {/* Section 5 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">5) AI Features and Automated Processing</h2>
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  The Services may offer AI features that generate content such as: interview feedback, summaries, suggested answers,
                  question banks, and coaching plans ("AI Outputs").
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2 text-[hsl(222,12%,45%)]">
                  <li><strong className="text-[hsl(222,22%,15%)]">Inputs to AI:</strong> your interview responses, prompts, uploaded materials (like resumes), and, if enabled, transcripts and recordings.</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Outputs:</strong> AI-generated analyses, scores, and recommendations.</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Human review:</strong> we may review limited data for quality assurance, safety, debugging, and support, with access controls and logging where appropriate.</li>
                </ul>
                <p className="text-[hsl(222,12%,45%)] mb-2"><strong className="text-[hsl(222,22%,15%)]">Model training / improvement:</strong></p>
                <ul className="list-disc pl-6 mb-4 space-y-2 text-[hsl(222,12%,45%)]">
                  <li>Default approach: we do not use your audio/video recordings to train foundation models.</li>
                  <li>We may use de-identified and/or aggregated usage metrics to improve the Services.</li>
                  <li>If we offer an opt-in to use certain content (e.g., transcripts) to improve AI quality, we will present it clearly in-product and you can opt out.</li>
                </ul>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  <strong className="text-[hsl(222,22%,15%)]">AI limitations:</strong> AI is evolving and may produce inaccurate or inappropriate output. You should independently review AI Outputs before relying on them.
                </p>

                {/* Section 6 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">6) When and How We Share Personal Data</h2>
                <p className="text-[hsl(222,12%,45%)] mb-4">We do not sell personal data in the traditional sense. We may share personal data with:</p>

                <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-2">A. Service Providers (Processors)</h3>
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  Vendors who help us operate the Services (e.g., hosting, databases, analytics, email delivery, customer support tooling,
                  payment processors, transcription/AI infrastructure). They are contractually restricted to process personal data on our instructions.
                </p>

                <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-2">B. Legal, Safety, and Rights</h3>
                <p className="text-[hsl(222,12%,45%)] mb-2">We may disclose data if we believe in good faith it is necessary to:</p>
                <ul className="list-disc pl-6 mb-4 space-y-1 text-[hsl(222,12%,45%)]">
                  <li>Comply with law, regulation, legal process, or government request</li>
                  <li>Enforce our Terms, investigate abuse, or protect the security of the Services</li>
                  <li>Protect the rights, property, or safety of users, the public, or us</li>
                </ul>

                <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-2">C. Business Transfers</h3>
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  If we're involved in a merger, acquisition, financing, or sale of assets, we may transfer data as part of that transaction
                  subject to standard protections.
                </p>

                <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-2">D. With Your Direction</h3>
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  For example, if you export a report, share a link with a mentor, or connect third-party integrations.
                </p>

                <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-2">E. Google User Data</h3>
                <p className="text-[hsl(222,12%,45%)] mb-3">
                  When you connect your Google account to the Services (e.g., via Google OAuth / Sign in with Google), we may receive and
                  process certain Google account data, including your name, email address, and profile picture, solely to authenticate your
                  identity and provide the Services. We do not sell or use Google user data for advertising purposes.
                </p>
                <p className="text-[hsl(222,12%,45%)] mb-2">
                  Google user data may be disclosed to the following categories of third parties, solely to the extent necessary to provide the Services:
                </p>
                <ul className="list-disc pl-6 mb-3 space-y-2 text-[hsl(222,12%,45%)]">
                  <li><strong className="text-[hsl(222,22%,15%)]">Authentication Infrastructure Providers</strong> — cloud hosting and identity/authentication service providers (e.g., session management, token storage) that process data on our behalf under data processing agreements.</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Core Platform Service Providers</strong> — backend infrastructure, database, and application hosting vendors necessary to operate and deliver the Services (e.g., user account creation and login flow).</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Legal and Compliance Disclosures</strong> — as required by applicable law, regulation, or valid legal process (Section 6B above).</li>
                </ul>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  We do not transfer Google user data to any other third parties. Our use and transfer of information received from Google
                  APIs complies with the Google API Services User Data Policy, including the Limited Use requirements.
                </p>

                {/* Section 7 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">7) Cookies and Similar Technologies</h2>
                <p className="text-[hsl(222,12%,45%)] mb-3">We may use cookies and similar technologies for:</p>
                <ul className="list-disc pl-6 mb-4 space-y-1 text-[hsl(222,12%,45%)]">
                  <li><strong className="text-[hsl(222,22%,15%)]">Strictly necessary:</strong> login/session, security</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Functional:</strong> preferences, language, settings</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">Analytics:</strong> product performance and feature usage</li>
                  <li><strong className="text-[hsl(222,22%,15%)]">(Optional) Advertising:</strong> if we run ads, we will describe the partners and choices here</li>
                </ul>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  You can manage cookies through browser settings and (where offered) our cookie preferences tool. Some features may not
                  work without necessary cookies. We may honor Global Privacy Control (GPC) where required by law.
                </p>

                {/* Section 8 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">8) Processing Table (Purpose, Data, Sharing, Legal Basis)</h2>
                <div className="overflow-x-auto mb-8">
                  <table className="min-w-full border border-[hsl(222,15%,88%)] text-sm rounded-xl">
                    <thead className="bg-[hsl(222,15%,96%)]">
                      <tr>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Purpose</th>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Categories Used</th>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Shared With</th>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Legal Basis (GDPR-style, where applicable)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Provide core Services (mock interviews, transcripts, feedback)</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Account &amp; Profile; Interview Content; Transcripts; Derived Outputs; Usage</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Hosting/AI/transcription vendors; support vendors</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Contract necessity</td>
                      </tr>
                      <tr className="bg-[hsl(220,20%,99%)]">
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Personalization (practice plan, recommendations)</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Usage; Derived Outputs; Optional job context</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Analytics/feature tooling vendors</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Legitimate interests / Contract</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Improve AI quality &amp; product (debugging, evaluation, analytics)</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Usage; Transcripts/Derived Outputs (prefer de-identified/aggregated)</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Analytics vendors; AI infrastructure vendors</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Legitimate interests; Consent if required</td>
                      </tr>
                      <tr className="bg-[hsl(220,20%,99%)]">
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Customer support</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Communications; Account; logs</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Support tools/vendors</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Contract / Legitimate interests</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Security &amp; fraud prevention</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Security; logs; device/usage</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Security/fraud vendors</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Legitimate interests / Legal obligation</td>
                      </tr>
                      <tr className="bg-[hsl(220,20%,99%)]">
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Billing &amp; subscriptions</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Payment/subscription status</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Payment processors</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Contract / Legal obligation</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Marketing communications</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Email; preferences; interactions</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Email/CRM vendors</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Legitimate interests or Consent (jurisdiction-dependent)</td>
                      </tr>
                      <tr className="bg-[hsl(220,20%,99%)]">
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Legal compliance</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Any relevant categories</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Authorities/advisors</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Legal obligation / Legitimate interests</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 9 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">9) Data Retention</h2>
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  We may keep personal data for the purposes in this Policy, including to provide the Services, comply with legal
                  obligations, resolve disputes, and enforce agreements.
                </p>
                <ul className="list-disc pl-6 mb-8 space-y-2 text-[hsl(222,12%,45%)]">
                  <li>You can delete recordings and certain content in the Personal Center.</li>
                  <li>If you delete your account, we delete or de-identify personal data within 63 days, subject to legal/backup/security exceptions.</li>
                  <li>Backups may persist for a limited period before being overwritten.</li>
                </ul>

                {/* Section 10 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">10) Security Safeguards</h2>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  We may use reasonable administrative, technical, and physical safeguards (e.g., access controls, encryption in transit,
                  monitoring). No system is 100% secure; you are responsible for keeping your credentials confidential.
                </p>

                {/* Section 11 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">11) Your Rights and Choices</h2>
                <p className="text-[hsl(222,12%,45%)] mb-3">Depending on your location, you may have rights to:</p>
                <ul className="list-disc pl-6 mb-4 space-y-1 text-[hsl(222,12%,45%)]">
                  <li>Access, correct, or delete personal data</li>
                  <li>Object to or restrict processing</li>
                  <li>Data portability</li>
                  <li>Withdraw consent (where processing is based on consent)</li>
                </ul>
                <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5 mb-8">
                  <p className="text-sm text-[hsl(222,12%,45%)]">
                    <strong className="text-[hsl(222,22%,15%)]">How to exercise rights:</strong> email{' '}
                    <span className="text-[hsl(221,91%,60%)] font-mono">Attorney@tslawfirm.co</span>
                  </p>
                </div>

                {/* Section 12 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">12) US State Privacy Disclosures (CA/CPRA and other states)</h2>
                <p className="text-[hsl(222,12%,45%)] mb-2"><strong className="text-[hsl(222,22%,15%)]">Sale/Share for targeted advertising:</strong></p>
                <ul className="list-disc pl-6 mb-4 space-y-2 text-[hsl(222,12%,45%)]">
                  <li>We do not "sell" personal information. We do not "share" personal information for cross-context behavioral advertising.</li>
                  <li>If we later use ad networks for targeted ads, we will update this section and provide an opt-out.</li>
                </ul>
                <p className="text-[hsl(222,12%,45%)] mb-2">
                  <strong className="text-[hsl(222,22%,15%)]">Sensitive personal information:</strong> We do not use sensitive personal
                  information to infer characteristics about you for targeted advertising. If we process sensitive data (e.g., resume
                  content), we do so to provide the Services.
                </p>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  <strong className="text-[hsl(222,22%,15%)]">Non-discrimination:</strong> We do not discriminate for exercising privacy rights.
                </p>

                {/* Section 13 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">13) International Transfers</h2>
                <p className="text-[hsl(222,12%,45%)] mb-3">
                  If you access the Services from outside the United States, your personal data may be transferred to and processed in the
                  United States or other countries where our service providers operate.
                </p>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  If GDPR applies, we rely on transfer mechanisms such as Standard Contractual Clauses and supplementary measures, as appropriate.
                </p>

                {/* Section 14 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">14) Children / Minimum Age</h2>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  The Services are not intended for users under 18. We do not knowingly collect personal data from children. If you believe
                  a child has provided us personal data, contact us to request deletion.
                </p>

                {/* Section 15 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">15) Third-Party Links and Integrations</h2>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  If the Services link to third-party sites or integrate third-party tools, their privacy practices are governed by their
                  policies. We are not responsible for third-party privacy practices.
                </p>

                {/* Section 16 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">16) Changes to This Policy</h2>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  We may update this Policy from time to time by posting an updated version. If we make a material change, we will provide
                  notice (e.g., in-product or by email) as required. Your continued use of the Services means you accept the updated Policy.
                </p>

                {/* Section 17 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">17) Conflicts; Governing Terms</h2>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  In the event of any conflict between this Privacy Policy and the Terms of Service of the Company, the Terms of Service
                  shall control.
                </p>

                {/* Section 18 */}
                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">18) Contact Us</h2>
                <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5 mb-8">
                  <p className="text-[hsl(222,12%,45%)] mb-2">
                    <strong className="text-[hsl(222,22%,15%)]">Privacy requests and questions:</strong> operations@screna.ai
                  </p>
                  <p className="text-[hsl(222,12%,45%)]">
                    <strong className="text-[hsl(222,22%,15%)]">Mailing address:</strong> 42 HANSOM RD, BASKING RIDGE, NJ 07920
                  </p>
                </div>

                <div className="pt-6 border-t border-[hsl(220,16%,90%)] mt-6">
                  <p className="text-xs text-[hsl(222,12%,55%)] text-center">
                    Last updated: 21st March, 2026
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
