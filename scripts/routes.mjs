/**
 * Single source of truth for which public routes get a static prerendered
 * page. Consumed by scripts/prerender.mjs and asserted against vercel.json /
 * api/sitemap.ts by src/test/vercel-routes.test.ts.
 *
 * Adding a public page means touching all three: this list, a fallback rewrite
 * in vercel.json, and STATIC_PATHS in api/sitemap.ts. The test enforces it.
 *
 * /blog/:slug is not listed — those routes are discovered from Sanity at build
 * time.
 */
export const PRERENDER_STATIC = [
  '/',
  '/blog',
  '/faq',
  '/help',
  '/contact',
  '/privacy',
  '/terms',
  '/cookies',
  '/data-protection',
];

/**
 * Minimum body word count for a prerendered page.
 *
 * This is a "did rendering actually finish" tripwire, not a content-quality
 * bar — a snapshot of a skeleton screen or an empty shell lands far below any
 * of these numbers. So pages that are legitimately short get their own floor
 * rather than a blanket one: /contact is a form plus two info blocks and
 * renders complete at ~100 words, and failing the build over that would only
 * teach people to ignore the gate.
 *
 * Static pages below their floor fail the build. Blog posts only warn —
 * article length is the content team's call, and one short post must not
 * block every later deploy, hotfixes included.
 */
export const MIN_WORDS = {
  default: 120,
  '/contact': 80,
  '/blog/': 400,
};

/** Resolve the floor for a route: exact match, then /blog/ prefix, then default. */
export function minWordsFor(route) {
  if (route in MIN_WORDS) return MIN_WORDS[route];
  if (route.startsWith('/blog/')) return MIN_WORDS['/blog/'];
  return MIN_WORDS.default;
}

/**
 * Filename of the untouched SPA shell. Must match the destination of every
 * SPA rewrite in vercel.json — dist/index.html gets overwritten by the home
 * page snapshot, so it can no longer serve that role.
 */
export const SHELL = 'app.html';
