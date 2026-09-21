import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderCompanyPage } from '../../api/_render/company';

// The request-time renderer for /interview-questions/:company and its
// /page/:n children.
//
// The property worth testing hardest is the one that cannot be seen from a
// single response: a given /page/n must contain the same notes before and after
// something is published, or the URL never settles and never gets indexed.

const SHELL = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Screna AI</title>
  <link rel="canonical" href="https://www.screna.ai/" />
  <meta property="og:title" content="Screna AI" />
  <script type="module" crossorigin src="/assets/index-abc123.js"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

const req = { headers: { host: 'www.screna.ai', 'x-forwarded-proto': 'https' } } as never;

const STATS = {
  categories: [
    {
      category: 'FAANG / Big Tech',
      companies: [
        { company: 'Meta', postCount: 2377, latestUpdatedAt: '2026-09-01T00:00:00Z' },
        // Below MIN_POSTS_FOR_PAGE: a page, but not an index entry.
        { company: 'Tiny Startup', postCount: 3, latestUpdatedAt: '2026-08-01T00:00:00Z' },
      ],
    },
  ],
};

/** `total` notes for one company, newest first, ids counting down from total. */
function library(total: number) {
  return Array.from({ length: total }, (_, i) => ({
    id: `note-${total - i}`,
    company: 'Meta',
    role: 'Software Engineer',
    round: 'Onsite',
    date: '2026-04-11T00:00:00Z',
    status: 'PUBLISHED',
    summary: `Summary of note ${total - i}. ${'Body text. '.repeat(30)}`,
    questions: [{ id: `q-${total - i}`, title: `Question ${total - i}`, notes: 'One sentence.' }],
  }));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * A backend holding `total` notes for Meta, paged the way the real one does:
 * ten rows, newest first, no sort parameter read.
 */
function mockBackend(total: number, opts: { profile?: boolean } = {}) {
  const all = library(total);
  globalThis.fetch = vi.fn((input: unknown) => {
    const url = String(input);
    if (url.endsWith('/app.html')) return Promise.resolve(new Response(SHELL));
    if (url.includes('/companies/stats')) return Promise.resolve(json({ data: STATS }));
    if (url.includes('/companies/profile')) {
      return Promise.resolve(
        opts.profile === false
          ? json({ errorCode: 'NOT_FOUND' }, 400)
          : json({ data: { displayName: 'Meta', category: 'FAANG / Big Tech', postCount: total } }),
      );
    }
    if (url.includes('/posts/search')) {
      const page = Number(new URL(url).searchParams.get('page') ?? '0');
      return Promise.resolve(
        json({ data: { posts: all.slice(page * 10, page * 10 + 10), total, size: 10, page } }),
      );
    }
    return Promise.resolve(new Response('not found', { status: 404 }));
  }) as never;
}

/** The note ids a rendered page links to, in order. */
function linkedIds(html: string): string[] {
  return [...html.matchAll(/href="\/experience\/([^"]+)"/g)].map((m) => m[1]);
}

let realFetch: typeof globalThis.fetch;
beforeEach(() => {
  realFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('renderCompanyPage — the company page', () => {
  it('lists the newest ten, links each note, and offers the archive', async () => {
    mockBackend(25);
    const page = await renderCompanyPage(req, 'meta', null);
    expect(page.status).toBe(200);
    expect(linkedIds(page.html)).toEqual([
      'note-25', 'note-24', 'note-23', 'note-22', 'note-21',
      'note-20', 'note-19', 'note-18', 'note-17', 'note-16',
    ]);
    // The pager is the only thing on the site that links into the archive; the
    // pages are deliberately absent from the sitemap, so without these anchors
    // the whole series is orphaned.
    expect(page.html).toContain('href="/interview-questions/meta/page/1"');
    expect(page.html).toContain('content="index, follow"');
    expect(page.html).toContain('<link rel="canonical" href="https://www.screna.ai/interview-questions/meta">');
    // One h1, with the note cards as h2s under it.
    expect(page.html.match(/<h1[ >]/g)).toHaveLength(1);
    expect((page.html.match(/<h2[ >]/g) ?? []).length).toBeGreaterThan(1);
  });

  it('renders a company with no profile row', async () => {
    // A company with no profile answers 400/NOT_FOUND. That is a real state,
    // not a failure — the notes are what the page is for.
    mockBackend(25, { profile: false });
    const page = await renderCompanyPage(req, 'meta', null);
    expect(page.status).toBe(200);
    expect(linkedIds(page.html)).toHaveLength(10);
  });
});

describe('renderCompanyPage — the archive', () => {
  it('starts at the oldest notes and reads forward', async () => {
    mockBackend(25);
    const first = await renderCompanyPage(req, 'meta', 1);
    expect(linkedIds(first.html)).toEqual([
      'note-1', 'note-2', 'note-3', 'note-4', 'note-5',
      'note-6', 'note-7', 'note-8', 'note-9', 'note-10',
    ]);
    const last = await renderCompanyPage(req, 'meta', 3);
    expect(linkedIds(last.html)).toEqual([
      'note-21', 'note-22', 'note-23', 'note-24', 'note-25',
    ]);
  });

  // The reason the series is oldest-first at all. Newest-first pagination
  // shifts every page's contents by one on every publish, so a crawler fetching
  // /page/7 gets different notes each visit; oldest-first pins every page but
  // the last.
  it('serves the same notes on a page before and after a publish', async () => {
    mockBackend(25);
    const before = linkedIds((await renderCompanyPage(req, 'meta', 1)).html);
    const beforeMiddle = linkedIds((await renderCompanyPage(req, 'meta', 2)).html);

    mockBackend(31); // six notes published
    const after = linkedIds((await renderCompanyPage(req, 'meta', 1)).html);
    const afterMiddle = linkedIds((await renderCompanyPage(req, 'meta', 2)).html);

    expect(after).toEqual(before);
    expect(afterMiddle).toEqual(beforeMiddle);
  });

  it('covers every note exactly once across the series', async () => {
    mockBackend(25);
    const seen: string[] = [];
    for (const n of [1, 2, 3]) {
      seen.push(...linkedIds((await renderCompanyPage(req, 'meta', n)).html));
    }
    expect(new Set(seen).size).toBe(25);
  });

  // Page 1 and the company page are the tail and the head of one entry point;
  // only one of them should compete for the company's name as a query.
  it('canonicalises page 1 to the company page and later pages to themselves', async () => {
    mockBackend(25);
    const first = await renderCompanyPage(req, 'meta', 1);
    expect(first.html).toContain('href="https://www.screna.ai/interview-questions/meta"');
    const second = await renderCompanyPage(req, 'meta', 2);
    expect(second.html).toContain('href="https://www.screna.ai/interview-questions/meta/page/2"');
  });

  it('404s a page past the end rather than serving an empty one', async () => {
    mockBackend(25);
    expect((await renderCompanyPage(req, 'meta', 4)).status).toBe(404);
    expect((await renderCompanyPage(req, 'meta', 900)).status).toBe(404);
  });
});

describe('renderCompanyPage — indexing versus existence', () => {
  // The threshold is about the index. A company below it still gets a rendered
  // page with every one of its notes linked, because those notes have no other
  // path into the site: ~1,388 of them were stranded while these URLs answered
  // with the SPA shell.
  it('renders a below-threshold company as a crawl path, not an index entry', async () => {
    mockBackend(25);
    const page = await renderCompanyPage(req, 'tiny-startup', null);
    expect(page.status).toBe(200);
    expect(page.html).toContain('content="noindex, follow"');
    expect(page.html).not.toContain('nofollow');
    expect(page.html).not.toContain('"@type":"Article"');
    expect(linkedIds(page.html).length).toBeGreaterThan(0);
  });

  it('404s a slug no company in the library matches', async () => {
    mockBackend(25);
    const page = await renderCompanyPage(req, 'this-slug-does-not-exist', null);
    expect(page.status).toBe(404);
  });

  // The slug is lossy and one-way: 'at-t' title-cased back is 'AT T', which the
  // API reports as not found. The company list is the only thing that can
  // invert it, and this asserts the renderer looks it up rather than guessing.
  it('resolves a lossy slug through the company list', async () => {
    // Fresh module: the company list is cached per instance for ten minutes,
    // and the cases above have already populated it with a list that has no
    // AT&T in it.
    vi.resetModules();
    const fresh = await import('../../api/_render/company');
    globalThis.fetch = vi.fn((input: unknown) => {
      const url = String(input);
      if (url.endsWith('/app.html')) return Promise.resolve(new Response(SHELL));
      if (url.includes('/companies/stats')) {
        return Promise.resolve(
          json({
            data: {
              categories: [
                { category: 'Large Enterprises', companies: [{ company: 'AT&T', postCount: 16 }] },
              ],
            },
          }),
        );
      }
      // Answers only for the exact display name. A guessed 'AT T' gets nothing,
      // which would render an empty page rather than a 404.
      if (!url.includes(encodeURIComponent('AT&T'))) {
        return Promise.resolve(json({ data: { posts: [], total: 0 } }));
      }
      if (url.includes('/companies/profile')) {
        return Promise.resolve(json({ data: { displayName: 'AT&T', postCount: 16 } }));
      }
      return Promise.resolve(
        json({ data: { posts: library(16).slice(0, 10), total: 16, size: 10, page: 0 } }),
      );
    }) as never;

    const page = await fresh.renderCompanyPage(req, 'at-t', null);
    expect(page.status).toBe(200);
    expect(linkedIds(page.html)).toHaveLength(10);
    expect(page.html).toContain('AT&amp;T');
  });

  it('503s when the company list is unreachable, never 404', async () => {
    vi.resetModules();
    const fresh = await import('../../api/_render/company');
    globalThis.fetch = vi.fn((input: unknown) => {
      if (String(input).endsWith('/app.html')) return Promise.resolve(new Response(SHELL));
      return Promise.reject(new Error('ECONNRESET'));
    }) as never;
    expect((await fresh.renderCompanyPage(req, 'meta', null)).status).toBe(503);
  });
});
