import { useEffect } from 'react';
import { Footer } from '@/components/newDesign/home/footer';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Cookie, Shield, Settings, BarChart3, AlertCircle, ExternalLink } from 'lucide-react';

export function CookiePolicy() {
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
              Cookie Policy
            </h1>
            <p className="text-lg text-[hsl(222,12%,45%)] max-w-lg mx-auto leading-relaxed">
              How we use cookies and similar technologies
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
                  This Cookie Policy explains how Screna Tech Inc. ("Company," "we," "us") uses cookies and similar technologies 
                  (collectively, "Cookies") on https://www.screna.ai/ and any related applications or services that link to this 
                  Cookie Policy (the "Service").
                </p>

                <p className="text-[hsl(222,12%,45%)] mb-8">
                  This Cookie Policy should be read together with our Privacy Policy and Terms of Service.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)] text-center">
                    <Cookie className="w-6 h-6 text-[hsl(221,91%,60%)] mx-auto mb-2" />
                    <p className="text-xs text-[hsl(222,12%,55%)]">Essential for service functionality</p>
                  </div>
                  <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)] text-center">
                    <BarChart3 className="w-6 h-6 text-[hsl(221,91%,60%)] mx-auto mb-2" />
                    <p className="text-xs text-[hsl(222,12%,55%)]">Analytics with PostHog</p>
                  </div>
                  <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)] text-center">
                    <Settings className="w-6 h-6 text-[hsl(221,91%,60%)] mx-auto mb-2" />
                    <p className="text-xs text-[hsl(222,12%,55%)]">Customizable preferences</p>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">1) What Are Cookies and Similar Technologies?</h2>
                <p className="text-[hsl(222,12%,45%)] mb-4">
                  Cookies are small text files placed on your device when you visit a website. We may also use similar technologies, including:
                </p>
                <ul className="list-disc pl-6 mb-8 space-y-2 text-[hsl(222,12%,45%)]">
                  <li>Local storage / session storage (browser-based storage)</li>
                  <li>SDKs (in mobile or desktop apps, if applicable)</li>
                  <li>Pixels/tags (small code snippets that send events)</li>
                  <li>Device identifiers (where applicable)</li>
                  <li>Server logs (e.g., IP address, request metadata)</li>
                </ul>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">2) Why We Use Cookies</h2>
                
                <div className="space-y-6 mb-8">
                  <div className="border-l-4 border-l-[hsl(221,91%,60%)] pl-4">
                    <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-2">A. Strictly Necessary Cookies</h3>
                    <p className="text-[hsl(222,12%,45%)] text-sm">
                      These Cookies are required for the Service to function and cannot be turned off. They are set in response to 
                      actions you take, such as logging in, saving privacy preferences, or requesting secure areas of the Service.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-[hsl(220,20%,96%)] rounded-md text-[hsl(222,12%,55%)]">Authentication</span>
                      <span className="text-xs px-2 py-1 bg-[hsl(220,20%,96%)] rounded-md text-[hsl(222,12%,55%)]">Security</span>
                      <span className="text-xs px-2 py-1 bg-[hsl(220,20%,96%)] rounded-md text-[hsl(222,12%,55%)]">Session management</span>
                    </div>
                  </div>

                  <div className="border-l-4 border-l-[hsl(221,91%,60%)] pl-4">
                    <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-2">B. Functional Cookies</h3>
                    <p className="text-[hsl(222,12%,45%)] text-sm">
                      These Cookies enable the Service to provide enhanced functionality and personalization, such as remembering 
                      your settings and preferences.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-[hsl(220,20%,96%)] rounded-md text-[hsl(222,12%,55%)]">UI preferences</span>
                      <span className="text-xs px-2 py-1 bg-[hsl(220,20%,96%)] rounded-md text-[hsl(222,12%,55%)]">Language settings</span>
                      <span className="text-xs px-2 py-1 bg-[hsl(220,20%,96%)] rounded-md text-[hsl(222,12%,55%)]">Theme preferences</span>
                    </div>
                  </div>

                  <div className="border-l-4 border-l-[hsl(221,91%,60%)] pl-4">
                    <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-2">C. Analytics Cookies (PostHog)</h3>
                    <p className="text-[hsl(222,12%,45%)] text-sm">
                      We use PostHog to understand how users interact with the Service (feature usage, page views, performance events) 
                      so we can improve functionality and reliability. PostHog may use cookies and/or localStorage to persist identifiers 
                      and analytics preferences.
                    </p>
                  </div>

                  <div className="border-l-4 border-l-[hsl(222,12%,70%)] pl-4 opacity-75">
                    <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-2">D. Advertising / Targeting Cookies</h3>
                    <p className="text-[hsl(222,12%,45%)] text-sm">
                      We do not use Cookies for cross-context behavioral advertising or targeted advertising. If we introduce advertising 
                      in the future, we will update this Cookie Policy and provide appropriate controls.
                    </p>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">3) Cookie List</h2>
                <div className="overflow-x-auto mb-8">
                  <table className="min-w-full border border-[hsl(222,15%,88%)] text-sm rounded-xl">
                    <thead className="bg-[hsl(222,15%,96%)]">
                      <tr>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Cookie Name</th>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Provider</th>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Purpose</th>
                        <th className="border border-[hsl(222,15%,88%)] px-4 py-3 text-left font-semibold text-[hsl(222,22%,15%)]">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-mono text-xs text-[hsl(222,22%,15%)]">session_id</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Screna.ai</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Maintains login session</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Session</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-mono text-xs text-[hsl(222,22%,15%)]">cookie_consent</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Screna.ai</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Stores cookie preferences</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">6-12 months</td>
                      </tr>
                      <tr>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-mono text-xs text-[hsl(222,22%,15%)]">ph_*_posthog</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">PostHog</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Analytics identifier</td>
                        <td className="border border-[hsl(222,15%,88%)] px-4 py-2 text-[hsl(222,12%,45%)]">Up to 365 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">4) Your Choices and How to Control Cookies</h2>
                
                <div className="space-y-6 mb-8">
                  <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-[hsl(221,91%,60%)] mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-[hsl(222,22%,15%)] mb-2">Cookie Banner / Preference Center</h3>
                        <p className="text-sm text-[hsl(222,12%,45%)]">
                          You can manage your Cookie preferences using our cookie banner or cookie settings tool. 
                          You can change your preferences at any time.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <Settings className="w-5 h-5 text-[hsl(221,91%,60%)] mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-[hsl(222,22%,15%)] mb-2">Browser Controls</h3>
                        <p className="text-sm text-[hsl(222,12%,45%)]">
                          Most browsers allow you to control cookies through settings (deleting cookies, blocking third-party cookies, 
                          blocking all cookies). If you disable cookies, certain features may not work properly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <BarChart3 className="w-5 h-5 text-[hsl(221,91%,60%)] mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-[hsl(222,22%,15%)] mb-2">Analytics Opt-Out</h3>
                        <p className="text-sm text-[hsl(222,12%,45%)]">
                          If you reject Analytics Cookies, we will not use PostHog analytics in a way that stores analytics identifiers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[hsl(221,91%,60%)]/5 rounded-xl p-5 mb-8 border border-[hsl(221,91%,60%)]/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[hsl(221,91%,60%)] mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-[hsl(222,22%,15%)] mb-2">Global Privacy Control (GPC)</h3>
                      <p className="text-sm text-[hsl(222,12%,45%)]">
                        Some browsers offer Global Privacy Control signals. Where applicable law requires, we treat GPC as a request 
                        to opt out of certain data uses.
                      </p>
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mt-8 mb-4">5) Contact Us</h2>
                <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5 mb-8">
                  <p className="text-[hsl(222,12%,45%)] mb-2">
                    If you have questions about this Cookie Policy or our use of Cookies:
                  </p>
                  <p className="text-[hsl(222,12%,45%)] mb-1">
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