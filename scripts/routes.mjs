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
  // A single note. Only posts clearing MIN_POST_CONTENT_WORDS are prerendered
  // at all, and the rendered page adds the header, sidebar and question
  // scaffolding on top of that content, so a snapshot below this floor means
  // the seed did not land rather than that the note is short.
  '/experience/': 250,
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

// ─── Single notes (/experience/:id) ─────────────────────────────────────────
//
// The company pages carry one first-sentence teaser per note; the note page is
// the only surface with the whole write-up, so it is the one worth indexing.
// The danger is scale: there are ~6,800 notes and half of them are a single
// question plus one trimmed sentence. Publishing those is the textbook shape
// of thin and scaled content, and it would be ~3,000 pages of it at once, each
// largely duplicating a card that already exists on a company page.
//
// So the gate is on measured content, not on "does a post exist". The same
// three consumers apply it, which is why it lives here:
//
//   • api/sitemap.ts       — decides which notes are advertised
//   • scripts/prerender.mjs — decides which notes get a snapshot
//   • experience-detail.tsx — marks everything else noindex, which is the part
//     that actually holds the line. robots.txt has to open /experience as a
//     prefix (there is no pattern for "only the good ones"), and company pages
//     link to ten notes each, so a crawler will reach ungated notes no matter
//     what the sitemap says. The per-page noindex is what keeps them out.

/** Guest-visible content words in a post: summary + question titles + notes. */
export function postContentWords(post) {
  const count = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
  const questions = Array.isArray(post?.questions) ? post.questions : [];
  return (
    count(post?.summary) +
    questions.reduce((n, q) => n + count(q?.title) + count(q?.notes), 0)
  );
}

/** Minimum content words for a note to be worth its own indexed page. */
export const MIN_POST_CONTENT_WORDS = 120;

/**
 * Is this note substantial enough to index?
 *
 * Two questions as well as the word count: a single-question note is a card,
 * not an article, and it says nothing the company page does not already show.
 */
export function isIndexablePost(post, minWords = MIN_POST_CONTENT_WORDS) {
  const questions = Array.isArray(post?.questions) ? post.questions : [];
  return questions.length >= 2 && postContentWords(post) >= minWords;
}

/**
 * The notes that earn a page, richest first.
 *
 * Ordering is deterministic — content words desc, then id — so the sitemap and
 * the prerenderer pick the SAME notes from the same data without coordinating.
 * Ties broken on id rather than left to sort stability, which differs between
 * the two runtimes.
 */
export function eligiblePosts(posts, minWords = MIN_POST_CONTENT_WORDS) {
  return (Array.isArray(posts) ? posts : [])
    .filter((p) => p?.id && isIndexablePost(p, minWords))
    .sort(
      (a, b) =>
        postContentWords(b) - postContentWords(a) ||
        String(a.id).localeCompare(String(b.id)),
    );
}

/**
 * How many notes the first wave publishes, and how deep to scan for them.
 *
 * The public search endpoint ignores every page-size parameter and always
 * returns 10 rows, so covering all ~6,800 notes would be 684 requests — too
 * many for a build step and far too many for a sitemap function that runs per
 * request. Both consumers therefore scan the same fixed number of pages of the
 * newest notes and take the best of what they find. Raising POST_PAGE_BUDGET
 * costs one request per page, in both places.
 */
export const POST_PAGE_BUDGET = 20;
export const POST_FIRST_WAVE = 40;

/**
 * Newest-first pages of GET /community/public/posts/search, flattened.
 *
 * `fetchFn` is injected so the prerenderer can pass its retrying fetch and the
 * sitemap its plain one. Stops early on the first page that fails or comes
 * back empty rather than throwing: a short list degrades to fewer indexed
 * notes, where a throw would take down the build or the whole sitemap.
 */
export async function collectPublicPosts({ apiBase, pages = POST_PAGE_BUDGET, fetchFn = fetch }) {
  const out = [];
  for (let page = 0; page < pages; page += 1) {
    let batch;
    try {
      const res = await fetchFn(
        `${apiBase}/community/public/posts/search?page=${page}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) break;
      const json = await res.json();
      batch = (json.data ?? json)?.posts;
    } catch {
      break;
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
  }
  return out;
}

/**
 * Filename of the untouched SPA shell. Must match the destination of every
 * SPA rewrite in vercel.json — dist/index.html gets overwritten by the home
 * page snapshot, so it can no longer serve that role.
 */
export const SHELL = 'app.html';
