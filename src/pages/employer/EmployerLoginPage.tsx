import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { Button, Field, TextInput, cx } from '@/components/admin/console/pages/employer/ui';
import {
  AUTH_EMAIL_ALREADY_REGISTERED,
  AUTH_EMAIL_NOT_CORPORATE,
  AUTH_EMAIL_NOT_VERIFIED,
  AUTH_WRONG_ACCOUNT_TYPE,
  authErrorCode,
  authErrorMessage,
  checkCompanyEmail,
  companyNameFromDomain,
  getEmployerSession,
  getKnownProfile,
  passwordProblems,
  rememberProfile,
  resendEmployerCode,
  saveEmployerSession,
  signInEmployer,
  signUpEmployer,
  tokenClaims,
  verifyEmployerEmail,
} from './employerAuth';

// /employer/login — the employer side has its own sign-in, separate from the
// candidate /auth page. No Google: employers use a company email + password,
// and new accounts confirm the email with a 6-digit code before signing in.

type Step = 'signin' | 'signup' | 'verify';

export function EmployerLoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<ReactNode>('');
  const [info, setInfo] = useState('');
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

  const switchTo = (next: Step) => {
    setStep(next);
    setError('');
    setInfo('');
  };

  const goVerify = async (resend: boolean) => {
    setCode('');
    setStep('verify');
    if (resend) {
      try {
        await resendEmployerCode(normalizedEmail);
      } catch {
        /* the code step has its own resend button */
      }
    }
    setCooldown(30);
  };

  const signIn = async () => {
    const { accessToken, refreshToken, isFirstLogin } = await signInEmployer(normalizedEmail, password);
    const claims = tokenClaims(accessToken);
    const known = getKnownProfile(normalizedEmail);
    const domain = normalizedEmail.split('@')[1] ?? '';
    saveEmployerSession({
      email: normalizedEmail,
      domain,
      name: known?.name || claims.name || normalizedEmail.split('@')[0],
      title: known?.title ?? '',
      companyName: known?.companyName || companyNameFromDomain(domain),
      signedInAt: new Date().toISOString(),
      accessToken,
      refreshToken,
    });
    navigate('/employer', { replace: true, state: { firstLogin: isFirstLogin } });
  };

  const submitSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!normalizedEmail || !password) {
      setError('Enter your work email and password.');
      return;
    }
    setBusy(true);
    try {
      await signIn();
    } catch (err) {
      const code = authErrorCode(err);
      if (code === AUTH_EMAIL_NOT_VERIFIED) {
        setInfo('Your email isn’t verified yet. We sent you a new code.');
        await goVerify(true);
      } else if (code === AUTH_WRONG_ACCOUNT_TYPE) {
        setError(
          <>
            This is a candidate account.{' '}
            <Link to="/auth" className="font-medium underline">
              Go to candidate log in
            </Link>
          </>,
        );
      } else if (code === 'UNAUTHORIZED') {
        setError('Incorrect email or password.');
      } else {
        setError(authErrorMessage(err) || 'We couldn’t sign you in right now. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const p = { name: name.trim(), companyName: companyName.trim() };
    if (!p.name || !p.companyName || !normalizedEmail || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    const check = checkCompanyEmail(email);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    const problems = passwordProblems(password);
    if (problems.length) {
      setError(`Password needs ${problems.join(', ')}.`);
      return;
    }
    if (!authorized) {
      setError('Please confirm you are authorized to represent this company.');
      return;
    }
    setBusy(true);
    try {
      await signUpEmployer({ email: normalizedEmail, password, ...p });
      rememberProfile(normalizedEmail, { ...p, title: '' });
      setInfo('');
      await goVerify(false);
    } catch (err) {
      const code = authErrorCode(err);
      if (code === AUTH_EMAIL_ALREADY_REGISTERED) {
        // Keep email + password so they just press "Log in".
        setStep('signin');
        setInfo('This email already has a Screna account. Log in instead.');
      } else if (code === AUTH_EMAIL_NOT_CORPORATE) {
        setError('Please use your company email. Personal and disposable addresses can’t be used for employer accounts.');
      } else {
        setError(authErrorMessage(err) || 'We couldn’t create your account right now. Please try again.');
      }
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
      await verifyEmployerEmail(normalizedEmail, code);
    } catch (err) {
      setError(authErrorMessage(err) || 'That code is incorrect or has expired.');
      setBusy(false);
      return;
    }
    try {
      // The password is still in memory from signup/signin, so finish signing in.
      await signIn();
    } catch {
      setStep('signin');
      setInfo('Email verified. Log in to continue.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    setBusy(true);
    try {
      await resendEmployerCode(normalizedEmail);
      setCooldown(30);
      setInfo('We sent a new code.');
    } catch (err) {
      setError(authErrorMessage(err) || 'We couldn’t resend the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const passwordInput = (autoComplete: string) => (
    <div className="relative">
      <TextInput
        type={showPassword ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError('');
        }}
        placeholder={autoComplete === 'new-password' ? '8–16 characters' : 'Your password'}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ba1b0] hover:text-[#5a6172]"
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  const emailInput = (
    <TextInput
      type="email"
      autoComplete="email"
      value={email}
      onChange={(e) => {
        setEmail(e.target.value);
        setError('');
      }}
      placeholder="you@company.com"
    />
  );

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
            {step === 'signin' && (
              <form onSubmit={submitSignIn} className="flex flex-col gap-5" noValidate>
                <Header icon={<Building2 size={20} />} title="Employer log in" subtitle="Sign in with your company email." />
                <InfoText info={info} />
                <Field label="Work email" required>
                  {emailInput}
                </Field>
                <Field label="Password" required>
                  {passwordInput('current-password')}
                </Field>
                <ErrorText error={error} />
                <SubmitButton busy={busy}>Log in</SubmitButton>
                <p className="text-[13px] text-[#5a6172] text-center">
                  New to Screna?{' '}
                  <button type="button" onClick={() => switchTo('signup')} className="text-[#3c77f6] font-medium hover:underline">
                    Create an employer account
                  </button>
                </p>
              </form>
            )}

            {step === 'signup' && (
              <form onSubmit={submitSignUp} className="flex flex-col gap-5" noValidate>
                <Header
                  icon={<Building2 size={20} />}
                  title="Create an employer account"
                  subtitle="Free to start: 20 report unlocks and 10 sponsored interviews once your email is verified."
                />
                <Field label="Your name" required>
                  <TextInput autoFocus autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Johnson" />
                </Field>
                <Field label="Company name" required>
                  <TextInput autoComplete="organization" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Lumen Metrics" />
                </Field>
                <Field label="Work email" required>
                  {emailInput}
                </Field>
                <Field label="Password" required>
                  {passwordInput('new-password')}
                </Field>
                <p className="-mt-3 text-[12px] leading-[18px] text-[#5a6172]">8–16 characters with an uppercase letter, a lowercase letter, a number and a special character.</p>
                <label className="flex items-start gap-2.5 text-[13px] leading-5 text-[#1e232f] cursor-pointer">
                  <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="mt-0.5 accent-[#3c77f6]" />
                  I confirm that I am authorized to represent this company and publish jobs on its behalf.
                </label>
                <ErrorText error={error} />
                <SubmitButton busy={busy}>Create account</SubmitButton>
                <p className="text-[12px] leading-[18px] text-[#5a6172]">
                  Personal email addresses (Gmail, Outlook, Yahoo, iCloud, QQ, etc.) can’t be used.{' '}
                  <button type="button" onClick={() => switchTo('signin')} className="text-[#3c77f6] font-medium hover:underline">
                    Already have an account? Log in
                  </button>
                </p>
              </form>
            )}

            {step === 'verify' && (
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
                <InfoText info={info} />
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
                  <button type="button" className="text-[#5a6172] hover:text-[#1e232f]" onClick={() => switchTo('signin')}>
                    Back to log in
                  </button>
                  <button type="button" disabled={cooldown > 0 || busy} onClick={resend} className="text-[#3c77f6] font-medium disabled:text-[#9ba1b0]">
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
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

function InfoText({ info }: { info: string }) {
  if (!info) return null;
  return <p className="text-[13px] leading-5 text-[#1e40af] bg-[#eef4ff] border border-[#c9d6ff] rounded-lg px-3 py-2 -mt-2">{info}</p>;
}

function ErrorText({ error }: { error: ReactNode }) {
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
