// Static copy for the employer landing page (/employers), ported from Figma
// tv7ju8o58LXo6ZJEsJI6kZ node 2451:2282 ("C-雇主端 landing").
//
// Plan numbers here are marketing copy only — the employer app has no billing
// API yet, so nothing in this file is read back from a server.

import iconApplications from '@/assets/landing-employer/problem-applications.svg';
import iconSignal from '@/assets/landing-employer/problem-signal.svg';
import iconTime from '@/assets/landing-employer/problem-time.svg';
import iconRanked from '@/assets/landing-employer/feature-ranked.svg';
import iconQuestions from '@/assets/landing-employer/feature-questions.svg';
import iconAttempts from '@/assets/landing-employer/feature-attempts.svg';
import iconSponsored from '@/assets/landing-employer/feature-sponsored.svg';
import iconResponse from '@/assets/landing-employer/feature-response.svg';
import iconReports from '@/assets/landing-employer/feature-reports.svg';

export const SALES_EMAIL = 'operations@screna.ai';
export const SALES_HREF = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent('Screna for hiring teams')}`;

export interface IconCard {
  icon: string;
  title: string;
  body: string;
}

export const PROBLEMS: IconCard[] = [
  {
    icon: iconApplications,
    title: 'Too many applications',
    body: 'AI tools let candidates apply to hundreds of roles a day, whether or not they fit.',
  },
  {
    icon: iconSignal,
    title: 'Too little signal',
    body: "A resume can't show how someone answers the questions your team actually asks.",
  },
  {
    icon: iconTime,
    title: 'Too much first-round time',
    body: 'Phone screens to find out what an interview would have told you in twenty minutes.',
  },
];

export const STEPS = [
  {
    n: '01',
    title: 'Post a role',
    body: 'Add the job description, requirements and your own screening checklist. Set a time window and an applicant cap.',
  },
  {
    n: '02',
    title: 'Candidates interview',
    body: 'Each applicant takes a voice interview of about 20 minutes, built from your job description. Only completed interviews reach you.',
  },
  {
    n: '03',
    title: 'Review the ranked list',
    body: 'Scores, four dimensions and checklist results for everyone, free. No resumes to sort.',
  },
  {
    n: '04',
    title: 'Unlock and move forward',
    body: 'Unlock name, resume, full recording and follow-up suggestions. Move them to the next round and reply within 7 days.',
  },
] as const;

export const FEATURES: IconCard[] = [
  {
    icon: iconRanked,
    title: 'Full ranked list, free',
    body: 'Every candidate who interviewed, sorted by score. Nothing hidden at the bottom.',
  },
  {
    icon: iconQuestions,
    title: 'Ask what matters',
    body: 'Your job description, requirements and screening checklist shape every question, and each item is judged in the report. Enterprise teams can bring their own question bank.',
  },
  {
    icon: iconAttempts,
    title: 'Attempt history in view',
    body: "If a candidate redid the interview, you see which attempt you're looking at.",
  },
  {
    icon: iconSponsored,
    title: 'Sponsored interviews',
    body: 'Cover the interview for candidates on priority roles, with a budget you control.',
  },
  {
    icon: iconResponse,
    title: '7-day response loop',
    body: "Candidates are told they'll hear back within 7 days. We remind you before the deadline.",
  },
  {
    icon: iconReports,
    title: 'Seats and hiring reports',
    body: 'Share roles with your team and get a monthly report on outcomes.',
  },
];

export type PlanCta = 'signup' | 'sales';

export interface Plan {
  name: string;
  price: string;
  /** Shown after the price, e.g. "/ month". */
  per?: string;
  /** Small grey lines under the price. */
  notes: string[];
  features: { text: string; strong?: boolean }[];
  cta: { label: string; action: PlanCta };
  featured?: { badge: string };
}

export const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    notes: ['Try it on your open roles'],
    features: [
      { text: 'Unlimited open roles' },
      { text: '20 report unlocks, one time' },
      { text: 'Then $15 per unlock' },
      { text: 'Sponsored interviews at $3 each' },
      { text: '1 screening checklist' },
      { text: '1 seat' },
    ],
    cta: { label: 'Post a role free', action: 'signup' },
  },
  {
    name: 'Business',
    price: '$399',
    per: '/ month',
    notes: [
      'Or $3,990 a year, two months free',
      'Renews monthly until you cancel. Allowances reset each month.',
    ],
    features: [
      { text: '50 report unlocks a month, then $12 each', strong: true },
      { text: '50 sponsored interviews a month, then $3 each', strong: true },
      { text: 'Unlimited screening checklists' },
      { text: '3 seats' },
      { text: 'Monthly hiring outcome report' },
      { text: 'Email support' },
    ],
    cta: { label: 'Start Business', action: 'signup' },
    featured: { badge: 'For recruiters and agencies' },
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    notes: ['For high-volume hiring'],
    features: [
      { text: 'Unlock and interview volumes by contract' },
      { text: 'Custom question bank' },
      { text: 'Unlimited seats and SSO' },
      { text: 'ATS integration and data export' },
      { text: 'Dedicated account manager' },
      { text: 'Invoice billing' },
    ],
    cta: { label: 'Talk to sales', action: 'sales' },
  },
];

export const EVERY_PLAN = [
  'Unlimited open roles',
  'The full ranked candidate list',
  'Scores and four-dimension results, free',
  'Verified company domain',
  'A 7-day response commitment to your candidates',
];

/** [feature, Free, Business, Enterprise] */
export const COMPARE_ROWS: [string, string, string, string][] = [
  ['Open roles', 'Unlimited', 'Unlimited', 'Unlimited'],
  ['Ranked list, scores, four dimensions', 'Free', 'Free', 'Free'],
  ['Report unlocks', '20 one time, then $15 each', '50 a month, then $12 each', 'By contract'],
  ['Sponsored interviews', '$3 each', '50 a month, then $3 each', 'By contract'],
  ['Screening checklists', '1', 'Unlimited', 'Unlimited + custom question bank'],
  ['Seats', '1', '3', 'Unlimited + SSO'],
  ['Hiring outcome report', '—', 'Monthly', 'Monthly + data export'],
  ['Overage cap', '—', 'Set your own monthly cap', 'By contract'],
  ['Support and billing', 'Self-serve', 'Email support, card', 'Account manager, invoice'],
];

// The design ships the questions only; the answers restate facts already on
// this page (plans, 7-day loop) so they cannot drift from the pricing above.
export const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is a report unlock?',
    a: "Unlocking a candidate reveals their name, resume, full interview recording, report and contact email for that role. Scores and four-dimension results are free to view for everyone; you only spend an unlock on the people you want to talk to. An unlock applies to one candidate on one role.",
  },
  {
    q: 'Do you charge per applicant?',
    a: 'No. Posting roles, receiving applicants and viewing the full ranked list are free on every plan. You pay only when you unlock a candidate’s report, or when you choose to sponsor interviews.',
  },
  {
    q: 'What is a sponsored interview?',
    a: 'Normally candidates take the AI interview on their own plan. On priority roles you can cover the interview for them, so more people complete it. Sponsored interviews are $3 each, and Business includes 50 a month. You set the budget.',
  },
  {
    q: 'What happens if I go over my Business allowance?',
    a: 'Extra report unlocks are $12 each and extra sponsored interviews are $3 each. You can set your own monthly overage cap so usage never goes past a number you choose. Allowances reset each month.',
  },
  {
    q: 'What is the 7-day response commitment?',
    a: "Candidates are told they'll hear back within 7 days of completing the interview. Screna reminds you before the deadline, so no one who showed up is left waiting.",
  },
];
