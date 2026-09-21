/**
 * Shared manifest for the public, indexable surface: which routes get a static
 * prerendered page, the slug rule, the indexing gates and the head copy.
 *
 * Consumed by scripts/prerender.mjs, scripts/sitemap.mjs, the request-time
 * renderers under api/_render, and the app (through the typed wrappers in
 * src/utils). Every rule here has at least two consumers that must agree
 * exactly — the sitemap decides which URLs are advertised, the renderer decides
 * what each one answers with, and the page rewrites the same head tags when the
 * bundle boots. A second copy of any of them is a page that contradicts itself.
 *
 * PRERENDER_STATIC below is asserted against vercel.json and robots.txt by
 * src/test/vercel-routes.test.ts: adding a public page means touching this
 * list, a fallback rewrite, and an Allow rule.
 *
 * Only the static pages and the blog are snapshotted now. Company pages and
 * single notes are rendered per request — the library is ~18,700 notes across
 * ~700 companies, and a snapshot of each is one page load plus 1+N API calls on
 * every deploy.
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
  // The directory is a card grid + hero; it carries no question text, so it
  // sits near the generic floor. The company pages it links to had their own
  // (350) until they stopped being snapshotted — they are rendered per request
  // now and answer to RENDERED_MIN_WORDS instead.
  '/interview-questions': 120,
};

/**
 * Word floor for a page rendered at REQUEST time, below which it goes noindex.
 *
 * A different mechanism from MIN_WORDS above, which fails a build. There is no
 * build to fail here: /experience/:id and the company pages are rendered per
 * request now, so the only available response to "this came out almost empty"
 * is to serve it and keep it out of the index.
 *
 * It is also the only check that can catch the case. isIndexablePost reads the
 * post row; the page also has the AI hints, which are the bulk of its text
 * (~294 words per question against a median of 101 for the note itself). When
 * the hints are missing the gate still says "index", and this is what notices.
 */
export const RENDERED_MIN_WORDS = 250;

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
 * "doorway pages", and this gate is what keeps the surface on the right side of
 * that line.
 *
 * It gates the INDEX, not the page. Every company in the library is rendered
 * (api/_render/company.ts); the ones below this line are `noindex, follow` and
 * stay out of the sitemap. That distinction is deliberate — the smaller
 * companies hold ~1,388 notes between them, and while their pages answered with
 * the SPA shell nothing on the site linked to any of those notes. A rendered
 * noindex page is a crawl path without being an index entry.
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

// ─── Single notes (/experience/:id) ─────────────────────────────────────────
//
// The company pages carry one first-sentence teaser per note; the note page is
// the only surface with the whole write-up, so it is the one worth indexing.
//
// The gate below used to require two questions and 120 words of the
// candidate's own text, and that measured the wrong thing. It counts summary +
// question titles + notes and stops there — it does not count the AI hints,
// which are per-question, generated rather than templated, and the largest body
// of text on the page: ~294 words for one question, against a median of 101
// words for everything the gate does count. So a single-question note reads as
// "thin" at 60 words of notes while the page it produces carries ~350, and 66%
// of the library was being marked noindex on that arithmetic.
//
// The threshold is now "has a question", and it stays two named constants
// rather than an inline comparison for a specific reason: if coverage data
// comes back badly — impressions without clicks, "crawled, currently not
// indexed" piling up — narrowing the surface is editing these two numbers, in
// one place, with no other code to change.
//
// Three consumers apply it, which is why it lives here:
//
//   • scripts/sitemap.mjs   — decides which notes are advertised
//   • api/_render/note.ts    — decides which notes render `index, follow`
//   • experience-detail.tsx  — writes the same robots meta when the bundle boots
//
// The sitemap and the page must agree, and they do: neither reads the hints, so
// neither can reach a different answer. The renderer additionally applies
// RENDERED_MIN_WORDS to what it actually produced, which is the one check the
// sitemap side cannot make.

/** Guest-visible content words in a post: summary + question titles + notes. */
export function postContentWords(post) {
  const count = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
  const questions = Array.isArray(post?.questions) ? post.questions : [];
  return (
    count(post?.summary) +
    questions.reduce((n, q) => n + count(q?.title) + count(q?.notes), 0)
  );
}

/**
 * The two dials on the note gate. Raise either to narrow the indexed surface.
 *
 * MIN_POST_QUESTIONS = 1: a note with no questions has nothing on it that the
 * company page's card does not already show, and nothing for the hints to be
 * generated from — those are the pages worth withholding. One question is
 * enough, because one question brings its own hints with it.
 *
 * MIN_POST_CONTENT_WORDS = 0: the word count is measured over text that
 * excludes the hints, so it cannot say whether the PAGE is thin — only whether
 * the note is short. RENDERED_MIN_WORDS, applied to the rendered body, is the
 * check that can, and it is the one that runs.
 */
export const MIN_POST_QUESTIONS = 1;
export const MIN_POST_CONTENT_WORDS = 0;

/** Is this note worth its own indexed page? Having a question is the bar. */
export function isIndexablePost(post, minWords = MIN_POST_CONTENT_WORDS) {
  const questions = Array.isArray(post?.questions) ? post.questions : [];
  return questions.length >= MIN_POST_QUESTIONS && postContentWords(post) >= minWords;
}

