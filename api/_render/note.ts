import type { IncomingMessage } from 'node:http';
import {
  composeDocument,
  notFoundPage,
  renderHead,
  unavailablePage,
  type Rendered,
} from './document';
import { esc, join, seedTag, shouldNoindexOnLength } from './html';
import {
  UpstreamError,
  fetchHints,
  fetchPost,
  type AiHints,
  type PostQuestion,
  type PublicPost,
} from './community';
// Plain .mjs manifest, shared with scripts/ and src/ — see scripts/routes.mjs.
import { companySlug, isIndexablePost, noteSeoTitle } from '../../scripts/routes.mjs';

// /experience/:id, rendered per request.
//
// This replaces a build-time snapshot that could only ever cover the first 40
// notes: a snapshot costs one page load plus 1+N API requests per note, so the
// whole library would be ~18,700 page loads and ~90,000 requests on every
// deploy — including deploys that change a button colour. Per request it is
// 1+N requests once, then a CDN hit for a day.
//
// The markup below is deliberately NOT a port of experience-detail.tsx. It
// carries the content a crawler needs and nothing that needs a click:
//
//   • the head (title / description / canonical / robots / OG / Article JSON-LD)
//   • the heading row, as the page's one h1
//   • Summary
//   • every question, with its title, its categories and the first sentence of
//     the author's notes
//   • every question's AI hints, which are the largest block of text on the
//     page and the reason a single-question note clears the word floor at all
//   • the crawl paths out: the company page and the directory
//
// The interactive half — like, save, share, the composer, the discussion — is
// left out on purpose. Those are buttons, and a static copy of a button that
// does nothing is worse than its absence. The client replaces this markup
// wholesale on boot (createRoot, no hydration, same as the snapshots did) and
// renders the real page from the seed, so nothing here has to match the React
// tree structurally. Class names are lifted verbatim from experience-detail.tsx
// so Tailwind has already compiled them.

const DISCLAIMER =
  "AI-generated suggestions, not part of the candidate's original notes. May be inaccurate — verify before relying on them.";

function metaLine(post: PublicPost): string {
  const bits: string[] = [];
  if (post.date) {
    const d = new Date(post.date);
    if (!Number.isNaN(d.getTime())) {
      bits.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }));
    }
  }
  if (post.location) bits.push(post.location);
  if (!bits.length) return '';
  return `<div class="flex flex-wrap items-center gap-3 text-xs text-[hsl(222,12%,50%)] mb-5">${bits
    .map((b) => `<span>${esc(b)}</span>`)
    .join('')}</div>`;
}

function badges(post: PublicPost): string {
  const chips = [post.level, post.outcome].filter(Boolean) as string[];
  if (!chips.length) return '';
  return `<div class="flex flex-wrap items-center gap-2 mb-4">${chips
    .map(
      (c) =>
        `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-600">${esc(
          c,
        )}</span>`,
    )
    .join('')}</div>`;
}

/**
 * The author's notes, exactly as the public endpoint returns them: one
 * sentence, truncated server-side.
 *
 * The blurred continuation and the `paywalled-note` class mirror
 * LockedNoteTail, and they are load-bearing rather than decorative. The page's
 * JSON-LD declares isAccessibleForFree:false with
 * hasPart.cssSelector ".paywalled-note", and that declaration is only truthful
 * if an element with that class exists AND does not contain the withheld text.
 * It contains a description of the remainder, assembled from facts already on
 * the page; the remainder itself never leaves the backend, which is what makes
 * this a declared registration wall rather than text hidden with CSS.
 */
function notesBlock(post: PublicPost, q: PostQuestion): string {
  const text = (q.notes ?? '').trim();
  if (!text) return '';
  const subject = [post.role, post.company].filter(Boolean).join(' interview at ') || 'this interview';
  const continuation =
    `The rest of the author's notes on ${subject}` +
    (post.round ? `, ${post.round} round` : '') +
    `, covers how they worked through the question, what the panel pushed back on, and what they would do differently.`;
  return join(
    '<div class="mb-4 bg-[hsl(220,20%,98%)] rounded-xl p-4 border border-[hsl(220,16%,92%)]">',
    '<div class="flex items-center gap-2 mb-2">',
    '<span class="text-xs font-medium text-[hsl(222,12%,45%)]">Author&#39;s notes</span>',
    '</div>',
    '<p class="text-sm leading-relaxed text-[hsl(222,12%,35%)]">',
    esc(text),
    ' <span class="paywalled-note select-none blur-sm" aria-hidden="true">',
    esc(continuation),
    '</span></p>',
    `<p class="mt-2 text-[13px] font-semibold text-[hsl(221,91%,60%)]"><a href="/auth?returnTo=${encodeURIComponent(
      `/experience/${post.id}`,
    )}">Create a free account to read the full note</a></p>`,
    '</div>',
  );
}

