import type { IncomingMessage } from 'node:http';
import {
  SITE_URL,
  composeDocument,
  notFoundPage,
  renderHead,
  unavailablePage,
  type Rendered,
} from './document.js';
import { esc, join, seedTag, shouldNoindexOnLength } from './html.js';
import {
  UpstreamError,
  fetchCompanyBreakdown,
  fetchCompanyPosts,
  fetchCompanyProfile,
  fetchCompanyRoleCounts,
  fetchRoleStats,
  type CompanyBreakdown,
  type CompanyProfile,
  type PublicPost,
} from './community.js';
import { fetchCompanyGuides, type CompanyGuide } from './blog.js';
// Plain .mjs manifest, shared with scripts/ and src/ — see scripts/routes.mjs.
import {
  COMPANY_PAGE_SIZE,
  MIN_POSTS_FOR_PAGE,
  ROLE_SLUGS,
  companyPageCount,
  companyPageWindow,
  companyFaq,
  companyFaqJsonLd,
  companyIntro,
  companyRoleGuidesHeading,
  companyRoleIntro,
  companyRoleJsonLd,
  companyMoreRoles,
  companyRoleLinks,
  companyRoleSeoDescription,
  companyRoleSeoTitle,
  companySeoDescription,
  companySeoTitle,
  guideLabel,
  isIndexableRole,
  roleLabelForSlug,
  showRoleBar,
} from '../../scripts/routes.mjs';

type RoleLink = { slug: string; label: string; count: number };
const ROLE_LABELS = Object.values(ROLE_SLUGS) as string[];

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

/** The FAQ section. Same card markup as noteCard. */
function faqSection(name: string, faq: { question: string; answer: string }[]): string {
  return join(
    '<section class="mt-10">',
    `<h2 class="text-sm font-semibold text-[hsl(222,22%,15%)] mb-4">${esc(name)} interview FAQ</h2>`,
    ...faq.map(
      ({ question, answer }) =>
        '<article class="bg-white rounded-2xl border border-[hsl(220,16%,90%)] mb-4"><div class="p-6">' +
        `<h3 class="text-sm font-semibold text-[hsl(222,22%,15%)]">${esc(question)}</h3>` +
        `<p class="mt-3 text-sm text-[hsl(222,12%,45%)]">${esc(answer)}</p>` +
        '</div></article>',
    ),
    '</section>',
  );
}

// lucide ArrowRight, the icon the client renders in the same spot.
const ARROW_RIGHT =
  '<svg class="shrink-0 text-[hsl(222,12%,55%)]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

/**
 * Blog posts tagged with this company in the Studio, one card each: eyebrow
 * (guideLabel), title, arrow. The whole card is a plain <a href> so the links
 * are in the HTML a crawler reads; card shell as faqSection. No guides, no
 * section — not even the heading.
 */
function guidesSection(name: string, guides: CompanyGuide[]): string {
  return join(
    '<section class="mt-10">',
    `<h2 class="text-sm font-semibold text-[hsl(222,22%,15%)] mb-4">${esc(name)} interview guides</h2>`,
    ...guides.map((g) => {
      const label = guideLabel(g.title);
      return join(
        `<a class="flex items-center gap-6 bg-white rounded-2xl border border-[hsl(220,16%,90%)] mb-4 p-6" href="/blog/${esc(g.slug)}">`,
        '<div class="min-w-0 flex-1">',
        label && `<p class="text-xs font-medium text-[hsl(221,91%,60%)]">${esc(label)}</p>`,
        `<h3 class="${label ? 'mt-2 ' : ''}text-base font-semibold text-[hsl(222,22%,15%)]">${esc(g.title)}</h3>`,
        '</div>',
        ARROW_RIGHT,
        '</a>',
      );
    }),
    '</section>',
  );
}

