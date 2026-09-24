import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderNotePage } from '../../api/_render/note';

// The request-time renderer for /experience/:id.
//
// Worth testing directly because its output is the only thing a crawler ever
// reads on that URL, and every failure mode it has is silent: a 404 where a 503
// belonged evicts indexed pages, a missing `noindex` publishes a thin one, a
// missing seed makes the client blank the content it was just served, and an
// unescaped company name breaks the document. None of those show up as an
// error anywhere.

const SHELL = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Screna AI - AI Mock Interview &amp; Interview Preparation Platform</title>
  <meta name="description" content="Ace your next interview." />
  <meta name="keywords" content="mock interview" />
  <link rel="canonical" href="https://www.screna.ai/" />
  <link rel="icon" href="/favicon.ico" sizes="48x48" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.screna.ai/" />
  <meta property="og:title" content="Screna AI" />
  <meta property="og:description" content="Ace your next interview." />
  <meta property="og:image" content="https://www.screna.ai/og-image.png" />
  <meta property="og:site_name" content="Screna AI" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://www.screna.ai/" />
  <meta name="twitter:title" content="Screna AI" />
  <script type="application/ld+json">
  { "@type": "WebApplication" }
  </script>
  <script type="module" crossorigin src="/assets/index-abc123.js"></script>
  <link rel="stylesheet" crossorigin href="/assets/index-abc123.css">
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

const ID = '9dc86733-4682-4085-80a3-eb7629b87706';

const req = { headers: { host: 'www.screna.ai', 'x-forwarded-proto': 'https' } } as never;

function post(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    company: 'AT&T',
    role: 'Software Engineer',
    round: 'Onsite',
    level: 'Senior',
    outcome: 'Offer',
    date: '2026-04-11T00:00:00Z',
    location: 'Dallas, TX',
    status: 'PUBLISHED',
    summary: 'Three rounds over two weeks, mostly systems work.',
    questions: [
      {
        id: 'q1',
        title: 'Design a rate limiter for a public API',
        categories: ['System Design'],
        notes: 'I started from the read/write ratio.',
      },
    ],
    ...overrides,
  };
}

const HINTS = {
  suggested_approach: `Start from the constraints. ${'Explain the trade-offs carefully. '.repeat(20)}`,
  pro_tip: 'Say the quota window out loud before you pick an algorithm.',
  framework: [
    { step: 1, title: 'Clarify the limits', description: `Ask what is being limited. ${'Detail. '.repeat(20)}` },
    { step: 2, title: 'Pick an algorithm', description: `Token bucket versus sliding window. ${'Detail. '.repeat(20)}` },
  ],
  key_points_to_mention: ['Per-key quotas', 'Clock skew', 'Graceful degradation'],
};

type Handler = (url: string) => Response | Promise<Response>;

