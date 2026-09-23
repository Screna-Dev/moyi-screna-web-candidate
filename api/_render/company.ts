import type { IncomingMessage } from 'node:http';
import {
  composeDocument,
  notFoundPage,
  renderHead,
  unavailablePage,
  type Rendered,
} from './document.js';
import { esc, join, seedTag, shouldNoindexOnLength } from './html.js';
import {
  UpstreamError,
  fetchCompanyPosts,
  fetchCompanyProfile,
  fetchCompanyStats,
  type CompanyProfile,
  type PublicPost,
} from './community.js';
// Plain .mjs manifest, shared with scripts/ and src/ — see scripts/routes.mjs.
import {
  COMPANY_PAGE_SIZE,
  MIN_POSTS_FOR_PAGE,
  companyPageCount,
  companyPageWindow,
  companySeoDescription,
  companySeoTitle,
  eligibleCompanies,
} from '../../scripts/routes.mjs';

// /interview-questions/:company and /interview-questions/:company/page/:n,
// rendered per request.
//
// Two things this file decides, and they are separate:
//
//   Does the page EXIST?      Every company in the library gets one — all ~700.
//   Should it be INDEXED?     Only the ~191 with MIN_POSTS_FOR_PAGE notes or
//                             more; the rest are `noindex, follow`.
//
// Keeping them separate is the point. The threshold exists so we do not hand
// Google several hundred near-empty pages built from one template, which is
// what "doorway pages" describes — that argument is about the INDEX. It says
// nothing about whether the page should answer, and answering with the SPA
// shell stranded the ~1,388 notes belonging to the smaller companies: nothing
// on the site linked to them, so nothing could crawl to them. A rendered
// `noindex, follow` page is a crawl path that is not an index entry, which is
// precisely what those companies need.

interface CompanyRow {
  company: string;
  slug: string;
  postCount: number;
  latestUpdatedAt?: string | null;
}

let directoryCache: { at: number; rows: CompanyRow[] } | null = null;
const DIRECTORY_TTL_MS = 10 * 60 * 1000;

/**
 * slug -> the exact display name the API indexes, from the company list.
 *
 * Looked up, never derived. companySlug is lossy and one-way: 'AT&T' and
 * 'Scale.ai' both collapse, and title-casing 'at-t' back produces a name the
 * API reports as not found — which is how 18 of the library's companies used
 * to render as empty pages. The list is the only thing that can invert it.
 *
 * Cached for ten minutes per instance. The payload is one aggregate of ~704
 * rows and the API guide recommends caching it; ten minutes is short enough
 * that a newly-posted-to company becomes renderable without a deploy.
 */
async function directory(): Promise<CompanyRow[]> {
  if (directoryCache && Date.now() - directoryCache.at < DIRECTORY_TTL_MS) {
    return directoryCache.rows;
  }
  const stats = await fetchCompanyStats();
  if (!stats) throw new UpstreamError('companies/stats: no payload');
  // minPosts 0: every company, merged by slug and sorted by note count. The
  // threshold is applied later, per page, because it decides indexing and not
  // existence.
  const rows = eligibleCompanies(stats, 0) as CompanyRow[];
  directoryCache = { at: Date.now(), rows };
  return rows;
}

