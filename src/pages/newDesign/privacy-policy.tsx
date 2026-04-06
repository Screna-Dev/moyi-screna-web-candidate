import { useEffect } from 'react';
import { Footer } from '@/components/newDesign/home/footer';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Shield, Lock, Eye, Database, Server, Users } from 'lucide-react';

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
              How we collect, use, and protect your information
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-[hsl(222,12%,55%)]">
              <span>Effective: March 21, 2026</span>
              <span className="w-1 h-1 rounded-full bg-[hsl(222,12%,70%)]" />
              <span>Last Updated: March 21, 2026</span>
            </div>
          </div>
        </section>

        {/* Content area */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] shadow-sm overflow-hidden">
            <div className="p-8 md:p-10">
              <div className="prose prose-slate max-w-none">
                <p className="text-[hsl(222,12%,45%)] mb-6">
                  Screna Tech Inc. ("Company," "we," "us") provides the services available at https://www.screna.ai/ 
                  and affiliated applications, communications, and other instances where we link to this Privacy Policy 
                  (collectively, the "Services").
                </p>

                <p className="text-[hsl(222,12%,45%)] mb-8">
                  This Privacy Policy explains how we process personal data when providing the Services. Any capitalized 
                  term not defined here has the meaning in our Terms of Service. As used in this Policy, "including" 
                  means "including but not limited to."
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)]">
                    <Shield className="w-5 h-5 text-[hsl(221,91%,60%)] mb-3" />
                    <h3 className="font-semibold text-[hsl(222,22%,15%)] mb-1">Data Controller</h3>
                    <p className="text-sm text-[hsl(222,12%,45%)]">Screna Tech Inc.</p>
                    <p className="text-sm text-[hsl(222,12%,45%)] mt-2">operations@screna.ai</p>
                    <p className="text-sm text-[hsl(222,12%,45%)]">42 HANSOM RD, BASKING RIDGE, NJ 07920</p>
                  </div>
                  <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)]">
                    <Lock className="w-5 h-5 text-[hsl(221,91%,60%)] mb-3" />
                    <h3 className="font-semibold text-[hsl(222,22%,15%)] mb-1">Data Protection</h3>
                    <p className="text-sm text-[hsl(222,12%,45%)]">We use industry-standard security measures</p>
                    <p className="text-sm text-[hsl(222,12%,45%)] mt-2">Encryption in transit and at rest</p>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">1) Personal Data We Process and How We Use It</h2>
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  We process personal data to provide the Services (e.g., running mock interviews, generating transcripts, 
                  and delivering AI-based feedback). The personal data we collect varies depending on how you use the Services.
                </p>
                <p className="text-[hsl(222,12%,45%)] mb-8">
                  You are not required to provide personal data, but if you do not provide certain data, we may be unable 
                  to provide parts of the Services (for example, we cannot generate interview feedback without your interview inputs).
                </p>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">2) Categories of Personal Data We Collect</h2>
                <div className="overflow-x-auto mb-8">
                  <table className="min-w-full border border-[hsl(222,15%,88%)] text-sm rounded-xl">
                    <thead className="bg-[hsl(222,15%,96%)]">
                      <tr>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Personal Data Category</th>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Examples</th>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Legal Categories</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Account & Profile Information</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Name, email, password, username, preferences</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Identifiers; account data</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Interview Content & Files</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Video/audio recordings, uploaded resumes</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Audio/visual information; user content</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Transcripts & Derived Outputs</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Transcripts, scores, feedback reports</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Inferences; profiling/derived data</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-[hsl(222,22%,15%)]">Usage & Device Data</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">IP address, browser type, feature usage</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Internet activity; identifiers</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5 mb-8 border-l-4 border-l-[hsl(221,91%,60%)]">
                  <p className="text-sm text-[hsl(222,12%,45%)]">
                    <strong className="text-[hsl(222,22%,15%)]">Important note about audio/video:</strong> We do not use your audio/video 
                    to identify you as a unique person (no face/voice recognition for identity verification). We process audio/video 
                    solely to provide interview functionality (recording, playback, transcription, feedback).
                  </p>
                </div>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">3) How We Use Personal Data</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {[
                    { icon: Server, title: "Provide Services", desc: "Run mock interviews, generate transcripts, deliver feedback" },
                    { icon: Users, title: "Personalization", desc: "Recommend practice plans, improve rubrics, optimize performance" },
                    { icon: Eye, title: "Customer Support", desc: "Answer requests, troubleshoot, communicate with you" },
                    { icon: Database, title: "Security & Safety", desc: "Prevent fraud/abuse, enforce Terms, protect users" }
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)]">
                      <item.icon className="w-4 h-4 text-[hsl(221,91%,60%)] mb-2" />
                      <h4 className="font-medium text-[hsl(222,22%,15%)] mb-1">{item.title}</h4>
                      <p className="text-xs text-[hsl(222,12%,55%)]">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">4) AI Features and Automated Processing</h2>
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  The Services may offer AI features that generate content such as: interview feedback, summaries, suggested answers, 
                  question banks, and coaching plans ("AI Outputs").
                </p>
                <ul className="list-disc pl-6 mb-8 space-y-2 text-[hsl(222,12%,45%)]">
                  <li><strong>Inputs to AI:</strong> your interview responses, prompts, uploaded materials, transcripts, and recordings</li>
                  <li><strong>Outputs:</strong> AI-generated analyses, scores, and recommendations</li>
                  <li><strong>Human review:</strong> we may review limited data for quality assurance and support</li>
                  <li><strong>Model training:</strong> we do not use your audio/video recordings to train foundation models</li>
                </ul>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">5) Your Rights and Choices</h2>
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  Depending on your location, you may have rights to:
                </p>
                <ul className="list-disc pl-6 mb-6 space-y-2 text-[hsl(222,12%,45%)]">
                  <li>Access, correct, or delete personal data</li>
                  <li>Object to or restrict processing</li>
                  <li>Data portability</li>
                  <li>Withdraw consent (where processing is based on consent)</li>
                </ul>
                <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5 mb-8">
                  <p className="text-sm text-[hsl(222,12%,45%)] mb-2">
                    <strong className="text-[hsl(222,22%,15%)]">How to exercise your rights:</strong>
                  </p>
                  <p className="text-sm text-[hsl(221,91%,60%)] font-mono">Attorney@tslawfirm.co</p>
                </div>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">6) Contact Us</h2>
                <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5 mb-8">
                  <p className="text-[hsl(222,12%,45%)] mb-2">
                    <strong className="text-[hsl(222,22%,15%)]">Email:</strong> operations@screna.ai
                  </p>
                  <p className="text-[hsl(222,12%,45%)]">
                    <strong className="text-[hsl(222,22%,15%)]">Address:</strong> 42 HANSOM RD, BASKING RIDGE, NJ 07920
                  </p>
                </div>

                <div className="pt-6 border-t border-[hsl(220,16%,90%)] mt-6">
                  <p className="text-xs text-[hsl(222,12%,55%)] text-center">
                    Last updated: March 21, 2026
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