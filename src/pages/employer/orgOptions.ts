import type { Company } from '@/components/admin/console/pages/employer/types';
import type { CompanySize, OrgField, Organization, OrganizationForm, WorkplaceTag } from './employerApi';

// Labels for the organization API's enums, and the mapping from the API DTO to
// the shared store's Company (which the dashboard, wizard preview and email
// drafts read).

// UpdateOrganizationRequest.companySize allowed values.
export const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
  { value: '1_10', label: '1–10 employees' },
  { value: '11_50', label: '11–50 employees' },
  { value: '51_200', label: '51–200 employees' },
  { value: '201_500', label: '201–500 employees' },
  { value: '501_1000', label: '501–1,000 employees' },
  { value: '1001_PLUS', label: '1,001+ employees' },
];

export const WORKPLACE_TAGS: { value: WorkplaceTag; label: string }[] = [
  { value: 'remote_friendly', label: 'Remote-friendly' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'on_site', label: 'On-site' },
  { value: 'flexible_hours', label: 'Flexible hours' },
  { value: 'early_stage_startup', label: 'Early-stage startup' },
  { value: 'growth_stage_company', label: 'Growth-stage company' },
];

// industry is a free string on the API; these are the picker's suggestions.
export const INDUSTRIES = [
  'Software & SaaS',
  'Data Analytics & Business Intelligence',
  'Artificial Intelligence & Machine Learning',
  'Fintech & Financial Services',
  'E-commerce & Retail',
  'Healthcare & Life Sciences',
  'Education & EdTech',
  'Media & Entertainment',
  'Gaming',
  'Cybersecurity',
  'Hardware & Semiconductors',
  'Telecommunications',
  'Consulting & Professional Services',
  'Manufacturing',
  'Transportation & Logistics',
  'Energy & Climate',
  'Real Estate & PropTech',
  'Government & Nonprofit',
  'Other',
];

export const FIELD_LABELS: Record<OrgField, string> = {
  name: 'Company name',
  logo: 'Company logo',
  website: 'Company website',
  industry: 'Industry',
  companySize: 'Company size',
  headquarters: 'Headquarters',
  description: 'Company description',
  contactName: 'Contact name',
  contactEmail: 'Work email',
  authorizedConfirmed: 'Authorization confirmation',
};

// UpdateOrganizationRequest length limits.
export const MAX_LEN = {
  name: 255,
  url: 512,
  industry: 128,
  headquarters: 255,
  headline: 100,
  description: 600,
  contact: 255,
  phone: 64,
} as const;
export const HEADLINE_MAX = MAX_LEN.headline;
export const DESCRIPTION_MAX = MAX_LEN.description;

export function sizeLabel(size: CompanySize | null | undefined) {
  return COMPANY_SIZES.find((s) => s.value === size)?.label ?? '';
}

export function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '—';
}

// Everything but the store's own company id.
export function orgToCompany(org: Organization): Omit<Company, 'id'> {
  return {
    name: org.name,
    initials: initialsOf(org.name),
    logoUrl: org.logoUrl ?? undefined,
    website: org.website ?? '',
    linkedin: org.linkedinUrl ?? '',
    industry: org.industry ?? '',
    size: sizeLabel(org.companySize),
    yearFounded: org.yearFounded ? String(org.yearFounded) : '',
    headquarters: org.headquarters ?? '',
    headline: org.headline ?? '',
    description: org.description ?? '',
    workplaceTags: org.workplaceTags.map((t) => WORKPLACE_TAGS.find((w) => w.value === t)?.label ?? t),
    contact: {
      name: org.contact?.name ?? '',
      title: org.contact?.title ?? '',
      email: org.contact?.email ?? '',
      phone: org.contact?.phone ?? '',
    },
    authorized: org.authorizedConfirmed,
  };
}

