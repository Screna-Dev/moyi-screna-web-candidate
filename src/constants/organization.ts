// The site-level Organization entity, shared by the home page and /about.
//
// One object, so the two pages that describe the company cannot describe it
// two ways. index.html carries a separate WebApplication block (untouched by
// useSeo, since it has no data-seo marker) — the two are complementary: one
// describes the company, the other the product.

import { SITE_URL } from '@/hooks/useSeo';
import { SOCIAL_PROFILE_URLS, SUPPORT_EMAIL } from '@/constants/site';

export const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Screna AI',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  // The llms.txt positioning sentence, verbatim — one definition everywhere.
  description:
    'Screna AI is an interview preparation platform for tech job seekers. It runs AI mock interviews (technical, behavioral, and system design), builds a personalized training plan from your resume and target role, hosts a community library of real interview experiences, and connects candidates with human mentors for 1:1 coaching.',
  sameAs: SOCIAL_PROFILE_URLS,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: SUPPORT_EMAIL,
    url: `${SITE_URL}/contact`,
  },
};