/**
 * The role links: "All" back to the company page, then one plain <a> per role
 * that earns an indexed page (companyRoleLinks), with its note count. It is
 * the role filter for readers and crawlers alike — a filter button is not
 * something a crawler follows. `current` is the role page being shown, null on
 * the company page.
 *
 * Then "More roles", a <details> fold with the company's other roles
 * (companyMoreRoles). Those pages are `noindex, follow`, so their links are
 * rel="nofollow": readers can filter by them, crawlers are not sent to thin
 * pages. The fold starts open when `current` is one of them. Nothing at all
 * when showRoleBar says so.
 */
function roleLinksBar(slug: string, links: RoleLink[], more: RoleLink[], current: string | null): string {
  if (!showRoleBar(links, more)) return '';
  const chip = (href: string, label: string, active: boolean, count?: number, nofollow = false) =>
    `<a class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
      active
        ? 'border-[hsl(222,22%,15%)] bg-[hsl(222,22%,15%)] text-white'
        : 'border-[hsl(220,16%,90%)] bg-white text-[hsl(222,12%,45%)]'
    }" href="${esc(href)}"${nofollow ? ' rel="nofollow"' : ''}${active ? ' aria-current="page"' : ''}>${esc(label)}${
      count !== undefined ? ` <span class="opacity-70">${esc(count.toLocaleString('en-US'))}</span>` : ''
    }</a>`;
  const open = more.some((r) => r.slug === current);
  return join(
    '<nav class="mb-6" aria-label="Interview questions by role"><ul class="flex flex-wrap items-center gap-2">',
    `<li>${chip(`/interview-questions/${slug}`, 'All', current === null)}</li>`,
    ...links.map(
      (r) => `<li>${chip(`/interview-questions/${slug}/${r.slug}`, r.label, r.slug === current, r.count)}</li>`,
    ),
    more.length &&
      join(
        `<li><details${open ? ' open' : ''}>`,
        '<summary class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-[hsl(220,16%,90%)] bg-white text-xs font-medium text-[hsl(222,12%,45%)] cursor-pointer list-none">More roles &#9662;</summary>',
        '<ul class="mt-2 flex flex-wrap items-center gap-2">',
        ...more.map(
          (r) =>
            `<li>${chip(`/interview-questions/${slug}/${r.slug}`, r.label, r.slug === current, r.count, true)}</li>`,
        ),
        '</ul></details></li>',
      ),
    '</ul></nav>',
  );
}

/** The company page's closing section: the same role links as cards. */
function roleGuidesSection(name: string, slug: string, links: RoleLink[]): string {
  return join(
    '<section class="mt-10">',
    `<h2 class="text-sm font-semibold text-[hsl(222,22%,15%)] mb-4">${esc(companyRoleGuidesHeading(name))}</h2>`,
    ...links.map((r) =>
      join(
        `<a class="flex items-center gap-6 bg-white rounded-2xl border border-[hsl(220,16%,90%)] mb-4 p-6" href="/interview-questions/${esc(slug)}/${esc(r.slug)}">`,
        '<div class="min-w-0 flex-1">',
        `<p class="text-xs font-medium text-[hsl(221,91%,60%)]">${esc(r.count.toLocaleString('en-US'))} ${r.count === 1 ? 'note' : 'notes'}</p>`,
        `<h3 class="mt-2 text-base font-semibold text-[hsl(222,22%,15%)]">${esc(name)} ${esc(r.label)} interview questions</h3>`,
        '</div>',
        ARROW_RIGHT,
        '</a>',
      ),
    ),
    '</section>',
  );
}

