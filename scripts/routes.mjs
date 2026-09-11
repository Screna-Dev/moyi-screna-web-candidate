/**
 * Single source of truth for which public routes get a static prerendered
 * page. Consumed by scripts/prerender.mjs and asserted against vercel.json /
 * api/sitemap.ts by src/test/vercel-routes.test.ts.
 *
 * Adding a public page means touching all three: this list, a fallback rewrite
 * in vercel.json, and STATIC_PATHS in api/sitemap.ts. The test enforces it.
 *
 * /blog/:slug is not listed — those routes are discovered from Sanity at build
 * time. /interview-questions/:companyId likewise: discovered from the community
 * API (see companyRoutes() in prerender.mjs).
 *
 * Plain .mjs on purpose: scripts/, api/ and src/ all import from here, and a
 * .ts module could not be loaded by the build scripts without a loader.
 */
export const PRERENDER_STATIC = [
  '/',
  '/blog',
  '/interview-questions',
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
 *
 * Trailing-slash keys are prefix rules (see minWordsFor).
 */
export const MIN_WORDS = {
  default: 120,
  '/contact': 80,
  '/blog/': 400,
  // Company pages are the reason this surface is being indexed at all: ~20-30
  // verbatim question titles plus the header and one sentence of notes each.
  // A company that clears MIN_POSTS_FOR_PAGE and still renders under 350 words
  // means the seed did not land — check the injected payload before lowering.
  '/interview-questions/': 350,
  // The directory itself is a card grid + hero; it carries no question text,
  // so it sits near the generic floor rather than the company-page one.
  '/interview-questions': 120,
};

/**
 * Resolve the floor for a route: exact match first, then the longest matching
 * trailing-slash prefix rule, then the default.
 *
 * Longest-prefix, not first-match: '/interview-questions/' and
 * '/interview-questions' both "match" a company page under a naive scan, and
 * object key order would decide which one won.
 */
export function minWordsFor(route) {
  if (route in MIN_WORDS) return MIN_WORDS[route];
  const prefix = Object.keys(MIN_WORDS)
    .filter((k) => k.endsWith('/') && route.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? MIN_WORDS[prefix] : MIN_WORDS.default;
}

/**
 * A company needs at least this many published notes to get its own page.
 *
 * Not a cosmetic threshold. A few hundred near-empty company pages generated
 * from one template is the textbook shape of both "scaled content abuse" and
 * "doorway pages"; this gate plus the first-wave cap in prerender.mjs are what
 * keep the surface on the right side of that line. Raising the page count
 * means re-checking content density per page first, not just this number.
 */
export const MIN_POSTS_FOR_PAGE = 10;

/**
 * Company display name -> URL slug. THE slug rule: the directory's links, the
 * sitemap's <loc> entries and the prerenderer's route list must all agree, or
 * we publish URLs that resolve to a page querying the wrong company.
 *
 * ⚠️ This is deliberately one-way. It is NOT invertible: 'Scale.ai',
 * 'Booking.com' and 'AT&T' all collapse punctuation, and no amount of
 * title-casing turns 'at-t' back into 'AT&T'. Anything that needs the display
 * name for a slug must look it up in the company list — never re-derive it.
 * See resolveCompanyName in src/utils/companySlug.ts.
 */
export function companySlug(name) {
  return String(name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Flatten GET /community/public/companies/stats into a single company list.
 * The payload nests companies under categories[]; each carries its own
 * category, so the group's is only a fallback.
 *
 * Shared by the sitemap function and the prerenderer so "which companies get a
 * page" is computed identically in both.
 */
export function flattenCompanyStats(data) {
  const groups = Array.isArray(data?.categories) ? data.categories : [];
  return groups.flatMap((g) =>
    (Array.isArray(g.companies) ? g.companies : []).map((c) => ({
      company: c.company,
      category: c.category ?? g.category ?? '',
      postCount: c.postCount ?? 0,
      recentPostCount: c.recentPostCount ?? 0,
      latestUpdatedAt: c.latestUpdatedAt ?? null,
    })),
  );
}

/**
 * The companies that earn a page, most notes first.
 *
 * Merges duplicate rows before applying the gate: the stats API groups by
 * category, so a company whose posts carry inconsistent categories comes back
 * once per group (Scale.ai appears under both "Mid-sized" and "FAANG / Big
 * Tech"). Gating on the un-merged rows would drop a company whose *total* is
 * well over the threshold because neither half reached it on its own.
 */
export function eligibleCompanies(data, minPosts = MIN_POSTS_FOR_PAGE) {
  const bySlug = new Map();
  for (const c of flattenCompanyStats(data)) {
    const slug = companySlug(c.company);
    if (!slug) continue;
    const prev = bySlug.get(slug);
    if (!prev) {
      bySlug.set(slug, { ...c, slug });
      continue;
    }
    prev.postCount += c.postCount;
    prev.recentPostCount += c.recentPostCount;
    if (c.latestUpdatedAt && (!prev.latestUpdatedAt || c.latestUpdatedAt > prev.latestUpdatedAt)) {
      prev.latestUpdatedAt = c.latestUpdatedAt;
    }
  }
  return [...bySlug.values()]
    .filter((c) => c.postCount >= minPosts)
    .sort((a, b) => b.postCount - a.postCount);
}

/**
 * Filename of the untouched SPA shell. Must match the destination of every
 * SPA rewrite in vercel.json — dist/index.html gets overwritten by the home
 * page snapshot, so it can no longer serve that role.
 */
export const SHELL = 'app.html';
