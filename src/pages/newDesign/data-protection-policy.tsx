import { useEffect, useState } from 'react';
import { Footer } from '@/components/newDesign/home/footer';
import {Navbar} from '@/components/newDesign/home/navbar';
import { 
  Shield, 
  Lock, 
  Eye, 
  Database, 
  Users, 
  Server, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Key, 
  Globe,
  FileCheck,
  UserCheck,
  Trash2,
  RefreshCw,
  Building2,
  Briefcase
} from 'lucide-react';

export function DataProtectionPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    { id: 'purpose', title: 'Purpose', icon: FileText },
    { id: 'scope', title: 'Scope', icon: Globe },
    { id: 'definitions', title: 'Definitions', icon: BookOpen },
    { id: 'roles', title: 'Roles & Responsibilities', icon: Users },
    { id: 'principles', title: 'Data Protection Principles', icon: Shield },
    { id: 'classification', title: 'Data Classification', icon: Database },
    { id: 'lawful-basis', title: 'Lawful Basis', icon: FileCheck },
    { id: 'privacy-by-design', title: 'Privacy by Design', icon: Lock },
    { id: 'security', title: 'Security Controls', icon: Key },
    { id: 'retention', title: 'Data Retention', icon: Clock },
    { id: 'dsr', title: 'Data Subject Requests', icon: UserCheck },
    { id: 'sharing', title: 'Sharing Features', icon: Users },
    { id: 'vendors', title: 'Vendor Management', icon: Building2 },
    { id: 'incident', title: 'Incident Response', icon: AlertTriangle },
    { id: 'transfers', title: 'Cross-Border Transfers', icon: Globe },
    { id: 'training', title: 'Training & Awareness', icon: Briefcase },
    { id: 'compliance', title: 'Compliance & Audits', icon: FileCheck },
    { id: 'document', title: 'Document Control', icon: RefreshCw },
  ];

  return (
    <div className="min-h-screen bg-[hsl(220,20%,98%)] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-[107px]">
        {/* Hero header */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(221,91%,60%)]/[0.04] to-transparent pointer-events-none" />
          <div className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center relative">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] mb-5">
              Internal Policy
            </span>
            <h1 className="text-4xl lg:text-5xl text-[hsl(222,22%,15%)] mb-3 tracking-tight font-[family-name:var(--font-serif)]">
              Data Protection Policy
            </h1>
            <p className="text-lg text-[hsl(222,12%,45%)] max-w-lg mx-auto leading-relaxed">
              Principles, controls, and operating procedures for protecting personal data
            </p>
            <div className="flex flex-col items-center gap-2 mt-4 text-sm text-[hsl(222,12%,55%)]">
              <div className="flex items-center gap-2">
                <span>Effective: March 21, 2026</span>
                <span className="w-1 h-1 rounded-full bg-[hsl(222,12%,70%)]" />
                <span>Last Reviewed: March 21, 2026</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3" />
                <span>Review Frequency: At least annually</span>
              </div>
            </div>
          </div>
        </section>

        {/* Content area */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] shadow-sm overflow-hidden">
            <div className="p-8 md:p-10">
              <div className="prose prose-slate max-w-none">
                {/* Quick Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)] text-center">
                    <Shield className="w-5 h-5 text-[hsl(221,91%,60%)] mx-auto mb-2" />
                    <p className="text-xs text-[hsl(222,12%,55%)]">Privacy by Design</p>
                    <p className="text-lg font-semibold text-[hsl(222,22%,15%)]">Built-in</p>
                  </div>
                  <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)] text-center">
                    <Lock className="w-5 h-5 text-[hsl(221,91%,60%)] mx-auto mb-2" />
                    <p className="text-xs text-[hsl(222,12%,55%)]">Encryption</p>
                    <p className="text-lg font-semibold text-[hsl(222,22%,15%)]">In Transit & At Rest</p>
                  </div>
                  <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)] text-center">
                    <Trash2 className="w-5 h-5 text-[hsl(221,91%,60%)] mx-auto mb-2" />
                    <p className="text-xs text-[hsl(222,12%,55%)]">Auto-Deletion</p>
                    <p className="text-lg font-semibold text-[hsl(222,22%,15%)]">30-63 Days</p>
                  </div>
                  <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)] text-center">
                    <CheckCircle className="w-5 h-5 text-[hsl(221,91%,60%)] mx-auto mb-2" />
                    <p className="text-xs text-[hsl(222,12%,55%)]">Compliance</p>
                    <p className="text-lg font-semibold text-[hsl(222,22%,15%)]">GDPR / US State</p>
                  </div>
                </div>

                {/* Purpose */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[hsl(221,91%,60%)]" />
                    1) Purpose
                  </h2>
                  <p className="text-[hsl(222,12%,45%)] mb-4">
                    This Data Protection Policy ("Policy") establishes the principles, controls, and operating procedures 
                    Screna Tech Inc. ("Company") uses to protect personal data processed through Screna.ai and related services.
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-[hsl(222,12%,45%)]">
                    <li>Ensure privacy-by-design and security-by-design across the product lifecycle</li>
                    <li>Reduce risk of unauthorized access, disclosure, alteration, loss, or misuse of personal data</li>
                    <li>Support compliance with applicable privacy and security laws and contractual obligations</li>
                    <li>Define roles, responsibilities, and minimum operational standards</li>
                  </ul>
                </div>

                {/* Scope */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[hsl(221,91%,60%)]" />
                    2) Scope
                  </h2>
                  <p className="text-[hsl(222,12%,45%)] mb-4">This Policy applies to:</p>
                  <ul className="list-disc pl-6 space-y-2 text-[hsl(222,12%,45%)]">
                    <li>All Company personnel (employees, contractors, interns) and temporary staff</li>
                    <li>All Company systems, networks, endpoints, cloud environments, and third-party services used to process Company data</li>
                    <li>All personal data processed in connection with the Service, including audio/video recordings, transcripts, AI-generated evaluations, account data, and payment/subscription metadata</li>
                  </ul>
                </div>

                {/* Roles & Responsibilities */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[hsl(221,91%,60%)]" />
                    4) Roles and Responsibilities
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-[hsl(221,91%,60%)]" />
                        <h3 className="font-semibold text-[hsl(222,22%,15%)]">Data Protection Lead</h3>
                      </div>
                      <ul className="text-xs text-[hsl(222,12%,55%)] space-y-1 list-disc pl-4">
                        <li>Privacy governance & policy updates</li>
                        <li>DPIAs & vendor privacy reviews</li>
                        <li>DSR handling & ROPA maintenance</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-[hsl(221,91%,60%)]" />
                        <h3 className="font-semibold text-[hsl(222,22%,15%)]">Security Lead</h3>
                      </div>
                      <ul className="text-xs text-[hsl(222,12%,55%)] space-y-1 list-disc pl-4">
                        <li>Security controls & monitoring</li>
                        <li>Vulnerability management</li>
                        <li>Incident response execution</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-[hsl(221,91%,60%)]" />
                        <h3 className="font-semibold text-[hsl(222,22%,15%)]">Engineering</h3>
                      </div>
                      <ul className="text-xs text-[hsl(222,12%,55%)] space-y-1 list-disc pl-4">
                        <li>Privacy-by-design controls</li>
                        <li>Secure SDLC & access controls</li>
                        <li>Encryption & deletion workflows</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-[hsl(220,20%,98%)] rounded-xl border border-[hsl(220,16%,90%)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-[hsl(221,91%,60%)]" />
                        <h3 className="font-semibold text-[hsl(222,22%,15%)]">Support & Operations</h3>
                      </div>
                      <ul className="text-xs text-[hsl(222,12%,55%)] space-y-1 list-disc pl-4">
                        <li>User support & DSR escalation</li>
                        <li>Least-privilege access</li>
                        <li>Audit trails & secure workflows</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Data Classification */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-[hsl(221,91%,60%)]" />
                    6) Data Categories and Classification
                  </h2>
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full border border-[hsl(222,15%,88%)] text-sm rounded-xl">
                      <thead className="bg-[hsl(222,15%,96%)]">
                        <tr>
                          <th className="border border-[hsl(222,15%,88%)] px-4 py-2 text-left">Classification</th>
                          <th className="border border-[hsl(222,15%,88%)] px-4 py-2 text-left">Description</th>
                          <th className="border border-[hsl(222,15%,88%)] px-4 py-2 text-left">Examples</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-green-600">Public</td>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2">Approved for public release</td>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2">Marketing materials, public documentation</td>
                        </tr>
                        <tr>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-blue-600">Internal</td>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2">Non-public business info</td>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2">Internal policies, roadmaps</td>
                        </tr>
                        <tr>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-orange-600">Confidential</td>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2">Personal data, security info</td>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2">Account data, transcripts, AI scores</td>
                        </tr>
                        <tr>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2 font-medium text-red-600">Restricted</td>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2">Highest sensitivity</td>
                          <td className="border border-[hsl(222,15%,88%)] px-4 py-2">Raw audio/video recordings, credentials</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-[hsl(220,20%,98%)] rounded-xl p-4 border-l-4 border-l-red-500">
                    <p className="text-sm text-[hsl(222,12%,45%)]">
                      <strong className="text-[hsl(222,22%,15%)]">Default rule:</strong> Raw audio/video recordings are classified as Restricted.
                    </p>
                  </div>
                </div>

                {/* Security Controls */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-[hsl(221,91%,60%)]" />
                    9) Security Controls (Minimum Baseline)
                  </h2>
                  <div className="space-y-4">
                    <div className="p-4 border border-[hsl(220,16%,90%)] rounded-xl">
                      <h3 className="font-semibold text-[hsl(222,22%,15%)] mb-2">Access Controls</h3>
                      <ul className="list-disc pl-5 text-sm text-[hsl(222,12%,45%)] space-y-1">
                        <li>Role-based access control (RBAC) with least privilege</li>
                        <li>MFA required for all admin accounts and critical services</li>
                        <li>Quarterly access reviews for sensitive systems</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-[hsl(220,16%,90%)] rounded-xl">
                      <h3 className="font-semibold text-[hsl(222,22%,15%)] mb-2">Encryption</h3>
                      <ul className="list-disc pl-5 text-sm text-[hsl(222,12%,45%)] space-y-1">
                        <li>Encrypt data in transit (TLS) and at rest (AES-256)</li>
                        <li>Restricted data uses strong encryption at rest</li>
                        <li>Secrets managed via dedicated secrets manager</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-[hsl(220,16%,90%)] rounded-xl">
                      <h3 className="font-semibold text-[hsl(222,22%,15%)] mb-2">Logging & Monitoring</h3>
                      <ul className="list-disc pl-5 text-sm text-[hsl(222,12%,45%)] space-y-1">
                        <li>Log access to Restricted data (who/when/what)</li>
                        <li>Monitor for anomalous access patterns</li>
                        <li>Retain security logs for at least 30 days</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Data Retention */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[hsl(221,91%,60%)]" />
                    10) Data Retention and Deletion
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-[hsl(220,20%,98%)] rounded-lg">
                      <p className="text-xs font-medium text-[hsl(222,12%,55%)]">Audio/Video Recordings</p>
                      <p className="text-sm text-[hsl(222,22%,15%)] font-semibold">Until user deletes or 30 days</p>
                    </div>
                    <div className="p-3 bg-[hsl(220,20%,98%)] rounded-lg">
                      <p className="text-xs font-medium text-[hsl(222,12%,55%)]">Backups</p>
                      <p className="text-sm text-[hsl(222,22%,15%)] font-semibold">Expire within 63 days</p>
                    </div>
                    <div className="p-3 bg-[hsl(220,20%,98%)] rounded-lg">
                      <p className="text-xs font-medium text-[hsl(222,12%,55%)]">Account Deletion</p>
                      <p className="text-sm text-[hsl(222,22%,15%)] font-semibold">63 days max retention</p>
                    </div>
                  </div>
                </div>

                {/* Incident Response */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[hsl(221,91%,60%)]" />
                    14) Incident Response and Breach Notification
                  </h2>
                  <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5">
                    <p className="text-sm text-[hsl(222,12%,45%)] mb-3">
                      <strong className="text-[hsl(222,22%,15%)]">Reporting:</strong> All suspected incidents must be reported immediately to:
                    </p>
                    <div className="space-y-1 mb-4">
                      <p className="text-sm font-mono text-[hsl(221,91%,60%)]">andysim3d@gmail.com</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-[hsl(222,22%,15%)] mb-2">Response Steps:</p>
                        <ul className="list-disc pl-5 text-xs text-[hsl(222,12%,55%)] space-y-1">
                          <li>Triage and contain</li>
                          <li>Preserve evidence</li>
                          <li>Assess scope and risk</li>
                          <li>Remediate and patch</li>
                          <li>Notify affected parties</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[hsl(222,22%,15%)] mb-2">Timing:</p>
                        <ul className="list-disc pl-5 text-xs text-[hsl(222,12%,55%)] space-y-1">
                          <li>GDPR: Notify regulators within 72 hours</li>
                          <li>Other jurisdictions: Without unreasonable delay</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Training */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[hsl(221,91%,60%)]" />
                    16) Training and Awareness
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    <div className="px-3 py-2 bg-[hsl(220,20%,98%)] rounded-lg border border-[hsl(220,16%,90%)]">
                      <p className="text-sm text-[hsl(222,12%,45%)]">Mandatory onboarding training</p>
                    </div>
                    <div className="px-3 py-2 bg-[hsl(220,20%,98%)] rounded-lg border border-[hsl(220,16%,90%)]">
                      <p className="text-sm text-[hsl(222,12%,45%)]">Annual refresher training</p>
                    </div>
                    <div className="px-3 py-2 bg-[hsl(220,20%,98%)] rounded-lg border border-[hsl(220,16%,90%)]">
                      <p className="text-sm text-[hsl(222,12%,45%)]">Role-specific security training</p>
                    </div>
                  </div>
                </div>

                {/* Appendix C - Audio/Video Controls */}
                <div className="mt-8 pt-6 border-t border-[hsl(220,16%,90%)]">
                  <h2 className="text-xl font-semibold text-[hsl(222,22%,15%)] mb-4">
                    Appendix C — Minimum Security Controls for Audio/Video Recordings
                  </h2>
                  <div className="bg-[hsl(220,20%,98%)] rounded-xl p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <ul className="space-y-2 text-sm text-[hsl(222,12%,45%)]">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>Classified as Restricted</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>Stored with strict IAM policies</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>Access logged and monitored</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>No direct public URLs by default</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <ul className="space-y-2 text-sm text-[hsl(222,12%,45%)]">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>Expiring signed URLs for playback</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>Optional watermarking for shares</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>Automated deletion workflows</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span>Backup expiry enforcement</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-[hsl(220,16%,90%)]">
                  <p className="text-xs text-[hsl(222,12%,55%)] text-center">
                    Effective: March 21, 2026 | Last Reviewed: March 21, 2026
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

// Helper component for BookOpen icon (since it wasn't imported)
function BookOpen({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}