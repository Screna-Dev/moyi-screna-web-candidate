// Canonical social/contact URLs.
//
// Kept out of footer.tsx so non-component consumers (the home page's
// Organization JSON-LD `sameAs`) can import them without tripping
// react-refresh/only-export-components.

export const SOCIAL_URLS = {
  x: 'https://x.com/screnaai_?s=21',
  linkedin: 'https://www.linkedin.com/company/screnaai/',
  discord: 'https://discord.gg/7FqHDtea5X',
  email: 'mailto:operations@screna.ai',
} as const;

/** Profile URLs only — schema.org `sameAs` does not take mailto: links. */
export const SOCIAL_PROFILE_URLS = Object.values(SOCIAL_URLS).filter(
  (href) => !href.startsWith('mailto:'),
);

export const SUPPORT_EMAIL = 'operations@screna.ai';
