import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error — plain .mjs manifest, shared with scripts/prerender.mjs
import { PRERENDER_STATIC, SHELL } from '../../scripts/routes.mjs';

// vercel.json no longer has a catch-all rewrite: unknown paths must 404, which
// means every real route needs an explicit entry. A missing one is a live
// 404 on a working page, so it is guarded here rather than in review.

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
      if (s === '/sitemap.xml') continue;
      const hit = routerPaths.some((p) => toRegex(s).test(p));
      expect(hit, `${s} no longer matches any route in router.tsx`).toBe(true);
    }
  });

  // One destination pointing back at /index.html would let the home page
  // snapshot serve every SPA route again — the exact failure app.html exists
  // to prevent.
  it('only rewrites to app.html or the sitemap function', () => {
    for (const r of vercel.rewrites) {
      const ok = r.destination === `/${SHELL}` || r.destination === '/api/sitemap';
      expect(ok, `${r.source} -> ${r.destination} is not an allowed destination`).toBe(true);
    }
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
      '/privacy',
      '/terms',
    ]);
  });

  it('keeps PRERENDER_STATIC and api/sitemap.ts STATIC_PATHS identical', () => {
    const src = readFileSync('api/sitemap.ts', 'utf8');
    const block = src.match(/const STATIC_PATHS = \[([\s\S]*?)\]/)![1];
    const paths = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(paths.sort()).toEqual([...PRERENDER_STATIC].sort());
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
// The file has a single `User-agent: *` group, so every rule line applies.
const robotsRules = readFileSync('public/robots.txt', 'utf8')
  .split('\n')
  .map((l) => l.replace(/#.*$/, '').trim())
  .flatMap((l) => {
    const m = l.match(/^(Allow|Disallow):\s*(\S*)$/i);
    return m && m[2] ? [{ allow: m[1].toLowerCase() === 'allow', pattern: m[2] }] : [];
  });

// A `$` suffix anchors the end of the path; `*` matches any run of characters.
const robotsMatcher = (pattern: string) => {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
  return new RegExp('^' + escaped + (anchored ? '$' : ''));
};

const isCrawlable = (path: string) => {
  let winner: { allow: boolean; length: number } | undefined;
  for (const rule of robotsRules) {
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
  it('parses into rules', () => {
    expect(robotsRules.length).toBeGreaterThan(5);
    expect(robotsRules.some((r) => !r.allow && r.pattern === '/')).toBe(true);
  });

  it.each(PRERENDER_STATIC)('leaves the public route %s crawlable', (p) => {
    expect(isCrawlable(p), `robots.txt blocks the public route ${p}`).toBe(true);
  });

  it('leaves blog posts crawlable', () => {
    expect(isCrawlable('/blog/how-to-prepare-for-a-system-design-interview')).toBe(true);
  });

  // A disallowed sitemap is reported as unreadable in Search Console, which
  // costs every URL in it.
  it('leaves the sitemap and rendering assets crawlable', () => {
    for (const p of ['/sitemap.xml', '/assets/index-abc123.js', '/assets/index-abc123.css']) {
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