function hintsBlock(hints: AiHints | undefined): string {
  if (!hints) return '';
  const framework = Array.isArray(hints.framework) ? hints.framework : [];
  const keyPoints = Array.isArray(hints.key_points_to_mention) ? hints.key_points_to_mention : [];
  if (!hints.suggested_approach && !framework.length && !keyPoints.length) return '';
  return join(
    '<div class="rounded-xl border border-blue-200 bg-white overflow-hidden">',
    '<div class="px-5 py-4 flex items-center gap-2">',
    '<span class="text-[15px] font-semibold text-slate-800">AI Hints</span>',
    '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white text-[10px] font-semibold">AI Generated</span>',
    '</div>',
    '<div class="px-5 pb-5 pt-2 border-t border-blue-100">',
    hints.suggested_approach &&
      join(
        '<div class="rounded-xl border border-blue-100 p-5 mb-4 mt-3">',
        '<h4 class="text-[15px] font-bold text-slate-800">Suggested Approach</h4>',
        `<p class="text-[13px] text-slate-600 leading-[1.7] mb-3">${esc(hints.suggested_approach)}</p>`,
        hints.pro_tip &&
          `<p class="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-800"><strong>Pro tip:</strong> ${esc(
            hints.pro_tip,
          )}</p>`,
        '</div>',
      ),
    framework.length &&
      join(
        '<div class="space-y-2.5 mb-4">',
        ...framework.map((step) =>
          join(
            '<div class="p-4 rounded-xl border border-slate-200">',
            `<h4 class="text-[14px] font-bold text-slate-800 mb-1">${esc(
              [step?.step, step?.title].filter((v) => v !== undefined && v !== null && v !== '').join('. '),
            )}</h4>`,
            step?.description &&
              `<p class="text-[13px] text-slate-600 leading-[1.65]">${esc(step.description)}</p>`,
            '</div>',
          ),
        ),
        '</div>',
      ),
    keyPoints.length &&
      join(
        '<div class="bg-slate-50 rounded-xl border border-slate-200 p-4">',
        '<h4 class="text-[13px] font-bold text-slate-700 mb-3">Key Points to Mention</h4>',
        '<ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">',
        ...keyPoints.map(
          (point) =>
            `<li class="px-3 py-2 bg-white rounded-lg border border-slate-100 text-[12px] text-slate-600">${esc(
              point,
            )}</li>`,
        ),
        '</ul>',
        '</div>',
      ),
    // F4. A static string in this module, not a field on the hints payload:
    // hanging it off the response would keep it out of exactly the copy of the
    // page that has to carry it.
    `<p class="mt-3 text-[11px] leading-[1.6] text-slate-500">${esc(DISCLAIMER)}</p>`,
    '</div>',
    '</div>',
  );
}

function questionBlock(post: PublicPost, q: PostQuestion, index: number, hints?: AiHints): string {
  const categories = Array.isArray(q.categories) ? q.categories : [];
  return join(
    `<div id="question-${esc(q.id)}" class="bg-white rounded-2xl border border-[hsl(220,16%,90%)] mb-3">`,
    '<div class="p-5 md:p-6">',
    `<span class="text-xs font-bold text-[hsl(222,12%,55%)]">Q${index + 1}</span>`,
    `<h3 class="text-[15px] font-semibold text-[hsl(222,22%,15%)] leading-snug">${esc(q.title ?? '')}</h3>`,
    categories.length &&
      join(
        '<div class="flex flex-wrap items-center gap-1.5 mt-2">',
        ...categories.map(
          (tag) =>
            `<span class="px-2 py-0.5 rounded-full bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-[10px] text-[hsl(222,12%,45%)]">${esc(
              tag,
            )}</span>`,
        ),
        '</div>',
      ),
    '</div>',
    '<div class="px-5 md:px-6 pb-5 md:pb-6">',
    notesBlock(post, q),
    hintsBlock(hints),
    '</div>',
    '</div>',
  );
}