// ─── Head copy shared by the page and the renderer ──────────────────────────

/** Suffix every indexable <title> carries. */
export const SEO_BRAND = ' | Screna AI';
/** Google truncates the displayed title around here. */
export const SEO_TITLE_MAX = 60;

/**
 * The <title> for one note page.
 *
 * Trims the VARIABLE part to fit and then appends the brand — the order is the
 * whole point. Building the full string first and slicing it to 60 puts the cut
 * inside " | Screna AI", which is how all 40 snapshots shipped titles ending in
 * a dangling separator with the brand gone:
 *
 *   Amazon Software Engineer Interview — Onsite - Multi Round |
 *   Axon Software Engineer Interview — Onsite - System Design /
 *
 * The cut lands on a word boundary and then strips trailing punctuation, which
 * covers the other half of the same problem: "Onsite - Mu" and "Onsite -" are
 * both worse than "Onsite".
 *
 * Shared, because the same string is written twice per visit — here for the
 * server-rendered HTML (api/_render/note.ts) and again by useSeo when the
 * bundle boots. It is also og:title and twitter:title.
 */
export function noteSeoTitle(post) {
  const core = `${post?.company ?? ''} ${post?.role ?? ''} Interview${post?.round ? ` — ${post.round}` : ''}`.trim();
  const budget = SEO_TITLE_MAX - SEO_BRAND.length;
  let head = core.slice(0, budget);
  if (core.length > budget) {
    const lastSpace = head.lastIndexOf(' ');
    if (lastSpace > 0) head = head.slice(0, lastSpace);
  }
  return `${head.replace(/[\s\u2014\-/·|,;:]+$/, '')}${SEO_BRAND}`;
}

/**
 * Page size of the crawlable company pagination, fixed by the API.
 *
 * GET /community/public/posts/search returns 10 rows and ignores every
 * page-size parameter, so this is a statement of fact rather than a choice.
 * When the backend honours `size`, the pagination arithmetic in
 * api/_render/company.ts is what has to change with it.
 */
export const COMPANY_PAGE_SIZE = 10;

/** Number of /page/:n URLs a company with this many notes has. */
export function companyPageCount(total) {
  return Math.max(1, Math.ceil((Number(total) || 0) / COMPANY_PAGE_SIZE));
}

/**
 * The window of the NEWEST-ordered result set that /page/:n shows.
 *
 * The pagination runs OLDEST FIRST, which is the whole reason this function
 * exists. Under newest-first, publishing one note shifts every page's contents
 * by one: a crawler fetching /page/7 gets different notes every visit, and URLs
 * whose content never settles do not get indexed. Oldest-first pins every page
 * but the last — a new note can only ever land at the end.
 *
 * The API will not sort for us (NEWEST is fixed server-side and no sort
 * parameter is read), so the reversal is arithmetic on the offsets: page n
 * starts `total - size*n` items into the newest-first sequence. Because a new
 * note pushes every existing note one index later, that offset keeps naming the
 * same notes as `total` grows — which is exactly the stability being bought.
 *
 * The last page is the short one, and `from`/`take` span at most two API pages.
 */
export function companyPageWindow(total, n, size = COMPANY_PAGE_SIZE) {
  const start = (Number(total) || 0) - size * n;
  const from = Math.max(start, 0);
  const take = size - Math.max(-start, 0);
  return { from, take: Math.max(take, 0) };
}

// ─── Company page head copy ─────────────────────────────────────────────────
//
// Shared for the same reason noteSeoTitle is: the server-side renderer writes
// these tags into the HTML and the page's useSeo rewrites them on boot, so a
// second copy of the wording is a page that describes itself two ways.

export function companySeoTitle(name, page) {
  const core = page
    ? `${name} Interview Questions — Page ${page}`
    : `${name} Interview Questions & Experiences`;
  return `${core}${SEO_BRAND}`;
}

export function companySeoDescription(name, noteCount, page, pageCount) {
  const core = page
    ? `${name} interview notes, page ${page} of ${pageCount}: verbatim questions from real interviews, oldest first.`
    : `${noteCount} real ${name} interview write-ups: verbatim questions by role, round and level.`;
  return core.slice(0, 155);
}

// eligiblePosts / collectPublicPosts / POST_FIRST_WAVE / POST_PAGE_BUDGET used
// to live here and are gone with the surface they served.
//
// They existed to pick a first wave: the public search endpoint returns 10 rows
// and ignores every page-size parameter, so a per-request sitemap function and
// a build-time snapshot loop could each afford ~20 pages of the newest notes,
// then rank what they found and take the top 40. Nothing truncates now —
// scripts/sitemap.mjs scans the whole library sharded by company, and
// /experience/:id is rendered on demand — so a helper whose purpose is "the
// best 40 of the newest 200" has no caller and would be a trap for the next
// one, which is why it is deleted rather than left unused.

/**
 * Filename of the untouched SPA shell. Must match the destination of every
 * SPA rewrite in vercel.json — dist/index.html gets overwritten by the home
 * page snapshot, so it can no longer serve that role.
 */
export const SHELL = 'app.html';
