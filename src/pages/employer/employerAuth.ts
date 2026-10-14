// Employer sign-in. Employers are separate from candidate accounts: no Google
// sign-in, and only a company (work-domain) email is accepted. There is no
// employer auth API yet, so the session is mocked in localStorage and the
// verification code is not sent anywhere — swap requestCode/verifyCode for
// service calls when the backend lands and keep the session shape.

const SESSION_KEY = 'screna_employer_session';
// Profiles entered at first sign-in, keyed by email, so returning employers
// skip the "tell us about you" step.
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
};

export function getEmployerSession(): EmployerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as EmployerSession) : null;
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

// Mock delivery: any 6-digit code is accepted until the endpoint exists.
// Both take the email so call sites don't change when the API is wired.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requestCode(_email: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 600));
}

export async function verifyCode(_email: string, code: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 500));
  return /^\d{6}$/.test(code);
}
