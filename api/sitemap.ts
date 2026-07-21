import type { IncomingMessage, ServerResponse } from 'node:http';

// Dynamic sitemap.xml, served at /sitemap.xml (see the rewrite in vercel.json).
//
// This runs server-side, so it queries the Sanity Content Lake directly (no
// browser = no CORS allowlist requirement) and always reflects the currently
// published posts — no rebuild/redeploy needed when a post is published. This
// is the SSR-style replacement for the Astro blog's build-time @astrojs/sitemap.

const PROJECT_ID = process.env.VITE_SANITY_PROJECT_ID || 'x5tgtd0h';
const DATASET = process.env.VITE_SANITY_DATASET || 'production';
const SITE_URL = (process.env.VITE_SITE_URL || 'https://www.screna.ai').replace(/\/$/, '');

// Public, indexable marketing/content routes. (Keep in sync with robots.txt —
// anything Disallowed there should NOT be listed here.)
const STATIC_PATHS = [
  '/',
  '/blog',
  '/interview-insights',
  '/marketplace',
  '/help',
  '/faq',
  '/privacy',
  '/terms',
  '/cookies',
];

interface PostRef {
  slug: string;
  publishedAt?: string;
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

function urlEntry(loc: string, lastmod?: string): string {
  const mod = lastmod ? `\n    <lastmod>${xmlEscape(new Date(lastmod).toISOString())}</lastmod>` : '';
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${mod}\n  </url>`;
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  // If Sanity is unreachable we still return a valid sitemap of static pages.
  let posts: PostRef[] = [];
  try {
    posts = await fetchPosts();
  } catch {
    posts = [];
  }

  const entries = [
    ...STATIC_PATHS.map((p) => urlEntry(`${SITE_URL}${p}`)),
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
