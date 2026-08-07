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

  // robots.txt used to Disallow: /interview, which prefix-matches — and so
  // silently blocked /interview-insights.
  it('has no robots.txt Disallow rule that prefix-matches a public route', () => {
    const disallowed = readFileSync('public/robots.txt', 'utf8')
      .split('\n')
      .map((l) => l.match(/^Disallow:\s*(\S+)/)?.[1])
      .filter((v): v is string => Boolean(v));
    for (const rule of disallowed) {
      for (const p of PRERENDER_STATIC) {
        expect(
          p === '/' || !p.startsWith(rule),
          `robots.txt "Disallow: ${rule}" prefix-matches the public route ${p}`,
        ).toBe(true);
      }
    }
  });
});
