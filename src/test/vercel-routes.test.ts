import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// Plain .mjs manifest, shared with scripts/prerender.mjs — resolves via
// allowJs, so no suppression directive is needed (an unused one is itself
// a TS2578 error).
import { PRERENDER_STATIC, SHELL } from '../../scripts/routes.mjs';

// vercel.json no longer has a catch-all rewrite: unknown paths must 404, which
// means every real route needs an explicit entry. A missing one is a live
// 404 on a working page, so it is guarded here rather than in review.

// Rewrites now have two kinds of destination, and the difference is the whole
// point of this round of work: /app.html hands the URL to the client-side SPA,
// and /api/** hands it to a server-side renderer. A public page pointed at
// /app.html answers with the SPA shell — 3 KB, ten words, no h1, no canonical,
// no robots meta, byte-identical to the response for a URL that does not
// exist — which is exactly what the renderers replaced.
const SSR_DESTINATIONS = [
  '/api/experience/:id',
  '/api/interview-questions/:companyId',
  '/api/interview-questions/:companyId/page/:n',
];

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  redirects: { source: string }[];
  rewrites: { source: string; destination: string }[];
};

// Strip comment lines first — router.tsx has two commented-out routes
// (/applications, /job-board). Regexing the raw source would treat them as
// live and fail deterministically.
const routerPaths = readFileSync('src/router.tsx', 'utf8')
  .split('\n')
  .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
  .flatMap((line) => [...line.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]))
  .filter((p) => p !== '*');

const redirectSources = vercel.redirects.map((r) => r.source);
const rewriteSources = vercel.rewrites.map((r) => r.source);

// A Vercel `:param` segment matches one non-empty path segment.
const toRegex = (src: string) => new RegExp('^' + src.replace(/:[A-Za-z0-9_]+/g, '[^/]+') + '$');