function renderBody(post: PublicPost, hints: Record<string, AiHints>): string {
  const questions = Array.isArray(post.questions) ? post.questions : [];
  const slug = companySlug(post.company);
  const heading = join(
    '<h1 class="flex items-center gap-1.5 flex-wrap text-base font-normal tracking-normal">',
    `<span class="text-lg font-semibold text-[hsl(222,22%,15%)]">${esc(post.company ?? '')}</span>`,
    post.role &&
      `<span class="text-[hsl(222,12%,70%)]">·</span><span class="text-lg text-[hsl(222,12%,35%)]">${esc(
        post.role,
      )}</span>`,
    post.round &&
      `<span class="text-[hsl(222,12%,70%)]">·</span><span class="text-lg text-[hsl(222,12%,35%)]">${esc(
        post.round,
      )}</span>`,
    post.level &&
      `<span class="text-[hsl(222,12%,70%)]">·</span><span class="text-lg text-[hsl(222,12%,35%)]">${esc(
        post.level,
      )}</span>`,
    '</h1>',
  );

  return join(
    '<div class="pt-6 pb-20 bg-[#f9fafb]"><div class="max-w-7xl mx-auto px-6">',
    // The crawl path back up. /experience/:id is otherwise a leaf: without
    // this, a note reached from a shared link links nowhere on the site.
    slug
      ? `<p class="mb-6"><a class="inline-flex items-center text-sm text-[hsl(222,12%,50%)]" href="/interview-questions/${esc(
          slug,
        )}">&larr; ${esc(post.company)} Interview Insights</a></p>`
      : '<p class="mb-6"><a class="inline-flex items-center text-sm text-[hsl(222,12%,50%)]" href="/interview-questions">&larr; Interview Insights</a></p>',
    '<div class="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-6 md:p-8 mb-5">',
    heading,
    badges(post),
    metaLine(post),
    '</div>',
    post.summary &&
      join(
        '<div class="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-6 md:p-8 mb-5">',
        '<h2 class="text-sm font-semibold text-[hsl(222,12%,45%)] uppercase tracking-wider mb-3">Summary</h2>',
        `<div class="text-[15px] text-[hsl(222,12%,30%)] leading-relaxed">${esc(post.summary)}</div>`,
        '</div>',
      ),
    questions.length &&
      join(
        '<div class="mb-5">',
        `<h2 class="text-lg font-semibold text-[hsl(222,22%,15%)] mb-4">Questions Asked <span class="ml-2 text-sm font-normal text-[hsl(222,12%,55%)]">(${questions.length})</span></h2>`,
        ...questions.map((q, i) => questionBlock(post, q, i, hints[q.id])),
        '</div>',
      ),
    '</div></div>',
  );
}

/**
 * Render one note, or decide it cannot be rendered.
 *
 * The three outcomes are the response contract in document.ts, and which one
 * applies is decided by whether the RECORD exists — never by whether the
 * REQUEST succeeded. Missing or unpublished is 404. An upstream that did not
 * answer is 503, because a 404 here would tell Google to drop a page that is
 * fine.
 *
 * Questions and hints degrade; the post does not. A note whose hints failed is
 * still the note, and the rendered-length floor below catches the case where
 * enough of them failed that there is nothing left worth indexing.
 */
export async function renderNotePage(req: IncomingMessage, id: string): Promise<Rendered> {
  let post: PublicPost | null;
  try {
    post = await fetchPost(id);
  } catch (err) {
    if (err instanceof UpstreamError) return unavailablePage();
    throw err;
  }
  if (!post) return notFoundPage('This interview note does not exist, or is not published.');

  const questions = Array.isArray(post.questions) ? post.questions : [];
  // Never throws — a question without hints renders without them.
  const hints = await fetchHints(questions);

  const body = renderBody(post, hints);

  // Two gates, and they read different data on purpose (see the shared
  // conventions). isIndexablePost is the one the sitemap also applies, so the
  // two agree on which URLs are advertised; the length floor is the backstop
  // for a page that passed the gate and then rendered thin anyway, which only
  // this side can see.
  const gated = !isIndexablePost(post);
  const thin = shouldNoindexOnLength(body);
  if (thin && !gated) {
    console.warn(
      `[render:note] ${id} passed the content gate but rendered under the word floor — noindex`,
    );
  }

  const title = noteSeoTitle(post);
  const description = (
    post.summary || `A ${post.role ?? ''} interview experience at ${post.company ?? 'a top company'}.`
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 155);

  const head = renderHead({
    title,
    description,
    canonicalPath: `/experience/${id}`,
    type: 'article',
    noindex: gated || thin,
    // Same declaration the page makes on the client. isAccessibleForFree is
    // false because two things really are withheld from a signed-out reader —
    // the notes past their first sentence and the discussion — and declaring
    // `true` next to a live wall is the misconfiguration that turns a gate into
    // cloaking.
    jsonLd:
      gated || thin
        ? undefined
        : [
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: `${post.company ?? ''} ${post.role ?? ''} interview${
                post.round ? ` — ${post.round}` : ''
              }`.trim(),
              ...(post.summary ? { description: post.summary } : {}),
              ...(post.date && !Number.isNaN(new Date(post.date).getTime())
                ? { datePublished: new Date(post.date).toISOString() }
                : {}),
              isAccessibleForFree: false,
              hasPart: {
                '@type': 'WebPageElement',
                isAccessibleForFree: false,
                cssSelector: '.paywalled-note',
              },
            },
          ],
  });

  // The seed carries no `comments` key. The client's fetchComments branches on
  // its presence, so leaving it out is what tells the page to load the thread
  // itself — which is right: the discussion is not in this HTML, and a seed
  // claiming an empty thread would suppress the fetch and show a note with
  // comments as having none.
  const seeds = [seedTag('__prerender_experience__', { post, hints })];

  try {
    return { status: 200, html: await composeDocument(req, { head, body, seeds }) };
  } catch (err) {
    console.error(`[render:note] ${id}: shell unavailable — ${(err as Error)?.message}`);
    return unavailablePage();
  }
}