function mockFetch(handler: Handler) {
  globalThis.fetch = vi.fn((input: unknown) => Promise.resolve(handler(String(input)))) as never;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const happyPath: Handler = (url) => {
  if (url.endsWith('/app.html')) return new Response(SHELL, { status: 200 });
  if (url.includes('/posts/search')) return json({ data: { posts: [post()], total: 1 } });
  if (url.includes('/ai-hints')) return json({ data: HINTS });
  return new Response('not found', { status: 404 });
};

let realFetch: typeof globalThis.fetch;
beforeEach(() => {
  realFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('renderNotePage — the happy path', () => {
  it('returns one document with the content, the head and the seed', async () => {
    mockFetch(happyPath);
    const page = await renderNotePage(req, ID);
    expect(page.status).toBe(200);

    // Head: written by this renderer, and the shell's home-page copies removed.
    // Two canonicals is treated as none, and two og:titles is a coin flip.
    expect(page.html.match(/<link rel="canonical"/g)).toHaveLength(1);
    expect(page.html).toContain(`<link rel="canonical" href="https://www.screna.ai/experience/${ID}">`);
    expect(page.html.match(/property="og:title"/g)).toHaveLength(1);
    expect(page.html.match(/<title>/g)).toHaveLength(1);
    expect(page.html).not.toContain('https://www.screna.ai/" />');
    // Site-wide tags survive; so does the bundle.
    expect(page.html).toContain('og:site_name');
    expect(page.html).toContain('/assets/index-abc123.js');
    expect(page.html).toContain('/assets/index-abc123.css');

    // Content a crawler can read without running anything.
    expect(page.html).toContain('Design a rate limiter for a public API');
    expect(page.html).toContain('Three rounds over two weeks');
    expect(page.html).toContain('Token bucket versus sliding window');
    expect(page.html).toContain('AI-generated suggestions');
    // One h1, and headings under it.
    expect(page.html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(page.html).toMatch(/<h2[ >]/);
    expect(page.html).toMatch(/<h3[ >]/);
    // The crawl path out. /experience/:id is a leaf otherwise.
    expect(page.html).toContain('href="/interview-questions/at-t"');

    // The client hand-off: seed outside #root (createRoot wipes what is
    // inside), body inside it (it is markup React is about to replace).
    const rootAt = page.html.indexOf('<div id="root">');
    const seedAt = page.html.indexOf('id="__prerender_experience__"');
    expect(rootAt).toBeGreaterThan(-1);
    expect(seedAt).toBeGreaterThan(rootAt);
    expect(page.html.indexOf('</div>', rootAt)).toBeLessThan(seedAt);

    // No comments key: its absence is what tells the page to fetch the thread.
    // A seed claiming an empty thread would suppress that fetch and show a note
    // with comments as having none.
    const seedJson = JSON.parse(
      page.html.match(/id="__prerender_experience__"[^>]*>([\s\S]*?)<\/script>/)![1].replace(/\\u003c/g, '<'),
    );
    expect(seedJson.post.id).toBe(ID);
    expect(seedJson.hints.q1.pro_tip).toBeTruthy();
    expect('comments' in seedJson).toBe(false);
  });

  it('indexes a single-question note and declares the wall', async () => {
    mockFetch(happyPath);
    const page = await renderNotePage(req, ID);
    expect(page.html).toContain('content="index, follow"');
    expect(page.html).toContain('"@type":"Article"');
    // The declaration is only truthful if the element it names exists and does
    // NOT hold the withheld text.
    expect(page.html).toContain('cssSelector');
    expect(page.html).toContain('class="paywalled-note');
    expect(page.html).toContain('isAccessibleForFree');
  });

  it('escapes the company name rather than emitting it raw', async () => {
    mockFetch(happyPath);
    const page = await renderNotePage(req, ID);
    // 'AT&T' — a real company in the library. Raw, it is an invalid entity in
    // content and breaks out of an attribute value in og:title.
    expect(page.html).toContain('AT&amp;T');
    expect(page.html).not.toMatch(/>AT&T</);
  });
});

describe('renderNotePage — the three outcomes', () => {
  it('404s a note that does not exist', async () => {
    mockFetch((url) =>
      url.endsWith('/app.html')
        ? new Response(SHELL)
        : json({ data: { posts: [], total: 0 } }),
    );
    const page = await renderNotePage(req, ID);
    expect(page.status).toBe(404);
    expect(page.html).toContain('not available');
  });

  it('404s a note that is not PUBLISHED', async () => {
    mockFetch((url) =>
      url.endsWith('/app.html')
        ? new Response(SHELL)
        : json({ data: { posts: [post({ status: 'PENDING' })], total: 1 } }),
    );
    expect((await renderNotePage(req, ID)).status).toBe(404);
  });

  // The guard middleware.ts already carried: a server that ignores `postId`
  // answers with the newest notes site-wide, and reading posts[0] from that
  // publishes another candidate's write-up under this URL, with this URL's
  // canonical on it.
  it('404s rather than rendering a post whose id does not match the URL', async () => {
    mockFetch((url) =>
      url.endsWith('/app.html')
        ? new Response(SHELL)
        : json({ data: { posts: [post({ id: 'somebody-elses-note' })], total: 200 } }),
    );
    const page = await renderNotePage(req, ID);
    expect(page.status).toBe(404);
    expect(page.html).not.toContain('somebody-elses-note');
  });

  // The distinction the whole error path exists for: 404 tells Google the page
  // is gone, so one bad minute upstream would evict every note it had indexed.
  it('503s when the upstream is unreachable, never 404', async () => {
    mockFetch((url) => {
      if (url.endsWith('/app.html')) return new Response(SHELL);
      throw new Error('ECONNRESET');
    });
    const page = await renderNotePage(req, ID);
    expect(page.status).toBe(503);
  });

  it('503s on an upstream 500, and 404s on an upstream 400', async () => {
    mockFetch((url) =>
      url.endsWith('/app.html') ? new Response(SHELL) : new Response('boom', { status: 500 }),
    );
    expect((await renderNotePage(req, ID)).status).toBe(503);

    // A 400 is what the search endpoint answers for a malformed uuid — a URL
    // whose id cannot exist, which is a missing page and not a broken backend.
    mockFetch((url) =>
      url.endsWith('/app.html') ? new Response(SHELL) : new Response('bad id', { status: 400 }),
    );
    expect((await renderNotePage(req, ID)).status).toBe(404);
  });

  it('503s when the shell cannot be fetched, rather than serving a bare page', async () => {
    // Fresh module: the shell is cached per instance once fetched, and the
    // tests above have already fetched it.
    vi.resetModules();
    const fresh = await import('../../api/_render/note');
    mockFetch((url) => {
      if (url.endsWith('/app.html')) return new Response('nope', { status: 404 });
      if (url.includes('/posts/search')) return json({ data: { posts: [post()], total: 1 } });
      return json({ data: HINTS });
    });
    expect((await fresh.renderNotePage(req, ID)).status).toBe(503);
  });

  // And the other half of that cache: a shell outage after one successful
  // fetch is not a page outage. The shell is a static file on this deployment
  // and cannot change under us, so re-reading it per request would buy nothing
  // and cost a round trip on every render.
  it('keeps rendering from the cached shell once it has one', async () => {
    mockFetch(happyPath);
    expect((await renderNotePage(req, ID)).status).toBe(200);
    mockFetch((url) => {
      if (url.endsWith('/app.html')) throw new Error('origin down');
      if (url.includes('/posts/search')) return json({ data: { posts: [post()], total: 1 } });
      return json({ data: HINTS });
    });
    expect((await renderNotePage(req, ID)).status).toBe(200);
  });
});

describe('renderNotePage — degradation', () => {
  it('renders the note when its hints fail, and marks the thin result noindex', async () => {
    mockFetch((url) => {
      if (url.endsWith('/app.html')) return new Response(SHELL);
      if (url.includes('/posts/search')) return json({ data: { posts: [post()], total: 1 } });
      throw new Error('hints unavailable');
    });
    const page = await renderNotePage(req, ID);
    // Still the note, still a 200 — one question's hints are not the page.
    expect(page.status).toBe(200);
    expect(page.html).toContain('Design a rate limiter for a public API');
    // But without them this note is a title and two sentences, and the content
    // gate cannot tell: it never reads the hints. The rendered-length floor is
    // the only check that can, which is why it runs after rendering.
    expect(page.html).toContain('content="noindex, follow"');
    expect(page.html).not.toContain('"@type":"Article"');
  });

  it('noindexes a note with no questions but still serves it in full', async () => {
    mockFetch((url) =>
      url.endsWith('/app.html')
        ? new Response(SHELL)
        : json({ data: { posts: [post({ questions: [] })], total: 1 } }),
    );
    const page = await renderNotePage(req, ID);
    expect(page.status).toBe(200);
    expect(page.html).toContain('content="noindex, follow"');
    // `follow`, not `nofollow`: the page still links to its company page, and
    // severing that costs something for no gain.
    expect(page.html).not.toContain('nofollow');
    expect(page.html).toContain('href="/interview-questions/at-t"');
  });
});
