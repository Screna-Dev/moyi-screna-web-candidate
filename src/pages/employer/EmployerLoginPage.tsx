import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { mockCompanies } from '@/components/admin/console/pages/employer/mockData';
import { Button, Field, TextInput, cx } from '@/components/admin/console/pages/employer/ui';
import {
  checkCompanyEmail,
  companyNameFromDomain,
  getEmployerSession,
  getKnownProfile,
  rememberProfile,
  requestCode,
  saveEmployerSession,
  verifyCode,
  type EmployerProfile,
} from './employerAuth';

// /employer/login — the employer side has its own sign-in, separate from the
// candidate /auth page. No Google: employers prove who they are with a company
// email and a one-time code. First sign-in for an address also asks for name,
// title and company (copy from the Figma company-profile "Hiring contact"
// block); returning addresses go straight to the dashboard.

type Step = 'email' | 'code' | 'profile';

// Seeded mock employers sign straight in so the demo data is reachable.
function seededProfile(email: string): EmployerProfile | null {
  const c = mockCompanies.find((m) => m.contact.email.toLowerCase() === email);
  return c ? { name: c.contact.name, title: c.contact.title, companyName: c.name } : null;
}

export function EmployerLoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [domain, setDomain] = useState('');
  const [code, setCode] = useState('');
  const [profile, setProfile] = useState<EmployerProfile>({ name: '', title: '', companyName: '' });
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (getEmployerSession()) navigate('/employer', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const normalizedEmail = email.trim().toLowerCase();

  const finish = (p: EmployerProfile) => {
    saveEmployerSession({ email: normalizedEmail, domain, ...p, signedInAt: new Date().toISOString() });
    navigate('/employer', { replace: true });
  };

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    const check = checkCompanyEmail(email);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy(true);
    try {
      await requestCode(normalizedEmail);
      setDomain(check.domain);
      setCode('');
      setStep('code');
      setCooldown(30);
    } catch {
      setError('We couldn’t send a code right now. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const ok = await verifyCode(normalizedEmail, code);
      if (!ok) {
        setError('That code is incorrect or has expired.');
        return;
      }
      const known = getKnownProfile(normalizedEmail) ?? seededProfile(normalizedEmail);
      if (known) {
        finish(known);
        return;
      }
      setProfile({ name: '', title: '', companyName: companyNameFromDomain(domain) });
      setStep('profile');
    } finally {
      setBusy(false);
    }
  };

  const submitProfile = (e: FormEvent) => {
    e.preventDefault();
    const p = { name: profile.name.trim(), title: profile.title.trim(), companyName: profile.companyName.trim() };
    if (!p.name || !p.title || !p.companyName) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!authorized) {
      setError('Please confirm you are authorized to represent this company.');
      return;
    }
    rememberProfile(normalizedEmail, p);
    finish(p);
  };

  return (
    <div className="min-h-screen flex bg-[#f9fafb] font-['Inter',sans-serif]">
      {/* Brand panel — colors and copy from the landing CTA block (Figma 2004:1655). */}
      <aside className="hidden lg:flex w-[46%] max-w-[640px] flex-col justify-between p-12 text-white bg-[linear-gradient(135deg,#2E5BFF_0%,#1E3FCC_100%)]">
        <Link to="/" className="flex items-center gap-2.5 w-fit">
          <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <Building2 size={17} />
          </span>
          <span className="text-[18px] font-bold">Screna</span>
          <span className="text-[11px] uppercase tracking-[0.08em] bg-white/15 rounded-full px-2 py-0.5">Employers</span>
        </Link>
        <div className="flex flex-col gap-5">
          <h1 className="text-[44px] leading-[1.1] font-bold font-[family-name:var(--font-serif)]">Ready to see more than a résumé?</h1>
          <p className="text-[16px] leading-6 text-white/80 max-w-[440px]">
            Publish a structured interview, review candidates as they apply, and connect with the people you want to move forward.
          </p>
        </div>
        <p className="text-[12px] text-white/55">Employer accounts require a verified company email.</p>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 lg:px-12 h-[72px]">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-[#5a6172] hover:text-[#1e232f]">
            <ArrowLeft size={15} /> Back to Screna
          </Link>
          <Link to="/auth" className="text-[13px] text-[#5a6172] hover:text-[#1e232f]">
            Looking for a job? <span className="text-[#3c77f6] font-medium">Candidate log in</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-16">
          <div className="w-full max-w-[420px] bg-white border border-[#e1e4ea] rounded-2xl p-8 shadow-[0px_8px_24px_rgba(0,0,0,0.04)]">
            {step === 'email' && (
              <form onSubmit={sendCode} className="flex flex-col gap-5" noValidate>
                <Header icon={<Building2 size={20} />} title="Employer log in" subtitle="Sign in or create an employer account with your company email." />
                <Field label="Work email" required>
                  <TextInput
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="you@company.com"
                  />
                </Field>
                <ErrorText error={error} />
                <SubmitButton busy={busy}>Continue</SubmitButton>
                <p className="text-[12px] leading-[18px] text-[#5a6172]">
                  Personal email addresses (Gmail, Outlook, Yahoo, iCloud, QQ, etc.) can’t be used. We’ll send a one-time code to verify you work at this company.
                </p>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={submitCode} className="flex flex-col gap-5" noValidate>
                <Header
                  icon={<Mail size={20} />}
                  title="Check your email"
                  subtitle={
                    <>
                      We sent a 6-digit code to <span className="font-medium text-[#1e232f]">{normalizedEmail}</span>.
                    </>
                  }
                />
                <Field label="Verification code" required>
                  <TextInput
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setError('');
                    }}
                    placeholder="000000"
                    className="tracking-[0.4em] text-center text-[18px]"
                  />
                </Field>
                <ErrorText error={error} />
                <SubmitButton busy={busy}>Verify and continue</SubmitButton>
                <div className="flex items-center justify-between text-[13px]">
                  <button
                    type="button"
                    className="text-[#5a6172] hover:text-[#1e232f]"
                    onClick={() => {
                      setStep('email');
                      setError('');
                    }}
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    disabled={cooldown > 0 || busy}
                    onClick={() => sendCode()}
                    className="text-[#3c77f6] font-medium disabled:text-[#9ba1b0]"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}

            {step === 'profile' && (
              <form onSubmit={submitProfile} className="flex flex-col gap-5" noValidate>
                <Header
                  icon={<ShieldCheck size={20} />}
                  title="Set up your employer account"
                  subtitle="This information is used for account and hiring communication. It will not be shown publicly to candidates."
                />
                <Field label="Contact name" required>
                  <TextInput autoFocus value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Alex Johnson" />
                </Field>
                <Field label="Job title" required>
                  <TextInput value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} placeholder="Hiring Manager" />
                </Field>
                <Field label="Company name" required>
                  <TextInput value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} placeholder="Lumen Metrics" />
                </Field>
                <label className="flex items-start gap-2.5 text-[13px] leading-5 text-[#1e232f] cursor-pointer">
                  <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="mt-0.5 accent-[#3c77f6]" />
                  I confirm that I am authorized to represent this company and publish jobs on its behalf.
                </label>
                <ErrorText error={error} />
                <SubmitButton busy={false}>Create employer account</SubmitButton>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Header({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="w-10 h-10 rounded-xl bg-[#eef4ff] text-[#3c77f6] flex items-center justify-center">{icon}</span>
      <div className="flex flex-col gap-1">
        <h2 className="text-[24px] font-bold leading-8 text-[#1e232f] font-[family-name:var(--font-serif)]">{title}</h2>
        <p className="text-[14px] leading-5 text-[#5a6172]">{subtitle}</p>
      </div>
    </div>
  );
}

function ErrorText({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-[13px] leading-5 text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3 py-2 -mt-2">
      {error}
    </p>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <Button type="submit" variant="primary" disabled={busy} className={cx('w-full !py-2.5')}>
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </Button>
  );
}
