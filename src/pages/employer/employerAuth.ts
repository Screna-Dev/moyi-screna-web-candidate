import axios from 'axios';

// Employer auth. Employers are separate accounts from candidates (role
// EMPLOYER): no Google sign-in, company email only, password + emailed code.
//   POST /auth/signup/employer  { email, password, name, companyName }
//   POST /auth/verify-email     { email, confirmationCode }  (shared with candidates)
//   POST /auth/signin/employer  { email, password } → tokens, isFirstLogin
// Verifying grants the organization's one-time starter credits.
//
// Tokens are kept in the employer session below, NOT in the candidate
// authToken/refreshToken keys, so an employer sign-in never makes the
// candidate app think someone is signed in (and vice versa). Requests go
// through a bare axios instance for the same reason: the shared API instance
// would attach the candidate bearer and run the candidate refresh/redirect flow.

const authApi = axios.create({ baseURL: '/api/v1', withCredentials: true });

const SESSION_KEY = 'screna_employer_session';
// Name and company entered at signup, keyed by email. Signin returns only
// tokens, so this is how the app shows who is signed in on this device.
const PROFILES_KEY = 'screna_employer_profiles';

// Consumer mailbox providers. Anything on this list is a personal address and
// can't be used to sign in as an employer.
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.jp', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com', 'passport.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'aim.com',
  'proton.me', 'protonmail.com', 'pm.me', 'tutanota.com', 'tuta.io',
  'gmx.com', 'gmx.de', 'gmx.net', 'web.de', 'mail.com', 'email.com', 'zoho.com', 'zohomail.com',
  'yandex.com', 'yandex.ru', 'mail.ru', 'inbox.ru', 'list.ru', 'bk.ru',
  'qq.com', 'foxmail.com', '163.com', '126.com', 'yeah.net', 'sina.com', 'sina.cn', 'sohu.com', 'aliyun.com', '139.com', '189.cn',
  'naver.com', 'daum.net', 'hanmail.net',
  'hey.com', 'fastmail.com', 'fastmail.fm', 'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'temp-mail.org',
]);

const EMAIL_RE = /^[^\s@]+@([^\s@]+\.[^\s@]{2,})$/;

export type CompanyEmailCheck = { ok: true; domain: string } | { ok: false; error: string };

export function checkCompanyEmail(raw: string): CompanyEmailCheck {
  const email = raw.trim().toLowerCase();
  const m = EMAIL_RE.exec(email);
  if (!m) return { ok: false, error: 'Enter a valid email address.' };
  const domain = m[1];
  if (FREE_EMAIL_DOMAINS.has(domain)) {
    return { ok: false, error: 'Please use your company email. Personal addresses like Gmail or Outlook can’t be used for employer accounts.' };
  }
  if (/\.(edu|ac\.[a-z]{2})$/.test(domain)) {
    return { ok: false, error: 'Student and school emails can’t be used for employer accounts. Please use your company email.' };
  }
  return { ok: true, domain };
}

export type EmployerSession = {
  email: string;
  domain: string;
  name: string;
  title: string;
  companyName: string;
  signedInAt: string;
  accessToken: string;
  refreshToken: string;
};

export function getEmployerSession(): EmployerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const session = raw ? (JSON.parse(raw) as EmployerSession) : null;
    // Sessions saved by the old mock sign-in have no tokens; make them sign in again.
    return session?.accessToken ? session : null;
  } catch {
    return null;
  }
}

export function saveEmployerSession(session: EmployerSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* private mode — session lasts for this tab only via in-memory state */
  }
}

export type EmployerProfile = { name: string; title: string; companyName: string };

function readProfiles(): Record<string, EmployerProfile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '{}') as Record<string, EmployerProfile>;
  } catch {
    return {};
  }
}

export function getKnownProfile(email: string): EmployerProfile | null {
  return readProfiles()[email.trim().toLowerCase()] ?? null;
}

export function rememberProfile(email: string, profile: EmployerProfile) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify({ ...readProfiles(), [email.trim().toLowerCase()]: profile }));
  } catch {
    /* ignore */
  }
}

export function clearEmployerSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// "acme-labs.co.uk" → "Acme Labs": a starting guess for the company name field.
export function companyNameFromDomain(domain: string) {
  const label = domain.split('.')[0] ?? domain;
  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}

// --- API -------------------------------------------------------------------

export const AUTH_EMAIL_NOT_CORPORATE = 'AUTH_EMAIL_NOT_CORPORATE';
export const AUTH_EMAIL_ALREADY_REGISTERED = 'AUTH_EMAIL_ALREADY_REGISTERED';
export const AUTH_EMAIL_NOT_VERIFIED = 'AUTH_EMAIL_NOT_VERIFIED';
export const AUTH_WRONG_ACCOUNT_TYPE = 'AUTH_WRONG_ACCOUNT_TYPE';
export const VALIDATION_ERROR = 'VALIDATION_ERROR';

type ErrorEnvelope = { message?: string; errorCode?: string; error?: string; data?: unknown };

export function authErrorCode(err: unknown): string {
  if (!axios.isAxiosError(err)) return '';
  const d = err.response?.data as ErrorEnvelope | undefined;
  return d?.errorCode ?? d?.error ?? '';
}

export function authErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) return '';
  const d = err.response?.data as ErrorEnvelope | undefined;
  // VALIDATION_ERROR puts field errors in data: [{ property, message }].
  if (Array.isArray(d?.data)) {
    const first = (d.data as { message?: string }[]).find((e) => e?.message);
    if (first?.message) return first.message;
  }
  return d?.message ?? '';
}

// Same rules as candidate signup (auth.tsx validatePassword).
export function passwordProblems(pwd: string): string[] {
  const out: string[] = [];
  if (pwd.length < 8 || pwd.length > 16) out.push('8–16 characters');
  if (!/[A-Z]/.test(pwd)) out.push('an uppercase letter');
  if (!/[a-z]/.test(pwd)) out.push('a lowercase letter');
  if (!/\d/.test(pwd)) out.push('a number');
  if (!/[^\w\s]/.test(pwd)) out.push('a special character');
  return out;
}

export async function signUpEmployer(body: { email: string; password: string; name: string; companyName: string }) {
  await authApi.post('/auth/signup/employer', body);
}

export async function verifyEmployerEmail(email: string, code: string) {
  await authApi.post('/auth/verify-email', { email, confirmationCode: code });
}

export async function resendEmployerCode(email: string) {
  await authApi.post('/auth/resend-confirmation-code', { email });
}

export type EmployerSignIn = { accessToken: string; refreshToken: string; isFirstLogin: boolean };

export async function signInEmployer(email: string, password: string): Promise<EmployerSignIn> {
  const res = await authApi.post('/auth/signin/employer', { email, password });
  const data = (res.data?.data ?? res.data) as Partial<EmployerSignIn>;
  if (!data?.accessToken) throw new Error('No access token in employer signin response');
  return { accessToken: data.accessToken, refreshToken: data.refreshToken ?? '', isFirstLogin: !!data.isFirstLogin };
}

// Reads display claims from the access token, if it carries them. Not used for
// authorization.
export function tokenClaims(token: string): { email?: string; name?: string } {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const p = JSON.parse(json) as Record<string, unknown>;
    return {
      email: typeof p.email === 'string' ? p.email : undefined,
      name: typeof p.name === 'string' ? p.name : undefined,
    };
  } catch {
    return {};
  }
}
