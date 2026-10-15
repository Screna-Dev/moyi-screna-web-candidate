// Typed wrappers over the company page intro + FAQ templates.
//
// The templates live in scripts/routes.mjs because api/_render/company.ts
// writes the same strings into the server HTML and the JSON-LD; this page
// re-renders them on boot and must produce them word for word.

// Plain .mjs manifest, shared with scripts/ and api/ — see scripts/routes.mjs.
import {
  companyFaq as faqImpl,
  companyFaqJsonLd as faqJsonLdImpl,
  companyIntro as introImpl,
} from '../../scripts/routes.mjs';

/** GET /community/public/companies/breakdown `data`. */
export interface CompanyBreakdown {
  company?: string;
  totalPosts?: number;
  topRoles?: { name: string; posts: number }[];
  topRounds?: { name: string; posts: number }[];
  roundTopics?: Record<string, { name: string; questions: number }[]>;
}

export interface CompanyFaqEntry {
  question: string;
  answer: string;
}

/** The opening paragraph; '' when the breakdown is missing or empty. */
export const companyIntro = (name: string, breakdown: CompanyBreakdown | null | undefined): string =>
  introImpl(name, breakdown);

/** 0–3 FAQ entries; [] for companies under the threshold. */
export const companyFaq = (
  name: string,
  breakdown: CompanyBreakdown | null | undefined,
): CompanyFaqEntry[] => faqImpl(name, breakdown);

/** FAQPage JSON-LD for companyFaq's entries, or null when there are none. */
export const companyFaqJsonLd = (
  name: string,
  breakdown: CompanyBreakdown | null | undefined,
): Record<string, unknown> | null => faqJsonLdImpl(name, breakdown);
