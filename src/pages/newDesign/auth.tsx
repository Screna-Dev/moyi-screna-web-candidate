import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/newDesign/ui/button';
import { Input } from '@/components/newDesign/ui/input';
import { Checkbox } from '@/components/newDesign/ui/checkbox';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, CheckCircle, Mail, ArrowLeft, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserInsights } from '@/services/ProfileServices';

function RisoTexture({ className, rotation = 0 }: { className?: string; rotation?: number }) {
  return (
    <div
      className={`absolute pointer-events-none overflow-hidden mix-blend-multiply opacity-20 ${className}`}
      style={{
        maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <div className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] blur-[80px]">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-blue-100/80"
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, 60, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/3 right-1/4 w-2/3 h-2/3 rounded-full bg-blue-200/50"
        />
        <motion.div
          animate={{ rotate: [0, 180, 0], scale: [1, 0.9, 1] }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-to-tr from-white/0 via-blue-50/60 to-white/0"
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #3b82f6 1.2px, transparent 1.2px)',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0',
        }}
      />
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
      )}
      <span className={`text-xs ${met ? 'text-green-600' : 'text-slate-500'}`}>{text}</span>
    </div>
  );
}

function PolicyModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setScrolledToBottom(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleScroll = () => {
    const el = contentRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      setScrolledToBottom(true);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'var(--font-serif)' }}>{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-600 leading-relaxed prose prose-slate prose-sm max-w-none">
          {children}
        </div>
        <div className="px-6 py-4 border-t border-slate-200">
          <Button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all"
          >
            {scrolledToBottom ? 'I have read and understand' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-slate-500 text-xs mb-4">Effective Date: March 21, 2026 | Last Updated: March 21, 2026</p>
      <p className="mb-4">These Terms of Service ("Terms") govern your access to and use of Screna.ai and any related websites, applications, products, community features, content, and services operated by Screna Tech Inc. ("Company," "we," "us," or "our") (collectively, the "Service").</p>
      <p className="mb-4">By clicking "Confirm" (or any similar button indicating acceptance), you acknowledge that you have read, understood, and agree to be legally bound by all terms and conditions set forth in this Terms. If you do not agree to these Terms, do not click "Confirm".</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">1) Definitions</h3>
      <ul className="list-disc pl-5 mb-4 space-y-1">
        <li><strong>"Account"</strong> means your registered user account for the Service.</li>
        <li><strong>"AI Features"</strong> means features that use machine learning, artificial intelligence, automation, or related technologies to generate, analyze, score, summarize, recommend, simulate, classify, or transform content.</li>
        <li><strong>"AI Outputs"</strong> means any content, feedback, score, evaluation, recommendation, transcript, summary, report, or other output generated by or with AI Features.</li>
        <li><strong>"Application Materials"</strong> means resumes, CVs, cover letters, portfolios, job descriptions, writing samples, and similar career-related materials.</li>
        <li><strong>"Community Content"</strong> means User Content posted to public or semi-public areas of the Service.</li>
        <li><strong>"Restricted Information"</strong> means any non-public, confidential, proprietary, privileged, trade secret, or contractually restricted information.</li>
        <li><strong>"User Content"</strong> means any Content that you submit, upload, post, transmit, record, publish, display, or otherwise make available through or to the Service.</li>
      </ul>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">2) Eligibility</h3>
      <p className="mb-4">You must be at least 18 years old, or the age of majority in your jurisdiction if higher, to use the Service. By using the Service, you represent and warrant that you meet the applicable age requirement, you have the legal capacity to enter into these Terms, and your use of the Service does not violate any applicable law, rule, regulation, contract, or policy.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">3) Accounts and Security</h3>
      <p className="mb-4">You may need to create an Account to access some or all features of the Service. You agree to provide accurate, current, and complete information; keep your information updated; maintain the confidentiality of your login credentials; and notify us promptly at operations@screna.ai if you believe your Account has been compromised.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">4) The Service and AI Features</h3>
      <p className="mb-2"><strong>4.2 AI Outputs Disclaimer:</strong> You acknowledge that AI Features are experimental and continuously evolving, and AI Outputs may be inaccurate, incomplete, misleading, biased, inconsistent, offensive, or otherwise unsuitable for your intended use. AI Outputs are provided for informational, educational, and practice purposes only and do not constitute legal, financial, medical, psychological, recruiting, hiring, immigration, employment, or career advice.</p>
      <p className="mb-2"><strong>4.3 No Guarantee of Results:</strong> We do not guarantee any outcome from your use of the Service, including any improvement in interview performance, hiring success, offer rate, compensation, job placement, networking outcome, or career advancement.</p>
      <p className="mb-4"><strong>4.4 No Employment or Agency Relationship:</strong> The Company is not an employer, recruiter, staffing agency, headhunter, or career placement agency.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">5) Recordings, Transcripts, Resume Processing, and Consent</h3>
      <p className="mb-4">The Service may record, receive, and store your audio, video, screen, and related metadata; create and store transcripts, summaries, scores, and derived evaluations; and analyze recordings, speech, text, and behavioral signals for Service functionality.</p>
      <p className="mb-4">You shall not submit, upload, post, record, or share any Restricted Information that you are not authorized to disclose, including information subject to any NDA or confidentiality obligation, proprietary interview questions, or internal documentation.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">6) Your Content and Permissions</h3>
      <p className="mb-4">As between you and the Company, and subject to the rights you grant in these Terms, you retain ownership of your User Content. You grant the Company a non-exclusive, worldwide, royalty-free, sublicensable, and transferable license to use, host, store, reproduce, process, transmit, display, modify, analyze, and create derivative works from your User Content as reasonably necessary to provide and improve the Service.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">8) Acceptable Use</h3>
      <p className="mb-4">You agree not to use the Service for any unlawful, harmful, deceptive, fraudulent, infringing, or unauthorized purpose; reverse engineer or decompile any part of the Service; or interfere with the Service or the experience of other users.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">11) Paid Plans, Billing, and Subscriptions</h3>
      <p className="mb-4">Certain features may require payment. Subscriptions auto-renew unless cancelled. You may cancel at any time through account settings; access continues for 30 days following cancellation. All paid fees are non-refundable except as required by applicable law.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">15) Disclaimers</h3>
      <p className="mb-4 uppercase text-xs">TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE, AI FEATURES, AI OUTPUTS, COMMUNITY CONTENT, AND ALL RELATED CONTENT AND MATERIALS ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. WE DO NOT WARRANT THAT AI OUTPUTS OR COMMUNITY CONTENT WILL BE ACCURATE, COMPLETE, RELIABLE, LAWFUL, NON-INFRINGING, OR SUITABLE FOR YOUR NEEDS.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">16) Limitation of Liability</h3>
      <p className="mb-4 uppercase text-xs">THE TOTAL AGGREGATE LIABILITY OF THE COMPANY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT YOU PAID TO US FOR THE SERVICE IN THE 12 MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (B) USD $100 IF YOU HAVE NOT PAID US.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">19) Governing Law and Venue</h3>
      <p className="mb-4">These Terms are governed by the laws of the State of Delaware, without regard to its conflict-of-laws principles.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">20) Dispute Resolution; Class Action Waiver</h3>
      <p className="mb-2">Any dispute will be resolved through binding arbitration on an individual basis in the State of Delaware, except that either party may bring an individual claim in small claims court if it qualifies.</p>
      <p className="mb-4 uppercase text-xs font-semibold">YOU AND THE COMPANY WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION, CLASS ARBITRATION, OR REPRESENTATIVE ACTION.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">22) Contact</h3>
      <p className="mb-1">Legal: Attorney@tslawfirm.co</p>
      <p className="mb-1">Support: operations@screna.ai</p>
      <p>Address: 42 HANSOM RD, BASKING RIDGE, NJ 07920</p>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-slate-500 text-xs mb-4">Effective Date: March 21, 2026 | Last Updated: March 21, 2026</p>
      <p className="mb-4">Screna Tech Inc. ("Company," "we," "us") provides the services available at https://www.screna.ai/ and affiliated applications. This Privacy Policy explains how we process personal data when providing the Services.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">1) Personal Data We Process</h3>
      <p className="mb-4">We process personal data to provide the Services (e.g., running mock interviews, generating transcripts, and delivering AI-based feedback). You are not required to provide personal data, but if you do not, we may be unable to provide parts of the Services.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">2) Categories of Personal Data</h3>
      <ul className="list-disc pl-5 mb-4 space-y-1">
        <li><strong>Account & Profile:</strong> Name, email, password, username, preferences</li>
        <li><strong>Interview Content:</strong> Video/audio recordings, uploaded resumes</li>
        <li><strong>Transcripts & Outputs:</strong> Transcripts, scores, feedback reports</li>
        <li><strong>Usage & Device Data:</strong> IP address, browser type, feature usage</li>
      </ul>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">3) How We Use Personal Data</h3>
      <ul className="list-disc pl-5 mb-4 space-y-1">
        <li>Provide Services: run mock interviews, generate transcripts, deliver feedback</li>
        <li>Personalization: recommend practice plans, improve rubrics</li>
        <li>Customer Support: answer requests, troubleshoot</li>
        <li>Security & Safety: prevent fraud/abuse, enforce Terms</li>
      </ul>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">4) AI Features and Automated Processing</h3>
      <p className="mb-4">The Services may offer AI features that generate interview feedback, summaries, suggested answers, question banks, and coaching plans. We do not use your audio/video recordings to train foundation models.</p>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">5) Your Rights and Choices</h3>
      <p className="mb-2">Depending on your location, you may have rights to:</p>
      <ul className="list-disc pl-5 mb-4 space-y-1">
        <li>Access, correct, or delete personal data</li>
        <li>Object to or restrict processing</li>
        <li>Data portability</li>
        <li>Withdraw consent (where processing is based on consent)</li>
      </ul>

      <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">6) Contact Us</h3>
      <p className="mb-1">Email: operations@screna.ai</p>
      <p>Address: 42 HANSOM RD, BASKING RIDGE, NJ 07920</p>
    </>
  );
}

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '';
  const [isLogin, setIsLogin] = useState(searchParams.get('login') === 'true');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Policy modal state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Verification step state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isNewSignup, setIsNewSignup] = useState(false);

  const { login, signup, loginWithGoogle, verifyEmail, resendVerificationCode } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validatePassword = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8 || pwd.length > 16) errors.push("Between 8 and 16 characters");
    if (!/[A-Z]/.test(pwd)) errors.push("Contains uppercase letter");
    if (!/[a-z]/.test(pwd)) errors.push("Contains lowercase letter");
    if (!/\d/.test(pwd)) errors.push("Contains number");
    if (!/[^\w\s]/.test(pwd)) errors.push("Contains special character");
    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (!isLogin) setPasswordErrors(validatePassword(val));
  };

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setError('');
    setFieldErrors({});
    setPassword('');
    setPasswordErrors([]);
    setShowVerification(false);
    setVerificationCode('');
  };

  const handleGoogleSignIn = () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      loginWithGoogle(!isLogin, returnTo);
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError('Failed to initiate Google sign-in. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to initiate Google sign-in. Please try again.',
        variant: 'destructive',
      });
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (!isLogin && !name) {
      setError('Please enter your name');
      return;
    }
    if (!isLogin && !agreedToTerms) {
      setError('Please agree to the Terms of Use and Privacy Policy');
      return;
    }
    if (!isLogin) {
      const errors = validatePassword(password);
      if (errors.length > 0) {
        setPasswordErrors(errors);
        toast({ title: 'Invalid Password', description: 'Please meet all password requirements', variant: 'destructive' });
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const loggedInUser = await login(email, password, rememberMe);
        toast({ title: 'Welcome back!', description: 'You have successfully signed in.' });
        if (loggedInUser?.role === 'CANDIDATE') {
          let onboarded = false;
          try {
            const res = await getUserInsights();
            const data = res.data?.data ?? res.data;
            onboarded = !!(data?.role || data?.jobSearchStage || data?.goalClarityLevel);
          } catch {
            onboarded = false;
          }
          navigate(returnTo || (onboarded ? '/dashboard' : '/onboarding-resume'));
        }
        if (loggedInUser?.role === 'ADMIN') navigate('/admin');
      } else {
        await signup(email, password, name);
        setRegisteredEmail(email);
        setIsNewSignup(true);
        setShowVerification(true);
        toast({ title: 'Account created!', description: 'Please check your email for the verification code.' });
      }
    } catch (err: any) {
      console.error('Auth error:', err);

      const isEmailNotVerified =
        err.response?.data?.errorCode === 'AUTH_EMAIL_NOT_VERIFIED' ||
        err.response?.data?.errorCode === 'USER_EXISTS_UNVERIFIED' ||
        (err.response?.data?.errorCode === 'BAD_REQUEST' &&
          err.response?.data?.message?.toLowerCase().includes('email not verified'));

      if (isEmailNotVerified) {
        setRegisteredEmail(email);
        setIsNewSignup(false);
        setShowVerification(true);
        try { await resendVerificationCode(email); } catch (_) {}
        toast({ title: 'Email not verified', description: "Please check your email for the verification code. We've sent a new one." });
        return;
      }

      // Backend field-level validation errors — show inline, suppress generic banner/toast
      const isValidationError =
        err.response?.data?.error === 'VALIDATION_ERROR' ||
        err.response?.data?.errorCode === 'VALIDATION_ERROR' ||
        err.response?.data?.message === 'Validation Error';
      if (isValidationError) {
        // Backend puts field errors in `data` array: [{ property, message }]
        const rawErrors = err.response?.data?.data;
        const mapped: Record<string, string> = {};
        if (Array.isArray(rawErrors)) {
          rawErrors.forEach((e: { property?: string; field?: string; message?: string; constraints?: Record<string, string> }) => {
            const key = e.property || e.field;
            if (key) mapped[key] = e.message || Object.values(e.constraints || {})[0] || 'Invalid value';
          });
        } else if (rawErrors && typeof rawErrors === 'object') {
          Object.entries(rawErrors).forEach(([k, v]) => { mapped[k] = String(v); });
        }
        setFieldErrors(mapped);
        return;
      }

      let msg = 'Something went wrong. Please try again.';
      if (err.response) msg = err.response.data?.message || 'Invalid email or password';
      else if (err.request) msg = 'No response from server. Please check your connection.';
      else msg = err.message || msg;

      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await verifyEmail(registeredEmail, verificationCode);
      // Auto-login after verification and go directly to onboarding
      try {
        const loggedInUser = await login(registeredEmail, password, false);
        localStorage.removeItem('screna_new_user');
        if (loggedInUser?.role === 'CANDIDATE') {
          const onboardingDest = '/onboarding-resume' + (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '');
          navigate(onboardingDest);
          return;
        }
        if (loggedInUser?.role === 'ADMIN') {
          navigate('/admin');
          return;
        }
      } catch (_) {
        // Auto-login failed — fall back to login form
      }
      toast({ title: 'Email verified!', description: 'Your account has been verified successfully.' });
      if (isNewSignup) localStorage.setItem('screna_new_user', '1');
      setShowVerification(false);
      setIsLogin(true);
      setEmail('');
      setPassword('');
      setName('');
      setVerificationCode('');
    } catch (err: any) {
      console.error('Verification error:', err);
      let msg = 'Invalid verification code. Please try again.';
      if (err.response) msg = err.response.data?.message || msg;
      else if (err.request) msg = 'No response from server. Please try again later.';
      else msg = err.message || msg;
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError('');
    try {
      await resendVerificationCode(registeredEmail);
      toast({ title: 'Code resent!', description: 'A new verification code has been sent to your email.' });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to resend code. Please try again.';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignup = () => {
    setShowVerification(false);
    setVerificationCode('');
    setError('');
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #A8D3FF 0%, #E6F0FF 50%, #FFF4DF 100%)' }}
    >
      {/* Background textures */}
      <RisoTexture className="top-[-10%] right-[-5%] w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw]" rotation={-12} />
      <RisoTexture className="bottom-[-10%] left-[-10%] w-[70vw] h-[70vw] md:w-[45vw] md:h-[45vw]" rotation={20} />
      <RisoTexture className="top-[20%] left-[20%] w-[60vw] h-[40vw] opacity-10" rotation={0} />

      <motion.div
        animate={{ x: [0, -10, 0], y: [0, 5, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[15%] right-[10%] w-[30vw] h-[20vw] pointer-events-none z-[1] blur-3xl opacity-60"
        style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)' }}
      />
      <motion.div
        animate={{ x: [0, 10, 0], y: [0, -8, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-[20%] left-[5%] w-[35vw] h-[25vw] pointer-events-none z-[1] blur-3xl opacity-50"
        style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)' }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent z-[2] pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            Screna AI
          </h1>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-900/5 p-8 border border-white/60">

          {showVerification ? (
            /* ── Verification Step ── */
            <form onSubmit={handleVerifySubmit} className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                    <Mail className="w-7 h-7 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                  Check your email
                </h2>
                <p className="text-slate-500 text-sm">
                  We've sent a verification code to
                </p>
                <p className="text-slate-800 font-semibold text-sm mt-1">{registeredEmail}</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="verification-code" className="block text-sm text-slate-700 font-medium">
                  Verification Code
                </label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  disabled={isLoading}
                  className="w-full text-center text-lg tracking-widest px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
                ) : (
                  'Verify Email'
                )}
              </Button>

              <div className="text-center text-sm text-slate-500 space-y-2">
                <p>
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                  >
                    Resend
                  </button>
                </p>
                <button
                  type="button"
                  onClick={handleBackToSignup}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-1 mx-auto text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign Up
                </button>
              </div>
            </form>
          ) : (
            /* ── Login / Sign Up Form ── */
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                  {isLogin ? 'Welcome back' : 'Start your journey'}
                </h2>
                <p className="text-slate-500">
                  {isLogin ? 'Log in to your account.' : 'Sign up for a free account.'}
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isGoogleLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Connecting to Google...</>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="white"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white"/>
                      </svg>
                      {isLogin ? 'Continue with Google' : 'Sign up with Google'}
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-slate-500 backdrop-blur-sm rounded">or</span>
                  </div>
                </div>

                {/* Name — signup only */}
                {!isLogin && (
                  <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm text-slate-700 font-medium">
                      Full Name
                    </label>
                    {fieldErrors.name && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />{fieldErrors.name}
                      </p>
                    )}
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => { setName(e.target.value); if (fieldErrors.name) setFieldErrors(p => ({ ...p, name: '' })); }}
                      autoComplete="name"
                      disabled={isLoading || isGoogleLoading}
                      className={`w-full px-4 py-2.5 bg-slate-50 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400 ${fieldErrors.name ? 'border border-red-400' : 'border border-slate-200'}`}
                    />
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm text-slate-700 font-medium">
                    Email
                  </label>
                  {fieldErrors.email && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />{fieldErrors.email}
                    </p>
                  )}
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. alex@screna.ai"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: '' })); }}
                    autoComplete="email"
                    disabled={isLoading || isGoogleLoading}
                    className={`w-full px-4 py-2.5 bg-slate-50 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400 ${fieldErrors.email ? 'border border-red-400' : 'border border-slate-200'}`}
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm text-slate-700 font-medium">
                    Password
                  </label>
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />{fieldErrors.password}
                    </p>
                  )}
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { handlePasswordChange(e); if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: '' })); }}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    disabled={isLoading || isGoogleLoading}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400 ${
                      fieldErrors.password || (!isLogin && passwordErrors.length > 0 && password.length > 0)
                        ? 'border-red-400'
                        : 'border-slate-200'
                    }`}
                  />

                  {/* Password requirements — signup only */}
                  {!isLogin && password.length > 0 && (
                    <div className="mt-2 space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-2">Password requirements:</p>
                      <PasswordRequirement met={password.length >= 8 && password.length <= 16} text="Between 8 and 16 characters" />
                      <PasswordRequirement met={/[A-Z]/.test(password)} text="Contains uppercase letter" />
                      <PasswordRequirement met={/[a-z]/.test(password)} text="Contains lowercase letter" />
                      <PasswordRequirement met={/\d/.test(password)} text="Contains number" />
                      <PasswordRequirement met={/[^\w\s]/.test(password)} text="Contains special character" />
                    </div>
                  )}
                </div>

                {/* Remember me — login only */}
                {isLogin && (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={isLoading || isGoogleLoading}
                      className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <label htmlFor="remember" className="text-sm text-slate-500 cursor-pointer">
                      Remember me
                    </label>
                  </div>
                )}

                {/* Terms — signup only */}
                {!isLogin && (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      className="mt-0.5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <label htmlFor="terms" className="text-sm text-slate-500 leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <button type="button" onClick={() => setShowTermsModal(true)} className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                        Terms of Use
                      </button>{' '}
                      and{' '}
                      <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                        Privacy Policy
                      </button>
                    </label>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading || isGoogleLoading || (!isLogin && passwordErrors.length > 0)}
                  className="w-full py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/10 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLogin ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    isLogin ? 'Log In' : 'Sign Up'
                  )}
                </Button>

                {/* Forgot password — login only */}
                {isLogin && (
                  <div className="text-center">
                    <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                )}

                {/* Toggle login/signup */}
                <div className="text-center text-sm text-slate-500">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={handleToggle}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                  >
                    {isLogin ? 'Sign Up' : 'Log In'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500/80 font-medium">
            AI-powered interview preparation for your next career move
          </p>
        </div>
      </div>

      {/* Policy Modals */}
      <PolicyModal open={showTermsModal} onClose={() => setShowTermsModal(false)} title="Terms of Service">
        <TermsContent />
      </PolicyModal>
      <PolicyModal open={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="Privacy Policy">
        <PrivacyContent />
      </PolicyModal>
    </div>
  );
}