function formatMonth(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** The first question note with any text. On the public endpoint this is already one sentence. */
function firstNoteOf(post: PublicPost): string {
  for (const q of Array.isArray(post.questions) ? post.questions : []) {
    const n = (q?.notes ?? '').trim();
    if (n) return n;
  }
  return '';
}

/**
 * One note card.
 *
 * The `href="/experience/<id>"` is the reason this page exists for the
 * crawler: the company pages plus their pagination are the only complete set
 * of links into the ~18,700 note pages, since the note URLs are uuids that
 * nothing else enumerates.
 */
function noteCard(post: PublicPost, companyName: string): string {
  const questions = Array.isArray(post.questions) ? post.questions : [];
  const teaser = firstNoteOf(post);
  const subject =
    [post.role, post.company || companyName].filter(Boolean).join(' interview at ') || 'this interview';
  const continuation =
    `The rest of the author's notes on ${subject}` +
    (post.round ? `, ${post.round} round` : '') +
    `, covers how they worked through the question, what the panel pushed back on, and what they would do differently.`;

  return join(
    '<article class="bg-white rounded-2xl border border-[hsl(220,16%,90%)] mb-4"><div class="p-6">',
    '<h2 class="flex items-center gap-1.5 text-sm font-normal tracking-normal">',
    `<span class="font-semibold text-[hsl(222,22%,15%)]">${esc(post.company || companyName)}</span>`,
    '<span class="text-[hsl(222,12%,70%)]">·</span>',
    `<span class="text-[hsl(222,12%,45%)]">${esc(post.role || 'Unknown Role')}</span>`,
    '<span class="text-[hsl(222,12%,70%)]">·</span>',
    `<span class="text-[hsl(222,12%,45%)]">${esc(post.round || 'Not specified')}</span>`,
    '</h2>',
    formatMonth(post.date) &&
      `<div class="flex items-center gap-3 text-xs text-[hsl(222,12%,55%)] mb-3">${esc(
        formatMonth(post.date),
      )}</div>`,
    post.summary &&
      `<div class="text-sm text-[hsl(222,12%,35%)] leading-relaxed mb-4">${esc(post.summary)}</div>`,
    questions.length &&
      join(
        '<ul class="flex flex-wrap items-center gap-2 mb-5">',
        ...questions.map(
          (q) =>
            `<li class="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-xs text-[hsl(222,22%,25%)]">${esc(
              q?.title || 'Question',
            )}</li>`,
        ),
        '</ul>',
      ),
    teaser &&
      join(
        '<div class="mb-5 rounded-xl border border-[hsl(220,16%,92%)] bg-[hsl(220,20%,98%)] px-4 py-3">',
        `<p class="text-sm leading-relaxed text-[hsl(222,12%,35%)] italic">&ldquo;${esc(teaser)}&rdquo; `,
        `<span class="paywalled-note select-none blur-sm" aria-hidden="true">${esc(continuation)}</span>`,
        '</p></div>',
      ),
    `<p class="pt-4 border-t border-[hsl(220,16%,94%)]"><a class="px-4 py-1.5 rounded-lg bg-[hsl(222,22%,15%)] text-white text-xs font-medium" href="/experience/${esc(
      post.id,
    )}">View Post</a></p>`,
    '</div></article>',
  );
}

/**
 * The pager: real anchors, because a crawler does not click.
 *
 * "Load more" is a button that appends the next API page, which is fine for a
 * reader and invisible to everything else — it is why each company page only
 * ever exposed its ten newest notes. These links are the fix, and they are
 * plain <a href> for that reason.
 *
 * Windowed rather than exhaustive: Meta has 238 pages, and 238 anchors on every
 * page is both unreadable and a poor internal link graph. First, last and a
 * window around the current page reaches every page within a few hops.
 */
function pager(slug: string, pageCount: number, current: number | null): string {
  if (pageCount <= 1 && current === null) {
    // One page of archive and we are on the company page itself: the notes
    // above already are the whole library for this company.
    return '';
  }
  const window = new Set<number>([1, pageCount]);
  const around = current ?? 1;
  for (let i = around - 2; i <= around + 2; i += 1) {
    if (i >= 1 && i <= pageCount) window.add(i);
  }
  const numbers = [...window].sort((a, b) => a - b);

  const items: string[] = [];
  let previous = 0;
  for (const n of numbers) {
    if (n - previous > 1) items.push('<li aria-hidden="true">…</li>');
    previous = n;
    items.push(
      n === current
        ? `<li><span aria-current="page" class="px-3 py-1.5 rounded-lg bg-[hsl(222,22%,15%)] text-white text-xs font-medium">${n}</span></li>`
        : `<li><a class="px-3 py-1.5 rounded-lg border border-[hsl(220,16%,90%)] text-xs font-medium text-[hsl(222,12%,45%)]" href="/interview-questions/${esc(
            slug,
          )}/page/${n}">${n}</a></li>`,
    );
  }

  return join(
    '<nav class="pt-6 pb-2" aria-label="All notes, oldest first">',
    '<h2 class="text-sm font-semibold text-[hsl(222,12%,45%)] uppercase tracking-wider mb-3">Every note, oldest first</h2>',
    '<ul class="flex flex-wrap items-center gap-2">',
    ...items,
    '</ul>',
    '</nav>',
  );
}

function renderBody({
  name,
  slug,
  profile,
  posts,
  noteTotal,
  pageCount,
  current,
}: {
  name: string;
  slug: string;
  profile: CompanyProfile | null;
  posts: PublicPost[];
  noteTotal: number;
  pageCount: number;
  current: number | null;
}): string {
  return join(
    '<div class="pb-20 bg-[#f9fafb]"><div class="max-w-6xl mx-auto px-6 my-[24px]">',
    '<p class="mb-6"><a class="inline-flex items-center gap-2 text-sm font-medium text-[hsl(222,12%,45%)]" href="/interview-questions">&larr; Back to Directory</a></p>',
    '<header class="mb-10">',
    `<h1 class="text-[34px] md:text-[40px] font-semibold tracking-tight leading-none text-[hsl(222,22%,15%)] font-[family-name:var(--font-serif)]">${esc(
      name,
    )}${current ? ` <span class="text-[20px] font-normal text-[hsl(222,12%,45%)]">interview notes, page ${current} of ${pageCount}</span>` : ''}</h1>`,
    profile?.category &&
      `<p class="mt-3 text-xs font-medium text-[hsl(221,91%,60%)]">${esc(profile.category)}</p>`,
    profile?.summary &&
      `<p class="mt-3 max-w-2xl text-base text-[hsl(222,12%,45%)]">${esc(profile.summary)}</p>`,
    `<p class="mt-4 text-sm text-[hsl(222,12%,45%)]">${noteTotal} interview ${
      noteTotal === 1 ? 'note' : 'notes'
    }${profile?.latestUpdatedAt ? ` · updated ${esc(formatMonth(profile.latestUpdatedAt))}` : ''}</p>`,
    '</header>',
    posts.length
      ? join(...posts.map((p) => noteCard(p, name)))
      : '<p class="text-sm text-[hsl(222,12%,45%)]">No published notes for this company yet.</p>',
    pager(slug, pageCount, current),
    '</div></div>',
  );
}

/**
 * The notes one crawlable page shows.
 *
 * The company page itself shows the ten NEWEST — that is what a reader wants,
 * and it is what the client renders from the seed. `/page/:n` shows a window of
 * the oldest-first sequence instead, which is a different question than "what
 * is new", so the two coexist rather than one canonicalising away the other.
 *
 * Reading page 0 first is not waste: it is the only way to learn `total`, and
 * `total` is what the window arithmetic needs. It must be the FEED's total, not
 * profile.postCount — the former is the Elasticsearch count the pages are cut
 * from, the latter a database aggregate that lags it by tens of notes. Paging
 * off the wrong one silently drops or repeats notes at the boundaries.
 */
async function collectPage(
  name: string,
  current: number | null,
): Promise<{ posts: PublicPost[]; total: number }> {
  const head = await fetchCompanyPosts(name, 0);
  if (current === null) return { posts: head.posts, total: head.total };

  const { from, take } = companyPageWindow(head.total, current);
  if (take <= 0) return { posts: [], total: head.total };

  const firstApiPage = Math.floor(from / COMPANY_PAGE_SIZE);
  const lastApiPage = Math.floor((from + take - 1) / COMPANY_PAGE_SIZE);
  const rows: PublicPost[] = [];
  for (let p = firstApiPage; p <= lastApiPage; p += 1) {
    const batch = p === 0 ? head : await fetchCompanyPosts(name, p);
    rows.push(...batch.posts);
  }
  const offset = from - firstApiPage * COMPANY_PAGE_SIZE;
  // Reversed, so a page reads oldest -> newest within itself as well as across
  // the series.
  return { posts: rows.slice(offset, offset + take).reverse(), total: head.total };
}

/**
 * Render a company page, or a page of its archive.
 *
 * `current` is null for /interview-questions/:company and the 1-based page
 * number for /interview-questions/:company/page/:n.
 */
export async function renderCompanyPage(
  req: IncomingMessage,
  slug: string,
  current: number | null,
): Promise<Rendered> {
  let row: CompanyRow | undefined;
  let profile: CompanyProfile | null = null;
  let posts: PublicPost[] = [];
  let feedTotal = 0;

  try {
    row = (await directory()).find((c) => c.slug === slug);
    if (!row) return notFoundPage('We have no interview notes for this company.');
    // The profile is optional: a company with no profile row answers
    // 400/NOT_FOUND, which is a real state rather than a failure. The notes
    // are not optional — without them there is no page.
    const [profileResult, pageResult] = await Promise.all([
      fetchCompanyProfile(row.company),
      collectPage(row.company, current),
    ]);
    profile = profileResult;
    posts = pageResult.posts;
    feedTotal = pageResult.total;
  } catch (err) {
    if (err instanceof UpstreamError) return unavailablePage();
    throw err;
  }

  const name = profile?.displayName || row.company;
  const pageCount = companyPageCount(feedTotal);

  // A /page/:n beyond the end is a 404, not an empty page: those URLs are
  // guessable, and an empty one would be a thin page advertising itself as
  // real. n is never 0 — the route only matches 1 and up.
  if (current !== null && (current > pageCount || posts.length === 0)) {
    return notFoundPage('There is no such page of notes for this company.');
  }

  const body = renderBody({
    name,
    slug,
    profile,
    posts,
    // The displayed count is the profile's, which is the one number the client
    // page shows too; the feed's total drives pagination and is never rendered.
    noteTotal: profile?.postCount ?? feedTotal,
    pageCount,
    current,
  });

  // The threshold decides indexing only. Below it the page still renders in
  // full and still links to every one of its notes — it just does not become
  // an index entry of its own.
  const belowThreshold = (row.postCount ?? 0) < MIN_POSTS_FOR_PAGE;
  const thin = shouldNoindexOnLength(body);
  const noindex = belowThreshold || thin;

  const head = renderHead({
    title: companySeoTitle(name, current),
    description: companySeoDescription(name, profile?.postCount ?? feedTotal, current, pageCount),
    // Page 1 points at the company page. They are the two halves of one
    // entry point — page 1 is the tail of the archive, the company page the
    // head of it — and only one of the pair should compete for the company's
    // name as a query. Every later page is its own canonical, because its
    // notes appear nowhere else.
    canonicalPath: current === 1 ? `/interview-questions/${slug}` : pathFor(slug, current),
    type: 'article',
    noindex,
    jsonLd: noindex
      ? undefined
      : [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: `${name} Interview Questions & Experiences`,
            ...(profile?.summary ? { description: profile.summary } : {}),
            isAccessibleForFree: false,
            hasPart: {
              '@type': 'WebPageElement',
              isAccessibleForFree: false,
              cssSelector: '.paywalled-note',
            },
          },
        ],
  });

  // `page` is what tells the client this seed is for an archive window rather
  // than the newest ten. Without it the page would render the server's
  // oldest-first window and then replace it with the newest ten on boot.
  const seeds = [
    seedTag('__prerender_company__', {
      profile: profile ?? { displayName: name },
      posts,
      total: feedTotal,
      page: current,
    }),
  ];

  try {
    return { status: 200, html: await composeDocument(req, { head, body, seeds }) };
  } catch (err) {
    console.error(`[render:company] ${slug}: shell unavailable — ${(err as Error)?.message}`);
    return unavailablePage();
  }
}

export function pathFor(slug: string, current: number | null): string {
  return current === null
    ? `/interview-questions/${slug}`
    : `/interview-questions/${slug}/page/${current}`;
}
