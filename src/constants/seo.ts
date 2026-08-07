// Per-route title / description copy for the public, indexable pages.
//
// These strings are what Google prints in the SERP, so they are kept in one
// file for product/marketing to edit without touching component code.
// Descriptions should stay <= 155 characters.
//
// NOTE: the copy below is a first pass and is pending product/marketing
// sign-off (see the SEO spec, §6 item 1). The home page intentionally reuses
// the existing index.html copy so nothing regresses if the rest is rewritten.

export const SEO_COPY = {
  home: {
    title: 'Screna AI - AI Mock Interview & Interview Preparation Platform',
    description:
      'Ace your next interview with AI-powered mock interviews, personalized preparation plans, and expert mentors. Practice technical, behavioral, and system design interviews.',
  },
  blog: {
    title: 'Blog — Interview Prep & Career Insights | Screna AI',
    description:
      'Interview prep guides, mock interview tactics, career switch stories, OPT and visa notes, and mentorship advice from the Screna AI team.',
  },
  faq: {
    title: 'FAQ | Screna AI',
    description:
      'Answers to common questions about Screna AI training plans, the interview experience library, supported roles, readiness metrics, pricing, and plans.',
  },
  help: {
    title: 'Help Center | Screna AI',
    description:
      'Get help with your Screna AI account, onboarding, mock interview practice, feedback reports, privacy, and security in one searchable place.',
  },
  contact: {
    title: 'Contact | Screna AI',
    description:
      'Get in touch with the Screna AI team about the product, partnerships, mentorship, or support. We reply to every message we receive.',
  },
  privacy: {
    title: 'Privacy Policy | Screna AI',
    description:
      'How Screna AI collects, uses, stores, and protects your personal data, including your rights over resumes, interview recordings, and account information.',
  },
  terms: {
    title: 'Terms of Service | Screna AI',
    description:
      'The terms that govern your use of Screna AI, covering accounts, subscriptions, acceptable use, intellectual property, and liability.',
  },
  cookies: {
    title: 'Cookie Policy | Screna AI',
    description:
      'Which cookies and similar technologies Screna AI uses, what each category is for, and how to control or withdraw your consent at any time.',
  },
  dataProtection: {
    title: 'Data Protection Policy | Screna AI',
    description:
      'Screna AI data protection policy: principles, data classification, lawful basis, security controls, retention, data subject requests, and incident response.',
  },
} as const;
