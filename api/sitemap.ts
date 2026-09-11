import type { IncomingMessage, ServerResponse } from 'node:http';

// Dynamic sitemap.xml, served at /sitemap.xml (see the rewrite in vercel.json).
//
// This runs server-side, so it queries the Sanity Content Lake directly (no
// browser = no CORS allowlist requirement) and always reflects the currently
// published posts — no rebuild/redeploy needed when a post is published. This
// is the SSR-style replacement for the Astro blog's build-time @astrojs/sitemap.

// @ts-expect-error — plain .mjs manifest, shared with scripts/ and src/
import { companySlug, eligibleCompanies } from '../scripts/routes.mjs';

const PROJECT_ID = process.env.VITE_SANITY_PROJECT_ID || 'x5tgtd0h';
const DATASET = process.env.VITE_SANITY_DATASET || 'production';
const SITE_URL = (process.env.VITE_SITE_URL || 'https://www.screna.ai').replace(/\/$/, '');
// Same origin the browser talks to, so the sitemap advertises exactly the
// companies the live pages can serve.
const API_BASE = (process.env.VITE_API_PATH || 'https://api.screna.ai').replace(/\/$/, '');

// Public, indexable marketing/content routes. (Keep in sync with robots.txt,
// which is a whitelist — anything listed here needs its own `Allow:` rule
// there, or it gets advertised in the sitemap and then blocked at crawl time —
// and with PRERENDER_STATIC in scripts/routes.mjs, which
// src/test/vercel-routes.test.ts asserts is the identical set.)
//
// /interview-insights and /coaching sit behind the login wall, so they are
// deliberately absent: advertising them in the sitemap just accrues
// "crawled - currently not indexed" entries. /interview-questions is the
// public twin of the interview-notes library and IS listed, along with one
// entry per eligible company (see fetchCompanies).
const STATIC_PATHS = [
  '/',
  '/blog',
  '/interview-questions',
  '/help',
  '/faq',
  '/contact',
  '/privacy',
  '/terms',
  '/cookies',
  '/data-protection',
];

interface PostRef {
  slug: string;
  publishedAt?: string;
}

interface CompanyRef {
  slug: string;
  lastmod?: string;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchPosts(): Promise<PostRef[]> {
  const query =
    '*[_type == "post" && defined(slug.current)] | order(publishedAt desc){"slug": slug.current, publishedAt}';
  const url = `https://${PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/${DATASET}?query=${encodeURIComponent(
    query,
  )}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: PostRef[] };
  return json.result ?? [];
}

/**
 * One sitemap entry per company that has enough notes to justify a page.
 *
 * The threshold is the point of this function, not an optimisation. A few
 * hundred thin company pages spun out of one template is what "scaled content
 * abuse" and "doorway pages" describe, and the sitemap is the thing that would
 * hand them all to Google at once. eligibleCompanies() applies the same gate
 * the prerenderer uses, so the two cannot drift.
 *
 * Slugs come from companySlug() — the identical rule the directory links and
 * the router use. Deriving them any other way would advertise URLs whose page
 * then queries the wrong company.
 */
async function fetchCompanies(): Promise<CompanyRef[]> {
  const res = await fetch(`${API_BASE}/api/v1/community/public/companies/stats`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: unknown };
  return eligibleCompanies(json.data ?? json).map(
    (c: { company: string; latestUpdatedAt?: string | null }) => ({
      slug: companySlug(c.company),
      lastmod: c.latestUpdatedAt ?? undefined,
    }),
  );
}

function urlEntry(loc: string, lastmod?: string): string {
  const mod = lastmod ? `\n    <lastmod>${xmlEscape(new Date(lastmod).toISOString())}</lastmod>` : '';
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${mod}\n  </url>`;
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  // Either upstream being unreachable degrades to a smaller but still valid
  // sitemap rather than a 500 — a broken sitemap costs every URL in it.
  const [posts, companies] = await Promise.all([
    fetchPosts().catch(() => [] as PostRef[]),
    fetchCompanies().catch(() => [] as CompanyRef[]),
  ]);

  const entries = [
    ...STATIC_PATHS.map((p) => urlEntry(`${SITE_URL}${p}`)),
    ...companies.map((c) => urlEntry(`${SITE_URL}/interview-questions/${c.slug}`, c.lastmod)),
    ...posts.map((p) => urlEntry(`${SITE_URL}/blog/${p.slug}`, p.publishedAt)),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join(
    '\n',
  )}\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Cache at the edge for an hour, serve stale while revalidating for a day.
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.statusCode = 200;
  res.end(xml);
}