function renderBody({
  name,
  slug,
  profile,
  intro,
  faq,
  guides,
  posts,
  noteTotal,
  pageCount,
  current,
  roleLinks,
  moreRoles,
}: {
  name: string;
  slug: string;
  /** companyRoleLinks(); empty on /page/:n. */
  roleLinks: RoleLink[];
  /** companyMoreRoles(); empty on /page/:n. */
  moreRoles: RoleLink[];
  profile: CompanyProfile | null;
  /** companyIntro() — replaces profile.summary as the opening paragraph. */
  intro: string;
  /** companyFaq(); empty on /page/:n and on small companies. */
  faq: { question: string; answer: string }[];
  /** fetchCompanyGuides(); empty on /page/:n. */
  guides: CompanyGuide[];
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
    // The opening paragraph is built from the breakdown counts, never from
    // profile.summary: a generic company blurb answers nothing about the
    // interview, and with no breakdown the page has no paragraph at all.
    intro && `<p class="mt-3 max-w-2xl text-base text-[hsl(222,12%,45%)]">${esc(intro)}</p>`,
    `<p class="mt-4 text-sm text-[hsl(222,12%,45%)]">${noteTotal} interview ${
      noteTotal === 1 ? 'note' : 'notes'
    }${profile?.latestUpdatedAt ? ` · updated ${esc(formatMonth(profile.latestUpdatedAt))}` : ''}</p>`,
    '</header>',
    current === null && roleLinksBar(slug, roleLinks, moreRoles, null),
    posts.length
      ? join(...posts.map((p) => noteCard(p, name)))
      : '<p class="text-sm text-[hsl(222,12%,45%)]">No published notes for this company yet.</p>',
    // Notes, then guides, then FAQ; the client renders them in the same order.
    guides.length && guidesSection(name, guides),
    // Between the cards and the pager (spec F3); the client renders it in the
    // same place.
    faq.length && faqSection(name, faq),
    // Last on the page, after the FAQ; same links as the bar above.
    current === null && roleLinks.length && roleGuidesSection(name, slug, roleLinks),
    // Archive pages only — the company page has "Load more" instead (client),
    // and its archive is reached through the sitemap and these links.
    current !== null && pager(slug, pageCount, current),
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
  let profile: CompanyProfile | null = null;
  let name = '';
  let breakdown: CompanyBreakdown | null = null;
  let posts: PublicPost[] = [];
  let feedTotal = 0;
  let guides: CompanyGuide[] = [];
  let roleCounts: Record<string, number> = {};
  let roleStats: Awaited<ReturnType<typeof fetchRoleStats>> = [];

  try {
    // The URL segment is the backend's slug, so the profile is looked up by it
    // and is what decides whether the page exists. The breakdown and the feed
    // only take a display name, so they wait for the profile's. Never derive
    // the name from the slug: 'at-t' is 'AT&T'.
    profile = await fetchCompanyProfile({ slug });
    // The backend normalises the slug before matching ('AT-T' finds 'at-t'),
    // so only the exact canonical spelling renders — one URL per company.
    // A renamed company's old slug lands here too.
    if (!profile?.displayName || profile.slug !== slug) {
      return notFoundPage('We have no interview notes for this company.');
    }
    name = profile.displayName;
    // The breakdown follows the profile's rule: 400/NOT_FOUND is null (no
    // intro, no FAQ), a 5xx or a timeout is a 503 for the whole page. The notes
    // are not optional — without them there is no page.
    // Guides are best-effort (never throw) and only on the company page itself.
    // Role counts likewise: company page only, best-effort per role.
    const [breakdownResult, pageResult, guidesResult, roleCountsResult, roleStatsResult] = await Promise.all([
      fetchCompanyBreakdown(name),
      collectPage(name, current),
      current === null ? fetchCompanyGuides(slug) : Promise.resolve([]),
      current === null ? fetchCompanyRoleCounts(name, ROLE_LABELS) : Promise.resolve({}),
      current === null ? fetchRoleStats() : Promise.resolve([]),
    ]);
    roleCounts = roleCountsResult;
    roleStats = roleStatsResult;
    guides = guidesResult;
    breakdown = breakdownResult;
    posts = pageResult.posts;
    feedTotal = pageResult.total;
  } catch (err) {
    if (err instanceof UpstreamError) return unavailablePage();
    throw err;
  }

  const pageCount = companyPageCount(feedTotal);

  // A /page/:n beyond the end is a 404, not an empty page: those URLs are
  // guessable, and an empty one would be a thin page advertising itself as
  // real. n is never 0 — the route only matches 1 and up.
  if (current !== null && (current > pageCount || posts.length === 0)) {
    return notFoundPage('There is no such page of notes for this company.');
  }

  // The intro is on every page of the series; the FAQ only on the company
  // page itself, so the archive pages do not repeat one FAQPage 200 times.
  const intro = companyIntro(name, breakdown);
  const faq = current === null ? companyFaq(name, breakdown) : [];
  const faqJsonLd = current === null ? companyFaqJsonLd(name, breakdown) : null;
  // Gated on the feed's total: the role counts are search totals too.
  const roleLinks: RoleLink[] = companyRoleLinks(roleCounts, feedTotal);
  // The indexed links stay on the search totals above; the fold is only what
  // they leave out, so it can never change which pages are advertised.
  const moreRoles: RoleLink[] = current === null ? companyMoreRoles(roleStats, name, roleLinks) : [];

  const body = renderBody({
    name,
    slug,
    roleLinks,
    moreRoles,
    profile,
    intro,
    faq,
    guides,
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
  const belowThreshold = (profile?.postCount ?? 0) < MIN_POSTS_FOR_PAGE;
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
            ...(intro ? { description: intro } : {}),
            isAccessibleForFree: false,
            hasPart: {
              '@type': 'WebPageElement',
              isAccessibleForFree: false,
              cssSelector: '.paywalled-note',
            },
          },
          ...(faqJsonLd ? [faqJsonLd] : []),
        ],
  });

  // `page` is what tells the client this seed is for an archive window rather
  // than the newest ten. Without it the page would render the server's
  // oldest-first window and then replace it with the newest ten on boot.
  const seeds = [
    // profile.summary is dropped so the blurb is nowhere in the page source;
    // the client builds its intro from `breakdown`, exactly as this does.
    seedTag('__prerender_company__', {
      profile: profile ? { ...profile, summary: undefined } : { displayName: name },
      breakdown,
      posts,
      total: feedTotal,
      page: current,
      guides,
      roleLinks,
      moreRoles,
      // The client applies this as-is: it cannot see the rendered body, so it
      // would get the word-floor half of the decision wrong.
      noindex,
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

// ─── /interview-questions/:company/:role ────────────────────────────────────

function renderRoleBody({
  name,
  slug,
  role,
  roleSlug,
  roleLinks,
  moreRoles,
  intro,
  posts,
  noteTotal,
}: {
  name: string;
  slug: string;
  role: string;
  roleSlug: string;
  roleLinks: RoleLink[];
  moreRoles: RoleLink[];
  intro: string;
  posts: PublicPost[];
  noteTotal: number;
}): string {
  return join(
    '<div class="pb-20 bg-[#f9fafb]"><div class="max-w-6xl mx-auto px-6 my-[24px]">',
    '<nav class="mb-6" aria-label="Breadcrumb"><ol class="flex flex-wrap items-center gap-2 text-sm font-medium text-[hsl(222,12%,45%)]">',
    '<li><a href="/interview-questions">Interview Questions</a></li>',
    '<li aria-hidden="true">&rsaquo;</li>',
    `<li><a href="/interview-questions/${esc(slug)}">${esc(name)}</a></li>`,
    '<li aria-hidden="true">&rsaquo;</li>',
    `<li aria-current="page" class="text-[hsl(222,22%,15%)]">${esc(role)}</li>`,
    '</ol></nav>',
    '<header class="mb-10">',
    `<h1 class="text-[34px] md:text-[40px] font-semibold tracking-tight leading-none text-[hsl(222,22%,15%)] font-[family-name:var(--font-serif)]">${esc(
      name,
    )} <span class="text-[20px] font-normal text-[hsl(222,12%,45%)]">${esc(role)} interview questions</span></h1>`,
    intro && `<p class="mt-3 max-w-2xl text-base text-[hsl(222,12%,45%)]">${esc(intro)}</p>`,
    `<p class="mt-4 text-sm text-[hsl(222,12%,45%)]">${noteTotal} ${esc(role)} interview ${
      noteTotal === 1 ? 'note' : 'notes'
    }</p>`,
    '</header>',
    // The other roles at this company, this one highlighted.
    roleLinksBar(slug, roleLinks, moreRoles, roleSlug),
    join(...posts.map((p) => noteCard(p, name))),
    '</div></div>',
  );
}

/**
 * Render one company's notes for one role, newest first.
 *
 * Exists only for a known role slug that this company has notes under: an
 * unknown or reserved slug (`page`, `q`) and a role with zero notes are 404s —
 * those URLs are guessable, and an empty page would be a thin page advertising
 * itself as real. When isIndexableRole says no (under 10 notes, or 90%+ of
 * the company's) it renders `noindex, follow`.
 */
export async function renderCompanyRolePage(
  req: IncomingMessage,
  slug: string,
  roleSlug: string,
): Promise<Rendered> {
  const role = roleLabelForSlug(roleSlug);
  if (!role) return notFoundPage('There is no such role for this company.');

  let profile: CompanyProfile | null = null;
  let name = '';
  let posts: PublicPost[] = [];
  let feedTotal = 0;
  let companyTotal = 0;
  let roleCounts: Record<string, number> = {};
  let roleStats: Awaited<ReturnType<typeof fetchRoleStats>> = [];

  try {
    // Same identity rule as the company page: the profile by slug decides
    // whether the company exists, and only the canonical slug renders.
    profile = await fetchCompanyProfile({ slug });
    if (!profile?.displayName || profile.slug !== slug) {
      return notFoundPage('We have no interview notes for this company.');
    }
    name = profile.displayName;
    // The company's own search total is what the role's share is taken of —
    // the same number the company page and the sitemap use, not
    // profile.postCount (a database count that lags the index).
    const [feed, companyFeed, counts, stats] = await Promise.all([
      fetchCompanyPosts(name, 0, role),
      fetchCompanyPosts(name, 0),
      fetchCompanyRoleCounts(name, ROLE_LABELS),
      fetchRoleStats(),
    ]);
    roleStats = stats;
    posts = feed.posts;
    feedTotal = feed.total;
    companyTotal = companyFeed.total;
    roleCounts = counts;
  } catch (err) {
    if (err instanceof UpstreamError) return unavailablePage();
    throw err;
  }

  if (posts.length === 0) {
    return notFoundPage(`We have no ${role} interview notes for this company.`);
  }

  // The count shown and gated on is the feed's: there is no per-role profile
  // number, and it is the same Elasticsearch count the sitemap is built from.
  const intro = companyRoleIntro(name, role, feedTotal, profile?.postCount);
  const roleLinks: RoleLink[] = companyRoleLinks(roleCounts, companyTotal);
  const moreRoles: RoleLink[] = companyMoreRoles(roleStats, name, roleLinks);
  const body = renderRoleBody({ name, slug, role, roleSlug, roleLinks, moreRoles, intro, posts, noteTotal: feedTotal });

  const noindex = !isIndexableRole(feedTotal, companyTotal) || shouldNoindexOnLength(body);
  const path = `/interview-questions/${slug}/${roleSlug}`;

  const head = renderHead({
    title: companyRoleSeoTitle(name, role),
    description: companyRoleSeoDescription(name, role, feedTotal),
    canonicalPath: path,
    type: 'article',
    noindex,
    jsonLd: noindex
      ? undefined
      : companyRoleJsonLd(SITE_URL, { name, companySlug: slug, role, roleSlug, intro }),
  });

  // `role` is what tells the client this seed is for a role page, not the
  // company page: the two share the seed id and the slug.
  const seeds = [
    seedTag('__prerender_company__', {
      profile: profile ? { ...profile, summary: undefined } : { displayName: name },
      posts,
      total: feedTotal,
      page: null,
      role,
      roleLinks,
      moreRoles,
      companyTotal,
      noindex,
    }),
  ];

  try {
    return { status: 200, html: await composeDocument(req, { head, body, seeds }) };
  } catch (err) {
    console.error(`[render:company-role] ${slug}/${roleSlug}: shell unavailable — ${(err as Error)?.message}`);
    return unavailablePage();
  }
}