// Editable form state: strings everywhere so inputs stay controlled.
export type ProfileDraft = {
  name: string;
  website: string;
  linkedinUrl: string;
  industry: string;
  companySize: CompanySize | '';
  yearFounded: string;
  headquarters: string;
  headline: string;
  description: string;
  workplaceTags: WorkplaceTag[];
  contact: { name: string; title: string; email: string; phone: string };
  authorizedConfirmed: boolean;
};

export function draftFromOrg(org: Organization): ProfileDraft {
  return {
    name: org.name ?? '',
    website: org.website ?? '',
    linkedinUrl: org.linkedinUrl ?? '',
    industry: org.industry ?? '',
    companySize: org.companySize ?? '',
    yearFounded: org.yearFounded ? String(org.yearFounded) : '',
    headquarters: org.headquarters ?? '',
    headline: org.headline ?? '',
    description: org.description ?? '',
    workplaceTags: [...org.workplaceTags],
    contact: {
      name: org.contact?.name ?? '',
      title: org.contact?.title ?? '',
      email: org.contact?.email ?? '',
      phone: org.contact?.phone ?? '',
    },
    authorizedConfirmed: org.authorizedConfirmed,
  };
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);

export function formFromDraft(d: ProfileDraft): OrganizationForm {
  return {
    name: d.name.trim(),
    website: orNull(d.website),
    linkedinUrl: orNull(d.linkedinUrl),
    industry: orNull(d.industry),
    companySize: d.companySize || null,
    yearFounded: d.yearFounded.trim() ? Number(d.yearFounded) : null,
    headquarters: orNull(d.headquarters),
    headline: orNull(d.headline),
    description: orNull(d.description),
    workplaceTags: d.workplaceTags,
    contact: {
      name: d.contact.name.trim(),
      title: d.contact.title.trim(),
      email: d.contact.email.trim(),
      phone: d.contact.phone.trim(),
    },
    authorizedConfirmed: d.authorizedConfirmed,
  };
}

// Client-side checks that mirror the API's rules, so most mistakes show next to
// the field instead of as a 400. PUT rejects the whole save when any required
// field is blank (even "save for later"), so they are all checked here. Keys
// are draft field names, with contactName/contactEmail for the contact.
// The website-vs-sign-up-email domain rule needs a public-suffix list, so it
// is left to the server (ORGANIZATION_WEBSITE_DOMAIN_MISMATCH).
export function draftErrors(d: ProfileDraft): Record<string, string> {
  const e: Record<string, string> = {};
  const required: [string, string, string][] = [
    ['name', d.name, 'Company name is required.'],
    ['website', d.website, 'Company website is required.'],
    ['industry', d.industry, 'Select an industry.'],
    ['companySize', d.companySize, 'Select a company size.'],
    ['headquarters', d.headquarters, 'Headquarters is required.'],
    ['description', d.description, 'Company description is required.'],
    ['contactName', d.contact.name, 'Contact name is required.'],
    ['contactEmail', d.contact.email, 'Work email is required.'],
  ];
  for (const [k, v, msg] of required) if (!v.trim()) e[k] = msg;
  // Backend pattern: (?i)^\s*(https?://\S+)?\s*$ — no spaces inside the URL.
  const url = /^https?:\/\/\S+$/i;
  const urlMsg = 'Enter a full URL starting with http:// or https://, without spaces.';
  if (d.website.trim() && !url.test(d.website.trim())) e.website = urlMsg;
  if (d.linkedinUrl.trim() && !url.test(d.linkedinUrl.trim())) e.linkedinUrl = urlMsg;
  if (d.yearFounded.trim()) {
    const y = Number(d.yearFounded);
    const now = new Date().getFullYear();
    if (!Number.isInteger(y) || y < 1800 || y > now) e.yearFounded = `Enter a year between 1800 and ${now}.`;
  }
  if (d.contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.contact.email.trim())) e.contactEmail = 'Enter a valid email address.';
  return e;
}

// VALIDATION_ERROR property → draftErrors key.
export function draftKeyOf(property: string): string {
  const m = property.match(/^contact\.(\w)(\w*)$/);
  return m ? `contact${m[1].toUpperCase()}${m[2]}` : property;
}