describe('vercel.json route coverage', () => {
  it('finds routes in router.tsx', () => {
    expect(routerPaths.length).toBeGreaterThan(50);
  });

  it.each(routerPaths)('%s is covered (prerender / rewrite / redirect)', (p) => {
    const covered =
      PRERENDER_STATIC.includes(p) ||
      p.startsWith('/blog') ||
      redirectSources.includes(p) ||
      rewriteSources.some((s) => toRegex(s).test(p));
    expect(covered, `${p} is not covered by vercel.json — it would 404 in production`).toBe(true);
  });

  it('has no stale rewrite entries', () => {
    for (const s of rewriteSources) {
      const hit = routerPaths.some((p) => toRegex(s).test(p));
      expect(hit, `${s} no longer matches any route in router.tsx`).toBe(true);
    }
  });

  // One destination pointing back at /index.html would let the home page
  // snapshot serve every SPA route again — the exact failure app.html exists
  // to prevent.
  it('only rewrites to app.html or a known renderer', () => {
    for (const r of vercel.rewrites) {
      const ok = r.destination === `/${SHELL}` || SSR_DESTINATIONS.includes(r.destination);
      expect(ok, `${r.source} -> ${r.destination} is not an allowed destination`).toBe(true);
    }
  });

  // The regression this guards is a one-word edit with no visible symptom: send
  // /experience/:id back to /app.html and every note URL in the sitemap answers
  // with the shell again, indistinguishable from a 404 to anything reading it.
  it.each([
    ['/experience/:id', '/api/experience/:id'],
    ['/interview-questions/:companyId', '/api/interview-questions/:companyId'],
    [
      '/interview-questions/:companyId/page/:n',
      '/api/interview-questions/:companyId/page/:n',
    ],
  ])('rewrites %s to its renderer, not the SPA shell', (source, destination) => {
    const rule = vercel.rewrites.find((r) => r.source === source);
    expect(rule, `${source} has no rewrite — it would 404 in production`).toBeDefined();
    expect(
      rule!.destination,
      `${source} is served by ${rule!.destination}; the SPA shell is not a valid answer for an indexed URL`,
    ).toBe(destination);
  });

  // Vercel matches rewrites in order. /interview-questions/:companyId would
  // also match nothing under it (a :param is one segment), but ordering is
  // cheap insurance and reads as intent.
  it('matches the company pagination rewrite before the company rewrite', () => {
    const pager = rewriteSources.indexOf('/interview-questions/:companyId/page/:n');
    const company = rewriteSources.indexOf('/interview-questions/:companyId');
    expect(pager).toBeGreaterThanOrEqual(0);
    expect(pager).toBeLessThan(company);
  });

  it('gives every prerendered route an app.html fallback', () => {
    for (const p of PRERENDER_STATIC) {
      if (p === '/') continue; // the home page is served by index.html directly
      expect(
        rewriteSources.includes(p),
        `${p} is in PRERENDER_STATIC but has no fallback rewrite`,
      ).toBe(true);
    }
  });

  // The check above only catches "added a prerendered page, forgot the
  // fallback". The reverse — dropping a route from PRERENDER_STATIC — is
  // invisible from vercel.json, because a public page's fallback looks
  // identical to an ordinary SPA rewrite. Hence a literal list: shrinking it
  // goes red, and adding a public page forces an update here and in the
  // sitemap.
  it('keeps the public route list intact', () => {
    expect([...PRERENDER_STATIC].sort()).toEqual([
      '/',
      '/blog',
      '/contact',
      '/cookies',
      '/data-protection',
      '/faq',
      '/help',
      '/interview-questions',   // public twin of /interview-insights
      '/privacy',
      '/terms',
    ]);
  });

  // The sitemap generator used to keep its own STATIC_PATHS array, and this
  // case asserted the two lists were equal. They are now one list: sitemap.mjs
  // imports PRERENDER_STATIC and maps over it, which is stronger than any
  // equality check — there is no second copy to drift. What is still worth
  // guarding is that it keeps doing that rather than growing a literal back.
  it('generates the sitemap static entries from PRERENDER_STATIC', () => {
    const src = readFileSync('scripts/sitemap.mjs', 'utf8');
    expect(src).toContain('PRERENDER_STATIC');
    expect(
      /PRERENDER_STATIC\.map\(/.test(src),
      'scripts/sitemap.mjs no longer maps over PRERENDER_STATIC — check it has not grown its own path list',
    ).toBe(true);
  });
});

// robots.txt is a whitelist: `Disallow: /` blocks the whole site and each
// `Allow:` opens one public path back up. A naive prefix check can't judge that
// (every path starts with "/"), so these tests evaluate the file the way a
// crawler does — RFC 9309 §2.2.2: of all matching rules the longest pattern
// wins, and Allow breaks a tie. The failure this guards against is real: an
// earlier version had `Disallow: /interview`, which prefix-matched and so
// silently blocked /interview-insights.
//
// The file has exactly one group now. It had two — the social preview crawlers
// and `*` — while middleware.ts answered those agents with a hand-built Open
// Graph document; that branch is gone, /experience/:id is server-rendered for
// everyone, and per RFC 9309 §2.2.1 a crawler obeys only the single most
// specific group matching its token, so the second group was a full second copy
// of every rule. The parser below still handles multiple groups, and the count
// is asserted, because adding one back silently halves the rules some crawler
// obeys.
type RobotsRule = { allow: boolean; pattern: string };
type RobotsGroup = { agents: string[]; rules: RobotsRule[] };

const robotsGroups = (() => {
  const groups: RobotsGroup[] = [];
  // Consecutive User-agent lines share one rule block; the first rule line
  // after them closes the header and starts a new group on the next agent.
  let current: RobotsGroup | undefined;
  let inHeader = false;

  for (const raw of readFileSync('public/robots.txt', 'utf8').split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;

    const agent = line.match(/^User-agent:\s*(\S+)$/i);
    if (agent) {
      if (!current || !inHeader) {
        current = { agents: [], rules: [] };
        groups.push(current);
        inHeader = true;
      }
      current.agents.push(agent[1].toLowerCase());
      continue;
    }

    const rule = line.match(/^(Allow|Disallow):\s*(\S*)$/i);
    if (rule && rule[2] && current) {
      inHeader = false;
      current.rules.push({ allow: rule[1].toLowerCase() === 'allow', pattern: rule[2] });
    }
  }
  return groups;
})();

// Exact product-token match wins over the `*` catch-all.
const rulesFor = (ua: string): RobotsRule[] => {
  const token = ua.toLowerCase();
  const exact = robotsGroups.find((g) => g.agents.includes(token));
  return (exact ?? robotsGroups.find((g) => g.agents.includes('*')))?.rules ?? [];
};

// A `$` suffix anchors the end of the path; `*` matches any run of characters.
const robotsMatcher = (pattern: string) => {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
  return new RegExp('^' + escaped + (anchored ? '$' : ''));
};

const isCrawlable = (path: string, ua = '*') => {
  let winner: { allow: boolean; length: number } | undefined;
  for (const rule of rulesFor(ua)) {
    if (!robotsMatcher(rule.pattern).test(path)) continue;
    const length = rule.pattern.length;
    // Longest pattern wins; on a tie Allow wins.
    if (!winner || length > winner.length || (length === winner.length && rule.allow)) {
      winner = { allow: rule.allow, length };
    }
  }
  return winner ? winner.allow : true; // no rule matches => crawlable
};

describe('robots.txt', () => {
  it('parses into groups, each ending in the catch-all Disallow', () => {
    expect(
      robotsGroups.length,
      'robots.txt should have exactly one group — a second one replaces these rules ' +
        'for the agents it names rather than extending them',
    ).toBe(1);
    for (const g of robotsGroups) {
      expect(g.rules.length).toBeGreaterThan(5);
      expect(
        g.rules.some((r) => !r.allow && r.pattern === '/'),
        `group [${g.agents}] has no catch-all Disallow, so it opens the whole site`,
      ).toBe(true);
    }
  });

  it.each(PRERENDER_STATIC)('leaves the public route %s crawlable', (p) => {
    expect(isCrawlable(p), `robots.txt blocks the public route ${p}`).toBe(true);
  });

  it('leaves blog posts crawlable', () => {
    expect(isCrawlable('/blog/how-to-prepare-for-a-system-design-interview')).toBe(true);
  });

  // The company pages carry the question text — they are the reason this
  // surface is indexed at all, and the directory alone is just a card grid.
  // `Allow: /interview-questions$` would open the directory and leave every
  // company page to the catch-all Disallow, which is silent and invisible from
  // the directory's own (passing) check above.
  it.each([
    '/interview-questions/google',
    '/interview-questions/scale-ai',
    '/interview-questions/at-t',
    // The crawlable pagination. These are the only links into the ~18,700 note
    // pages — "Load more" is a button — so blocking them would strand the
    // library behind ten notes per company however open /experience is.
    '/interview-questions/google/page/1',
    '/interview-questions/meta/page/238',
  ])('leaves the company page %s crawlable', (p) => {
    expect(isCrawlable(p), `robots.txt blocks ${p} — the question text would not be indexed`).toBe(
      true,
    );
  });

  // The same notes are served on both surfaces, so the personal-centre twin
  // must stay out of the index or the two compete for identical queries.
  it.each(['/interview-insights', '/interview-insights/google'])(
    'keeps the personal-centre twin %s out of the index',
    (p) => {
      expect(isCrawlable(p), `${p} is crawlable — it duplicates /interview-questions`).toBe(false);
    },
  );

  // A disallowed sitemap is reported as unreadable in Search Console, which
  // costs every URL in it.
  //
  // /sitemap.xml is a sitemap INDEX now, so the children matter as much as the
  // index: `Allow: /sitemap.xml` does not cover /sitemap-companies.xml, and the
  // failure mode is quiet — the index fetches fine and every file it names comes
  // back blocked.
  it('leaves the sitemap, its children and the rendering assets crawlable', () => {
    for (const p of [
      '/sitemap.xml',
      '/sitemap-static.xml',
      '/sitemap-companies.xml',
      '/sitemap-notes-2026-09.xml',
      '/assets/index-abc123.js',
      '/assets/index-abc123.css',
      '/og-image.png',
    ]) {
      expect(isCrawlable(p), `robots.txt blocks ${p}`).toBe(true);
    }
  });

  it.each([
    '/auth',
    '/dashboard',
    '/profile',
    '/settings',
    '/billing',
    '/admin',
    '/interview-insights',
    '/coaching',
    '/mock-interview',
    '/onboarding-flow',
  ])('keeps the app route %s out of the index', (p) => {
    expect(isCrawlable(p), `robots.txt still allows crawling ${p}`).toBe(false);
  });
});

// /experience/:id is server-rendered by api/experience/[id].ts and served
// identically to every user agent — search engines, social unfurlers and
// browsers all get the same document, with the same head tags.
//
// That is a change from the previous arrangement, where middleware.ts
// intercepted a list of social-crawler user agents and answered them with a
// hand-built Open Graph document containing `<meta http-equiv="refresh">`.
// It worked for unfurlers and was two policy violations for a search engine at
// once — different content for crawlers, and a sneaky redirect — on the very
// surface whose indexing case rests on not cloaking. One document for everyone
// removes the category of problem rather than fencing it off by user agent.
//
// What is left to assert is that robots does not block the surface, and that
// nothing has reintroduced a user-agent branch. Note that "allowed to crawl" is
// not "will be indexed": a note that fails the content gate sends noindex from
// the page itself, because a prefix rule here cannot express "only the
// substantial ones".
const EXPERIENCE_URL = '/experience/9dc86733-4682-4085-80a3-eb7629b87706';

describe('/experience is open to everyone, on one document', () => {
  it.each(['Googlebot', 'bingbot', 'LinkedInBot', 'facebookexternalhit', '*'])(
    'lets %s crawl the experience route',
    (ua) => {
      expect(
        isCrawlable(EXPERIENCE_URL, ua),
        `robots.txt blocks ${ua} from ${EXPERIENCE_URL} — the only page with a full write-up ` +
          'would never be indexed, and shared links would not preview',
      ).toBe(true);
    },
  );

  // "Allow: /experience" is a prefix rule. It must not be read as opening the
  // authoring page, which is a different route that happens to contain the word.
  it('does not open /add-experience to anyone', () => {
    for (const ua of ['Googlebot', 'LinkedInBot', '*']) {
      expect(isCrawlable('/add-experience', ua), `${ua} can crawl /add-experience`).toBe(false);
    }
  });

  // The regression: reintroduce a user-agent check in middleware.ts and some
  // agents get a different document again — and because middleware runs before
  // rewrites, those agents would never reach the renderer at all. There is no
  // robots group left to keep in step with such a list either, so nothing else
  // would notice.
  it('has no user-agent branch left in middleware.ts', () => {
    // Comments stripped first: this file's own comments explain the branch that
    // was removed, and they name the things being asserted against.
    const code = readFileSync('middleware.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const forbidden of ['user-agent', 'CRAWLER_UA', 'http-equiv']) {
      expect(
        code.toLowerCase().includes(forbidden.toLowerCase()),
        `middleware.ts references ${forbidden} again — it runs before rewrites, so any agent ` +
          'it answers never reaches api/experience/[id].ts',
      ).toBe(false);
    }
  });

  // Narrowing the matcher is what keeps the renderer reachable. A matcher that
  // covers /experience/:path* puts this function in front of the rewrite for
  // every request to the surface.
  it('keeps the middleware matcher off the rendered routes', () => {
    const src = readFileSync('middleware.ts', 'utf8');
    const matcher = src.match(/matcher:\s*\[([^\]]*)\]/)![1];
    const patterns = [...matcher.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(patterns).toEqual(['/api/v1/:path*']);
  });
});
